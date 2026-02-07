import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  Logger,
  Delete,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiSecurity,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { AdminApiKeyGuard } from './guards/admin-api-key.guard';
import { PortfolioIngestService } from '../ingestion/portfolio-ingest.service';
import { AdminKeyService } from './admin-key.service';
import { CompaniesRepository } from '../companies/companies.repository';
import { IngestionResultDto } from './dto/ingestion-result.dto';
import { CreateAdminKeyDto } from './dto/create-admin-key.dto';
import { AdminKeyResponseDto } from './dto/admin-key-response.dto';

/**
 * Admin controller for privileged operations.
 *
 * Protected endpoints require X-Admin-Key header with a valid temporary key.
 * Generate keys via POST /admin/keys (public endpoint).
 */
@ApiTags('Admin')
@ApiSecurity('X-Admin-Key')
@Controller('admin')
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly ingestService: PortfolioIngestService,
    private readonly adminKeyService: AdminKeyService,
    private readonly companiesRepository: CompaniesRepository,
  ) {}

  /**
   * Generate a temporary admin key.
   *
   * The returned token is shown ONCE ONLY. Store it securely.
   * Use it in the X-Admin-Key header for subsequent admin requests.
   *
   * This endpoint is public — no authentication required.
   */
  @Post('keys')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Generate a temporary admin key',
    description:
      'Creates a short-lived admin key that can be used for authentication. ' +
      'The token is shown ONCE ONLY in the response — store it securely. ' +
      'No authentication required to generate a key.',
  })
  @ApiBody({ type: CreateAdminKeyDto, required: false })
  @ApiResponse({
    status: 201,
    description: 'Temporary key created successfully',
    type: AdminKeyResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid TTL value',
  })
  async generateKey(
    @Body() dto: CreateAdminKeyDto,
  ): Promise<AdminKeyResponseDto> {
    const ttl = dto?.ttlMinutes ?? 30;
    this.logger.log(`Generating temporary admin key with TTL: ${ttl} minutes`);

    const result = await this.adminKeyService.generateKey(ttl);

    this.logger.log(
      `Generated key ${result.keyId}, expires: ${result.expiresAt.toISOString()}`,
    );

    return result;
  }

  /**
   * Revoke a temporary admin key.
   */
  @Delete('keys/:keyId')
  @HttpCode(200)
  @UseGuards(AdminApiKeyGuard)
  @ApiOperation({
    summary: 'Revoke a temporary admin key',
    description:
      'Invalidates a temporary key immediately so it can no longer be used.',
  })
  @ApiHeader({
    name: 'X-Admin-Key',
    description: 'Admin API key for authentication',
    required: true,
  })
  @ApiParam({
    name: 'keyId',
    description: 'The key ID returned when the key was created',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({ status: 200, description: 'Key revoked successfully' })
  @ApiResponse({ status: 404, description: 'Key not found' })
  async revokeKey(
    @Param('keyId') keyId: string,
  ): Promise<{ revoked: boolean }> {
    const revoked = await this.adminKeyService.revokeKey(keyId);
    return { revoked };
  }

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
      'Requires X-Admin-Key header with a valid temporary key.',
  })
  @ApiHeader({
    name: 'X-Admin-Key',
    description: 'Temporary admin key generated via POST /admin/keys',
    required: true,
    example: 'ak_a1b2c3d4e5f6...',
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

  /**
   * Delete all companies from the database.
   *
   * ⚠️ DESTRUCTIVE OPERATION: This permanently removes all company data.
   * Use with caution. Re-ingestion will be required to restore data.
   */
  @Delete('companies')
  @HttpCode(200)
  @UseGuards(AdminApiKeyGuard)
  @ApiOperation({
    summary: 'Delete all companies',
    description:
      'Permanently deletes all company records from the database. ' +
      'This is a destructive operation — use with caution. ' +
      'Re-run ingestion via POST /admin/ingest to restore data. ' +
      'Requires X-Admin-Key header with a valid temporary key.',
  })
  @ApiHeader({
    name: 'X-Admin-Key',
    description: 'Temporary admin key generated via POST /admin/keys',
    required: true,
    example: 'ak_a1b2c3d4e5f6...',
  })
  @ApiResponse({
    status: 200,
    description: 'All companies deleted successfully',
    schema: {
      type: 'object',
      properties: {
        deleted: { type: 'number', example: 296 },
        message: {
          type: 'string',
          example: 'Successfully deleted 296 companies',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid X-Admin-Key header',
  })
  async deleteAllCompanies(): Promise<{ deleted: number; message: string }> {
    this.logger.warn('Delete all companies triggered via HTTP endpoint');

    const deletedCount = await this.companiesRepository.deleteAll();

    this.logger.log(`Deleted ${deletedCount} companies`);

    return {
      deleted: deletedCount,
      message: `Successfully deleted ${deletedCount} companies`,
    };
  }
}
