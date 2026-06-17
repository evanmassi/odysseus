/**
 * Admin User Management Controller
 *
 * Lab admin endpoints — user CRUD, role changes, researcher linking, password resets.
 */

import { API_ERROR_CODES } from '@odysseus/shared-schemas';

import type { AdminResetPasswordCommandHandler, GeneratePasswordResetTokenCommandHandler } from '@application/commands/PasswordResetCommands';
import type {
  ChangeUserRoleCommand, ChangeUserRoleCommandHandler,
} from '@application/commands/UserCommands';
import type { GetUserByIdQueryHandler } from '@application/queries/UserQueries';
import { GetUserByIdQuery } from '@application/queries/UserQueries';
import type { ResearcherApplicationService } from '@application/services/ResearcherApplicationService';
import type { UserApplicationService } from '@application/services/UserApplicationService';
import { UserRole } from '@domain/value-objects/UserRole';
import { logger } from '@infrastructure/logging/logger';
import { BaseController } from '@presentation/controllers/BaseController';
import { handleControllerError } from '@presentation/utils/errorHandler';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';

import type { Request, Response } from 'express';

export interface AdminUserControllerDeps {
  changeRoleHandler: ChangeUserRoleCommandHandler;
  adminResetPasswordHandler: AdminResetPasswordCommandHandler;
  generatePasswordResetTokenHandler: GeneratePasswordResetTokenCommandHandler;
  getUserByIdHandler: GetUserByIdQueryHandler;
  userApplicationService: UserApplicationService;
  researcherApplicationService: ResearcherApplicationService;
}

export class AdminUserController extends BaseController {
  constructor(private deps: AdminUserControllerDeps) {
    super();
  }

  async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const labId = req.user?.labId;
      if (!labId) {
        res.status(403).json(ResponseBuilder.error(API_ERROR_CODES.FORBIDDEN, 'Lab context required'));
        return;
      }

      const enrichedUsers = await this.deps.userApplicationService.getEnrichedLabUsers(labId);

      const response = ResponseBuilder.success({
        users: enrichedUsers
      });
      res.status(200).json(response);
    } catch (error) {
      handleControllerError(error, res, 'Failed to get users');
    }
  }

  async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const query = new GetUserByIdQuery(id);
      const user = await this.deps.getUserByIdHandler.handle(query);

      const response = ResponseBuilder.success({
        user: user.toPublicData()
      });
      res.status(200).json(response);
    } catch (error) {
      handleControllerError(error, res, 'Failed to get user');
    }
  }

  async updateUserRole(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const adminUser = this.getAuthenticatedUser(req);

      const command: ChangeUserRoleCommand = {
        userId: id,
        newRole: UserRole.create(role),
        initiatedBy: adminUser.id,
      };

      await this.deps.changeRoleHandler.handle(command);

      logger.info('User role updated', {
        targetUserId: id,
        newRole: role,
        performedBy: adminUser.username
      });

      const response = ResponseBuilder.success({ message: 'User role updated successfully' });
      res.status(200).json(response);
    } catch (error) {
      handleControllerError(error, res, 'Failed to update user role');
    }
  }

  async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminUser = this.getAuthenticatedUser(req);

      await this.deps.userApplicationService.deleteUser(id, adminUser);

      logger.info('User deleted', {
        deletedUserId: id,
        performedBy: adminUser.username
      });

      res.status(200).json(ResponseBuilder.success({ message: 'User deleted successfully' }));
    } catch (error) {
      handleControllerError(error, res, 'Failed to delete user');
    }
  }

  async deactivateUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const adminUser = this.getAuthenticatedUser(req);

      await this.deps.userApplicationService.deactivateUser(userId, adminUser);

      const response = ResponseBuilder.success({
        success: true,
        message: 'User deactivated successfully'
      });

      res.status(200).json(response);
    } catch (error) {
      handleControllerError(error, res, 'Failed to deactivate user');
    }
  }

  async activateUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const adminUser = this.getAuthenticatedUser(req);

      await this.deps.userApplicationService.reactivateUser(userId, adminUser);

      const response = ResponseBuilder.success({
        success: true,
        message: 'User activated successfully'
      });

      res.status(200).json(response);
    } catch (error) {
      handleControllerError(error, res, 'Failed to activate user');
    }
  }

  /**
   * Links existing researcher (researcherId) or creates new one (newResearcher).
   */
  async linkResearcherToUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { researcherId, newResearcher } = req.body;
      const adminUser = this.getAuthenticatedUser(req);

      let targetResearcherId = researcherId;

      if (newResearcher) {
        const created = await this.deps.researcherApplicationService.createResearcher(
          adminUser.labId!,
          newResearcher,
          adminUser
        );
        targetResearcherId = created.id;

        logger.info('New researcher created for user linking', {
          researcherId: created.id,
          researcherName: `${created.firstName} ${created.lastName}`,
          userId,
          createdBy: adminUser.username
        });
      }

      await this.deps.userApplicationService.linkResearcherToUser(userId, targetResearcherId, adminUser);

      const response = ResponseBuilder.success({
        success: true,
        researcherId: targetResearcherId,
        message: 'Researcher linked to user successfully'
      });

      res.status(200).json(response);

      logger.info('Researcher linked to user', {
        userId,
        researcherId: targetResearcherId,
        linkedBy: adminUser.username
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to link researcher');
    }
  }

  /** Preserves researcher record for tube history while removing user link. */
  async unlinkResearcherFromUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const adminUser = this.getAuthenticatedUser(req);

      await this.deps.userApplicationService.unlinkResearcherFromUser(userId, adminUser);

      const response = ResponseBuilder.success({
        success: true,
        message: 'Researcher unlinked from user successfully'
      });

      res.status(200).json(response);

      logger.info('Researcher unlinked from user', {
        userId,
        unlinkedBy: adminUser.username
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to unlink researcher');
    }
  }

  /**
   * Use when admin needs immediate access restoration.
   * requirePasswordChange=true forces user to set own password on next login.
   */
  async adminResetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { newPassword, requirePasswordChange = true } = req.body;
      const adminUser = this.getAuthenticatedUser(req);

      await this.deps.adminResetPasswordHandler.handle({
        adminUserId: adminUser.id,
        targetUserId: userId,
        newPassword,
        requirePasswordChange
      });

      logger.info('Password reset by admin', {
        adminUserId: adminUser.id,
        adminUsername: adminUser.username,
        targetUserId: userId,
        requirePasswordChange
      });

      const response = ResponseBuilder.success({
        success: true,
        message: 'Password reset successfully'
      });

      res.status(200).json(response);
    } catch (error) {
      handleControllerError(error, res, 'Failed to reset password');
    }
  }

  /** Generates 15-minute one-time reset link for user to set own password. */
  async generatePasswordResetToken(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const adminUser = this.getAuthenticatedUser(req);

      const result = await this.deps.generatePasswordResetTokenHandler.handle({
        adminUserId: adminUser.id,
        targetUserId: userId
      });

      logger.info('Password reset token generated', {
        adminUserId: adminUser.id,
        adminUsername: adminUser.username,
        targetUserId: userId
      });

      const response = ResponseBuilder.success({
        resetUrl: result.resetUrl,
        expiresAt: result.expiresAt.toISOString(),
        message: 'Password reset token generated. Share this link with the user.'
      });

      res.status(200).json(response);
    } catch (error) {
      handleControllerError(error, res, 'Failed to generate reset token');
    }
  }
}
