/**
 * Type definitions for KKR Portfolio API responses.
 * Based on source-analysis.md (Phase 0 recon).
 */

/**
 * Raw company object from KKR API response.
 */
export interface KkrRawCompany {
  name: string;
  sortingName: string; // ⚠️ Changes based on sortParameter — do NOT store
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
