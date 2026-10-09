// Package app assembles the HTTP handler from all feature packages.
package app

import (
	"database/sql"
	"io/fs"
	"net/http"
	"path/filepath"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/prommin01st-lang/petanque-website/server/internal/audit"
	"github.com/prommin01st-lang/petanque-website/server/internal/auth"
	"github.com/prommin01st-lang/petanque-website/server/internal/config"
	"github.com/prommin01st-lang/petanque-website/server/internal/httpx"
	"github.com/prommin01st-lang/petanque-website/server/internal/media"
	"github.com/prommin01st-lang/petanque-website/server/internal/posts"
	"github.com/prommin01st-lang/petanque-website/server/internal/projects"
	"github.com/prommin01st-lang/petanque-website/server/internal/web"
)

type Deps struct {
	Cfg  config.Config
	DB   *sql.DB
	Dist fs.FS
}

func New(d Deps) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.Recoverer, httpx.SecurityHeaders)
	ah := auth.NewHandler(d.DB, d.Cfg)
	r.Use(ah.LoadSession)
	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		if err := d.DB.PingContext(r.Context()); err != nil {
			httpx.Fail(w, err)
			return
		}
		httpx.WriteJSON(w, http.StatusOK, map[string]bool{"ok": true})
	})
	ah.Mount(r)
	mh := &media.Handler{DB: d.DB, Dir: filepath.Join(d.Cfg.DataDir, "uploads"), IP: ah.ClientIP}
	mh.ServeUploads(r)
	(&projects.Handler{DB: d.DB, IP: ah.ClientIP}).MountPublic(r)
	(&posts.Handler{DB: d.DB, IP: ah.ClientIP}).MountPublic(r)
	ah.AdminGroup(r, func(ar chi.Router) {
		(&projects.Handler{DB: d.DB, IP: ah.ClientIP}).MountAdmin(ar)
		mh.MountAdmin(ar)
		(&posts.Handler{DB: d.DB, IP: ah.ClientIP}).MountAdmin(ar)
		(&audit.Handler{DB: d.DB}).MountAdmin(ar)
	})
	(&web.Handler{DB: d.DB, PublicURL: d.Cfg.PublicURL, Dist: d.Dist}).Mount(r)
	return r
}
