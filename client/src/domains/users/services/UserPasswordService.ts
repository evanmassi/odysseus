/**
 * UserPasswordService - Password management operations
 *
 * Handles password change for authenticated users.
 */

import { z } from 'zod';

import { httpClient } from '@infra/api/httpClient';

const changePasswordResponseSchema = z.object({
  message: z.string(),
});

export class UserPasswordService {
  /**
   * Change current user's password
   *
   * @param currentPassword - User's current password for verification
   * @param newPassword - New password (must meet security requirements)
   */
  static async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await httpClient.postData(
      '/auth/change-password',
      { currentPassword, newPassword },
      changePasswordResponseSchema
    );
  }
}
