package auth

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
)

// Admin is a row of the admins table.
type Admin struct {
	ID            int64
	Username      string
	PasswordHash  string
	TOTPSecretEnc []byte
	TOTPEnabled   bool
	TOTPLastStep  int64 // last accepted TOTP time step (replay protection)
	GitHubID      sql.NullInt64
	GitHubLogin   sql.NullString
}

const adminCols = `id, username, password_hash, totp_secret_enc, totp_enabled, totp_last_step, github_id, github_login`

// Bootstrap creates the first admin from env credentials. It is a no-op when
// any admin already exists.
func Bootstrap(ctx context.Context, db *sql.DB, username, password string) error {
	var n int
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM admins`).Scan(&n); err != nil {
		return err
	}
	if n > 0 {
		return nil
	}
	if username == "" {
		return errors.New("admin username required")
	}
	if len(password) < MinPasswordLen {
		return fmt.Errorf("admin password must be at least %d characters", MinPasswordLen)
	}
	hash, err := HashPassword(password)
	if err != nil {
		return err
	}
	_, err = db.ExecContext(ctx, `INSERT INTO admins(username,password_hash) VALUES(?,?)`, username, hash)
	return err
}

func scanAdmin(row *sql.Row) (Admin, error) {
	var a Admin
	var enabled int
	err := row.Scan(&a.ID, &a.Username, &a.PasswordHash, &a.TOTPSecretEnc, &enabled, &a.TOTPLastStep, &a.GitHubID, &a.GitHubLogin)
	a.TOTPEnabled = enabled != 0
	return a, err
}

// AdminByUsername returns sql.ErrNoRows when missing.
func AdminByUsername(ctx context.Context, db *sql.DB, u string) (Admin, error) {
	return scanAdmin(db.QueryRowContext(ctx, `SELECT `+adminCols+` FROM admins WHERE username=?`, u))
}

// AdminByID returns sql.ErrNoRows when missing.
func AdminByID(ctx context.Context, db *sql.DB, id int64) (Admin, error) {
	return scanAdmin(db.QueryRowContext(ctx, `SELECT `+adminCols+` FROM admins WHERE id=?`, id))
}

// AdminByGitHubID returns sql.ErrNoRows when missing.
func AdminByGitHubID(ctx context.Context, db *sql.DB, id int64) (Admin, error) {
	return scanAdmin(db.QueryRowContext(ctx, `SELECT `+adminCols+` FROM admins WHERE github_id=?`, id))
}

// MinPasswordLen is the minimum admin password length (bootstrap and reset).
const MinPasswordLen = 12

// ErrUnknownAdmin is returned by the recovery helpers for a missing username.
var ErrUnknownAdmin = errors.New("unknown admin")

// ResetPassword sets a new password for username and deletes all of that
// admin's sessions and account-lockout attempts, atomically. It returns the
// admin id.
func ResetPassword(ctx context.Context, db *sql.DB, username, password string) (int64, error) {
	if len(password) < MinPasswordLen {
		return 0, fmt.Errorf("password must be at least %d characters", MinPasswordLen)
	}
	hash, err := HashPassword(password)
	if err != nil {
		return 0, err
	}
	return withAdmin(ctx, db, username, func(tx *sql.Tx, id int64) error {
		if _, err := tx.ExecContext(ctx, `UPDATE admins SET password_hash=? WHERE id=?`, hash, id); err != nil {
			return err
		}
		_, err := tx.ExecContext(ctx, `DELETE FROM sessions WHERE admin_id=?`, id)
		return err
	})
}

// ResetTOTP disables TOTP for username (secret, enabled flag and replay step
// cleared) and deletes its recovery codes, sessions and account-lockout
// attempts, atomically. The next login goes through TOTP setup again. It returns the admin id.
func ResetTOTP(ctx context.Context, db *sql.DB, username string) (int64, error) {
	return withAdmin(ctx, db, username, func(tx *sql.Tx, id int64) error {
		for _, q := range []string{
			`UPDATE admins SET totp_secret_enc=NULL, totp_enabled=0, totp_last_step=0 WHERE id=?`,
			`DELETE FROM recovery_codes WHERE admin_id=?`,
			`DELETE FROM sessions WHERE admin_id=?`,
		} {
			if _, err := tx.ExecContext(ctx, q, id); err != nil {
				return err
			}
		}
		return nil
	})
}

// withAdmin runs fn in a transaction for the admin named username and, in the
// same transaction, clears that admin's account-lockout rows.
func withAdmin(ctx context.Context, db *sql.DB, username string, fn func(tx *sql.Tx, id int64) error) (int64, error) {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback() //nolint:errcheck // no-op after Commit
	var id int64
	err = tx.QueryRowContext(ctx, `SELECT id FROM admins WHERE username=?`, username).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, ErrUnknownAdmin
	}
	if err != nil {
		return 0, err
	}
	if err := fn(tx, id); err != nil {
		return 0, err
	}
	// A recovery also lifts the account lockout (per-IP rows are left alone).
	if _, err := tx.ExecContext(ctx, `DELETE FROM login_attempts WHERE ip=?`, accountKey(id)); err != nil {
		return 0, err
	}
	return id, tx.Commit()
}
