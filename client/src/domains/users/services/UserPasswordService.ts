/**
 * Password Management Service
 *
 * Handles password change for authenticated users.
 */
import { messageResponseSchema } from '@odysseus/shared-schemas';

import { httpClient } from '@infra/api';

export class UserPasswordService {
  static async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await httpClient.postData(
      '/auth/change-password',
      { currentPassword, newPassword },
      messageResponseSchema
    );
  }
}
