import { Injectable, Logger } from '@nestjs/common';
import { request, Agent } from 'undici';
import * as pRetry from 'p-retry';
import {
  KkrApiResponse,
  KkrPaginationMeta,
  KkrRawCompany,
} from './kkr-api.types';

/**
 * Base endpoint for KKR Portfolio API.
 * Discovered in Phase 0 recon (SOURCE_ANALYSIS.md).
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
  /** Maximum retry attempts per page */
  maxRetries: number;
  /** Delay between sequential page fetches (ms) */
  pageDelayMs: number;
  /** Maximum accumulation attempts to collect all companies */
  maxAccumulationAttempts: number;
  /** Delay between accumulation attempts (ms) */
  accumulationDelayMs: number;
}

const DEFAULT_CONFIG: KkrClientConfig = {
  timeoutMs: 30_000, // 30 seconds
  maxRetries: 3,
  pageDelayMs: 100, // 100ms between pages (sequential, reduces CDN edge switching)
  maxAccumulationAttempts: 5, // Try up to 5 times to collect all companies
  accumulationDelayMs: 500, // 500ms between accumulation attempts
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
  accumulationAttempts: number;
}

/**
 * HTTP client for the KKR Portfolio API.
 *
 * Features:
 * - Page-based pagination (1-indexed)
 * - Retry with exponential backoff per page
 * - Sequential fetching with delays (reduces CDN inconsistency)
 * - Accumulation loop to collect all companies despite CDN variability
 * - Keep-alive HTTP agent (reduces CDN edge switching)
 * - Proper headers to avoid bot detection
 */
@Injectable()
export class KkrClient {
  private readonly logger = new Logger(KkrClient.name);
  private readonly config: KkrClientConfig;
  private readonly httpAgent: Agent;

  constructor() {
    this.config = DEFAULT_CONFIG;
    // Keep-alive agent reduces CDN edge switching
    this.httpAgent = new Agent({
      keepAliveTimeout: 30_000,
      keepAliveMaxTimeout: 60_000,
    });
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
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
        },
        headersTimeout: this.config.timeoutMs,
        bodyTimeout: this.config.timeoutMs,
        dispatcher: this.httpAgent,
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
      const parsed = JSON.parse(text) as KkrApiResponse;

      // Validate response has results (retry if empty unexpectedly)
      if (!parsed.results || !Array.isArray(parsed.results)) {
        throw new Error(`Page ${pageNumber} returned invalid results`);
      }

      return parsed;
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
   * Fetch all pages of portfolio companies with accumulation loop.
   *
   * Strategy:
   * 1. Fetch all pages sequentially (with delays to reduce CDN edge switching)
   * 2. Accumulate unique companies by name (stable identifier)
   * 3. If we haven't collected sourceTotal, retry the entire fetch
   * 4. Repeat until we have all companies or max attempts reached
   *
   * This handles KKR's CDN inconsistency where different requests
   * return different subsets of companies.
   */
  async fetchAllPages(): Promise<AllPagesFetchResult> {
    this.logger.log('Starting to fetch all portfolio pages...');

    // Accumulator: keyed by normalized name (stable across fetches)
    const accumulated = new Map<string, KkrRawCompany>();
    let totalHits = 0;
    let totalPages = 0;
    let attempt = 0;

    while (attempt < this.config.maxAccumulationAttempts) {
      attempt++;

      // Fetch first page to get pagination info
      const firstPageResult = await this.fetchPage(1);
      totalHits = firstPageResult.pagination.totalHits;
      totalPages = firstPageResult.pagination.totalPages;

      if (attempt === 1) {
        this.logger.log(
          `First page fetched. Total: ${totalHits} companies across ${totalPages} pages`,
        );
      }

      // Add companies from first page
      for (const company of firstPageResult.companies) {
        const key = company.name.toLowerCase().trim();
        if (!accumulated.has(key)) {
          accumulated.set(key, company);
        }
      }

      // Fetch remaining pages sequentially with delay
      for (let pageNum = 2; pageNum <= totalPages; pageNum++) {
        // Small delay between pages to reduce CDN edge switching
        await this.sleep(this.config.pageDelayMs);

        try {
          const result = await this.fetchPage(pageNum);

          for (const company of result.companies) {
            const key = company.name.toLowerCase().trim();
            if (!accumulated.has(key)) {
              accumulated.set(key, company);
            }
          }
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          this.logger.warn(`Failed to fetch page ${pageNum}: ${errorMsg}`);
          // Continue with other pages
        }
      }

      // Check if we've collected all companies
      if (accumulated.size >= totalHits) {
        this.logger.log(
          `Accumulated all ${accumulated.size} companies in ${attempt} attempt(s)`,
        );
        break;
      }

      // Need more attempts - log progress
      const missing = totalHits - accumulated.size;
      this.logger.log(
        `Attempt ${attempt}: accumulated ${accumulated.size}/${totalHits} (missing ${missing}). ` +
          `Retrying...`,
      );

      // Delay before next attempt
      await this.sleep(this.config.accumulationDelayMs * attempt);
    }

    // Final check
    if (accumulated.size < totalHits) {
      this.logger.warn(
        `After ${attempt} attempts: accumulated ${accumulated.size}/${totalHits} companies. ` +
          `Some companies may be missing due to upstream CDN inconsistency.`,
      );
    }

    const companies = Array.from(accumulated.values());

    this.logger.log(
      `Fetched all ${totalPages} pages. Total unique companies: ${companies.length}`,
    );

    return {
      companies,
      totalHits,
      totalPages,
      fetchedPages: totalPages,
      accumulationAttempts: attempt,
    };
  }

  /**
   * Sleep helper for delays.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
