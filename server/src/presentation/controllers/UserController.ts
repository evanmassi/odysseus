/**
 * User Settings and Lookup Controller
 *
 * HTTP handlers for user settings CRUD and user display-info lookups.
 */

import { userSettingsSchema } from '@odysseus/shared-schemas';

import type { UpdateUserSettingsCommandHandler } from '@application/commands/UserCommands';
import type { GetUserSettingsQueryHandler } from '@application/queries/UserQueries';
import type { UserApplicationService } from '@application/services/UserApplicationService';
import { BaseController } from '@presentation/controllers/BaseController';
import { handleControllerError } from '@presentation/utils/errorHandler';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';

import type { Request, Response } from 'express';

export interface UserControllerDeps {
  updateUserSettingsHandler: UpdateUserSettingsCommandHandler;
  getUserSettingsHandler: GetUserSettingsQueryHandler;
  userApplicationService: UserApplicationService;
}

export class UserController extends BaseController {
  constructor(private deps: UserControllerDeps) {
    super();
  }

  async getCurrentUserSettings(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const settings = await this.deps.getUserSettingsHandler.handle({ userId });

      res.json(ResponseBuilder.success({ settings }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to get user settings', req.requestId);
    }
  }

  async updateCurrentUserSettings(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const settings = userSettingsSchema.parse(req.body.settings);

      const updatedUser = await this.deps.updateUserSettingsHandler.handle({ userId, settings });

      res.json(ResponseBuilder.success({ settings: updatedUser.settings }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to update user settings', req.requestId);
    }
  }

  /** POST /api/users/lookup — batch display info; body validated by the route */
  async lookupUsers(req: Request, res: Response): Promise<void> {
    try {
      const { userIds } = req.body;

      // Scope to the caller's lab so a lab user cannot resolve another lab's
      // users; system admins have no lab and legitimately see all labs.
      const user = this.getAuthenticatedUser(req);
      const labId = user.isSystemAdmin() ? undefined : user.labId;

      const users = await this.deps.userApplicationService.lookupUsers(userIds, labId);

      res.json(ResponseBuilder.success({ users }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to lookup users', req.requestId);
    }
  }

  /** GET /api/users/list — minimal display info for user selection dropdowns */
  async listActiveUsers(req: Request, res: Response): Promise<void> {
    try {
      const labId = this.extractLabId(req);
      const users = await this.deps.userApplicationService.listActiveUsers(labId);

      res.json(ResponseBuilder.success({ users }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to list active users', req.requestId);
    }
  }
}
