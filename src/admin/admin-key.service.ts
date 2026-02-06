import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createHash, randomBytes } from 'crypto';
import { AdminKey, AdminKeyDocument } from './schemas/admin-key.schema';
import { AdminKeyResponseDto } from './dto/admin-key-response.dto';

/**
 * Service for managing temporary admin API keys.
 *
 * Keys are generated as cryptographically secure random tokens.
 * Only SHA-256 hashes are stored in MongoDB (never plain tokens).
 */
@Injectable()
export class AdminKeyService {
  private readonly logger = new Logger(AdminKeyService.name);

  constructor(
    @InjectModel(AdminKey.name)
    private readonly adminKeyModel: Model<AdminKeyDocument>,
  ) {}

  /**
   * Generate a new temporary admin key.
   *
   * @param ttlMinutes - Time-to-live in minutes (default: 30)
   * @param createdBy - Optional identifier of who created the key
   * @returns Response with token (shown once) and metadata
   */
  async generateKey(
    ttlMinutes: number = 30,
    createdBy?: string,
  ): Promise<AdminKeyResponseDto> {
    // Generate cryptographically secure random token
    const tokenBytes = randomBytes(32);
    const token = `ak_${tokenBytes.toString('hex')}`;

    // Hash the token for storage (never store plain token)
    const tokenHash = this.hashToken(token);

    // Calculate expiry
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

    // Store in database
    const adminKey = await this.adminKeyModel.create({
      tokenHash,
      createdAt: now,
      expiresAt,
      createdBy: createdBy || null,
    });

    this.logger.log(
      `Generated temporary admin key: ${String(adminKey._id)} (expires: ${expiresAt.toISOString()})`,
    );

    return {
      keyId: String(adminKey._id),
      token, // Shown once only!
      expiresAt,
      ttlMinutes,
    };
  }

  /**
   * Validate a temporary admin key.
   *
   * @param token - The plain token from X-Admin-Key header
   * @returns true if valid, false otherwise
   */
  async validateKey(token: string): Promise<boolean> {
    // Must start with our prefix
    if (!token.startsWith('ak_')) {
      return false;
    }

    const tokenHash = this.hashToken(token);
    const now = new Date();

    const adminKey = await this.adminKeyModel.findOne({
      tokenHash,
      expiresAt: { $gt: now },
      revokedAt: null,
    });

    if (!adminKey) {
      return false;
    }

    // Update lastUsedAt (fire-and-forget, don't await)
    this.adminKeyModel
      .updateOne({ _id: adminKey._id }, { lastUsedAt: now })
      .exec()
      .catch((err: Error) => {
        this.logger.warn(`Failed to update lastUsedAt: ${err.message}`);
      });

    return true;
  }

  /**
   * Revoke a temporary admin key by ID.
   *
   * @param keyId - The key's MongoDB _id
   * @returns true if revoked, false if not found
   */
  async revokeKey(keyId: string): Promise<boolean> {
    const result = await this.adminKeyModel.updateOne(
      { _id: keyId, revokedAt: null },
      { revokedAt: new Date() },
    );

    if (result.modifiedCount > 0) {
      this.logger.log(`Revoked admin key: ${keyId}`);
      return true;
    }

    return false;
  }

  /**
   * Hash a token using SHA-256.
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
