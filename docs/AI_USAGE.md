# AI Usage Documentation

This document describes how AI tools were used during the development of PortfoRadar, which parts were AI-assisted vs manually written, and key decisions made.

## AI Tools Used

| Tool | Usage | Phases |
|------|-------|--------|
| **GitHub Copilot** (Claude) | Architecture planning, code generation, debugging, documentation | All phases |
| **Manual development** | API analysis (HAR capture), testing, integration decisions, code review | All phases |

## How AI Was Used Per Phase

### Phase 0: Source Reconnaissance
- **Manual**: Captured HAR files from kkr.com, analyzed network requests, identified API endpoints and pagination behavior
- **AI-assisted**: Structured the findings into `source-analysis.md`

### Phase 1: Repository Setup
- **AI-assisted**: NestJS scaffolding commands, ESLint/Prettier configuration
- **Manual**: Project structure decisions, `.gitignore` customization

### Phase 2: Config + Database + Logging
- **AI-assisted**: Zod validation schema, Mongoose connection setup, Pino logger integration
- **Manual**: Decision to use Zod over class-validator for env validation (better fail-fast behavior)

### Phase 3: Data Model
- **AI-assisted**: Schema definitions, index design, upsert repository pattern
- **Manual**: Deterministic hash key strategy (name + hq), content hash optimization

### Phase 4: Ingestion Service
- **AI-assisted**: HTTP client with retry/concurrency, company mapper functions, accumulation loop
- **Manual**: CDN variability discovery and debugging, sequential fetch strategy, hash collision analysis

### Phase 5: REST API
- **AI-assisted**: Controller/service boilerplate, DTO definitions, Swagger decorators
- **Manual**: Security decisions (regex escaping, input validation, filter allowlisting)

### Phase 6: Normalization
- **Mostly manual**: Verified all normalization was already done in Phase 4 mapper
- **AI-assisted**: Documentation of verification results

### Phase 7: Production Polish
- **AI-assisted**: Dockerfile multi-stage build, Docker Compose setup, CI pipeline, mapper unit tests
- **Manual**: Healthcheck configuration, test case selection

### Phase 8: Bonus Features
- **AI-assisted**: Helmet/throttler integration, HATEOAS links, exception filter, extended tests, deployment docs, GitHub Actions publish workflow
- **Manual**: ESLint rule selection (avoiding false positives), husky/lint-staged setup

## Key Decisions & Tradeoffs

### 1. Deterministic Company ID via SHA256(name + hq)
- **Why**: KKR API provides no unique identifier
- **Alternative considered**: Using logo path as ID — rejected because multiple companies share logos (e.g., ON*NET Fibra Chile/Colombia)
- **Tradeoff**: If a company changes its name, it will be treated as a new entity. Acceptable because company names are stable identifiers

### 2. Content Hash for Idempotent Upserts
- **Why**: Avoid unnecessary database writes on re-ingestion
- **How**: SHA256 hash of all business fields (excluding timestamps). Only updates document if hash changes
- **Result**: Re-runs show `Updated: 0` when no upstream changes

### 3. Sequential Fetch with Accumulation Loop
- **Why**: CDN serves inconsistent results when pages are fetched concurrently
- **Alternative**: Parallel fetch with p-limit — resulted in missing companies (281-295 of 296)
- **Solution**: Sequential page fetches with keep-alive connections, retry loop until complete set collected

### 4. Zod for Env Validation (not class-validator)
- **Why**: Fail-fast at boot with clear error messages
- **Tradeoff**: Two validation libraries in the project (Zod for config, class-validator for DTOs)
- **Justification**: Each serves its purpose — Zod is better for config validation, class-validator integrates natively with NestJS pipes

### 5. Rate Limiting via @nestjs/throttler
- **Config**: 100 requests per 60-second window (configurable via env vars)
- **Global guard**: Applies to all endpoints
- **Tradeoff**: Simple per-IP limiting; not distributed (would need Redis for multi-instance)

### 6. Regex Search (not MongoDB Text Index)
- **Why**: Simpler implementation for partial matching; text indexes require specific query syntax
- **Protection**: Input is regex-escaped to prevent injection and ReDoS
- **Tradeoff**: Slower than text index on large datasets, but 296 companies is small

## Code Understanding Verification

All AI-generated code was:
1. **Reviewed line-by-line** before integration
2. **Tested manually** against the live KKR API
3. **Unit tested** (76 tests covering mapper, service, controller, DTOs, and filters)
4. **Integration tested** via Docker Compose end-to-end runs

The developer can explain:
- Why `name + hq` was chosen as the hash key (collision analysis in `scripts/collision-report.ts`)
- How the accumulation loop handles CDN inconsistency
- Why `sortingName` from the API is never stored (it changes based on the `sortParameter` query param)
- How content hash optimization achieves true idempotency (zero unnecessary writes)
- The security model: allowlisted filters, regex escaping, rate limiting, helmet headers
