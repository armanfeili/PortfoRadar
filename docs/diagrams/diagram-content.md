CROSS-CUTTING (Global app behavior)
==================================

Exception handling
- Global exception filter formats HttpExceptions into a consistent error payload

Middleware
- Security HTTP headers (helmet)
- JSON body size limit (basic DoS protection)

API docs
- Swagger/OpenAPI setup (interactive docs + schemas)

Config validation
- Zod schema (env.validation.ts) - validates all env vars at startup, crashes with clear errors if invalid.

Validation
- Global ValidationPipe enforces DTO allowlist, rejects unknown fields, and transforms types

CORS
- Environment-driven origin allowlist (ALLOWED_ORIGINS). In production, restricts to listed domains; in development, allows all (*).

Testing
- Jest unit tests (88 tests): mappers, services, controllers, guards, filters, DTOs
- E2E tests (supertest): full HTTP request cycle
- Coverage thresholds enforced in CI

Logging & Rate Limiting
- Logging: Structured JSON logging (Pino) with request correlation IDs
- Sensitive fields auto-redacted (authorization headers, MONGO_URI)
- Rate Limiting: Global ThrottlerGuard applied to all endpoints (configurable TTL + limit via env)



CORE MODULES
============

HealthModule (Health probe)
Provides a simple "is the server up?" endpoint for deployments/monitoring.

Controllers
- HealthController: returns an OK status payload

Other features
- Imports: - None
- Providers: - None
- Exports: - None



DatabaseModule (Mongo connection)
Creates the single global Mongoose connection using config (Mongo URI + options)

Imports
- Mongoose connection factory (async, env-driven)

Providers
- None explicit (created by MongooseModule)

Other features
- Controllers: - None
- Exports: - None



AppModule
Root composition (wires framework + feature modules), sets global guard

Imports (framework/global)
- Config: loads env vars globally + validates them at startup
- Schedule: enables cron/background scheduling features
- Throttler: config-driven API rate limiting
- Logger: structured logging (pino) + log redaction

Imports (project modules)
- Database: Mongo/Mongoose connection
- Health: health probe endpoint
- Companies: public read APIs for companies + stats
- Ingestion: fetch + normalize + persist KKR portfolio data
- Admin: operational/admin endpoints + API key protection

Providers
- Global Guard: rate limit applied to all endpoints

Other features
- Controllers: - None
- Exports: - None



DELIVERY
========
Docker, GitHub, CI/CD

Docker
- Multi-stage build: build stage (node:20-alpine + npm ci + compile) -> production stage (prod deps only, non-root user, ~slim image)
- Docker Compose: app + MongoDB + healthcheck (/health polling, 30s interval)

Container Registry (GHCR)
- Images pushed to ghcr.io/armanfeili/portforadar
- Tags: latest (main branch), semver (v1.0.0, v1.0, v1), and commit SHA
- Pull + run standalone without cloning the repo

CI (GitHub Actions - ci.yml)
- Trigger: push/PR to main, or version tags (v*)
- Pipeline: install -> lint -> test with coverage -> build -> Docker build + push to GHCR
- Concurrency: cancels duplicate runs on same ref

CD (GitHub Actions - cd.yml)
- Trigger: runs after CI succeeds on main (or manual dispatch)
- Railway auto-deploys via GitHub integration
- Verification: polls /health up to 12x (15s apart) to confirm deployment is live

Pre-commit (Husky + lint-staged)
- On every commit: runs Prettier + ESLint --fix on staged .ts files



FEATURE MODULES
===============

CompaniesModule (Public read API)
Exposes read-only endpoints for listing companies, filtering/searching, and getting aggregated stats.

Imports
- Company model registration (Mongoose schema/model binding)

Providers
- CompaniesService: business logic (pagination, filter interpretation, link building)
- CompaniesRepository: Mongo queries + aggregations (lean/select, safe search regex, bulk upsert helpers)

Note
- Content-hash-based change detection on upsert (skip write if data unchanged)
- Regex injection protection (escapes search input)

Controllers
- CompaniesController: list + get-by-id endpoints
- StatsController: aggregated statistics endpoint

DTOs
- QueryCompaniesDto: validated query params (filters, pagination)
- CompanyResponseDto: documented company response shape
- StatsResponseDto: documented stats response shape
- ErrorResponseDto: documented standardized error shape

Schemas
- Company schema (company.schema.ts): Mongoose schema defining the document shape, indexes (unique on companyId), and field types

Exports
- Repository + Service (so other modules can reuse them)
- Model bindings (so other modules can inject the model)



IngestionModule (KKR ingestion + scheduling)
Fetches portfolio data from KKR's JSON endpoint, normalizes it, upserts into Mongo, and records ingestion runs; can also run on a schedule.

Imports
- IngestionRun model registration (for run tracking)
- CompaniesModule (so it can upsert companies)

Providers
- KkrClient: external HTTP client wrapper to fetch paginated KKR data
- PortfolioIngestService: orchestrates the ingestion pipeline (fetch -> map -> upsert -> run report)
- IngestionRunRepository: persists run metadata/results
- ScheduledIngestionService: registers cron job(s) to run ingestion automatically
- Mapper utilities: convert raw KKR payload into your internal company shape

Note
- Accumulation loop (retries up to 5x to handle CDN inconsistency)
- Keep-alive HTTP agent + sequential page fetching with delays (reduces CDN edge switching)

Controllers
- None (internal module; used by admin endpoints, cron, and scripts)

Schemas
- IngestionRun schema (ingestion-run.schema.ts): tracks each ingestion run (status, counts, errors, source metadata, timestamps)

Exports
- PortfolioIngestService (so admin/scripts can trigger ingestion)
- IngestionRunRepository (so other modules can read run history)

Standalone Scripts (no HTTP server)
Simpler alternative for hitting API and CI/CD pipeline

CLI ingestion
- "ingest" script bootstraps the Nest application context and runs a full ingestion (prints a run summary, exits non-zero on failure)

Data verification
- "verify:data" script bootstraps the app context and runs sanity checks (counts, last run metadata, basic distributions)



AdminModule (Operational/admin API)
Provides protected endpoints to trigger ingestion and manage operational actions; uses temporary API keys for access control.

Imports
- AdminKey model registration (store hashed keys + expiry/revocation state)
- IngestionModule (trigger ingestion from admin endpoint)
- CompaniesModule (patch/delete company data from admin endpoint)

Providers
- AdminApiKeyGuard:
  enforces X-Admin-Key authentication on protected admin routes
- AdminKeyService:
  creates/validates/revokes keys + updates usage metadata

Controllers
- AdminController:
  - POST /admin/keys (create temporary key; token shown once)
  - DELETE /admin/keys/:keyId (revoke key)
  - POST /admin/ingest (protected; triggers ingestion)
  - PATCH /admin/companies/:companyId (protected; partial update)
  - DELETE /admin/companies (protected; wipe all companies)

DTOs
- CreateAdminKeyDto: validates key creation inputs (ttl, createdBy)
- AdminKeyResponseDto: documented key creation response
- UpdateCompanyDto: validated patch payload for company updates
- IngestionResultDto: documented ingestion result summary

Schemas
- AdminKey schema (admin-key.schema.ts): stores hashed tokens with TTL index for auto-expiry, revocation timestamp, usage tracking

Exports
- AdminKeyService (so other parts can validate keys if needed)
