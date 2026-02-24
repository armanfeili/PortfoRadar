import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { IngestionRunRepository } from './ingestion-run.repository';
import { IngestionRun } from './schemas/ingestion-run.schema';

describe('IngestionRunRepository', () => {
  let repository: IngestionRunRepository;
  let mockUpdateOne: jest.Mock;
  let mockFindOne: jest.Mock;
  let mockSave: jest.Mock;

  const mockSavedRun = {
    runId: 'run-uuid-123',
    startedAt: new Date(),
    status: 'running',
    counts: { fetched: 0, created: 0, updated: 0, failed: 0 },
    errorMessages: [] as string[],
    sourceMeta: {
      listUrl: 'https://www.kkr.com/invest/portfolio',
      endpointUsed: 'https://api.kkr.com/portfolio',
      totalFromSource: 0,
      pagesFromSource: 0,
    },
  };

  beforeEach(async () => {
    mockSave = jest.fn().mockResolvedValue(mockSavedRun);
    mockUpdateOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    });
    mockFindOne = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(null),
    });

    const MockRunModel = function () {
      return { save: mockSave };
    };
    Object.assign(MockRunModel, {
      updateOne: mockUpdateOne,
      findOne: mockFindOne,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestionRunRepository,
        {
          provide: getModelToken(IngestionRun.name),
          useValue: MockRunModel,
        },
      ],
    }).compile();

    repository = module.get<IngestionRunRepository>(IngestionRunRepository);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create an ingestion run with correct initial state', async () => {
      const result = await repository.create({
        listUrl: 'https://www.kkr.com/invest/portfolio',
        endpointUsed: 'https://api.kkr.com/portfolio',
      });

      expect(result.runId).toBeDefined();
      expect(result.status).toBe('running');
      expect(result.counts).toEqual({
        fetched: 0,
        created: 0,
        updated: 0,
        failed: 0,
      });
      expect(result.sourceMeta?.listUrl).toBe(
        'https://www.kkr.com/invest/portfolio',
      );
      expect(result.sourceMeta?.endpointUsed).toBe(
        'https://api.kkr.com/portfolio',
      );
      expect(mockSave).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update run with status and counts', async () => {
      await repository.update('run-123', {
        status: 'completed',
        finishedAt: new Date(),
        counts: { fetched: 10, created: 5, updated: 5, failed: 0 },
        sourceMeta: {
          totalFromSource: 10,
          pagesFromSource: 1,
        },
      });

      expect(mockUpdateOne).toHaveBeenCalledWith(
        { runId: 'run-123' },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'completed',
            'counts.fetched': 10,
            'counts.created': 5,
            'counts.updated': 5,
            'counts.failed': 0,
            'sourceMeta.totalFromSource': 10,
            'sourceMeta.pagesFromSource': 1,
          }),
        }),
      );
    });
  });

  describe('addError', () => {
    it('should push error message to run', async () => {
      await repository.addError('run-123', 'Company X: validation failed');

      expect(mockUpdateOne).toHaveBeenCalledWith(
        { runId: 'run-123' },
        expect.objectContaining({
          $push: {
            errorMessages: {
              $each: ['Company X: validation failed'],
              $slice: -10,
            },
          },
        }),
      );
    });
  });

  describe('findLatest', () => {
    it('should return most recent run', async () => {
      const mockRun = {
        runId: 'run-latest',
        status: 'completed',
        startedAt: new Date(),
      };

      const chain = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockRun),
      };
      mockFindOne.mockReturnValue(chain);

      const result = await repository.findLatest();

      expect(result).toEqual(mockRun);
      expect(mockFindOne).toHaveBeenCalledWith();
      expect(chain.sort).toHaveBeenCalledWith({ startedAt: -1 });
    });

    it('should return null when no runs exist', async () => {
      const chain = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      };
      mockFindOne.mockReturnValue(chain);

      const result = await repository.findLatest();

      expect(result).toBeNull();
    });
  });

  describe('findByRunId', () => {
    it('should return run by runId', async () => {
      const mockRun = {
        runId: 'run-456',
        status: 'completed',
      };

      const chain = {
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockRun),
      };
      mockFindOne.mockReturnValue(chain);

      const result = await repository.findByRunId('run-456');

      expect(result).toEqual(mockRun);
      expect(mockFindOne).toHaveBeenCalledWith({ runId: 'run-456' });
    });

    it('should return null when run not found', async () => {
      const chain = {
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      };
      mockFindOne.mockReturnValue(chain);

      const result = await repository.findByRunId('nonexistent');

      expect(result).toBeNull();
    });
  });
});
