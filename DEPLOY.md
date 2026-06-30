# LinX — Cloudflare Deployment Guide

## Architecture

```
linxservices.ca        → Cloudflare Pages  (React Admin SPA — admin/dist)
api.linxservices.ca    → Cloudflare Worker (workers/api/index.js)
localhost:3000         → Express server    (admin/server.js — crawler + legacy HTML)
```

The **crawler** continues to run on the Express server (it uses Node.js `https`, `cheerio`,
`fs`, and `setInterval` which are not available in Workers).  After each crawl cycle the
Express server can POST leads to the Worker via `POST /api/leads/ingest`.

---

## Prerequisites

- Node.js 18+
- Cloudflare account with Workers and D1 enabled
- `wrangler` installed (already in root `node_modules`):
  ```
  npx wrangler login
  ```

---

## Step 1 — Create the D1 database

```bash
npx wrangler d1 create linx-db
```

Copy the printed `database_id` into `wrangler.jsonc`:

```jsonc
"database_id": "PASTE_ID_HERE"
```

---

## Step 2 — Run the migration

```bash
# Apply to production D1
npx wrangler d1 migrations apply linx-db --remote

# Or locally for development
npx wrangler d1 migrations apply linx-db --local
```

---

## Step 3 — Set Worker secrets

The Worker uses **SHA-256** (not bcrypt) for the admin password because bcrypt is
unavailable in the Workers runtime.

Generate the password hash:

```bash
# Replace "yourpassword" with your actual password
node -e "const c=require('crypto');console.log(c.createHash('sha256').update('yourpassword').digest('hex'))"
# Or use the npm script:
cd admin && npm run generate-sha256 -- yourpassword
```

Set secrets (you will be prompted to paste the values — never pass them as CLI args):

```bash
npx wrangler secret put ADMIN_PASSWORD_HASH
npx wrangler secret put JWT_SECRET
```

Generate a strong `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Step 4 — Deploy the Worker

```bash
npx wrangler deploy
# or from admin/:
npm run worker:deploy
```

Your Worker is now live at `https://linx-api.<your-subdomain>.workers.dev`.

Add a **Custom Domain** in the Cloudflare dashboard:
Workers & Pages → linx-api → Settings → Domains → `api.linxservices.ca`

---

## Step 5 — Deploy the React Dashboard to Cloudflare Pages

### Via Cloudflare Dashboard (recommended first deploy)

1. **Pages → Create a project → Connect to Git** (or "Upload assets" for manual deploy)
2. Build command: `cd admin && npm run build`
3. Build output directory: `admin/dist`
4. Add environment variable:
   - `VITE_API_BASE` = `https://api.linxservices.ca`

### Via Wrangler CLI (subsequent deploys)

```bash
# From the repo root:
cd admin && npm run build
cd ..
npx wrangler pages deploy admin/dist --project-name linx-dashboard
```

Set the `VITE_API_BASE` environment variable for the Pages project:

```bash
npx wrangler pages secret put VITE_API_BASE --project-name linx-dashboard
# Enter: https://api.linxservices.ca
```

Add a **Custom Domain** in Pages settings: `linxservices.ca`

---

## Step 6 — Connect the Express crawler to D1

In `admin/.env`, set the Worker's ingest URL so the crawler forwards new leads:

```
LINX_API_BASE_URL=https://api.linxservices.ca
LINX_API_KEY=       # Leave blank — the Worker uses JWT, not API key for ingest
```

The crawler already calls `processBatch()` locally.  To forward results to D1 add a
`POST https://api.linxservices.ca/api/leads/ingest` call at the end of `runCycle()` in
`admin/leads/crawler.js` (or implement it as a webhook using `WEBHOOK_URLS`).

---

## Local Development

```bash
# Terminal 1 — Express server (crawler + legacy HTML dashboard)
cd admin && npm run dev:server

# Terminal 2 — React SPA (proxies /_api_* to Express on :3000)
cd admin && npm run dev

# Terminal 3 (optional) — Worker locally against a local D1
npx wrangler dev --config wrangler.jsonc
```

Visit `http://localhost:5173` for the React dashboard.
Visit `http://localhost:3000/crawler-dashboard.html` for the legacy dashboard.

---

## Verifying the Worker

```bash
# Check it responds
curl https://api.linxservices.ca/api/leads/stats \
  -H "Authorization: Bearer YOUR_JWT"

# Tail live logs
npx wrangler tail linx-api
```
