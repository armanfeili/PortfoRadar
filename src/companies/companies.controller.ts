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
import { ErrorResponseDto } from './dto/error-response.dto';

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
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid query parameters',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ErrorResponseDto,
  })
  async findAll(
    @Query() query: QueryCompaniesDto,
  ): Promise<PaginatedCompaniesResponseDto> {
    return this.companiesService.findAll(query);
  }

  /**
   * Get a single company by companyId.
   */
  @Get(':companyId')
  @ApiOperation({
    summary: 'Get company by ID',
    description: 'Returns a single company by its unique companyId.',
  })
  @ApiParam({
    name: 'companyId',
    description: 'Unique company identifier (32-character hash)',
    example: '6d33368bc3c97be82b05a93100bfdc44',
  })
  @ApiResponse({
    status: 200,
    description: 'Company found',
    type: CompanyResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid companyId format',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Company not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ErrorResponseDto,
  })
  async findOne(
    @Param('companyId') companyId: string,
  ): Promise<CompanyResponseDto> {
    const company = await this.companiesService.findByCompanyId(companyId);

    if (!company) {
      throw new NotFoundException(`Company with id '${companyId}' not found`);
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
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ErrorResponseDto,
  })
  async getStats(): Promise<StatsResponseDto> {
    return this.companiesService.getStats();
  }
}
