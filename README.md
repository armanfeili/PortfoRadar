# PortfoRadar

A NestJS application that ingests and serves KKR's investment portfolio company data through a queryable REST API.

## Overview

PortfoRadar fetches portfolio company information from KKR's public API, normalizes the data, and stores it in MongoDB. It provides a comprehensive REST API with filtering, pagination, full-text search, and aggregated statistics.

## Features

- **Data Ingestion**: Automated fetching from KKR's portfolio API with field normalization
- **REST API**: Full CRUD-style endpoints with advanced filtering
- **Search**: Case-insensitive regex search across company names and descriptions
- **Pagination**: Offset-based pagination with configurable limits
- **Statistics**: Aggregated counts by asset class, industry, region, and year
- **OpenAPI Documentation**: Interactive Swagger UI at `/api`
- **Health Checks**: Kubernetes-ready health endpoints

## Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 20 LTS |
| Language | TypeScript 5.7 |
| Framework | NestJS 11 |
| Database | MongoDB 7 + Mongoose |
| Logging | Pino (nestjs-pino) |
| Documentation | Swagger/OpenAPI |
| Testing | Jest |
| Container | Docker (multi-stage build) |

## Quick Start

### Option A: Docker Compose (Recommended)

The fastest way to get running:

```bash
# Clone and start
git clone <repository-url> && cd PortfoRadar
docker compose up --build

# In another terminal, ingest data
docker compose exec app npm run ingest:prod

# Verify data
curl http://localhost:3000/companies | jq '.total'
```

### Option B: Local Development

**Prerequisites:**
- Node.js 20.x (`nvm use` if using nvm)
- MongoDB 7.x running locally or via Docker

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env if needed (defaults work with local MongoDB)

# Start MongoDB (if not already running)
docker run -d -p 27017:27017 --name mongo mongo:7

# Start in development mode
npm run start:dev

# Ingest data
npm run ingest

# Open Swagger UI
open http://localhost:3000/api/docs
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP server port |
| `MONGO_URI` | `mongodb://localhost:27017/portfolioradar` | MongoDB connection string |
| `NODE_ENV` | `development` | Environment mode |

## API Documentation

Interactive Swagger documentation available at `/api/docs` when running.

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/companies` | List companies with filters |
| GET | `/companies/:id` | Get single company by ID |
| GET | `/stats` | Aggregated statistics |
| GET | `/health` | Health check |

> **Note:** Data ingestion is performed via CLI (`npm run ingest`), not through an HTTP endpoint.

### Query Parameters for `/companies`

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20, max: 100) |
| `assetClass` | string | Filter by asset class |
| `industry` | string | Filter by industry |
| `region` | string | Filter by region |
| `yoi` | string | Filter by year of investment |
| `q` | string | Full-text search (name, description) |
| `sort` | string | Sort field (e.g., `name`, `-yearOfInvestment`) |

### Example Requests

```bash
# List all companies
curl http://localhost:3000/companies

# Filter by asset class
curl "http://localhost:3000/companies?assetClass=Private%20Equity"

# Search with pagination
curl "http://localhost:3000/companies?q=technology&page=2&limit=10"

# Get statistics
curl http://localhost:3000/stats

