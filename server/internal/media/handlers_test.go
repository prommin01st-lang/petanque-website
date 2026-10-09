package media

import (
	"bytes"
	"image"
	"image/png"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"

	"github.com/prommin01st-lang/petanque-website/server/internal/auth"
	"github.com/prommin01st-lang/petanque-website/server/internal/testutil"
)

func pngBytes(t *testing.T) []byte {
	var b bytes.Buffer
	if err := png.Encode(&b, image.NewRGBA(image.Rect(0, 0, 3, 2))); err != nil {
		t.Fatal(err)
	}
	return b.Bytes()
}

func setup(t *testing.T) (*testutil.Client, string) {
	dir := t.TempDir()
	c, _ := testutil.NewServer(t, func(r chi.Router, ah *auth.Handler) {
		h := &Handler{DB: ah.DB, Dir: dir, IP: ah.ClientIP}
		h.ServeUploads(r)
		ah.AdminGroup(r, h.MountAdmin)
	})
	c.LoginFull()
	return c, dir
}

func upload(t *testing.T, c *testutil.Client, name string, data []byte) (*http.Response, map[string]any) {
	var b bytes.Buffer
	w := multipart.NewWriter(&b)
	fw, _ := w.CreateFormFile("file", name)
	fw.Write(data)
	w.Close()
	return c.DoRaw("POST", "/api/admin/media", w.FormDataContentType(), &b)
}

func TestUploadServeDelete(t *testing.T) {
	c, dir := setup(t)
	res, m := upload(t, c, "shot.png", pngBytes(t))
	if res.StatusCode != 201 || m["mime"] != "image/png" || m["width"].(float64) != 3 || m["height"].(float64) != 2 {
		t.Fatalf("upload: %d %v", res.StatusCode, m)
	}
	url := m["url"].(string)
	if !strings.HasPrefix(url, "/uploads/") || !strings.HasSuffix(url, ".png") || strings.Contains(url, "shot") {
		t.Fatalf("url must be uuid-based: %s", url)
	}
	get, _ := http.Get(c.Base + url)
	body, _ := io.ReadAll(get.Body)
	if get.StatusCode != 200 || !strings.Contains(get.Header.Get("Cache-Control"), "immutable") || !bytes.Equal(body, pngBytes(t)) {
		t.Fatalf("serve: %d %s", get.StatusCode, get.Header.Get("Cache-Control"))
	}
	if _, l := c.Do("GET", "/api/admin/media", nil); len(l["items"].([]any)) != 1 {
		t.Fatalf("list: %v", l)
	}
	id := int64(m["id"].(float64))
	if res, _ := c.Do("DELETE", "/api/admin/media/"+strconv.FormatInt(id, 10), nil); res.StatusCode != 204 {
		t.Fatal("delete")
	}
	if entries, _ := os.ReadDir(dir); len(entries) != 0 {
		t.Fatal("file must be removed from disk")
	}
}

func TestRejectsDisguisedAndOversize(t *testing.T) {
	c, _ := setup(t)
	if res, m := upload(t, c, "evil.png", []byte("<script>alert(1)</script>")); res.StatusCode != 422 {
		t.Fatalf("text as png: %d %v", res.StatusCode, m)
	}
	if res, m := upload(t, c, "x.svg", []byte(`<svg xmlns="http://www.w3.org/2000/svg"/>`)); res.StatusCode != 422 {
		t.Fatalf("svg must be rejected: %d %v", res.StatusCode, m)
	}
	big := append(pngBytes(t), make([]byte, MaxUpload)...)
	if res, _ := upload(t, c, "big.png", big); res.StatusCode != 413 {
		t.Fatalf("oversize: %d", res.StatusCode)
	}
}

func TestUploadsPathTraversal(t *testing.T) {
	c, dir := setup(t)
	os.WriteFile(filepath.Join(filepath.Dir(dir), "secret.txt"), []byte("s"), 0o600)
	for _, p := range []string{"/uploads/..%2fsecret.txt", "/uploads/%2e%2e/secret.txt"} {
		res, _ := http.Get(c.Base + p)
		if res.StatusCode == 200 {
			t.Fatalf("%s must not be served", p)
		}
	}
}
