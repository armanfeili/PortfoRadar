import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioIngestService } from './portfolio-ingest.service';
import { KkrClient, KKR_PORTFOLIO_URL } from './kkr-client/kkr.client';
import { CompaniesRepository } from '../companies/companies.repository';
import { IngestionRunRepository } from './ingestion-run.repository';
import { KkrRawCompany } from './kkr-client/kkr-api.types';

const mockRawCompany: KkrRawCompany = {
  name: 'Acme Corp',
  sortingName: 'acme corp',
  logo: '/content/dam/kkr/logo.png',
  hq: 'New York, NY',
  region: 'Americas',
  assetClass: 'Private Equity',
  industry: 'Technology',
  yoi: '2023',
  url: 'https://acme.com',
  description: '<p>Test company</p>',
};

describe('PortfolioIngestService', () => {
  let service: PortfolioIngestService;
  let kkrClient: jest.Mocked<KkrClient>;
  let companiesRepo: jest.Mocked<CompaniesRepository>;
  let runRepo: jest.Mocked<IngestionRunRepository>;

  const mockRun = {
    runId: 'run-123',
    startedAt: new Date(),
    status: 'running' as const,
    counts: { fetched: 0, created: 0, updated: 0, failed: 0 },
    errorMessages: [],
    sourceMeta: {
      listUrl: KKR_PORTFOLIO_URL,
      endpointUsed: 'https://api.kkr.com/portfolio',
      totalFromSource: 0,
      pagesFromSource: 0,
    },
  };

  beforeEach(async () => {
    const mockKkrClient = {
      fetchAllPages: jest.fn(),
      getEndpointUrl: jest
        .fn()
        .mockReturnValue('https://api.kkr.com/portfolio'),
    };

    const mockCompaniesRepo = {
      upsertCompany: jest.fn(),
    };

    const mockRunRepo = {
      create: jest.fn(),
      update: jest.fn(),
      addError: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfolioIngestService,
        { provide: KkrClient, useValue: mockKkrClient },
        { provide: CompaniesRepository, useValue: mockCompaniesRepo },
        { provide: IngestionRunRepository, useValue: mockRunRepo },
      ],
    }).compile();

    service = module.get<PortfolioIngestService>(PortfolioIngestService);
    kkrClient = module.get(KkrClient);
    companiesRepo = module.get(CompaniesRepository);
    runRepo = module.get(IngestionRunRepository);

    jest.clearAllMocks();
    mockRunRepo.create.mockResolvedValue(mockRun);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('ingestAll', () => {
    it('should complete ingestion successfully', async () => {
      kkrClient.fetchAllPages.mockResolvedValue({
        companies: [mockRawCompany],
        totalHits: 1,
        totalPages: 1,
        fetchedPages: 1,
        accumulationAttempts: 1,
      });

      companiesRepo.upsertCompany.mockResolvedValue({
        companyId: 'abc123',
        created: true,
        updated: false,
      });

      const result = await service.ingestAll();

      expect(result.status).toBe('completed');
      expect(result.runId).toBe('run-123');
      expect(result.counts.fetched).toBe(1);
      expect(result.counts.created).toBe(1);
      expect(result.counts.updated).toBe(0);
      expect(result.counts.failed).toBe(0);
      expect(result.uniqueThisRun).toBe(1);
      expect(result.isComplete).toBe(true);

      expect(runRepo.create).toHaveBeenCalledWith({
        listUrl: KKR_PORTFOLIO_URL,
        endpointUsed: 'https://api.kkr.com/portfolio',
      });
      expect(runRepo.update).toHaveBeenCalledWith(
        'run-123',
        expect.objectContaining({
          status: 'completed',
          counts: expect.objectContaining({
            fetched: 1,
            created: 1,
            updated: 0,
            failed: 0,
          }),
        }),
      );
    });

    it('should count created vs updated for upserts', async () => {
      const raw1: KkrRawCompany = {
        ...mockRawCompany,
        name: 'Company A',
        hq: 'NY, USA',
      };
      const raw2: KkrRawCompany = {
        ...mockRawCompany,
        name: 'Company B',
        hq: 'CA, USA',
      };

      kkrClient.fetchAllPages.mockResolvedValue({
        companies: [raw1, raw2],
        totalHits: 2,
        totalPages: 1,
        fetchedPages: 1,
        accumulationAttempts: 1,
      });

      companiesRepo.upsertCompany
        .mockResolvedValueOnce({
          companyId: 'a',
          created: true,
          updated: false,
        })
        .mockResolvedValueOnce({
          companyId: 'b',
          created: false,
          updated: true,
        });

      const result = await service.ingestAll();

      expect(result.counts.created).toBe(1);
      expect(result.counts.updated).toBe(1);
      expect(result.counts.failed).toBe(0);
    });

    it('should record failed upserts and continue', async () => {
      kkrClient.fetchAllPages.mockResolvedValue({
        companies: [mockRawCompany],
        totalHits: 1,
        totalPages: 1,
        fetchedPages: 1,
        accumulationAttempts: 1,
      });

      companiesRepo.upsertCompany.mockRejectedValue(new Error('DB error'));

      const result = await service.ingestAll();

      expect(result.status).toBe('completed');
      expect(result.counts.fetched).toBe(1);
      expect(result.counts.failed).toBe(1);
      expect(runRepo.addError).toHaveBeenCalledWith(
        'run-123',
        expect.stringContaining('Acme Corp'),
      );
    });

    it('should mark run as failed on fatal fetch error', async () => {
      kkrClient.fetchAllPages.mockRejectedValue(new Error('Network error'));

      const result = await service.ingestAll();

      expect(result.status).toBe('failed');
      expect(result.counts.fetched).toBe(0);
      expect(result.isComplete).toBe(false);

      expect(runRepo.update).toHaveBeenCalledWith(
        'run-123',
        expect.objectContaining({
          status: 'failed',
        }),
      );
      expect(runRepo.addError).toHaveBeenCalledWith(
        'run-123',
        expect.stringContaining('Fatal'),
      );
    });

    it('should skip unchanged companies (upsert returns created: false, updated: false)', async () => {
      kkrClient.fetchAllPages.mockResolvedValue({
        companies: [mockRawCompany],
        totalHits: 1,
        totalPages: 1,
        fetchedPages: 1,
        accumulationAttempts: 1,
      });

      companiesRepo.upsertCompany.mockResolvedValue({
        companyId: 'abc123',
        created: false,
        updated: false,
      });

      const result = await service.ingestAll();

      expect(result.counts.created).toBe(0);
      expect(result.counts.updated).toBe(0);
      expect(result.counts.failed).toBe(0);
    });

    it('should deduplicate companies by companyId', async () => {
      const duplicate: KkrRawCompany = {
        ...mockRawCompany,
        name: 'Acme Corp',
        hq: 'New York, NY',
      };

      kkrClient.fetchAllPages.mockResolvedValue({
        companies: [mockRawCompany, duplicate],
        totalHits: 2,
        totalPages: 1,
        fetchedPages: 1,
        accumulationAttempts: 1,
      });

      companiesRepo.upsertCompany.mockResolvedValue({
        companyId: 'abc123',
        created: true,
        updated: false,
      });

      const result = await service.ingestAll();

      expect(result.uniqueThisRun).toBe(1);
      expect(companiesRepo.upsertCompany).toHaveBeenCalledTimes(1);
    });

    it('should report isComplete false when fetched < totalFromSource', async () => {
      kkrClient.fetchAllPages.mockResolvedValue({
        companies: [mockRawCompany],
        totalHits: 10,
        totalPages: 2,
        fetchedPages: 2,
        accumulationAttempts: 1,
      });

      companiesRepo.upsertCompany.mockResolvedValue({
        companyId: 'abc123',
        created: true,
        updated: false,
      });

      const result = await service.ingestAll();

      expect(result.isComplete).toBe(false);
      expect(result.counts.fetched).toBe(1);
      expect(result.sourceMeta.totalFromSource).toBe(10);
    });
  });
});
