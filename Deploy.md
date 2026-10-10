# Deploy the SEO and profile update

Production runs on a separate machine. These changes have not been deployed there.
Run the following commands on that production machine, in its existing checkout.
The local `localhost:8088` Compose instance is a development installation.

## What this release changes

- Home title, visible name, and portrait metadata identify Prommin Chandet / Petanque.
- English and Thai profile copy reflects the owner interview: BA/SA internship,
  queue management work with Next.js, .NET and PostgreSQL, image upload improvements,
  and current study of LLMs, fine-tuning and data analysis.
- The footer invites conversation and links to the owner's confirmed social profiles.
- The server emits Person, ProfilePage, WebSite and blog article structured data,
  complete social image metadata, robots.txt and an image-aware sitemap.
- The portrait is now `/prommin-chandet-petanque.png`. `/profile.png` redirects to it.

The live CMS entry `queue-backend` has already been updated through the admin console
in this session: Customer Queue Management, bilingual description, confirmed technology
tags, and the owner's responsibilities. Its old coverage claim was removed. The seed
file matches this correction for new databases; seeds never overwrite existing data.
Other project claims have not been verified by this interview.

## Prepare the production checkout

First transfer the reviewed source changes to the production checkout using your normal
Git workflow. If using Git, commit and push this release from the development machine,
then pull the intended branch on the production machine. A `git pull` cannot deploy
changes that still exist only in the local working tree.

```bash
cd /path/to/petanque-website
git status --short
git pull --ff-only
cd deploy
```

Keep the production `.env`, tunnel credentials, database and uploads on that machine.
Do not replace them with development files. Check that its existing `deploy/.env` has
`DOMAIN=www.petanque21st.com` and `COOKIE_SECURE=true`. Compose sets
`PUBLIC_URL=https://$DOMAIN`, so setting only `PUBLIC_URL` in `.env` is insufficient.

Use the Compose files that are already serving the site. For the Cloudflare Tunnel
installation:

```bash
export COMPOSE_FILE=docker-compose.yml:docker-compose.cloudflare.yml
docker compose ps
```

For a direct Caddy installation instead, use `export COMPOSE_FILE=docker-compose.yml`.
Use the Docker context that owns the existing production containers; do not switch
contexts or create a second Compose project for this update.

## Back up, build and restart the app

```bash
./backup.sh
SITE_RELEASE_STAMP=$(date +%Y%m%d-%H%M%S)
SITE_PREVIOUS_IMAGE=$(docker inspect --format '{{.Image}}' "$(docker compose ps -q app)")
docker tag "$SITE_PREVIOUS_IMAGE" "petanque-website:before-seo-$SITE_RELEASE_STAMP"
docker compose build app
docker compose up -d --no-deps app
docker compose ps
docker compose exec -T app /server healthcheck
```

Stop if any command fails. The Docker build compiles the SPA and embeds it in the Go
binary; copying frontend files without rebuilding the server does not update the site.
The app restart may briefly interrupt requests. No database migration is introduced by
this release. Preserve the existing volumes; do not use `down -v`.

## Verify the public result

```bash
curl -fsS https://www.petanque21st.com/healthz
curl -fsS https://www.petanque21st.com/
curl -fsS https://www.petanque21st.com/robots.txt
curl -fsS https://www.petanque21st.com/sitemap.xml
curl -fsSI https://www.petanque21st.com/prommin-chandet-petanque.png
curl -sSI https://www.petanque21st.com/profile.png
```

The home response must contain the new full-name title, JSON-LD and the public canonical
URL, never `localhost`. The portrait must return an image response, and the old portrait
URL must return a 301. The sitemap must include the portrait. Cloudflare may add managed
robots.txt text; verify the public response still includes the sitemap and allows public
images, JavaScript and the public API. Purge stale robots.txt/image cache entries if needed.

Open the home page on desktop and mobile, switch EN/TH, try the ASCII/photo button, and
check the social links. Check a published blog post's title, canonical and author data.
Admin and draft pages must retain `noindex`.

## Request indexing

In the owner's [Google Search Console](https://search.google.com/search-console), verify
the domain if needed and submit `https://www.petanque21st.com/sitemap.xml`. Run URL
Inspection's live test for the home page, check the rendered content, and request indexing.
Validate the home page and a published article using the
[Rich Results Test](https://search.google.com/test/rich-results).

Track impressions, clicks and average position for the owner's English and Thai names,
Petanque and Petanque21st. Google decides indexing and ranking; first position is not
guaranteed. The language toggle still shares one URL, so English and Thai do not yet have
separate indexable routes. Both names are visible in the initial English page.

## Roll back the application if needed

Using the same shell and Compose files as above:

```bash
APP_IMAGE="petanque-website:before-seo-$SITE_RELEASE_STAMP" docker compose up -d --no-deps app
docker compose exec -T app /server healthcheck
```

If opening a new shell, replace the variable with the saved rollback image tag. An image
rollback preserves the database and does not undo the CMS copy edit. Database/uploads
recovery procedures are in [deploy/README.md](deploy/README.md#restore).

References: [Google SEO guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide),
[profile structured data](https://developers.google.com/search/docs/appearance/structured-data/profile-page),
and [image SEO](https://developers.google.com/search/docs/appearance/google-images).
