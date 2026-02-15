/**
 * Admin Domain Schemas
 *
 * Security configuration, user management, and system monitoring schemas.
 * Used by admin settings interface and security enforcement systems.
 */

import { z } from 'zod';

/**
 * Security Configuration Schema
 *
 * Controls authentication, session management, rate limiting, and audit logging.
 * These settings are enforced by backend security systems.
 */
export const securityConfigSchema = z.object({
  // Authentication
  useEnhancedAuth: z.boolean(),
  requireStrongPasswords: z.boolean(),
  passwordMinLength: z.number().int().min(4).max(128),
  passwordRequireSpecialChars: z.boolean(),

  // Session Management
  accessTokenExpiryMinutes: z.number().int().min(5).max(60).default(15), // JWT access token lifetime (5-60 min)
  sessionTimeoutMinutes: z.number().int().min(5).max(10080), // Idle timeout - logout after inactivity (5 min to 1 week)
  idleWarningMinutes: z.number().int().min(1).max(60).default(5), // Warning before idle timeout
  absoluteSessionTimeoutHours: z.number().int().min(1).max(720).default(168), // Force re-login (max 30 days)
  maxConcurrentSessions: z.number().int().min(1).max(100),

  // Rate Limiting
  enableRateLimiting: z.boolean(),
  loginAttemptsPerMinute: z.number().int().min(1).max(1000),
  lockoutDurationMinutes: z.number().int().min(1).max(1440), // 1 min to 24 hours

  // Admin Features
  enableAdminControls: z.boolean(),

  // Audit & Monitoring
  enableDetailedLogging: z.boolean(),
  logFailedAttempts: z.boolean(),
});

export type SecurityConfig = z.infer<typeof securityConfigSchema>;

/**
 * Default security configuration
 * Balanced defaults suitable for most deployments
 */
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  useEnhancedAuth: false,
  requireStrongPasswords: false,
  passwordMinLength: 8,
  passwordRequireSpecialChars: false,
  accessTokenExpiryMinutes: 15, // JWT access token lifetime (auto-refreshes transparently)
  sessionTimeoutMinutes: 480, // 8 hours idle timeout
  idleWarningMinutes: 5, // Show warning 5 minutes before idle timeout
  absoluteSessionTimeoutHours: 168, // Force re-login after 7 days
  maxConcurrentSessions: 3,
  enableRateLimiting: false,
  loginAttemptsPerMinute: 10,
  lockoutDurationMinutes: 15,
  enableAdminControls: true,
  enableDetailedLogging: true,
  logFailedAttempts: true,
} as const;

/**
 * Security configuration update schema
 * Partial updates allowed to change individual settings
 */
export const updateSecurityConfigSchema = securityConfigSchema.partial();

export type UpdateSecurityConfig = z.infer<typeof updateSecurityConfigSchema>;

/**
 * Admin User Schema
 *
 * Extended user information for admin user management interface
 */
export const adminUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().email().optional(),
  emailVerified: z.boolean().optional(),
  role: z.enum(['admin', 'user']),
  personId: z.string().nullable(),
  researcherId: z.string().nullable(),
  createdAt: z.union([z.string().datetime(), z.date()]),
  lastActivity: z.union([z.string().datetime(), z.date()]).optional(),
  isActive: z.boolean().default(true),
  isDemo: z.boolean().default(false),
  status: z.enum(['pending', 'approved', 'rejected']).default('approved'),
  requirePasswordChange: z.boolean().optional().default(false),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  tubeCount: z.number().int().min(0).optional(),
});

export type AdminUser = z.infer<typeof adminUserSchema>;

/**
 * System Metrics Schema
 *
 * High-level statistics about the system state
 */
export const systemMetricsSchema = z.object({
  totalTubes: z.number().int().min(0),
  totalUsers: z.number().int().min(0),
  totalResearchers: z.number().int().min(0),
  lastBackup: z.union([z.string().datetime(), z.date()]),
  databaseSize: z.number().optional(), // bytes
  activeUsersLast24h: z.number().int().min(0).optional(),
});

export type SystemMetrics = z.infer<typeof systemMetricsSchema>;

/**
 * Sync Status Schema
 *
 * Firebase synchronization status and configuration
 */
export const syncStatusSchema = z.object({
  enabled: z.boolean(),
  firebase: z.boolean(),
  workspaceId: z.string().optional(),
  lastSyncAt: z.union([z.string().datetime(), z.date()]).optional(),
});

export type SyncStatus = z.infer<typeof syncStatusSchema>;

/**
 * Audit Log Entry Schema
 *
 * Records of user actions for security and compliance
 */
export const auditLogEntrySchema = z.object({
  id: z.string(),
  userId: z.string(),
  username: z.string(),
  action: z.string(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  details: z.string(),
  timestamp: z.union([z.string().datetime(), z.date()]),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

export type AuditLogEntry = z.infer<typeof auditLogEntrySchema>;

/**
 * Audit Log Query Filters Schema
 *
 * Filter parameters for querying audit logs
 */
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

/**
 * User Session Schema
 *
 * Active user session information for session management
 */
export const userSessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  refreshToken: z.string(),
  deviceInfo: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  createdAt: z.union([z.string().datetime(), z.date()]),
  lastUsedAt: z.union([z.string().datetime(), z.date()]),
  expiresAt: z.union([z.string().datetime(), z.date()]),
  isActive: z.boolean(),
});

export type UserSession = z.infer<typeof userSessionSchema>;

/**
 * API Response Schemas
 */

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

export const syncStatusResponseSchema = z.object({
  success: z.boolean(),
  sync: syncStatusSchema,
});

export type SyncStatusResponse = z.infer<typeof syncStatusResponseSchema>;

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

/**
 * Demo Management Schemas
 *
 * Schemas for managing demo users and demo tanks in the admin panel
 */

// Request to set a user's demo status
export const setUserDemoStatusSchema = z.object({
  isDemo: z.boolean(),
});

export type SetUserDemoStatus = z.infer<typeof setUserDemoStatusSchema>;

// Request to set a tank's demo status
export const setTankDemoStatusSchema = z.object({
  isDemo: z.boolean(),
});

export type SetTankDemoStatus = z.infer<typeof setTankDemoStatusSchema>;

// Response for demo users list
export const demoUsersResponseSchema = z.object({
  success: z.boolean(),
  users: z.array(adminUserSchema),
});

export type DemoUsersResponse = z.infer<typeof demoUsersResponseSchema>;

// Response for demo tanks list (using TankConfiguration from storage schemas)
export const demoTanksResponseSchema = z.object({
  success: z.boolean(),
  tanks: z.array(z.object({
    id: z.string(),
    name: z.string(),
    location: z.string(),
    isDemo: z.boolean(),
    tubeCount: z.number().int().min(0),
  })),
});

export type DemoTanksResponse = z.infer<typeof demoTanksResponseSchema>;

// Response for demo reset operation
export const demoResetResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  deletedTubes: z.number().int().min(0),
});

export type DemoResetResponse = z.infer<typeof demoResetResponseSchema>;
