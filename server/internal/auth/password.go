package auth

import (
	"fmt"
	"net/http"

	"github.com/prommin01st-lang/petanque-website/server/internal/audit"
	"github.com/prommin01st-lang/petanque-website/server/internal/httpx"
)

// maxPasswordBytes is bcrypt's input limit.
const maxPasswordBytes = 72

// changePassword lets a full session replace its admin's password. It needs
// the current password and a TOTP code; every other session of the admin is
// revoked, the caller's own session stays.
func (h *Handler) changePassword(w http.ResponseWriter, r *http.Request) {
	c, _ := currentFrom(r.Context())
	var in struct {
		CurrentPassword string `json:"currentPassword"`
		NewPassword     string `json:"newPassword"`
		Code            string `json:"code"`
	}
	if err := httpx.DecodeJSON(r, &in); err != nil {
		httpx.Fail(w, err)
		return
	}
	switch {
	case len(in.NewPassword) < MinPasswordLen:
		httpx.Fail(w, httpx.Validation(map[string]string{"newPassword": fmt.Sprintf("Must be at least %d characters.", MinPasswordLen)}))
		return
	case len(in.NewPassword) > maxPasswordBytes:
		httpx.Fail(w, httpx.Validation(map[string]string{"newPassword": fmt.Sprintf("Must be at most %d bytes.", maxPasswordBytes)}))
		return
	case in.NewPassword == in.CurrentPassword:
		httpx.Fail(w, httpx.Validation(map[string]string{"newPassword": "Must differ from the current password."}))
		return
	}

	ctx, ip := r.Context(), h.ClientIP(r)
	charge, ok := h.reserve(w, r, ip, accountKey(c.AdminID))
	if !ok {
		return
	}
	defer h.release(ctx, charge)
	a, err := AdminByID(ctx, h.DB, c.AdminID)
	if err != nil {
		httpx.Fail(w, err)
		return
	}
	if !CheckPassword(a.PasswordHash, in.CurrentPassword) {
		charge.keep()
		audit.Log(ctx, h.DB, a.ID, "admin.password_change_failed", "admin", a.Username, ip)
		httpx.Fail(w, errInvalidCredentials)
		return
	}
	valid := false
	if a.TOTPEnabled {
		if valid, err = h.validTOTP(ctx, a, in.Code); err != nil {
			httpx.Fail(w, err)
			return
		}
	}
	if !valid {
		charge.keep()
		audit.Log(ctx, h.DB, a.ID, "admin.password_change_failed", "admin", a.Username, ip)
		httpx.Fail(w, errInvalidCode)
		return
	}

	hash, err := HashPassword(in.NewPassword)
	if err != nil {
		httpx.Fail(w, err)
		return
	}
	tx, err := h.DB.BeginTx(ctx, nil)
	if err != nil {
		httpx.Fail(w, err)
		return
	}
	defer func() { _ = tx.Rollback() }()
	if _, err = tx.ExecContext(ctx, `UPDATE admins SET password_hash=? WHERE id=?`, hash, a.ID); err == nil {
		_, err = tx.ExecContext(ctx, `DELETE FROM sessions WHERE admin_id=? AND id<>?`, a.ID, c.ID)
	}
	if err == nil {
		err = tx.Commit()
	}
	if err != nil {
		httpx.Fail(w, err)
		return
	}
	audit.Log(ctx, h.DB, a.ID, "admin.password_change", "admin", a.Username, ip)
	w.WriteHeader(http.StatusNoContent)
}
