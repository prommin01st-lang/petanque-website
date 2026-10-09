package config

import (
	"encoding/base64"
	"strings"
	"testing"
)

func env(m map[string]string) func(string) string { return func(k string) string { return m[k] } }

func base() map[string]string {
	return map[string]string{
		"PUBLIC_URL":     "https://example.com",
		"SESSION_SECRET": strings.Repeat("s", 32),
		"TOTP_ENC_KEY":   base64.StdEncoding.EncodeToString([]byte(strings.Repeat("k", 32))),
	}
}

func TestLoadDefaults(t *testing.T) {
	c, err := Load(env(base()))
	if err != nil {
		t.Fatal(err)
	}
	if c.Addr != ":8080" || c.DataDir != "/data" || !c.CookieSecure || c.GitHubEnabled() {
		t.Fatalf("bad defaults: %+v", c)
	}
	if len(c.TOTPKey) != 32 || c.TrustedProxy != nil {
		t.Fatalf("bad key/proxy (default must trust no proxy): %+v", c)
	}
}

func TestLoadTrustedProxy(t *testing.T) {
	m := base()
	m["TRUSTED_PROXY_CIDR"] = "172.28.0.0/16"
	c, err := Load(env(m))
	if err != nil {
		t.Fatal(err)
	}
	if c.TrustedProxy == nil || c.TrustedProxy.String() != "172.28.0.0/16" {
		t.Fatalf("proxy: %v", c.TrustedProxy)
	}
}

func TestLoadErrors(t *testing.T) {
	cases := map[string]func(m map[string]string){
		"missing public url": func(m map[string]string) { delete(m, "PUBLIC_URL") },
		"short secret":       func(m map[string]string) { m["SESSION_SECRET"] = "short" },
		"bad totp key":       func(m map[string]string) { m["TOTP_ENC_KEY"] = "not-base64!!" },
		"short totp key":     func(m map[string]string) { m["TOTP_ENC_KEY"] = base64.StdEncoding.EncodeToString([]byte("x")) },
		"half github":        func(m map[string]string) { m["GITHUB_CLIENT_ID"] = "id" },
		"bad cidr":           func(m map[string]string) { m["TRUSTED_PROXY_CIDR"] = "nope" },
	}
	for name, mut := range cases {
		t.Run(name, func(t *testing.T) {
			m := base()
			mut(m)
			if _, err := Load(env(m)); err == nil {
				t.Fatal("expected error")
			}
		})
	}
}

func TestCookieSecureFalseAndGitHub(t *testing.T) {
	m := base()
	m["COOKIE_SECURE"] = "false"
	m["GITHUB_CLIENT_ID"], m["GITHUB_CLIENT_SECRET"] = "id", "secret"
	c, err := Load(env(m))
	if err != nil || c.CookieSecure || !c.GitHubEnabled() {
		t.Fatalf("got %+v %v", c, err)
	}
}
