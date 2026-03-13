/**
 * User Lookup Service
 *
 * Provides user display info lookup for any authenticated user.
 */
import { httpClient } from '@infra/api';

import type { UserDisplayInfo } from '@odysseus/shared-schemas';

export class UserLookupService {
  async lookupUsers(userIds: string[]): Promise<UserDisplayInfo[]> {
    if (userIds.length === 0) return [];

    const response = await httpClient.post<{
      success: boolean;
      data: { users: UserDisplayInfo[] };
    }>('/users/lookup', { userIds });

    return response.data.data.users;
  }

  async listActiveUsers(): Promise<UserDisplayInfo[]> {
    const response = await httpClient.get<{
      success: boolean;
      data: { users: UserDisplayInfo[] };
    }>('/users/list');

    return response.data.data.users;
  }
}

export const userLookupService = new UserLookupService();
