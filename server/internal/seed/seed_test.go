package seed

import (
	"context"
	"testing"

	"github.com/prommin01st-lang/petanque-website/server/internal/store/storetest"
)

func TestProjectsSeedOnce(t *testing.T) {
	db := storetest.New(t)
	n, err := Projects(context.Background(), db)
	if err != nil || n != 11 {
		t.Fatalf("first seed: %d %v", n, err)
	}
	n, err = Projects(context.Background(), db)
	if err != nil || n != 0 {
		t.Fatalf("second seed must be a no-op: %d %v", n, err)
	}
	var slug, nameTh string
	var flagship int
	_ = db.QueryRow(`SELECT slug, name_th, flagship FROM projects ORDER BY sort_order LIMIT 1`).Scan(&slug, &nameTh, &flagship)
	if slug != "kanban" || nameTh == "" || flagship != 1 {
		t.Fatalf("first row: %s %q %d", slug, nameTh, flagship)
	}
}
