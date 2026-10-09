// Package validate holds small field validators shared by the CMS handlers.
// Each returns an error message, or "" when the value is valid.
package validate

import (
	"regexp"
	"strings"
	"unicode/utf8"
)

const (
	maxSlug      = 80
	maxTags      = 12
	maxTagLength = 32
)

var slugRe = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

// Slug requires lowercase alphanumerics separated by single hyphens, max 80.
func Slug(s string) string {
	if s == "" {
		return "Required."
	}
	if len(s) > maxSlug {
		return "Must be at most 80 characters."
	}
	if !slugRe.MatchString(s) {
		return "Use lowercase letters, digits and single hyphens."
	}
	return ""
}

// URL accepts the empty string or an http(s) URL.
func URL(s string) string {
	if s == "" {
		return ""
	}
	l := strings.ToLower(s)
	if (strings.HasPrefix(l, "http://") && len(s) > 7) || (strings.HasPrefix(l, "https://") && len(s) > 8) {
		return ""
	}
	return "Must be empty or start with http:// or https://."
}

// Tags allows up to 12 non-blank tags of at most 32 characters each.
func Tags(tags []string) string {
	if len(tags) > maxTags {
		return "At most 12 tags."
	}
	for _, t := range tags {
		if strings.TrimSpace(t) == "" {
			return "Tags must not be blank."
		}
		if utf8.RuneCountInString(t) > maxTagLength {
			return "Each tag must be at most 32 characters."
		}
	}
	return ""
}

// Required rejects blank strings.
func Required(s string) string {
	if strings.TrimSpace(s) == "" {
		return "Required."
	}
	return ""
}
