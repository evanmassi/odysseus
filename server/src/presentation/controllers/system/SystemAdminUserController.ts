/**
 * System Admin User Controller
 *
 * Cross-lab user management — activate, deactivate, suspend, and delete users
 * within a specific lab context. Requires system_admin role.
 */

import type { UserApplicationService } from '@application/services/UserApplicationService';
import { BaseController } from '@presentation/controllers/BaseController';
import { handleControllerError } from '@presentation/utils/errorHandler';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';

import type { Request, Response } from 'express';

export interface SystemAdminUserControllerDeps {
  userApplicationService: UserApplicationService;
}

export class SystemAdminUserController extends BaseController {
  constructor(private deps: SystemAdminUserControllerDeps) {
    super();
  }

  async activateUserForLab(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const adminUser = this.getAuthenticatedUser(req);

      await this.deps.userApplicationService.reactivateUser(userId, adminUser);

      const response = ResponseBuilder.success({
        message: 'User activated successfully'
      });

      res.status(200).json(response);
    } catch (error) {
      handleControllerError(error, res, 'Failed to activate user', req.requestId);
    }
  }

  async deactivateUserForLab(req: Request, res: Response): Promise<void> {
    try {
      const { labId, userId } = req.params;
      const adminUser = this.getAuthenticatedUser(req);

      await this.deps.userApplicationService.deactivateUser(userId, adminUser, labId);

      const response = ResponseBuilder.success({
        message: 'User deactivated successfully'
      });

      res.status(200).json(response);
    } catch (error) {
      handleControllerError(error, res, 'Failed to deactivate user', req.requestId);
    }
  }

  async suspendUserForLab(req: Request, res: Response): Promise<void> {
    try {
      const { labId, userId } = req.params;
      const adminUser = this.getAuthenticatedUser(req);

      await this.deps.userApplicationService.suspendUser(userId, adminUser, labId);

      const response = ResponseBuilder.success({
        message: 'User suspended successfully'
      });

      res.status(200).json(response);
    } catch (error) {
      handleControllerError(error, res, 'Failed to suspend user', req.requestId);
    }
  }

  async deleteUserForLab(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const adminUser = this.getAuthenticatedUser(req);

      await this.deps.userApplicationService.deleteUser(userId, adminUser);

      const response = ResponseBuilder.success({
        message: 'User deleted successfully'
      });

      res.status(200).json(response);
    } catch (error) {
      handleControllerError(error, res, 'Failed to delete user', req.requestId);
    }
  }
}
