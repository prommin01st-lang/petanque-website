package web

import (
	"context"
	"encoding/json"
	"encoding/xml"
	"io"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"

	"github.com/go-chi/chi/v5"

	"github.com/prommin01st-lang/petanque-website/server/internal/store"
	"github.com/prommin01st-lang/petanque-website/server/internal/store/storetest"
)

const index = `<!doctype html><html><head><!--app-meta--><title>dev</title></head><body></body></html>`

func setup(t *testing.T) (*chi.Mux, func(slug, title, status string)) {
	db := storetest.New(t)
	h := &Handler{DB: db, PublicURL: "https://ex.com", Dist: fstest.MapFS{
		"index.html":       {Data: []byte(index)},
		"assets/app-1a.js": {Data: []byte("console.log(1)")},
	}}
	r := chi.NewRouter()
	h.Mount(r)
	add := func(slug, title, status string) {
		pub := any(nil)
		if status == "published" {
			pub = store.Now()
		}
		_, err := db.ExecContext(context.Background(), `INSERT INTO posts(slug,title_en,excerpt_en,status,published_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?)`,
			slug, title, "excerpt "+slug, status, pub, store.Now(), store.Now())
		if err != nil {
			t.Fatal(err)
		}
	}
	return r, add
}

func get(r *chi.Mux, path string) (int, string, string) {
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, httptest.NewRequest("GET", path, nil))
	b, _ := io.ReadAll(rec.Body)
	return rec.Code, string(b), rec.Header().Get("Cache-Control")
}

func TestSPAFallbackAndAssets(t *testing.T) {
	r, _ := setup(t)
	code, body, cc := get(r, "/assets/app-1a.js")
	if code != 200 || body != "console.log(1)" || !strings.Contains(cc, "immutable") {
		t.Fatalf("asset: %d %s", code, cc)
	}
	code, body, cc = get(r, "/some/deep/route")
	if code != 200 || !strings.Contains(body, "<title>"+defaultTitle) || strings.Contains(body, "<title>dev</title>") || cc != "no-cache" {
		t.Fatalf("fallback: %d %s %s", code, cc, body)
	}
	if code, _, _ := get(r, "/assets/missing.js"); code != 404 {
		t.Fatal("missing asset must 404, not index")
	}
}

func structuredData(t *testing.T, body string) map[string]any {
	t.Helper()
	_, rest, found := strings.Cut(body, `<script type="application/ld+json">`)
	if !found {
		t.Fatal("missing structured data")
	}
	data, _, _ := strings.Cut(rest, "</script>")
	var result map[string]any
	if err := json.Unmarshal([]byte(data), &result); err != nil {
		t.Fatalf("invalid structured data: %v", err)
	}
	return result
}

func TestProfileSEOAndRobots(t *testing.T) {
	r, _ := setup(t)
	_, body, _ := get(r, "/?utm_source=test")
	data := structuredData(t, body)
	graph := data["@graph"].([]any)
	person := graph[0].(map[string]any)
	if person["name"] != personName || person["image"] != "https://ex.com"+portraitPath {
		t.Fatalf("incorrect identity: %+v", person)
	}
	if graph[2].(map[string]any)["mainEntity"].(map[string]any)["@id"] != person["@id"] {
		t.Fatal("profile must reference the same person")
	}
	for _, want := range []string{personNameThai, `href="https://ex.com/"`, `name="twitter:image"`, `property="og:image:alt"`, "max-image-preview:large"} {
		if !strings.Contains(body, want) {
			t.Errorf("home metadata missing %s", want)
		}
	}
	code, robots, _ := get(r, "/robots.txt")
	if code != 200 || !strings.Contains(robots, "Sitemap: https://ex.com/sitemap.xml") || strings.Contains(robots, "Disallow: /api/\n") {
		t.Fatalf("public content must remain crawlable: %s", robots)
	}
	_, sm, _ := get(r, "/sitemap.xml")
	if !strings.Contains(sm, `<image:loc>https://ex.com`+portraitPath+`</image:loc>`) {
		t.Fatalf("portrait missing from sitemap: %s", sm)
	}
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, httptest.NewRequest("GET", "/profile.png", nil))
	if rec.Code != 301 || rec.Header().Get("Location") != portraitPath {
		t.Fatal("old portrait URL must redirect to the renamed asset")
	}
}

func TestArticleStructuredDataEscapesCMSContent(t *testing.T) {
	r, add := setup(t)
	title := `</script><script>alert("xss")</script>`
	add("article", title, "published")
	_, body, _ := get(r, "/blog/article")
	data := structuredData(t, body)
	if data["@type"] != "BlogPosting" || data["headline"] != title || data["author"].(map[string]any)["name"] != personName {
		t.Fatalf("incorrect article data: %+v", data)
	}
	if strings.Contains(body, title) {
		t.Fatal("CMS content can break out of the JSON-LD script")
	}
	for _, route := range []string{"/admin/login", "/blog/missing", "/missing"} {
		_, hidden, _ := get(r, route)
		if strings.Contains(hidden, "application/ld+json") {
			t.Errorf("structured data must not appear on %s", route)
		}
	}
}

