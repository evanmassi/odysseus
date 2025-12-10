import { httpClient } from '@infra/api/httpClient';

import type { UserDisplayInfo } from '@odysseus/shared-schemas';

/**
 * User Lookup Service
 *
 * Provides user display info lookup for any authenticated user.
 * Used by storage management to resolve ownership display.
 */
export class UserLookupService {
  /**
   * Look up display info for multiple users by their IDs
   * @param userIds - Array of user IDs to look up
   * @returns Array of user display info objects
   */
  async lookupUsers(userIds: string[]): Promise<UserDisplayInfo[]> {
    if (userIds.length === 0) return [];

    const response = await httpClient.post<{
      success: boolean;
      users: UserDisplayInfo[];
    }>('/users/lookup', { userIds });

    return response.data.users;
  }

  /**
   * Get all active, approved users for sharing/assignment
   * @returns Array of user display info objects
   */
  async listActiveUsers(): Promise<UserDisplayInfo[]> {
    const response = await httpClient.get<{
      success: boolean;
      users: UserDisplayInfo[];
    }>('/users/list');

    return response.data.users;
  }
}

export const userLookupService = new UserLookupService();
