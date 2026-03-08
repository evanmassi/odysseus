/**
 * API Response Transformation Layer
 *
 * Automatic JSON deserialization with date field detection.
 *
 * Architecture principles:
 * - API layer owns serialization/deserialization
 * - Business logic works with proper types
 * - Single responsibility: transform at API boundary
 */

import { env } from '@shared/config';
import { logger } from '@shared/infrastructure/logger';

// Date field detection using naming patterns and explicit mappings
const DATE_FIELD_PATTERNS = [
  /.*[Dd]ate.*$/, // createdDate, lastDate, updateDate
  /.*[Aa]t$/, // createdAt, updatedAt, lastActivity
  /.*[Ee]xpiry$/, // tokenExpiry, accessTokenExpiry
  /.*[Ee]xpires$/, // expires, sessionExpires
  /.*[Tt]imestamp$/, // timestamp, lastTimestamp
];

// Exclude fields that match date patterns but are NOT dates
const DATE_FIELD_EXCLUSIONS = [
  /.*executionTime$/, // API execution time in milliseconds
  /.*responseTime$/, // Response time metrics
  /.*duration$/, // Duration values
  /.*timeout$/, // Timeout values
  /.*interval$/, // Interval values
  /.*delay$/, // Delay values
];

/**
 * Explicit date field mappings for critical types
 */
const EXPLICIT_DATE_FIELDS: Record<string, Set<string>> = {
  TokenPair: new Set(['accessTokenExpiry', 'refreshTokenExpiry']),
  RefreshResponse: new Set(['accessTokenExpiry']),
  LoginResponse: new Set(['createdAt', 'accessTokenExpiry', 'refreshTokenExpiry', 'timestamp']),
  User: new Set(['lastActivity']),
  Person: new Set(['createdAt', 'updatedAt']),
  ActiveSession: new Set(['createdAt', 'lastUsedAt', 'expiresAt']),
  TubeData: new Set(['createdAt', 'updatedAt', 'date']),
  Researcher: new Set(['createdAt', 'updatedAt']),
  TankConfiguration: new Set(['createdAt', 'updatedAt']),
  LabConfiguration: new Set(['createdAt', 'updatedAt']),
  ConfigurationResponse: new Set(['createdAt', 'updatedAt']), // Handles nested configs (labs, tanks, racks, boxes)
  UserSettings: new Set([]), // User settings has no date fields
  UserSettingsResponse: new Set([]), // Response envelope for user settings
  AdminUser: new Set(['createdAt', 'lastActivity']),
  SystemMetrics: new Set(['lastBackup']),
  AuditLogEntry: new Set(['timestamp']),
  SocketEventPayload: new Set(['timestamp', 'updatedAt']), // Socket.IO configuration_updated events
  ConfigurationUpdateEvent: new Set(['timestamp', 'updatedAt']), // Socket.IO configuration events
  // Admin endpoint responses
  SecurityConfigResponse: new Set([]), // Security config has no date fields
  AuditStatistics: new Set(['timestamp']), // Nested recentActivity items have timestamps
  AuditRetention: new Set(['nextArchivalDate']), // Retention metrics may have next archival date
  LookupValue: new Set(['createdAt', 'updatedAt']),
  // Public endpoint responses
  SessionInfo: new Set([]), // Session info has no date fields in data
  UserLookup: new Set([]), // User lookup/list has no date fields
  Heartbeat: new Set([]), // Heartbeat response has no date fields
  AuthGenericResponse: new Set([]), // Generic auth endpoints (first-time, password-requirements, etc.) have no date fields
};

// Date field detection with exclusion patterns to prevent false positives
function isDateField(key: string, typeName?: string): boolean {
  // Check exclusions first - prevents false positives
  if (DATE_FIELD_EXCLUSIONS.some(pattern => pattern.test(key))) {
    return false;
  }

  // Check explicit mapping (most reliable)
  if (typeName && EXPLICIT_DATE_FIELDS[typeName] !== undefined) {
    // Type has explicit mapping - trust it completely
    return EXPLICIT_DATE_FIELDS[typeName].has(key);
  }

  // Fallback to pattern matching (legacy behavior)
  const matched = DATE_FIELD_PATTERNS.some(pattern => pattern.test(key));

  // Warn in development when using regex fallback
  if (env.isDev() && matched) {
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Debug logging: empty typeName should display as 'unknown'
    logger.warn(
      `Using regex fallback for field "${key}" in type "${typeName ?? 'unknown'}". Consider adding explicit mapping to EXPLICIT_DATE_FIELDS.`
    );
  }

  return matched;
}

