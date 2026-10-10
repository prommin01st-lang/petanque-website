package web

import "github.com/prommin01st-lang/petanque-website/server/internal/posts"

func (h *Handler) personData() map[string]any {
	return map[string]any{
		"@type": "Person", "@id": h.PublicURL + "/#person",
		"name": personName, "alternateName": []string{personNameThai, "Petanque", "Petanque21st"},
		"url": h.PublicURL + "/", "image": h.defaultImage(),
		"jobTitle": "Full-Stack Web Developer",
		"sameAs": []string{
			"https://github.com/prommin01st-lang",
			"https://www.linkedin.com/in/prommin-chandet-36b87940a",
			"https://www.facebook.com/petanque.pommin",
			"https://www.instagram.com/p_65_t_61_6e_71_75_e/",
		},
	}
}

func (h *Handler) profileData() map[string]any {
	return map[string]any{
		"@context": "https://schema.org",
		"@graph": []any{
			h.personData(),
			map[string]any{
				"@type": "WebSite", "@id": h.PublicURL + "/#website",
				"url": h.PublicURL + "/", "name": "Petanque21st",
				"alternateName": "Petanque", "inLanguage": []string{"en", "th"},
				"author": map[string]string{"@id": h.PublicURL + "/#person"},
			},
			map[string]any{
				"@type": "ProfilePage", "@id": h.PublicURL + "/#profile",
				"url": h.PublicURL + "/", "name": defaultTitle, "description": defaultDescription,
				"mainEntity": map[string]string{"@id": h.PublicURL + "/#person"},
				"isPartOf":   map[string]string{"@id": h.PublicURL + "/#website"},
			},
		},
	}
}

func (h *Handler) articleData(post posts.Public, m Meta) map[string]any {
	data := map[string]any{
		"@context": "https://schema.org", "@type": "BlogPosting",
		"@id": m.URL + "#article", "url": m.URL, "mainEntityOfPage": m.URL,
		"headline": post.Title.En, "description": m.Description,
		"datePublished": post.PublishedAt, "inLanguage": "en",
		"author": h.personData(),
	}
	// The portrait is a social-card fallback, not an illustration of every article.
	if post.CoverURL != "" {
		data["image"] = m.Image
	}
	return data
}
