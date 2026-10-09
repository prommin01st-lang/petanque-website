// Package config loads and validates runtime configuration from the environment.
package config

import (
	"encoding/base64"
	"errors"
	"fmt"
	"net"
	"strings"
)

type Config struct {
	Addr               string
	PublicURL          string
	DataDir            string
	AdminUsername      string
	AdminPassword      string
	SessionSecret      []byte
	TOTPKey            []byte
	GitHubClientID     string
	GitHubClientSecret string
	CookieSecure       bool
	TrustedProxy       *net.IPNet // nil = trust no proxy
}

func (c Config) GitHubEnabled() bool { return c.GitHubClientID != "" && c.GitHubClientSecret != "" }

func Load(getenv func(string) string) (Config, error) {
	get := func(k, def string) string {
		if v := strings.TrimSpace(getenv(k)); v != "" {
			return v
		}
		return def
	}
	c := Config{
		Addr:               get("ADDR", ":8080"),
		PublicURL:          strings.TrimRight(get("PUBLIC_URL", ""), "/"),
		DataDir:            get("DATA_DIR", "/data"),
		AdminUsername:      get("ADMIN_USERNAME", ""),
		AdminPassword:      getenv("ADMIN_PASSWORD"),
		GitHubClientID:     get("GITHUB_CLIENT_ID", ""),
		GitHubClientSecret: get("GITHUB_CLIENT_SECRET", ""),
		CookieSecure:       get("COOKIE_SECURE", "true") != "false",
	}
	var errs []error
	if !strings.HasPrefix(c.PublicURL, "http://") && !strings.HasPrefix(c.PublicURL, "https://") {
		errs = append(errs, errors.New("PUBLIC_URL must be an http(s) URL"))
	}
	c.SessionSecret = []byte(getenv("SESSION_SECRET"))
	if len(c.SessionSecret) < 32 {
		errs = append(errs, errors.New("SESSION_SECRET must be at least 32 bytes"))
	}
	key, err := base64.StdEncoding.DecodeString(get("TOTP_ENC_KEY", ""))
	if err != nil || len(key) != 32 {
		errs = append(errs, errors.New("TOTP_ENC_KEY must be 32 bytes, base64-encoded (openssl rand -base64 32)"))
	}
	c.TOTPKey = key
	if (c.GitHubClientID == "") != (c.GitHubClientSecret == "") {
		errs = append(errs, errors.New("set both GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET, or neither"))
	}
	// Empty (the default) trusts no proxy: the client IP is always RemoteAddr.
	if v := get("TRUSTED_PROXY_CIDR", ""); v != "" {
		_, cidr, err := net.ParseCIDR(v)
		if err != nil {
			errs = append(errs, fmt.Errorf("TRUSTED_PROXY_CIDR: %w", err))
		}
		c.TrustedProxy = cidr
	}
	return c, errors.Join(errs...)
}
