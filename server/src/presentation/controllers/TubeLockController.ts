import { Request, Response } from 'express';
import { TubeApplicationService } from '@application/services/TubeApplicationService';
import type {
  LockTubesRequest,
  UnlockTubesRequest,
  ShareTubeAccessRequest,
  RevokeTubeAccessRequest
} from '@odysseus/shared-schemas';
import { ErrorDto } from '@application/dto/ErrorDto';
import { handleControllerError } from '@presentation/utils/errorHandler';
import { logger } from '@infrastructure/logging/logger';
import { BaseController } from '@presentation/controllers/BaseController';

/**
 * TubeLockController - HTTP request/response handling for tube locking
 *
 * Pure presentation layer - handles HTTP concerns only.
 * Delegates all business logic to application service.
 */
export class TubeLockController extends BaseController {
  constructor(private tubeApplicationService: TubeApplicationService) {
    super();
  }

  /**
   * Lock tubes
   * POST /api/tubes/lock
   */
  async lockTubes(req: Request, res: Response): Promise<void> {
    try {
      const authenticatedUser = this.getAuthenticatedUser(req);
      const lockRequest: LockTubesRequest = req.body;

      const result = await this.tubeApplicationService.lockTubes(lockRequest, authenticatedUser);

      logger.debug('Tubes locked', {
        locked: result.locked.length,
        skipped: result.skipped.length,
        user: req.user?.username,
        requestId: req.requestId
      });

      res.json(ErrorDto.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to lock tubes', req.requestId);
    }
  }

  /**
   * Unlock tubes
   * POST /api/tubes/unlock
   */
  async unlockTubes(req: Request, res: Response): Promise<void> {
    try {
      const authenticatedUser = this.getAuthenticatedUser(req);
      const unlockRequest: UnlockTubesRequest = req.body;

      const result = await this.tubeApplicationService.unlockTubes(unlockRequest, authenticatedUser);

      logger.debug('Tubes unlocked', {
        unlocked: result.unlocked.length,
        skipped: result.skipped.length,
        user: req.user?.username,
        requestId: req.requestId
      });

      res.json(ErrorDto.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to unlock tubes', req.requestId);
    }
  }

  /**
   * Share tube access
   * POST /api/tubes/share-access
   */
  async shareTubeAccess(req: Request, res: Response): Promise<void> {
    try {
      const authenticatedUser = this.getAuthenticatedUser(req);
      const shareRequest: ShareTubeAccessRequest = req.body;

      const result = await this.tubeApplicationService.shareTubeAccess(shareRequest, authenticatedUser);

      logger.debug('Tube access shared', {
        shared: result.shared.length,
        skipped: result.skipped.length,
        userIds: shareRequest.userIds.length,
        user: req.user?.username,
        requestId: req.requestId
      });

      res.json(ErrorDto.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to share tube access', req.requestId);
    }
  }

  /**
   * Revoke tube access
   * POST /api/tubes/revoke-access
   */
  async revokeTubeAccess(req: Request, res: Response): Promise<void> {
    try {
      const authenticatedUser = this.getAuthenticatedUser(req);
      const revokeRequest: RevokeTubeAccessRequest = req.body;

      const result = await this.tubeApplicationService.revokeTubeAccess(revokeRequest, authenticatedUser);

      logger.debug('Tube access revoked', {
        revoked: result.revoked.length,
        skipped: result.skipped.length,
        userIds: revokeRequest.userIds.length,
        user: req.user?.username,
        requestId: req.requestId
      });

      res.json(ErrorDto.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to revoke tube access', req.requestId);
    }
  }

}
