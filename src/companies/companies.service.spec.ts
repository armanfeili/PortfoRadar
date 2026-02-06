import { Test, TestingModule } from '@nestjs/testing';
import { CompaniesService } from './companies.service';
import { CompaniesRepository } from './companies.repository';
import { QueryCompaniesDto } from './dto/query-companies.dto';

describe('CompaniesService', () => {
  let service: CompaniesService;
  let repository: jest.Mocked<CompaniesRepository>;

  const mockCompany = {
    companyId: 'abc123def456',
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
    const mockRepository = {
      findAll: jest.fn(),
      findByCompanyId: jest.fn(),
      countAll: jest.fn(),
      countByField: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        { provide: CompaniesRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<CompaniesService>(CompaniesService);
    repository = module.get(CompaniesRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated companies with HATEOAS links', async () => {
      const repoResult = {
        items: [mockCompany],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      repository.findAll.mockResolvedValue(repoResult);

      const query: QueryCompaniesDto = { page: 1, limit: 20 };
      const result = await service.findAll(query);

      expect(result.items).toEqual([mockCompany]);
      expect(result.total).toBe(1);
      expect(result._links).toBeDefined();
      expect(result._links.self).toContain('/companies?');
      expect(result._links.first).toContain('page=1');
      expect(result._links.last).toContain('page=1');
      expect(result._links.next).toBeUndefined();
      expect(result._links.prev).toBeUndefined();
    });

    it('should include next link when not on last page', async () => {
      const repoResult = {
        items: [mockCompany],
        total: 50,
        page: 1,
        limit: 20,
        totalPages: 3,
      };
      repository.findAll.mockResolvedValue(repoResult);

      const query: QueryCompaniesDto = { page: 1, limit: 20 };
      const result = await service.findAll(query);

      expect(result._links.next).toContain('page=2');
      expect(result._links.prev).toBeUndefined();
    });

    it('should include prev link when not on first page', async () => {
      const repoResult = {
        items: [mockCompany],
        total: 50,
        page: 2,
        limit: 20,
        totalPages: 3,
      };
      repository.findAll.mockResolvedValue(repoResult);

      const query: QueryCompaniesDto = { page: 2, limit: 20 };
      const result = await service.findAll(query);

      expect(result._links.prev).toContain('page=1');
      expect(result._links.next).toContain('page=3');
    });

    it('should pass filters to repository', async () => {
      const repoResult = {
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };
      repository.findAll.mockResolvedValue(repoResult);

      const query: QueryCompaniesDto = {
        assetClass: 'Infrastructure',
        industry: 'Technology',
        region: 'Americas',
        q: 'acme',
        page: 1,
        limit: 10,
      };
      await service.findAll(query);

      expect(repository.findAll).toHaveBeenCalledWith(
        {
          assetClass: 'Infrastructure',
          industry: 'Technology',
          region: 'Americas',
          search: 'acme',
        },
        { page: 1, limit: 10, sortBy: 'nameSort', sortOrder: 'asc' },
      );
    });

    it('should include filter params in HATEOAS links', async () => {
      const repoResult = {
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };
      repository.findAll.mockResolvedValue(repoResult);

      const query: QueryCompaniesDto = {
        assetClass: 'Private Equity',
        q: 'tech',
        page: 1,
        limit: 20,
      };
      const result = await service.findAll(query);

      expect(result._links.self).toContain('assetClass=Private+Equity');
      expect(result._links.self).toContain('q=tech');
    });

    it('should use default page and limit when not provided', async () => {
      const repoResult = {
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };
      repository.findAll.mockResolvedValue(repoResult);

      await service.findAll({});

      expect(repository.findAll).toHaveBeenCalledWith(
        {},
        { page: 1, limit: 20, sortBy: 'nameSort', sortOrder: 'asc' },
      );
    });
  });

  describe('findByCompanyId', () => {
    it('should return company when found', async () => {
      repository.findByCompanyId.mockResolvedValue(mockCompany as any);

      const result = await service.findByCompanyId('abc123def456');

      expect(result).toEqual(mockCompany);
      expect(repository.findByCompanyId).toHaveBeenCalledWith('abc123def456');
    });

    it('should return null when company not found', async () => {
      repository.findByCompanyId.mockResolvedValue(null);

      const result = await service.findByCompanyId('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return aggregated statistics', async () => {
      repository.countAll.mockResolvedValue(296);
      repository.countByField
        .mockResolvedValueOnce({ 'Private Equity': 148, Infrastructure: 67 })
        .mockResolvedValueOnce({ Technology: 45, Financials: 17 })
        .mockResolvedValueOnce({ Americas: 123, 'Asia Pacific': 93 });

      const result = await service.getStats();

      expect(result.totalCompanies).toBe(296);
      expect(result.byAssetClass).toEqual({
        'Private Equity': 148,
        Infrastructure: 67,
      });
      expect(result.byIndustry).toEqual({ Technology: 45, Financials: 17 });
      expect(result.byRegion).toEqual({ Americas: 123, 'Asia Pacific': 93 });
    });

    it('should call countByField with correct field names', async () => {
      repository.countAll.mockResolvedValue(0);
      repository.countByField.mockResolvedValue({});

      await service.getStats();

      expect(repository.countByField).toHaveBeenCalledWith('assetClasses');
      expect(repository.countByField).toHaveBeenCalledWith('industry');
      expect(repository.countByField).toHaveBeenCalledWith('region');
    });
  });
});