# Get single company
curl http://localhost:3000/companies/abc123def456...
```

### Response Shape

```json
{
  "items": [
    {
      "companyId": "a1b2c3d4...",
      "name": "Acme Corp",
      "nameSort": "acme corp",
      "assetClassRaw": "Private Equity, Tech Growth",
      "assetClasses": ["Private Equity", "Tech Growth"],
      "industry": "Technology",
      "region": "Americas",
      "headquarters": "San Francisco, CA",
      "yearOfInvestment": "2023",
      "website": "https://acme.com",
      "logoUrl": "https://www.kkr.com/content/dam/...",
      "descriptionText": "A leading technology company..."
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 150,
  "totalPages": 8
}
```

## Project Structure

```
src/
├── app.module.ts                   # Root module
├── main.ts                         # Application bootstrap
├── ingest.ts                       # CLI ingestion entrypoint
├── config/
│   └── env.validation.ts           # Zod environment validation
├── companies/
│   ├── companies.module.ts         # Companies feature module
│   ├── companies.controller.ts     # REST endpoints (companies + stats)
│   ├── companies.service.ts        # Business logic
│   ├── companies.repository.ts     # MongoDB operations
│   ├── dto/                        # Data transfer objects
│   └── schemas/
│       └── company.schema.ts       # Mongoose schema
├── database/
│   └── database.module.ts          # MongoDB connection module
├── ingestion/
│   ├── ingestion.module.ts         # Ingestion feature module
│   ├── portfolio-ingest.service.ts # Ingestion orchestration
│   ├── ingestion-run.repository.ts # Run tracking repository
│   ├── kkr-client/                 # KKR API client
│   │   ├── kkr.client.ts           # HTTP client with retry
│   │   └── kkr-api.types.ts        # API type definitions
│   ├── mappers/
│   │   └── company.mapper.ts       # Raw → DTO transformation
│   └── schemas/
│       └── ingestion-run.schema.ts # Run tracking schema
├── health/
│   ├── health.module.ts            # Health module
│   └── health.controller.ts        # Health check endpoint
└── scripts/
    ├── test-upsert.ts              # Upsert verification script
    └── verify-data.ts              # Data quality verification

docs/
├── DEVELOPMENT_PHASES.md           # Implementation roadmap
├── source-analysis.md              # KKR API analysis
└── Berry_Code_Challenge.txt        # Challenge requirements

test/
├── app.e2e-spec.ts                 # E2E tests
└── jest-e2e.json                   # Jest E2E config
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run start:dev` | Start in watch mode (development) |
| `npm run start:prod` | Start compiled production build |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run lint` | Run ESLint |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run verify:data` | Verify ingested data integrity |

## Docker

### Build Image

```bash
docker build -t portfolioradar .
```

### Run with Docker Compose

```bash
# Start app + MongoDB
docker compose up -d

# View logs
docker compose logs -f app

# Stop
docker compose down
```

The Docker setup includes:
- Multi-stage build for minimal image size
- Non-root user for security
- Health checks for orchestration
- Volume persistence for MongoDB

## How KKR Portfolio Data Is Retrieved

We fetch KKR portfolio companies from the public portfolio listing endpoint used by [kkr.com/invest/portfolio](https://www.kkr.com/invest/portfolio).

The endpoint behaves like a paginated JSON API:

| Field | Description |
|-------|-------------|
| `hits` | Total company count (currently 296) |
| `pages` | Total pages (currently 20, fixed 15 items/page) |
| `results` | Array of company records |

**CDN behavior:** The endpoint is served via CDN. In practice, page responses may vary across edge nodes, occasionally returning incomplete sets when pages are fetched concurrently. Our ingestion handles this with an accumulation loop (see below).

## Data Model & Idempotent Storage

Each company is stored in MongoDB with a stable unique `companyId`:

```
companyId = SHA256(name + hq).substring(0, 32)
```

**Upsert behavior:**
- Insert if document missing
- Update only when `contentHash` differs (hash of all business fields)
- Skip write entirely if content unchanged

**Guarantees:**
- **No duplicates** — unique index on `companyId`
- **Safe repeated runs** — idempotent upserts
- **Minimal write load** — update-only-if-changed via content hash

## Reliability Guarantees (Completeness Reporting)

We verify completeness by comparing accumulated unique companies against the source-reported total. The CLI output includes:

```
========================================
        INGESTION SUMMARY
========================================
Run ID:          <uuid>
Status:          COMPLETED
Duration:        10854ms
----------------------------------------
Fetched:         296
Unique:          296
Created:         0
Updated:         0
Failed:          0
----------------------------------------
Source total:    296
Source pages:    20
Accum. attempts: 1
Complete:        ✅ YES
========================================
```

**Accumulation loop:** If the first fetch pass returns fewer than `sourceTotal` companies (due to CDN variability), we retry up to 5 times, accumulating unique companies until complete.

## Design Decisions

### 1. Deterministic Company IDs
Companies are assigned SHA256 hashes (32-char hex) derived from `name + hq` (normalized to lowercase), ensuring idempotent upserts during re-ingestion.

### 2. Field Normalization
- `assetClassRaw` preserved for display; `assetClasses[]` split for filtering
- `descriptionText` stripped of HTML for search; `descriptionHtml` preserved
- `logoUrl` made absolute; `website` normalized with protocol

### 3. Pagination Strategy
Offset-based pagination with `page`/`limit` parameters. Response includes `totalPages` for UI pagination components.

### 4. Search Implementation
Case-insensitive regex search on `name` and `descriptionText` fields with proper input escaping to prevent regex injection.

### 5. Logging
Structured JSON logging via Pino for production observability. Request correlation IDs included automatically.

## Testing

```bash
# Unit tests
npm run test

# Unit tests with coverage
npm run test:cov

# E2E tests (requires MongoDB)
npm run test:e2e
```

## CI/CD

GitHub Actions workflow runs on push/PR to main:
1. Install dependencies
2. Run linter
3. Run unit tests
4. Build TypeScript
5. Build Docker image

See [.github/workflows/ci.yml](.github/workflows/ci.yml).

## License

MIT License — see [LICENSE](LICENSE) for details.
