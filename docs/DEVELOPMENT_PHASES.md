# PortfoRadar — Development Phases

> **Approach**: Complete each phase fully before moving to the next.  
> **Principle**: "Better to do less but well, than everything poorly."

---

## Technology Stack

### Core Stack

| Category | Technology | Notes |
|----------|------------|-------|
| **Runtime** | Node.js 20 LTS | |
| **Language** | TypeScript | Strict mode recommended |
| **Framework** | NestJS | Modules, services, dependency injection |
| **Database** | MongoDB + Mongoose | @nestjs/mongoose integration |

### Packages by Phase

#### Phase 2: Config + Database + Logging
```bash
npm install @nestjs/config zod                    # Configuration + validation
npm install @nestjs/mongoose mongoose             # Database ODM
npm install nestjs-pino pino-http pino-pretty     # Structured logging
```

#### Phase 4: Ingestion
```bash
npm install undici p-retry p-limit                # HTTP client + retry + concurrency
```

#### Phase 5: REST API
```bash
npm install @nestjs/swagger swagger-ui-express    # API documentation
npm install class-validator class-transformer     # DTO validation
```

#### Phase 7: Production Polish
```bash
npm install -D jest @nestjs/testing ts-jest       # Testing
```

#### Phase 8: Bonus (Optional)
```bash
npm install helmet @nestjs/throttler              # Security hardening
```

### Database Indexes

| Collection | Index | Type |
|------------|-------|------|
| `companies` | `companyId` | Unique |
| `companies` | `assetClasses` | Multikey (array) |
| `companies` | `industry` | Query |
| `companies` | `region` | Query |
| `companies` | `name` | Text (optional) |
| `companies` | `nameSort` | Sort (optional) |

### Quality & DevX

| Category | Tools |
|----------|-------|
| **Lint / Format** | ESLint, Prettier (included with NestJS) |
| **Testing** | Jest (NestJS default) |
| **Containerization** | Docker, Docker Compose |
| **CI** | GitHub Actions |

### Configuration (Environment Variables)

```bash
# .env.example
PORT=3000
MONGO_URI=mongodb://localhost:27017/portfolioradar

# Optional (Phase 8 bonus)
ENABLE_NL_QUERY=false
OPENAI_API_KEY=
```

---

## Definition of Done (Final Acceptance Checklist)

Before submitting, verify ALL of these with the provided commands:

| Requirement | Verify Command | Expected Result |
|-------------|----------------|------------------|
| Ingests ALL companies | `npm run ingest` | `fetched == sourceTotal` (where `sourceTotal` comes from API response) |
| Required fields stored | `npm run verify:data` | 0 companies missing name/assetClasses/industry/region |
| Well-structured schema | Check `src/companies/schemas/` | Indexes defined, types explicit |
| Idempotent ingestion | Run `npm run ingest` twice | Second run shows updates, not new inserts |
| REST API works | `curl localhost:3000/companies` | Returns `{ items: [...], page, limit, total, totalPages }` |
| Swagger UI | Open `http://localhost:3000/api/docs` | Interactive docs load |
| Docker works | `docker compose up --build` | App + Mongo start, API responds |
| README complete | Read `README.md` | Setup → Ingest → Query flow is clear |
| Clean git history | `git log --oneline` | Meaningful commit messages |

> **Note on "ALL companies"**: The KKR API uses `hits` as the total company count (currently 296). Store `hits` in `IngestionRun.sourceMeta.totalFromSource` and `pages` in `sourceMeta.pagesFromSource`. Verify `fetched == totalFromSource`.

---

## ✅ PHASE 0 — Source Reconnaissance (COMPLETE)

**Goal**: Understand exactly how KKR serves portfolio data before writing any code.

**Status**: ✅ **COMPLETE** — See `docs/source-analysis.md` for full details.

### Key Findings Summary

