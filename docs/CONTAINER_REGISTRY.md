# Container Registry

PortfoRadar Docker images are automatically built and pushed to **GitHub Container Registry (GHCR)** on every merge to `main`.

## Pulling the Image

```bash
# Pull latest
docker pull ghcr.io/armanfeili/portfolioradar:latest

# Pull specific commit
docker pull ghcr.io/armanfeili/portfolioradar:<short-sha>
```

> **Note**: Replace `armanfeili` with your GitHub username/org if you forked the repo.

## Running with Pre-built Image

```bash
# Start with MongoDB
docker run -d --name mongo -p 27017:27017 mongo:7

# Run the app
docker run -d --name portfolioradar \
  -p 3000:3000 \
  -e MONGO_URI=mongodb://host.docker.internal:27017/portfolioradar \
  ghcr.io/armanfeili/portfolioradar:latest

# Ingest data
docker exec portfolioradar node dist/ingest.js

# Verify
curl http://localhost:3000/health
curl http://localhost:3000/companies | jq '.total'
```

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/ci.yml`) handles:

| Stage | Trigger | Action |
|-------|---------|--------|
| Build | Push/PR | Lint → Test → Build TypeScript |
| Docker Build | Push/PR | Build Docker image |
| Docker Push | Merge to `main` | Push to GHCR with `:latest` + `:sha-XXX` tags |

### Image Tags

| Tag | Description |
|-----|-------------|
| `latest` | Most recent `main` branch build |
| `<sha>` | Specific commit (7-char SHA) |

## Repository Settings (For Forks)

If you fork this repository, ensure GHCR push works:

1. **GitHub Actions permissions**: Settings → Actions → General → Workflow permissions → "Read and write permissions"
2. **Package visibility**: After first push, go to Packages → portfolioradar → Settings → Visibility → Public (if desired)

## Manual Push (Optional)

```bash
# Build locally
docker build -t ghcr.io/<your-username>/portfolioradar:latest .

# Login to GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u <your-username> --password-stdin

# Push
docker push ghcr.io/<your-username>/portfolioradar:latest
```

Create a PAT at: Settings → Developer settings → Personal access tokens → Tokens (classic) with `write:packages` scope.
