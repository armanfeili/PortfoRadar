import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ScheduledIngestionService } from './scheduled-ingestion.service';
import { PortfolioIngestService } from './portfolio-ingest.service';

const mockSchedulerRegistry = {
  addCronJob: jest.fn(),
  getCronJob: jest.fn(),
  deleteCronJob: jest.fn(),
};

const mockIngestService = {
  ingestAll: jest.fn(),
};

describe('ScheduledIngestionService', () => {
  let service: ScheduledIngestionService;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduledIngestionService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: SchedulerRegistry, useValue: mockSchedulerRegistry },
        { provide: PortfolioIngestService, useValue: mockIngestService },
      ],
    }).compile();

    service = module.get<ScheduledIngestionService>(ScheduledIngestionService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should register cron job when ENABLE_SCHEDULED_INGEST is true', async () => {
      const mockConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'ENABLE_SCHEDULED_INGEST') return true;
          if (key === 'INGEST_CRON') return '0 3 * * *';
          return undefined;
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          ScheduledIngestionService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: SchedulerRegistry, useValue: mockSchedulerRegistry },
          { provide: PortfolioIngestService, useValue: mockIngestService },
        ],
      }).compile();

      const svc = module.get<ScheduledIngestionService>(
        ScheduledIngestionService,
      );
      svc.onModuleInit();

      expect(mockSchedulerRegistry.addCronJob).toHaveBeenCalledWith(
        'scheduled-ingest',
        expect.any(Object),
      );
    });

    it('should NOT register cron job when ENABLE_SCHEDULED_INGEST is false', async () => {
      const mockConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'ENABLE_SCHEDULED_INGEST') return false;
          return undefined;
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          ScheduledIngestionService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: SchedulerRegistry, useValue: mockSchedulerRegistry },
          { provide: PortfolioIngestService, useValue: mockIngestService },
        ],
      }).compile();

      const svc = module.get<ScheduledIngestionService>(
        ScheduledIngestionService,
      );
      svc.onModuleInit();

      expect(mockSchedulerRegistry.addCronJob).not.toHaveBeenCalled();
    });

    it('should use INGEST_CRON from config', async () => {
      const mockConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'ENABLE_SCHEDULED_INGEST') return true;
          if (key === 'INGEST_CRON') return '0 */6 * * *';
          return undefined;
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          ScheduledIngestionService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: SchedulerRegistry, useValue: mockSchedulerRegistry },
          { provide: PortfolioIngestService, useValue: mockIngestService },
        ],
      }).compile();

      const svc = module.get<ScheduledIngestionService>(
        ScheduledIngestionService,
      );
      svc.onModuleInit();

      expect(mockSchedulerRegistry.addCronJob).toHaveBeenCalled();
    });
  });

  describe('handleScheduledIngest', () => {
    it('should call ingestService.ingestAll when scheduled', async () => {
      const mockResult = {
        runId: 'run-123',
        status: 'completed' as const,
        counts: { fetched: 10, created: 5, updated: 5, failed: 0 },
        sourceMeta: {
          totalFromSource: 10,
          pagesFromSource: 1,
          accumulationAttempts: 1,
        },
        durationMs: 1000,
        uniqueThisRun: 10,
        isComplete: true,
      };

      mockIngestService.ingestAll.mockResolvedValue(mockResult);

      await service.handleScheduledIngest();

      expect(mockIngestService.ingestAll).toHaveBeenCalledTimes(1);
    });

    it('should not throw when ingest fails', async () => {
      mockIngestService.ingestAll.mockRejectedValue(
        new Error('Ingestion failed'),
      );

      await expect(service.handleScheduledIngest()).resolves.not.toThrow();
    });
  });
});
