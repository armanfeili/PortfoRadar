import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { createHash } from 'crypto';
import { AdminKeyService } from './admin-key.service';
import { AdminKey } from './schemas/admin-key.schema';

describe('AdminKeyService', () => {
  let service: AdminKeyService;

  const mockAdminKeyModel = {
    create: jest.fn(),
    findOne: jest.fn(),
    updateOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminKeyService,
        {
          provide: getModelToken(AdminKey.name),
          useValue: mockAdminKeyModel,
        },
      ],
    }).compile();

    service = module.get<AdminKeyService>(AdminKeyService);

    jest.clearAllMocks();
  });

  describe('generateKey', () => {
    it('should generate a key with ak_ prefix', async () => {
      const mockCreatedKey = {
        _id: 'test-key-id',
        tokenHash: 'hashed-token',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      };

      mockAdminKeyModel.create.mockResolvedValue(mockCreatedKey);

      const result = await service.generateKey(30);

      expect(result.token).toMatch(/^ak_[a-f0-9]{64}$/);
      expect(result.keyId).toBe('test-key-id');
      expect(result.ttlMinutes).toBe(30);
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should store hashed token, not plain token', async () => {
      const mockCreatedKey = {
        _id: 'test-key-id',
        tokenHash: 'will-be-replaced',
        expiresAt: new Date(),
      };

      mockAdminKeyModel.create.mockResolvedValue(mockCreatedKey);

      const result = await service.generateKey(30);

      // Verify the create was called with a hash, not plain token
      const createCall = mockAdminKeyModel.create.mock.calls[0][0];
      expect(createCall.tokenHash).not.toBe(result.token);
      expect(createCall.tokenHash).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex

      // Verify hash matches
      const expectedHash = createHash('sha256')
        .update(result.token)
        .digest('hex');
      expect(createCall.tokenHash).toBe(expectedHash);
    });

    it('should set expiresAt based on TTL', async () => {
      const mockCreatedKey = {
        _id: 'test-key-id',
        tokenHash: 'hashed',
        expiresAt: new Date(),
      };

      mockAdminKeyModel.create.mockResolvedValue(mockCreatedKey);

      const beforeCall = Date.now();
      await service.generateKey(60); // 60 minutes
      const afterCall = Date.now();

      const createCall = mockAdminKeyModel.create.mock.calls[0][0] as {
        expiresAt: Date;
      };

      // Verify expiresAt is ~60 minutes from now (within 1 second tolerance)
      const expectedMin = beforeCall + 60 * 60 * 1000;
      const expectedMax = afterCall + 60 * 60 * 1000;
      expect(createCall.expiresAt.getTime()).toBeGreaterThanOrEqual(
        expectedMin,
      );
      expect(createCall.expiresAt.getTime()).toBeLessThanOrEqual(expectedMax);
    });
  });

  describe('validateKey', () => {
    it('should return false for non-ak_ prefixed tokens', async () => {
      const result = await service.validateKey('not-a-temp-key');
      expect(result).toBe(false);
      expect(mockAdminKeyModel.findOne).not.toHaveBeenCalled();
    });

    it('should return true for valid unexpired key', async () => {
      const token = 'ak_' + 'a'.repeat(64);
      const tokenHash = createHash('sha256').update(token).digest('hex');

      mockAdminKeyModel.findOne.mockResolvedValue({
        _id: 'key-id',
        tokenHash,
        expiresAt: new Date(Date.now() + 10000),
        revokedAt: null,
      });

      mockAdminKeyModel.updateOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      });

      const result = await service.validateKey(token);
      expect(result).toBe(true);
    });

    it('should return false for expired key', async () => {
      const token = 'ak_' + 'b'.repeat(64);

      mockAdminKeyModel.findOne.mockResolvedValue(null); // Query filters out expired

      const result = await service.validateKey(token);
      expect(result).toBe(false);
    });

    it('should return false for revoked key', async () => {
      const token = 'ak_' + 'c'.repeat(64);

      mockAdminKeyModel.findOne.mockResolvedValue(null); // Query filters out revoked

      const result = await service.validateKey(token);
      expect(result).toBe(false);
    });
  });

  describe('revokeKey', () => {
    it('should return true when key is revoked', async () => {
      mockAdminKeyModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await service.revokeKey('key-id');
      expect(result).toBe(true);
    });

    it('should return false when key not found', async () => {
      mockAdminKeyModel.updateOne.mockResolvedValue({ modifiedCount: 0 });

      const result = await service.revokeKey('nonexistent-id');
      expect(result).toBe(false);
    });
  });
});
