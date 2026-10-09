// Package posts implements the public and admin blog posts API.
package posts

import (
	"strings"
	"unicode/utf8"

	"github.com/prommin01st-lang/petanque-website/server/internal/validate"
)

const maxBody = 200000

// Input is the writable part of a post.
type Input struct {
	Slug         string   `json:"slug"`
	TitleEn      string   `json:"titleEn"`
	TitleTh      string   `json:"titleTh"`
	ExcerptEn    string   `json:"excerptEn"`
	ExcerptTh    string   `json:"excerptTh"`
	BodyEn       string   `json:"bodyEn"`
	BodyTh       string   `json:"bodyTh"`
	Tags         []string `json:"tags"`
	CoverMediaID *int64   `json:"coverMediaId"`
	Status       string   `json:"status"`
}

// Admin is the full post row as seen by the admin UI.
type Admin struct {
	Input
	ID          int64   `json:"id"`
	CoverURL    string  `json:"coverUrl"`
	PublishedAt *string `json:"publishedAt"`
	CreatedAt   string  `json:"createdAt"`
	UpdatedAt   string  `json:"updatedAt"`
}

// Localized holds a string in both site languages.
type Localized struct {
	En string `json:"en"`
	Th string `json:"th"`
}

// PublicSummary is a post as shown in listings (no body).
type PublicSummary struct {
	Slug        string    `json:"slug"`
	Title       Localized `json:"title"`
	Excerpt     Localized `json:"excerpt"`
	Tags        []string  `json:"tags"`
	CoverURL    string    `json:"coverUrl"`
	PublishedAt string    `json:"publishedAt"`
}

// Public is a full published post.
type Public struct {
	PublicSummary
	Body Localized `json:"body"`
}

// normalize trims the input in place and returns field errors (nil when valid).
func (in *Input) normalize() map[string]string {
	in.Slug = strings.TrimSpace(in.Slug)
	in.TitleEn = strings.TrimSpace(in.TitleEn)
	in.TitleTh = strings.TrimSpace(in.TitleTh)
	in.ExcerptEn = strings.TrimSpace(in.ExcerptEn)
	in.ExcerptTh = strings.TrimSpace(in.ExcerptTh)
	in.Status = strings.TrimSpace(in.Status)
	if in.Tags == nil {
		in.Tags = []string{}
	}
	for i := range in.Tags {
		in.Tags[i] = strings.TrimSpace(in.Tags[i])
	}
	f := map[string]string{}
	for k, msg := range map[string]string{
		"slug":    validate.Slug(in.Slug),
		"titleEn": validate.Required(in.TitleEn),
		"tags":    validate.Tags(in.Tags),
	} {
		if msg != "" {
			f[k] = msg
		}
	}
	if in.Status != "draft" && in.Status != "published" {
		f["status"] = "Must be draft or published."
	}
	if utf8.RuneCountInString(in.BodyEn) > maxBody {
		f["bodyEn"] = "Too long (max 200000 characters)."
	}
	if utf8.RuneCountInString(in.BodyTh) > maxBody {
		f["bodyTh"] = "Too long (max 200000 characters)."
	}
	return f
}
