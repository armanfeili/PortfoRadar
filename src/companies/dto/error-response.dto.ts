import { ApiProperty } from '@nestjs/swagger';

/**
 * Standardized error response DTO for Swagger documentation.
 * All API errors follow this consistent structure.
 */
export class ErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 404,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Error type name',
    example: 'Not Found',
  })
  error: string;

  @ApiProperty({
    description: 'Human-readable error message(s)',
    oneOf: [
      { type: 'string', example: "Company with id 'abc123' not found" },
      {
        type: 'array',
        items: { type: 'string' },
        example: ['limit must not be greater than 100'],
      },
    ],
  })
  message: string | string[];

  @ApiProperty({
    description: 'Request path that triggered the error',
    example: '/companies/abc123',
  })
  path: string;

  @ApiProperty({
    description: 'ISO timestamp of when the error occurred',
    example: '2026-02-06T10:30:00.000Z',
  })
  timestamp: string;
}
