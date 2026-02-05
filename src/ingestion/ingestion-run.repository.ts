import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'crypto';
import {
  IngestionRun,
  IngestionRunDocument,
} from './schemas/ingestion-run.schema';

/**
 * DTO for creating a new ingestion run.
 */
export interface CreateIngestionRunDto {
  listUrl: string;
  endpointUsed: string;
}

/**
 * DTO for updating an ingestion run.
 */
export interface UpdateIngestionRunDto {
  status?: 'running' | 'completed' | 'failed';
  finishedAt?: Date;
  counts?: {
    fetched?: number;
    created?: number;
    updated?: number;
    failed?: number;
  };
  sourceMeta?: {
    totalFromSource: number;
    pagesFromSource: number;
    asOf?: string;
    scopeNote?: string;
  };
  errorMessages?: string[];
}

/**
 * Repository for IngestionRun data access operations.
 */
@Injectable()
export class IngestionRunRepository {
  constructor(
    @InjectModel(IngestionRun.name)
    private readonly runModel: Model<IngestionRunDocument>,
  ) {}

  /**
   * Create a new ingestion run record.
   */
  async create(dto: CreateIngestionRunDto): Promise<IngestionRun> {
    const run = new this.runModel({
      runId: randomUUID(),
      startedAt: new Date(),
      status: 'running',
      counts: {
        fetched: 0,
        created: 0,
        updated: 0,
        failed: 0,
      },
      errorMessages: [],
      sourceMeta: {
        listUrl: dto.listUrl,
        endpointUsed: dto.endpointUsed,
        totalFromSource: 0,
        pagesFromSource: 0,
      },
    });

    return run.save();
  }

  /**
   * Update an existing ingestion run.
   */
  async update(runId: string, dto: UpdateIngestionRunDto): Promise<void> {
    const update: Record<string, unknown> = {};

    if (dto.status) update.status = dto.status;
    if (dto.finishedAt) update.finishedAt = dto.finishedAt;
    if (dto.counts) {
      if (dto.counts.fetched !== undefined)
        update['counts.fetched'] = dto.counts.fetched;
      if (dto.counts.created !== undefined)
        update['counts.created'] = dto.counts.created;
      if (dto.counts.updated !== undefined)
        update['counts.updated'] = dto.counts.updated;
      if (dto.counts.failed !== undefined)
        update['counts.failed'] = dto.counts.failed;
    }
    if (dto.sourceMeta) {
      update['sourceMeta.totalFromSource'] = dto.sourceMeta.totalFromSource;
      update['sourceMeta.pagesFromSource'] = dto.sourceMeta.pagesFromSource;
      if (dto.sourceMeta.asOf) update['sourceMeta.asOf'] = dto.sourceMeta.asOf;
      if (dto.sourceMeta.scopeNote)
        update['sourceMeta.scopeNote'] = dto.sourceMeta.scopeNote;
    }
    if (dto.errorMessages) update.errorMessages = dto.errorMessages;

    await this.runModel.updateOne({ runId }, { $set: update }).exec();
  }

  /**
   * Add an error message to the run (capped at 10).
   */
  async addError(runId: string, errorMessage: string): Promise<void> {
    await this.runModel
      .updateOne(
        { runId },
        {
          $push: {
            errorMessages: {
              $each: [errorMessage],
              $slice: -10, // Keep only last 10 errors
            },
          },
        },
      )
      .exec();
  }

  /**
   * Find the most recent ingestion run.
   */
  async findLatest(): Promise<IngestionRun | null> {
    return this.runModel
      .findOne()
      .sort({ startedAt: -1 })
      .lean<IngestionRun>()
      .exec();
  }

  /**
   * Find a run by its ID.
   */
  async findByRunId(runId: string): Promise<IngestionRun | null> {
    return this.runModel.findOne({ runId }).lean<IngestionRun>().exec();
  }
}
