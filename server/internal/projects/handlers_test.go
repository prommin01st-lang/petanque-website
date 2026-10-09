package projects

import (
	"net/http"
	"strconv"
	"testing"

	"github.com/go-chi/chi/v5"

	"github.com/prommin01st-lang/petanque-website/server/internal/auth"
	"github.com/prommin01st-lang/petanque-website/server/internal/testutil"
)

func setup(t *testing.T) *testutil.Client {
	c, _ := testutil.NewServer(t, func(r chi.Router, ah *auth.Handler) {
		h := &Handler{DB: ah.DB, IP: ah.ClientIP}
		h.MountPublic(r)
		ah.AdminGroup(r, h.MountAdmin)
	})
	return c
}

func body(slug string) map[string]any {
	return map[string]any{"slug": slug, "nameEn": "Name " + slug, "nameTh": "", "descEn": "desc", "descTh": "", "tags": []string{"Go"}, "metric": "", "repoUrl": "", "demoUrl": "", "flagship": false, "published": true}
}

func TestProjectsCRUD(t *testing.T) {
	c := setup(t)
	c.LoginFull()
	res, m := c.Do("POST", "/api/admin/projects", body("alpha"))
	if res.StatusCode != 201 {
		t.Fatalf("create: %d %v", res.StatusCode, m)
	}
	id := int64(m["id"].(float64))
	if res, m := c.Do("POST", "/api/admin/projects", body("alpha")); res.StatusCode != 409 || m["error"].(map[string]any)["code"] != "slug_taken" {
		t.Fatalf("dup: %d %v", res.StatusCode, m)
	}
	b := body("alpha")
	b["published"] = false
	if res, _ := c.Do("PUT", "/api/admin/projects/"+itoa(id), b); res.StatusCode != 200 {
		t.Fatal("update")
	}
	_, pub := c.Do("GET", "/api/projects", nil)
	if len(pub["items"].([]any)) != 0 {
		t.Fatal("unpublished project must be hidden publicly")
	}
	if res, _ := c.Do("DELETE", "/api/admin/projects/"+itoa(id), nil); res.StatusCode != 204 {
		t.Fatal("delete")
	}
	if res, _ := c.Do("GET", "/api/admin/projects/"+itoa(id), nil); res.StatusCode != 404 {
		t.Fatal("deleted must 404")
	}
}

func TestProjectValidation(t *testing.T) {
	c := setup(t)
	c.LoginFull()
	b := body("Bad Slug")
	b["repoUrl"] = "javascript:alert(1)"
	b["nameEn"] = ""
	res, m := c.Do("POST", "/api/admin/projects", b)
	f := m["error"].(map[string]any)["fields"].(map[string]any)
	if res.StatusCode != 422 || f["slug"] == nil || f["repoUrl"] == nil || f["nameEn"] == nil {
		t.Fatalf("%d %v", res.StatusCode, m)
	}
}

func TestPublicShapeAndOrder(t *testing.T) {
	c := setup(t)
	c.LoginFull()
	_, a := c.Do("POST", "/api/admin/projects", body("a"))
	_, b := c.Do("POST", "/api/admin/projects", body("b"))
	ids := []int64{int64(b["id"].(float64)), int64(a["id"].(float64))}
	if res, _ := c.Do("PUT", "/api/admin/projects/order", map[string]any{"ids": ids}); res.StatusCode != 204 {
		t.Fatal("order")
	}
	if res, _ := c.Do("PUT", "/api/admin/projects/order", map[string]any{"ids": ids[:1]}); res.StatusCode != 422 {
		t.Fatal("partial order must 422")
	}
	_, pub := c.Do("GET", "/api/projects", nil)
	items := pub["items"].([]any)
	first := items[0].(map[string]any)
	if first["slug"] != "b" || first["name"].(map[string]any)["en"] != "Name b" {
		t.Fatalf("public: %v", items)
	}
	if _, ok := first["name"].(map[string]any)["th"]; !ok {
		t.Fatal("th key must be present (empty string) for client fallback")
	}
	if _, ok := first["id"]; ok {
		t.Fatal("public payload must not leak internal id")
	}
}

func TestAdminRequiresLogin(t *testing.T) {
	c := setup(t)
	if res, _ := c.Do("GET", "/api/admin/projects", nil); res.StatusCode != http.StatusUnauthorized {
		t.Fatal("anonymous admin access")
	}
}

func itoa(i int64) string { return strconv.FormatInt(i, 10) }
