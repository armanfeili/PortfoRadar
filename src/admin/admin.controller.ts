import { Controller, Post, UseGuards, HttpCode, Logger } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiSecurity,
} from '@nestjs/swagger';
import { AdminApiKeyGuard } from './guards/admin-api-key.guard';
import { PortfolioIngestService } from '../ingestion/portfolio-ingest.service';
import { IngestionResultDto } from './dto/ingestion-result.dto';

/**
 * Admin controller for privileged operations.
 *
 * All endpoints require X-Admin-Key header authentication.
 */
@ApiTags('Admin')
@ApiSecurity('X-Admin-Key')
@Controller('admin')
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(private readonly ingestService: PortfolioIngestService) {}

  /**
   * Trigger a full ingestion of portfolio companies from KKR.
   *
   * This endpoint fetches all companies from the KKR public API,
   * de-duplicates them, and upserts each into MongoDB.
   *
   * Note: This operation may take 15-60 seconds depending on network conditions.
   */
  @Post('ingest')
  @HttpCode(200)
  @UseGuards(AdminApiKeyGuard)
  @ApiOperation({
    summary: 'Trigger portfolio data ingestion',
    description:
      'Fetches all portfolio companies from KKR API and upserts into database. ' +
      'This operation typically takes 15-60 seconds. ' +
      'Requires X-Admin-Key header for authentication.',
  })
  @ApiHeader({
    name: 'X-Admin-Key',
    description: 'Admin API key for authentication',
    required: true,
    example: 'your-secret-admin-key',
  })
  @ApiResponse({
    status: 200,
    description: 'Ingestion completed (check status field for success/failure)',
    type: IngestionResultDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid X-Admin-Key header',
  })
  async triggerIngestion(): Promise<IngestionResultDto> {
    this.logger.log('Ingestion triggered via HTTP endpoint');

    const result = await this.ingestService.ingestAll();

    this.logger.log(
      `Ingestion ${result.status}: ${result.counts.fetched} fetched, ` +
        `${result.counts.created} created, ${result.counts.updated} updated ` +
        `in ${result.durationMs}ms`,
    );

    return result;
  }
}