| Item | Discovery |
|------|----------|
| **API Endpoint** | `GET https://www.kkr.com/content/kkr/sites/global/en/invest/portfolio/jcr:content/root/main-par/bioportfoliosearch.bioportfoliosearch.json` |
| **Method** | GET |
| **Auth Required** | None |
| **Pagination** | Page-based (`?page=1`), 15 items/page (fixed), read `pages` from response |
| **Total Companies** | 296 (as of 2026-02-03, read from `hits` field) |
| **Unique ID** | ⚠️ None provided — use deterministic hash (`kkrKey`) |

### API Response Fields

```typescript
interface KkrApiResponse {
  success: boolean;
  hits: number;      // Total companies (e.g., 296)
  pages: number;     // Total pages (e.g., 20)
  results: PortfolioCompany[];
}

interface PortfolioCompany {
  name: string;           // Company name
  assetClass: string;     // May contain multiple (comma-separated)
  industry: string;
  region: string;         // Single string, NOT an array!
  hq: string;             // Headquarters
  yoi: string;            // Year of Investment
  url: string;            // Website (may be empty)
  description: string;    // ⚠️ Contains HTML markup!
  logo: string;           // Relative path
  // Optional:
  relatedLinkOne?: string;
  relatedLinkOneTitle?: string;
}
```

### ⚠️ Critical Notes from Recon

1. **`limit` parameter is IGNORED** — API always returns 15 items per page
2. **`region` is a single string**, not an array (e.g., `"Americas"`, `"Asia Pacific"`)
3. **No unique ID provided** — must generate `companyId` via hash
4. **`description` contains HTML** — sanitize before display
5. **Do NOT store `sortingName`** — it changes based on sort parameter

### Deliverable
- [x] Created `docs/source-analysis.md` with full findings

---

## ✅ PHASE 1 — Repository & Engineering Baseline (COMPLETE)

**Goal**: Professional repo structure that's easy to run and review.

**Status**: ✅ **COMPLETE** — NestJS scaffolded, linting works, dev server runs.

### What Was Done

1. **Moved existing files temporarily** before scaffolding (docs/, HAR files, etc.)
2. **Switched to Node.js 20 LTS** (`nvm use 20`)
3. **Scaffolded NestJS** with `npx @nestjs/cli new . --package-manager npm --skip-git`
4. **Restored original files** and reorganized:
   - `docs/` — Development phases, source analysis, challenge requirements
   - `docs/research/` — HAR captures (git-ignored, ~10MB)
5. **Created essential config files**:
   - `.gitignore` — Comprehensive exclusions including `*.har`, `docs/research/`
   - `.editorconfig` — Consistent formatting (2-space indent, LF, UTF-8)
   - `.env.example` — Template with `PORT` and `MONGO_URI`
   - `.nvmrc` — Pins Node.js 20
6. **Updated `package.json`**:
   - Added `"dev"` script alias for `nest start --watch`
   - Set proper `name`, `description`, `author`, `license` (MIT)
7. **Fixed ESLint warning** in `src/main.ts` (floating promise → `void bootstrap()`)
8. **Replaced README.md** with project-specific documentation

### Files Created/Modified

| File | Status | Description |
|------|--------|-------------|
| `.gitignore` | Created | Excludes `node_modules/`, `dist/`, `.env`, `*.har`, `docs/research/` |
| `.editorconfig` | Created | 2-space indent, LF line endings, UTF-8 |
| `.env.example` | Created | `PORT=3000`, `MONGO_URI=mongodb://localhost:27017/portfolioradar` |
| `.nvmrc` | Created | Pins Node.js version to `20` |
| `README.md` | Replaced | Project overview, quick start, available scripts |
| `package.json` | Modified | Added `dev` script, description, author, MIT license |
| `src/main.ts` | Modified | Fixed floating promise lint warning |
| `docs/research/` | Created | Moved HAR files here (git-ignored) |

### Verification Results

| Check | Command | Result |
|-------|---------|--------|
| Lint passes | `npm run lint` | ✅ No errors |
| Format works | `npm run format` | ✅ Success |
| Dev server starts | `npm run start:dev` | ✅ "Nest application successfully started" |
| Endpoint responds | `curl localhost:3000` | ✅ Returns "Hello World!" |

