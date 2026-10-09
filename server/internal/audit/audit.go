// Package audit records security-relevant admin actions.
package audit

import (
	"context"
	"database/sql"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/prommin01st-lang/petanque-website/server/internal/httpx"
	"github.com/prommin01st-lang/petanque-website/server/internal/store"
)

// Log appends an audit_log row. It is best-effort: failures are logged, never
// returned. adminID 0 stores NULL (e.g. failed logins for unknown users).
func Log(ctx context.Context, db *sql.DB, adminID int64, action, entity, entityID, ip string) {
	_, err := db.ExecContext(ctx,
		`INSERT INTO audit_log(admin_id,action,entity,entity_id,ip,created_at) VALUES(?,?,?,?,?,?)`,
		sql.NullInt64{Int64: adminID, Valid: adminID != 0}, action, entity, entityID, ip, store.Now())
	if err != nil {
		slog.Error("audit log write failed", "action", action, "err", err)
	}
}

// Handler serves the admin audit log listing.
type Handler struct{ DB *sql.DB }

// MountAdmin registers GET /audit; ar is already rooted at /api/admin.
func (h *Handler) MountAdmin(ar chi.Router) { ar.Get("/audit", h.list) }

type entry struct {
	ID        int64  `json:"id"`
	Action    string `json:"action"`
	Entity    string `json:"entity"`
	EntityID  string `json:"entityId"`
	IP        string `json:"ip"`
	CreatedAt string `json:"createdAt"`
}

const auditPerPage = 50

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	page, err := strconv.Atoi(r.URL.Query().Get("page"))
	if err != nil || page < 1 {
		page = 1
	}
	var total int
	if err := h.DB.QueryRowContext(r.Context(), `SELECT COUNT(*) FROM audit_log`).Scan(&total); err != nil {
		httpx.Fail(w, err)
		return
	}
	rows, err := h.DB.QueryContext(r.Context(),
		`SELECT id, action, entity, entity_id, COALESCE(ip,''), created_at FROM audit_log ORDER BY id DESC LIMIT ? OFFSET ?`,
		auditPerPage, (page-1)*auditPerPage)
	if err != nil {
		httpx.Fail(w, err)
		return
	}
	defer rows.Close()
	items := []entry{}
	for rows.Next() {
		var e entry
		if err := rows.Scan(&e.ID, &e.Action, &e.Entity, &e.EntityID, &e.IP, &e.CreatedAt); err != nil {
			httpx.Fail(w, err)
			return
		}
		items = append(items, e)
	}
	if err := rows.Err(); err != nil {
		httpx.Fail(w, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"items": items, "page": page, "perPage": auditPerPage, "total": total})
}
