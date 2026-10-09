package httpx

import (
	"encoding/json"
	"errors"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestFailWritesEnvelope(t *testing.T) {
	rec := httptest.NewRecorder()
	Fail(rec, Validation(map[string]string{"slug": "required"}))
	if rec.Code != 422 {
		t.Fatalf("status %d", rec.Code)
	}
	var body struct {
		Error struct {
			Code   string            `json:"code"`
			Fields map[string]string `json:"fields"`
		} `json:"error"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &body)
	if body.Error.Code != "validation_failed" || body.Error.Fields["slug"] != "required" {
		t.Fatalf("body %s", rec.Body)
	}
}

func TestFailUnknownErrorIs500(t *testing.T) {
	rec := httptest.NewRecorder()
	Fail(rec, errors.New("boom"))
	if rec.Code != 500 || !strings.Contains(rec.Body.String(), `"internal"`) || strings.Contains(rec.Body.String(), "boom") {
		t.Fatalf("got %d %s", rec.Code, rec.Body)
	}
}

func TestDecodeJSON(t *testing.T) {
	var v struct{ A int }
	r := httptest.NewRequest("POST", "/", strings.NewReader(`{"A":1}`))
	if err := DecodeJSON(r, &v); err == nil {
		t.Fatal("missing content-type must fail")
	} else if e := err.(*Error); e.Status != 415 {
		t.Fatalf("status %d", e.Status)
	}
	r = httptest.NewRequest("POST", "/", strings.NewReader(`{"A":1,"B":2}`))
	r.Header.Set("Content-Type", "application/json; charset=utf-8")
	if err := DecodeJSON(r, &v); err == nil || err.(*Error).Status != 400 {
		t.Fatalf("unknown field must 400, got %v", err)
	}
	r = httptest.NewRequest("POST", "/", strings.NewReader(`{"A":1}`))
	r.Header.Set("Content-Type", "application/json")
	if err := DecodeJSON(r, &v); err != nil || v.A != 1 {
		t.Fatalf("got %v %v", v, err)
	}
	r = httptest.NewRequest("POST", "/", strings.NewReader(`{"A":1}{"A":2}`))
	r.Header.Set("Content-Type", "application/json")
	if err := DecodeJSON(r, &v); err == nil || err.(*Error).Status != 400 {
		t.Fatalf("trailing data must 400, got %v", err)
	}
	big := `{"A":1,"pad":"` + strings.Repeat("x", 1<<20) + `"}`
	r = httptest.NewRequest("POST", "/", strings.NewReader(big))
	r.Header.Set("Content-Type", "application/json")
	if err := DecodeJSON(r, &v); err == nil || err.(*Error).Status != 413 {
		t.Fatalf("oversize must 413, got %v", err)
	}
}

func TestClientIP(t *testing.T) {
	_, trusted, _ := net.ParseCIDR("172.16.0.0/12")
	r := httptest.NewRequest("GET", "/", nil)
	r.RemoteAddr = "172.18.0.5:1234"
	r.Header.Set("X-Forwarded-For", "6.6.6.6, 203.0.113.9, 172.18.0.1")
	if ip := ClientIP(r, trusted); ip != "203.0.113.9" {
		t.Fatalf("trusted proxy: %s", ip)
	}
	r.Header.Set("X-Forwarded-For", "not-an-ip")
	if ip := ClientIP(r, trusted); ip != "172.18.0.5" {
		t.Fatalf("garbage XFF must fall back to remote: %s", ip)
	}
	r.Header.Set("X-Forwarded-For", "6.6.6.6, 203.0.113.9, 172.18.0.1")
	r.RemoteAddr = "198.51.100.7:1"
	if ip := ClientIP(r, trusted); ip != "198.51.100.7" {
		t.Fatalf("untrusted proxy must ignore XFF: %s", ip)
	}
	r.RemoteAddr = "172.18.0.5:1234"
	if ip := ClientIP(r, nil); ip != "172.18.0.5" {
		t.Fatalf("no trusted proxy must use RemoteAddr only: %s", ip)
	}
}

func TestSecurityHeaders(t *testing.T) {
	h := SecurityHeaders(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest("GET", "/", nil))
	for _, k := range []string{"X-Content-Type-Options", "Referrer-Policy", "X-Frame-Options", "Content-Security-Policy"} {
		if rec.Header().Get(k) == "" {
			t.Fatalf("missing %s", k)
		}
	}
}
