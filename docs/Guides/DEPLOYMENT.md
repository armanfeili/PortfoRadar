# Deployment Guide

PortfoRadar is deployed on **Railway**. This guide documents the current production setup and alternative deployment options.

## Live Production

🌐 **Live URL**: https://portforadar-production.up.railway.app

| Endpoint | URL |
|----------|-----|
| Swagger UI | https://portforadar-production.up.railway.app/api/docs |
| Health Check | https://portforadar-production.up.railway.app/health |
| Companies API | https://portforadar-production.up.railway.app/companies |
| Stats | https://portforadar-production.up.railway.app/stats |

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | HTTP port (Railway sets automatically) |
| `MONGO_URI` | **Yes** | — | MongoDB connection string |
| `NODE_ENV` | No | `production` | Enables production logging |
| `THROTTLE_TTL` | No | `60` | Rate limit window (seconds) |
| `THROTTLE_LIMIT` | No | `100` | Max requests per window |
| `ALLOWED_ORIGINS` | No | — | CORS origins (only if separate frontend) |
| `ENABLE_SCHEDULED_INGEST` | No | `true` | Auto-fetch KKR data on schedule |
| `INGEST_CRON` | No | `0 3 * * *` | Cron expression (daily at 3 AM UTC) |

---

## Railway Deployment (Current Setup)

[Railway](https://railway.app) provides Docker support and automatic deploys from GitHub.

### Steps

1. **Create Railway account** at [railway.app](https://railway.app) and connect GitHub.

2. **Create new project** → "Deploy from GitHub repo" → select `PortfoRadar`.

3. **Add MongoDB**:
   - Click "New" → "Database" → "MongoDB"
   - Copy `MONGO_URI` from the MongoDB service's Variables tab

4. **Configure environment variables** on the app service:
   ```
   MONGO_URI=<paste from step 3>
   NODE_ENV=production
   ```

5. **Deploy**: Railway auto-detects the Dockerfile and builds.

6. **Initial data ingestion** (first time only):
   ```bash
   # Via Admin API
   curl -X POST https://<your-url>/admin/keys  # Get temporary key
   curl -X POST https://<your-url>/admin/ingest -H "X-Admin-Key: <key>"
   ```
   
   After initial ingestion, scheduled ingestion runs automatically (daily at 3 AM UTC).

7. **Verify**:
   ```bash
   curl https://<your-url>/health
   curl https://<your-url>/stats
   ```

### Railway Configuration (optional `railway.toml`)

```toml
[build]
builder = "dockerfile"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 10
restartPolicyType = "on_failure"
```

---

## Alternative: Docker on Any VPS

For any Linux VPS (DigitalOcean, AWS EC2, etc.):

1. **Pull the image**:
   ```bash
   docker pull ghcr.io/armanfeili/portfolioradar:latest
   ```

2. **Run with Docker Compose**:
   ```bash
   docker compose up -d
   ```

3. **Trigger initial ingestion**:
   ```bash
   docker compose exec app node dist/ingest.js
   ```

4. **Set up reverse proxy** (nginx/Caddy) for HTTPS.

---

## Alternative: Render

[Render](https://render.com) offers Docker support with a free tier.

1. Create Web Service → Connect GitHub → Select repo
2. Environment: Docker
3. Set `MONGO_URI` and `NODE_ENV=production`
4. Deploy and trigger initial ingestion

---

## Alternative: Fly.io

```bash
fly launch
fly secrets set MONGO_URI=mongodb+srv://...
fly deploy
```

---

## MongoDB Atlas Setup (Free Tier)

If your platform doesn't include MongoDB:

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create free M0 cluster
3. Create database user with read/write permissions
4. Add deployment IP to Network Access (or `0.0.0.0/0` for dynamic IPs)
5. Copy connection string → Set as `MONGO_URI`

---

## Post-Deployment Checklist

- [x] `/health` returns `{ "status": "ok" }`
- [x] `/api/docs` loads Swagger UI
- [x] `/companies` returns data (after ingestion)
- [x] `/stats` shows aggregated statistics
- [x] Rate limiting works (429 after rapid requests)
- [x] Scheduled ingestion enabled (check logs)
