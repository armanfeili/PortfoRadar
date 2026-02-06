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
import { AdminKeyService } from '../admin-key.service';

/**
 * Guard that protects admin endpoints with an API key.
 *
 * Accepts either:
 * - The master ADMIN_API_KEY from environment (long-lived)
 * - A valid temporary key from the database (short-lived, prefixed with ak_)
 *
 * Behavior:
 * - Production: Requires valid X-Admin-Key header (master or temp key)
 * - Development: Allows if ADMIN_API_KEY not set (with warning), requires match if set
 */
@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(AdminApiKeyGuard.name);

  constructor(
    private readonly configService: ConfigService<EnvConfig, true>,
    private readonly adminKeyService: AdminKeyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const providedKey = request.headers['x-admin-key'] as string | undefined;
    const masterKey = this.configService.get('ADMIN_API_KEY', { infer: true });
    const nodeEnv = this.configService.get('NODE_ENV', { infer: true });

    // If ADMIN_API_KEY (master key) is not configured
    if (!masterKey) {
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

    // Key header is required
    if (!providedKey) {
      throw new UnauthorizedException(
        'Missing X-Admin-Key header. Provide the admin API key.',
      );
    }

    // Check 1: Is it the master key?
    if (providedKey === masterKey) {
      return true;
    }

    // Check 2: Is it a valid temporary key?
    if (providedKey.startsWith('ak_')) {
      const isValid = await this.adminKeyService.validateKey(providedKey);
      if (isValid) {
        return true;
      }
      throw new UnauthorizedException('Invalid or expired temporary admin key');
    }

    // Neither master nor valid temp key
    throw new UnauthorizedException('Invalid X-Admin-Key');
  }
}
