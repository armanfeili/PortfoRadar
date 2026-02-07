import { ApiProperty } from '@nestjs/swagger';

/**
 * Ingestion counts breakdown.
 */
export class IngestionCountsDto {
  @ApiProperty({
    example: 296,
    description: 'Total companies fetched from source',
  })
  fetched: number;

  @ApiProperty({ example: 290, description: 'New companies created' })
  created: number;

  @ApiProperty({ example: 6, description: 'Existing companies updated' })
  updated: number;

  @ApiProperty({ example: 0, description: 'Companies that failed to upsert' })
  failed: number;
}

/**
 * Source metadata from the ingestion.
 */
export class SourceMetaDto {
  @ApiProperty({
    example: 296,
    description: 'Total companies reported by source API',
  })
  totalFromSource: number;

  @ApiProperty({ example: 20, description: 'Total pages fetched from source' })
  pagesFromSource: number;

  @ApiProperty({
    example: 1,
    description: 'Number of accumulation attempts for CDN reliability',
  })
  accumulationAttempts: number;
}

/**
 * Response from the ingestion endpoint.
 */
export class IngestionResultDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Unique run identifier',
  })
  runId: string;

  @ApiProperty({
    enum: ['completed', 'failed'],
    example: 'completed',
    description: 'Final status of the ingestion run',
  })
  status: 'completed' | 'failed';

  @ApiProperty({ type: IngestionCountsDto })
  counts: IngestionCountsDto;

  @ApiProperty({ type: SourceMetaDto })
  sourceMeta: SourceMetaDto;

  @ApiProperty({
    example: 12500,
    description: 'Duration of ingestion in milliseconds',
  })
  durationMs: number;

  @ApiProperty({
    example: 296,
    description: 'Unique companies after de-duplication',
  })
  uniqueThisRun: number;

  @ApiProperty({
    example: true,
    description: 'Whether all companies from source were collected',
  })
  isComplete: boolean;
}
