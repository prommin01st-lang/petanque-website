package posts

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/prommin01st-lang/petanque-website/server/internal/httpx"
	"github.com/prommin01st-lang/petanque-website/server/internal/media"
	"github.com/prommin01st-lang/petanque-website/server/internal/store"
)

var errSlugTaken = httpx.NewError(http.StatusConflict, "slug_taken", "That slug is already in use.")

const from = ` FROM posts p LEFT JOIN media m ON m.id = p.cover_media_id`

const cols = `p.id, p.slug, p.title_en, p.title_th, p.excerpt_en, p.excerpt_th, p.body_en, p.body_th, p.tags, p.cover_media_id, COALESCE(m.filename, ''), p.status, p.published_at, p.created_at, p.updated_at`

type scanner interface{ Scan(dest ...any) error }

func parseTags(s string) []string {
	var tags []string
	if err := json.Unmarshal([]byte(s), &tags); err != nil || tags == nil {
		return []string{}
	}
	return tags
}

func coverURL(filename string) string {
	if filename == "" {
		return ""
	}
	return media.URLFor(filename)
}

func scan(s scanner) (Admin, error) {
	var a Admin
	var tags, file string
	if err := s.Scan(&a.ID, &a.Slug, &a.TitleEn, &a.TitleTh, &a.ExcerptEn, &a.ExcerptTh, &a.BodyEn, &a.BodyTh,
		&tags, &a.CoverMediaID, &file, &a.Status, &a.PublishedAt, &a.CreatedAt, &a.UpdatedAt); err != nil {
		return a, err
	}
	a.Tags = parseTags(tags)
	a.CoverURL = coverURL(file)
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

func coverExists(ctx context.Context, db *sql.DB, id int64) (bool, error) {
	var n int
	err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM media WHERE id = ?`, id).Scan(&n)
	return n > 0, err
}

func listAdmin(ctx context.Context, db *sql.DB, status string) ([]Admin, error) {
	q := `SELECT ` + cols + from
	args := []any{}
	if status != "" {
		q += ` WHERE p.status = ?`
		args = append(args, status)
	}
	rows, err := db.QueryContext(ctx, q+` ORDER BY p.updated_at DESC, p.id DESC`, args...)
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
	a, err := scan(db.QueryRowContext(ctx, `SELECT `+cols+from+` WHERE p.id = ?`, id))
	return a, mapErr(err)
}

func publishedAtFor(in Input, now string) *string {
	if in.Status == "published" {
		return &now
	}
	return nil
}

func create(ctx context.Context, db *sql.DB, in Input) (Admin, error) {
	tags, _ := json.Marshal(in.Tags)
	now := store.Now()
	res, err := db.ExecContext(ctx, `INSERT INTO posts(slug,title_en,title_th,excerpt_en,excerpt_th,body_en,body_th,tags,cover_media_id,status,published_at,created_at,updated_at)
		VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,
		in.Slug, in.TitleEn, in.TitleTh, in.ExcerptEn, in.ExcerptTh, in.BodyEn, in.BodyTh, string(tags),
		in.CoverMediaID, in.Status, publishedAtFor(in, now), now, now)
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
	now := store.Now()
	res, err := db.ExecContext(ctx, `UPDATE posts SET slug=?,title_en=?,title_th=?,excerpt_en=?,excerpt_th=?,body_en=?,body_th=?,tags=?,cover_media_id=?,status=?,
		published_at = CASE WHEN ? = 'published' AND published_at IS NULL THEN ? ELSE published_at END, updated_at=? WHERE id=?`,
		in.Slug, in.TitleEn, in.TitleTh, in.ExcerptEn, in.ExcerptTh, in.BodyEn, in.BodyTh, string(tags),
		in.CoverMediaID, in.Status, in.Status, now, now, id)
	if err != nil {
		return Admin{}, mapErr(err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return Admin{}, httpx.ErrNotFound
	}
	return get(ctx, db, id)
}

func remove(ctx context.Context, db *sql.DB, id int64) error {
	res, err := db.ExecContext(ctx, `DELETE FROM posts WHERE id = ?`, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return httpx.ErrNotFound
	}
	return nil
}

func summaryFields(tags, file string) ([]string, string) { return parseTags(tags), coverURL(file) }

// ListPublished returns one page of published posts (newest first), optionally filtered by tag, and the total count.
func ListPublished(ctx context.Context, db *sql.DB, tag string, limit, offset int) ([]PublicSummary, int, error) {
	where := ` WHERE p.status = 'published'`
	args := []any{}
	if tag != "" {
		where += ` AND EXISTS (SELECT 1 FROM json_each(p.tags) WHERE value = ?)`
		args = append(args, tag)
	}
	var total int
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*)`+from+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := db.QueryContext(ctx, `SELECT p.slug, p.title_en, p.title_th, p.excerpt_en, p.excerpt_th, p.tags, COALESCE(m.filename,''), COALESCE(p.published_at,'')`+
		from+where+` ORDER BY p.published_at DESC, p.id DESC LIMIT ? OFFSET ?`, append(args, limit, offset)...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	out := []PublicSummary{}
	for rows.Next() {
		var s PublicSummary
		var tags, file string
		if err := rows.Scan(&s.Slug, &s.Title.En, &s.Title.Th, &s.Excerpt.En, &s.Excerpt.Th, &tags, &file, &s.PublishedAt); err != nil {
			return nil, 0, err
		}
		s.Tags, s.CoverURL = summaryFields(tags, file)
		out = append(out, s)
	}
	return out, total, rows.Err()
}

// PublishedBySlug returns a published post or httpx.ErrNotFound.
func PublishedBySlug(ctx context.Context, db *sql.DB, slug string) (Public, error) {
	var p Public
	var tags, file string
	err := db.QueryRowContext(ctx, `SELECT p.slug, p.title_en, p.title_th, p.excerpt_en, p.excerpt_th, p.body_en, p.body_th, p.tags, COALESCE(m.filename,''), COALESCE(p.published_at,'')`+
		from+` WHERE p.slug = ? AND p.status = 'published'`, slug).
		Scan(&p.Slug, &p.Title.En, &p.Title.Th, &p.Excerpt.En, &p.Excerpt.Th, &p.Body.En, &p.Body.Th, &tags, &file, &p.PublishedAt)
	if err != nil {
		return p, mapErr(err)
	}
	p.Tags, p.CoverURL = summaryFields(tags, file)
	return p, nil
}
