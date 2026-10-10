// Package web serves the SPA shell with per-page meta, plus RSS and sitemap.
package web

import (
	"database/sql"
	"io/fs"
	"mime"
	"net/http"
	"path"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/prommin01st-lang/petanque-website/server/internal/httpx"
	"github.com/prommin01st-lang/petanque-website/server/internal/posts"
)

const (
	personName         = "Prommin Chandet"
	personNameThai     = "พรหมมินทร์ จันทร์เดช"
	portraitPath       = "/prommin-chandet-petanque.png"
	portraitAlt        = "Pixel-art portrait of Prommin Chandet (Petanque)"
	defaultTitle       = "Prommin Chandet (Petanque) — Full-Stack Web Developer"
	defaultDescription = "Prommin Chandet (พรหมมินทร์ จันทร์เดช), Petanque: Full-Stack Web Developer with BA/SA internship experience, learning LLMs, fine-tuning and data analysis."
)

type Handler struct {
	DB        *sql.DB
	PublicURL string
	Dist      fs.FS
}

// Mount registers feeds and installs the SPA as the router's NotFound handler.
func (h *Handler) Mount(r chi.Router) {
	r.Get("/rss.xml", h.rss)
	r.Get("/sitemap.xml", h.sitemap)
	r.Get("/robots.txt", h.robots)
	r.NotFound(h.spa)
}

func (h *Handler) spa(w http.ResponseWriter, r *http.Request) {
	p := path.Clean("/" + r.URL.Path)
	if strings.HasPrefix(p, "/api/") || strings.HasPrefix(p, "/uploads/") {
		httpx.Fail(w, httpx.ErrNotFound)
		return
	}
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		http.NotFound(w, r)
		return
	}
	if path.Ext(p) != "" {
		h.static(w, r, p)
		return
	}
	index, err := fs.ReadFile(h.Dist, "index.html")
	if err != nil {
		http.Error(w, "frontend not built", http.StatusServiceUnavailable)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache")
	_, _ = w.Write(RenderIndex(index, h.metaFor(r, p)))
}

func (h *Handler) static(w http.ResponseWriter, r *http.Request, p string) {
	// Preserve existing shared portrait URLs after giving the asset a descriptive name.
	if p == "/profile.png" {
		http.Redirect(w, r, portraitPath, http.StatusMovedPermanently)
		return
	}
	data, err := fs.ReadFile(h.Dist, strings.TrimPrefix(p, "/"))
	if err != nil {
		http.NotFound(w, r)
		return
	}
	if ct := mime.TypeByExtension(path.Ext(p)); ct != "" {
		w.Header().Set("Content-Type", ct)
	}
	if strings.HasPrefix(p, "/assets/") {
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	} else {
		w.Header().Set("Cache-Control", "public, max-age=3600")
	}
	_, _ = w.Write(data)
}

func (h *Handler) defaultImage() string {
	return h.PublicURL + portraitPath
}

func (h *Handler) metaFor(r *http.Request, p string) Meta {
	m := Meta{Title: defaultTitle, Description: defaultDescription, Image: h.defaultImage(), ImageAlt: portraitAlt,
		ImageWidth: 960, ImageHeight: 960, URL: h.PublicURL + p}
	if p == "/" {
		m.URL = h.PublicURL + "/"
	}
	switch {
	case p == "/admin" || strings.HasPrefix(p, "/admin/"):
		m.NoIndex = true
	case p == "/":
		m.StructuredData = h.profileData()
	case p == "/blog":
		m.Title = "Blog — Petanque21st"
		m.Description = "Web development notes and learning experiences from Prommin Chandet (Petanque), Full-Stack Web Developer."
	case strings.HasPrefix(p, "/blog/") && !strings.Contains(strings.TrimPrefix(p, "/blog/"), "/"):
		slug := strings.TrimPrefix(p, "/blog/")
		post, err := posts.PublishedBySlug(r.Context(), h.DB, slug)
		if err != nil {
			// Unknown/draft slug (SPA renders its 404) or DB error: keep it out of the index.
			m.NoIndex = true
			return m
		}
		m.Title = post.Title.En + " — Petanque21st"
		m.Article = true
		if post.Excerpt.En != "" {
			m.Description = post.Excerpt.En
		} else if d := firstChars(post.Body.En, 160); d != "" {
			m.Description = d
		}
		if post.CoverURL != "" {
			m.Image = post.CoverURL
			m.ImageAlt = post.Title.En
			m.ImageWidth, m.ImageHeight = 0, 0
			if strings.HasPrefix(m.Image, "/") {
				m.Image = h.PublicURL + m.Image
			}
		}
		m.StructuredData = h.articleData(post, m)
	default:
		// Not an SPA route: the client renders NotFoundPage with status 200.
		m.NoIndex = true
	}
	return m
}

var mdStrip = strings.NewReplacer("#", "", "*", "", "_", "", "`", "", ">", "", "[", "", "]", "", "(", "", ")", "", "!", "")

func firstChars(s string, n int) string {
	s = strings.Join(strings.Fields(mdStrip.Replace(s)), " ")
	if r := []rune(s); len(r) > n {
		return string(r[:n])
	}
	return s
}
