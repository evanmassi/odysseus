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

// Active users list response (public endpoint - any authenticated user)
export const activeUsersListResponseSchema = z.object({
  success: z.boolean(),
  users: z.array(userDisplayInfoSchema),
});

export type ActiveUsersListResponse = z.infer<typeof activeUsersListResponseSchema>;
