package main

import (
	"bytes"
	"context"
	"database/sql"
	"fmt"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/prommin01st-lang/petanque-website/server/internal/auth"
	"github.com/prommin01st-lang/petanque-website/server/internal/store"
)

func TestBackupSubcommand(t *testing.T) {
	dir := t.TempDir()
	db, err := store.Open(filepath.Join(dir, "app.db"))
	if err != nil {
		t.Fatal(err)
	}
	if err := store.Migrate(db); err != nil {
		t.Fatal(err)
	}
	db.Close()
	dest := filepath.Join(dir, "out.db")
	env := map[string]string{"DATA_DIR": dir}
	if code := run([]string{"backup", dest}, func(k string) string { return env[k] }, strings.NewReader(""), &bytes.Buffer{}); code != 0 {
		t.Fatalf("exit %d", code)
	}
	if _, err := os.Stat(dest); err != nil {
		t.Fatal(err)
	}
	getenv := func(k string) string { return env[k] }
	if code := run([]string{"backup", dest}, getenv, strings.NewReader(""), &bytes.Buffer{}); code == 0 {
		t.Fatal("second backup without --force must fail")
	}
	if code := run([]string{"backup", "--force", dest}, getenv, strings.NewReader(""), &bytes.Buffer{}); code != 0 {
		t.Fatalf("second backup with --force exit %d", code)
	}
	if code := run([]string{"backup", "--force", dest}, getenv, strings.NewReader(""), &bytes.Buffer{}); code != 0 {
		t.Fatalf("third backup with --force exit %d", code)
	}
}

func TestHealthcheckSubcommand(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/healthz" {
			w.WriteHeader(200)
		}
	}))
	defer srv.Close()
	_, port, _ := net.SplitHostPort(srv.Listener.Addr().String())
	env := map[string]string{"ADDR": ":" + port}
	if code := run([]string{"healthcheck"}, func(k string) string { return env[k] }, strings.NewReader(""), &bytes.Buffer{}); code != 0 {
		t.Fatalf("healthy exit %d", code)
	}
	srv.Close()
	if code := run([]string{"healthcheck"}, func(k string) string { return env[k] }, strings.NewReader(""), &bytes.Buffer{}); code != 1 {
		t.Fatal("down server must exit 1")
	}
}

func TestUnknownSubcommand(t *testing.T) {
	if code := run([]string{"nope"}, func(string) string { return "" }, strings.NewReader(""), &bytes.Buffer{}); code != 2 {
		t.Fatal("unknown subcommand must exit 2")
	}
}