### Deliverables
- [x] `npm run lint` works without errors
- [x] `npm run start:dev` starts the default Nest app
- [x] Project structure matches NestJS conventions
- [x] Root directory is clean (research files in `docs/research/`)

---

## ✅ PHASE 2 — Config Validation + Database + Logging (COMPLETE)

**Goal**: Running NestJS app connected to MongoDB with validated config and structured logging.

**Status**: ✅ **COMPLETE** — Config validation, MongoDB connection, Pino logging, and health endpoint all working.

### What Was Done

1. **Installed Phase 2 dependencies**:
   - `@nestjs/config` + `zod` for env validation
   - `@nestjs/mongoose` + `mongoose` for MongoDB
   - `nestjs-pino` + `pino-http` + `pino-pretty` for structured logging

2. **Created configuration validation** (`src/config/env.validation.ts`):
   - Zod schema validates `PORT` (number, defaults to 3000) and `MONGO_URI` (required URL)
   - App fails fast with clear error message if validation fails

3. **Created database module** (`src/database/database.module.ts`):
   - Connects to MongoDB using `MONGO_URI` from validated config
   - Uses `MongooseModule.forRootAsync()` for async config injection

4. **Created health module** (`src/health/`):
   - `HealthController` exposes `GET /health` → `{ status: "ok" }`
   - `HealthModule` registers the controller

5. **Updated app.module.ts**:
   - Integrated `ConfigModule.forRoot()` with Zod validation
   - Added `LoggerModule.forRoot()` with pino-pretty for dev, JSON for prod
   - Imported `DatabaseModule` and `HealthModule`

6. **Updated main.ts**:
   - Uses `bufferLogs: true` for proper log ordering
   - Applies pino logger to all NestJS logs
   - Reads PORT from validated ConfigService

7. **Created local .env** from .env.example (git-ignored)

### Files Created/Modified

| File | Status | Description |
|------|--------|-------------|
| `src/config/env.validation.ts` | Created | Zod schema + validateEnv function |
| `src/database/database.module.ts` | Created | Mongoose connection module |
| `src/health/health.controller.ts` | Created | Health check endpoint |
| `src/health/health.module.ts` | Created | Health module |
| `src/app.module.ts` | Modified | Integrated Config, Logger, Database, Health modules |
| `src/main.ts` | Modified | Added pino logger + ConfigService for PORT |
| `.env` | Created | Local environment variables (git-ignored) |

### Verification Results

| Check | Command | Result |
|-------|---------|--------|
| Lint passes | `npm run lint` | ✅ No errors |
| Dev server starts | `npm run dev` | ✅ Starts with structured pino logs |
| Health endpoint | `curl localhost:3000/health` | ✅ Returns `{"status":"ok"}` |
| HTTP request logging | (any request) | ✅ Pino logs request/response with timing |
| Missing MONGO_URI fails | `MONGO_URI= node dist/main.js` | ✅ Crashes with clear ZodError |

### Deliverables
- [x] `npm run dev` starts server successfully
- [x] `GET http://localhost:3000/health` returns OK
- [x] App crashes with clear error if `MONGO_URI` is missing

---

## ✅ PHASE 3 — Data Model (Schemas + Repositories) (COMPLETE)

**Goal**: Well-structured MongoDB schema with idempotent upsert capability.

**Status**: ✅ **COMPLETE** — Company and IngestionRun schemas created, repository with idempotent upsert verified.

### What Was Done

1. **Created Company Schema** (`src/companies/schemas/company.schema.ts`):
   - Required fields: `companyId` (unique), `name`, `nameSort`, `assetClassRaw`, `assetClasses[]`, `industry`, `region`
   - Optional fields: `descriptionHtml`, `descriptionText`, `website`, `headquarters`, `yearOfInvestment`, `logoPath`, `logoUrl`, `relatedLinks`
   - Source metadata: `source.listUrl`, `source.endpoint`, `source.fetchedAt`
   - Indexes: `companyId` (unique), `nameSort`, `assetClasses` (multikey), `industry`, `region`, compound `industry+region`

