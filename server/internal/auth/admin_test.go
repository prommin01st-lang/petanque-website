package auth

import (
	"context"
	"testing"

	"github.com/prommin01st-lang/petanque-website/server/internal/store/storetest"
)

func TestBootstrap(t *testing.T) {
	ctx, db := context.Background(), storetest.New(t)
	if err := Bootstrap(ctx, db, "admin", "short"); err == nil {
		t.Fatal("short password must fail on empty table")
	}
	if err := Bootstrap(ctx, db, "admin", "very-long-password"); err != nil {
		t.Fatal(err)
	}
	if err := Bootstrap(ctx, db, "", ""); err != nil {
		t.Fatal("existing admin: env must be ignored")
	}
	a, err := AdminByUsername(ctx, db, "admin")
	if err != nil || !CheckPassword(a.PasswordHash, "very-long-password") || a.TOTPEnabled {
		t.Fatalf("%+v %v", a, err)
	}
}
