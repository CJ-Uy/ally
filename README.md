# Ally Desktop

Electron + Vite + React desktop app wired to Turso (via Drizzle) and R2 (via S3).

## Develop

```bash
pnpm install
pnpm dev
```

## Environment variables

Create a `.env` file in the project root with:

```
TURSO_DATABASE_URL=your_turso_url
TURSO_AUTH_TOKEN=your_turso_token

CLOUDFLARE_R2_BUCKET_NAME=your_bucket_name
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key_id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_access_key
CLOUDFLARE_R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
```

## Drizzle migrations

```bash
pnpm drizzle-kit generate
```
