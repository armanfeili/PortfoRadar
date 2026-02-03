# KKR Portfolio Source Analysis

## Phase 0 - Source Reconnaissance Complete ✅

**Analysis Date:** 2026-02-03  
**Target URL:** https://www.kkr.com/invest/portfolio  
**Technology Stack:** Adobe AEM (Adobe Experience Manager) Cloud Service

---

## 🎯 Key Discovery: Working JSON API Endpoint

### Primary Data Endpoint

```
GET https://www.kkr.com/content/kkr/sites/global/en/invest/portfolio/jcr:content/root/main-par/bioportfoliosearch.bioportfoliosearch.json
```

**Status:** ✅ WORKING - Returns JSON data directly

### Request Parameters

| Parameter | Type   | Description                    | Default | HAR Status |
|-----------|--------|--------------------------------|---------|------------|
| `page`    | number | Page number (1-indexed)        | 1       | ✅ Works |
| `limit`   | number | Items per page (**IGNORED**)   | 15      | ❌ Ignored (verified) |
| `sortParameter` | string | Field to sort by (`name`, `asset-class`, `industry`, `region`) | `name` | ✅ Works (4 values) |
| `sortingOrder` | string | Sort direction: `asc` or `desc` | `asc` | ✅ Works |
| `keyword` | string | **Search keyword (WORKS server-side!)** | `""` | ✅ Works |
| `cfnode` | string | AEM Content Fragment filter (**don't use**) | `""` | ⚠️ Returns 0 hits |
| `assetClass` | string | Filter by asset class (see values below) | — | ✅ Works |
| `industry` | string | Filter by industry sector (see values below) | — | ✅ Works |
| `country` | string | Filter by region/location (see values below) | — | ✅ Works |

> **Source:** Captured from Chrome DevTools HAR files (2026-02-03) with filter, sort, and keyword interactions
>
> **NEW (from new-www.kkr.com.har):** `keyword` search WORKS server-side! Multiple `sortParameter` values work!

### Request Headers

**Required:** None (no authentication, cookies, or CSRF tokens needed)

**Recommended** (to reduce bot suspicion):
```http
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36
Accept: application/json
```

### Sample Request

**Actual frontend request (from HAR capture):**
```bash
curl -s "https://www.kkr.com/content/kkr/sites/global/en/invest/portfolio/jcr:content/root/main-par/bioportfoliosearch.bioportfoliosearch.json?page=1&sortParameter=name&sortingOrder=asc&keyword=&cfnode=" \
  -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" \
  -H "Accept: application/json"
```

**With filter (e.g., Americas region - returns 123 hits):**
```bash
curl -s "https://www.kkr.com/content/kkr/sites/global/en/invest/portfolio/jcr:content/root/main-par/bioportfoliosearch.bioportfoliosearch.json?page=1&sortParameter=name&sortingOrder=asc&keyword=&cfnode=&country=location%3Aamericas"
```

**Minimal request (also works):**
```bash
curl -s "https://www.kkr.com/content/kkr/sites/global/en/invest/portfolio/jcr:content/root/main-par/bioportfoliosearch.bioportfoliosearch.json?page=1"
```

### Response Headers (from HAR)

- `content-encoding: gzip` — Responses are gzip-compressed; standard HTTP clients handle this automatically
- CDN headers present: `cf-ray`, `cf-cache-status`, `x-cache`, `x-served-by`, `via`
- No `set-cookie` header — confirms no session/auth required

> **Note:** HAR files contain many third-party telemetry calls (Google Analytics, LinkedIn, Adobe, Contentsquare, etc.). These are **not relevant** for the scraper — only the JSON endpoint matters.

---

## 📊 API Response Structure

### Response Metadata

```json
{
  "success": true,
  "message": "",
  "hits": 296,
  "resultsText": "(296) results",
  "pages": 20,
  "startNumber": 1,
  "endNumber": 15,
  "results": [...]
}
```

| Field          | Type    | Description                        |
|----------------|---------|------------------------------------|
| `success`      | boolean | Request success status             |
| `message`      | string  | Error message (empty on success)   |
| `hits`         | number  | Total number of companies          |
| `resultsText`  | string  | Human-readable result count        |
| `pages`        | number  | Total number of pages              |
| `startNumber`  | number  | First result index on current page |
| `endNumber`    | number  | Last result index on current page  |
| `results`      | array   | Array of company objects           |

### Company Object Schema

```typescript
interface PortfolioCompany {
  name: string;           // Company name (e.g., "+Simple", "1-800 Contacts, Inc.")
  sortingName: string;    // ⚠️ SORT-DEPENDENT: Value changes based on sortParameter!
                          //   sortParameter=name → company name
                          //   sortParameter=asset-class → asset class label
                          //   sortParameter=industry → industry label
                          //   sortParameter=region → region label
  logo: string;           // Logo path (e.g., "/content/dam/kkr/portfolio/resized-logos/simple-logo-raw.png")
  hq: string;             // Headquarters location (e.g., "Marseille, France")
  region: string;         // Geographic region (e.g., "Europe, The Middle East And Africa")
  assetClass: string;     // Asset class (e.g., "Tech Growth", "Private Equity")
  industry: string;       // Industry sector (e.g., "Financials", "Healthcare")
  yoi: string;            // Year of Investment (e.g., "2022")
  url: string;            // Company website URL (may be empty)
  description: string;    // Contains HTML markup (e.g., "<p>...</p>\n"); always sanitize on display
  
  // Optional fields (present on some companies only)
  relatedLinkOne?: string;       // Relative URL to related content (news, press release)
  relatedLinkOneTitle?: string;  // Title for related link 1
  relatedLinkTwo?: string;       // Relative URL OR video/content ID (not always a URL!)
  relatedLinkTwoTitle?: string;  // Title for related link 2
}
```

**Notes on optional fields:**
- The `relatedLink*` fields appear on select companies (e.g., "Bushu Pharma", "MetroNet Fiber Inc")
- `relatedLinkOne` is typically a relative URL to press releases or "Here's the Deal" content
- `relatedLinkTwo` can be either a relative URL **or** a numeric video/content ID (e.g., Brightcove video ID) — treat as string, not URL

### Sample Company Object

```json
{
  "yoi": "2022",
  "sortingName": "+Simple",
  "name": "+Simple",
  "logo": "/content/dam/kkr/portfolio/resized-logos/simple-logo-raw.png",
  "hq": "Marseille, France",
  "description": "<p>Digital insurance brokerage platform</p>\n",
  "industry": "Financials",
  "assetClass": "Tech Growth",
  "region": "Europe, The Middle East And Africa",
  "url": "www.plussimple.fr"
}
```

> **Note:** Field order in actual response differs from schema (shown above as captured from HAR with `sortParameter=name`).
> 
> ⚠️ The `sortingName` field equals `name` only because this was fetched with `sortParameter=name`. With other sort parameters, `sortingName` would contain the asset class, industry, or region label instead.

---

## 📈 Pagination Details

| Metric              | Value (as of 2026-02-03) |
|---------------------|-------------------------|
| Total Companies     | 296 (read from `hits`)  |
| Items Per Page      | 15                      |
| Total Pages         | 20 (read from `pages`)  |
| Max Limit Enforced  | 15                      |

**⚠️ Important:** These values can change over time. **Never hardcode** `296` or `20`. Always read `hits` and `pages` from the API response and iterate dynamically.

**Verified:** The API enforces a maximum of 15 results per request regardless of the `limit` parameter value.

```bash
# Test: requesting limit=30 still returns only 15 results
$ curl "...?page=1&limit=30" | jq '{hits, pages, returned: (.results|length)}'
{"hits": 296, "pages": 20, "returned": 15}
```

### Pagination Strategy

To fetch all companies:
```typescript
// Pseudocode - always use dynamic values
const firstPage = await fetch(endpoint + '?page=1');
const totalPages = firstPage.pages;  // Don't hardcode!

for (let page = 1; page <= totalPages; page++) {
  const response = await fetch(endpoint + `?page=${page}`);
  // process response.results
}
```

---

## 🗂️ Data Field Mapping

### Required Fields (Basic Solution)

| Challenge Field | API Field    | Type   | Notes                                |
|-----------------|--------------|--------|--------------------------------------|
| Company name    | `name`       | string | Direct mapping                       |
| Asset class     | `assetClass` | string | May contain multiple (comma-sep)     |
| Industry        | `industry`   | string | Direct mapping                       |
| Region          | `region`     | string | Direct mapping                       |

### Additional Fields (Advanced Solution)

| Field       | API Field     | Type   | Notes                                |
|-------------|---------------|--------|--------------------------------------|
| Description | `description` | string | Contains HTML tags, needs sanitizing |
| HQ          | `hq`          | string | City, State/Region, Country format   |
| Website     | `url`         | string | May be empty, may lack scheme (`www.example.com`) — normalize before use |
| Year        | `yoi`         | string | Year of Investment                   |
| Logo        | `logo`        | string | Relative path, prefix with base URL  |

### ⚠️ `sortingName` Field — Engineering Note

**DO NOT store `sortingName` as a persistent company attribute!**

The `sortingName` field changes based on the `sortParameter` used in the request:
- `sortParameter=name` → `sortingName` = company name
- `sortParameter=asset-class` → `sortingName` = asset class label
- `sortParameter=industry` → `sortingName` = industry label
- `sortParameter=region` → `sortingName` = region label

**Recommendation:** 
- Always fetch data using `sortParameter=name` so `sortingName` equals the company name
- Do NOT include `sortingName` in your database schema (it's redundant with `name` when sorted by name)
- If you ever change the sort parameter during ingestion, the `sortingName` values will be inconsistent

### Unique Identifier Strategy

The API does not provide a unique ID. **Recommended approach:**

#### Primary Key: Deterministic Hash (`kkrKey`)

Generate a stable, collision-resistant key:

```typescript
import { createHash } from 'crypto';

function generateKkrKey(company: PortfolioCompany): string {
  const normalized = [
    company.name.toLowerCase().trim(),
    company.yoi,
    company.hq.toLowerCase().trim(),
    company.assetClass.toLowerCase().trim(),
    company.industry.toLowerCase().trim()
  ].join('|');
  
  return createHash('sha256').update(normalized).digest('hex').substring(0, 32);
}
```

**Why this approach:**
- Provides idempotency: same input always produces same key (as long as underlying fields stay stable)
- 32-char hex (128 bits) reduces collision risk to negligible levels
- Handles disambiguation (same name, different entity differentiated by other fields)
- MongoDB: create unique index on `kkrKey`

**⚠️ Limitation:** If KKR changes a company's name or other identifying fields, the hash will change. If a stable backend ID (e.g., content fragment path) is discovered later, consider replacing the hash as primary key.

#### Secondary: Display Slug

Keep a human-readable slug for URLs/display only (not as primary key):
- `"+Simple"` → `plus-simple`
- `"1-800 Contacts, Inc."` → `1-800-contacts-inc`

---

## 🔍 Data Quality Observations

### Field Consistency

| Field       | Nullable | Empty String | HTML Content |
|-------------|----------|--------------|--------------|
| name        | No       | No           | No           |
| logo        | No       | Possible     | No           |
| hq          | No       | Possible     | No           |
| region      | No       | No           | No           |
| assetClass  | No       | No           | No           |
| industry    | No       | No           | No           |
| yoi         | No       | No           | No           |
| url         | No       | Yes (common) | No           |
| description | No       | Possible     | **Yes**      |

### Asset Class Values (Observed)

- Private Equity
- Tech Growth
- Infrastructure
- Global Impact
- Health Care Growth
- Credit
- Real Estate
- Multiple combined (e.g., "Global Impact, Private Equity")

### Region Values (Verified via Live API — All 296 Companies)

| Region | Count |
|--------|-------|
| Americas | 123 |
| Asia Pacific | 93 |
| Europe, The Middle East And Africa | 79 |
| **Japan** | **1** (SmartHR only) |

> ⚠️ **Note:** As of 2026-02-03, **Japan is the only outlier** — all other companies use the 3 macro-regions. However, this could change in the future if KKR adds more granular region values. Consider normalizing `Japan` → `Asia Pacific` if you need only 3 buckets, or store `regionRaw` for flexibility.

### Description Field Handling

The `description` field **contains HTML markup** (verified from HAR capture):

```bash
# From HAR file:
# Response shows: "description":"<p>Digital insurance brokerage platform</p>\n"
```

**HTML tags observed in HAR responses:**
- `<p>…</p>` — paragraph wrappers
- `<br>` — line breaks
- `<a …>…</a>` — hyperlinks

**Treat as untrusted HTML for display.**

**Recommended approach:**
1. Store **raw** value as returned from API
2. Compute `descriptionText` by stripping HTML tags for plain-text use cases
3. Always sanitize/escape on display to prevent XSS

---

## 🔎 Filter & Sort Parameters (HAR-Verified) ✅

### Major Discovery: Server-Side Filtering WORKS

A new HAR capture (www.kkr.com.har) while clicking UI filters revealed that **filtering IS server-side**. The previous analysis only captured the initial page load.

### Sort Parameters ✅ WORK

| Parameter | Values | Effect |
|-----------|--------|--------|
| `sortParameter` | `name` | Sort by company name (uses `sortingName` field) |
| `sortingOrder` | `asc`, `desc` | Ascending or descending order |

**Verified:** Sorting IS server-side. The `sortingName` field is used for ordering.

> ⚠️ **Important:** The `sortingName` field value **changes based on `sortParameter`**! See schema notes above. When ingesting data, always use `sortParameter=name` to ensure `sortingName` equals the company name.

### Filter Parameters ✅ WORK (Server-Side)

The API accepts three filter parameters. Values must be URL-encoded with a specific prefix format.

#### `assetClass` Parameter

| Value | Encoded Format | Hits | Pages |
|-------|----------------|------|-------|
| Global Impact | `asset-class%3Aglobal-impact` | 18 | 2 |
| Health Care Growth | `asset-class%3Ahealth-care-growth` | 30 | 2 |
| Infrastructure | `asset-class%3Ainfrastructure` | 67 | 5 |
| Private Equity | `asset-class%3Aprivate-equity` | 148 | 10 |
| Tech Growth | `asset-class%3Atech-growth` | 55 | 4 |

> **Note:** Total (18 + 30 + 67 + 148 + 55 = 318) exceeds 296 because some companies can have multiple asset classes (e.g., "Global Impact, Private Equity").

#### `industry` Parameter

| Value | Encoded Format | Hits | Pages |
|-------|----------------|------|-------|
| Communication Services | `industry%3Acommunication-services` | 29 | 2 |
| Consumer Discretionary | `industry%3Aconsumer-discretionary` | 30 | 2 |
| Consumer Staples | `industry%3Aconsumer-staples` | 13 | 1 |
| Energy | `industry%3Aenergy` | 10 | 1 |
| Financials | `industry%3Afinancials` | 17 | 2 |

> **Note:** This is **not necessarily the full industry list**; it is the subset clicked during the HAR capture. Additional industries likely exist in the UI (Healthcare, Industrials, Information Technology, Materials, Real Estate, Utilities).

#### `country` (Region) Parameter

| Value | Encoded Format | Hits | Pages |
|-------|----------------|------|-------|
| Americas | `location%3Aamericas` | 123 | 9 |
| Asia Pacific | `location%3Aasia-pacific` | 94 | 7 |
| Europe, Middle East & Africa | `location%3Aeurope-the-middle-east-and-africa` | 79 | 6 |

**Sanity check:** 123 + 94 + 79 = **296** ✅ (exactly matches unfiltered total)

> **Note:** The parameter is named `country` but values use `location:` prefix and represent regions.

### Search Parameter ✅ WORKS (NEW DISCOVERY!)

**From `new-www.kkr.com.har` analysis:** The `keyword` parameter **DOES work server-side**!

| keyword Value | Hits | Notes |
|---------------|------|-------|
| `Tech` | 60 | Matches companies with "Tech" in asset class |
| `Tech ` (trailing space) | 60 | Same as above (space trimmed) |
| `Tech Gro` | **0** | Partial match fails! |
| `Tech Growth` | 55 | Exact asset class match (all Tech Growth companies) |

**Key Findings:**
- ✅ `keyword` search IS functional server-side
- ⚠️ Search appears to match against `assetClass` field (possibly others)
- ❌ **Partial/prefix matching does NOT work** — uses **whole-token matching** (e.g., "Tech Gro" → 0 hits, "Gro" won't match "Growth")
- ✅ Trailing spaces are trimmed
- ✅ Likely case-insensitive (not proven in HAR)

**Example keyword search:**
```bash
# Search for "Tech Growth" companies - returns 55 hits
curl -s "...bioportfoliosearch.json?page=1&sortParameter=name&sortingOrder=asc&keyword=Tech%20Growth"
```

### `cfnode` Parameter ⚠️ UNKNOWN

| Parameter | HAR Observation | Notes |
|-----------|-----------------|-------|
| `cfnode` | Always empty in both HAR files | Likely for internal AEM content fragment filtering |

> **Note:** `cfnode` was never used with a non-empty value in either HAR capture. Its behavior remains unverified.

### Sample Filter Requests (from HAR)

```bash
# Filter by Asset Class (Global Impact) - returns 18 hits
curl -s "...bioportfoliosearch.json?page=1&sortParameter=name&sortingOrder=asc&keyword=&cfnode=&assetClass=asset-class%3Aglobal-impact"

# Filter by Region (Americas) - returns 123 hits
curl -s "...bioportfoliosearch.json?page=1&sortParameter=name&sortingOrder=asc&keyword=&cfnode=&country=location%3Aamericas"

# Filter by Industry (Financials) - returns 17 hits
curl -s "...bioportfoliosearch.json?page=1&sortParameter=name&sortingOrder=asc&keyword=&cfnode=&industry=industry%3Afinancials"
```

### Filter Value Format

Filter values follow a pattern: `{category}:{slug}`
- Asset Class: `asset-class:global-impact`
- Industry: `industry:financials`
- Region: `location:americas`

These must be URL-encoded (`:` becomes `%3A`).

### Conclusion

- **Sorting:** ✅ Server-side via `sortParameter` + `sortingOrder` — **4 sort fields work!**
- **Filtering:** ✅ Server-side via `assetClass`, `industry`, `country` parameters
- **Search:** ✅ `keyword` param **WORKS** (exact match, not substring)
- **Filter Combinations:** ✅ Multiple filters can be combined (AND logic)

---

## 🔄 Sort Parameters ✅ MULTIPLE FIELDS WORK (NEW!)

**From `new-www.kkr.com.har` analysis:** The API supports **4 different sort fields**, not just `name`!

### Supported `sortParameter` Values

| sortParameter | sortingOrder | Effect | HAR-Verified |
|---------------|--------------|--------|--------------|
| `name` | `asc` / `desc` | Sort alphabetically by company name | ✅ |
| `asset-class` | `asc` / `desc` | Sort by asset class alphabetically | ✅ NEW |
| `industry` | `asc` / `desc` | Sort by industry alphabetically | ✅ NEW |
| `region` | `asc` / `desc` | Sort by region alphabetically | ✅ NEW |

### Sort Examples (from HAR)

**Sort by Asset Class (ascending):**
```
sortParameter=asset-class&sortingOrder=asc
→ First results: Advanta Seeds (Global Impact), Axius Water (Global Impact), CMC Packaging... (Global Impact)
```

**Sort by Industry (descending):**
```
sortParameter=industry&sortingOrder=desc
→ First results: AEP Transmission (Utilities), Albioma (Utilities), Aster Renewable Energy (Utilities)
```

**Sort by Region (descending):**
```
sortParameter=region&sortingOrder=desc
→ First results: SmartHR (Japan), +Simple (Europe...), A-Gas (Europe...)
```

---

## 🔗 Filter Combinations ✅ AND LOGIC WORKS (NEW!)

**From `new-www.kkr.com.har` analysis:** Multiple filter parameters CAN be combined!

### How Combinations Work

Filters use **AND logic** — a company must match ALL specified filters.

### Observed Combinations (from HAR)

| assetClass | industry | country | Hits | Result |
|------------|----------|---------|------|--------|
| health-care-growth | consumer-staples | — | 0 | No match |
| health-care-growth | communication-services | — | 0 | No match |
| global-impact | communication-services | — | 0 | No match |
| global-impact | energy | — | 0 | No match |
| global-impact | financials | — | **1** | Five-Star Business Finance Limited |
| global-impact | financials | asia-pacific | **1** | Five-Star Business Finance Limited |

### Triple Filter Example

```bash
# Combine all 3 filters: assetClass + industry + country
curl -s "...bioportfoliosearch.json?page=1&assetClass=asset-class%3Aglobal-impact&industry=industry%3Afinancials&country=location%3Aasia-pacific"
# Returns: 1 hit (Five-Star Business Finance Limited)
```

### Key Insight

The single company matching `global-impact + financials + asia-pacific` proves:
- ✅ All three filter parameters can be used simultaneously
- ✅ Filters are combined with AND logic
- ✅ Very specific filtering is possible for targeted queries

---

### Evidence: HAR Capture Timeline (www.kkr.com.har)

The HAR file captured **18 distinct API requests** while clicking through UI filters (in order):

| # | Filter Applied | Hits | Pages |
|---|---------------|------|-------|
| 1 | None (initial load) | 296 | 20 |
| 2 | None (duplicate call) | 296 | 20 |
| 3 | assetClass=global-impact | 18 | 2 |
| 4 | assetClass=health-care-growth | 30 | 2 |
| 5 | assetClass=infrastructure | 67 | 5 |
| 6 | assetClass=private-equity | 148 | 10 |
| 7 | assetClass=tech-growth | 55 | 4 |
| 8 | None (reset) | 296 | 20 |
| 9 | None (duplicate) | 296 | 20 |
| 10 | industry=communication-services | 29 | 2 |
| 11 | industry=consumer-discretionary | 30 | 2 |
| 12 | industry=consumer-staples | 13 | 1 |
| 13 | industry=energy | 10 | 1 |
| 14 | industry=financials | 17 | 2 |
| 15 | None (reset) | 296 | 20 |
| 16 | country=americas | 123 | 9 |
| 17 | country=asia-pacific | 94 | 7 |
| 18 | country=europe-the-middle-east-and-africa | 79 | 6 |

**Implication for scraper:**
1. Can either fetch all 296 companies (no filter) OR filter by category
2. Use `sortParameter=name&sortingOrder=asc` for consistent ordering
3. **Recommendation:** Fetch ALL companies without filters for complete dataset, implement filtering in query layer

### Evidence: HAR Capture Timeline (new-www.kkr.com.har) — NEW!

The second HAR file captured **22 portfolio API requests** (82 total network entries) including keyword searches, multiple sort fields, and filter combinations:

| # | Features Used | Hits | Key Finding |
|---|--------------|------|-------------|
| 1-8 | Unfiltered page=1 with various sorts | 296 | 4 `sortParameter` values work (name, asset-class, industry, region) |
| 9 | `keyword=Tech` | 60 | **Keyword search WORKS!** |
| 10 | `keyword=Tech ` (space) | 60 | Trailing space trimmed |
| 11 | `keyword=Tech Gro` | **0** | Partial match FAILS |
| 12 | `keyword=Tech Growth` | 55 | Exact token match works |
| 13-15 | Keyword + region sort combos | varies | Confirmed `sortingName` changes with sortParameter |
| 16 | assetClass=health-care-growth | 30 | Single filter |
| 17-20 | Multi-filter combos (2 filters) | 0-1 | **Filter combinations work!** |
| 21-22 | Triple filter (3 params) | 1 | All 3 filters combined (AND logic) |

> **Note:** Rows 1-8 include duplicate calls and page=2 requests, not just 8 unique unfiltered page=1 calls.

---

## ✅ Verification Summary

After analyzing both HAR files + live API testing, **all parameters are now fully verified**:

| Item | Status | Evidence Source |
|------|--------|----------|
| `keyword` works server-side | ✅ **VERIFIED** | HAR: 60→0→55 hits pattern |
| Multiple sort fields work | ✅ **VERIFIED** | HAR: 4 sortParameter values observed |
| Filter combinations work | ✅ **VERIFIED** | HAR: 2 and 3 filter combos (AND logic) |
| Pagination returns different data | ✅ **VERIFIED** | HAR: Page 2 has different companies |
| `cfnode` behavior | ✅ **VERIFIED** | **Live curl + browser**: Any non-empty value → 0 hits |
| `limit` param is IGNORED | ✅ **VERIFIED** | **Live browser test**: limit=5,30 both return 15 |
| Additional company fields on other pages | ✅ **VERIFIED** | HAR: Same 14 fields on all pages |
| `sortingName` is sort-dependent | ✅ **VERIFIED** | HAR: Value changes based on sortParameter |
| `sortingName` is sort-dependent | ✅ **VERIFIED** | HAR: Value changes based on sortParameter |

---

## 🔗 Additional Endpoints (HAR-Observed)

| Endpoint | Status | Response | Notes |
|----------|--------|----------|-------|
| `.bioportfoliosearch.json` | ✅ 200 | Portfolio data | **Primary endpoint** |
| `.regiondetection.json` | ✅ 200 | Geo headers | Content personalization, not portfolio data |
| `/libs/granite/csrf/token.json` | ✅ 200 | Returns `{}` | Confirms no CSRF needed |

> **Note:** `bioportfoliosearch.region.json` was **not observed** in this HAR capture. If mentioned elsewhere, it may be from a different capture or manual testing.

### Region Detection Response (from HAR)
```json
{
  "cf-ipcountry": "IT",
  "cf-region": "Lazio",
  "cf-region-code": "62",
  "cf-ipcontinent": "EU",
  "x-aem-client-country": "IT",
  "x-aem-client-continent": "EU"
}
```
This is for geo-based content personalization, not portfolio filtering.

### CSRF Token Confirmation
The `token.json` endpoint returns empty `{}`, confirming **no authentication or CSRF tokens are required** for the portfolio API.

---

## 📄 Company Detail Pages

**Finding:** There are **no dedicated company detail pages** with additional data.

### Observation Log (2026-02-03 ~12:54 UTC)

| Step | Action | Network Activity |
|------|--------|------------------|
| 1 | Opened https://www.kkr.com/invest/portfolio | Initial XHRs fired (see HAR) |
| 2 | Cleared Network tab, set filter to "Fetch/XHR" | — |
| 3 | Clicked on company row "+Simple" | Modal opened |
| 4 | Checked Network tab | **No new XHR requests** |

**Result:** The modal/flyout is populated entirely from the already-loaded `results[]` array data. No additional API call is made when viewing company details.

### What the Modal Shows

- Same fields available in API response: name, logo, description, hq, region, assetClass, industry, yoi, url
- No additional data fetched
- "Related Links" (external website, videos) come from same payload

**Implication:** The list endpoint provides **all available data** per company. No need to scrape individual detail pages.

---

## 🖼️ Logo URL Construction

Logo URLs are relative paths. Full URL construction:

```
Base URL: https://www.kkr.com
Logo Path: /content/dam/kkr/portfolio/resized-logos/simple-logo-raw.png
Full URL: https://www.kkr.com/content/dam/kkr/portfolio/resized-logos/simple-logo-raw.png
```

**Supported formats observed:** `.png`, `.jpg`, `.svg`

---

## ⚙️ Technical Configuration

From HTML `data-*` attributes:

```html
<div id="bioportfoliosearch-1da9a4c204"
     root="/content/dam/kkr/content-fragments/portfolio"
     data-numPerPage="15"
     data-currentPage="/content/kkr/sites/global/en/invest/portfolio"
     data-noResultsText="No results found"
     data-modelType="portfolio-companies"
     data-searchurl="/content/kkr/sites/global/en/invest/portfolio/jcr:content/root/main-par/bioportfoliosearch.bioportfoliosearch.json"
     data-selectRegion="/content/kkr/sites/global/en/invest/portfolio/jcr:content/root/main-par/bioportfoliosearch.region.json"
     data-brightcove-playerId="default"
     data-brightcove-accountId="6415685851001"
     class="cmp-portfolio-filter">
```

---

## 🚀 Scraping Strategy Recommendation

### Approach: Direct JSON API Calls

**Advantages:**
- Clean structured JSON data
- No HTML parsing required
- Reliable and maintainable
- Faster than HTML scraping

**Implementation:**
1. Loop through pages 1-20
2. Make GET request to JSON endpoint
3. Parse JSON response
4. Extract company objects from `results` array
5. Transform and store in MongoDB

### Rate Limiting Considerations

- No observed rate limiting headers
- Recommend: 1-2 second delay between requests
- Total requests needed: 20 (one per page)
- Estimated total fetch time: 30-40 seconds with delays

### Error Handling

- Check `success` field in response
- Handle network errors gracefully
- Implement retry logic with exponential backoff

---

## 📋 MongoDB Schema Recommendation

```typescript
interface PortfolioCompanyDocument {
  _id: ObjectId;
  kkrKey: string;         // Deterministic hash, 32 hex chars (unique index)
  slug: string;           // Human-readable URL slug
  name: string;
  sortingName: string;    // Used for alphabetical sorting
  assetClass: string[];   // Split if comma-separated
  industry: string;
  region: string;
  description?: string;   // Raw HTML from API
  descriptionText?: string; // Stripped of HTML tags
  hq?: string;
  website?: string;       // Normalized (add https:// if missing)
  yearOfInvestment?: number;
  logoUrl?: string;       // Full URL
  
  // Optional related links (present on some companies)
  relatedLinks?: {
    linkOne?: { url: string; title: string };
    linkTwo?: { url: string; title: string };
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  sourceUrl: string;
  rawData?: object;       // Original API response for debugging
}

// Indexes
// - Unique index on `kkrKey`
// - Index on `sortingName` for alphabetical queries
// - Index on `assetClass`, `industry`, `region` for filtering
```

---

## 🌐 Other KKR URLs Investigation

### Sitemap Analysis

The KKR sitemap (`https://www.kkr.com/sitemap.xml`) was analyzed to identify all portfolio-related URLs.

### Portfolio-Related URLs Found

| URL | Purpose | Portfolio Data? |
|-----|---------|-----------------|
| `/invest/portfolio` | Main portfolio page | ✅ **Primary data source** |
| `/invest/portfolio/heres-the-deal` | Featured company stories | ❌ Editorial content only |
| `/invest/portfolio/heres-the-deal/[company]` | Individual company stories | ❌ Editorial content only |
| `/invest/private-equity` | Private equity landing page | ❌ Marketing content |
| `/invest/real-estate` | Real estate landing page | ❌ Marketing content |
| `/invest/infrastructure` | Infrastructure landing page | ❌ Marketing content |
| `/invest/credit` | Credit landing page | ❌ Marketing content |
| `/invest/capital-markets` | Capital markets landing page | ❌ Marketing content |

### Investigation Results

**Checked Pages:**

1. **Investment Category Pages** (`/invest/private-equity`, `/invest/real-estate`, `/invest/infrastructure`):
   - These pages mention portfolio companies in marketing text
   - No `bioportfoliosearch` JSON endpoint found
   - No separate portfolio API discovered
   - Data appears to reference the same central portfolio

2. **"Here's the Deal" Section** (`/invest/portfolio/heres-the-deal`):
   - Contains editorial/video content about ~7 featured companies
   - Uses `ipdetection.json` endpoint (for IP/geo detection, not portfolio data)
   - NOT a comprehensive list - only featured stories
   - No structured portfolio JSON endpoint

3. **Sitemap Portfolio References**:
   - Only `/invest/portfolio` is the central portfolio page
   - Other URLs are insights/articles that mention "portfolio" in text

### Conclusion

**For the directory dataset required by the Berry Code Challenge, this endpoint is sufficient and serves as the backend for the portfolio grid on `/invest/portfolio`.**

All 296 portfolio companies (as of the capture date) are accessible through this single endpoint. Other KKR pages either:
- Link to the same portfolio page
- Contain marketing/editorial content about select companies
- Do not expose additional structured portfolio APIs

**Note:** KKR explicitly states this directory represents a "significant portion" of investments "as of September 30, 2025." Additional company information may exist in editorial content elsewhere, but for the structured directory data, no additional scraping sources are needed.

---

## ✅ Phase 0 Checklist Complete

- [x] Identify data source endpoint
- [x] Document API request/response format
- [x] Map all available fields (including `sortingName` from HAR)
- [x] Analyze pagination mechanism
- [x] Verify data accessibility
- [x] Document unique identifier strategy
- [x] Identify data quality issues
- [x] Recommend scraping approach
- [x] Propose MongoDB schema
- [x] Investigate other KKR URLs for additional data sources
- [x] **HAR file analysis for real browser request patterns**
- [x] **Discover server-side filter parameters (assetClass, industry, country)**

---

## 📎 Appendix: HAR File Analysis

### HAR Files Captured

| File | Date/Time (UTC) | Description | API Calls |
|------|-----------------|-------------|-----------|
| `www.kkr.com.har` | 2026-02-03 | Filter interactions (single filters) | 18 |
| `new-www.kkr.com.har` | 2026-02-03 | **Keyword search, multiple sorts, filter combos** | 22 |

### Key Discoveries from HAR Captures

#### From `www.kkr.com.har` (First Capture)

```
1. Initial load: 296 hits
2. Asset Class filters: global-impact (18), health-care-growth (30), infrastructure (67), private-equity (148), tech-growth (55)
3. Reset to all: 296 hits
4. Industry filters: communication-services (29), consumer-discretionary (30), consumer-staples (13), energy (10), financials (17)
5. Reset to all: 296 hits
6. Region filters: americas (123), asia-pacific (94), europe-the-middle-east-and-africa (79)
```

#### From `new-www.kkr.com.har` (Second Capture) — **MAJOR DISCOVERIES!**

```
1. Keyword search: "Tech" (60 hits), "Tech Gro" (0 hits!), "Tech Growth" (55 hits)
2. Multiple sortParameter values: name, asset-class, industry, region — ALL WORK!
3. sortingOrder: both asc and desc work
4. Page 2 requests: different companies returned (pagination verified)
5. Multi-filter combinations: assetClass + industry + country — AND logic works!
6. Triple filter: global-impact + financials + asia-pacific → 1 hit (Five-Star Business Finance)
```

### Filter Parameter Format Discovery

From HAR analysis, filter values use a `{category}:{slug}` format:

```
assetClass=asset-class%3Aglobal-impact
industry=industry%3Afinancials
country=location%3Aamericas
```

The colon (`:`) is URL-encoded as `%3A`.

### XHR/Fetch Request Types (HAR-Observed)

| # | URL Pattern | Purpose |
|---|-------------|---------|
| 1 | `/libs/granite/csrf/token.json` | CSRF check → returns `{}` |
| 2 | `.bioportfoliosearch.json?page=1&...` | **Main data fetch** |
| 3 | `.bioportfoliosearch.json?...&assetClass=...` | **Asset class filter** |
| 4 | `.bioportfoliosearch.json?...&industry=...` | **Industry filter** |
| 5 | `.bioportfoliosearch.json?...&country=...` | **Region filter** |
| 6 | `.bioportfoliosearch.json?...&keyword=...` | **Keyword search** (NEW!) |
| 7 | `.regiondetection.json` | Geo-location for content personalization |
| 8 | `cdn.cookielaw.org/...` | Cookie consent (OneTrust) |
| 9 | `px.ads.linkedin.com/...` | LinkedIn tracking pixel |

### Verified Findings (Both HAR Files Combined)

| Feature | Status | Evidence |
|---------|--------|----------|
| Filter params: `assetClass`, `industry`, `country` | ✅ Works | www.kkr.com.har |
| Sort params: `sortParameter`, `sortingOrder` | ✅ Works | Both HAR files |
| Multiple sort fields: `name`, `asset-class`, `industry`, `region` | ✅ Works | new-www.kkr.com.har |
| Keyword search | ✅ Works (exact match) | new-www.kkr.com.har |
| Filter combinations (AND logic) | ✅ Works | new-www.kkr.com.har |
| Triple filter combo | ✅ Works | new-www.kkr.com.har |
| Pagination (page 2 different) | ✅ Works | new-www.kkr.com.har |
| No auth/CSRF required | ✅ Confirmed | Both HAR files |
| Field `sortingName` in responses | ✅ Present | Both HAR files |
| 14 company fields total | ✅ Consistent | Both HAR files |

### Verified via Live Testing

| Feature | Test | Result |
|---------|------|--------|
| `limit` parameter | `limit=5` and `limit=30` | ❌ **IGNORED** — always returns 15 |
| `cfnode` parameter | `cfnode=anything` | Returns 0 hits (AEM internal filter, not useful) |

### HAR File Locations

```
/Users/armanfeili/code/New Projects/PortfoRadar/www.kkr.com.har
/Users/armanfeili/code/New Projects/PortfoRadar/new-www.kkr.com.har
```

### HAR File Statistics

| Metric | www.kkr.com.har | new-www.kkr.com.har |
|--------|-----------------|---------------------|
| Total network entries | 70 | 82 |
| Portfolio API calls | 18 | 22 |
| Unfiltered calls | 5 | 8 |
| Single filter calls | 13 | 1 |
| Multi-filter calls | 0 | 6 |
| Keyword search calls | 0 | 5 |
| Page 2+ calls | 0 | 1 |

---

## 📝 Next Steps (Phase 1)

1. Initialize NestJS project with TypeScript
2. Set up MongoDB connection with Mongoose
3. Create PortfolioCompany schema based on above recommendation
4. Implement HTTP client service for KKR API
5. Build scraper service with pagination logic
6. **Optional:** Implement filter passthrough to leverage server-side filtering

---

*Document generated during PHASE 0 - Source Reconnaissance*
