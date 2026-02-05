import { Injectable, Logger } from '@nestjs/common';
import { KkrClient, KKR_PORTFOLIO_URL } from './kkr-client/kkr.client';
import { mapRawToCompanyDto } from './mappers/company.mapper';
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
  };
  durationMs: number;
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

    try {
      // 2. Fetch all pages
      const fetchResult = await this.kkrClient.fetchAllPages();
      totalFromSource = fetchResult.totalHits;
      pagesFromSource = fetchResult.totalPages;
      counts.fetched = fetchResult.companies.length;

      this.logger.log(
        `Fetched ${counts.fetched} companies from ${pagesFromSource} pages`,
      );

      // 3. De-duplicate by companyId in memory
      const uniqueCompanies = this.deduplicateCompanies(fetchResult.companies);
      this.logger.log(
        `After de-duplication: ${uniqueCompanies.size} unique companies`,
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
      this.logger.log(
        `Ingestion complete in ${durationMs}ms: ` +
          `${counts.fetched} fetched, ${counts.created} created, ` +
          `${counts.updated} updated, ${counts.failed} failed`,
      );

      return {
        runId: run.runId,
        status: 'completed',
        counts,
        sourceMeta: { totalFromSource, pagesFromSource },
        durationMs,
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
        sourceMeta: { totalFromSource, pagesFromSource },
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * De-duplicate companies by companyId.
   *
   * Same company may appear multiple times if fetched with different filters.
   * Uses a Map to keep the last occurrence of each company.
   */
  private deduplicateCompanies(
    companies: KkrRawCompany[],
  ): Map<string, KkrRawCompany> {
    const map = new Map<string, KkrRawCompany>();

    for (const raw of companies) {
      // Use the mapper's hash function to get consistent IDs
      const dto = mapRawToCompanyDto(raw, '', '');
      map.set(dto.companyId, raw);
    }

    return map;
  }
}
