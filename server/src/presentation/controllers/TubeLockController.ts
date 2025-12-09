import { Request, Response } from 'express';
import { TubeApplicationService } from '@application/services/TubeApplicationService';
import type {
  LockTubesRequest,
  UnlockTubesRequest,
  ShareTubeAccessRequest,
  RevokeTubeAccessRequest
} from '@application/dto/TubeLockDto';
import { ErrorDto } from '@application/dto/ErrorDto';
import { logger } from '@utils/logger';

/**
 * TubeLockController - HTTP request/response handling for tube locking
 *
 * Pure presentation layer - handles HTTP concerns only.
 * Delegates all business logic to application service.
 */
export class TubeLockController {
  constructor(private tubeApplicationService: TubeApplicationService) {}

  /**
   * Lock tubes
   * POST /api/tubes/lock
   */
  async lockTubes(req: Request, res: Response): Promise<void> {
    try {
      const authenticatedUser = this.getAuthenticatedUser(req);
      const lockRequest: LockTubesRequest = req.body;

      const result = await this.tubeApplicationService.lockTubes(lockRequest, authenticatedUser);

      logger.info('Tubes locked', {
        locked: result.locked.length,
        skipped: result.skipped.length,
        user: (req as any).user?.username
      });

      res.json(ErrorDto.success(result));
    } catch (error) {
      this.handleError(error, res, 'Failed to lock tubes');
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

      logger.info('Tubes unlocked', {
        unlocked: result.unlocked.length,
        skipped: result.skipped.length,
        user: (req as any).user?.username
      });

      res.json(ErrorDto.success(result));
    } catch (error) {
      this.handleError(error, res, 'Failed to unlock tubes');
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

      logger.info('Tube access shared', {
        shared: result.shared.length,
        skipped: result.skipped.length,
        userIds: shareRequest.userIds.length,
        user: (req as any).user?.username
      });

      res.json(ErrorDto.success(result));
    } catch (error) {
      this.handleError(error, res, 'Failed to share tube access');
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

      logger.info('Tube access revoked', {
        revoked: result.revoked.length,
        skipped: result.skipped.length,
        userIds: revokeRequest.userIds.length,
        user: (req as any).user?.username
      });

      res.json(ErrorDto.success(result));
    } catch (error) {
      this.handleError(error, res, 'Failed to revoke tube access');
    }
  }

  /**
   * Helper: Extract authenticated user from OAuth 2.0 middleware
   */
  private getAuthenticatedUser(req: Request): any {
    const user = (req as any).user;
    if (!user) {
      throw new Error('Authentication required - user not found in request context');
    }
    return user;
  }

  /**
   * Helper: Handle errors and send appropriate HTTP response
   */
  private handleError(error: any, res: Response, defaultMessage: string): void {
    logger.error(defaultMessage, error);

    const errorResponse = ErrorDto.fromDomainError(error);
    res.status(errorResponse.status).json(errorResponse.response);
  }
}
