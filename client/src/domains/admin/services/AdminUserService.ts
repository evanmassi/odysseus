/**
 * Admin User Service
 *
 * User management operations for lab administrators.
 */

import {
  adminUsersListSchema,
  emptyResponseSchema,
  generatePasswordResetTokenResponseSchema,
} from '@odysseus/shared-schemas';

import { httpClient } from '@infra/api';
import { logger } from '@infra/logger';

import type { AdminUser, UserRole } from '@odysseus/shared-schemas';

export class AdminUserService {
  async getUsers(): Promise<AdminUser[]> {
    try {
      const data = await httpClient.getData('/admin/users', adminUsersListSchema);
      return data.users;
    } catch (error) {
      logger.error('Failed to get users', { error });
      throw error;
    }
  }

  async updateUserRole(userId: string, newRole: UserRole): Promise<void> {
    try {
      await httpClient.putData(
        `/admin/users/${userId}/role`,
        { role: newRole },
        emptyResponseSchema
      );
    } catch (error) {
      logger.error('Failed to update user role', { userId, error });
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      await httpClient.deleteData(`/admin/users/${userId}`);
    } catch (error) {
      logger.error('Failed to delete user', { userId, error });
      throw error;
    }
  }

  async deactivateUser(userId: string): Promise<void> {
    try {
      await httpClient.post(`/admin/users/${userId}/deactivate`);
    } catch (error) {
      logger.error('Failed to deactivate user', { userId, error });
      throw error;
    }
  }

  async activateUser(userId: string): Promise<void> {
    try {
      await httpClient.post(`/admin/users/${userId}/activate`);
    } catch (error) {
      logger.error('Failed to activate user', { userId, error });
      throw error;
    }
  }

  async linkResearcherToUser(userId: string, researcherId: string): Promise<void> {
    try {
      await httpClient.post(`/admin/users/${userId}/link-researcher`, { researcherId });
    } catch (error) {
      logger.error('Failed to link researcher to user', { userId, error });
      throw error;
    }
  }

  async unlinkResearcherFromUser(userId: string): Promise<void> {
    try {
      await httpClient.post(`/admin/users/${userId}/unlink-researcher`);
    } catch (error) {
      logger.error('Failed to unlink researcher from user', { userId, error });
      throw error;
    }
  }

  async resetUserPassword(
    userId: string,
    newPassword: string,
    requirePasswordChange: boolean = true
  ): Promise<void> {
    try {
      await httpClient.post(`/admin/users/${userId}/reset-password`, {
        newPassword,
        requirePasswordChange,
      });
    } catch (error) {
      logger.error('Failed to reset password for user', { userId, error });
      throw error;
    }
  }

  /**
   * Admin generates password reset token
   * Returns URL with embedded token for user to set own password (15-minute expiry)
   */
  async generatePasswordResetToken(
    userId: string
  ): Promise<{ resetUrl: string; expiresAt: string; message: string }> {
    try {
      return await httpClient.postData(
        `/admin/users/${userId}/generate-reset-token`,
        undefined,
        generatePasswordResetTokenResponseSchema
      );
    } catch (error) {
      logger.error('Failed to generate password reset token for user', { userId, error });
      throw error;
    }
  }
}

export const adminUserService = new AdminUserService();
