package media

import (
	"bytes"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"

	"github.com/go-chi/chi/v5"
	_ "golang.org/x/image/webp"

	"github.com/prommin01st-lang/petanque-website/server/internal/audit"
	"github.com/prommin01st-lang/petanque-website/server/internal/auth"
	"github.com/prommin01st-lang/petanque-website/server/internal/httpx"
)

// Handler serves the media API and the public /uploads files.
type Handler struct {
	DB  *sql.DB
	Dir string
	IP  func(*http.Request) string
}

var extByMime = map[string]string{"image/png": ".png", "image/jpeg": ".jpg", "image/gif": ".gif", "image/webp": ".webp"}

var fileRe = regexp.MustCompile(`^[a-f0-9]{32}\.(png|jpg|gif|webp)$`)

var errBadImage = httpx.Validation(map[string]string{"file": "must be a PNG, JPEG, WebP or GIF image"})

// MountAdmin registers the admin routes; ar is already rooted at /api/admin.
func (h *Handler) MountAdmin(ar chi.Router) {
	ar.Get("/media", h.list)
	ar.Post("/media", h.upload)
	ar.Delete("/media/{id}", h.delete)
}

// ServeUploads registers GET /uploads/{file}.
func (h *Handler) ServeUploads(r chi.Router) {
	r.Get("/uploads/{file}", h.serve)
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	items, err := list(r.Context(), h.DB)
	if err != nil {
		httpx.Fail(w, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *Handler) upload(w http.ResponseWriter, r *http.Request) {
	data, name, err := readUpload(w, r)
	if err != nil {
		httpx.Fail(w, err)
		return
	}
	head := data
	if len(head) > 512 {
		head = head[:512]
	}
	mime := http.DetectContentType(head)
	ext, ok := extByMime[mime]
	if !ok {
		httpx.Fail(w, errBadImage)
		return
	}
	cfg, _, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil {
		httpx.Fail(w, errBadImage)
		return
	}
	rnd := make([]byte, 16)
	if _, err := rand.Read(rnd); err != nil {
		httpx.Fail(w, err)
		return
	}
	filename := hex.EncodeToString(rnd) + ext
	if err := os.MkdirAll(h.Dir, 0o750); err != nil {
		httpx.Fail(w, err)
		return
	}
	path := filepath.Join(h.Dir, filename)
	if err := os.WriteFile(path, data, 0o640); err != nil {
		httpx.Fail(w, err)
		return
	}
	id, err := insert(r.Context(), h.DB, Item{Filename: filename, OriginalName: name, Mime: mime, Size: int64(len(data)), Width: cfg.Width, Height: cfg.Height})
	if err != nil {
		_ = os.Remove(path)
		httpx.Fail(w, err)
		return
	}
	it, err := get(r.Context(), h.DB, id)
	if err != nil {
		httpx.Fail(w, err)
		return
	}
	h.audit(r, "media.create", id)
	httpx.WriteJSON(w, http.StatusCreated, it)
}

// readUpload parses the multipart body and returns the file bytes and its
// client-supplied name (stored for display only, never used on disk).
func readUpload(w http.ResponseWriter, r *http.Request) ([]byte, string, error) {
	r.Body = http.MaxBytesReader(w, r.Body, MaxUpload+1<<10)
	if err := r.ParseMultipartForm(MaxUpload); err != nil {
		var mbe *http.MaxBytesError
		if errors.As(err, &mbe) {
			return nil, "", httpx.NewError(http.StatusRequestEntityTooLarge, "too_large", "Image must be 5 MB or smaller.")
		}
		return nil, "", httpx.Validation(map[string]string{"file": "is required"})
	}
	if r.MultipartForm != nil {
		defer r.MultipartForm.RemoveAll()
	}
	f, fh, err := r.FormFile("file")
	if err != nil {
		return nil, "", httpx.Validation(map[string]string{"file": "is required"})
	}
	defer f.Close()
	data, err := io.ReadAll(io.LimitReader(f, MaxUpload+1))
	if err != nil {
		return nil, "", err
	}
	if len(data) > MaxUpload {
		return nil, "", httpx.NewError(http.StatusRequestEntityTooLarge, "too_large", "Image must be 5 MB or smaller.")
	}
	name := filepath.Base(fh.Filename)
	if len(name) > 200 {
		name = name[:200]
	}
	return data, name, nil
}

func (h *Handler) serve(w http.ResponseWriter, r *http.Request) {
	file := chi.URLParam(r, "file")
	if !fileRe.MatchString(file) {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	http.ServeFile(w, r, filepath.Join(h.Dir, file))
}

func (h *Handler) delete(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		httpx.Fail(w, httpx.ErrNotFound)
		return
	}
	it, err := get(r.Context(), h.DB, id)
	if errors.Is(err, sql.ErrNoRows) {
		httpx.Fail(w, httpx.ErrNotFound)
		return
	}
	if err != nil {
		httpx.Fail(w, err)
		return
	}
	if err := os.Remove(filepath.Join(h.Dir, it.Filename)); err != nil && !errors.Is(err, os.ErrNotExist) {
		httpx.Fail(w, err)
		return
	}
	if _, err := h.DB.ExecContext(r.Context(), `DELETE FROM media WHERE id = ?`, id); err != nil {
		httpx.Fail(w, err)
		return
	}
	h.audit(r, "media.delete", id)
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) audit(r *http.Request, action string, id int64) {
	s, _ := auth.SessionFrom(r.Context())
	audit.Log(r.Context(), h.DB, s.AdminID, action, "media", strconv.FormatInt(id, 10), h.IP(r))
}