2. **Created IngestionRun Schema** (`src/ingestion/schemas/ingestion-run.schema.ts`):
   - Fields: `runId`, `startedAt`, `finishedAt`, `status`, `counts`, `errorMessages` (renamed from `errors` to avoid Mongoose reserved path)
   - Source metadata: `listUrl`, `endpointUsed`, `totalFromSource`, `pagesFromSource`, `asOf`, `scopeNote`
   - Indexes: `startedAt` (descending), compound `status+startedAt`

3. **Created Companies Repository** (`src/companies/companies.repository.ts`):
   - `upsertCompany(dto)` — idempotent insert/update by `companyId`
   - `bulkUpsert(dtos)` — batch upsert with bulkWrite
   - `findAll(filters, pagination)` — paginated query with filters for assetClass, industry, region, search
   - `findByCompanyId(id)` — single document lookup
   - `countByField(field)` — aggregation for stats
   - `countAll()` — total document count
   - `deleteAll()` — for testing

4. **Created Modules**:
   - `CompaniesModule` — registers Company schema, exports CompaniesRepository
   - `IngestionModule` — registers IngestionRun schema

5. **Updated AppModule** with new module imports

6. **Created Test Script** (`src/scripts/test-upsert.ts`):
   - Verifies upsert idempotency (run twice = no duplicates)
   - Verifies updates apply correctly

### Files Created/Modified

| File | Status | Description |
|------|--------|-------------|
| `src/companies/schemas/company.schema.ts` | Created | Company Mongoose schema with indexes |
| `src/companies/companies.repository.ts` | Created | Data access layer with upsert |
| `src/companies/companies.module.ts` | Created | Companies NestJS module |
| `src/ingestion/schemas/ingestion-run.schema.ts` | Created | IngestionRun schema for tracking |
| `src/ingestion/ingestion.module.ts` | Created | Ingestion NestJS module |
| `src/app.module.ts` | Modified | Added CompaniesModule, IngestionModule imports |
| `src/scripts/test-upsert.ts` | Created | Upsert idempotency verification script |

### Verification Results

| Check | Command | Result |
|-------|---------|--------|
| Lint passes | `npm run lint` | ✅ No errors |
| Build passes | `npm run build` | ✅ No errors |
| Server starts | `npm run start:dev` | ✅ All modules load correctly |
| Health endpoint | `curl localhost:3000/health` | ✅ `{"status":"ok"}` |
| Upsert test | `npx ts-node src/scripts/test-upsert.ts` | ✅ PASS: no duplicates |

### Upsert Idempotency Test Results

```
1. First upsert:  created=true,  updated=false → count=1
2. Second upsert: created=false, updated=true  → count=1 (no duplicate)
3. Third upsert:  created=false, updated=true  → count=1 (field updated)
✅ PASS: Upsert is idempotent - no duplicates created
```

### Deliverables
- [x] Schemas defined with proper TypeScript types
- [x] Indexes visible in schema code
- [x] Upsert tested: same company doesn't duplicate

---

## 🟢 PHASE 4 — Ingestion Service (Core Feature)

**Goal**: Retrieve ALL companies from KKR and store in MongoDB.

### 4.1 KKR HTTP Client

Create `src/ingestion/kkr-client/kkr.client.ts`:

**Pick ONE stack and stick with it** (to avoid churn):

| Option | Install | Pros |
|--------|---------|------|
| **A: undici (recommended)** | `npm install undici p-retry p-limit` | Lean, explicit, fewer abstractions |
| B: Axios + Nest | `npm install @nestjs/axios axios axios-retry` | More Nest-ish, familiar |

```bash
# Recommended: lean stack
npm install undici p-retry p-limit
```

