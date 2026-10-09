# Deployment

Single host, Docker Compose: the Go app (serves the API and the built SPA) behind Caddy, which provisions HTTPS automatically. For hosts behind NAT / without opened ports there is an alternative path behind a Cloudflare Tunnel (see below).

## Cloudflare Tunnel (no public ports)

If the host sits behind NAT (home/server behind a router, no port forwarding) or you simply don't want to expose ports 80/443, serve the site through a Cloudflare Tunnel instead of Caddy. TLS is terminated at the Cloudflare edge; the `cloudflared` connector runs as a Compose service on the internal network and no host port is published at all.

1. Same `.env` as above (`DOMAIN=www.example.com` — the tunnel path only needs it for `PUBLIC_URL`).
2. Create the tunnel once with the cloudflared CLI (any machine authenticated for the zone, e.g. `cloudflared tunnel login`):

       cloudflared tunnel create petanque-website
       cloudflared tunnel route dns petanque-website www.example.com   # CNAME www -> <tunnel-id>.cfargotunnel.com (proxied)

   Copy the generated credentials JSON to `deploy/cloudflared/creds.json` and make it readable by the container user: `chown 65532:65532 deploy/cloudflared/creds.json` (the file is gitignored).
3. `docker compose -f docker-compose.yml -f docker-compose.cloudflare.yml up -d` — starts `app` + `cloudflared`; Caddy stays disabled (it only starts with `--profile direct`).
4. `TRUSTED_PROXY_CIDR=172.28.0.0/16` (default) already covers the connector's container IP, so visitor IPs reach the rate limiter via `X-Forwarded-For`.

The tunnel config lives in `deploy/cloudflared/config.yml` (ingress `www.example.com` -> `http://app:8080`). Back up `creds.json` together with `.env`; a lost credentials file means re-creating the tunnel (`cloudflared tunnel create` + `route dns --overwrite-dns`).

## Prerequisites

- A Linux host with Docker and the Compose plugin.
- A DNS A record for your domain pointing at the host; ports 80 and 443 (TCP and UDP) open.

## Setup

1. `cd deploy && cp .env.example .env`, then fill in `.env`:
   `DOMAIN`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` (12+ chars, used only on first start),
   `SESSION_SECRET` (`openssl rand -base64 48`), `TOTP_ENC_KEY` (`openssl rand -base64 32`).
   Keep `TRUSTED_PROXY_CIDR=172.28.0.0/16` unless you change the subnet in `docker-compose.yml`.
2. Optional GitHub linking: create a GitHub OAuth App with Homepage URL `https://DOMAIN` and
   callback URL `https://DOMAIN/api/auth/github/callback`, then set `GITHUB_CLIENT_ID` and
   `GITHUB_CLIENT_SECRET` (both or neither).
3. `docker compose up -d`

## Migrate and seed

Every start runs the same idempotent preparation: apply pending SQL migrations, seed the
11 portfolio projects into an empty `projects` table, and create the first admin from
`ADMIN_USERNAME`/`ADMIN_PASSWORD` when no admin exists. To run it on its own (e.g. before
switching traffic to a new version) and see what it did:

    docker compose run --rm --no-deps app migrate
    # migrations applied: 3
    # seeded projects: 11      (0 on later runs — existing data is never touched)

## Try it locally (no domain, no HTTPS)

    ./local-up.sh

Builds the image, generates `deploy/.env.local` with fresh secrets on the first run (prints
the admin password once), runs `migrate`, and starts the app on http://localhost:8088.
Stop with `docker compose -f docker-compose.local.yml down` (add `-v` to wipe the data).

## First login

Open `https://DOMAIN/admin/login`, sign in with the bootstrap admin, complete TOTP setup and
save the recovery codes. GitHub is linked afterwards from **Settings -> Link GitHub**; this
requires a current TOTP code.

## Backups

`backup.sh` snapshots the database (`/server backup`) and tars the uploads into `./backups`
(override with `BACKUP_DIR`), keeping the newest 14 of each. Run it daily from cron:

    0 3 * * * /opt/site/deploy/backup.sh

Also keep a copy of `deploy/.env` somewhere safe (it is not in `./backups`): the database is
useless for login without the same `TOTP_ENC_KEY` (it encrypts the stored TOTP secrets), and
`SESSION_SECRET` (signs the GitHub OAuth state) is required to start the server.

## Restore

    docker compose stop app
    docker run --rm -v deploy_app-data:/data -v $PWD/backups:/b alpine sh -c 'cp /b/backup-<STAMP>.db /data/app.db && rm -f /data/app.db-wal /data/app.db-shm && chown 65532:65532 /data/app.db'
    docker compose start app

(`<STAMP>` is the timestamp in the file name `backups/backup-<STAMP>.db` produced by `backup.sh`; run from `deploy/`. The volume name is `<compose project>_app-data`; `deploy_app-data` assumes the project directory is `deploy`.)
To restore uploads (the tarball `backups/uploads-<STAMP>.tgz` contains a single top-level
directory `uploads-<STAMP>/`):

    docker compose stop app
    docker run --rm -v deploy_app-data:/data -v $PWD/backups:/b alpine sh -c 'mkdir -p /data/uploads && tar -xzf /b/uploads-<STAMP>.tgz --strip-components=1 -C /data/uploads && chown -R 65532:65532 /data/uploads'
    docker compose start app

## Recovery

Lost the admin password or the authenticator device (and the recovery codes)? Run the
recovery commands inside the app container (from `deploy/`). Both revoke all sessions of
that admin, clear the account lockout from failed second-factor attempts (per-IP limits
still apply until their 15-minute window passes) and write an audit-log entry with IP `cli`.

Reset the password (12+ characters; read from stdin, so either type it interactively or pipe
it from a file you delete afterwards):

    docker compose exec -it app /server admin reset-password admin
    docker compose exec -T app /server admin reset-password admin < pw.txt

Reset two-factor authentication (removes the TOTP secret and all recovery codes; the next
login goes through TOTP setup again and issues new recovery codes):

    docker compose exec -T app /server admin reset-2fa admin

Replace `admin` with your `ADMIN_USERNAME`. Exit code 2 = usage error, 1 = failure
(e.g. unknown username or a too-short password).

## Update

There is no CI image registry; the image is built on the server from the checkout:

    git pull && docker compose build app && docker compose up -d
