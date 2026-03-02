/**
 * User Lookup Schemas
 *
 * Request/response types for the public user lookup endpoint.
 * Used by any authenticated user to resolve user display info.
 */

import { z } from 'zod';

// Request schema - list of user IDs to look up
export const userLookupRequestSchema = z.object({
  userIds: z.array(z.string()).min(1).max(100), // Limit to prevent abuse
});

export type UserLookupRequest = z.infer<typeof userLookupRequestSchema>;

// Response item - minimal display info only
export const userDisplayInfoSchema = z.object({
  id: z.string(),
  username: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  hasResearcher: z.boolean().optional(),
});

export type UserDisplayInfo = z.infer<typeof userDisplayInfoSchema>;

// Response schema
export const userLookupResponseSchema = z.object({
  success: z.boolean(),
  users: z.array(userDisplayInfoSchema),
});

export type UserLookupResponse = z.infer<typeof userLookupResponseSchema>;

// Active users list response (public endpoint - any authenticated user)
export const activeUsersListResponseSchema = z.object({
  success: z.boolean(),
  users: z.array(userDisplayInfoSchema),
});

export type ActiveUsersListResponse = z.infer<typeof activeUsersListResponseSchema>;
