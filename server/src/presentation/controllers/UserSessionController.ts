/**
 * User Session Controller
 *
 * HTTP handlers for session listing and revocation.
 */

import type { UserSessionApplicationService } from '@application/services/UserSessionApplicationService';
import { BaseController } from '@presentation/controllers/BaseController';
import { handleControllerError } from '@presentation/utils/errorHandler';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';

import type { Request, Response } from 'express';

export interface UserSessionControllerDeps {
  userSessionApplicationService: UserSessionApplicationService;
}

export class UserSessionController extends BaseController {
  constructor(private deps: UserSessionControllerDeps) {
    super();
  }

  async getUserSessions(req: Request, res: Response): Promise<void> {
    try {
      const user = this.getAuthenticatedUser(req);
      const sessions = await this.deps.userSessionApplicationService.getActiveSessions(
        user,
        req.sessionId
      );

      res.json(ResponseBuilder.success(sessions));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get user sessions', req.requestId);
    }
  }

  async revokeSession(req: Request, res: Response): Promise<void> {
    try {
      const user = this.getAuthenticatedUser(req);
      await this.deps.userSessionApplicationService.revokeSession(
        user,
        req.params.id,
        req.sessionId
      );

      res.json(ResponseBuilder.success({ message: 'Session revoked successfully' }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to revoke session', req.requestId);
    }
  }

  async bulkRevokeSessions(req: Request, res: Response): Promise<void> {
    try {
      const user = this.getAuthenticatedUser(req);
      const { sessionIds } = req.body as { sessionIds: string[] };
      const result = await this.deps.userSessionApplicationService.bulkRevokeSessions(
        user,
        sessionIds,
        req.sessionId
      );

      res.json(ResponseBuilder.success(result));
    } catch (error) {
      handleControllerError(error, res, 'Failed to revoke sessions', req.requestId);
    }
  }
}
