/**
 * Ingestion entrypoint script.
 *
 * Run with: npm run ingest
 *
 * Bootstraps the NestJS application context and runs a full
 * portfolio ingestion from KKR.
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PortfolioIngestService } from './ingestion/portfolio-ingest.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('IngestScript');

  logger.log('Bootstrapping application...');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const service = app.get(PortfolioIngestService);
    const result = await service.ingestAll();

    console.log('\n========================================');
    console.log('        INGESTION SUMMARY');
    console.log('========================================');
    console.log(`Run ID:          ${result.runId}`);
    console.log(`Status:          ${result.status.toUpperCase()}`);
    console.log(`Duration:        ${result.durationMs}ms`);
    console.log('----------------------------------------');
    console.log(`Fetched:         ${result.counts.fetched}`);
    console.log(`Created:         ${result.counts.created}`);
    console.log(`Updated:         ${result.counts.updated}`);
    console.log(`Failed:          ${result.counts.failed}`);
    console.log('----------------------------------------');
    console.log(`Source total:    ${result.sourceMeta.totalFromSource}`);
    console.log(`Source pages:    ${result.sourceMeta.pagesFromSource}`);
    console.log('========================================\n');

    // Verify: fetched should equal source total
    if (result.counts.fetched !== result.sourceMeta.totalFromSource) {
      logger.warn(
        `⚠️  Fetched (${result.counts.fetched}) != Source total (${result.sourceMeta.totalFromSource})`,
      );
    }

    // Exit with appropriate code
    process.exit(result.status === 'completed' ? 0 : 1);
  } catch (error) {
    logger.error('Ingestion failed with fatal error', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

void bootstrap();
