/**
 * Audit Log Schemas
 *
 * Audit logging, filters, retention, and archive schemas.
 */

import { z } from 'zod';
import { dateField, nullableDateField } from '../utils/dateFields';

export const auditLogEntrySchema = z.object({
  id: z.string(),
  labId: z.string().optional(),
  userId: z.string().optional(),
  username: z.string(),
  action: z.string(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  details: z.union([z.string(), z.record(z.string(), z.unknown())]),
  timestamp: dateField,
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

export type AuditLogEntry = z.infer<typeof auditLogEntrySchema>;

export const auditLogFiltersSchema = z.object({
  limit: z.number().int().min(1).max(1000).optional(),
  offset: z.number().int().min(0).optional(),
  username: z.string().optional(),
  action: z.array(z.string()).optional(),
  entityType: z.array(z.string()).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

export type AuditLogFilters = z.infer<typeof auditLogFiltersSchema>;

/**
 * Audit search query params (bounds the request to prevent unbounded SQL LIMIT).
 *
 * `action`/`entityType` arrive as repeated query params, so Express delivers a
 * single string or a string array; both are accepted. `includeArchive` stays a
 * string so the controller's `=== 'true'` check keeps working.
 */
export const auditSearchQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  username: z.string().optional(),
  action: z.union([z.string(), z.array(z.string())]).optional(),
  entityType: z.union([z.string(), z.array(z.string())]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  includeArchive: z.enum(['true', 'false']).optional(),
});

export type AuditSearchQuery = z.infer<typeof auditSearchQuerySchema>;

export const retentionMetricsSchema = z.object({
  activeTable: z.object({
    count: z.number().int().min(0),
    oldestEntry: nullableDateField,
    newestEntry: nullableDateField,
    retentionDays: z.number().int(),
  }),
  archiveTable: z.object({
    count: z.number().int().min(0),
    oldestEntry: nullableDateField,
    retentionDays: z.number().int(),
  }),
  nextArchivalDate: nullableDateField,
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

export const retentionMetricsDataSchema = z.object({
  metrics: retentionMetricsSchema,
});

export const retentionPolicyDataSchema = z.object({
  policy: retentionPolicySchema,
});
