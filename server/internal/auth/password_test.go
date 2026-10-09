package auth

import (
	"context"
	"testing"
)

func TestChangePassword(t *testing.T) {
	c, h := newEnv(t)
	secret := loginFull(t, c)
	other := c.fresh()
	if res, m := other.do("POST", "/api/auth/login", map[string]string{"username": "admin", "password": "very-long-password"}); res.StatusCode != 200 {
		t.Fatalf("second login: %d %v", res.StatusCode, m)
	}
	if res, _ := other.do("POST", "/api/auth/totp/verify", map[string]string{"code": c.code(secret, 0)}); res.StatusCode != 200 {
		t.Fatalf("second verify: %d", res.StatusCode)
	}
	if _, me := other.do("GET", "/api/auth/me", nil); me["csrfToken"] == nil {
		t.Fatal("other session not full")
	}

	path := "/api/auth/password"
	body := func(cur, next, code string) map[string]string {
		return map[string]string{"currentPassword": cur, "newPassword": next, "code": code}
	}

	if res, m := c.do("POST", path, body("very-long-password", "short", c.code(secret, 1))); res.StatusCode != 422 || m["error"].(map[string]any)["fields"].(map[string]any)["newPassword"] == nil {
		t.Fatalf("short password: %d %v", res.StatusCode, m)
	}
	if res, m := c.do("POST", path, body("very-long-password", "very-long-password", c.code(secret, 1))); res.StatusCode != 422 {
		t.Fatalf("same password: %d %v", res.StatusCode, m)
	}
	if res, m := c.do("POST", path, body("wrong-password-xx", "brand-new-password", c.code(secret, 1))); res.StatusCode != 401 || m["error"].(map[string]any)["code"] != "invalid_credentials" {
		t.Fatalf("wrong current: %d %v", res.StatusCode, m)
	}
	if res, m := c.do("POST", path, body("very-long-password", "brand-new-password", "000000")); res.StatusCode != 401 || m["error"].(map[string]any)["code"] != "invalid_code" {
		t.Fatalf("wrong code: %d %v", res.StatusCode, m)
	}
	saved := c.csrf
	c.csrf = ""
	if res, _ := c.do("POST", path, body("very-long-password", "brand-new-password", c.code(secret, 1))); res.StatusCode != 403 {
		t.Fatalf("no csrf: %d", res.StatusCode)
	}
	c.csrf = saved

	if res, m := c.do("POST", path, body("very-long-password", "brand-new-password", c.code(secret, 1))); res.StatusCode != 204 {
		t.Fatalf("change: %d %v", res.StatusCode, m)
	}
	if res, _ := c.do("GET", "/api/auth/me", nil); res.StatusCode != 200 {
		t.Fatal("current session must survive")
	}
	if res, _ := other.do("GET", "/api/auth/me", nil); res.StatusCode != 401 {
		t.Fatal("other session must be revoked")
	}
	a, _ := AdminByUsername(context.Background(), h.DB, "admin")
	if !CheckPassword(a.PasswordHash, "brand-new-password") || CheckPassword(a.PasswordHash, "very-long-password") {
		t.Fatal("password hash not updated")
	}
	var n int
	_ = h.DB.QueryRow(`SELECT COUNT(*) FROM audit_log WHERE action='admin.password_change'`).Scan(&n)
	if n != 1 {
		t.Fatalf("audit rows: %d", n)
	}
	if res, _ := c.fresh().do("POST", "/api/auth/login", map[string]string{"username": "admin", "password": "brand-new-password"}); res.StatusCode != 200 {
		t.Fatalf("login with new password: %d", res.StatusCode)
	}
}

func TestChangePasswordNeedsFullSession(t *testing.T) {
	c, _ := newEnv(t)
	if res, _ := c.do("POST", "/api/auth/password", map[string]string{"currentPassword": "x", "newPassword": "y", "code": "1"}); res.StatusCode != 401 {
		t.Fatalf("anonymous: %d", res.StatusCode)
	}
}
