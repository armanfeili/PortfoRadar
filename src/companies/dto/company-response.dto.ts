import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * HATEOAS-style pagination links for API navigation.
 */
export class PaginationLinksDto {
  @ApiProperty({
    description: 'URL to the current page',
    example: '/companies?page=1&limit=20',
  })
  self: string;

  @ApiPropertyOptional({
    description: 'URL to the first page (null if on first page)',
    example: '/companies?page=1&limit=20',
    nullable: true,
  })
  first?: string | null;

  @ApiPropertyOptional({
    description: 'URL to the previous page (null if on first page)',
    example: '/companies?page=1&limit=20',
    nullable: true,
  })
  prev?: string | null;

  @ApiPropertyOptional({
    description: 'URL to the next page (null if on last page)',
    example: '/companies?page=2&limit=20',
    nullable: true,
  })
  next?: string | null;

  @ApiPropertyOptional({
    description: 'URL to the last page (null if on last page)',
    example: '/companies?page=15&limit=20',
    nullable: true,
  })
  last?: string | null;
}

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
// RelatedLinksDto class removed - using RelatedLinkDto[] instead

/**
 * Source metadata for data provenance tracking.
 */
export class SourceMetaDto {
  @ApiProperty({ example: 'https://www.kkr.com/invest/portfolio' })
  listUrl: string;

  @ApiProperty({
    example:
      'https://www.kkr.com/content/kkr/sites/global/en/invest/portfolio/jcr:content/root/main-par/bioportfoliosearch.bioportfoliosearch.json',
  })
  endpoint: string;

  @ApiProperty({ example: '2026-02-07T16:08:21.096Z' })
  fetchedAt: Date;
}

/**
 * Single company response DTO.
 * Note: MongoDB internal fields (_id, __v) are excluded from API responses.
 */
export class CompanyResponseDto {
  @ApiProperty({
    description: 'Unique company identifier (32-character deterministic hash)',
    example: '6d33368bc3c97be82b05a93100bfdc44',
    minLength: 32,
    maxLength: 32,
  })
  companyId: string;

  @ApiProperty({
    description: 'Company name',
    example: 'Beacon Pointe Advisors Holdings, LLC',
  })
  name: string;

  @ApiProperty({
    description: 'Lowercase name for sorting',
    example: 'beacon pointe advisors holdings, llc',
  })
  nameSort: string;

  @ApiProperty({
    description: 'Raw asset class string from API',
    example: 'Private Equity',
  })
  assetClassRaw: string;

  @ApiProperty({
    description: 'Asset classes as array',
    type: [String],
    example: ['Private Equity'],
  })
  assetClasses: string[];

  @ApiProperty({ description: 'Industry sector', example: 'Financials' })
  industry: string;

  @ApiProperty({
    description: 'Geographic region',
    example: 'Americas',
  })
  region: string;

  @ApiPropertyOptional({
    description: 'Raw HTML description',
    example: '<p>Leading registered investment advisor</p>\n',
  })
  descriptionHtml?: string;

  @ApiPropertyOptional({
    description: 'Plain text description (HTML stripped)',
    example: 'Leading registered investment advisor',
  })
  descriptionText?: string;

  @ApiPropertyOptional({
    description: 'Company website URL',
    example: 'https://www.beaconpointe.com',
  })
  website?: string;

  @ApiPropertyOptional({
    description: 'Headquarters location',
    example: 'Newport Beach, California, United States',
  })
  headquarters?: string;

  @ApiPropertyOptional({
    description: 'Year of investment',
    example: '2021',
  })
  yearOfInvestment?: string;

  @ApiPropertyOptional({
    description: 'Logo relative path from API',
    example: '/content/dam/kkr/portfolio/resized-logos/beacon-pointe.png',
  })
  logoPath?: string;

  @ApiPropertyOptional({
    description: 'Full logo URL',
    example:
      'https://www.kkr.com/content/dam/kkr/portfolio/resized-logos/beacon-pointe.png',
  })
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Content hash for change detection (internal)',
    example: '980caa087f692016cb00c0fb374b69d0',
  })
  contentHash?: string;

  @ApiPropertyOptional({
    description: 'Optional related links (press releases, videos)',
    type: [RelatedLinkDto],
  })
  relatedLinks?: RelatedLinkDto[];

  @ApiProperty({
    description: 'Source metadata for provenance tracking',
    type: SourceMetaDto,
  })
  source: SourceMetaDto;

  @ApiPropertyOptional({
    description: 'Document creation timestamp',
    example: '2026-02-07T16:08:21.104Z',
  })
  createdAt?: Date;

  @ApiPropertyOptional({
    description: 'Document last update timestamp',
    example: '2026-02-07T16:08:21.104Z',
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

  @ApiProperty({
    description: 'HATEOAS-style pagination links for API navigation',
    type: PaginationLinksDto,
  })
  _links: PaginationLinksDto;
}
