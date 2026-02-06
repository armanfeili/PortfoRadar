import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

/**
 * Health status response.
 */
export class HealthResponseDto {
  status: 'ok';
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  /**
   * Liveness/readiness probe for container orchestration.
   */
  @Get()
  @ApiOperation({
    summary: 'Health check',
    description:
      'Returns the health status of the application. Use for Kubernetes liveness/readiness probes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is healthy',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          example: 'ok',
          description: 'Health status indicator',
        },
      },
    },
  })
  check(): HealthResponseDto {
    return { status: 'ok' };
  }
}
