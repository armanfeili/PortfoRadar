import { ApiProperty } from '@nestjs/swagger';

/**
 * Response when a temporary admin key is created.
 *
 * IMPORTANT: The `token` is only shown once. Store it securely.
 */
export class AdminKeyResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the key (for revocation)',
    example: '507f1f77bcf86cd799439011',
  })
  keyId: string;

  @ApiProperty({
    description:
      'The API key token. SHOWN ONCE ONLY. Store this securely. ' +
      'Use this value in the X-Admin-Key header.',
    example: 'ak_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
  })
  token: string;

  @ApiProperty({
    description: 'When the key expires (ISO 8601 format)',
    example: '2026-02-06T16:30:00.000Z',
  })
  expiresAt: Date;

  @ApiProperty({
    description: 'TTL in minutes',
    example: 30,
  })
  ttlMinutes: number;
}
