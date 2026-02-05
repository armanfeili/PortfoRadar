import { Injectable, Logger } from '@nestjs/common';
import { request } from 'undici';
import * as pRetry from 'p-retry';
import * as pLimit from 'p-limit';
import {
  KkrApiResponse,
  KkrPaginationMeta,
  KkrRawCompany,
} from './kkr-api.types';

/**
 * Base endpoint for KKR Portfolio API.
 * Discovered in Phase 0 recon (source-analysis.md).
 */
const KKR_API_ENDPOINT =
  'https://www.kkr.com/content/kkr/sites/global/en/invest/portfolio/jcr:content/root/main-par/bioportfoliosearch.bioportfoliosearch.json';

/**
 * Portfolio list URL (for provenance metadata).
 */
export const KKR_PORTFOLIO_URL = 'https://www.kkr.com/invest/portfolio';

/**
 * Configuration for the KKR client.
 */
interface KkrClientConfig {
  /** Request timeout in milliseconds */
  timeoutMs: number;
  /** Maximum retry attempts */
  maxRetries: number;
  /** Maximum concurrent requests */
  concurrency: number;
}

const DEFAULT_CONFIG: KkrClientConfig = {
  timeoutMs: 30_000, // 30 seconds
  maxRetries: 3,
  concurrency: 3, // Be nice to KKR servers
};

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
}

/**
 * HTTP client for the KKR Portfolio API.
 *
 * Features:
 * - Page-based pagination (1-indexed)
 * - Retry with exponential backoff
 * - Concurrency limiting
 * - Proper headers to avoid bot detection
 */
@Injectable()
export class KkrClient {
  private readonly logger = new Logger(KkrClient.name);
  private readonly config: KkrClientConfig;
  private readonly limiter: ReturnType<typeof pLimit.default>;

  constructor() {
    this.config = DEFAULT_CONFIG;
    this.limiter = pLimit.default(this.config.concurrency);
  }

  /**
   * Get the API endpoint URL (for provenance metadata).
   */
  getEndpointUrl(): string {
    return KKR_API_ENDPOINT;
  }

  /**
   * Fetch a single page of portfolio companies.
   *
   * @param pageNumber - 1-indexed page number
   */
  async fetchPage(pageNumber: number): Promise<PageFetchResult> {
    const url = `${KKR_API_ENDPOINT}?page=${pageNumber}&sortParameter=name&sortingOrder=asc`;

    const fetchWithRetry = async (): Promise<KkrApiResponse> => {
      const { statusCode, body } = await request(url, {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
        headersTimeout: this.config.timeoutMs,
        bodyTimeout: this.config.timeoutMs,
      });

      if (statusCode === 429) {
        // Abort retries for rate limiting
        const abortError = new Error('Rate limited (429) — backing off');
        (abortError as Error & { name: string }).name = 'AbortError';
        throw abortError;
      }

      if (statusCode !== 200) {
        throw new Error(`HTTP ${statusCode} fetching page ${pageNumber}`);
      }

      const text = await body.text();
      return JSON.parse(text) as KkrApiResponse;
    };

    const response = await pRetry.default(fetchWithRetry, {
      retries: this.config.maxRetries,
      minTimeout: 1000, // 1s initial delay
      maxTimeout: 8000, // 8s max delay
      onFailedAttempt: (error) => {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Attempt ${error.attemptNumber}/${this.config.maxRetries + 1} failed for page ${pageNumber}: ${errorMsg}`,
        );
      },
    });

    if (!response.success) {
      throw new Error(`API returned success=false: ${response.message}`);
    }

    return {
      companies: response.results,
      pagination: {
        totalHits: response.hits,
        totalPages: response.pages,
        currentPage: pageNumber,
        resultsOnPage: response.results.length,
      },
    };
  }

  /**
   * Fetch all pages of portfolio companies.
   *
   * Strategy:
   * 1. Fetch page 1 to get total pages and expected count
   * 2. Fetch remaining pages with concurrency limit
   * 3. Validate we got the expected number of items
   * 4. Return all companies
   */
  async fetchAllPages(): Promise<AllPagesFetchResult> {
    this.logger.log('Starting to fetch all portfolio pages...');

    // Fetch first page to get pagination info
    const firstPageResult = await this.fetchPage(1);
    const { totalHits, totalPages } = firstPageResult.pagination;

    this.logger.log(
      `First page fetched. Total: ${totalHits} companies across ${totalPages} pages`,
    );

    // Collect all companies starting with page 1
    const allCompanies: KkrRawCompany[] = [...firstPageResult.companies];

    if (totalPages <= 1) {
      return {
        companies: allCompanies,
        totalHits,
        totalPages,
        fetchedPages: 1,
      };
    }

    // Fetch remaining pages with concurrency limit
    const remainingPages = Array.from(
      { length: totalPages - 1 },
      (_, i) => i + 2,
    ); // [2, 3, ..., totalPages]

    const pagePromises = remainingPages.map((pageNum) =>
      this.limiter(async () => {
        this.logger.debug(`Fetching page ${pageNum}/${totalPages}...`);
        const result = await this.fetchPage(pageNum);

        // Validate page has items (except possibly last page)
        if (result.companies.length === 0) {
          this.logger.warn(`Page ${pageNum} returned 0 items - may need retry`);
        }

        return result.companies;
      }),
    );

    const pageResults = await Promise.all(pagePromises);

    for (const companies of pageResults) {
      allCompanies.push(...companies);
    }

    // Warn if we didn't get all expected items
    if (allCompanies.length < totalHits) {
      this.logger.warn(
        `Fetched ${allCompanies.length} companies but API reports ${totalHits} total. ` +
          `Some pages may have returned incomplete data.`,
      );
    }

    this.logger.log(
      `Fetched all ${totalPages} pages. Total companies: ${allCompanies.length}`,
    );

    return {
      companies: allCompanies,
      totalHits,
      totalPages,
      fetchedPages: totalPages,
    };
  }
}