- [ ] Implement `fetchPortfolioPage(pageNumber: number)` — **page-based, NOT offset/limit**
  ```typescript
  // API uses page-based pagination (1-indexed)
  // The `limit` parameter is IGNORED — always returns 15 items
  const url = `${BASE_ENDPOINT}?page=${pageNumber}&sortParameter=name&sortingOrder=asc`;
  ```
- [ ] **Set proper headers**:
  ```typescript
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Accept': 'application/json',
  }
  ```
- [ ] Add timeout (e.g., 30 seconds)
- [ ] Add retry with exponential backoff (3 retries, 1s → 2s → 4s)
- [ ] **Concurrency cap**: Max 3-5 concurrent requests (don't hammer the site)
- [ ] Handle rate limiting gracefully (429 → back off)

### 4.2 Response Mapper

Create `src/ingestion/mappers/company.mapper.ts`:

- [ ] `mapRawToCompany(rawItem): CompanyDto`
- [ ] Handle missing fields gracefully
- [ ] Generate `companyId` using deterministic hash
- [ ] Compute derived fields:
  ```typescript
  // Split asset classes
  assetClassRaw: raw.assetClass,
  assetClasses: raw.assetClass.split(',').map(s => s.trim()),
  
  // Normalize/compute
  nameSort: raw.name.toLowerCase(),
  descriptionHtml: raw.description,
  descriptionText: stripHtml(raw.description),
  website: normalizeUrl(raw.url),  // add https:// if missing
  logoUrl: raw.logo ? `https://www.kkr.com${raw.logo}` : undefined,
  ```

### 4.3 Portfolio Ingestion Service

Create `src/ingestion/portfolio-ingest.service.ts`:

```typescript
async ingestAll(): Promise<IngestionResult> {
  // 1. Create ingestion run record
  // 2. Fetch all pages (handle pagination)
  // 3. De-duplicate in memory by companyId (same company may appear in multiple filters)
  // 4. For each unique company: map → upsert
  // 5. Track counts (created, updated, failed)
  // 6. Update run record with results
  // 7. Return summary
}
```

#### De-duplication Strategy

Same company may appear across pages/filters. Handle with **two layers**:
1. **In-memory Set** of `companyId` — skip if already processed this run
2. **DB upsert + unique index** — guarantees no duplicates even if Set fails

- [ ] **Critical**: Do NOT let one company failure crash entire run
- [ ] Log progress: "Fetched page 1/20", "Upserted company X"
- [ ] Log summary at end: "Ingestion complete: 296 fetched, 290 created, 6 updated, 0 failed"

### 4.4 Ingestion Command

Option A: NestJS CLI command
```bash
npm install nestjs-command
```

Option B: Separate bootstrap script
```typescript
// src/ingest.ts
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(PortfolioIngestService);
  await service.ingestAll();
  await app.close();
}
```

- [ ] Add npm script: `"ingest": "ts-node src/ingest.ts"`

### 4.5 Test Ingestion

```bash
# Start MongoDB (docker or local)
docker run -d -p 27017:27017 --name mongo mongo:7

# Run ingestion
npm run ingest
```

- [ ] Verify all companies are in database
- [ ] Run again → verify no duplicates (idempotent)

### 4.6 Add Data Verification Script (First-Class Citizen)

Create `src/scripts/verify-data.ts`:

```typescript
// REQUIRED checks:
// 1. Total companies count
// 2. Missing required fields (name, assetClass, industry, regions)
// 3. Duplicate companyIds (should be 0 — unique index guarantees this)
// 4. Last ingestion run: fetched == sourceMeta.totalFromSource

// OPTIONAL sanity checks:
// 5. Counts by assetClass (distribution)
// 6. Counts by industry (distribution)
// 7. Counts by region (distribution)
// 8. Companies with empty regions array (flag for review)
```

Add npm script:
```json
"verify:data": "ts-node src/scripts/verify-data.ts"
```

Expected output:
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
  Health Care Growth: 30
  Global Impact: 18
  (Note: totals > 296 because some companies have multiple asset classes)

By Region:
  Americas: 123
  Asia Pacific: 93
  Europe, The Middle East And Africa: 79
  Japan: 1

✓ Data quality: PASS
```

