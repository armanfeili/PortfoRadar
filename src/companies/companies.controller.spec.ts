import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CompaniesController, StatsController } from './companies.controller';
import { CompaniesService } from './companies.service';

describe('CompaniesController', () => {
  let controller: CompaniesController;
  let service: jest.Mocked<CompaniesService>;

  const mockCompany = {
    companyId: 'abc123def456789012345678',
    name: 'Acme Corp',
    nameSort: 'acme corp',
    assetClassRaw: 'Private Equity',
    assetClasses: ['Private Equity'],
    industry: 'Technology',
    region: 'Americas',
    descriptionText: 'A test company',
    website: 'https://acme.com',
    headquarters: 'New York, NY',
    yearOfInvestment: '2023',
    source: {
      listUrl: 'https://www.kkr.com/businesses/kkr-portfolio',
      endpoint: 'https://www.kkr.com/content/kkr/...',
      fetchedAt: new Date('2026-02-05'),
    },
  };

  beforeEach(async () => {
    const mockService = {
      findAll: jest.fn(),
      findByCompanyId: jest.fn(),
      getStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompaniesController, StatsController],
      providers: [{ provide: CompaniesService, useValue: mockService }],
    }).compile();

    controller = module.get<CompaniesController>(CompaniesController);
    service = module.get(CompaniesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated companies', async () => {
      const paginatedResult = {
        items: [mockCompany],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
        _links: {
          self: '/companies?page=1&limit=20',
          first: '/companies?page=1&limit=20',
          last: '/companies?page=1&limit=20',
        },
      };
      service.findAll.mockResolvedValue(paginatedResult as any);

      const result = await controller.findAll({ page: 1, limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result._links).toBeDefined();
    });

    it('should pass query parameters to service', async () => {
      service.findAll.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
        _links: {
          self: '/companies?page=1&limit=20',
          first: '/companies?page=1&limit=20',
          last: '/companies?page=1&limit=20',
        },
      } as any);

      const query = {
        assetClass: 'Private Equity',
        industry: 'Technology',
        page: 2,
        limit: 10,
      };
      await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findOne', () => {
    it('should return a company with self link', async () => {
      service.findByCompanyId.mockResolvedValue(mockCompany as any);

      const result = await controller.findOne('abc123def456789012345678');

      expect(result.name).toBe('Acme Corp');
      expect(result._links.self).toBe('/companies/abc123def456789012345678');
    });

    it('should throw NotFoundException when company not found', async () => {
      service.findByCompanyId.mockResolvedValue(null);

      await expect(controller.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should include company ID in error message', async () => {
      service.findByCompanyId.mockResolvedValue(null);

      await expect(controller.findOne('xyz789')).rejects.toThrow(
        "Company with id 'xyz789' not found",
      );
    });
  });
});

describe('StatsController', () => {
  let controller: StatsController;
  let service: jest.Mocked<CompaniesService>;

  beforeEach(async () => {
    const mockService = {
      findAll: jest.fn(),
      findByCompanyId: jest.fn(),
      getStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatsController],
      providers: [{ provide: CompaniesService, useValue: mockService }],
    }).compile();

    controller = module.get<StatsController>(StatsController);
    service = module.get(CompaniesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getStats', () => {
    it('should return aggregated statistics', async () => {
      const mockStats = {
        totalCompanies: 296,
        byAssetClass: { 'Private Equity': 148 },
        byIndustry: { Technology: 45 },
        byRegion: { Americas: 123 },
      };
      service.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(result.totalCompanies).toBe(296);
      expect(result.byAssetClass).toEqual({ 'Private Equity': 148 });
    });
  });
});
