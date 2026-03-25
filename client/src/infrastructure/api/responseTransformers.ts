/**
 * API Response Transformation Layer
 *
 * Converts date-string fields in API responses to native Date objects at the HTTP boundary.
 */

import { logger } from '@infra/logger';
import { env } from '@shared/config';

const DATE_FIELD_PATTERNS = [
  /.*[Dd]ate.*$/, // createdDate, lastDate, updateDate
  /.*[Aa]t$/, // createdAt, updatedAt, lastActivity
  /.*[Ee]xpiry$/, // tokenExpiry, accessTokenExpiry
  /.*[Ee]xpires$/, // expires, sessionExpires
  /.*[Tt]imestamp$/, // timestamp, lastTimestamp
];

const DATE_FIELD_EXCLUSIONS = [
  /.*executionTime$/, // API execution time in milliseconds
  /.*responseTime$/, // Response time metrics
  /.*duration$/, // Duration values
  /.*timeout$/, // Timeout values
  /.*interval$/, // Interval values
  /.*delay$/, // Delay values
];

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
  StorageResponse: new Set(['createdAt', 'updatedAt']), // Also applied to nested configs (labs, tanks, racks, boxes)
  UserSettings: new Set([]),
  UserSettingsResponse: new Set([]),
  AdminUser: new Set(['createdAt', 'lastActivity']),
  SystemMetrics: new Set(['lastBackup']),
  AuditLogEntry: new Set(['timestamp']),
  SocketEventPayload: new Set(['timestamp', 'updatedAt']),
  ConfigurationUpdateEvent: new Set(['timestamp', 'updatedAt']),
  SecurityConfigResponse: new Set([]),
  AuditStatistics: new Set(['timestamp']),
  AuditRetention: new Set(['nextArchivalDate']),
  LookupValue: new Set(['createdAt', 'updatedAt']),
  InviteCode: new Set(['createdAt', 'expiresAt']),
  Donor: new Set(['createdAt', 'updatedAt']),
  SessionInfo: new Set([]),
  UserLookup: new Set([]),
  Heartbeat: new Set([]),
  AuthGenericResponse: new Set([]),
};

function isDateField(key: string, typeName?: string): boolean {
  if (DATE_FIELD_EXCLUSIONS.some(pattern => pattern.test(key))) {
    return false;
  }

  if (typeName && EXPLICIT_DATE_FIELDS[typeName] !== undefined) {
    return EXPLICIT_DATE_FIELDS[typeName].has(key);
  }

  const matched = DATE_FIELD_PATTERNS.some(pattern => pattern.test(key));

  if (env.isDev() && matched) {
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Debug logging: empty typeName should display as 'unknown'
    logger.warn(
      `Using regex fallback for field "${key}" in type "${typeName ?? 'unknown'}". Consider adding explicit mapping to EXPLICIT_DATE_FIELDS.`
    );
  }

  return matched;
}

function isValidDateValue(value: unknown): boolean {
  return typeof value === 'string' || typeof value === 'number';
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;

  if (value instanceof Date) return value;

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);

    if (isNaN(parsed.getTime())) {
      logger.warn(`Invalid date value: ${value}`);
      return null;
    }

    return parsed;
  }

  logger.warn(`Unparseable date type: ${typeof value}`, { value });
  return null;
}

function transformObject(obj: unknown, typeName?: string): unknown {
  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => transformObject(item, typeName));
  }

  if (typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj;

  const transformed: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (isDateField(key, typeName) && isValidDateValue(value)) {
      transformed[key] = parseDate(value);
    } else if (value && typeof value === 'object') {
      transformed[key] = transformObject(value, typeName);
    } else {
      transformed[key] = value;
    }
  }

  return transformed;
}

/** Generic default is `any` for backward compatibility — callers should provide explicit type parameter. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Backward compatibility: default generic allows gradual migration to typed calls
export function transformApiResponse<T = any>(response: unknown, typeName?: string): T {
  const transformed = transformObject(response, typeName);
  return transformed as T;
}

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
