/**
 * Audit Log Schemas
 *
 * Audit logging, filters, statistics, retention, and archive schemas.
 */

import { z } from 'zod';

const dateOrString = z.union([z.string().datetime(), z.date()]);

export const auditLogEntrySchema = z.object({
  id: z.string(),
  labId: z.string().optional(),
  userId: z.string(),
  username: z.string(),
  action: z.string(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  details: z.string(),
  timestamp: dateOrString,
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

export type AuditLogEntry = z.infer<typeof auditLogEntrySchema>;

export const auditLogFiltersSchema = z.object({
  limit: z.number().int().min(1).max(1000).optional(),
  offset: z.number().int().min(0).optional(),
  username: z.string().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

export type AuditLogFilters = z.infer<typeof auditLogFiltersSchema>;

export const auditStatisticsSchema = z.object({
  total: z.number().int().min(0),
  today: z.number().int().min(0),
  thisWeek: z.number().int().min(0),
});

export type AuditStatistics = z.infer<typeof auditStatisticsSchema>;

export const retentionMetricsSchema = z.object({
  activeTable: z.object({
    count: z.number().int().min(0),
    oldestEntry: dateOrString.nullable(),
    newestEntry: dateOrString.nullable(),
    retentionDays: z.number().int(),
  }),
  archiveTable: z.object({
    count: z.number().int().min(0),
    oldestEntry: dateOrString.nullable(),
    retentionDays: z.number().int(),
  }),
  nextArchivalDate: dateOrString.nullable(),
  performanceWarning: z.boolean(),
});

export type RetentionMetrics = z.infer<typeof retentionMetricsSchema>;

export const retentionPolicySchema = z.object({
  activeRetentionDays: z.number().int(),
  totalRetentionDays: z.number().int(),
  archiveRetentionDays: z.number().int(),
  enableAutoArchival: z.boolean(),
  activeTableWarningThreshold: z.number().int(),
});

export type RetentionPolicy = z.infer<typeof retentionPolicySchema>;

export const auditArchiveResponseSchema = z.object({
  archived: z.number().int().min(0),
  deleted: z.number().int().min(0),
  message: z.string(),
});

export type AuditArchiveResponse = z.infer<typeof auditArchiveResponseSchema>;

export const paginationSchema = z.object({
  total: z.number().int().min(0),
  limit: z.number().int().min(1),
  offset: z.number().int().min(0),
  hasMore: z.boolean(),
});

export type Pagination = z.infer<typeof paginationSchema>;

export const auditSearchResponseSchema = z.object({
  entries: z.array(auditLogEntrySchema),
  pagination: paginationSchema,
});

export type AuditSearchResponse = z.infer<typeof auditSearchResponseSchema>;

// Response data schemas

export const auditLogDataSchema = z.object({
  entries: z.array(auditLogEntrySchema),
  pagination: paginationSchema,
});

export type AuditLogData = z.infer<typeof auditLogDataSchema>;

export const entityHistoryResponseSchema = z.object({
  entries: z.array(auditLogEntrySchema),
  entityType: z.string(),
  entityId: z.string(),
});

export type EntityHistoryResponse = z.infer<typeof entityHistoryResponseSchema>;
