/**
 * User Lookup Service
 *
 * Provides user display info lookup for any authenticated user.
 */
import { userDisplayInfoSchema, type UserDisplayInfo } from '@odysseus/shared-schemas';
import { z } from 'zod';

import { httpClient } from '@infra/api';

export class UserLookupService {
  async lookupUsers(userIds: string[]): Promise<UserDisplayInfo[]> {
    if (userIds.length === 0) return [];

    const data = await httpClient.postData(
      '/users/lookup',
      { userIds },
      z.object({ users: z.array(userDisplayInfoSchema) })
    );
    return data.users;
  }

  async listActiveUsers(): Promise<UserDisplayInfo[]> {
    const data = await httpClient.getData(
      '/users/list',
      z.object({ users: z.array(userDisplayInfoSchema) })
    );
    return data.users;
  }
}

export const userLookupService = new UserLookupService();
