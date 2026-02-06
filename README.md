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
  "totalPages": 8,
  "_links": {
    "self": "/companies?page=1",
    "first": null,
    "prev": null,
    "next": "/companies?page=2",
    "last": "/companies?page=8"
  }
}
```

### Error Response Format

All errors follow a consistent format:

```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Company with id 'abc123' not found",
  "path": "/companies/abc123",
  "timestamp": "2026-02-06T10:30:00.000Z"
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
| `npm run ingest` | Ingest portfolio data from KKR API |
| `npm run ingest:prod` | Ingest using compiled JS (for Docker) |
| `npm run verify:data` | Verify ingested data integrity |

## CLI Usage Guide

### Data Ingestion

The ingestion CLI fetches all portfolio companies from KKR's public API and stores them in MongoDB.

```bash
# Development mode (uses ts-node)
npm run ingest

# Production mode (uses compiled JS, for Docker)
npm run ingest:prod
```

**Expected output:**
```
========================================
        INGESTION SUMMARY
========================================
Run ID:          550e8400-e29b-41d4-a716-446655440000
Status:          COMPLETED
Duration:        10854ms
----------------------------------------
Fetched:         296
Unique:          296
Created:         296
Updated:         0
Failed:          0
----------------------------------------
Source total:    296
Source pages:    20
Accum. attempts: 1
Complete:        ✅ YES
========================================
```

### Data Verification

Verify the integrity of ingested data:

```bash
npm run verify:data
```

**Expected output:**
```
=== Data Verification Report ===
✓ Total companies: 296
✓ Source total (from API): 296
✓ Missing required fields: 0
✓ Duplicate companyIds: 0

--- Distribution Sanity Check ---
By Asset Class:
  Private Equity: 148
  Infrastructure: 67
  Tech Growth: 55
  ...

By Region:
  Americas: 123
  Asia Pacific: 93
  Europe, The Middle East And Africa: 79
  Japan: 1

✓ Data quality: PASS
```

## MongoDB Console Commands

For reviewers who prefer database-level inspection, here are useful `mongosh` one-liners:

```bash
# Connect to MongoDB (local)
mongosh portfolioradar

# Connect via Docker Compose
docker compose exec mongo mongosh portfolioradar
```

### Quick Inspection Commands

```javascript
// Count total companies
db.companies.countDocuments()
// Expected: 296

// Verify unique company IDs
db.companies.distinct("companyId").length
// Expected: 296

// Check for missing required fields
db.companies.countDocuments({
  $or: [
    { name: { $exists: false } },
    { assetClasses: { $size: 0 } },
    { industry: "" },
    { region: "" }
  ]
})
// Expected: 0

// Distribution by region
db.companies.aggregate([
  { $group: { _id: "$region", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])

// Distribution by asset class (array field)
db.companies.aggregate([
  { $unwind: "$assetClasses" },
  { $group: { _id: "$assetClasses", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])

// Find companies by name (regex search)
db.companies.find({ name: /acme/i }, { name: 1, region: 1, industry: 1 })

// Get last ingestion run
db.ingestionruns.findOne({}, { sort: { startedAt: -1 } })

// View sample company document
db.companies.findOne()

// Check document uniqueness
db.companies.aggregate([
  { $group: { _id: "$companyId", count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
])
// Expected: empty (no duplicates)
```

### Docker Compose One-Liners

```bash
# Full uniqueness verification
docker compose exec mongo mongosh portfolioradar --quiet --eval \
  'printjson({
    docs: db.companies.countDocuments(),
    uniqueIds: db.companies.distinct("companyId").length,
    uniqueNames: db.companies.distinct("name").length
  })'
# Expected: { docs: 296, uniqueIds: 296, uniqueNames: 296 }

# Check ingestion status
docker compose exec mongo mongosh portfolioradar --quiet --eval \
  'db.ingestionruns.findOne({}, { sort: { startedAt: -1 } })'
```

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
