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

import type {
  AdminUser,
  UserRole,
  GeneratePasswordResetTokenResponse,
} from '@odysseus/shared-schemas';

export class AdminUserService {
  async getUsers(): Promise<AdminUser[]> {
    const data = await httpClient.getData('/admin/users', adminUsersListSchema);
    return data.users;
  }

  async updateUserRole(userId: string, newRole: UserRole): Promise<void> {
    await httpClient.putData(`/admin/users/${userId}/role`, { role: newRole }, emptyResponseSchema);
  }

  async deleteUser(userId: string): Promise<void> {
    await httpClient.deleteData(`/admin/users/${userId}`);
  }

  async deactivateUser(userId: string): Promise<void> {
    await httpClient.post(`/admin/users/${userId}/deactivate`);
  }

  async activateUser(userId: string): Promise<void> {
    await httpClient.post(`/admin/users/${userId}/activate`);
  }

  async linkResearcherToUser(userId: string, researcherId: string): Promise<void> {
    await httpClient.post(`/admin/users/${userId}/link-researcher`, { researcherId });
  }

  async unlinkResearcherFromUser(userId: string): Promise<void> {
    await httpClient.post(`/admin/users/${userId}/unlink-researcher`);
  }

  async resetUserPassword(
    userId: string,
    newPassword: string,
    requirePasswordChange: boolean = true
  ): Promise<void> {
    await httpClient.post(`/admin/users/${userId}/reset-password`, {
      newPassword,
      requirePasswordChange,
    });
  }

  /** Returns a reset URL with an embedded token for the user to set their own password (15-minute expiry). */
  async generatePasswordResetToken(userId: string): Promise<GeneratePasswordResetTokenResponse> {
    return await httpClient.postData(
      `/admin/users/${userId}/generate-reset-token`,
      undefined,
      generatePasswordResetTokenResponseSchema
    );
  }
}

export const adminUserService = new AdminUserService();
