package auth

import (
	"context"
	"crypto/subtle"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/prommin01st-lang/petanque-website/server/internal/httpx"
)

const sessionCookie = "sid"

type ctxKey struct{}

// current is what LoadSession stores in the request context: the session row
// plus the raw cookie token (needed to upgrade or delete it).
type current struct {
	Session
	Token string
}

var errCSRF = httpx.NewError(http.StatusForbidden, "csrf_failed", "Missing or invalid CSRF token.")

// LoadSession reads the sid cookie and, when it names a valid session, stores
// it in the request context. It never rejects a request.
func (h *Handler) LoadSession(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if c, err := r.Cookie(sessionCookie); err == nil && c.Value != "" {
			if s, err := LookupSession(r.Context(), h.DB, c.Value, h.Now()); err == nil {
				r = r.WithContext(context.WithValue(r.Context(), ctxKey{}, current{Session: s, Token: c.Value}))
			}
		}
		next.ServeHTTP(w, r)
	})
}

func currentFrom(ctx context.Context) (current, bool) {
	c, ok := ctx.Value(ctxKey{}).(current)
	return c, ok
}

// SessionFrom returns the session loaded by LoadSession, if any.
func SessionFrom(ctx context.Context) (Session, bool) {
	c, ok := currentFrom(ctx)
	return c.Session, ok
}

// RequireFull rejects requests without a fully authenticated session (401).
func RequireFull(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if s, ok := SessionFrom(r.Context()); !ok || s.Stage != StageFull {
			httpx.Fail(w, httpx.ErrUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// csrfOK reports whether r carries the session's CSRF token (safe methods pass).
func csrfOK(r *http.Request, s Session) bool {
	if r.Method == http.MethodGet || r.Method == http.MethodHead {
		return true
	}
	got := r.Header.Get("X-CSRF-Token")
	return got != "" && subtle.ConstantTimeCompare([]byte(got), []byte(s.CSRF)) == 1
}

// RequireCSRF rejects non-GET/HEAD requests whose X-CSRF-Token header does not
// match the session's token (403 csrf_failed).
func RequireCSRF(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		s, _ := SessionFrom(r.Context())
		if !csrfOK(r, s) {
			httpx.Fail(w, errCSRF)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// AdminGroup mounts fn under /api/admin behind RequireFull and RequireCSRF.
func (h *Handler) AdminGroup(r chi.Router, fn func(chi.Router)) {
	r.Route("/api/admin", func(ar chi.Router) {
		ar.Use(RequireFull, RequireCSRF)
		fn(ar)
	})
}
