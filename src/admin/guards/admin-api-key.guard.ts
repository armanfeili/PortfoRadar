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
 * Guard that protects admin endpoints with temporary API keys.
 *
 * Accepts valid temporary keys (ak_ prefix) that are not expired/revoked.
 * Does NOT require ADMIN_API_KEY environment variable.
 */
@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(AdminApiKeyGuard.name);

  constructor(private readonly adminKeyService: AdminKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const providedKey = request.headers['x-admin-key'] as string | undefined;

    // Key header is required
    if (!providedKey) {
      throw new UnauthorizedException(
        'Missing X-Admin-Key header. Generate a key via POST /admin/keys first.',
      );
    }

    // Must be a temporary key (ak_ prefix)
    if (!providedKey.startsWith('ak_')) {
      throw new UnauthorizedException(
        'Invalid key format. Use a temporary key generated via POST /admin/keys.',
      );
    }

    // Validate the temporary key against database
    const isValid = await this.adminKeyService.validateKey(providedKey);
    if (!isValid) {
      throw new UnauthorizedException(
        'Invalid or expired temporary admin key. Generate a new one via POST /admin/keys.',
      );
    }

    return true;
  }
}
