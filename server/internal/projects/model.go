// Package projects implements the public and admin projects API.
package projects

import (
	"strings"

	"github.com/prommin01st-lang/petanque-website/server/internal/httpx"
	"github.com/prommin01st-lang/petanque-website/server/internal/validate"
)

// Input is the writable part of a project.
type Input struct {
	Slug      string   `json:"slug"`
	NameEn    string   `json:"nameEn"`
	NameTh    string   `json:"nameTh"`
	DescEn    string   `json:"descEn"`
	DescTh    string   `json:"descTh"`
	Tags      []string `json:"tags"`
	Metric    string   `json:"metric"`
	RepoURL   string   `json:"repoUrl"`
	DemoURL   string   `json:"demoUrl"`
	Flagship  bool     `json:"flagship"`
	Published bool     `json:"published"`
}

// Admin is the full project row as seen by the admin UI.
type Admin struct {
	Input
	ID        int64  `json:"id"`
	SortOrder int    `json:"sortOrder"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}

type Localized struct {
	En string `json:"en"`
	Th string `json:"th"`
}

// Public is the visitor-facing shape; it carries no internal id.
type Public struct {
	Slug        string    `json:"slug"`
	Name        Localized `json:"name"`
	Description Localized `json:"description"`
	Tags        []string  `json:"tags"`
	Metric      string    `json:"metric"`
	RepoURL     string    `json:"repoUrl"`
	DemoURL     string    `json:"demoUrl"`
	Flagship    bool      `json:"flagship"`
}

// validate trims the input in place and returns a 422 error when invalid.
func (in *Input) validate() *httpx.Error {
	in.Slug = strings.TrimSpace(in.Slug)
	in.NameEn = strings.TrimSpace(in.NameEn)
	in.NameTh = strings.TrimSpace(in.NameTh)
	in.DescEn = strings.TrimSpace(in.DescEn)
	in.DescTh = strings.TrimSpace(in.DescTh)
	in.Metric = strings.TrimSpace(in.Metric)
	in.RepoURL = strings.TrimSpace(in.RepoURL)
	in.DemoURL = strings.TrimSpace(in.DemoURL)
	if in.Tags == nil {
		in.Tags = []string{}
	}
	for i := range in.Tags {
		in.Tags[i] = strings.TrimSpace(in.Tags[i])
	}
	f := map[string]string{}
	for k, msg := range map[string]string{
		"slug":    validate.Slug(in.Slug),
		"nameEn":  validate.Required(in.NameEn),
		"descEn":  validate.Required(in.DescEn),
		"tags":    validate.Tags(in.Tags),
		"repoUrl": validate.URL(in.RepoURL),
		"demoUrl": validate.URL(in.DemoURL),
	} {
		if msg != "" {
			f[k] = msg
		}
	}
	if len(f) > 0 {
		return httpx.Validation(f)
	}
	return nil
}
