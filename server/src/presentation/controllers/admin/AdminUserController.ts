/**
 * Admin User Management Controller
 *
 * Lab admin endpoints — user CRUD, approval workflow, role changes, researcher linking, password resets.
 */

import { Request, Response } from 'express';
import { API_ERROR_CODES } from '@odysseus/shared-schemas';
import { ResponseBuilder } from '@presentation/utils/responseBuilder';
import { logger } from '@infrastructure/logging/logger';
import { handleControllerError } from '@presentation/utils/errorHandler';
import {
  ChangeUserRoleCommand, ChangeUserRoleCommandHandler,
  DeleteUserCommand, DeleteUserCommandHandler,
} from '@application/commands/UserCommands';
import { AdminResetPasswordCommandHandler, GeneratePasswordResetTokenCommandHandler } from '@application/commands/PasswordResetCommands';
import { GetUserByIdQuery, GetUserByIdQueryHandler } from '@application/queries/UserQueries';
import { UserRole } from '@domain/value-objects/UserRole';
import { UserApplicationService } from '@application/services/UserApplicationService';
import { ResearcherApplicationService } from '@application/services/ResearcherApplicationService';
import { PermissionError } from '@domain/errors/PermissionError';

export interface AdminUserControllerDeps {
  changeRoleHandler: ChangeUserRoleCommandHandler;
  deleteUserHandler: DeleteUserCommandHandler;
  adminResetPasswordHandler: AdminResetPasswordCommandHandler;
  generatePasswordResetTokenHandler: GeneratePasswordResetTokenCommandHandler;
  getUserByIdHandler: GetUserByIdQueryHandler;
  userApplicationService: UserApplicationService;
  researcherApplicationService: ResearcherApplicationService;
}

export class AdminUserController {
  constructor(private deps: AdminUserControllerDeps) {}

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
      const adminUser = req.user;

      if (!adminUser) {
        handleControllerError(new Error('Admin user not found in request context'), res, 'Failed to update user role'); return;
      }

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
      const adminUser = req.user;

      if (!adminUser) {
        handleControllerError(new Error('Admin user not found in request context'), res, 'Failed to delete user'); return;
      }

      const command: DeleteUserCommand = { userId: id, initiatedBy: adminUser.id };
      await this.deps.deleteUserHandler.handle(command);

      logger.info('User deleted', {
        deletedUserId: id,
        performedBy: adminUser.username
      });

      const response = ResponseBuilder.success({ message: 'User deleted successfully' });
      res.status(200).json(response);
    } catch (error) {
      handleControllerError(error, res, 'Failed to delete user');
    }
  }

  async getPendingUsers(req: Request, res: Response): Promise<void> {
    try {

      const adminApiKey = req.user?.apiKey;

      if (!adminApiKey) {
        throw new PermissionError('Authentication required');
      }

      const pendingUsers = await this.deps.userApplicationService.getPendingUsers(adminApiKey);

      const response = ResponseBuilder.success({
        users: pendingUsers
      });

      res.status(200).json(response);

      logger.debug('Pending users retrieved', {
        count: pendingUsers.length,
        requestedBy: req.user?.username
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to get pending users');
    }
  }

  async approveUser(req: Request, res: Response): Promise<void> {
    try {

      const { userId } = req.params;
      const adminApiKey = req.user?.apiKey;

      if (!adminApiKey) {
        throw new PermissionError('Authentication required');
      }

      await this.deps.userApplicationService.approveUser(userId, adminApiKey);

      const response = ResponseBuilder.success({
        success: true,
        message: 'User approved successfully'
      });

      res.status(200).json(response);

      logger.info('User approved', {
        userId,
        approvedBy: req.user?.username
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to approve user');
    }
  }

  async rejectUser(req: Request, res: Response): Promise<void> {
    try {

      const { userId } = req.params;
      const adminApiKey = req.user?.apiKey;

      if (!adminApiKey) {
        throw new PermissionError('Authentication required');
      }

      await this.deps.userApplicationService.rejectUser(userId, adminApiKey);

      const response = ResponseBuilder.success({
        success: true,
        message: 'User rejected successfully'
      });

      res.status(200).json(response);

      logger.info('User rejected', {
        userId,
        rejectedBy: req.user?.username
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to reject user');
    }
  }

  async deactivateUser(req: Request, res: Response): Promise<void> {
    try {

      const { userId } = req.params;
      const adminApiKey = req.user?.apiKey;

      if (!adminApiKey) {
        throw new PermissionError('Authentication required');
      }

      await this.deps.userApplicationService.deactivateUser(userId, adminApiKey);

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
      const adminApiKey = req.user?.apiKey;

      if (!adminApiKey) {
        throw new PermissionError('Authentication required');
      }

      await this.deps.userApplicationService.approveUser(userId, adminApiKey);

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
      const adminApiKey = req.user?.apiKey;

      if (!adminApiKey) {
        throw new PermissionError('Authentication required');
      }

      let targetResearcherId = researcherId;

      if (newResearcher) {
        const created = await this.deps.researcherApplicationService.createResearcher(
          req.user!.labId!,
          newResearcher,
          adminApiKey
        );
        targetResearcherId = created.id;

        logger.info('New researcher created for user linking', {
          researcherId: created.id,
          researcherName: `${created.firstName} ${created.lastName}`,
          userId,
          createdBy: req.user?.username
        });
      }

      await this.deps.userApplicationService.linkResearcherToUser(userId, targetResearcherId, adminApiKey);

      const response = ResponseBuilder.success({
        success: true,
        researcherId: targetResearcherId,
        message: 'Researcher linked to user successfully'
      });

      res.status(200).json(response);

      logger.info('Researcher linked to user', {
        userId,
        researcherId: targetResearcherId,
        linkedBy: req.user?.username
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to link researcher');
    }
  }

  /** Preserves researcher record for tube history while removing user link. */
  async unlinkResearcherFromUser(req: Request, res: Response): Promise<void> {
    try {

      const { userId } = req.params;
      const adminApiKey = req.user?.apiKey;

      if (!adminApiKey) {
        throw new PermissionError('Authentication required');
      }

      await this.deps.userApplicationService.unlinkResearcherFromUser(userId, adminApiKey);

      const response = ResponseBuilder.success({
        success: true,
        message: 'Researcher unlinked from user successfully'
      });

      res.status(200).json(response);

      logger.info('Researcher unlinked from user', {
        userId,
        unlinkedBy: req.user?.username
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
      const adminUser = req.user;

      if (!adminUser) {
        throw new PermissionError('Authentication required');
      }

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
      const adminUser = req.user;

      if (!adminUser) {
        throw new PermissionError('Authentication required');
      }

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
