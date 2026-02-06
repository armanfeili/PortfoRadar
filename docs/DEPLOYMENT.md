# Deployment Guide

PortfoRadar can be deployed to any platform that supports Docker containers or Node.js applications. This guide covers two recommended platforms.

## Prerequisites

- A MongoDB instance accessible from your deployment platform
  - **Recommended**: [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) free tier (M0 shared cluster)
- Your deployment platform account

## Environment Variables

All deployments require these environment variables:

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | HTTP port (most platforms set this automatically) |
| `MONGO_URI` | **Yes** | `mongodb+srv://user:pass@cluster.mongodb.net/portfolioradar` | MongoDB connection string |
| `NODE_ENV` | No | `production` | Enables production logging |
| `THROTTLE_TTL` | No | `60` | Rate limit window in seconds |
| `THROTTLE_LIMIT` | No | `100` | Max requests per rate limit window |

---

## Option A: Railway (Recommended)

[Railway](https://railway.app) offers a generous free tier with Docker support and automatic deploys from GitHub.

### Steps

1. **Create a Railway account** at [railway.app](https://railway.app) and connect your GitHub account.

2. **Create a new project** → "Deploy from GitHub repo" → select `PortfoRadar`.

3. **Add MongoDB**:
   - In your Railway project, click "New" → "Database" → "MongoDB"
   - Railway will automatically provision a MongoDB instance
   - Copy the `MONGO_URI` connection string from the MongoDB service's "Variables" tab

4. **Configure environment variables** on the app service:
   ```
   MONGO_URI=<paste from step 3>
   NODE_ENV=production
   PORT=3000
   ```

5. **Deploy**: Railway auto-detects the Dockerfile and builds. Your app will be available at a generated URL like `https://portfolioradar-production.up.railway.app`.

6. **Run ingestion** (one-time, after deploy):
   ```bash
   # Via Railway CLI
   railway run npm run ingest:prod

   # Or via the Railway dashboard → service → "Shell" tab
   node dist/ingest.js
   ```

7. **Verify**:
   ```bash
   curl https://<your-railway-url>/health
   curl https://<your-railway-url>/companies | jq '.total'
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

## Option B: Render

[Render](https://render.com) offers a free tier with Docker support.

### Steps

1. **Create a Render account** at [render.com](https://render.com) and connect GitHub.

2. **Create a new Web Service**:
   - Source: your GitHub repo
   - Environment: Docker
   - Instance Type: Free (or Starter for better performance)

3. **Set environment variables** in the Render dashboard:
   ```
   MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/portfolioradar
   NODE_ENV=production
   PORT=10000  # Render assigns port automatically; use their PORT env
   ```

4. **Deploy**: Render builds from the Dockerfile automatically.

5. **Run ingestion**: Use the Render Shell or a one-off job:
   ```bash
   node dist/ingest.js
   ```

6. **Verify**:
   ```bash
   curl https://<your-render-url>/health
   curl https://<your-render-url>/companies | jq '.total'
   ```

---

## Option C: Docker on Any VPS

For any Linux VPS (DigitalOcean, AWS EC2, etc.):

### Steps

1. **Pull the image** (if published to GHCR):
   ```bash
   docker pull ghcr.io/<owner>/portfolioradar:latest
   ```

   Or build locally:
   ```bash
   docker build -t portfolioradar .
   ```

2. **Run with Docker Compose** (recommended):
   ```bash
   # Copy docker-compose.yml to your server
   # Update MONGO_URI if using external MongoDB
   docker compose up -d
   ```

3. **Run ingestion**:
   ```bash
   docker compose exec app node dist/ingest.js
   ```

4. **Set up a reverse proxy** (nginx/Caddy) for HTTPS.

---

## Publishing Docker Image to GHCR

The repository includes a GitHub Actions workflow (`.github/workflows/publish.yml`) that automatically builds and pushes Docker images to GitHub Container Registry on version tags.

### Manual Publishing

```bash
# Log in to GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u <username> --password-stdin

# Build and tag
docker build -t ghcr.io/<owner>/portfolioradar:latest .
docker build -t ghcr.io/<owner>/portfolioradar:1.0.0 .

# Push
docker push ghcr.io/<owner>/portfolioradar:latest
docker push ghcr.io/<owner>/portfolioradar:1.0.0
```

### Automated Publishing (via GitHub Actions)

Create a version tag to trigger the publish workflow:
```bash
git tag v1.0.0
git push origin v1.0.0
```

The workflow will:
1. Run lint and tests
2. Build the TypeScript project
3. Build the Docker image
4. Push to `ghcr.io/<owner>/portfolioradar` with semver tags

---

## MongoDB Atlas Setup (Free Tier)

If your deployment platform doesn't include MongoDB:

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) and create an account
2. Create a free M0 cluster
3. Create a database user with read/write permissions
4. Add your deployment platform's IP to the Network Access list (or allow `0.0.0.0/0` for platforms with dynamic IPs)
5. Get your connection string: Cluster → Connect → Drivers → Copy URI
6. Set as `MONGO_URI` in your deployment platform

---

## Post-Deployment Checklist

- [ ] App responds at `/health` → `{ "status": "ok" }`
- [ ] Swagger UI loads at `/api/docs`
- [ ] Data ingested: `GET /companies` returns companies
- [ ] Rate limiting works: rapid requests return `429` after threshold
- [ ] Security headers present (check with `curl -I <url>`)
