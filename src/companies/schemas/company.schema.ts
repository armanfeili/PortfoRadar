import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/**
 * Related link structure for press releases, videos, etc.
 * Note: Swagger documentation is handled by RelatedLinkDto in company-response.dto.ts
 */
export class RelatedLink {
  @Prop()
  url?: string;

  @Prop()
  title?: string;
}

/**
 * Source metadata for data provenance tracking.
 * Note: Swagger documentation is handled by SourceMetaDto in company-response.dto.ts
 */
export class SourceMeta {
  @Prop({ required: true })
  listUrl: string;

  @Prop({ required: true })
  endpoint: string;

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
 *
 * Note: Swagger/OpenAPI documentation is handled by CompanyResponseDto in company-response.dto.ts
 * This schema only contains Mongoose decorators for database operations.
 */
@Schema({
  timestamps: true, // Auto-manage createdAt and updatedAt
  collection: 'companies',
})
export class Company {
  /**
   * Unique identifier - deterministic hash of stable company fields.
   * Generated using: name + hq
   */
  @Prop({ required: true, unique: true, index: true })
  companyId: string;

  /** Company name as returned from API */
  @Prop({ required: true })
  name: string;

  /** Lowercase name for fast case-insensitive sorting */
  @Prop({ required: true, index: true })
  nameSort: string;

  /** Raw asset class string from API (may be comma-separated) */
  @Prop({ required: true })
  assetClassRaw: string;

  /** Asset classes split into array for filtering (indexed as multikey) */
  @Prop({ required: true, type: [String], index: true })
  assetClasses: string[];

  /** Industry sector */
  @Prop({ required: true, index: true })
  industry: string;

  /** Geographic region (single string: Americas, Asia Pacific, etc.) */
  @Prop({ required: true, index: true })
  region: string;

  // --- Optional fields from API ---

  /** Raw HTML description from API */
  @Prop()
  descriptionHtml?: string;

  /** Plain text description (HTML stripped) */
  @Prop()
  descriptionText?: string;

  /** Company website URL (normalized with https://) */
  @Prop()
  website?: string;

  /** Headquarters location */
  @Prop()
  headquarters?: string;

  /** Year of investment */
  @Prop()
  yearOfInvestment?: string;

  /** Logo relative path from API */
  @Prop()
  logoPath?: string;

  /** Full logo URL (computed: https://www.kkr.com + logoPath) */
  @Prop()
  logoUrl?: string;

  /** Optional related links (press releases, videos) */
  @Prop({ type: [RelatedLink] })
  relatedLinks?: RelatedLink[];

  /** Source metadata for provenance tracking */
  @Prop({ required: true, type: SourceMeta })
  source: SourceMeta;

  /**
   * Content hash of business fields (excludes timestamps/source metadata).
   * Used to detect if company data actually changed between ingestions.
   */
  @Prop({ index: true })
  contentHash?: string;
}

export const CompanySchema = SchemaFactory.createForClass(Company);

// Compound index for common query patterns
CompanySchema.index({ industry: 1, region: 1 });
