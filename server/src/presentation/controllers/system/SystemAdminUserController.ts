/**
 * System Admin User Controller
 *
 * Cross-lab user management — activate, deactivate, suspend, and delete users
 * within a specific lab context. Requires system_admin role.
 */


import type { UserApplicationService } from '@application/services/UserApplicationService';
import { PermissionError } from '@domain/errors/PermissionError';
import { handleControllerError } from '@presentation/utils/errorHandler';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';

import type { Request, Response } from 'express';

export interface SystemAdminUserControllerDeps {
  userApplicationService: UserApplicationService;
}

export class SystemAdminUserController {
  constructor(private deps: SystemAdminUserControllerDeps) {}

  async activateUserForLab(req: Request, res: Response): Promise<void> {
    try {

      const { userId } = req.params;
      const adminApiKey = req.user?.apiKey;

      if (!adminApiKey) {
        throw new PermissionError('Authentication required');
      }

      await this.deps.userApplicationService.reactivateUser(userId, adminApiKey);

      const response = ResponseBuilder.success({
        success: true,
        message: 'User activated successfully'
      });

      res.status(200).json(response);
    } catch (error) {
      handleControllerError(error, res, 'Failed to activate user');
    }
  }

  async deactivateUserForLab(req: Request, res: Response): Promise<void> {
    try {

      const { labId, userId } = req.params;
      const adminApiKey = req.user?.apiKey;

      if (!adminApiKey) {
        throw new PermissionError('Authentication required');
      }

      await this.deps.userApplicationService.deactivateUser(userId, adminApiKey, labId);

      const response = ResponseBuilder.success({
        success: true,
        message: 'User deactivated successfully'
      });

      res.status(200).json(response);
    } catch (error) {
      handleControllerError(error, res, 'Failed to deactivate user');
    }
  }

  async suspendUserForLab(req: Request, res: Response): Promise<void> {
    try {

      const { labId, userId } = req.params;
      const adminApiKey = req.user?.apiKey;

      if (!adminApiKey) {
        throw new PermissionError('Authentication required');
      }

      await this.deps.userApplicationService.suspendUser(userId, adminApiKey, labId);

      const response = ResponseBuilder.success({
        success: true,
        message: 'User suspended successfully'
      });

      res.status(200).json(response);
    } catch (error) {
      handleControllerError(error, res, 'Failed to suspend user');
    }
  }

  async deleteUserForLab(req: Request, res: Response): Promise<void> {
    try {

      const { userId } = req.params;
      const adminApiKey = req.user?.apiKey;

      if (!adminApiKey) {
        throw new PermissionError('Authentication required');
      }

      await this.deps.userApplicationService.deleteUser(userId, adminApiKey);

      const response = ResponseBuilder.success({
        success: true,
        message: 'User deleted successfully'
      });

      res.status(200).json(response);
    } catch (error) {
      handleControllerError(error, res, 'Failed to delete user');
    }
  }
}
