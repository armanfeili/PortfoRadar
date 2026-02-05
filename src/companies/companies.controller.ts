import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { QueryCompaniesDto } from './dto/query-companies.dto';
import {
  CompanyResponseDto,
  PaginatedCompaniesResponseDto,
} from './dto/company-response.dto';
import { StatsResponseDto } from './dto/stats-response.dto';

@ApiTags('Companies')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  /**
   * List companies with optional filters and pagination.
   */
  @Get()
  @ApiOperation({
    summary: 'List companies',
    description:
      'Returns a paginated list of portfolio companies with optional filters for asset class, industry, region, and name search.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of companies',
    type: PaginatedCompaniesResponseDto,
  })
  async findAll(
    @Query() query: QueryCompaniesDto,
  ): Promise<PaginatedCompaniesResponseDto> {
    return this.companiesService.findAll(query);
  }

  /**
   * Get a single company by companyId.
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get company by ID',
    description: 'Returns a single company by its unique companyId.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique company identifier (32-character hash)',
    example: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
  })
  @ApiResponse({
    status: 200,
    description: 'Company found',
    type: CompanyResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Company not found',
  })
  async findOne(@Param('id') id: string): Promise<CompanyResponseDto> {
    const company = await this.companiesService.findByCompanyId(id);

    if (!company) {
      throw new NotFoundException(`Company with id '${id}' not found`);
    }

    // Cast to DTO (Mongoose lean() returns plain objects)
    return company as unknown as CompanyResponseDto;
  }
}

/**
 * Stats controller — separate from companies for cleaner routing.
 */
@ApiTags('Stats')
@Controller('stats')
export class StatsController {
  constructor(private readonly companiesService: CompaniesService) {}

  /**
   * Get aggregated statistics.
   */
  @Get()
  @ApiOperation({
    summary: 'Get aggregated statistics',
    description:
      'Returns total company count and distributions by asset class, industry, and region.',
  })
  @ApiResponse({
    status: 200,
    description: 'Aggregated statistics',
    type: StatsResponseDto,
  })
  async getStats(): Promise<StatsResponseDto> {
    return this.companiesService.getStats();
  }
}
