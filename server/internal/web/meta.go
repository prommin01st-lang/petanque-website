package web

import (
	"html"
	"regexp"
	"strings"
)

// Meta is the per-page head metadata injected into the SPA shell.
type Meta struct {
	Title, Description, Image, URL string
	NoIndex                        bool
	Article                        bool
}

var titleRe = regexp.MustCompile(`(?is)<title>.*?</title>`)

// RenderIndex removes any existing <title> and replaces <!--app-meta--> with escaped meta tags.
func RenderIndex(index []byte, m Meta) []byte {
	s := titleRe.ReplaceAllString(string(index), "")
	return []byte(strings.Replace(s, "<!--app-meta-->", m.tags(), 1))
}

func (m Meta) tags() string {
	e := html.EscapeString
	typ := "website"
	if m.Article {
		typ = "article"
	}
	var b strings.Builder
	b.WriteString("<title>" + e(m.Title) + "</title>\n")
	b.WriteString(`<meta name="description" content="` + e(m.Description) + "\">\n")
	b.WriteString(`<meta property="og:title" content="` + e(m.Title) + "\">\n")
	b.WriteString(`<meta property="og:description" content="` + e(m.Description) + "\">\n")
	b.WriteString(`<meta property="og:image" content="` + e(m.Image) + "\">\n")
	b.WriteString(`<meta property="og:url" content="` + e(m.URL) + "\">\n")
	b.WriteString(`<meta property="og:type" content="` + typ + "\">\n")
	b.WriteString("<meta name=\"twitter:card\" content=\"summary_large_image\">\n")
	b.WriteString(`<link rel="canonical" href="` + e(m.URL) + "\">\n")
	if m.NoIndex {
		b.WriteString("<meta name=\"robots\" content=\"noindex\">\n")
	}
	return b.String()
}
