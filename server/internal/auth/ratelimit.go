package auth

import (
	"context"
	"database/sql"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/prommin01st-lang/petanque-website/server/internal/httpx"
	"github.com/prommin01st-lang/petanque-website/server/internal/store"
)

const (
	failureWindow = 15 * time.Minute
	ipLimit       = 5  // failures per IP (every step)
	accountLimit  = 10 // failures per admin (second-factor steps only)

	accountKeyPrefix = "admin:"
)

var errRateLimited = httpx.NewError(http.StatusTooManyRequests, "rate_limited", "Too many failed attempts. Try again later.")

// accountKey is the login_attempts key (stored in the ip column) that counts
// second-factor failures against one admin across all IPs.
func accountKey(adminID int64) string { return accountKeyPrefix + strconv.FormatInt(adminID, 10) }

func limitFor(key string) int {
	if strings.HasPrefix(key, accountKeyPrefix) {
		return accountLimit
	}
	return ipLimit
}

// tooManyFailures reports whether key (an IP or an accountKey) has reached its
// failure limit inside the window, and how long until the oldest counted
// failure leaves it. A database error fails closed (limited for one minute).
func (h *Handler) tooManyFailures(ctx context.Context, key string) (bool, time.Duration) {
	now := h.Now()
	var n int
	var oldest sql.NullString
	err := h.DB.QueryRowContext(ctx, `SELECT COUNT(*), MIN(at) FROM login_attempts WHERE ip=? AND at>?`,
		key, store.FormatTime(now.Add(-failureWindow))).Scan(&n, &oldest)
	if err != nil {
		slog.Error("rate limit lookup failed", "err", err)
		return true, time.Minute
	}
	if n < limitFor(key) {
		return false, 0
	}
	retry := time.Second
	if t, perr := store.ParseTime(oldest.String); perr == nil {
		if d := t.Add(failureWindow).Sub(now); d > retry {
			retry = d
		}
	}
	return true, retry
}

// charged is one pre-charged failure row: its AUTOINCREMENT id (never reused)
// and the key it was charged to.
type charged struct {
	id  int64
	key string
}

// insertFailures stores one failed attempt per key, pruning rows outside the
// window first, and returns the inserted rows.
func (h *Handler) insertFailures(ctx context.Context, keys ...string) ([]charged, error) {
	now := h.Now()
	if _, err := h.DB.ExecContext(ctx, `DELETE FROM login_attempts WHERE at<=?`, store.FormatTime(now.Add(-failureWindow))); err != nil {
		return nil, err
	}
	rows := make([]charged, 0, len(keys))
	for _, k := range keys {
		res, err := h.DB.ExecContext(ctx, `INSERT INTO login_attempts(ip,at) VALUES(?,?)`, k, store.FormatTime(now))
		if err != nil {
			return rows, err
		}
		id, err := res.LastInsertId()
		if err != nil {
			return rows, err
		}
		rows = append(rows, charged{id: id, key: k})
	}
	return rows, nil
}

// clearFailures forgets every failed attempt of each key. Only finishLogin
// calls it, once a session reaches the full stage.
func (h *Handler) clearFailures(ctx context.Context, keys ...string) {
	for _, k := range keys {
		if _, err := h.DB.ExecContext(ctx, `DELETE FROM login_attempts WHERE ip=?`, k); err != nil {
			slog.Error("clear login failures failed", "err", err)
		}
	}
}

// reservation is an attempt pre-charged as a failure by reserve.
type reservation struct {
	rows []charged
	kept bool
}

// keep marks the attempt as a real (credential) failure: release leaves its
// rows in place.
func (res *reservation) keep() { res.kept = true }

// reserve checks every key against its limit and, when allowed, pre-charges
// the attempt by inserting a failure row per key. Only this check-and-insert
// runs under h.limitMu, so slow verification (bcrypt, TOTP) is never
// serialised, yet a parallel burst cannot overshoot the limit. When limited it
// writes 429 with Retry-After (the max over keys) and returns false.
// Callers defer h.release(ctx, res) and call res.keep() on a credential failure.
func (h *Handler) reserve(w http.ResponseWriter, r *http.Request, keys ...string) (*reservation, bool) {
	h.limitMu.Lock()
	defer h.limitMu.Unlock()
	var limited bool
	var retry time.Duration
	for _, k := range keys {
		if l, d := h.tooManyFailures(r.Context(), k); l {
			limited = true
			retry = max(retry, d)
		}
	}
	if limited {
		w.Header().Set("Retry-After", strconv.Itoa(int((retry+time.Second-1)/time.Second)))
		httpx.Fail(w, errRateLimited)
		return nil, false
	}
	rows, err := h.insertFailures(r.Context(), keys...)
	res := &reservation{rows: rows}
	if err != nil {
		h.release(r.Context(), res)
		httpx.Fail(w, err)
		return nil, false
	}
	return res, true
}

// release refunds a reservation that was not kept (success, or a failure that
// was not a wrong credential). It deletes only the rows this reservation
// inserted (id AND key); already-cleared or pruned rows make it a no-op.
func (h *Handler) release(ctx context.Context, res *reservation) {
	if res == nil || res.kept {
		return
	}
	for _, row := range res.rows {
		// WithoutCancel: a client hanging up must not leave the attempt charged.
		if _, err := h.DB.ExecContext(context.WithoutCancel(ctx), `DELETE FROM login_attempts WHERE id=? AND ip=?`, row.id, row.key); err != nil {
			slog.Error("refund login attempt failed", "err", err)
		}
	}
}
