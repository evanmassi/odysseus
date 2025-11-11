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

// Date field detection using naming patterns and explicit mappings
const DATE_FIELD_PATTERNS = [
  /.*[Dd]ate.*$/,        // createdDate, lastDate, updateDate
  /.*[Aa]t$/,           // createdAt, updatedAt, lastActivity
  /.*[Ee]xpiry$/,       // tokenExpiry, accessTokenExpiry
  /.*[Ee]xpires$/,      // expires, sessionExpires
  /.*[Tt]imestamp$/     // timestamp, lastTimestamp
];

// Exclude fields that match date patterns but are NOT dates
const DATE_FIELD_EXCLUSIONS = [
  /.*executionTime$/,    // API execution time in milliseconds
  /.*responseTime$/,     // Response time metrics
  /.*duration$/,         // Duration values
  /.*timeout$/,          // Timeout values
  /.*interval$/,         // Interval values
  /.*delay$/,            // Delay values
];

/**
 * Explicit date field mappings for critical types
 * Ensures bulletproof transformation for known types
 */
const EXPLICIT_DATE_FIELDS: Record<string, Set<string>> = {
  'TokenPair': new Set(['accessTokenExpiry', 'refreshTokenExpiry']),
  'RefreshResponse': new Set(['accessTokenExpiry']),
  'LoginResponse': new Set(['createdAt', 'accessTokenExpiry', 'refreshTokenExpiry', 'timestamp']),
  'User': new Set(['lastActivity']),
  'Person': new Set(['createdAt', 'updatedAt']),
  'ActiveSession': new Set(['createdAt', 'lastUsedAt', 'expiresAt']),
  'TubeData': new Set(['createdAt', 'updatedAt', 'date']),
  'Researcher': new Set(['createdAt', 'updatedAt']),
  'TankConfiguration': new Set(['createdAt', 'updatedAt']),
  'LabConfiguration': new Set(['createdAt', 'updatedAt']),
  'ConfigurationResponse': new Set(['createdAt', 'updatedAt']), // Handles nested configs (labs, tanks, racks, boxes)
  'UserSettings': new Set([]), // User settings has no date fields
  'UserSettingsResponse': new Set([]), // Response envelope for user settings
  'AdminUser': new Set(['createdAt', 'lastActivity']),
  'SystemMetrics': new Set(['lastBackup']),
  'AuditLogEntry': new Set(['timestamp']),
  'SocketEventPayload': new Set(['timestamp', 'updatedAt']), // Socket.IO configuration_updated events
  'ConfigurationUpdateEvent': new Set(['timestamp', 'updatedAt']) // Socket.IO configuration events
};

// Type-safe date field detection with exclusion patterns to prevent false positives
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
    console.warn(`⚠️ [API TRANSFORMER] Using regex fallback for field "${key}" in type "${typeName || 'unknown'}". Consider adding explicit mapping to EXPLICIT_DATE_FIELDS.`);
  }

  return matched;
}

// Only transform strings and numbers to dates, preserving booleans/arrays/objects
function isValidDateValue(value: any): boolean {
  // Only strings and numbers can be transformed to dates
  // Explicitly exclude booleans, null, objects, arrays
  return (typeof value === 'string' || typeof value === 'number') && value !== null;
}

/**
 * Safe date parsing with validation
 * Handles multiple date formats from different APIs
 */
function parseDate(value: any): Date | null {
  if (!value) return null;
  
  // Already a Date object
  if (value instanceof Date) return value;
  
  // Parse string/number to Date
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    
    // Validate parsed date
    if (isNaN(parsed.getTime())) {
      console.warn(`[API TRANSFORMER] Invalid date value: ${value}`);
      return null;
    }
    
    return parsed;
  }
  
  console.warn(`[API TRANSFORMER] Unparseable date type: ${typeof value}, value:`, value);
  return null;
}

// Deep transform with date field conversion, recursively handling nested objects and arrays
function transformObject(obj: any, typeName?: string): any {
  if (obj === null || obj === undefined) return obj;
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => transformObject(item, typeName));
  }
  
  // Handle primitive types - PRESERVE EXACTLY AS-IS
  if (typeof obj !== 'object') return obj;
  
  // Transform object properties
  const transformed: any = {};
  
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
 */
export function transformApiResponse<T = any>(response: any, typeName?: string): T {
  const transformed = transformObject(response, typeName);
  return transformed as T;
}

/**
 * Type-specific transformers for common API responses
 * Provides explicit type safety for critical business objects
 */
export const ResponseTransformers = {
  TokenPair: (data: any) => transformApiResponse(data, 'TokenPair'),
  RefreshResponse: (data: any) => transformApiResponse(data, 'RefreshResponse'),
  LoginResponse: (data: any) => {
    const transformed = transformApiResponse(data, 'LoginResponse');
    // Ensure nested TokenPair is also transformed
    if (transformed.tokens) {
      transformed.tokens = transformApiResponse(transformed.tokens, 'TokenPair');
    }
    return transformed;
  },
  User: (data: any) => transformApiResponse(data, 'User'),
  Person: (data: any) => transformApiResponse(data, 'Person'),
  ActiveSession: (data: any) => transformApiResponse(data, 'ActiveSession'),
  TubeData: (data: any) => transformApiResponse(data, 'TubeData'),
  Researcher: (data: any) => transformApiResponse(data, 'Researcher'),
  AdminUser: (data: any) => transformApiResponse(data, 'AdminUser'),
  SystemMetrics: (data: any) => transformApiResponse(data, 'SystemMetrics'),
  AuditLogEntry: (data: any) => transformApiResponse(data, 'AuditLogEntry')
} as const;

/**
 * Development utilities for debugging transformations
 */
export const TransformationDebug = {
  /**
   * Log all detected date fields in an object
   */
  logDateFields(obj: any, typeName?: string): void {
    if (typeof obj !== 'object' || !obj) return;

    const dateFields = Object.keys(obj).filter(key => isDateField(key, typeName));
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Debug logging: empty typeName should display as 'Unknown'
    console.log(`📅 [DATE FIELDS] ${typeName || 'Unknown'} detected fields:`, dateFields);
  },
  
  /**
   * Test date field detection
   */
  testFieldDetection(fieldName: string, typeName?: string): boolean {
    return isDateField(fieldName, typeName);
  },
  
  /**
   * Validate transformation result
   */
  validateDates(obj: any): { valid: number; invalid: number; fields: string[] } {
    const result = { valid: 0, invalid: 0, fields: [] as string[] };
    
    function checkObject(current: any, path = ''): void {
      if (!current || typeof current !== 'object') return;
      
      for (const [key, value] of Object.entries(current)) {
        const fullPath = path ? `${path}.${key}` : key;
        
        if (value instanceof Date) {
          if (isNaN(value.getTime())) {
            result.invalid++;
            result.fields.push(`${fullPath} (invalid)`);
          } else {
            result.valid++;
            result.fields.push(`${fullPath} (valid)`);
          }
        } else if (value && typeof value === 'object') {
          checkObject(value, fullPath);
        }
      }
    }
    
    checkObject(obj);
    return result;
  }
};

/**
 * Export for development debugging
 */
if (env.isDev()) {
  (window as any).__ODYSSEUS_API_TRANSFORMER_DEBUG__ = TransformationDebug;
}