// Only transform strings and numbers to dates, preserving booleans/arrays/objects
function isValidDateValue(value: unknown): boolean {
  // Only strings and numbers can be transformed to dates
  // Explicitly exclude booleans, null, objects, arrays
  return typeof value === 'string' || typeof value === 'number';
}

/**
 * Safe date parsing with validation
 * Handles multiple date formats from different APIs
 */
function parseDate(value: unknown): Date | null {
  if (!value) return null;

  // Already a Date object
  if (value instanceof Date) return value;

  // Parse string/number to Date
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);

    // Validate parsed date
    if (isNaN(parsed.getTime())) {
      logger.warn(`Invalid date value: ${value}`);
      return null;
    }

    return parsed;
  }

  logger.warn(`Unparseable date type: ${typeof value}`, { value });
  return null;
}

// Deep transform with date field conversion, recursively handling nested objects and arrays
function transformObject(obj: unknown, typeName?: string): unknown {
  if (obj === null || obj === undefined) return obj;

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => transformObject(item, typeName));
  }

  // Handle primitive types - PRESERVE EXACTLY AS-IS
  if (typeof obj !== 'object') return obj;

  // Handle Date objects - PRESERVE AS-IS (already transformed)
  if (obj instanceof Date) return obj;

  // Transform object properties
  const transformed: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Only transform if it's a date field AND a string/number
    if (isDateField(key, typeName) && isValidDateValue(value)) {
      // Transform date field
      const parsedDate = parseDate(value);
      transformed[key] = parsedDate;
    } else if (value && typeof value === 'object') {
      // Recursively transform nested objects
      transformed[key] = transformObject(value, typeName);
    } else {
      // Preserve primitive values exactly as-is (boolean, string, number, null)
      transformed[key] = value;
    }
  }

  return transformed;
}

/**
 * Main response transformer for HTTP client integration
 *
 * @param response - Raw API response data
 * @param typeName - Optional type hint for explicit field mapping
 * @returns Transformed response with proper Date objects
 *
 * Note: Generic default is `any` for backward compatibility with existing code.
 * Callers should provide explicit type parameter for type safety.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Backward compatibility: default generic allows gradual migration to typed calls
export function transformApiResponse<T = any>(response: unknown, typeName?: string): T {
  const transformed = transformObject(response, typeName);
  return transformed as T;
}

/**
 * Type-specific transformers for common API responses
 * Provides explicit type safety for critical business objects
 */
export const ResponseTransformers = {
  RefreshResponse: (data: unknown) => transformApiResponse(data, 'RefreshResponse'),
  LoginResponse: (data: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Type assertion needed for nested property access before transformation
    const transformed = transformApiResponse(data, 'LoginResponse') as any;
    // Tokens may be at transformed.tokens (direct) or transformed.data.tokens (API wrapper)
    if (transformed.data?.tokens) {
      transformed.data.tokens = transformApiResponse(transformed.data.tokens, 'TokenPair');
    } else if (transformed.tokens) {
      transformed.tokens = transformApiResponse(transformed.tokens, 'TokenPair');
    }
    return transformed;
  },
  Person: (data: unknown) => transformApiResponse(data, 'Person'),
  ActiveSession: (data: unknown) => transformApiResponse(data, 'ActiveSession'),
  Researcher: (data: unknown) => transformApiResponse(data, 'Researcher'),
  AdminUser: (data: unknown) => transformApiResponse(data, 'AdminUser'),
  SystemMetrics: (data: unknown) => transformApiResponse(data, 'SystemMetrics'),
  AuditLogEntry: (data: unknown) => transformApiResponse(data, 'AuditLogEntry'),
} as const;
