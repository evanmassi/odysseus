/**
 * Password Management Service
 *
 * Handles password change for authenticated users.
 */
import { z } from 'zod';

import { httpClient } from '@infra/api/httpClient';

const changePasswordResponseSchema = z.object({
  message: z.string(),
});

export class UserPasswordService {
  static async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await httpClient.postData(
      '/auth/change-password',
      { currentPassword, newPassword },
      changePasswordResponseSchema
    );
  }
}
