import { Injectable, Logger } from '@nestjs/common';
import { KkrClient, KKR_PORTFOLIO_URL } from './kkr-client/kkr.client';
import {
  mapRawToCompanyDto,
  generateCompanyId,
  getCompanyIdKey,
} from './mappers/company.mapper';
import { CompaniesRepository } from '../companies/companies.repository';
import { IngestionRunRepository } from './ingestion-run.repository';
import { KkrRawCompany } from './kkr-client/kkr-api.types';

/**
 * Result summary from an ingestion run.
 */
export interface IngestionResult {
  runId: string;
  status: 'completed' | 'failed';
  counts: {
    fetched: number;
    created: number;
    updated: number;
    failed: number;
  };
  sourceMeta: {
    totalFromSource: number;
    pagesFromSource: number;
    accumulationAttempts: number;
  };
  durationMs: number;
  /** Number of unique companies after de-duplication */
  uniqueThisRun: number;
  /** Whether we collected all companies from source */
  isComplete: boolean;
}

/**
 * Service for ingesting portfolio companies from KKR.
 *
 * Features:
 * - Fetches all pages from KKR API
 * - De-duplicates by companyId in-memory
 * - Upserts each company (idempotent)
 * - Tracks progress in IngestionRun record
 * - One company failure doesn't crash the run
 */
@Injectable()
export class PortfolioIngestService {
  private readonly logger = new Logger(PortfolioIngestService.name);

  constructor(
    private readonly kkrClient: KkrClient,
    private readonly companiesRepo: CompaniesRepository,
    private readonly runRepo: IngestionRunRepository,
  ) {}

  /**
   * Run a full ingestion of all KKR portfolio companies.
   */
  async ingestAll(): Promise<IngestionResult> {
    const startTime = Date.now();
    this.logger.log('Starting portfolio ingestion...');

    // 1. Create ingestion run record
    const run = await this.runRepo.create({
      listUrl: KKR_PORTFOLIO_URL,
      endpointUsed: this.kkrClient.getEndpointUrl(),
    });

    this.logger.log(`Created ingestion run: ${run.runId}`);

    const counts = {
      fetched: 0,
      created: 0,
      updated: 0,
      failed: 0,
    };

    let totalFromSource = 0;
    let pagesFromSource = 0;
    let accumulationAttempts = 0;
    let uniqueThisRun = 0;

    try {
      // 2. Fetch all pages (with accumulation loop for CDN reliability)
      const fetchResult = await this.kkrClient.fetchAllPages();
      totalFromSource = fetchResult.totalHits;
      pagesFromSource = fetchResult.totalPages;
      accumulationAttempts = fetchResult.accumulationAttempts;
      counts.fetched = fetchResult.companies.length;

      this.logger.log(
        `Fetched ${counts.fetched} unique companies from ${pagesFromSource} pages ` +
          `(${accumulationAttempts} accumulation attempt${accumulationAttempts > 1 ? 's' : ''})`,
      );

      // 3. De-duplicate by companyId in memory (log collisions for debugging)
      const uniqueCompanies = this.deduplicateCompanies(
        fetchResult.companies,
        true,
      );
      uniqueThisRun = uniqueCompanies.size;
      this.logger.log(
        `After de-duplication: ${uniqueThisRun} unique companies`,
      );

      // 4. Upsert each company
      for (const raw of uniqueCompanies.values()) {
        try {
          const dto = mapRawToCompanyDto(
            raw,
            this.kkrClient.getEndpointUrl(),
            KKR_PORTFOLIO_URL,
          );

          const result = await this.companiesRepo.upsertCompany(dto);

          if (result.created) {
            counts.created++;
          } else if (result.updated) {
            counts.updated++;
          }
        } catch (error) {
          counts.failed++;
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Failed to upsert company "${raw.name}": ${errorMsg}`,
          );

          // Record error (capped at 10)
          await this.runRepo.addError(run.runId, `${raw.name}: ${errorMsg}`);
        }
      }

      // 5. Update run record with success
      await this.runRepo.update(run.runId, {
        status: 'completed',
        finishedAt: new Date(),
        counts,
        sourceMeta: {
          totalFromSource,
          pagesFromSource,
        },
      });

      const durationMs = Date.now() - startTime;
      const isComplete = counts.fetched >= totalFromSource;

      this.logger.log(
        `Ingestion complete in ${durationMs}ms: ` +
          `${counts.fetched} fetched, ${counts.created} created, ` +
          `${counts.updated} updated, ${counts.failed} failed`,
      );

      if (!isComplete) {
        this.logger.warn(
          `⚠️  Incomplete: collected ${counts.fetched}/${totalFromSource} companies. ` +
            `Run again to accumulate missing companies.`,
        );
      }

      return {
        runId: run.runId,
        status: 'completed',
        counts,
        sourceMeta: { totalFromSource, pagesFromSource, accumulationAttempts },
        durationMs,
        uniqueThisRun,
        isComplete,
      };
    } catch (error) {
      // Fatal error — update run as failed
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Ingestion failed: ${errorMsg}`);

      await this.runRepo.update(run.runId, {
        status: 'failed',
        finishedAt: new Date(),
        counts,
        sourceMeta: {
          totalFromSource,
          pagesFromSource,
        },
      });

      await this.runRepo.addError(run.runId, `Fatal: ${errorMsg}`);

      return {
        runId: run.runId,
        status: 'failed',
        counts,
        sourceMeta: { totalFromSource, pagesFromSource, accumulationAttempts },
        durationMs: Date.now() - startTime,
        uniqueThisRun,
        isComplete: false,
      };
    }
  }

  /**
   * De-duplicate companies by companyId.
   *
   * Same company may appear multiple times if fetched with different filters.
   * Uses a Map to keep the first occurrence of each company.
   *
   * Also logs collision examples when multiple raw items map to the same ID.
   */
  private deduplicateCompanies(
    companies: KkrRawCompany[],
    logCollisions: boolean = false,
  ): Map<string, KkrRawCompany> {
    const map = new Map<string, KkrRawCompany>();
    const collisions: Map<string, KkrRawCompany[]> = new Map();

    for (const raw of companies) {
      const companyId = generateCompanyId(raw);

      if (map.has(companyId)) {
        // Track collisions for debugging
        if (!collisions.has(companyId)) {
          collisions.set(companyId, [map.get(companyId)!]);
        }
        collisions.get(companyId)!.push(raw);
      } else {
        map.set(companyId, raw);
      }
    }

    // Log collision examples (useful for debugging ID stability issues)
    if (logCollisions && collisions.size > 0) {
      this.logger.debug(`Found ${collisions.size} IDs with collisions:`);
      let count = 0;
      for (const [id, items] of collisions) {
        if (count >= 5) {
          this.logger.debug(`... and ${collisions.size - 5} more`);
          break;
        }
        const key = getCompanyIdKey(items[0]);
        this.logger.debug(
          `  ID ${id.substring(0, 8)}... (key: ${key}): ${items.length} items`,
        );
        for (const item of items) {
          this.logger.debug(
            `    - "${item.name}" | logo: ${item.logo?.substring(0, 50) || 'EMPTY'}`,
          );
        }
        count++;
      }
    }

    // Log summary of duplicates (these are expected - same company across pages)
    const duplicateCount = companies.length - map.size;
    if (duplicateCount > 0) {
      this.logger.debug(
        `De-duplication removed ${duplicateCount} duplicate entries (same company seen multiple times)`,
      );
    }

    return map;
  }
}
