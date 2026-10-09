// Package storetest provides fresh migrated in-memory databases for tests.
package storetest

import (
	"database/sql"
	"fmt"
	"sync/atomic"
	"testing"

	"github.com/prommin01st-lang/petanque-website/server/internal/store"
)

var n atomic.Int64

// New returns a fresh migrated in-memory database closed on test cleanup.
func New(t testing.TB) *sql.DB {
	t.Helper()
	dsn := fmt.Sprintf("file:mem%d?mode=memory&cache=shared&_pragma=foreign_keys(1)", n.Add(1))
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		t.Fatal(err)
	}
	db.SetMaxOpenConns(1)
	t.Cleanup(func() { _ = db.Close() })
	if err := store.Migrate(db); err != nil {
		t.Fatal(err)
	}
	return db
}
