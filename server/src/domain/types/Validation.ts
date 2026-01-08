/**
 * Domain Validation Types
 *
 * Type definitions for validation results across domain services.
 */

export interface DomainValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface BulkValidationResult {
  isValid: boolean;
  validItems: Array<{
    id: string;
    warnings: string[];
  }>;
  invalidItems: Array<{
    id: string;
    errors: string[];
    warnings?: string[];
  }>;
  warnings: string[];
}
