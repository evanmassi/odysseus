/**
 * Tube Locking Controller
 *
 * HTTP handlers for tube lock/unlock and access sharing operations.
 */

import type { TubeApplicationService } from '@application/services/TubeApplicationService';
import { logger } from '@infrastructure/logging/logger';
import { BaseController } from '@presentation/controllers/BaseController';
import { handleControllerError } from '@presentation/utils/errorHandler';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';

import type {
  LockTubesRequest,
  UnlockTubesRequest,
  ShareTubeAccessRequest,
  RevokeTubeAccessRequest,
} from '@odysseus/shared-schemas';
import type { Request, Response } from 'express';
export interface TubeLockControllerDeps {
  tubeApplicationService: TubeApplicationService;
}

export class TubeLockController extends BaseController {
  constructor(private deps: TubeLockControllerDeps) {
    super();
  }

  /** POST /api/tubes/lock */
  async lockTubes(req: Request, res: Response): Promise<void> {
    try {
      const authenticatedUser = this.getAuthenticatedUser(req);
      const lockRequest: LockTubesRequest = req.body;

      const result = await this.deps.tubeApplicationService.lockTubes(
        lockRequest,
        authenticatedUser
      );

      logger.debug('Tubes locked', {
        locked: result.locked.length,
        skipped: result.skipped.length,
        user: req.user?.username,
        requestId: req.requestId,
      });

      res.json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to lock tubes', req.requestId);
    }
  }

  /** POST /api/tubes/unlock */
  async unlockTubes(req: Request, res: Response): Promise<void> {
    try {
      const authenticatedUser = this.getAuthenticatedUser(req);
      const unlockRequest: UnlockTubesRequest = req.body;

      const result = await this.deps.tubeApplicationService.unlockTubes(
        unlockRequest,
        authenticatedUser
      );

      logger.debug('Tubes unlocked', {
        unlocked: result.unlocked.length,
        skipped: result.skipped.length,
        user: req.user?.username,
        requestId: req.requestId,
      });

      res.json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to unlock tubes', req.requestId);
    }
  }

  /** POST /api/tubes/share-access */
  async shareTubeAccess(req: Request, res: Response): Promise<void> {
    try {
      const authenticatedUser = this.getAuthenticatedUser(req);
      const shareRequest: ShareTubeAccessRequest = req.body;

      const result = await this.deps.tubeApplicationService.shareTubeAccess(
        shareRequest,
        authenticatedUser
      );

      logger.debug('Tube access shared', {
        shared: result.shared.length,
        skipped: result.skipped.length,
        userIds: shareRequest.userIds.length,
        user: req.user?.username,
        requestId: req.requestId,
      });

      res.json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to share tube access', req.requestId);
    }
  }

  /** POST /api/tubes/revoke-access */
  async revokeTubeAccess(req: Request, res: Response): Promise<void> {
    try {
      const authenticatedUser = this.getAuthenticatedUser(req);
      const revokeRequest: RevokeTubeAccessRequest = req.body;

      const result = await this.deps.tubeApplicationService.revokeTubeAccess(
        revokeRequest,
        authenticatedUser
      );

      logger.debug('Tube access revoked', {
        revoked: result.revoked.length,
        skipped: result.skipped.length,
        userIds: revokeRequest.userIds.length,
        user: req.user?.username,
        requestId: req.requestId,
      });

      res.json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to revoke tube access', req.requestId);
    }
  }
}
