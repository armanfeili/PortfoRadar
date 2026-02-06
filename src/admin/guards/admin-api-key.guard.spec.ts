import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AdminApiKeyGuard } from './admin-api-key.guard';
import { AdminKeyService } from '../admin-key.service';

describe('AdminApiKeyGuard', () => {
  let guard: AdminApiKeyGuard;
  let adminKeyService: jest.Mocked<AdminKeyService>;

  const mockAdminKeyService = {
    validateKey: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminApiKeyGuard,
        {
          provide: AdminKeyService,
          useValue: mockAdminKeyService,
        },
      ],
    }).compile();

    guard = module.get<AdminApiKeyGuard>(AdminApiKeyGuard);
    adminKeyService = module.get(AdminKeyService);

    jest.clearAllMocks();
  });

  function createMockContext(
    headers: Record<string, string>,
  ): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers,
        }),
      }),
    } as ExecutionContext;
  }

  describe('canActivate', () => {
    it('should throw UnauthorizedException when X-Admin-Key header is missing', async () => {
      const context = createMockContext({});

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Missing X-Admin-Key header',
      );
      expect(adminKeyService.validateKey).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid key', async () => {
      const context = createMockContext({ 'x-admin-key': 'invalid-key' });
      mockAdminKeyService.validateKey.mockResolvedValue(false);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Invalid or expired admin key',
      );
    });

    it('should throw UnauthorizedException for expired key', async () => {
      const context = createMockContext({ 'x-admin-key': 'ak_expired123' });
      mockAdminKeyService.validateKey.mockResolvedValue(false);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return true for valid temporary key', async () => {
      const context = createMockContext({ 'x-admin-key': 'ak_valid123' });
      mockAdminKeyService.validateKey.mockResolvedValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(adminKeyService.validateKey).toHaveBeenCalledWith('ak_valid123');
    });

    it('should validate key passed in header (case-insensitive header name)', async () => {
      const context = createMockContext({ 'x-admin-key': 'ak_testkey456' });
      mockAdminKeyService.validateKey.mockResolvedValue(true);

      await guard.canActivate(context);

      expect(adminKeyService.validateKey).toHaveBeenCalledWith('ak_testkey456');
    });
  });
});
