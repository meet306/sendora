# Sendora — Cloudflare Free-Tier Production Deployment Guide

This guide provides the exact, production-ready steps to publish **Sendora** as a live, secure public service utilizing **Cloudflare Free-Tier platform resources** (Cloudflare Workers, Cloudflare D1, Cloudflare R2, and Cloudflare Pages).

---

## 1. Prerequisites Checklist

Before proceeding, ensure you have:
1. **Node.js** v18+ (tested on Node.js v22.13.1) and **npm** or **pnpm** installed.
2. A free **Cloudflare Account** at [cloudflare.com](https://dash.cloudflare.com).
3. The Cloudflare Wrangler CLI authenticated on your machine:
   ```bash
   npx wrangler login
   ```
   *(This opens a browser window to authorize your CLI with your Cloudflare account).*

---

## 2. Infrastructure Provisioning (Terminal Commands)

All commands are run from the project root (`c:\Gitlab\sendora`).

### Step A: Create Cloudflare D1 Database
Create the serverless SQLite database for Sendora:
```bash
npx wrangler d1 create sendora-db
```
**Output Example:**
```text
[[d1_databases]]
binding = "DB"
database_name = "sendora-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```
Copy your unique `database_id` and paste it into `apps/worker/wrangler.jsonc` replacing `"sendora-d1-placeholder"`.

### Step B: Create Private Cloudflare R2 Storage Bucket
Create the object storage bucket:
```bash
npx wrangler r2 bucket create sendora-storage
```

### Step C: Configure R2 Bucket CORS & ETag Exposure
Direct multipart browser uploads require S3 CORS permissions on R2 so browsers can execute chunk PUT requests and read ETags.

Create a temporary CORS file `r2-cors.json`:
```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length", "Content-Disposition"],
    "MaxAgeSeconds": 3600
  }
]
```
Apply the CORS rules to your bucket:
```bash
npx wrangler r2 bucket cors set sendora-storage --file=r2-cors.json
```

---

## 3. Database Schema Migrations

Apply the production schema migration to your remote Cloudflare D1 database:

```bash
npx wrangler d1 execute sendora-db --remote --file=apps/worker/migrations/0001_initial_schema.sql
```

### Verify Table Creation
Inspect the live D1 tables:
```bash
npx wrangler d1 execute sendora-db --remote --command="SELECT name FROM sqlite_master WHERE type='table';"
```
You should see:
- `transfers`
- `transfer_files`
- `upload_sessions`
- `download_events`
- `file_requests`
- `file_request_submissions`
- `admin_users`
- `admin_sessions`
- `audit_logs`
- `lookup_attempts`

---

## 4. Provision Initial Administrator Account

Run the secure admin provisioning CLI helper:
```bash
node scripts/seed-admin.js <your_admin_username> <your_secure_password>
```
The script will output the exact `INSERT INTO admin_users` command with PBKDF2 salt and hash pre-calculated. Run that command using Wrangler:
```bash
npx wrangler d1 execute sendora-db --remote --command="<INSERT_COMMAND_FROM_CLI>"
```

---

## 5. Backend Worker Deployment

Navigate to the worker directory and deploy the API:
```bash
cd apps/worker
npx wrangler deploy
```

Upon successful deployment, Wrangler will print your public Worker URL:
```text
https://sendora-worker.<your-subdomain>.workers.dev
```

### Test API Health Check
```bash
curl -I https://sendora-worker.<your-subdomain>.workers.dev/api/health
```
*(Should return HTTP 200 with JSON status: healthy).*

---

## 6. Frontend Deployment (Cloudflare Pages)

Sendora's React single-page frontend is statically compiled and deployed to Cloudflare's ultra-low latency CDN edge.

### Step A: Configure Production API URL
Open `apps/web/src/lib/api.js` or configure the Vite proxy. For Cloudflare Pages, set `API_BASE` to your deployed Worker URL:
```javascript
const API_BASE = 'https://sendora-worker.<your-subdomain>.workers.dev/api';
```
*(Or use a custom domain with Cloudflare routing rules).*

### Step B: Build Frontend
From the root directory:
```bash
pnpm --filter sendora-web build
```
*(Generates optimized assets in `apps/web/dist`).*

### Step C: Deploy to Cloudflare Pages
Deploy using Wrangler:
```bash
npx wrangler pages deploy apps/web/dist --project-name=sendora
```
Wrangler will output your live website link:
```text
https://sendora.pages.dev
```

---

## 7. Custom Domain & DNS Setup (Optional)

To connect your custom domain (e.g. `sendora.yourdomain.com`):
1. In the **Cloudflare Dashboard**, navigate to **Pages** > **sendora** > **Custom Domains**.
2. Click **Set up a domain**, enter `sendora.yourdomain.com`, and click continue. Cloudflare automatically provisions the SSL/TLS certificate and configures DNS routing.
3. For the backend API, you can route `/api/*` to your Worker via **Workers Routes** or deploy the Worker on a custom subdomain like `api.sendora.yourdomain.com`.

---

## 8. Free-Tier Capacity & Resource Guardrails

Cloudflare provides one of the most generous free tiers available:

| Cloudflare Resource | Free Tier Monthly Allowance | Sendora Optimization |
| :--- | :--- | :--- |
| **Cloudflare Workers** | 100,000 requests/day | Lightweight Hono router, cached static routes |
| **Cloudflare D1** | 5,000,000 read rows/day, 100,000 write rows/day | Indexed queries, atomic increments |
| **Cloudflare R2** | 10 GB stored storage, 1,000,000 Class A ops, 10,000,000 Class B ops | Automated hourly Cron purge of expired files |
| **Cloudflare Pages** | Unlimited requests & bandwidth | Pre-compiled static assets |

### Automated Cleanup Trigger
The Cron trigger configured in `apps/worker/wrangler.jsonc` (`0 * * * *`) automatically invokes `runCleanupJob(env)` every hour to purge expired files, keeping your storage well within the free-tier 10 GB capacity.

---

## 9. Verification & Smoke Test Checklist

Once deployed, verify:
- [ ] Visit `https://sendora.pages.dev/` and check responsive light and dark themes.
- [ ] Upload a test file (e.g. 5 MB PDF), customize expiration to 1 hour, and create transfer.
- [ ] Verify the QR code canvas renders properly.
- [ ] Copy the short code (`SND-XXXXXX`), open an incognito window, and visit `/receive`.
- [ ] Enter the short code, verify file metadata appears, and click Download.
- [ ] Test password protection: create a protected transfer, verify files are hidden until the password is entered.
- [ ] Test early deletion: visit the transfer success page with your management token, click "Delete This Transfer Early", and confirm the link is immediately revoked.
- [ ] Log in to `/admin/login` using your provisioned credentials and verify telemetry charts.

