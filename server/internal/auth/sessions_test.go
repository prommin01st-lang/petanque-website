package auth

import (
	"context"
	"database/sql"
	"errors"
	"testing"
	"time"

	"github.com/prommin01st-lang/petanque-website/server/internal/store/storetest"
)

func seedAdmin(t *testing.T, db *sql.DB) int64 {
	t.Helper()
	if err := Bootstrap(context.Background(), db, "admin", "very-long-password"); err != nil {
		t.Fatal(err)
	}
	a, err := AdminByUsername(context.Background(), db, "admin")
	if err != nil {
		t.Fatal(err)
	}
	return a.ID
}

func TestSessionLifecycle(t *testing.T) {
	ctx, db := context.Background(), storetest.New(t)
	id := seedAdmin(t, db)
	now := time.Now()
	tok, s, err := CreateSession(ctx, db, id, StagePassword, "password", "1.2.3.4", "ua", now)
	if err != nil || s.Stage != StagePassword || s.CSRF == "" || s.ID == tok {
		t.Fatalf("create: %+v %v", s, err)
	}
	if _, err := LookupSession(ctx, db, tok, now.Add(11*time.Minute)); !errors.Is(err, sql.ErrNoRows) {
		t.Fatal("password-stage session must expire after 10 minutes")
	}
	newTok, full, err := UpgradeSession(ctx, db, tok, now)
	if err != nil || full.Stage != StageFull || newTok == tok {
		t.Fatalf("upgrade: %+v %v", full, err)
	}
	if _, err := LookupSession(ctx, db, tok, now); !errors.Is(err, sql.ErrNoRows) {
		t.Fatal("old token must be invalid after rotation")
	}
	if got, err := LookupSession(ctx, db, newTok, now.Add(6*24*time.Hour)); err != nil || got.AdminID != id {
		t.Fatalf("full session lookup: %v", err)
	}
	if err := DeleteAdminSessions(ctx, db, id); err != nil {
		t.Fatal(err)
	}
	if _, err := LookupSession(ctx, db, newTok, now); !errors.Is(err, sql.ErrNoRows) {
		t.Fatal("logout-all must remove session")
	}
}
