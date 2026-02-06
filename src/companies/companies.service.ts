import { Injectable } from '@nestjs/common';
import {
  CompaniesRepository,
  CompanyFilters,
  PaginationOptions,
} from './companies.repository';
import { QueryCompaniesDto } from './dto/query-companies.dto';
import { Company } from './schemas/company.schema';
import {
  PaginatedCompaniesResponseDto,
  PaginationLinksDto,
} from './dto/company-response.dto';

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
   * Includes HATEOAS-style pagination links.
   */
  async findAll(
    query: QueryCompaniesDto,
  ): Promise<PaginatedCompaniesResponseDto> {
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

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const pagination: PaginationOptions = {
      page,
      limit,
      sortBy: 'nameSort',
      sortOrder: 'asc',
    };

    const result = await this.companiesRepository.findAll(filters, pagination);

    // Build HATEOAS pagination links
    const _links = this.buildPaginationLinks(
      query,
      page,
      limit,
      result.totalPages,
    );

    return {
      items: result.items as unknown as PaginatedCompaniesResponseDto['items'],
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
      _links,
    };
  }

  /**
   * Build HATEOAS-style pagination links for API navigation.
   * Self always includes page and limit for consistency.
   */
  private buildPaginationLinks(
    query: QueryCompaniesDto,
    page: number,
    limit: number,
    totalPages: number,
  ): PaginationLinksDto {
    // Build base query string from current filters (excluding page/limit)
    const baseParams = new URLSearchParams();

    if (query.assetClass) baseParams.set('assetClass', query.assetClass);
    if (query.industry) baseParams.set('industry', query.industry);
    if (query.region) baseParams.set('region', query.region);
    if (query.q) baseParams.set('q', query.q);

    const buildLink = (targetPage: number): string => {
      const params = new URLSearchParams(baseParams);
      // Always include page and limit for consistency
      params.set('page', String(targetPage));
      params.set('limit', String(limit));
      return `/companies?${params.toString()}`;
    };

    return {
      self: buildLink(page),
      first: page !== 1 ? buildLink(1) : undefined,
      prev: page > 1 ? buildLink(page - 1) : null,
      next: page < totalPages ? buildLink(page + 1) : null,
      last:
        page !== totalPages && totalPages > 0
          ? buildLink(totalPages)
          : undefined,
    };
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
