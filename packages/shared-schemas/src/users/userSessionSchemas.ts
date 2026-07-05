/**
 * User Session Schemas
 *
 * Describes active user session records for session management.
 */

import { z } from 'zod';
import { dateField } from '../utils/dateFields';

export const userSessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  deviceInfo: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  createdAt: dateField,
  lastUsedAt: dateField,
  expiresAt: dateField,
  isActive: z.boolean(),
});

export type UserSession = z.infer<typeof userSessionSchema>;

// Response schemas

export const activeSessionSchema = z.object({
  id: z.string(),
  deviceInfo: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  createdAt: dateField,
  lastUsedAt: dateField,
  expiresAt: dateField,
  isCurrentSession: z.boolean(),
});

export type ActiveSession = z.infer<typeof activeSessionSchema>;
