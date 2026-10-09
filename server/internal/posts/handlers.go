package posts

import (
	"database/sql"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/prommin01st-lang/petanque-website/server/internal/audit"
	"github.com/prommin01st-lang/petanque-website/server/internal/auth"
	"github.com/prommin01st-lang/petanque-website/server/internal/httpx"
)

// Handler serves the posts API.
type Handler struct {
	DB *sql.DB
	IP func(*http.Request) string
}

// MountPublic registers GET /api/posts and GET /api/posts/{slug}.
func (h *Handler) MountPublic(r chi.Router) {
	r.Get("/api/posts", h.publicList)
	r.Get("/api/posts/{slug}", h.publicGet)
}

// MountAdmin registers the admin routes; ar is already rooted at /api/admin.
func (h *Handler) MountAdmin(ar chi.Router) {
	ar.Get("/posts", h.adminList)
	ar.Post("/posts", h.adminCreate)
	ar.Get("/posts/{id}", h.adminGet)
	ar.Put("/posts/{id}", h.adminUpdate)
	ar.Delete("/posts/{id}", h.adminDelete)
}

func intParam(r *http.Request, name string, def, min, max int) int {
	n, err := strconv.Atoi(r.URL.Query().Get(name))
	if err != nil {
		return def
	}
	return min + clamp(n-min, 0, max-min)
}

func clamp(n, lo, hi int) int {
	if n < lo {
		return lo
	}
	if n > hi {
		return hi
	}
	return n
}

func (h *Handler) publicList(w http.ResponseWriter, r *http.Request) {
	page := intParam(r, "page", 1, 1, 1<<30)
	perPage := intParam(r, "perPage", 10, 1, 50)
	items, total, err := ListPublished(r.Context(), h.DB, r.URL.Query().Get("tag"), perPage, (page-1)*perPage)
	if err != nil {
		httpx.Fail(w, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"items": items, "page": page, "perPage": perPage, "total": total})
}

func (h *Handler) publicGet(w http.ResponseWriter, r *http.Request) {
	p, err := PublishedBySlug(r.Context(), h.DB, chi.URLParam(r, "slug"))
	if err != nil {
		httpx.Fail(w, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, p)
}

func (h *Handler) adminList(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	if status != "" && status != "draft" && status != "published" {
		httpx.Fail(w, httpx.Validation(map[string]string{"status": "Must be draft or published."}))
		return
	}
	items, err := listAdmin(r.Context(), h.DB, status)
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
	audit.Log(r.Context(), h.DB, s.AdminID, action, "post", entityID, h.IP(r))
}

func (h *Handler) readInput(r *http.Request) (Input, error) {
	var in Input
	if err := httpx.DecodeJSON(r, &in); err != nil {
		return in, err
	}
	f := in.normalize()
	if in.CoverMediaID != nil {
		ok, err := coverExists(r.Context(), h.DB, *in.CoverMediaID)
		if err != nil {
			return in, err
		}
		if !ok {
			f["coverMediaId"] = "Unknown media item."
		}
	}
	if len(f) > 0 {
		return in, httpx.Validation(f)
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
	h.audit(r, "post.create", strconv.FormatInt(a.ID, 10))
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
	h.audit(r, "post.update", strconv.FormatInt(id, 10))
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
	h.audit(r, "post.delete", strconv.FormatInt(id, 10))
	w.WriteHeader(http.StatusNoContent)
}
