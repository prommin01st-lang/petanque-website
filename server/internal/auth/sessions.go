package auth

import (
	"context"
	"database/sql"
	"time"

	"github.com/prommin01st-lang/petanque-website/server/internal/store"
)

const (
	StagePassword = "password"
	StageFull     = "full"

	TTLPassword = 10 * time.Minute
	TTLFull     = 7 * 24 * time.Hour
)

// Session is a row of the sessions table. ID is the sha256 of the cookie token.
type Session struct {
	ID        string
	AdminID   int64
	Stage     string
	CSRF      string
	Method    string
	IP        string
	UserAgent string
	CreatedAt string
	ExpiresAt string
}

const sessionCols = `id, admin_id, stage, csrf_token, auth_method, ip, user_agent, created_at, expires_at`

type execer interface {
	ExecContext(ctx context.Context, q string, args ...any) (sql.Result, error)
}

func insertSession(ctx context.Context, x execer, adminID int64, stage, method, ip, ua string, now time.Time) (string, Session, error) {
	ttl := TTLFull
	if stage == StagePassword {
		ttl = TTLPassword
	}
	token := RandomToken(32)
	s := Session{
		ID: SHA256Hex(token), AdminID: adminID, Stage: stage, CSRF: RandomToken(24),
		Method: method, IP: ip, UserAgent: ua,
		CreatedAt: store.FormatTime(now), ExpiresAt: store.FormatTime(now.Add(ttl)),
	}
	_, err := x.ExecContext(ctx, `INSERT INTO sessions(`+sessionCols+`) VALUES(?,?,?,?,?,?,?,?,?)`,
		s.ID, s.AdminID, s.Stage, s.CSRF, s.Method, s.IP, s.UserAgent, s.CreatedAt, s.ExpiresAt)
	if err != nil {
		return "", Session{}, err
	}
	return token, s, nil
}

// CreateSession stores a new session and returns the raw cookie token.
func CreateSession(ctx context.Context, db *sql.DB, adminID int64, stage, method, ip, ua string, now time.Time) (string, Session, error) {
	return insertSession(ctx, db, adminID, stage, method, ip, ua, now)
}

type queryer interface {
	QueryRowContext(ctx context.Context, q string, args ...any) *sql.Row
}

func lookup(ctx context.Context, q queryer, token string, now time.Time) (Session, error) {
	var s Session
	err := q.QueryRowContext(ctx, `SELECT `+sessionCols+` FROM sessions WHERE id=? AND expires_at>?`,
		SHA256Hex(token), store.FormatTime(now)).
		Scan(&s.ID, &s.AdminID, &s.Stage, &s.CSRF, &s.Method, &s.IP, &s.UserAgent, &s.CreatedAt, &s.ExpiresAt)
	return s, err
}

// LookupSession returns sql.ErrNoRows for unknown or expired tokens.
func LookupSession(ctx context.Context, db *sql.DB, token string, now time.Time) (Session, error) {
	return lookup(ctx, db, token, now)
}

// UpgradeSession atomically replaces a valid session with a fresh full one.
// It returns sql.ErrNoRows when oldToken is unknown or expired.
func UpgradeSession(ctx context.Context, db *sql.DB, oldToken string, now time.Time) (string, Session, error) {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return "", Session{}, err
	}
	defer func() { _ = tx.Rollback() }()
	token, s, err := upgradeTx(ctx, tx, oldToken, now)
	if err != nil {
		return "", Session{}, err
	}
	if err := tx.Commit(); err != nil {
		return "", Session{}, err
	}
	return token, s, nil
}

// upgradeTx is UpgradeSession inside a caller-owned transaction.
func upgradeTx(ctx context.Context, tx *sql.Tx, oldToken string, now time.Time) (string, Session, error) {
	old, err := lookup(ctx, tx, oldToken, now)
	if err != nil {
		return "", Session{}, err
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM sessions WHERE id=?`, old.ID); err != nil {
		return "", Session{}, err
	}
	return insertSession(ctx, tx, old.AdminID, StageFull, old.Method, old.IP, old.UserAgent, now)
}

// DeleteSession removes a session by its stored (hashed) id.
func DeleteSession(ctx context.Context, db *sql.DB, idHash string) error {
	_, err := db.ExecContext(ctx, `DELETE FROM sessions WHERE id=?`, idHash)
	return err
}

// DeleteAdminSessions removes every session of an admin.
func DeleteAdminSessions(ctx context.Context, db *sql.DB, adminID int64) error {
	_, err := db.ExecContext(ctx, `DELETE FROM sessions WHERE admin_id=?`, adminID)
	return err
}

// ListSessions returns the admin's unexpired sessions, newest first.
func ListSessions(ctx context.Context, db *sql.DB, adminID int64, now time.Time) ([]Session, error) {
	rows, err := db.QueryContext(ctx, `SELECT `+sessionCols+` FROM sessions WHERE admin_id=? AND expires_at>? ORDER BY created_at DESC`,
		adminID, store.FormatTime(now))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Session{}
	for rows.Next() {
		var s Session
		if err := rows.Scan(&s.ID, &s.AdminID, &s.Stage, &s.CSRF, &s.Method, &s.IP, &s.UserAgent, &s.CreatedAt, &s.ExpiresAt); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

// PurgeExpired deletes sessions that have expired.
func PurgeExpired(ctx context.Context, db *sql.DB, now time.Time) error {
	_, err := db.ExecContext(ctx, `DELETE FROM sessions WHERE expires_at<=?`, store.FormatTime(now))
	return err
}
