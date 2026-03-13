/**
 * User Session Schemas
 *
 * Describes active user session records for session management.
 */

import { z } from 'zod';

const dateOrString = z.union([z.string().datetime(), z.date()]);

export const userSessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  deviceInfo: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  createdAt: dateOrString,
  lastUsedAt: dateOrString,
  expiresAt: dateOrString,
  isActive: z.boolean(),
});

export type UserSession = z.infer<typeof userSessionSchema>;

// Response schemas

export const activeSessionSchema = z.object({
  id: z.string(),
  deviceInfo: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  createdAt: z.date(),
  lastUsedAt: z.date(),
  expiresAt: z.date(),
  isCurrentSession: z.boolean(),
});

export type ActiveSession = z.infer<typeof activeSessionSchema>;

export const revokeAllResponseSchema = z.object({
  message: z.string(),
  revokedCount: z.number(),
});

export type RevokeAllResponse = z.infer<typeof revokeAllResponseSchema>;
