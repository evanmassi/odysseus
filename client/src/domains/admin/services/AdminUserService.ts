/**
 * Admin User Service
 *
 * User management operations for lab administrators.
 */

import { httpClient } from '@infra/api/httpClient';
import { logger } from '@shared/infrastructure/logger';

import type { AdminUser, GeneratePasswordResetTokenResponse } from '@odysseus/shared-schemas';

export class AdminUserService {
  async getUsers(): Promise<{ success: boolean; users: AdminUser[] }> {
    try {
      const response = await httpClient.get<{
        success: boolean;
        data: { users: AdminUser[] };
        meta?: { timing: number };
      }>('/admin/users');

      return {
        success: response.data.success,
        users: response.data.data.users,
      };
    } catch (error) {
      logger.error('Failed to get users', { error });
      throw error;
    }
  }

  async updateUserRole(
    userId: string,
    newRole: 'lab_admin' | 'user'
  ): Promise<{ success: boolean }> {
    try {
      const response = await httpClient.put<{ success: boolean }>(`/admin/users/${userId}/role`, {
        role: newRole,
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to update user role', { userId, error });
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<{ success: boolean }> {
    try {
      const response = await httpClient.delete<{ success: boolean }>(`/admin/users/${userId}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to delete user', { userId, error });
      throw error;
    }
  }

  async getPendingUsers(): Promise<{ success: boolean; users: AdminUser[] }> {
    try {
      const response = await httpClient.get<{
        success: boolean;
        data: { users: AdminUser[] };
        meta?: { timing: number };
      }>('/admin/users/pending');

      return {
        success: response.data.success,
        users: response.data.data.users,
      };
    } catch (error) {
      logger.error('Failed to get pending users', { error });
      throw error;
    }
  }

  async approveUser(userId: string): Promise<{ success: boolean }> {
    try {
      const response = await httpClient.post<{ success: boolean }>(
        `/admin/users/${userId}/approve`
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to approve user', { userId, error });
      throw error;
    }
  }

  async rejectUser(userId: string): Promise<{ success: boolean }> {
    try {
      const response = await httpClient.post<{ success: boolean }>(`/admin/users/${userId}/reject`);
      return response.data;
    } catch (error) {
      logger.error('Failed to reject user', { userId, error });
      throw error;
    }
  }

  async deactivateUser(userId: string): Promise<{ success: boolean }> {
    try {
      const response = await httpClient.post<{ success: boolean }>(
        `/admin/users/${userId}/deactivate`
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to deactivate user', { userId, error });
      throw error;
    }
  }

  async activateUser(userId: string): Promise<{ success: boolean }> {
    try {
      const response = await httpClient.post<{ success: boolean }>(
        `/admin/users/${userId}/activate`
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to activate user', { userId, error });
      throw error;
    }
  }

  async linkResearcherToUser(userId: string, researcherId: string): Promise<{ success: boolean }> {
    try {
      const response = await httpClient.post<{ success: boolean }>(
        `/admin/users/${userId}/link-researcher`,
        { researcherId }
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to link researcher to user', { userId, error });
      throw error;
    }
  }

  async unlinkResearcherFromUser(userId: string): Promise<{ success: boolean }> {
    try {
      const response = await httpClient.post<{ success: boolean }>(
        `/admin/users/${userId}/unlink-researcher`
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to unlink researcher from user', { userId, error });
      throw error;
    }
  }

  async resetUserPassword(
    userId: string,
    newPassword: string,
    requirePasswordChange: boolean = true
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await httpClient.post<{
        success: boolean;
        message: string;
      }>(`/admin/users/${userId}/reset-password`, {
        newPassword,
        requirePasswordChange,
      });
      return response.data;
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
  ): Promise<{ success: boolean; message: string } & GeneratePasswordResetTokenResponse> {
    try {
      const response = await httpClient.post<{
        success: boolean;
        data: GeneratePasswordResetTokenResponse & { message: string };
        meta?: { timing: number };
      }>(`/admin/users/${userId}/generate-reset-token`);

      return {
        success: response.data.success,
        resetUrl: response.data.data.resetUrl,
        expiresAt: response.data.data.expiresAt,
        message: response.data.data.message,
      };
    } catch (error) {
      logger.error('Failed to generate password reset token for user', { userId, error });
      throw error;
    }
  }
}

export const adminUserService = new AdminUserService();
