package web

import (
	"encoding/xml"
	"net/http"
	"time"

	"github.com/prommin01st-lang/petanque-website/server/internal/httpx"
	"github.com/prommin01st-lang/petanque-website/server/internal/posts"
	"github.com/prommin01st-lang/petanque-website/server/internal/store"
)

type rssFeed struct {
	XMLName xml.Name   `xml:"rss"`
	Version string     `xml:"version,attr"`
	Channel rssChannel `xml:"channel"`
}

type rssChannel struct {
	Title       string    `xml:"title"`
	Link        string    `xml:"link"`
	Description string    `xml:"description"`
	Items       []rssItem `xml:"item"`
}

type rssItem struct {
	Title       string `xml:"title"`
	Link        string `xml:"link"`
	GUID        string `xml:"guid"`
	PubDate     string `xml:"pubDate"`
	Description string `xml:"description"`
}

type urlSet struct {
	XMLName xml.Name  `xml:"http://www.sitemaps.org/schemas/sitemap/0.9 urlset"`
	URLs    []siteURL `xml:"url"`
}

type siteURL struct {
	Loc     string `xml:"loc"`
	LastMod string `xml:"lastmod,omitempty"`
}

func writeXML(w http.ResponseWriter, contentType string, v any) {
	out, err := xml.MarshalIndent(v, "", "  ")
	if err != nil {
		httpx.Fail(w, err)
		return
	}
	w.Header().Set("Content-Type", contentType)
	_, _ = w.Write([]byte(xml.Header))
	_, _ = w.Write(out)
}

func (h *Handler) rss(w http.ResponseWriter, r *http.Request) {
	list, _, err := posts.ListPublished(r.Context(), h.DB, "", 20, 0)
	if err != nil {
		httpx.Fail(w, err)
		return
	}
	ch := rssChannel{Title: "Petanque21st — Blog", Link: h.PublicURL + "/blog", Description: defaultDescription, Items: []rssItem{}}
	for _, p := range list {
		it := rssItem{Title: p.Title.En, Link: h.PublicURL + "/blog/" + p.Slug, GUID: h.PublicURL + "/blog/" + p.Slug, Description: p.Excerpt.En}
		if t, err := store.ParseTime(p.PublishedAt); err == nil {
			it.PubDate = t.Format(time.RFC1123Z)
		}
		ch.Items = append(ch.Items, it)
	}
	writeXML(w, "application/rss+xml; charset=utf-8", rssFeed{Version: "2.0", Channel: ch})
}

func (h *Handler) sitemap(w http.ResponseWriter, r *http.Request) {
	set := urlSet{URLs: []siteURL{{Loc: h.PublicURL + "/"}, {Loc: h.PublicURL + "/blog"}}}
	const page = 50
	for offset := 0; ; offset += page {
		list, total, err := posts.ListPublished(r.Context(), h.DB, "", page, offset)
		if err != nil {
			httpx.Fail(w, err)
			return
		}
		for _, p := range list {
			u := siteURL{Loc: h.PublicURL + "/blog/" + p.Slug}
			if t, err := store.ParseTime(p.PublishedAt); err == nil {
				u.LastMod = t.Format("2006-01-02")
			}
			set.URLs = append(set.URLs, u)
		}
		if offset+page >= total {
			break
		}
	}
	writeXML(w, "application/xml; charset=utf-8", set)
}
