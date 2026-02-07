import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HydratedDocument } from 'mongoose';

/**
 * Related link structure for press releases, videos, etc.
 */
export class RelatedLink {
  @ApiPropertyOptional({
    example:
      'https://www.kkr.com/news/press-release/kkr-invests-in-beacon-pointe',
  })
  @Prop()
  url?: string;

  @ApiPropertyOptional({ example: 'KKR Invests in Beacon Pointe' })
  @Prop()
  title?: string;
}

// RelatedLinks class removed - using RelatedLink[] instead

/**
 * Source metadata for data provenance tracking.
 */
export class SourceMeta {
  @ApiProperty({ example: 'https://www.kkr.com/invest/portfolio' })
  @Prop({ required: true })
  listUrl: string;

  @ApiProperty({
    example:
      'https://www.kkr.com/content/kkr/sites/global/en/invest/portfolio/jcr:content/root/main-par/bioportfoliosearch.bioportfoliosearch.json',
  })
  @Prop({ required: true })
  endpoint: string;

  @ApiProperty({ example: '2026-02-07T16:08:21.096Z' })
  @Prop({ required: true })
  fetchedAt: Date;
}

export type CompanyDocument = HydratedDocument<Company>;

/**
 * Company schema representing a KKR portfolio company.
 *
 * Key design decisions:
 * - companyId is a deterministic hash (SHA256) since KKR API provides no unique ID
 * - assetClassRaw stores the raw API value; assetClasses is computed (split by comma)
 * - region is a single string (not an array) per API behavior
 * - nameSort enables fast case-insensitive alphabetical sorting
 */
@Schema({
  timestamps: true, // Auto-manage createdAt and updatedAt
  collection: 'companies',
})
export class Company {
  /**
   * Unique identifier - deterministic hash of stable company fields.
   * Generated using: name + yoi + hq + assetClass + industry
   */
  @ApiProperty({
    description: 'Unique company identifier (32-character deterministic hash)',
    example: '6d33368bc3c97be82b05a93100bfdc44',
  })
  @Prop({ required: true, unique: true, index: true })
  companyId: string;

  /** Company name as returned from API */
  @ApiProperty({
    description: 'Company name',
    example: 'Beacon Pointe Advisors Holdings, LLC',
  })
  @Prop({ required: true })
  name: string;

  /** Lowercase name for fast case-insensitive sorting */
  @ApiProperty({
    description: 'Lowercase name for sorting',
    example: 'beacon pointe advisors holdings, llc',
  })
  @Prop({ required: true, index: true })
  nameSort: string;

  /** Raw asset class string from API (may be comma-separated) */
  @ApiProperty({
    description: 'Raw asset class string from API',
    example: 'Private Equity',
  })
  @Prop({ required: true })
  assetClassRaw: string;

  /** Asset classes split into array for filtering (indexed as multikey) */
  @ApiProperty({
    description: 'Asset classes as array',
    type: [String],
    example: ['Private Equity'],
  })
  @Prop({ required: true, type: [String], index: true })
  assetClasses: string[];

  /** Industry sector */
  @ApiProperty({ description: 'Industry sector', example: 'Financials' })
  @Prop({ required: true, index: true })
  industry: string;

  /** Geographic region (single string: Americas, Asia Pacific, etc.) */
  @ApiProperty({
    description: 'Geographic region',
    example: 'Americas',
  })
  @Prop({ required: true, index: true })
  region: string;

  // --- Optional fields from API ---

  /** Raw HTML description from API */
  @ApiPropertyOptional({
    description: 'Raw HTML description',
    example: '<p>Leading registered investment advisor</p>\n',
  })
  @Prop()
  descriptionHtml?: string;

  /** Plain text description (HTML stripped) */
  @ApiPropertyOptional({
    description: 'Plain text description (HTML stripped)',
    example: 'Leading registered investment advisor',
  })
  @Prop()
  descriptionText?: string;

  /** Company website URL (normalized with https://) */
  @ApiPropertyOptional({
    description: 'Company website URL',
    example: 'https://www.beaconpointe.com',
  })
  @Prop()
  website?: string;

  /** Headquarters location */
  @ApiPropertyOptional({
    description: 'Headquarters location',
    example: 'Newport Beach, California, United States',
  })
  @Prop()
  headquarters?: string;

  /** Year of investment */
  @ApiPropertyOptional({
    description: 'Year of investment',
    example: '2021',
  })
  @Prop()
  yearOfInvestment?: string;

  /** Logo relative path from API */
  @ApiPropertyOptional({
    description: 'Logo relative path from API',
    example: '/content/dam/kkr/portfolio/resized-logos/beacon-pointe.png',
  })
  @Prop()
  logoPath?: string;

  /** Full logo URL (computed: https://www.kkr.com + logoPath) */
  @ApiPropertyOptional({
    description: 'Full logo URL',
    example:
      'https://www.kkr.com/content/dam/kkr/portfolio/resized-logos/beacon-pointe.png',
  })
  @Prop()
  logoUrl?: string;

  /** Optional related links (press releases, videos) */
  @ApiPropertyOptional({
    description: 'Optional related links (press releases, videos)',
    type: [RelatedLink],
  })
  @Prop({ type: [RelatedLink] })
  relatedLinks?: RelatedLink[];

  /** Source metadata for provenance tracking */
  @ApiProperty({
    description: 'Source metadata for provenance tracking',
    type: SourceMeta,
  })
  @Prop({ required: true, type: SourceMeta })
  source: SourceMeta;

  /**
   * Content hash of business fields (excludes timestamps/source metadata).
   * Used to detect if company data actually changed between ingestions.
   */
  @ApiPropertyOptional({
    description: 'Content hash for change detection (internal)',
    example: '980caa087f692016cb00c0fb374b69d0',
  })
  @Prop({ index: true })
  contentHash?: string;
}

export const CompanySchema = SchemaFactory.createForClass(Company);

// Compound index for common query patterns
CompanySchema.index({ industry: 1, region: 1 });
