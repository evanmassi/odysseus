/**
 * Zod-based validation utilities
 *
 * Replaces legacy validation with Zod schema validation.
 * Provides runtime validation with TypeScript integration.
 */

import { z, ZodError, ZodSchema } from 'zod';

/**
 * Modern validation result interface
 * Replaces LegacyValidationResult with enhanced error handling
 */
export interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string>;
  warnings?: Record<string, string>;
}

/**
 * Individual field validation result
 * Compatible with legacy ValidationResult interface
 */
export interface FieldValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
}

/**
 * Validate data against a Zod schema
 * INDUSTRY STANDARD: Type-safe validation with detailed error reporting
 */
export function validateWithSchema<T>(
  schema: ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  try {
    const validatedData = schema.parse(data);
    return {
      success: true,
      data: validatedData
    };
  } catch (error) {
    if (error instanceof ZodError) {
      const errors: Record<string, string> = {};
      
      error.issues.forEach(issue => {
        const path = issue.path.join('.');
        errors[path || 'root'] = issue.message;
      });
      
      return {
        success: false,
        error: `Validation failed: ${Object.values(errors).join(', ')}`,
        errors
      };
    }
    
    return {
      success: false,
      error: 'Unknown validation error'
    };
  }
}

/**
 * Safe parse with enhanced error handling
 * Returns both validation result and parsed data
 */
export function safeParseWithResult<T>(
  schema: ZodSchema<T>,
  data: unknown
): { result: ValidationResult<T>; parsed?: T } {
  const result = validateWithSchema(schema, data);
  return {
    result,
    parsed: result.success ? result.data : undefined
  };
}

/**
 * Validate individual field for legacy compatibility
 * Converts Zod schema validation to legacy format
 */
export function validateField<T>(
  schema: ZodSchema<T>,
  value: unknown,
  fieldName?: string
): FieldValidationResult {
  const result = validateWithSchema(schema, value);
  
  return {
    isValid: result.success,
    error: result.success ? undefined : (result.errors?.[fieldName || 'field'] || result.error)
  };
}

/**
 * Batch validation for multiple fields
 * Returns combined validation result
 */
export function validateFields(
  validations: Record<string, FieldValidationResult>
): {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};
  
  Object.entries(validations).forEach(([field, result]) => {
    if (!result.isValid && result.error) {
      errors[field] = result.error;
    }
    if (result.warning) {
      warnings[field] = result.warning;
    }
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings
  };
}

/**
 * Create a validation function from a Zod schema
 * Returns a reusable validation function
 */
export function createValidator<T>(schema: ZodSchema<T>) {
  return (data: unknown): ValidationResult<T> => {
    return validateWithSchema(schema, data);
  };
}

/**
 * Async validation support
 * For validations that require server-side checks
 */
export async function validateAsync<T>(
  schema: ZodSchema<T>,
  data: unknown,
  asyncValidations?: Array<(data: T) => Promise<string | null>>
): Promise<ValidationResult<T>> {
  // First, validate with schema
  const schemaResult = validateWithSchema(schema, data);
  
  if (!schemaResult.success) {
    return schemaResult;
  }
  
  // Then run async validations
  if (asyncValidations && schemaResult.data) {
    try {
      const asyncErrors = await Promise.all(
        asyncValidations.map(validation => validation(schemaResult.data!))
      );
      
      const errors = asyncErrors.filter(Boolean) as string[];
      
      if (errors.length > 0) {
        return {
          success: false,
          error: errors.join(', '),
          errors: { async: errors.join(', ') }
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'Async validation failed',
        errors: { async: error instanceof Error ? error.message : 'Unknown async error' }
      };
    }
  }
  
  return schemaResult;
}

/**
 * Common validation patterns for reuse
 */
export const ValidationPatterns = {
  // String patterns
  required: (message = 'This field is required') => z.string().min(1, message),
  optional: z.string().optional(),
  email: z.string().email('Invalid email format'),
  url: z.string().url('Invalid URL format'),
  
  // Numeric patterns  
  positiveNumber: z.number().positive('Must be a positive number'),
  nonNegativeNumber: z.number().min(0, 'Cannot be negative'),
  integerRange: (min: number, max: number) => 
    z.number().int().min(min, `Must be at least ${min}`).max(max, `Must be at most ${max}`),
  
  // Date patterns
  isoDate: z.string().datetime('Invalid date format'),
  dateString: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  
  // Common business patterns
  identifier: z.string().regex(/^[A-Z0-9-_]+$/i, 'Only letters, numbers, dashes, and underscores allowed'),
  alphanumeric: z.string().regex(/^[A-Z0-9]+$/i, 'Only letters and numbers allowed'),
  
  // Array patterns
  nonEmptyArray: <T>(schema: ZodSchema<T>) => z.array(schema).min(1, 'At least one item required'),
  uniqueArray: <T>(schema: ZodSchema<T>) => z.array(schema).refine(
    arr => new Set(arr).size === arr.length,
    'All items must be unique'
  )
} as const;

/**
 * Enhanced validation with warnings
 * Supports both errors and warnings in validation
 */
export interface ValidationWithWarnings<T = any> extends ValidationResult<T> {
  warnings?: Record<string, string>;
  hasWarnings?: boolean;
}

export function validateWithWarnings<T>(
  schema: ZodSchema<T>,
  data: unknown,
  warningChecks?: Array<(data: T) => { field: string; message: string } | null>
): ValidationWithWarnings<T> {
  const result = validateWithSchema(schema, data);
  
  if (!result.success) {
    return result;
  }
  
  // Check for warnings
  const warnings: Record<string, string> = {};
  
  if (warningChecks && result.data) {
    warningChecks.forEach(check => {
      const warning = check(result.data!);
      if (warning) {
        warnings[warning.field] = warning.message;
      }
    });
  }
  
  return {
    ...result,
    warnings,
    hasWarnings: Object.keys(warnings).length > 0
  };
}
