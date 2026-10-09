package projects

import (
	"database/sql"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/prommin01st-lang/petanque-website/server/internal/audit"
	"github.com/prommin01st-lang/petanque-website/server/internal/auth"
	"github.com/prommin01st-lang/petanque-website/server/internal/httpx"
)

// Handler serves the projects API.
type Handler struct {
	DB *sql.DB
	IP func(*http.Request) string
}

// MountPublic registers GET /api/projects.
func (h *Handler) MountPublic(r chi.Router) {
	r.Get("/api/projects", h.public)
}

// MountAdmin registers the admin routes; ar is already rooted at /api/admin.
func (h *Handler) MountAdmin(ar chi.Router) {
	ar.Get("/projects", h.adminList)
	ar.Post("/projects", h.adminCreate)
	ar.Put("/projects/order", h.adminReorder)
	ar.Get("/projects/{id}", h.adminGet)
	ar.Put("/projects/{id}", h.adminUpdate)
	ar.Delete("/projects/{id}", h.adminDelete)
}

func (h *Handler) public(w http.ResponseWriter, r *http.Request) {
	rows, err := list(r.Context(), h.DB, true)
	if err != nil {
		httpx.Fail(w, err)
		return
	}
	items := make([]Public, 0, len(rows))
	for _, a := range rows {
		items = append(items, Public{
			Slug:        a.Slug,
			Name:        Localized{En: a.NameEn, Th: a.NameTh},
			Description: Localized{En: a.DescEn, Th: a.DescTh},
			Tags:        a.Tags, Metric: a.Metric, RepoURL: a.RepoURL, DemoURL: a.DemoURL, Flagship: a.Flagship,
		})
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *Handler) adminList(w http.ResponseWriter, r *http.Request) {
	items, err := list(r.Context(), h.DB, false)
	if err != nil {
		httpx.Fail(w, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

func pathID(r *http.Request) (int64, error) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		return 0, httpx.ErrNotFound
	}
	return id, nil
}

func (h *Handler) audit(r *http.Request, action, entityID string) {
	s, _ := auth.SessionFrom(r.Context())
	audit.Log(r.Context(), h.DB, s.AdminID, action, "project", entityID, h.IP(r))
}

func (h *Handler) readInput(r *http.Request) (Input, error) {
	var in Input
	if err := httpx.DecodeJSON(r, &in); err != nil {
		return in, err
	}
	if err := in.validate(); err != nil {
		return in, err
	}
	return in, nil
}

func (h *Handler) adminGet(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err == nil {
		var a Admin
		if a, err = get(r.Context(), h.DB, id); err == nil {
			httpx.WriteJSON(w, http.StatusOK, a)
			return
		}
	}
	httpx.Fail(w, err)
}

func (h *Handler) adminCreate(w http.ResponseWriter, r *http.Request) {
	in, err := h.readInput(r)
	if err != nil {
		httpx.Fail(w, err)
		return
	}
	a, err := create(r.Context(), h.DB, in)
	if err != nil {
		httpx.Fail(w, err)
		return
	}
	h.audit(r, "project.create", strconv.FormatInt(a.ID, 10))
	httpx.WriteJSON(w, http.StatusCreated, a)
}

func (h *Handler) adminUpdate(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		httpx.Fail(w, err)
		return
	}
	in, err := h.readInput(r)
	if err != nil {
		httpx.Fail(w, err)
		return
	}
	a, err := update(r.Context(), h.DB, id, in)
	if err != nil {
		httpx.Fail(w, err)
		return
	}
	h.audit(r, "project.update", strconv.FormatInt(id, 10))
	httpx.WriteJSON(w, http.StatusOK, a)
}

func (h *Handler) adminDelete(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err == nil {
		err = remove(r.Context(), h.DB, id)
	}
	if err != nil {
		httpx.Fail(w, err)
		return
	}
	h.audit(r, "project.delete", strconv.FormatInt(id, 10))
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) adminReorder(w http.ResponseWriter, r *http.Request) {
	var in struct {
		IDs []int64 `json:"ids"`
	}
	if err := httpx.DecodeJSON(r, &in); err != nil {
		httpx.Fail(w, err)
		return
	}
	if err := reorder(r.Context(), h.DB, in.IDs); err != nil {
		httpx.Fail(w, err)
		return
	}
	h.audit(r, "project.reorder", "")
	w.WriteHeader(http.StatusNoContent)
}
