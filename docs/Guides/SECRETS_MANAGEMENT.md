# Secrets Management

Best practices for handling sensitive configuration in PortfoRadar.

## Golden Rules

1. **Never commit secrets** — `.env` is git-ignored for a reason
2. **Never log secrets** — MONGO_URI is automatically redacted in logs
3. **Use environment variables** — All secrets are injected at runtime

## Local Development

```bash
# Copy the template
cp .env.example .env

# Edit with your values
vim .env
```

The `.env` file is in `.gitignore` and will never be committed.

## Production Deployment

### Docker / Docker Compose

```yaml
# docker-compose.yml
services:
  app:
    environment:
      - MONGO_URI=${MONGO_URI}  # Injected from host environment
```

Or use Docker secrets:
```bash
echo "mongodb+srv://..." | docker secret create mongo_uri -
```

### Kubernetes

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: portfolioradar-secrets
type: Opaque
stringData:
  MONGO_URI: mongodb+srv://user:pass@cluster.mongodb.net/portfolioradar
---
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - name: app
          envFrom:
            - secretRef:
                name: portfolioradar-secrets
```

### Cloud Platforms

| Platform | How to Set Secrets |
|----------|-------------------|
| **Railway** | Dashboard → Project → Variables |
| **Render** | Dashboard → Service → Environment |
| **Fly.io** | `fly secrets set MONGO_URI=mongodb+srv://...` |
| **AWS ECS** | Systems Manager Parameter Store or Secrets Manager |
| **GCP Cloud Run** | Secret Manager integration |

### CI/CD (GitHub Actions)

Secrets are stored in: Settings → Secrets and variables → Actions

```yaml
# .github/workflows/deploy.yml
env:
  MONGO_URI: ${{ secrets.MONGO_URI }}
```

## Log Masking

PortfoRadar automatically redacts sensitive values in logs:

```typescript
// Configured in app.module.ts
redact: {
  paths: ['req.headers.authorization', 'MONGO_URI', '*.MONGO_URI'],
  censor: '[REDACTED]',
}
```

If `MONGO_URI` appears in any log context, it will show as `[REDACTED]`.

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | HTTP server port |
| `MONGO_URI` | **Yes** | — | MongoDB connection string |
| `NODE_ENV` | No | `development` | Environment mode |
| `LOG_LEVEL` | No | `info` | Log level (debug/info/warn/error) |
| `THROTTLE_TTL` | No | `60` | Rate limit window (seconds) |
| `THROTTLE_LIMIT` | No | `100` | Max requests per window |
| `ALLOWED_ORIGINS` | No | — | CORS: Comma-separated frontend domains that can call this API. Only needed if you have a separate frontend app. Leave unset for same-origin or to allow all. |
| `ENABLE_SCHEDULED_INGEST` | No | `true` | Automatic cron-based data ingestion (enabled by default) |
| `INGEST_CRON` | No | `0 3 * * *` | Cron expression for scheduled ingestion (default: daily at 3 AM UTC) |

## Validation

All environment variables are validated at startup using Zod:

```typescript
// src/config/env.validation.ts
export const envSchema = z.object({
  MONGO_URI: z.string().min(1).refine(v => v.startsWith('mongodb')),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  // ...
});
```

If validation fails, the app crashes immediately with a clear error message — no silent failures.
