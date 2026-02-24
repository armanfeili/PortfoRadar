import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { CompaniesRepository, UpsertCompanyDto } from './companies.repository';
import { Company } from './schemas/company.schema';

const mockUpsertDto: UpsertCompanyDto = {
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

function createFindOneChain(result: unknown) {
  const execPromise = Promise.resolve(result);
  const chain: Record<string, unknown> = {};
  chain.select = jest.fn().mockReturnValue(chain);
  chain.lean = jest.fn().mockReturnValue(chain);
  chain.exec = jest.fn().mockResolvedValue(result);
  chain.then = execPromise.then.bind(execPromise);
  return chain;
}

describe('CompaniesRepository', () => {
  let repository: CompaniesRepository;
  let mockFindOne: jest.Mock;
  let mockUpdateOne: jest.Mock;
  let mockCreate: jest.Mock;
  let mockBulkWrite: jest.Mock;
  let mockFind: jest.Mock;
  let mockCountDocuments: jest.Mock;
  let mockAggregate: jest.Mock;
  let mockFindOneAndUpdate: jest.Mock;
  let mockDeleteMany: jest.Mock;

  beforeEach(async () => {
    mockFindOne = jest.fn().mockImplementation(() => createFindOneChain(null));

    mockUpdateOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    });

    mockCreate = jest.fn().mockResolvedValue({});

    mockBulkWrite = jest.fn().mockResolvedValue({
      upsertedCount: 2,
      modifiedCount: 1,
    });

    const mockFindChain = {
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };
    mockFind = jest.fn().mockReturnValue(mockFindChain);

    mockCountDocuments = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(0),
    });

    mockAggregate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([]),
    });

    mockFindOneAndUpdate = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(null),
    });

    mockDeleteMany = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    });

    const MockCompanyModel = {
      findOne: mockFindOne,
      updateOne: mockUpdateOne,
      create: mockCreate,
      bulkWrite: mockBulkWrite,
      find: mockFind,
      countDocuments: mockCountDocuments,
      aggregate: mockAggregate,
      findOneAndUpdate: mockFindOneAndUpdate,
      deleteMany: mockDeleteMany,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesRepository,
        {
          provide: getModelToken(Company.name),
          useValue: MockCompanyModel,
        },
      ],
    }).compile();

    repository = module.get<CompaniesRepository>(CompaniesRepository);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('upsertCompany', () => {
    it('should create new company when not found', async () => {
      mockFindOne.mockImplementation(() => createFindOneChain(null));

      const result = await repository.upsertCompany(mockUpsertDto);

      expect(result).toEqual({
        companyId: 'abc123def456',
        created: true,
        updated: false,
      });
      expect(mockCreate).toHaveBeenCalledWith(mockUpsertDto);
      expect(mockUpdateOne).not.toHaveBeenCalled();
    });

    it('should update existing company when contentHash differs', async () => {
      const existingDoc = {
        companyId: 'abc123def456',
        contentHash: 'old-hash',
      };
      mockFindOne.mockImplementation(() => createFindOneChain(existingDoc));

      const result = await repository.upsertCompany({
        ...mockUpsertDto,
        contentHash: 'new-hash',
      });

      expect(result).toEqual({
        companyId: 'abc123def456',
        created: false,
        updated: true,
      });
      expect(mockUpdateOne).toHaveBeenCalledWith(
        { companyId: 'abc123def456' },
        expect.objectContaining({ contentHash: 'new-hash' }),
      );
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should skip update when contentHash unchanged', async () => {
      const existingDoc = {
        companyId: 'abc123def456',
        contentHash: 'same-hash',
      };
      mockFindOne.mockImplementation(() => createFindOneChain(existingDoc));

      const result = await repository.upsertCompany({
        ...mockUpsertDto,
        contentHash: 'same-hash',
      });

      expect(result).toEqual({
        companyId: 'abc123def456',
        created: false,
        updated: false,
      });
      expect(mockUpdateOne).not.toHaveBeenCalled();
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  describe('bulkUpsert', () => {
    it('should return created and updated counts', async () => {
      mockBulkWrite.mockResolvedValue({
        upsertedCount: 2,
        modifiedCount: 3,
      });

      const result = await repository.bulkUpsert([
        mockUpsertDto,
        { ...mockUpsertDto, companyId: 'def456' },
        { ...mockUpsertDto, companyId: 'ghi789' },
      ]);

      expect(result).toEqual({ created: 2, updated: 3 });
      expect(mockBulkWrite).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            updateOne: expect.objectContaining({
              filter: { companyId: 'abc123def456' },
              update: expect.objectContaining({ $set: mockUpsertDto }),
              upsert: true,
            }),
          }),
        ]),
      );
    });

    it('should return zeros for empty array', async () => {
      const result = await repository.bulkUpsert([]);

      expect(result).toEqual({ created: 0, updated: 0 });
      expect(mockBulkWrite).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated results with filters', async () => {
      const mockItems = [{ ...mockUpsertDto }];
      const findChain = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockItems),
      };
      mockFind.mockReturnValue(findChain);
      mockCountDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      const result = await repository.findAll(
        { assetClass: 'Private Equity', industry: 'Technology' },
        { page: 1, limit: 20 },
      );

      expect(result.items).toEqual(mockItems);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
      expect(mockFind).toHaveBeenCalledWith({
        assetClasses: 'Private Equity',
        industry: 'Technology',
      });
      expect(findChain.select).toHaveBeenCalledWith('-_id -__v');
      expect(findChain.sort).toHaveBeenCalledWith({ nameSort: 1 });
      expect(findChain.skip).toHaveBeenCalledWith(0);
      expect(findChain.limit).toHaveBeenCalledWith(20);
    });

    it('should escape regex for search filter', async () => {
      const findChain = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockFind.mockReturnValue(findChain);
      mockCountDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      await repository.findAll(
        { search: 'test.[a-z]' },
        { page: 1, limit: 20 },
      );

      expect(mockFind).toHaveBeenCalledWith({
        name: { $regex: 'test\\.\\[a-z\\]', $options: 'i' },
      });
    });

    it('should use default pagination when not provided', async () => {
      const findChain = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockFind.mockReturnValue(findChain);
      mockCountDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      await repository.findAll({}, {});

      expect(findChain.skip).toHaveBeenCalledWith(0);
      expect(findChain.limit).toHaveBeenCalledWith(20);
      expect(findChain.sort).toHaveBeenCalledWith({ nameSort: 1 });
    });

    it('should support descending sort', async () => {
      const findChain = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockFind.mockReturnValue(findChain);
      mockCountDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      await repository.findAll(
        {},
        { page: 1, limit: 20, sortBy: 'nameSort', sortOrder: 'desc' },
      );

      expect(findChain.sort).toHaveBeenCalledWith({ nameSort: -1 });
    });
  });

  describe('findByCompanyId', () => {
    it('should return company when found', async () => {
      const mockCompany = { ...mockUpsertDto };
      mockFindOne.mockImplementation(() => createFindOneChain(mockCompany));

      const result = await repository.findByCompanyId('abc123def456');

      expect(result).toEqual(mockCompany);
      expect(mockFindOne).toHaveBeenCalledWith({ companyId: 'abc123def456' });
    });

    it('should return null when not found', async () => {
      mockFindOne.mockImplementation(() => createFindOneChain(null));

      const result = await repository.findByCompanyId('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('countByField', () => {
    it('should return counts for industry field', async () => {
      mockAggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          { _id: 'Technology', count: 45 },
          { _id: 'Financials', count: 17 },
        ]),
      });

      const result = await repository.countByField('industry');

      expect(result).toEqual({ Technology: 45, Financials: 17 });
      expect(mockAggregate).toHaveBeenCalledWith([
        { $group: { _id: '$industry', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);
    });

    it('should use unwind for assetClasses array', async () => {
      mockAggregate.mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue([{ _id: 'Private Equity', count: 148 }]),
      });

      await repository.countByField('assetClasses');

      expect(mockAggregate).toHaveBeenCalledWith([
        { $unwind: '$assetClasses' },
        { $group: { _id: '$assetClasses', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);
    });

    it('should filter out null/undefined _id', async () => {
      mockAggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          { _id: 'Americas', count: 1 },
          { _id: null, count: 2 },
        ]),
      });

      const result = await repository.countByField('region');

      expect(result).toEqual({ Americas: 1 });
    });
  });

  describe('countAll', () => {
    it('should return total document count', async () => {
      mockCountDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(296),
      });

      const result = await repository.countAll();

      expect(result).toBe(296);
      expect(mockCountDocuments).toHaveBeenCalledWith();
    });
  });

  describe('updateByCompanyId', () => {
    it('should return updated company when found', async () => {
      const updatedCompany = { ...mockUpsertDto, name: 'Updated Corp' };
      mockFindOneAndUpdate.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(updatedCompany),
      });

      const result = await repository.updateByCompanyId('abc123def456', {
        name: 'Updated Corp',
      });

      expect(result).toEqual(updatedCompany);
      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        { companyId: 'abc123def456' },
        expect.objectContaining({
          $set: expect.objectContaining({
            name: 'Updated Corp',
            nameSort: 'updated corp',
          }),
        }),
        expect.objectContaining({ new: true, runValidators: true }),
      );
    });

    it('should update nameSort when name changes', async () => {
      mockFindOneAndUpdate.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({}),
      });

      await repository.updateByCompanyId('abc123def456', {
        name: 'ACME CORP',
      });

      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          $set: expect.objectContaining({
            nameSort: 'acme corp',
          }),
        }),
        expect.any(Object),
      );
    });

    it('should return null when company not found', async () => {
      mockFindOneAndUpdate.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await repository.updateByCompanyId('nonexistent', {
        industry: 'Tech',
      });

      expect(result).toBeNull();
    });
  });

  describe('deleteAll', () => {
    it('should return deleted count', async () => {
      mockDeleteMany.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 296 }),
      });

      const result = await repository.deleteAll();

      expect(result).toBe(296);
      expect(mockDeleteMany).toHaveBeenCalledWith({});
    });

    it('should return 0 when no documents', async () => {
      mockDeleteMany.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      });

      const result = await repository.deleteAll();

      expect(result).toBe(0);
    });
  });
});
