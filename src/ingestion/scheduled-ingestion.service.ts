import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { PortfolioIngestService } from './portfolio-ingest.service';
import { EnvConfig } from '../config/env.validation';

/**
 * Manages scheduled (cron-based) ingestion of KKR portfolio data.
 *
 * Controlled by environment variables:
 * - ENABLE_SCHEDULED_INGEST: 'true' to enable (default), 'false' to disable
 * - INGEST_CRON: Cron expression for schedule (default: '0 3 * * *' = daily at 3 AM UTC)
 */
@Injectable()
export class ScheduledIngestionService implements OnModuleInit {
  private readonly logger = new Logger(ScheduledIngestionService.name);
  private readonly isEnabled: boolean;
  private readonly cronExpression: string;

  constructor(
    private readonly configService: ConfigService<EnvConfig, true>,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly ingestService: PortfolioIngestService,
  ) {
    this.isEnabled = this.configService.get('ENABLE_SCHEDULED_INGEST', {
      infer: true,
    });
    this.cronExpression = this.configService.get('INGEST_CRON', {
      infer: true,
    });
  }

  /**
   * Register the cron job on module initialization if enabled.
   */
  onModuleInit() {
    if (!this.isEnabled) {
      this.logger.log(
        'Scheduled ingestion is DISABLED (set ENABLE_SCHEDULED_INGEST=true to enable)',
      );
      return;
    }

    this.logger.log(
      `Scheduled ingestion ENABLED with cron: "${this.cronExpression}"`,
    );

    const job = new CronJob(this.cronExpression, () => {
      void this.handleScheduledIngest();
    });

    this.schedulerRegistry.addCronJob('scheduled-ingest', job);
    job.start();

    // Log next scheduled run
    const nextRun = job.nextDate();
    this.logger.log(`Next scheduled ingestion: ${nextRun.toISO()}`);
  }

  /**
   * Execute the scheduled ingestion.
   * This method is called by the cron job.
   */
  async handleScheduledIngest(): Promise<void> {
    this.logger.log('Starting scheduled ingestion...');

    try {
      const result = await this.ingestService.ingestAll();

      this.logger.log(
        `Scheduled ingestion ${result.status}: ` +
          `${result.counts.fetched} fetched, ${result.counts.created} created, ` +
          `${result.counts.updated} updated in ${result.durationMs}ms`,
      );

      if (!result.isComplete) {
        this.logger.warn(
          `Scheduled ingestion incomplete: got ${result.counts.fetched}/${result.sourceMeta.totalFromSource}`,
        );
      }
    } catch (error) {
      this.logger.error('Scheduled ingestion failed', error);
    }
  }
}