### 4.7 Commit

```bash
git add .
git commit -m "feat: implement KKR portfolio ingestion with idempotent upsert"
```

### Deliverables
- [ ] `npm run ingest` populates database
- [ ] `npm run verify:data` shows all required fields present
- [ ] Re-running doesn't create duplicates (check with `npm run ingest` twice)

---

## 🟢 PHASE 5 — REST API (Query & Show Data)

**Goal**: Provide endpoints to query and display stored data.

### 5.1 Install Swagger

```bash
npm install @nestjs/swagger swagger-ui-express
```

- [ ] Configure in `main.ts`
- [ ] Swagger UI at `/api/docs`

### 5.2 Companies Controller

Create `src/companies/companies.controller.ts`:

#### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/companies` | List with filters + pagination |
| GET | `/companies/:id` | Get single company |
| GET | `/stats` | Aggregated statistics |

#### Query Parameters for GET /companies

```typescript
@Query() query: {
  assetClass?: string
  industry?: string
  region?: string
  q?: string          // search by name
  page?: number       // default: 1
  limit?: number      // default: 20, max: 100
}
```

### 5.3 DTOs with Validation

```bash
npm install class-validator class-transformer
```

Create `src/companies/dto/`:
- [ ] `query-companies.dto.ts`
- [ ] `company-response.dto.ts`
- [ ] `stats-response.dto.ts`

Enable validation in `main.ts`:
```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}));
```

#### 🔒 Security: Allowlisted Filters Only

> **Critical Rule**: Never accept raw MongoDB filter objects from users.

```typescript
// ❌ NEVER do this
@Query('filter') filter: any  // User could inject { $where: "..." }

// ✅ ALWAYS do this
@Query() query: QueryCompaniesDto  // Only known params, validated
```

Build the DB query yourself from validated DTO fields:
```typescript
const mongoFilter = {};
if (dto.assetClass) mongoFilter.assetClasses = dto.assetClass;  // matches any element in array
if (dto.industry) mongoFilter.industry = dto.industry;
if (dto.region) mongoFilter.region = dto.region;  // region is a single string
```

### 5.4 Stats Endpoint

`GET /stats` should return:
```json
{
  "totalCompanies": 296,
  "byAssetClass": { "Private Equity": 148, "Infrastructure": 67, "Tech Growth": 55, ... },
  "byIndustry": { "Financials": 17, "Consumer Discretionary": 30, ... },
  "byRegion": { "Americas": 123, "Asia Pacific": 93, "Europe, The Middle East And Africa": 79, "Japan": 1 }
}
```

### 5.5 Commit

```bash
git add .
git commit -m "feat: add REST API with Swagger, filters, pagination, stats"
```

### Deliverables
- [ ] Swagger UI accessible at `/api/docs`
- [ ] Can filter companies by asset class, industry, region
- [ ] Stats endpoint returns distribution counts

---

## 🟢 PHASE 6 — Normalization & Derived Fields (Advanced)

**Goal**: Improve data quality with computed fields — no extra scraping needed.

> ⚠️ **Only do this if Phase 4-5 are solid**

### 6.1 Key Finding: No Detail Fetch Required

From Phase 0 recon:
- ✅ **All fields are available in the list API response** (description, website, hq, yoi, logo)
- ✅ Opening a company modal in the UI triggers **no additional XHR** — it uses cached list data
- ⚠️ `relatedLinkOne`/`relatedLinkTwo` exist on some companies but are optional bonus content

### 6.2 Normalization Tasks

These should be done in the Response Mapper (Phase 4.2) during ingestion:

- [ ] **Asset Classes**: Split `assetClassRaw` by comma into `assetClasses[]`
  ```typescript
  assetClasses: raw.assetClass.split(',').map(s => s.trim())
  // "Global Impact, Private Equity" → ["Global Impact", "Private Equity"]
  ```

