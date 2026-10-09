package projects

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/prommin01st-lang/petanque-website/server/internal/httpx"
	"github.com/prommin01st-lang/petanque-website/server/internal/store"
)

var errSlugTaken = httpx.NewError(http.StatusConflict, "slug_taken", "That slug is already in use.")

const cols = `id, slug, name_en, name_th, desc_en, desc_th, tags, metric, repo_url, demo_url, flagship, sort_order, published, created_at, updated_at`

type scanner interface{ Scan(dest ...any) error }

func scan(s scanner) (Admin, error) {
	var a Admin
	var tags string
	if err := s.Scan(&a.ID, &a.Slug, &a.NameEn, &a.NameTh, &a.DescEn, &a.DescTh, &tags, &a.Metric,
		&a.RepoURL, &a.DemoURL, &a.Flagship, &a.SortOrder, &a.Published, &a.CreatedAt, &a.UpdatedAt); err != nil {
		return a, err
	}
	if err := json.Unmarshal([]byte(tags), &a.Tags); err != nil || a.Tags == nil {
		a.Tags = []string{}
	}
	return a, nil
}

func mapErr(err error) error {
	switch {
	case errors.Is(err, sql.ErrNoRows):
		return httpx.ErrNotFound
	case store.IsUniqueViolation(err):
		return errSlugTaken
	}
	return err
}

func list(ctx context.Context, db *sql.DB, publishedOnly bool) ([]Admin, error) {
	q := `SELECT ` + cols + ` FROM projects`
	if publishedOnly {
		q += ` WHERE published = 1`
	}
	rows, err := db.QueryContext(ctx, q+` ORDER BY sort_order, id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Admin{}
	for rows.Next() {
		a, err := scan(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func get(ctx context.Context, db *sql.DB, id int64) (Admin, error) {
	a, err := scan(db.QueryRowContext(ctx, `SELECT `+cols+` FROM projects WHERE id = ?`, id))
	return a, mapErr(err)
}

func create(ctx context.Context, db *sql.DB, in Input) (Admin, error) {
	tags, _ := json.Marshal(in.Tags)
	now := store.Now()
	res, err := db.ExecContext(ctx, `INSERT INTO projects(slug,name_en,name_th,desc_en,desc_th,tags,metric,repo_url,demo_url,flagship,sort_order,published,created_at,updated_at)
		VALUES(?,?,?,?,?,?,?,?,?,?,(SELECT COALESCE(MAX(sort_order),0)+1 FROM projects),?,?,?)`,
		in.Slug, in.NameEn, in.NameTh, in.DescEn, in.DescTh, string(tags), in.Metric, in.RepoURL, in.DemoURL, in.Flagship, in.Published, now, now)
	if err != nil {
		return Admin{}, mapErr(err)
	}
	id, err := res.LastInsertId()
	if err != nil {
		return Admin{}, err
	}
	return get(ctx, db, id)
}

func update(ctx context.Context, db *sql.DB, id int64, in Input) (Admin, error) {
	tags, _ := json.Marshal(in.Tags)
	res, err := db.ExecContext(ctx, `UPDATE projects SET slug=?,name_en=?,name_th=?,desc_en=?,desc_th=?,tags=?,metric=?,repo_url=?,demo_url=?,flagship=?,published=?,updated_at=? WHERE id=?`,
		in.Slug, in.NameEn, in.NameTh, in.DescEn, in.DescTh, string(tags), in.Metric, in.RepoURL, in.DemoURL, in.Flagship, in.Published, store.Now(), id)
	if err != nil {
		return Admin{}, mapErr(err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return Admin{}, httpx.ErrNotFound
	}
	return get(ctx, db, id)
}

func remove(ctx context.Context, db *sql.DB, id int64) error {
	res, err := db.ExecContext(ctx, `DELETE FROM projects WHERE id = ?`, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return httpx.ErrNotFound
	}
	return nil
}

// reorder assigns sort_order 1..n following ids, which must be exactly the set of project ids.
func reorder(ctx context.Context, db *sql.DB, ids []int64) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	rows, err := tx.QueryContext(ctx, `SELECT id FROM projects`)
	if err != nil {
		return err
	}
	existing := map[int64]bool{}
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			rows.Close()
			return err
		}
		existing[id] = true
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return err
	}
	seen := map[int64]bool{}
	for _, id := range ids {
		if !existing[id] || seen[id] {
			return httpx.Validation(map[string]string{"ids": "Must list every project exactly once."})
		}
		seen[id] = true
	}
	if len(seen) != len(existing) {
		return httpx.Validation(map[string]string{"ids": "Must list every project exactly once."})
	}
	for i, id := range ids {
		if _, err := tx.ExecContext(ctx, `UPDATE projects SET sort_order = ? WHERE id = ?`, i+1, id); err != nil {
			return err
		}
	}
	return tx.Commit()
}
