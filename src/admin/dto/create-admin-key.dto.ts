import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, Max, IsOptional } from 'class-validator';

/**
 * Request body for creating a temporary admin key.
 */
export class CreateAdminKeyDto {
  @ApiProperty({
    description: 'Time-to-live in minutes (how long the key stays valid)',
    minimum: 5,
    maximum: 1440,
    default: 30,
    required: false,
    example: 30,
  })
  @IsOptional()
  @IsInt()
  @Min(5, { message: 'TTL must be at least 5 minutes' })
  @Max(1440, { message: 'TTL cannot exceed 1440 minutes (24 hours)' })
  ttlMinutes?: number = 30;
}
