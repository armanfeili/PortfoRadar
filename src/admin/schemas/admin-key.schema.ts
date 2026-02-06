import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AdminKeyDocument = AdminKey & Document;

/**
 * Schema for storing temporary admin API keys.
 *
 * Tokens are stored as SHA-256 hashes (never plain text).
 * MongoDB TTL index automatically removes expired keys.
 */
@Schema({ timestamps: true, collection: 'admin_keys' })
export class AdminKey {
  /**
   * SHA-256 hash of the token (never store plain token).
   */
  @Prop({ required: true, unique: true, index: true })
  tokenHash: string;

  /**
   * When the key was created.
   */
  @Prop({ required: true, type: Date })
  createdAt: Date;

  /**
   * When the key expires. TTL index deletes doc after this time.
   */
  @Prop({ required: true, type: Date })
  expiresAt: Date;

  /**
   * When the key was revoked (null if still active).
   */
  @Prop({ type: Date, default: null })
  revokedAt: Date | null;

  /**
   * Last time the key was used for authentication.
   */
  @Prop({ type: Date, default: null })
  lastUsedAt: Date | null;

  /**
   * Optional identifier of who created the key.
   */
  @Prop({ type: String, default: null })
  createdBy: string | null;
}

export const AdminKeySchema = SchemaFactory.createForClass(AdminKey);

// TTL index: MongoDB automatically removes documents 0 seconds after expiresAt
AdminKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
