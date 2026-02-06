import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { AdminKeyService } from '../admin-key.service';

/**
 * Guard that validates temporary admin API keys.
 *
 * Requires the X-Admin-Key header with a valid temporary key
 * generated via POST /admin/keys.
 */
@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(AdminApiKeyGuard.name);

  constructor(private readonly adminKeyService: AdminKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-admin-key'] as string | undefined;

    if (!apiKey) {
      this.logger.warn('Missing X-Admin-Key header');
      throw new UnauthorizedException(
        'Missing X-Admin-Key header. Generate a temporary key via POST /admin/keys',
      );
    }

    // Validate the temporary key
    const isValid = await this.adminKeyService.validateKey(apiKey);

    if (!isValid) {
      this.logger.warn('Invalid or expired admin key');
      throw new UnauthorizedException(
        'Invalid or expired admin key. Generate a new key via POST /admin/keys',
      );
    }

    return true;
  }
}
