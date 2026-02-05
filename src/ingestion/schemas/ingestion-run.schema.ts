import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/**
 * Ingestion counts tracking created/updated/failed records.
 */
export class IngestionCounts {
  @Prop({ required: true, default: 0 })
  fetched: number;

  @Prop({ required: true, default: 0 })
  created: number;

  @Prop({ required: true, default: 0 })
  updated: number;

  @Prop({ required: true, default: 0 })
  failed: number;
}

/**
 * Source metadata for tracking API response details.
 */
export class IngestionSourceMeta {
  /** Main portfolio URL */
  @Prop({ required: true })
  listUrl: string;

  /** Actual API endpoint used */
  @Prop({ required: true })
  endpointUsed: string;

  /** Total companies from API response (hits field) */
  @Prop({ required: true })
  totalFromSource: number;

  /** Total pages from API response */
  @Prop({ required: true })
  pagesFromSource: number;

  /** Optional "as of" date if visible */
  @Prop()
  asOf?: string;

  /** Scope note (e.g., "Portfolio of KKR General Partner only") */
  @Prop()
  scopeNote?: string;
}

export type IngestionRunDocument = HydratedDocument<IngestionRun>;

/**
 * IngestionRun schema tracks each data ingestion execution.
 *
 * Useful for:
 * - Auditing when data was last refreshed
 * - Verifying fetched count matches source total
 * - Debugging failed ingestion runs
 */
@Schema({
  timestamps: true,
  collection: 'ingestion_runs',
})
export class IngestionRun {
  /** Unique run identifier (UUID or timestamp-based) */
  @Prop({ required: true, unique: true, index: true })
  runId: string;

  /** When the ingestion started */
  @Prop({ required: true })
  startedAt: Date;

  /** When the ingestion finished (null if still running) */
  @Prop()
  finishedAt?: Date;

  /** Current status of the ingestion run */
  @Prop({
    required: true,
    enum: ['running', 'completed', 'failed'],
    default: 'running',
  })
  status: 'running' | 'completed' | 'failed';

  /** Record counts for this run */
  @Prop({ required: true, type: IngestionCounts, default: () => ({}) })
  counts: IngestionCounts;

  /** Sample of error messages encountered (capped at ~10 for storage efficiency) */
  @Prop({ type: [String], default: [] })
  errorMessages: string[];

  /** Source metadata from API response */
  @Prop({ type: IngestionSourceMeta })
  sourceMeta?: IngestionSourceMeta;
}

export const IngestionRunSchema = SchemaFactory.createForClass(IngestionRun);

// Index for querying recent runs
IngestionRunSchema.index({ startedAt: -1 });
IngestionRunSchema.index({ status: 1, startedAt: -1 });
