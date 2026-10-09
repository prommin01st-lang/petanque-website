package store

import (
	"context"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestFormatTimeFixedWidthSortable(t *testing.T) {
	a := FormatTime(time.Date(2026, 1, 2, 3, 4, 5, 0, time.UTC))
	b := FormatTime(time.Date(2026, 1, 2, 3, 4, 5, 5e8, time.UTC))
	if len(a) != len(b) {
		t.Fatalf("widths differ: %q %q", a, b)
	}
	if !(a < b) {
		t.Fatalf("%q should sort before %q", a, b)
	}
	if !strings.HasSuffix(b, "Z") || b[len(b)-5] != '.' {
		t.Fatalf("bad format %q", b)
	}
}

func TestOpenMigrateIdempotent(t *testing.T) {
	path := filepath.Join(t.TempDir(), "app.db")
	db, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	for i := 0; i < 2; i++ {
		if err := Migrate(db); err != nil {
			t.Fatalf("migrate #%d: %v", i, err)
		}
	}
	var n int
	if err := db.QueryRow(`SELECT COUNT(*) FROM schema_migrations`).Scan(&n); err != nil || n != 3 {
		t.Fatalf("migrations recorded = %d, %v", n, err)
	}
	var fk int
	_ = db.QueryRow(`PRAGMA foreign_keys`).Scan(&fk)
	if fk != 1 {
		t.Fatal("foreign keys off")
	}
	var jm string
	_ = db.QueryRow(`PRAGMA journal_mode`).Scan(&jm)
	if jm != "wal" {
		t.Fatalf("journal_mode = %q", jm)
	}
	var bt int
	_ = db.QueryRow(`PRAGMA busy_timeout`).Scan(&bt)
	if bt != 5000 {
		t.Fatalf("busy_timeout = %d", bt)
	}
	for _, tbl := range []string{"admins", "recovery_codes", "sessions", "projects", "media", "posts", "audit_log", "login_attempts"} {
		if _, err := db.Exec("SELECT 1 FROM " + tbl + " LIMIT 1"); err != nil {
			t.Fatalf("table %s: %v", tbl, err)
		}
	}
}

func TestUniqueViolationAndBackup(t *testing.T) {
	dir := t.TempDir()
	db, _ := Open(filepath.Join(dir, "a.db"))
	defer db.Close()
	_ = Migrate(db)
	ins := `INSERT INTO projects(slug,name_en,desc_en,created_at,updated_at) VALUES('x','X','d',?,?)`
	if _, err := db.Exec(ins, Now(), Now()); err != nil {
		t.Fatal(err)
	}
	_, err := db.Exec(ins, Now(), Now())
	if !IsUniqueViolation(err) {
		t.Fatalf("want unique violation, got %v", err)
	}
	dest := filepath.Join(dir, "backup.db")
	if err := Backup(context.Background(), db, dest); err != nil {
		t.Fatal(err)
	}
	b, err := Open(dest)
	if err != nil {
		t.Fatal(err)
	}
	defer b.Close()
	var n int
	if err := b.QueryRow(`SELECT COUNT(*) FROM projects`).Scan(&n); err != nil {
		t.Fatal(err)
	}
	if n != 1 {
		t.Fatalf("backup rows %d", n)
	}
}

func TestParseTimeRoundTrip(t *testing.T) {
	in := time.Date(2026, 10, 9, 12, 34, 56, 789_000_000, time.UTC)
	got, err := ParseTime(FormatTime(in))
	if err != nil || !got.Equal(in) {
		t.Fatalf("got %v %v", got, err)
	}
	if _, err := ParseTime("nope"); err == nil {
		t.Fatal("garbage must fail")
	}
}