// adminDB creates a migrated DB in a temp DATA_DIR with one admin that has
// TOTP enabled, recovery codes and two sessions.
func adminDB(t *testing.T) (dir string, db *sql.DB, adminID int64) {
	t.Helper()
	dir = t.TempDir()
	db, err := store.Open(filepath.Join(dir, "app.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	if err := store.Migrate(db); err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	if err := auth.Bootstrap(ctx, db, "admin", "old-password-123"); err != nil {
		t.Fatal(err)
	}
	a, err := auth.AdminByUsername(ctx, db, "admin")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`UPDATE admins SET totp_secret_enc=x'0102', totp_enabled=1, totp_last_step=42 WHERE id=?`, a.ID); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO recovery_codes(admin_id, code_hash) VALUES(?, 'h1'), (?, 'h2')`, a.ID, a.ID); err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 2; i++ {
		if _, _, err := auth.CreateSession(ctx, db, a.ID, "full", "password", "1.2.3.4", "ua", time.Now()); err != nil {
			t.Fatal(err)
		}
	}
	return dir, db, a.ID
}

func count(t *testing.T, db *sql.DB, q string, args ...any) int {
	t.Helper()
	var n int
	if err := db.QueryRow(q, args...).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

func TestAdminResetPassword(t *testing.T) {
	dir, db, id := adminDB(t)
	getenv := func(k string) string { return map[string]string{"DATA_DIR": dir}[k] }
	out := &bytes.Buffer{}
	code := run([]string{"admin", "reset-password", "admin"}, getenv, strings.NewReader("brand-new-password-42\n"), out)
	if code != 0 {
		t.Fatalf("exit %d: %s", code, out)
	}
	a, err := auth.AdminByID(context.Background(), db, id)
	if err != nil {
		t.Fatal(err)
	}
	if !auth.CheckPassword(a.PasswordHash, "brand-new-password-42") {
		t.Fatal("new password not set")
	}
	if auth.CheckPassword(a.PasswordHash, "old-password-123") {
		t.Fatal("old password still valid")
	}
	if n := count(t, db, `SELECT COUNT(*) FROM sessions WHERE admin_id=?`, id); n != 0 {
		t.Fatalf("sessions left: %d", n)
	}
	if !a.TOTPEnabled {
		t.Fatal("password reset must not touch 2FA")
	}
	if n := count(t, db, `SELECT COUNT(*) FROM audit_log WHERE action='admin.password_reset' AND admin_id=? AND ip='cli'`, id); n != 1 {
		t.Fatalf("audit rows: %d", n)
	}
}

func TestAdminResetPasswordRejectsShortPassword(t *testing.T) {
	dir, db, id := adminDB(t)
	getenv := func(k string) string { return map[string]string{"DATA_DIR": dir}[k] }
	if code := run([]string{"admin", "reset-password", "admin"}, getenv, strings.NewReader("short\n"), &bytes.Buffer{}); code != 1 {
		t.Fatalf("short password exit %d, want 1", code)
	}
	a, _ := auth.AdminByID(context.Background(), db, id)
	if !auth.CheckPassword(a.PasswordHash, "old-password-123") {
		t.Fatal("password changed despite rejection")
	}
	if n := count(t, db, `SELECT COUNT(*) FROM sessions WHERE admin_id=?`, id); n != 2 {
		t.Fatalf("sessions touched: %d", n)
	}
}

func TestAdminResetPasswordUnknownUser(t *testing.T) {
	dir, _, _ := adminDB(t)
	getenv := func(k string) string { return map[string]string{"DATA_DIR": dir}[k] }
	out := &bytes.Buffer{}
	if code := run([]string{"admin", "reset-password", "nobody"}, getenv, strings.NewReader("brand-new-password-42\n"), out); code != 1 {
		t.Fatalf("unknown user exit %d, want 1", code)
	}
	if !strings.Contains(out.String(), "nobody") {
		t.Fatalf("message should name the user: %q", out)
	}
}

func TestAdminReset2FA(t *testing.T) {
	dir, db, id := adminDB(t)
	getenv := func(k string) string { return map[string]string{"DATA_DIR": dir}[k] }
	out := &bytes.Buffer{}
	if code := run([]string{"admin", "reset-2fa", "admin"}, getenv, strings.NewReader(""), out); code != 0 {
		t.Fatalf("exit %d: %s", code, out)
	}
	a, err := auth.AdminByID(context.Background(), db, id)
	if err != nil {
		t.Fatal(err)
	}
	if a.TOTPEnabled || a.TOTPSecretEnc != nil || a.TOTPLastStep != 0 {
		t.Fatalf("totp not cleared: %+v", a)
	}
	if !auth.CheckPassword(a.PasswordHash, "old-password-123") {
		t.Fatal("2FA reset must keep the password")
	}
	if n := count(t, db, `SELECT COUNT(*) FROM recovery_codes WHERE admin_id=?`, id); n != 0 {
		t.Fatalf("recovery codes left: %d", n)
	}
	if n := count(t, db, `SELECT COUNT(*) FROM sessions WHERE admin_id=?`, id); n != 0 {
		t.Fatalf("sessions left: %d", n)
	}
	if n := count(t, db, `SELECT COUNT(*) FROM audit_log WHERE action='admin.2fa_reset' AND admin_id=? AND ip='cli'`, id); n != 1 {
		t.Fatalf("audit rows: %d", n)
	}
}

func TestAdminReset2FAUnknownUser(t *testing.T) {
	dir, _, _ := adminDB(t)
	getenv := func(k string) string { return map[string]string{"DATA_DIR": dir}[k] }
	if code := run([]string{"admin", "reset-2fa", "nobody"}, getenv, strings.NewReader(""), &bytes.Buffer{}); code != 1 {
		t.Fatalf("unknown user exit %d, want 1", code)
	}
}

func TestAdminUsage(t *testing.T) {
	for _, args := range [][]string{{"admin"}, {"admin", "reset-password"}, {"admin", "nope", "admin"}, {"admin", "reset-2fa", "a", "b"}} {
		if code := run(args, func(string) string { return "" }, strings.NewReader(""), &bytes.Buffer{}); code != 2 {
			t.Fatalf("%v exit %d, want 2", args, code)
		}
	}
}

func TestAdminResetsClearAccountLockout(t *testing.T) {
	for _, tc := range []struct {
		args  []string
		stdin string
	}{
		{[]string{"admin", "reset-password", "admin"}, "brand-new-password-42\n"},
		{[]string{"admin", "reset-2fa", "admin"}, ""},
	} {
		t.Run(tc.args[1], func(t *testing.T) {
			dir, db, id := adminDB(t)
			key := fmt.Sprintf("admin:%d", id)
			now := store.Now()
			if _, err := db.Exec(`INSERT INTO login_attempts(ip, at) VALUES(?,?),(?,?),(?,?)`, key, now, key, now, "203.0.113.9", now); err != nil {
				t.Fatal(err)
			}
			getenv := func(k string) string { return map[string]string{"DATA_DIR": dir}[k] }
			if code := run(tc.args, getenv, strings.NewReader(tc.stdin), &bytes.Buffer{}); code != 0 {
				t.Fatalf("exit %d", code)
			}
			if n := count(t, db, `SELECT COUNT(*) FROM login_attempts WHERE ip=?`, key); n != 0 {
				t.Fatalf("account lockout rows left: %d", n)
			}
			if n := count(t, db, `SELECT COUNT(*) FROM login_attempts WHERE ip='203.0.113.9'`); n != 1 {
				t.Fatalf("per-IP row must remain, got %d", n)
			}
		})
	}
}

func TestMigrateSubcommandMigratesSeedsAndBootstraps(t *testing.T) {
	dir := t.TempDir()
	env := map[string]string{
		"DATA_DIR":       dir,
		"PUBLIC_URL":     "http://localhost:8088",
		"ADMIN_USERNAME": "admin",
		"ADMIN_PASSWORD": "first-start-password-1",
		"SESSION_SECRET": strings.Repeat("s", 48),
		"TOTP_ENC_KEY":   "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc=",
	}
	getenv := func(k string) string { return env[k] }

	out := &bytes.Buffer{}
	if code := run([]string{"migrate"}, getenv, strings.NewReader(""), out); code != 0 {
		t.Fatalf("exit %d: %s", code, out)
	}
	if !strings.Contains(out.String(), "seeded projects: 11") {
		t.Fatalf("output: %q", out)
	}

	db, err := store.Open(filepath.Join(dir, "app.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	if n := count(t, db, `SELECT COUNT(*) FROM projects`); n != 11 {
		t.Fatalf("projects: %d", n)
	}
	if n := count(t, db, `SELECT COUNT(*) FROM admins`); n != 1 {
		t.Fatalf("admins: %d", n)
	}

	// Idempotent: a second run applies nothing new and seeds nothing.
	out.Reset()
	if code := run([]string{"migrate"}, getenv, strings.NewReader(""), out); code != 0 {
		t.Fatalf("second run exit %d: %s", code, out)
	}
	if !strings.Contains(out.String(), "seeded projects: 0") {
		t.Fatalf("second run output: %q", out)
	}
	if n := count(t, db, `SELECT COUNT(*) FROM projects`); n != 11 {
		t.Fatalf("projects after rerun: %d", n)
	}
}

func TestMigrateSubcommandRejectsBadConfig(t *testing.T) {
	getenv := func(k string) string { return map[string]string{"DATA_DIR": t.TempDir()}[k] }
	out := &bytes.Buffer{}
	if code := run([]string{"migrate"}, getenv, strings.NewReader(""), out); code != 1 {
		t.Fatalf("exit %d, want 1: %s", code, out)
	}
}
