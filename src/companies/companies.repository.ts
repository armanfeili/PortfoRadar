import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import { Company, CompanyDocument } from './schemas/company.schema';

/**
 * DTO for upserting a company.
 * All required fields must be present for upsert.
 */
export interface UpsertCompanyDto {
  companyId: string;
  name: string;
  nameSort: string;
  assetClassRaw: string;
  assetClasses: string[];
  industry: string;
  region: string;
  descriptionHtml?: string;
  descriptionText?: string;
  website?: string;
  headquarters?: string;
  yearOfInvestment?: string;
  logoPath?: string;
  logoUrl?: string;
  relatedLinks?: {
    linkOne?: { url?: string; title?: string };
    linkTwo?: { url?: string; title?: string };
  };
  source: {
    listUrl: string;
    endpoint: string;
    fetchedAt: Date;
  };
}

/**
 * Pagination options for list queries.
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Filter options for company queries.
 */
export interface CompanyFilters {
  assetClass?: string;
  industry?: string;
  region?: string;
  search?: string;
}

/**
 * Result of an upsert operation.
 */
export interface UpsertResult {
  companyId: string;
  created: boolean;
  updated: boolean;
}

/**
 * Result of a paginated query.
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Repository for Company data access operations.
 *
 * Provides idempotent upsert (key for ingestion) and query methods.
 */
@Injectable()
export class CompaniesRepository {
  constructor(
    @InjectModel(Company.name)
    private readonly companyModel: Model<CompanyDocument>,
  ) {}

  /**
   * Insert or update a company by companyId.
   * Idempotent: same data produces same result, no duplicates.
   */
  async upsertCompany(dto: UpsertCompanyDto): Promise<UpsertResult> {
    const existingDoc = await this.companyModel.findOne({
      companyId: dto.companyId,
    });

    if (existingDoc) {
      // Update existing document
      await this.companyModel.updateOne({ companyId: dto.companyId }, dto);
      return { companyId: dto.companyId, created: false, updated: true };
    }

    // Create new document
    await this.companyModel.create(dto);
    return { companyId: dto.companyId, created: true, updated: false };
  }

  /**
   * Bulk upsert multiple companies.
   * Uses bulkWrite for efficiency.
   */
  async bulkUpsert(
    companies: UpsertCompanyDto[],
  ): Promise<{ created: number; updated: number }> {
    if (companies.length === 0) {
      return { created: 0, updated: 0 };
    }

    const operations = companies.map((company) => ({
      updateOne: {
        filter: { companyId: company.companyId },
        update: { $set: company },
        upsert: true,
      },
    }));

    const result = await this.companyModel.bulkWrite(operations);

    return {
      created: result.upsertedCount,
      updated: result.modifiedCount,
    };
  }

  /**
   * Find all companies with optional filters and pagination.
   */
  async findAll(
    filters: CompanyFilters = {},
    pagination: PaginationOptions = {},
  ): Promise<PaginatedResult<Company>> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'nameSort',
      sortOrder = 'asc',
    } = pagination;
    const skip = (page - 1) * limit;

    // Build filter query - use Record type for ESLint compatibility
    const query: Record<string, unknown> = {};

    if (filters.assetClass) {
      // Match any element in the assetClasses array
      query.assetClasses = filters.assetClass;
    }

    if (filters.industry) {
      query.industry = filters.industry;
    }

    if (filters.region) {
      query.region = filters.region;
    }

    if (filters.search) {
      // Case-insensitive search on name
      query.name = { $regex: filters.search, $options: 'i' };
    }

    // Execute query with pagination
    const [items, total] = await Promise.all([
      this.companyModel
        .find(query)
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .lean<Company[]>()
        .exec(),
      this.companyModel.countDocuments(query).exec(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find a single company by its unique companyId.
   */
  async findByCompanyId(companyId: string): Promise<Company | null> {
    return this.companyModel.findOne({ companyId }).lean<Company>().exec();
  }

  /**
   * Count companies grouped by a specific field.
   * Useful for stats endpoints.
   */
  async countByField(
    field: 'assetClasses' | 'industry' | 'region',
  ): Promise<Record<string, number>> {
    const pipeline: PipelineStage[] =
      field === 'assetClasses'
        ? [
            { $unwind: `$${field}` },
            { $group: { _id: `$${field}`, count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ]
        : [
            { $group: { _id: `$${field}`, count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ];

    const results = await this.companyModel
      .aggregate<{ _id: string; count: number }>(pipeline)
      .exec();

    const counts: Record<string, number> = {};
    for (const { _id, count } of results) {
      if (_id) {
        counts[_id] = count;
      }
    }
    return counts;
  }

  /**
   * Get total count of companies.
   */
  async countAll(): Promise<number> {
    return this.companyModel.countDocuments().exec();
  }

  /**
   * Delete all companies (use with caution - mainly for testing).
   */
  async deleteAll(): Promise<number> {
    const result = await this.companyModel.deleteMany({}).exec();
    return result.deletedCount;
  }
}
