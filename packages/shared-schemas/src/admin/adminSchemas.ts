/**
 * Admin Domain Schemas
 *
 * Security configuration, user management, and system monitoring schemas.
 */

import { z } from 'zod';

const dateOrString = z.union([z.string().datetime(), z.date()]);

export const securityConfigSchema = z.object({
  // Authentication
  useEnhancedAuth: z.boolean(),
  requireStrongPasswords: z.boolean(),
  passwordMinLength: z.number().int().min(4).max(128),
  passwordRequireSpecialChars: z.boolean(),

  // Session Management
  accessTokenExpiryMinutes: z.number().int().min(5).max(60).default(15),
  sessionTimeoutMinutes: z.number().int().min(5).max(10080),
  idleWarningMinutes: z.number().int().min(1).max(60).default(5),
  absoluteSessionTimeoutHours: z.number().int().min(1).max(720).default(168),
  maxConcurrentSessions: z.number().int().min(1).max(100),

  // Rate Limiting
  enableRateLimiting: z.boolean(),
  loginAttemptsPerMinute: z.number().int().min(1).max(1000),
  lockoutDurationMinutes: z.number().int().min(1).max(1440),

  // Admin Features
  enableAdminControls: z.boolean(),

  // Audit & Monitoring
  enableDetailedLogging: z.boolean(),
  logFailedAttempts: z.boolean(),
});

export type SecurityConfig = z.infer<typeof securityConfigSchema>;

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  useEnhancedAuth: false,
  requireStrongPasswords: false,
  passwordMinLength: 8,
  passwordRequireSpecialChars: false,
  accessTokenExpiryMinutes: 15,
  sessionTimeoutMinutes: 480, // 8 hours
  idleWarningMinutes: 5,
  absoluteSessionTimeoutHours: 168, // 7 days
  maxConcurrentSessions: 3,
  enableRateLimiting: false,
  loginAttemptsPerMinute: 10,
  lockoutDurationMinutes: 15,
  enableAdminControls: true,
  enableDetailedLogging: true,
  logFailedAttempts: true,
} as const;

export const updateSecurityConfigSchema = securityConfigSchema.partial();

export type UpdateSecurityConfig = z.infer<typeof updateSecurityConfigSchema>;

export const adminUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().email().optional(),
  emailVerified: z.boolean().optional(),
  role: z.enum(['system_admin', 'lab_admin', 'user']),
  labId: z.string().optional(),
  personId: z.string().nullable(),
  researcherId: z.string().nullable(),
  createdAt: dateOrString,
  lastActivity: dateOrString.optional(),
  isActive: z.boolean().default(true),
  isDemo: z.boolean().default(false),
  status: z.enum(['pending', 'approved', 'rejected', 'deactivated', 'suspended']).default('approved'),
  requirePasswordChange: z.boolean().optional().default(false),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  tubeCount: z.number().int().min(0).optional(),
});

export type AdminUser = z.infer<typeof adminUserSchema>;

export const systemMetricsSchema = z.object({
  totalTubes: z.number().int().min(0),
  totalUsers: z.number().int().min(0),
  totalResearchers: z.number().int().min(0),
  lastBackup: dateOrString,
  databaseSize: z.number().optional(), // bytes
  activeUsersLast24h: z.number().int().min(0).optional(),
});

export type SystemMetrics = z.infer<typeof systemMetricsSchema>;

/** Records user actions for security and compliance auditing. */
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

// API Response Schemas

export const securityConfigResponseSchema = z.object({
  success: z.boolean(),
  config: securityConfigSchema,
});

export type SecurityConfigResponse = z.infer<typeof securityConfigResponseSchema>;

export const adminUsersResponseSchema = z.object({
  success: z.boolean(),
  users: z.array(adminUserSchema),
});

export type AdminUsersResponse = z.infer<typeof adminUsersResponseSchema>;

export const systemMetricsResponseSchema = z.object({
  success: z.boolean(),
  data: systemMetricsSchema,
});

export type SystemMetricsResponse = z.infer<typeof systemMetricsResponseSchema>;

export const auditLogResponseSchema = z.object({
  success: z.boolean(),
  entries: z.array(auditLogEntrySchema),
  pagination: z.object({
    total: z.number().int().min(0),
    limit: z.number().int().min(1),
    offset: z.number().int().min(0),
    hasMore: z.boolean(),
  }),
});

export type AuditLogResponse = z.infer<typeof auditLogResponseSchema>;
