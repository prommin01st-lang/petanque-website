// Package seed loads the initial portfolio content into an empty database.
package seed

import (
	"context"
	"database/sql"
	_ "embed"
	"encoding/json"
	"fmt"

	"github.com/prommin01st-lang/petanque-website/server/internal/store"
)

//go:embed projects.json
var projectsJSON []byte

type project struct {
	Slug     string   `json:"slug"`
	NameEn   string   `json:"nameEn"`
	NameTh   string   `json:"nameTh"`
	DescEn   string   `json:"descEn"`
	DescTh   string   `json:"descTh"`
	Tags     []string `json:"tags"`
	Metric   string   `json:"metric"`
	RepoURL  string   `json:"repoUrl"`
	DemoURL  string   `json:"demoUrl"`
	Flagship bool     `json:"flagship"`
}

// Projects inserts the embedded projects when the projects table is empty.
// It returns the number of rows inserted (0 when the table already has data).
func Projects(ctx context.Context, db *sql.DB) (int, error) {
	var items []project
	if err := json.Unmarshal(projectsJSON, &items); err != nil {
		return 0, fmt.Errorf("parse projects.json: %w", err)
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	var count int
	if err := tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM projects`).Scan(&count); err != nil {
		return 0, err
	}
	if count > 0 {
		return 0, nil
	}
	now := store.Now()
	for i, p := range items {
		tags, err := json.Marshal(p.Tags)
		if err != nil {
			return 0, err
		}
		flagship := 0
		if p.Flagship {
			flagship = 1
		}
		if _, err := tx.ExecContext(ctx, `INSERT INTO projects
			(slug, name_en, name_th, desc_en, desc_th, tags, metric, repo_url, demo_url, flagship, sort_order, published, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
			p.Slug, p.NameEn, p.NameTh, p.DescEn, p.DescTh, string(tags), p.Metric, p.RepoURL, p.DemoURL, flagship, i, now, now); err != nil {
			return 0, fmt.Errorf("insert %s: %w", p.Slug, err)
		}
	}
	if err := tx.Commit(); err != nil {
		return 0, err
	}
	return len(items), nil
}
