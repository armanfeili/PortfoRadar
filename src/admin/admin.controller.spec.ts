import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { PortfolioIngestService } from '../ingestion/portfolio-ingest.service';
import { AdminKeyService } from './admin-key.service';
import { CompaniesRepository } from '../companies/companies.repository';

describe('AdminController', () => {
  let controller: AdminController;
  let ingestService: jest.Mocked<PortfolioIngestService>;
  let adminKeyService: jest.Mocked<AdminKeyService>;
  let companiesRepository: jest.Mocked<CompaniesRepository>;

  const mockKeyResponse = {
    keyId: '507f1f77bcf86cd799439011',
    token: 'ak_a1b2c3d4e5f6',
    expiresAt: new Date('2026-02-25T12:00:00.000Z'),
    ttlMinutes: 30,
  };

  const mockCompany = {
    companyId: 'abc123def456',
    name: 'Acme Corp',
    nameSort: 'acme corp',
    assetClassRaw: 'Private Equity',
    assetClasses: ['Private Equity'],
    industry: 'Technology',
    region: 'Americas',
    source: {
      listUrl: 'https://www.kkr.com/invest/portfolio',
      endpoint: 'https://api.kkr.com/portfolio',
      fetchedAt: new Date(),
    },
  };

  const mockIngestionResult = {
    runId: 'run-123',
    status: 'completed' as const,
    counts: { fetched: 100, created: 50, updated: 50, failed: 0 },
    sourceMeta: {
      totalFromSource: 100,
      pagesFromSource: 7,
      accumulationAttempts: 1,
    },
    durationMs: 5000,
    uniqueThisRun: 100,
    isComplete: true,
  };

  beforeEach(async () => {
    const mockIngestService = {
      ingestAll: jest.fn(),
    };

    const mockAdminKeyService = {
      generateKey: jest.fn(),
      revokeKey: jest.fn(),
    };

    const mockCompaniesRepo = {
      deleteAll: jest.fn(),
      updateByCompanyId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: PortfolioIngestService, useValue: mockIngestService },
        { provide: AdminKeyService, useValue: mockAdminKeyService },
        { provide: CompaniesRepository, useValue: mockCompaniesRepo },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    ingestService = module.get(PortfolioIngestService);
    adminKeyService = module.get(AdminKeyService);
    companiesRepository = module.get(CompaniesRepository);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('generateKey', () => {
    it('should return admin key when generated', async () => {
      adminKeyService.generateKey.mockResolvedValue(mockKeyResponse);

      const result = await controller.generateKey({});

      expect(result).toEqual(mockKeyResponse);
      expect(adminKeyService.generateKey).toHaveBeenCalledWith(30);
    });

    it('should pass ttlMinutes from DTO to service', async () => {
      adminKeyService.generateKey.mockResolvedValue(mockKeyResponse);

      await controller.generateKey({ ttlMinutes: 60 });

      expect(adminKeyService.generateKey).toHaveBeenCalledWith(60);
    });

    it('should use default TTL of 30 when DTO is empty', async () => {
      adminKeyService.generateKey.mockResolvedValue(mockKeyResponse);

      await controller.generateKey({});

      expect(adminKeyService.generateKey).toHaveBeenCalledWith(30);
    });

    it('should use default TTL when DTO has undefined ttlMinutes', async () => {
      adminKeyService.generateKey.mockResolvedValue(mockKeyResponse);

      await controller.generateKey({ ttlMinutes: undefined } as any);

      expect(adminKeyService.generateKey).toHaveBeenCalledWith(30);
    });
  });

  describe('revokeKey', () => {
    it('should return revoked true when key is revoked', async () => {
      adminKeyService.revokeKey.mockResolvedValue(true);

      const result = await controller.revokeKey('507f1f77bcf86cd799439011');

      expect(result).toEqual({ revoked: true });
      expect(adminKeyService.revokeKey).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
    });

    it('should return revoked false when key not found', async () => {
      adminKeyService.revokeKey.mockResolvedValue(false);

      const result = await controller.revokeKey('nonexistent-id');

      expect(result).toEqual({ revoked: false });
    });
  });

  describe('triggerIngestion', () => {
    it('should return ingestion result', async () => {
      ingestService.ingestAll.mockResolvedValue(mockIngestionResult);

      const result = await controller.triggerIngestion();

      expect(result).toEqual(mockIngestionResult);
      expect(ingestService.ingestAll).toHaveBeenCalledTimes(1);
    });

    it('should return failed result when ingestion fails', async () => {
      const failedResult = {
        ...mockIngestionResult,
        status: 'failed' as const,
        counts: { ...mockIngestionResult.counts, failed: 5 },
      };
      ingestService.ingestAll.mockResolvedValue(failedResult);

      const result = await controller.triggerIngestion();

      expect(result.status).toBe('failed');
      expect(result.counts.failed).toBe(5);
    });
  });

  describe('deleteAllCompanies', () => {
    it('should return deleted count and message', async () => {
      companiesRepository.deleteAll.mockResolvedValue(296);

      const result = await controller.deleteAllCompanies();

      expect(result).toEqual({
        deleted: 296,
        message: 'Successfully deleted 296 companies',
      });
      expect(companiesRepository.deleteAll).toHaveBeenCalledTimes(1);
    });

    it('should return 0 when no companies exist', async () => {
      companiesRepository.deleteAll.mockResolvedValue(0);

      const result = await controller.deleteAllCompanies();

      expect(result.deleted).toBe(0);
      expect(result.message).toContain('0');
    });
  });

  describe('updateCompany', () => {
    it('should return updated company when found', async () => {
      const updatedCompany = { ...mockCompany, name: 'Updated Corp' };
      companiesRepository.updateByCompanyId.mockResolvedValue(
        updatedCompany as any,
      );

      const result = await controller.updateCompany('abc123def456', {
        name: 'Updated Corp',
      });

      expect(result.name).toBe('Updated Corp');
      expect(companiesRepository.updateByCompanyId).toHaveBeenCalledWith(
        'abc123def456',
        { name: 'Updated Corp' },
      );
    });

    it('should throw NotFoundException when company not found', async () => {
      companiesRepository.updateByCompanyId.mockResolvedValue(null);

      await expect(
        controller.updateCompany('nonexistent', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);

      await expect(
        controller.updateCompany('nonexistent', { name: 'New Name' }),
      ).rejects.toThrow("Company with id 'nonexistent' not found");
    });

    it('should pass partial update DTO to repository', async () => {
      companiesRepository.updateByCompanyId.mockResolvedValue(
        mockCompany as any,
      );

      const updates = {
        industry: 'Financials',
        region: 'Europe',
      };

      await controller.updateCompany('abc123def456', updates);

      expect(companiesRepository.updateByCompanyId).toHaveBeenCalledWith(
        'abc123def456',
        updates,
      );
    });
  });
});
