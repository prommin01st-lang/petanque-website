package posts

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
	c.LoginFull()
	return c
}

func post(slug, status string, tags ...string) map[string]any {
	if tags == nil {
		tags = []string{}
	}
	return map[string]any{"slug": slug, "titleEn": "T " + slug, "titleTh": "", "excerptEn": "ex", "excerptTh": "", "bodyEn": "# Hi", "bodyTh": "", "tags": tags, "coverMediaId": nil, "status": status}
}

func id(m map[string]any) string { return strconv.FormatInt(int64(m["id"].(float64)), 10) }

func TestDraftsAreInvisiblePublicly(t *testing.T) {
	c := setup(t)
	c.Do("POST", "/api/admin/posts", post("secret", "draft"))
	_, list := c.Do("GET", "/api/posts", nil)
	if list["total"].(float64) != 0 {
		t.Fatalf("draft listed: %v", list)
	}
	if res, _ := c.Do("GET", "/api/posts/secret", nil); res.StatusCode != http.StatusNotFound {
		t.Fatal("draft readable by slug")
	}
}

func TestPublishKeepsOriginalDate(t *testing.T) {
	c := setup(t)
	_, m := c.Do("POST", "/api/admin/posts", post("p", "published"))
	first := m["publishedAt"].(string)
	b := post("p", "draft")
	c.Do("PUT", "/api/admin/posts/"+id(m), b)
	b["status"] = "published"
	_, m2 := c.Do("PUT", "/api/admin/posts/"+id(m), b)
	if m2["publishedAt"].(string) != first {
		t.Fatalf("publishedAt changed: %v -> %v", first, m2["publishedAt"])
	}
	_, pub := c.Do("GET", "/api/posts/p", nil)
	if pub["body"].(map[string]any)["en"] != "# Hi" || pub["title"].(map[string]any)["th"] != "" {
		t.Fatalf("public shape: %v", pub)
	}
}

func TestListPaginationAndTagFilter(t *testing.T) {
	c := setup(t)
	for i := 0; i < 12; i++ {
		tag := "go"
		if i%2 == 1 {
			tag = "react"
		}
		c.Do("POST", "/api/admin/posts", post("p"+strconv.Itoa(i), "published", tag))
	}
	_, m := c.Do("GET", "/api/posts?page=2&perPage=5", nil)
	if m["total"].(float64) != 12 || len(m["items"].([]any)) != 5 || m["page"].(float64) != 2 {
		t.Fatalf("page 2: %v", m)
	}
	if _, has := m["items"].([]any)[0].(map[string]any)["body"]; has {
		t.Fatal("list items must omit body")
	}
	_, m = c.Do("GET", "/api/posts?tag=react&perPage=500", nil)
	if m["total"].(float64) != 6 || m["perPage"].(float64) != 50 {
		t.Fatalf("tag filter / clamp: %v", m)
	}
}

func TestPostValidation(t *testing.T) {
	c := setup(t)
	b := post("ok", "archived")
	b["coverMediaId"] = 999
	b["titleEn"] = ""
	res, m := c.Do("POST", "/api/admin/posts", b)
	f := m["error"].(map[string]any)["fields"].(map[string]any)
	if res.StatusCode != 422 || f["status"] == nil || f["coverMediaId"] == nil || f["titleEn"] == nil {
		t.Fatalf("%d %v", res.StatusCode, m)
	}
	c.Do("POST", "/api/admin/posts", post("dup", "draft"))
	if res, _ := c.Do("POST", "/api/admin/posts", post("dup", "draft")); res.StatusCode != 409 {
		t.Fatal("slug conflict")
	}
}

func TestAdminListAndDelete(t *testing.T) {
	c := setup(t)
	_, m := c.Do("POST", "/api/admin/posts", post("d", "draft"))
	if m["publishedAt"] != nil || m["coverUrl"] != "" {
		t.Fatalf("draft shape: %v", m)
	}
	_, l := c.Do("GET", "/api/admin/posts?status=draft", nil)
	if len(l["items"].([]any)) != 1 {
		t.Fatalf("admin list: %v", l)
	}
	_, l = c.Do("GET", "/api/admin/posts?status=published", nil)
	if len(l["items"].([]any)) != 0 {
		t.Fatalf("admin list filter: %v", l)
	}
	if res, _ := c.Do("DELETE", "/api/admin/posts/"+id(m), nil); res.StatusCode != 204 {
		t.Fatal("delete")
	}
	if res, _ := c.Do("GET", "/api/admin/posts/"+id(m), nil); res.StatusCode != 404 {
		t.Fatal("get after delete")
	}
}
