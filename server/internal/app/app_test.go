package app

import (
	"net/http/httptest"
	"testing"
	"testing/fstest"

	"github.com/prommin01st-lang/petanque-website/server/internal/config"
	"github.com/prommin01st-lang/petanque-website/server/internal/store/storetest"
)

func testDeps(t *testing.T) Deps {
	return Deps{Cfg: config.Config{PublicURL: "http://x"}, DB: storetest.New(t), Dist: fstest.MapFS{"index.html": {Data: []byte("<html><head><!--app-meta--></head></html>")}}}
}

func TestHealthz(t *testing.T) {
	h := New(testDeps(t))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest("GET", "/healthz", nil))
	if rec.Code != 200 || rec.Body.String() != "{\"ok\":true}\n" {
		t.Fatalf("got %d %q", rec.Code, rec.Body)
	}
	if rec.Header().Get("X-Content-Type-Options") != "nosniff" {
		t.Fatal("security headers not applied")
	}
}
