import { Injectable } from '@nestjs/common';
import {
  CompaniesRepository,
  CompanyFilters,
  PaginationOptions,
} from './companies.repository';
import { QueryCompaniesDto } from './dto/query-companies.dto';
import { Company } from './schemas/company.schema';

/**
 * Service layer for company operations.
 * Wraps repository calls with business logic.
 */
@Injectable()
export class CompaniesService {
  constructor(private readonly companiesRepository: CompaniesRepository) {}

  /**
   * Find companies with filters and pagination.
   * Transforms DTO to repository filter/pagination options.
   */
  async findAll(query: QueryCompaniesDto) {
    const filters: CompanyFilters = {};

    if (query.assetClass) {
      filters.assetClass = query.assetClass;
    }

    if (query.industry) {
      filters.industry = query.industry;
    }

    if (query.region) {
      filters.region = query.region;
    }

    if (query.q) {
      filters.search = query.q;
    }

    const pagination: PaginationOptions = {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      sortBy: 'nameSort',
      sortOrder: 'asc',
    };

    return this.companiesRepository.findAll(filters, pagination);
  }

  /**
   * Find a single company by companyId.
   */
  async findByCompanyId(companyId: string): Promise<Company | null> {
    return this.companiesRepository.findByCompanyId(companyId);
  }

  /**
   * Get aggregated statistics.
   */
  async getStats() {
    const [totalCompanies, byAssetClass, byIndustry, byRegion] =
      await Promise.all([
        this.companiesRepository.countAll(),
        this.companiesRepository.countByField('assetClasses'),
        this.companiesRepository.countByField('industry'),
        this.companiesRepository.countByField('region'),
      ]);

    return {
      totalCompanies,
      byAssetClass,
      byIndustry,
      byRegion,
    };
  }
}
