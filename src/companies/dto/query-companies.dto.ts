import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Query parameters for GET /companies endpoint.
 *
 * Only allowlisted fields are accepted — never raw Mongo filters.
 */
export class QueryCompaniesDto {
  @ApiPropertyOptional({
    description:
      'Filter by asset class (matches any element in assetClasses array)',
    example: 'Private Equity',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  assetClass?: string;

  @ApiPropertyOptional({
    description: 'Filter by industry',
    example: 'Financials',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  industry?: string;

  @ApiPropertyOptional({
    description: 'Filter by region (single string)',
    example: 'Americas',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  region?: string;

  @ApiPropertyOptional({
    description: 'Search by company name (case-insensitive partial match)',
    example: 'beacon',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    type: 'integer',
    default: 1,
    minimum: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    type: 'integer',
    default: 20,
    minimum: 1,
    maximum: 100,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
