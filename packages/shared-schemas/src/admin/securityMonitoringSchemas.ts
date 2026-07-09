/**
 * Security Monitoring Schemas
 *
 * Zod schemas for security monitoring API responses — session stats, token health, and IP activity.
 */

import { z } from 'zod';
import { dateField } from '../utils/dateFields';

export const sessionOverviewSchema = z.object({
  activeSessions: z.number(),
  expiredAwaitingCleanup: z.number(),
  avgSessionDurationMinutes: z.number(),
});

export const tokenHealthSchema = z.object({
  activeTokens: z.number(),
  expiredTokens: z.number(),
  revokedTokens: z.number(),
  avgLifespanDays: z.number(),
});

export const securityOverviewResponseSchema = z.object({
  sessionOverview: sessionOverviewSchema,
  tokenHealth: tokenHealthSchema,
});

export const activeSessionEntrySchema = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string(),
  userEmail: z.string(),
  userRole: z.string(),
  ipAddress: z.string().nullable(),
  loginTime: dateField,
  lastActivity: dateField,
  deviceInfo: z.string().nullable(),
  userAgent: z.string().nullable(),
});

export const activeSessionsResponseSchema = z.object({
  sessions: z.array(activeSessionEntrySchema),
  total: z.number(),
});

export const ipActivityEntrySchema = z.object({
  ipAddress: z.string(),
  sessionCount: z.number(),
  tokenCount: z.number(),
  uniqueUserCount: z.number(),
  userIds: z.array(z.string()),
});

export const ipActivityResponseSchema = z.object({
  entries: z.array(ipActivityEntrySchema),
});

export const purgeExpiredResponseSchema = z.object({
  purgedSessions: z.number(),
  purgedTokens: z.number(),
});

export type SecurityOverviewResponse = z.infer<typeof securityOverviewResponseSchema>;
export type ActiveSessionEntry = z.infer<typeof activeSessionEntrySchema>;
export type ActiveSessionsResponse = z.infer<typeof activeSessionsResponseSchema>;
export type IpActivityEntry = z.infer<typeof ipActivityEntrySchema>;
export type IpActivityResponse = z.infer<typeof ipActivityResponseSchema>;
export type PurgeExpiredResponse = z.infer<typeof purgeExpiredResponseSchema>;

export const bulkRevokeSessionsRequestSchema = z.object({
  sessionIds: z.array(z.string()).min(1).max(100),
});

export const bulkRevokeResponseSchema = z.object({
  revokedCount: z.number(),
});

export const failedLoginEntrySchema = z.object({
  username: z.string(),
  ipAddress: z.string().nullable(),
  reason: z.string(),
  timestamp: dateField,
});

export const failedLoginsResponseSchema = z.object({
  entries: z.array(failedLoginEntrySchema),
  total: z.number(),
});

export const sessionActivityEntrySchema = z.object({
  hour: z.string(),
  count: z.number(),
});

export const sessionActivityResponseSchema = z.object({
  entries: z.array(sessionActivityEntrySchema),
});

export type BulkRevokeResponse = z.infer<typeof bulkRevokeResponseSchema>;
export type FailedLoginEntry = z.infer<typeof failedLoginEntrySchema>;
export type FailedLoginsResponse = z.infer<typeof failedLoginsResponseSchema>;
export type SessionActivityResponse = z.infer<typeof sessionActivityResponseSchema>;
