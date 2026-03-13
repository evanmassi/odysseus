/**
 * User Lookup Schemas
 *
 * Schemas for resolving user display info via the public lookup endpoint.
 */

import { z } from 'zod';

export const userLookupRequestSchema = z.object({
  userIds: z.array(z.string()).min(1).max(100), // Limit to prevent abuse
});

export type UserLookupRequest = z.infer<typeof userLookupRequestSchema>;

export const userDisplayInfoSchema = z.object({
  id: z.string(),
  username: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  hasResearcher: z.boolean().optional(),
});

export type UserDisplayInfo = z.infer<typeof userDisplayInfoSchema>;

export const usersLookupListSchema = z.object({
  users: z.array(userDisplayInfoSchema),
});

export type UsersLookupList = z.infer<typeof usersLookupListSchema>;