func TestPostMetaEscapedAndDraftHidden(t *testing.T) {
	r, add := setup(t)
	add("xss", `</title><script>alert(1)</script>`, "published")
	add("draft", "Secret Draft", "draft")
	_, body, _ := get(r, "/blog/xss")
	if strings.Contains(body, "<script>alert(1)") || !strings.Contains(body, "&lt;/title&gt;&lt;script&gt;") {
		t.Fatalf("meta not escaped: %s", body)
	}
	if !strings.Contains(body, `<link rel="canonical" href="https://ex.com/blog/xss">`) {
		t.Fatalf("canonical: %s", body)
	}
	_, body, _ = get(r, "/blog/draft")
	if strings.Contains(body, "Secret Draft") {
		t.Fatal("draft meta leaked")
	}
	_, body, _ = get(r, "/admin/projects")
	if !strings.Contains(body, `<meta name="robots" content="noindex">`) {
		t.Fatal("admin must be noindex")
	}
}

func TestFeeds(t *testing.T) {
	r, add := setup(t)
	add("hello", "Hello & <World>", "published")
	add("hidden", "Hidden", "draft")
	code, rss, _ := get(r, "/rss.xml")
	if code != 200 || !strings.Contains(rss, "<link>https://ex.com/blog/hello</link>") || strings.Contains(rss, "hidden") || !strings.Contains(rss, "Hello &amp; &lt;World&gt;") {
		t.Fatalf("rss: %s", rss)
	}
	_, sm, _ := get(r, "/sitemap.xml")
	for _, want := range []string{"<loc>https://ex.com/</loc>", "<loc>https://ex.com/blog</loc>", "<loc>https://ex.com/blog/hello</loc>"} {
		if !strings.Contains(sm, want) {
			t.Fatalf("sitemap missing %s: %s", want, sm)
		}
	}
	if strings.Contains(sm, "hidden") {
		t.Fatal("draft in sitemap")
	}
}

// rootOf returns the root element of an XML document.
func rootOf(t *testing.T, doc string) xml.StartElement {
	t.Helper()
	dec := xml.NewDecoder(strings.NewReader(doc))
	for {
		tok, err := dec.Token()
		if err != nil {
			t.Fatalf("no root element: %v\n%s", err, doc)
		}
		if se, ok := tok.(xml.StartElement); ok {
			return se
		}
	}
}

func TestFeedRootElements(t *testing.T) {
	r, add := setup(t)
	add("hello", "Hello", "published")

	_, rss, _ := get(r, "/rss.xml")
	var feed struct {
		XMLName xml.Name `xml:"rss"`
		Version string   `xml:"version,attr"`
		Channel struct {
			Items []struct {
				Title string `xml:"title"`
			} `xml:"item"`
		} `xml:"channel"`
	}
	if root := rootOf(t, rss); root.Name.Local != "rss" {
		t.Fatalf("rss root = <%s>, want <rss>:\n%s", root.Name.Local, rss)
	}
	if err := xml.Unmarshal([]byte(rss), &feed); err != nil || feed.Version != "2.0" || len(feed.Channel.Items) != 1 || feed.Channel.Items[0].Title != "Hello" {
		t.Fatalf("rss parse: %+v %v\n%s", feed, err, rss)
	}

	_, sm, _ := get(r, "/sitemap.xml")
	root := rootOf(t, sm)
	if root.Name.Local != "urlset" || root.Name.Space != "http://www.sitemaps.org/schemas/sitemap/0.9" {
		t.Fatalf("sitemap root = %+v, want sitemaps.org <urlset>:\n%s", root.Name, sm)
	}
}

func TestNoIndexForUnknownRoutes(t *testing.T) {
	r, add := setup(t)
	add("hello", "Hello", "published")
	add("draft", "Draft", "draft")
	const noindex = `<meta name="robots" content="noindex">`
	for _, p := range []string{"/blog/missing", "/blog/draft", "/some/deep/route", "/nope", "/blog/hello/extra"} {
		code, body, _ := get(r, p)
		if code != 200 || !strings.Contains(body, noindex) {
			t.Errorf("%s: want 200 + noindex, got %d", p, code)
		}
	}
	for _, p := range []string{"/", "/blog", "/blog/hello"} {
		if _, body, _ := get(r, p); strings.Contains(body, noindex) {
			t.Errorf("%s must be indexable", p)
		}
	}
}
