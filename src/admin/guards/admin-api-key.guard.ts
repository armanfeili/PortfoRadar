import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { EnvConfig } from '../../config/env.validation';

/**
 * Guard that protects admin endpoints with an API key.
 *
 * Behavior:
 * - Production: Requires valid X-Admin-Key header matching ADMIN_API_KEY env
 * - Development: Allows if ADMIN_API_KEY not set (with warning), requires match if set
 */
@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(AdminApiKeyGuard.name);

  constructor(private readonly configService: ConfigService<EnvConfig, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const providedKey = request.headers['x-admin-key'] as string | undefined;
    const expectedKey = this.configService.get('ADMIN_API_KEY', {
      infer: true,
    });
    const nodeEnv = this.configService.get('NODE_ENV', { infer: true });

    // If ADMIN_API_KEY is not configured
    if (!expectedKey) {
      if (nodeEnv === 'production') {
        this.logger.error(
          'ADMIN_API_KEY not set in production — admin endpoint blocked',
        );
        throw new UnauthorizedException(
          'Admin endpoint requires ADMIN_API_KEY to be configured',
        );
      }

      // Development/test: allow with warning
      this.logger.warn(
        '⚠️  ADMIN_API_KEY not set — allowing admin access in development mode',
      );
      return true;
    }

    // ADMIN_API_KEY is configured — validate
    if (!providedKey) {
      throw new UnauthorizedException(
        'Missing X-Admin-Key header. Provide the admin API key.',
      );
    }

    if (providedKey !== expectedKey) {
      throw new UnauthorizedException('Invalid X-Admin-Key');
    }

    return true;
  }
}
