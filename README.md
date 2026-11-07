# Yanci

Hausa-language Nigerian news publication — [yanci.ng](https://yanci.ng).

Astro 7 SSR (Node standalone) with a Postgres database, Cloudflare R2 media
storage, and a full editorial admin console.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Astro 7, `@astrojs/node` standalone |
| UI | Astro components + React 18 islands |
| Styling | Tailwind 4 |
| Database | Postgres via Drizzle ORM |
| Media | Cloudflare R2 (S3-compatible) |
| Auth | bcrypt + signed session cookies (`sessions` table) |

## Local development

```sh
npm install
cp .env.example .env          # fill in DATABASE_URL, SESSION_SECRET, R2_*
npm run db:migrate            # creates tables and seeds a fresh database
npm run dev
```

The site runs at `http://localhost:4321`; the admin console is at `/admin`.
A fresh database is seeded with an admin account from `INITIAL_ADMIN_EMAIL` and
`INITIAL_ADMIN_PASSWORD` (defaults: `admin@yanci.ng` / `Admin@123456`). Change
that password immediately in any environment reachable from the internet.

### Database

```sh
npm run db:generate    # generate a migration from src/db/schema.ts
npm run db:migrate     # apply migrations (auto-seeds an empty database)
npm run db:seed        # seed explicitly
```

Migrations live in `drizzle/` and are committed.

### Media

Uploads go to Cloudflare R2. The browser requests a presigned `PUT` from
`/api/admin/media/presign` and uploads directly to the bucket, which keeps large
files off the app server. The bucket must allow `PUT` from the site origin with
a `content-type` header, and `R2_PUBLIC_URL` must point at the bucket's public
domain — without it, media management is disabled.

### Autofetch

`npm run firecrawl:start` runs the optional self-hosted Firecrawl sidecar for
local scraping. In production a loopback Firecrawl URL is ignored; set
`ZYTE_API_KEY` if you need anti-bot rendering.

## Deploying to Heroku

Prerequisites: a Heroku account, a Cloudflare R2 bucket with a public custom
domain, and the Heroku CLI.

```sh
heroku create yanci-prod --region eu
heroku addons:create heroku-postgresql:essential-0 --app yanci-prod

heroku config:set --app yanci-prod \
  NODE_ENV=production \
  PUBLIC_SITE_URL=https://yanci.ng \
  SESSION_SECRET=$(openssl rand -hex 32) \
  INITIAL_ADMIN_EMAIL=you@example.com \
  INITIAL_ADMIN_PASSWORD='a-strong-password' \
  R2_ACCOUNT_ID=... \
  R2_ACCESS_KEY_ID=... \
  R2_SECRET_ACCESS_KEY=... \
  R2_BUCKET_NAME=yanci-media \
  R2_PUBLIC_URL=https://media.yanci.ng \
  GEMINI_API_KEY=...

git push heroku main
```

`Procfile` runs `npm run db:migrate` in the release phase, so migrations and the
initial seed apply before the web dyno boots. `PUBLIC_SITE_URL` and
`R2_PUBLIC_URL` are baked in at build time — set them before the first push.

Scheduled work runs through Heroku Scheduler:

| Command | Frequency | Purpose |
| --- | --- | --- |
| `npm run cron:publish` | daily | publish scheduled articles |
| `npm run cron:social` | every 10 minutes | post new articles to social |

Custom domain: `heroku domains:add yanci.ng`, then point a flattened `CNAME` at
the Heroku DNS target from Cloudflare. Leave the record DNS-only until Heroku
issues the certificate.

## Known limitations

- Heroku blocks outbound SMTP, so password-reset and contact email fall back to
  console logging. Use an HTTP email API before relying on them.
- Web push only queues notifications in `notifications_outbox`; no sender exists.
- Without Firecrawl or Zyte, autofetch cannot read anti-bot protected sources.
