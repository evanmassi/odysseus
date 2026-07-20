/**
 * Security Monitoring Schemas
 *
 * Request and response schemas for the admin security monitoring API.
 */

import { z } from 'zod';
import { dateField } from '../utils/dateFields';

const sessionOverviewSchema = z.object({
  activeSessions: z.number(),
  expiredAwaitingCleanup: z.number(),
  avgSessionDurationMinutes: z.number(),
});

const tokenHealthSchema = z.object({
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

/**
 * Query bounds for the failed-logins and session-activity monitoring endpoints.
 *
 * `hours` caps at one year; dates stay strings so the controller's `new Date(...)`
 * consumption is unchanged.
 */
export const securityMonitoringQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
  hours: z.coerce.number().int().min(1).max(8760).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type SecurityMonitoringQuery = z.infer<typeof securityMonitoringQuerySchema>;

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

const sessionActivityEntrySchema = z.object({
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
