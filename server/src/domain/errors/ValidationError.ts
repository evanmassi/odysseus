import { DomainError } from './DomainError';

/**
 * Validation Error - Thrown when domain validation rules are violated
 * Maps to HTTP 400 Bad Request
 */
export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;

  constructor(
    message: string,
    context?: Record<string, any>
  ) {
    super(message, context);
  }

  /**
   * Create validation error for a specific field
   */
  static forField(fieldName: string, message: string, value?: any): ValidationError {
    return new ValidationError(message, { field: fieldName, value });
  }

  /**
   * Create validation error for multiple fields
   */
  static forFields(errors: Array<{ field: string; message: string; value?: any }>): ValidationError {
    const messages = errors.map(e => `${e.field}: ${e.message}`).join('; ');
    return new ValidationError(`Multiple validation errors: ${messages}`, { errors });
  }

  /**
   * Create validation error for required field
   */
  static required(fieldName: string): ValidationError {
    return ValidationError.forField(fieldName, `${fieldName} is required`);
  }

  /**
   * Create validation error for invalid format
   */
  static invalidFormat(fieldName: string, expectedFormat: string, actualValue?: any): ValidationError {
    return ValidationError.forField(
      fieldName, 
      `${fieldName} must be in format: ${expectedFormat}`, 
      actualValue
    );
  }

  /**
   * Create validation error for out of range values
   */
  static outOfRange(fieldName: string, min: number, max: number, actualValue?: any): ValidationError {
    return ValidationError.forField(
      fieldName, 
      `${fieldName} must be between ${min} and ${max}`, 
      actualValue
    );
  }
}