- [ ] **Description**: Strip HTML for text version
  ```typescript
  descriptionText: raw.description?.replace(/<[^>]*>/g, '').trim()
  // "<p>Digital insurance brokerage</p>\n" → "Digital insurance brokerage"
  ```

- [ ] **Website**: Normalize URL scheme
  ```typescript
  website: raw.url ? (raw.url.startsWith('http') ? raw.url : `https://${raw.url}`) : undefined
  // "www.example.com" → "https://www.example.com"
  ```

- [ ] **Logo**: Construct full URL
  ```typescript
  logoUrl: raw.logo ? `https://www.kkr.com${raw.logo}` : undefined
  ```

- [ ] **Sort Name**: Compute for indexing
  ```typescript
  nameSort: raw.name.toLowerCase()
  ```

- [ ] **Region Edge Case** (optional): Normalize `"Japan"` → `"Asia Pacific"` if you want only 3 canonical buckets

### 6.3 Related Links (Optional Bonus)

If `relatedLinkOne` or `relatedLinkTwo` are present:

```typescript
relatedLinks: {
  linkOne: raw.relatedLinkOne ? {
    url: raw.relatedLinkOne,  // Usually relative, prefix with base URL
    title: raw.relatedLinkOneTitle || 'Related'
  } : undefined,
  linkTwo: raw.relatedLinkTwo ? {
    urlOrId: raw.relatedLinkTwo,  // Can be URL OR Brightcove video ID!
    title: raw.relatedLinkTwoTitle || 'Related'
  } : undefined
}
```

> ⚠️ `relatedLinkTwo` can be a numeric video ID (e.g., Brightcove), not always a URL. Treat as string.

### 6.4 Commit

```bash
git add .
git commit -m "feat: add data normalization and computed fields"
```

### Deliverables
- [ ] `assetClasses[]` array correctly split from raw value
- [ ] `descriptionText` is HTML-stripped
- [ ] `website` and `logoUrl` are properly normalized
- [ ] `nameSort` enables fast alphabetical sorting
- [ ] All normalization happens during ingestion (no separate enrichment step)

---

## 🔵 PHASE 7 — Production Polish

**Goal**: Maximum score on ease of execution, presentation, code quality.

### 7.1 Docker Setup

Create `Dockerfile` (multi-stage build for reliable `docker compose up --build`):

```dockerfile
# ============ Builder Stage ============
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ============ Production Stage ============
FROM node:20-alpine AS production
WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built app from builder
COPY --from=builder /app/dist ./dist

# Run as non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
USER nestjs

EXPOSE 3000
CMD ["node", "dist/main"]
```

Create `docker-compose.yml`:
```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - MONGO_URI=mongodb://mongo:27017/portfolioradar
    depends_on:
      - mongo
  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
