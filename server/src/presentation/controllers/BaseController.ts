/**
 * Base Controller
 *
 * Shared auth extraction helpers for all controllers.
 */

import type { User } from '@domain/entities/User';

import type { Request } from 'express';


export abstract class BaseController {

  protected getAuthenticatedUser(req: Request): User {
    const user = req.user;
    if (!user) {
      throw new Error('Authentication required - user not found in request context');
    }
    return user;
  }

  protected extractUserId(req: Request): string {
    const user = req.user;
    if (!user?.id) {
      throw new Error('User not authenticated');
    }
    return user.id;
  }

  protected extractLabId(req: Request): string {
    const user = req.user;
    if (!user?.labId) {
      throw new Error('Lab context required - user has no lab association');
    }
    return user.labId;
  }

  protected extractApiKey(req: Request): string {
    const user = req.user;
    if (!user?.apiKey) {
      throw new Error('Authentication required');
    }
    return user.apiKey;
  }
}
