// Package media implements image upload, serving and deletion.
package media

import (
	"context"
	"database/sql"

	"github.com/prommin01st-lang/petanque-website/server/internal/store"
)

// MaxUpload is the largest accepted image size in bytes.
const MaxUpload = 5 << 20

// Item is a stored upload.
type Item struct {
	ID           int64  `json:"id"`
	URL          string `json:"url"`
	Filename     string `json:"filename"`
	OriginalName string `json:"originalName"`
	Mime         string `json:"mime"`
	Size         int64  `json:"size"`
	Width        int    `json:"width"`
	Height       int    `json:"height"`
	CreatedAt    string `json:"createdAt"`
}

// URLFor returns the public URL of a stored filename.
func URLFor(filename string) string { return "/uploads/" + filename }

const cols = `id, filename, original_name, mime, size, width, height, created_at`

type scanner interface{ Scan(...any) error }

func scan(s scanner) (Item, error) {
	var it Item
	err := s.Scan(&it.ID, &it.Filename, &it.OriginalName, &it.Mime, &it.Size, &it.Width, &it.Height, &it.CreatedAt)
	it.URL = URLFor(it.Filename)
	return it, err
}

func list(ctx context.Context, db *sql.DB) ([]Item, error) {
	rows, err := db.QueryContext(ctx, `SELECT `+cols+` FROM media ORDER BY created_at DESC, id DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []Item{}
	for rows.Next() {
		it, err := scan(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, it)
	}
	return items, rows.Err()
}

func get(ctx context.Context, db *sql.DB, id int64) (Item, error) {
	return scan(db.QueryRowContext(ctx, `SELECT `+cols+` FROM media WHERE id = ?`, id))
}

func insert(ctx context.Context, db *sql.DB, it Item) (int64, error) {
	res, err := db.ExecContext(ctx, `INSERT INTO media (filename, original_name, mime, size, width, height, created_at) VALUES (?,?,?,?,?,?,?)`,
		it.Filename, it.OriginalName, it.Mime, it.Size, it.Width, it.Height, store.Now())
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}