```

- [ ] Test: `docker compose up --build`

### 7.2 Testing

```bash
npm install -D jest @nestjs/testing @types/jest ts-jest
```

Priority tests:
- [ ] **Unit**: Company mapper (transform raw → DTO)
- [ ] **Unit**: Pagination logic
- [ ] **Integration** (optional): Repository upsert behavior

### 7.3 CI Pipeline

Create `.github/workflows/ci.yml`:
```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build
```

### 7.4 Documentation

Update `README.md` with:

- [ ] **Overview**: What this project does
- [ ] **Prerequisites**: Node 20, Docker (optional), MongoDB

- [ ] **Quick Start (Local)**:
  ```bash
  # Clone & install
  git clone ...
  cd portfolioradar
  npm install
  
  # Configure
  cp .env.example .env
  # Edit .env with your MONGO_URI
  
  # Start MongoDB (if not running)
  docker run -d -p 27017:27017 --name mongo mongo:7
  
  # Ingest data
  npm run ingest
  
  # Verify data quality
  npm run verify:data
  
  # Start API
  npm run start:dev
  
  # Open Swagger
  open http://localhost:3000/api/docs
  ```

- [ ] **Quick Start (Docker Compose)** — one command:
  ```bash
  # Clone & configure
  git clone ...
  cd portfolioradar
  cp .env.example .env
  
  # Build and run everything
  docker compose up --build
  
  # In another terminal: ingest data
  docker compose exec app npm run ingest
  
  # Open Swagger
  open http://localhost:3000/api/docs
  ```

- [ ] **API Examples**: curl commands
- [ ] **Design Decisions**: Why API vs scraping, schema choices, idempotency
- [ ] **Project Structure**: Brief folder overview

> **Note**: Keep time estimates in your personal notes, but remove from final README (reviewers don't need them).

### 7.5 Final Commits

```bash
git add .
git commit -m "chore: add Docker, CI pipeline, tests"
git commit -m "docs: complete README with setup and usage"
```

### Deliverables
- [ ] `docker compose up` works end-to-end
- [ ] Tests pass
- [ ] README is clear and complete

---

## ⚪ PHASE 8 — Bonus Features (Optional)

> ⚠️ **Only if all above phases are 100% complete and polished**

### Security Hardening
```bash
npm install helmet @nestjs/throttler
```
- [ ] Rate limiting
- [ ] CORS configuration
- [ ] Input size limits

### Deployment
- [ ] Deploy to cloud (Railway, Render, Fly.io)
- [ ] Push Docker image to registry

### AI Integration (High Risk — Only If Core Is Perfect)

> ⚠️ The brief warns: "Poor understanding of AI-generated code will negatively affect evaluation."

**Safe approach (if you do this at all):**
- [ ] LLM outputs a **strict Query Intent DTO**, NOT raw MongoDB queries
  ```typescript
  interface QueryIntent {
    intent: 'list_companies' | 'get_company' | 'stats';
    filters?: { assetClass?: string; industry?: string; region?: string; };
    pagination?: { page: number; limit: number; };
  }
  ```
- [ ] Backend maps intent → allowlisted Mongo query (you control the query building)
- [ ] Feature-flagged (`ENABLE_NL_QUERY=true`) — disabled by default
- [ ] Rate limited (`@nestjs/throttler`)
- [ ] Document clearly: what it can/can't do, how it's secured
- [ ] **You MUST understand and be able to explain every line**

---

## 📊 Work Order Summary

| Order | Phase | Priority | Notes |
|-------|-------|----------|-------|
| 1 | Phase 0: Source Recon | ✅ Complete | See `docs/source-analysis.md` |
| 2 | Phase 1: Repo Setup | 🟡 High | NestJS scaffold + lint |
| 3 | Phase 2: Config + DB | 🟡 High | Fail-fast config, MongoDB connection |
| 4 | Phase 3: Data Model | 🟡 High | Schema + deterministic hash key |
| 5 | Phase 4: Ingestion | 🟢 Core | The main deliverable |
| 6 | Phase 5: REST API | 🟢 Core | Query + Swagger UI |
| 7 | Phase 6: Normalization | 🟢 Advanced | Computed fields (no extra scraping) |
| 8 | Phase 7: Polish | 🔵 Important | Docker, tests, CI, docs |
| 9 | Phase 8: Bonus | ⚪ Optional | Only if everything else is 100% |

**Delivery target**: ~1 week (adjust based on experience)

---

## 💡 Tips for Success

1. **Commit often** with meaningful messages
2. **Test incrementally** — verify each phase works before moving on
3. **Phase 0 is done** — reference `docs/source-analysis.md` for all API details
4. **Prioritize working software** over bonus features
5. **Document as you go** — don't leave README for last
6. **Use `npx`** over global installs for reproducibility
7. **Verify with commands** — `npm run verify:data`, `npm run lint`, etc.
8. **Two ways to run** — document both local and Docker approaches
9. **Security matters** — never accept raw filters, always allowlist
10. **AI is optional** — only add if you fully understand the code
11. **Never store `sortingName`** — it changes based on sort parameter; use your own `nameSort`

Good luck! 🚀
