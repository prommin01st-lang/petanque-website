package main

import (
	"bufio"
	"context"
	"database/sql"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/prommin01st-lang/petanque-website/server/internal/app"
	"github.com/prommin01st-lang/petanque-website/server/internal/audit"
	"github.com/prommin01st-lang/petanque-website/server/internal/auth"
	"github.com/prommin01st-lang/petanque-website/server/internal/config"
	"github.com/prommin01st-lang/petanque-website/server/internal/seed"
	"github.com/prommin01st-lang/petanque-website/server/internal/store"
	"github.com/prommin01st-lang/petanque-website/server/internal/web"
)

func main() {
	os.Exit(run(os.Args[1:], os.Getenv, os.Stdin, os.Stdout))
}

// run dispatches subcommands and returns the process exit code.
func run(args []string, getenv func(string) string, stdin io.Reader, stdout io.Writer) int {
	cmd := "serve"
	if len(args) > 0 {
		cmd = args[0]
	}
	switch cmd {
	case "serve":
		return serve(getenv)
	case "healthcheck":
		return healthcheck(getenv, stdout)
	case "backup":
		rest := args[1:]
		force := false
		if len(rest) > 0 && rest[0] == "--force" {
			force, rest = true, rest[1:]
		}
		if len(rest) != 1 {
			fmt.Fprintln(stdout, "usage: server backup [--force] <dest>")
			return 2
		}
		return backup(getenv, rest[0], force, stdout)
	case "admin":
		return adminCmd(args[1:], getenv, stdin, stdout)
	default:
		fmt.Fprintf(stdout, "unknown subcommand %q (serve | healthcheck | backup [--force] <dest> | admin reset-password|reset-2fa <username>)\n", cmd)
		return 2
	}
}

// healthcheck probes /healthz on the local listener; it needs only ADDR.
func healthcheck(getenv func(string) string, stdout io.Writer) int {
	addr := strings.TrimSpace(getenv("ADDR"))
	if addr == "" {
		addr = ":8080"
	}
	_, port, err := net.SplitHostPort(addr)
	if err != nil {
		fmt.Fprintln(stdout, "invalid ADDR:", err)
		return 1
	}
	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Get("http://127.0.0.1:" + port + "/healthz")
	if err != nil {
		fmt.Fprintln(stdout, "unhealthy:", err)
		return 1
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		fmt.Fprintln(stdout, "unhealthy: status", resp.StatusCode)
		return 1
	}
	return 0
}

const adminUsage = "usage: server admin reset-password <username>   (new password on stdin)\n" +
	"       server admin reset-2fa <username>"

// adminCmd implements the offline recovery commands. reset-password reads the
// new password from the first line of stdin; both commands delete the admin's
// sessions and write an audit row with ip "cli".
func adminCmd(args []string, getenv func(string) string, stdin io.Reader, stdout io.Writer) int {
	if len(args) != 2 || (args[0] != "reset-password" && args[0] != "reset-2fa") {
		fmt.Fprintln(stdout, adminUsage)
		return 2
	}
	sub, username := args[0], args[1]
	var password string
	if sub == "reset-password" {
		fmt.Fprintf(stdout, "new password for %s (min %d chars): ", username, auth.MinPasswordLen)
		line, err := bufio.NewReader(stdin).ReadString('\n')
		if err != nil && !errors.Is(err, io.EOF) {
			fmt.Fprintln(stdout, "\ncannot read password:", err)
			return 1
		}
		fmt.Fprintln(stdout)
		password = strings.TrimRight(line, "\r\n")
		if len(password) < auth.MinPasswordLen {
			fmt.Fprintf(stdout, "password must be at least %d characters\n", auth.MinPasswordLen)
			return 1
		}
	}
	db, err := store.Open(filepath.Join(dataDir(getenv), "app.db"))
	if err != nil {
		fmt.Fprintln(stdout, "cannot open database:", err)
		return 1
	}
	defer db.Close()
	if err := store.Migrate(db); err != nil {
		fmt.Fprintln(stdout, "migration failed:", err)
		return 1
	}
	ctx := context.Background()
	var id int64
	action := "admin.password_reset"
	if sub == "reset-password" {
		id, err = auth.ResetPassword(ctx, db, username, password)
	} else {
		action = "admin.2fa_reset"
		id, err = auth.ResetTOTP(ctx, db, username)
	}
	if errors.Is(err, auth.ErrUnknownAdmin) {
		fmt.Fprintf(stdout, "no admin named %q\n", username)
		return 1
	}
	if err != nil {
		fmt.Fprintln(stdout, sub, "failed:", err)
		return 1
	}
	audit.Log(ctx, db, id, action, "admin", username, "cli")
	if sub == "reset-password" {
		fmt.Fprintf(stdout, "password reset for %s; all sessions revoked\n", username)
	} else {
		fmt.Fprintf(stdout, "2FA reset for %s; recovery codes and sessions removed — set up TOTP again at next login\n", username)
	}
	return 0
}

