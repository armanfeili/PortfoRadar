/**
 * Type definitions for KKR Portfolio API responses.
 * Based on SOURCE_ANALYSIS.md (Phase 0 recon).
 */

/**
 * Raw company object from KKR API response.
 */
export interface KkrRawCompany {
  name: string;
  sortingName: string; // ⚠️ Changes based on sortParameter — do not store. Because KKR's backend dynamically generates the field, and it is not a stable identifier.
  logo: string;
  hq: string;
  region: string; // Single string, NOT an array
  assetClass: string; // May be comma-separated
  industry: string;
  yoi: string; // Year of Investment
  url: string; // Company website (may be empty)
  description: string; // Contains HTML markup

  // Optional related links
  relatedLinkOne?: string;
  relatedLinkOneTitle?: string;
  relatedLinkTwo?: string;
  relatedLinkTwoTitle?: string;
}

/**
 * KKR API response structure.
 */
export interface KkrApiResponse {
  success: boolean;
  message: string;
  hits: number; // Total companies (e.g., 296)
  resultsText: string;
  pages: number; // Total pages (e.g., 20)
  startNumber: number;
  endNumber: number;
  results: KkrRawCompany[];
}

/**
 * Pagination metadata extracted from API response.
 */
export interface KkrPaginationMeta {
  totalHits: number;
  totalPages: number;
  currentPage: number;
  resultsOnPage: number;
}

/**
 * Configuration for the KKR client.
 */
export interface KkrClientConfig {
  /** Request timeout in milliseconds */
  timeoutMs: number;
  /** Maximum retry attempts per page */
  maxRetries: number;
  /** Delay between sequential page fetches (ms) */
  pageDelayMs: number;
  /** Maximum accumulation attempts to collect all companies */
  maxAccumulationAttempts: number;
  /** Delay between accumulation attempts (ms) */
  accumulationDelayMs: number;
}

/**
 * Result of fetching a single page.
 */
export interface PageFetchResult {
  companies: KkrRawCompany[];
  pagination: KkrPaginationMeta;
}

/**
 * Result of fetching all pages.
 */
export interface AllPagesFetchResult {
  companies: KkrRawCompany[];
  totalHits: number;
  totalPages: number;
  fetchedPages: number;
  accumulationAttempts: number;
}
