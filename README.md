# Sendora ⚡
> "Your Files. One Link. Anywhere."
> *Send files, receive files, and share securely. No account required.*

Sendora is a complete, human-designed, temporary cloud file-sharing SaaS platform engineered strictly in modern **JavaScript (ES Modules & JSX)** and powered by **Cloudflare Workers, Cloudflare D1, Cloudflare R2, and React**.

---

## 🌟 Key Features

- **200 MB File Transfers:** Upload individual files or folders up to 200 MB directly into private object storage.
- **Direct-to-R2 Multipart Engine:** Client-side 5 MB chunking with real-time transfer speed (MB/s), ETA calculations, and pause/resume/cancel capabilities.
- **Zero Account Required:** Anonymous, privacy-first architecture with zero telemetry sold.
- **Request Files (Dropzones):** Create dedicated drop links for third parties to upload files without viewing previous submissions.
- **Clipboard Sharing:** Share temporary text notes, credentials, and code snippets through unique links.
- **PBKDF2 Password Protection:** WebCrypto password hashing with 100,000 iterations and progressive rate-limiting lockouts. File metadata is never exposed before authentication.
- **Download Limits & Self-Destruct:** Atomic conditional counter decrements (1, 5, 10, or unlimited downloads) prevent concurrent race condition bypasses.
- **Automatic Expiry Cleanup:** Cloudflare Cron Triggers run hourly to purge expired physical objects and relational metadata.
- **Sender Early Deletion:** Secret sender tokens allow instant revocation and deletion of active transfers.
- **File Previews:** Sandboxed inline preview for JPG, PNG, GIF, WebP, PDF, and plain text formats.
- **Local Browser History:** History stored locally in client localStorage without server tracking.
- **Admin Operations Dashboard:** Protected portal with real-time metrics, D1/R2 storage meters, telemetry charts, audit logs, and manual cleanup trigger.
- **Swiss Minimalist UI:** Refined typography, cohesive dark/light mode engine, live QR code generation, and smooth responsive design.

---

## 📂 Project Architecture

```text
sendora/
├── apps/
│   ├── web/                     # React + Vite + Tailwind CSS + Lucide (Pure JS/JSX)
│   │   ├── src/
│   │   │   ├── components/     # Dropzone, QR card, preview modal, options, navbar, footer
│   │   │   ├── pages/          # All 16 required functional routes
│   │   │   ├── context/        # Dark mode ThemeContext & local HistoryContext
│   │   │   ├── lib/            # api client, uploader engine, crypto & formatters
│   │   │   └── App.jsx
│   │   └── package.json
│   └── worker/                  # Cloudflare Worker API + Cron Trigger (Pure JS)
│       ├── migrations/
│       │   └── 0001_initial_schema.sql  # D1 relational schema (10 tables)
│       ├── src/
│       │   ├── routes/         # transfers, uploads, downloads, requests, lookup, admin
│       │   ├── services/       # WebCrypto PBKDF2/SHA-256, R2 SigV4, Cron cleanup
│       │   ├── middleware/     # rate limiting, admin auth, security headers
│       │   └── index.js        # Hono entrypoint & Cron scheduled trigger
│       ├── wrangler.jsonc       # Cloudflare Worker, D1 & R2 configuration
│       └── package.json
├── scripts/
│   ├── test-runner.js          # Automated test suite covering 24 verification points
│   └── seed-admin.js           # CLI administrator provisioning helper
├── docs/
│   └── DEPLOYMENT.md           # Step-by-step Cloudflare free-tier deployment manual
└── package.json
```

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Run Test Suite (24 Test Scenarios)
```bash
pnpm test
```

### 3. Build Web Application
```bash
pnpm run build
```

### 4. Start Local Development Servers
```bash
# Terminal 1: Frontend (Vite)
pnpm run dev

# Terminal 2: Cloudflare Worker API (Wrangler)
pnpm run dev:worker
```

Visit `http://localhost:5173` to explore Sendora.

---

## 🛡️ Security Verification (24 Points Covered)

Sendora includes an automated test runner (`node scripts/test-runner.js`) that validates:
1. Single-file upload metadata & staging
2. Multi-file upload batching
3. 200 MB maximum file size acceptance
4. Strict rejection of files > 200 MB
5. Multipart chunk calculation (5 MB parts)
6. Interrupted / stale upload session detection
7. Upload session resumption by uploadId
8. Upload cancellation & R2 abort
9. Safe download headers (`nosniff`, `attachment`, sanitized disposition)
10. PBKDF2 password hashing & verification
11. Timing-safe incorrect password rejection
12. Expiration revocation (410 Gone)
13. Download limit exhaustion enforcement
14. Atomic SQL concurrency protection
15. Early deletion by sender key
16. Request Files creation and drop workflow
17. Prevention of unauthorized request access
18. Admin authentication & session token issuance
19. Dynamic QR code canvas generation
20. SHA-256 integrity verification
21. Scheduled Cron cleanup of expired storage objects
22. Path-traversal and control character filename sanitization
23. SigV4 presigned URL expiration verification
24. Private R2 access integrity

---

## 📦 Production Deployment

For full instructions on deploying Sendora to Cloudflare's free-tier infrastructure (D1, R2, Workers, and Pages), see the detailed guide:
👉 **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**