// dataDir returns DATA_DIR or its default.
func dataDir(getenv func(string) string) string {
	if dir := strings.TrimSpace(getenv("DATA_DIR")); dir != "" {
		return dir
	}
	return "/data"
}

// backup writes a consistent snapshot of DATA_DIR/app.db to dest. With force,
// an existing dest (and its -wal/-shm files) is removed first; VACUUM INTO
// refuses to overwrite.
func backup(getenv func(string) string, dest string, force bool, stdout io.Writer) int {
	db, err := store.Open(filepath.Join(dataDir(getenv), "app.db"))
	if err != nil {
		fmt.Fprintln(stdout, "cannot open database:", err)
		return 1
	}
	defer db.Close()
	if force {
		for _, f := range []string{dest, dest + "-wal", dest + "-shm"} {
			if err := os.Remove(f); err != nil && !errors.Is(err, os.ErrNotExist) {
				fmt.Fprintln(stdout, "cannot remove existing backup:", err)
				return 1
			}
		}
	}
	if err := store.Backup(context.Background(), db, dest); err != nil {
		fmt.Fprintln(stdout, "backup failed:", err)
		return 1
	}
	fmt.Fprintln(stdout, "backup written to", dest)
	return 0
}

func serve(getenv func(string) string) int {
	cfg, err := config.Load(getenv)
	if err != nil {
		slog.Error("invalid configuration", "err", err)
		return 1
	}
	if err := os.MkdirAll(filepath.Join(cfg.DataDir, "uploads"), 0o750); err != nil {
		slog.Error("cannot create data dir", "err", err)
		return 1
	}
	db, err := store.Open(filepath.Join(cfg.DataDir, "app.db"))
	if err != nil {
		slog.Error("cannot open database", "err", err)
		return 1
	}
	defer db.Close()
	if err := store.Migrate(db); err != nil {
		slog.Error("migration failed", "err", err)
		return 1
	}
	inserted, err := seed.Projects(context.Background(), db)
	if err != nil {
		slog.Error("seed failed", "err", err)
		return 1
	}
	slog.Info("seed projects", "inserted", inserted)
	if err := auth.Bootstrap(context.Background(), db, cfg.AdminUsername, cfg.AdminPassword); err != nil {
		slog.Error("admin bootstrap: set ADMIN_USERNAME and ADMIN_PASSWORD (>=12 chars)", "err", err)
		return 1
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	go purgeSessions(ctx, db)

	srv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           app.New(app.Deps{Cfg: cfg, DB: db, Dist: web.Dist()}),
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       120 * time.Second,
	}
	errc := make(chan error, 1)
	go func() { errc <- srv.ListenAndServe() }()
	slog.Info("listening", "addr", cfg.Addr)

	select {
	case err := <-errc:
		slog.Error("server stopped", "err", err)
		return 1
	case <-ctx.Done():
	}
	slog.Info("shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil && !errors.Is(err, http.ErrServerClosed) {
		slog.Error("graceful shutdown failed", "err", err)
		return 1
	}
	return 0
}

// purgeSessions deletes expired sessions hourly until ctx is cancelled.
func purgeSessions(ctx context.Context, db *sql.DB) {
	t := time.NewTicker(time.Hour)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			if err := auth.PurgeExpired(context.Background(), db, time.Now()); err != nil {
				slog.Error("purge expired sessions", "err", err)
			}
		}
	}
}
