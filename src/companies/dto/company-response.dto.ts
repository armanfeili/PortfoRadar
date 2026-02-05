import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Related link structure for press releases, videos, etc.
 */
export class RelatedLinkDto {
  @ApiPropertyOptional({ example: 'https://www.kkr.com/news/press-release' })
  url?: string;

  @ApiPropertyOptional({ example: 'Press Release' })
  title?: string;
}

/**
 * Related links container.
 */
export class RelatedLinksDto {
  @ApiPropertyOptional({ type: RelatedLinkDto })
  linkOne?: RelatedLinkDto;

  @ApiPropertyOptional({ type: RelatedLinkDto })
  linkTwo?: RelatedLinkDto;
}

/**
 * Source metadata for data provenance tracking.
 */
export class SourceMetaDto {
  @ApiProperty({ example: 'https://www.kkr.com/businesses/kkr-portfolio' })
  listUrl: string;

  @ApiProperty({
    example:
      'https://www.kkr.com/content/kkr/sites/global/en/invest/portfolio/jcr:content/root/main-par/bioportfoliosearch.bioportfoliosearch.json',
  })
  endpoint: string;

  @ApiProperty({ example: '2026-02-05T10:30:00.000Z' })
  fetchedAt: Date;
}

/**
 * Single company response DTO.
 */
export class CompanyResponseDto {
  @ApiProperty({
    description: 'Unique company identifier (deterministic hash)',
    example: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
  })
  companyId: string;

  @ApiProperty({ description: 'Company name', example: 'Acme Corporation' })
  name: string;

  @ApiProperty({
    description: 'Lowercase name for sorting',
    example: 'acme corporation',
  })
  nameSort: string;

  @ApiProperty({
    description: 'Raw asset class string from API',
    example: 'Private Equity, Tech Growth',
  })
  assetClassRaw: string;

  @ApiProperty({
    description: 'Asset classes as array',
    type: [String],
    example: ['Private Equity', 'Tech Growth'],
  })
  assetClasses: string[];

  @ApiProperty({ description: 'Industry sector', example: 'Technology' })
  industry: string;

  @ApiProperty({ description: 'Geographic region', example: 'Americas' })
  region: string;

  @ApiPropertyOptional({
    description: 'Raw HTML description',
    example: '<p>Leading technology company</p>',
  })
  descriptionHtml?: string;

  @ApiPropertyOptional({
    description: 'Plain text description (HTML stripped)',
    example: 'Leading technology company',
  })
  descriptionText?: string;

  @ApiPropertyOptional({
    description: 'Company website URL',
    example: 'https://www.acme.com',
  })
  website?: string;

  @ApiPropertyOptional({
    description: 'Headquarters location',
    example: 'San Francisco, CA',
  })
  headquarters?: string;

  @ApiPropertyOptional({
    description: 'Year of investment',
    example: '2023',
  })
  yearOfInvestment?: string;

  @ApiPropertyOptional({
    description: 'Logo relative path from API',
    example: '/content/dam/kkr/logos/acme.png',
  })
  logoPath?: string;

  @ApiPropertyOptional({
    description: 'Full logo URL',
    example: 'https://www.kkr.com/content/dam/kkr/logos/acme.png',
  })
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Optional related links',
    type: RelatedLinksDto,
  })
  relatedLinks?: RelatedLinksDto;

  @ApiProperty({
    description: 'Source metadata for provenance tracking',
    type: SourceMetaDto,
  })
  source: SourceMetaDto;

  @ApiPropertyOptional({
    description: 'Document creation timestamp',
    example: '2026-02-05T10:30:00.000Z',
  })
  createdAt?: Date;

  @ApiPropertyOptional({
    description: 'Document last update timestamp',
    example: '2026-02-05T10:30:00.000Z',
  })
  updatedAt?: Date;
}

/**
 * Paginated list of companies response.
 */
export class PaginatedCompaniesResponseDto {
  @ApiProperty({
    description: 'Array of companies',
    type: [CompanyResponseDto],
  })
  items: CompanyResponseDto[];

  @ApiProperty({ description: 'Current page number', example: 1 })
  page: number;

  @ApiProperty({ description: 'Items per page', example: 20 })
  limit: number;

  @ApiProperty({
    description: 'Total number of matching companies',
    example: 296,
  })
  total: number;

  @ApiProperty({ description: 'Total number of pages', example: 15 })
  totalPages: number;
}
