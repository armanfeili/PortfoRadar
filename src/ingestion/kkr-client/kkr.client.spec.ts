import { Test, TestingModule } from '@nestjs/testing';
import { request } from 'undici';
import { KkrClient } from './kkr.client';
import { KkrRawCompany } from './kkr-api.types';

jest.mock('undici', () => ({
  request: jest.fn(),
  Agent: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('p-retry', () => {
  const mockRetry = (input: () => unknown) => input();
  return { __esModule: true, default: mockRetry };
});

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
  description: '<p>Test</p>',
};

const createMockApiResponse = (
  overrides: Partial<{
    hits: number;
    pages: number;
    results: KkrRawCompany[];
    success: boolean;
  }> = {},
) => ({
  success: true,
  message: 'OK',
  hits: 1,
  resultsText: '1 result',
  pages: 1,
  startNumber: 1,
  endNumber: 1,
  results: [mockRawCompany],
  ...overrides,
});

describe('KkrClient', () => {
  let client: KkrClient;
  const mockRequest = request as jest.MockedFunction<typeof request>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KkrClient],
    }).compile();

    client = module.get<KkrClient>(KkrClient);

    jest.clearAllMocks();
  });

  describe('getEndpointUrl', () => {
    it('should return the KKR API endpoint URL', () => {
      const url = client.getEndpointUrl();

      expect(url).toContain('kkr.com');
      expect(url).toContain('bioportfoliosearch');
      expect(url).toContain('.json');
    });
  });

  describe('fetchPage', () => {
    it('should fetch a single page and return companies', async () => {
      const mockBody = {
        text: jest
          .fn()
          .mockResolvedValue(JSON.stringify(createMockApiResponse())),
      };

      mockRequest.mockResolvedValue({
        statusCode: 200,
        body: mockBody,
      } as never);

      const result = await client.fetchPage(1);

      expect(result.companies).toHaveLength(1);
      expect(result.companies[0].name).toBe('Acme Corp');
      expect(result.pagination.totalHits).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
      expect(result.pagination.currentPage).toBe(1);
      expect(result.pagination.resultsOnPage).toBe(1);
    });

    it('should throw when API returns success=false', async () => {
      const mockBody = {
        text: jest.fn().mockResolvedValue(
          JSON.stringify({
            ...createMockApiResponse(),
            success: false,
            message: 'API error',
          }),
        ),
      };

      mockRequest.mockResolvedValue({
        statusCode: 200,
        body: mockBody,
      } as never);

      await expect(client.fetchPage(1)).rejects.toThrow('success=false');
    });

    it('should throw when HTTP status is not 200', async () => {
      mockRequest.mockResolvedValue({
        statusCode: 500,
        body: { text: jest.fn().mockResolvedValue('') },
      } as never);

      await expect(client.fetchPage(1)).rejects.toThrow('HTTP 500');
    });

    it('should throw when results is invalid', async () => {
      const mockBody = {
        text: jest.fn().mockResolvedValue(
          JSON.stringify({
            ...createMockApiResponse(),
            results: null,
          }),
        ),
      };

      mockRequest.mockResolvedValue({
        statusCode: 200,
        body: mockBody,
      } as never);

      await expect(client.fetchPage(1)).rejects.toThrow('invalid results');
    });

    it('should include page number in request URL', async () => {
      const mockBody = {
        text: jest
          .fn()
          .mockResolvedValue(JSON.stringify(createMockApiResponse())),
      };

      mockRequest.mockResolvedValue({
        statusCode: 200,
        body: mockBody,
      } as never);

      await client.fetchPage(3);

      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining('page=3'),
        expect.any(Object),
      );
    });
  });

  describe('fetchAllPages', () => {
    it('should fetch all pages and return unique companies', async () => {
      const company1: KkrRawCompany = {
        ...mockRawCompany,
        name: 'Company A',
        hq: 'NY',
      };
      const company2: KkrRawCompany = {
        ...mockRawCompany,
        name: 'Company B',
        hq: 'CA',
      };

      mockRequest.mockImplementation((url: string) => {
        const isPage2 = url.includes('page=2');
        const results = isPage2 ? [company2] : [company1];
        const mockBody = {
          text: jest.fn().mockResolvedValue(
            JSON.stringify(
              createMockApiResponse({
                hits: 2,
                pages: 2,
                results,
              }),
            ),
          ),
        };
        return {
          statusCode: 200,
          body: mockBody,
        } as never;
      });

      const result = await client.fetchAllPages();

      expect(result.companies).toHaveLength(2);
      expect(result.totalHits).toBe(2);
      expect(result.totalPages).toBe(2);
      expect(result.accumulationAttempts).toBe(1);
    });

    it('should deduplicate by company name', async () => {
      mockRequest.mockImplementation(() => {
        const mockBody = {
          text: jest.fn().mockResolvedValue(
            JSON.stringify(
              createMockApiResponse({
                hits: 1,
                pages: 1,
                results: [mockRawCompany],
              }),
            ),
          ),
        };
        return {
          statusCode: 200,
          body: mockBody,
        } as never;
      });

      const result = await client.fetchAllPages();

      expect(result.companies).toHaveLength(1);
      expect(result.companies[0].name).toBe('Acme Corp');
    });

    it('should retry accumulation when not all companies collected', async () => {
      const company1: KkrRawCompany = {
        ...mockRawCompany,
        name: 'Company A',
        hq: 'NY',
      };
      const company2: KkrRawCompany = {
        ...mockRawCompany,
        name: 'Company B',
        hq: 'CA',
      };

      let callCount = 0;
      mockRequest.mockImplementation((url: string) => {
        callCount++;
        const isPage2 = url.includes('page=2');
        const results =
          callCount <= 2 ? [company1] : isPage2 ? [company2] : [company1];
        const mockBody = {
          text: jest.fn().mockResolvedValue(
            JSON.stringify(
              createMockApiResponse({
                hits: 2,
                pages: 2,
                results,
              }),
            ),
          ),
        };
        return {
          statusCode: 200,
          body: mockBody,
        } as never;
      });

      const result = await client.fetchAllPages();

      expect(result.companies.length).toBe(2);
      expect(result.accumulationAttempts).toBeGreaterThanOrEqual(1);
    });
  });
});
