/**
 * Base Controller
 *
 * Shared auth extraction helpers for all controllers.
 * Eliminates duplicated getAuthenticatedUser/extractUserId/extractApiKey
 * methods that were copy-pasted across 6+ controllers.
 */

import { Request } from 'express';
import type { User } from '@domain/entities/User';

export abstract class BaseController {

  /** Extract the full authenticated User object from the request */
  protected getAuthenticatedUser(req: Request): User {
    const user = req.user;
    if (!user) {
      throw new Error('Authentication required - user not found in request context');
    }
    return user;
  }

  /** Extract just the user ID string from the request */
  protected extractUserId(req: Request): string {
    const user = req.user;
    if (!user?.id) {
      throw new Error('User not authenticated');
    }
    return user.id;
  }

  /** Extract the API key from the request (required — throws if missing) */
  protected extractApiKey(req: Request): string {
    const user = req.user;
    if (!user?.apiKey) {
      throw new Error('Authentication required');
    }
    return user.apiKey;
  }

  /** Extract the API key from the request (optional — returns undefined if missing) */
  protected extractOptionalApiKey(req: Request): string | undefined {
    return req.user?.apiKey;
  }
}
