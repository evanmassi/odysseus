/**
 * Application Error Taxonomy
 *
 * Structured error classes for consistent frontend error handling.
 */

/**
 * Base application error class
 * All application errors should extend this class
 */
export abstract class AppError extends Error {
  abstract readonly type: string;
  abstract readonly code: string;
  abstract readonly retryable: boolean;
  readonly timestamp: Date;

  constructor(
    message: string,
    public readonly details?: Record<string, unknown>,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Serialize error for logging or API transmission
   */
  toJSON() {
    return {
      type: this.type,
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      timestamp: this.timestamp.toISOString(),
      details: this.details,
      stack: this.stack,
    };
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    return this.message;
  }
}

/**
 * Authentication and authorization errors
 */
export class AuthenticationError extends AppError {
  readonly type = 'AUTHENTICATION';
  readonly retryable = false;

  constructor(
    public readonly code:
      | 'INVALID_CREDENTIALS'
      | 'SESSION_EXPIRED'
      | 'ACCESS_DENIED'
      | 'FIRST_TIME_SETUP',
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message, details);
  }

  override getUserMessage(): string {
    switch (this.code) {
      case 'INVALID_CREDENTIALS':
        return 'Invalid username or password. Please try again.';
      case 'SESSION_EXPIRED':
        return 'Your session has expired. Please sign in again.';
      case 'ACCESS_DENIED':
        return 'You do not have permission to perform this action.';
      case 'FIRST_TIME_SETUP':
        return 'First-time setup required. Please configure your account.';
      default:
        return this.message;
    }
  }
}

/**
 * Data validation errors
 */
export class ValidationError extends AppError {
  readonly type = 'VALIDATION';
  readonly retryable = false;

  constructor(
    public readonly code:
      | 'SCHEMA_VALIDATION'
      | 'FORM_VALIDATION'
      | 'BUSINESS_RULE'
      | 'REQUIRED_FIELD',
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message, details);
  }

  override getUserMessage(): string {
    switch (this.code) {
      case 'SCHEMA_VALIDATION':
        return 'The data provided is invalid. Please check your input and try again.';
      case 'FORM_VALIDATION':
        return 'Please correct the highlighted fields and try again.';
      case 'BUSINESS_RULE':
        return this.message; // Business rule messages are usually user-friendly
      case 'REQUIRED_FIELD':
        return 'Please fill in all required fields.';
      default:
        return this.message;
    }
  }
}

/**
 * Domain/business logic errors
 */
export class DomainError extends AppError {
  readonly type = 'DOMAIN';
  readonly retryable = false;

  constructor(
    public readonly code: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message, details);
  }
}

/**
 * Infrastructure and network errors
 */
export class InfrastructureError extends AppError {
  readonly type = 'INFRASTRUCTURE';
  readonly retryable: boolean;

  constructor(
    public readonly code:
      | 'NETWORK_ERROR'
      | 'API_ERROR'
      | 'SERVER_ERROR'
      | 'TIMEOUT'
      | 'CONNECTION_LOST',
    message: string,
    details?: Record<string, unknown>,
    retryable = true
  ) {
    super(message, details);
    this.retryable = retryable;
  }

  override getUserMessage(): string {
    switch (this.code) {
      case 'NETWORK_ERROR':
        return 'Network connection issue. Please check your internet connection and try again.';
      case 'API_ERROR':
        return 'Server communication error. Please try again in a moment.';
      case 'SERVER_ERROR':
        return 'Server error occurred. Please try again later.';
      case 'TIMEOUT':
        return 'Request timed out. Please try again.';
      case 'CONNECTION_LOST':
        return 'Connection lost. Please check your network and try again.';
      default:
        return this.message;
    }
  }
}

/**
 * API-specific errors
 */
export class ApiError extends InfrastructureError {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(
      status >= 500 ? 'SERVER_ERROR' : 'API_ERROR',
      message,
      { status, statusText, ...details },
      status >= 500 || status === 408 || status === 429 // Server errors, timeouts, and rate limits are retryable
    );
  }

  static async fromResponse(response: Response): Promise<ApiError> {
    let message = `HTTP ${response.status}: ${response.statusText}`;
    let details: Record<string, unknown> = {};

    try {
      const body = await response.text();
      if (body) {
        try {
          const parsed = JSON.parse(body);
          message = parsed.message || parsed.error || message;
          details = { body: parsed };
        } catch {
          details = { body };
        }
      }
    } catch {
      // Ignore body parsing errors
    }

    return new ApiError(response.status, response.statusText, message, details);
  }
}

/**
 * Unknown or unexpected errors
 */
export class UnknownError extends AppError {
  readonly type = 'UNKNOWN';
  readonly code = 'UNKNOWN_ERROR';
  readonly retryable = false;

  constructor(originalError: unknown) {
    const message = originalError instanceof Error ? originalError.message : String(originalError);

    super('An unexpected error occurred', { originalMessage: message }, originalError);
  }

  override getUserMessage(): string {
    return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
  }
}

/**
 * App initialization errors
 */
export class AppInitializationError extends InfrastructureError {
  constructor(
    public readonly phase: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(
      'TIMEOUT', // Use existing InfrastructureError code
      message,
      { phase, ...details },
      true // Initialization errors are retryable
    );
  }

  override getUserMessage(): string {
    return `Application failed to initialize during ${this.phase}. Please refresh the page to try again.`;
  }
}

/**
 * Field resolution errors (for our field resolver system)
 */
export class FieldResolutionError extends DomainError {
  constructor(
    public readonly fieldKey: string,
    public readonly availableFields: string[],
    details?: Record<string, unknown>
  ) {
    super(
      'FIELD_RESOLUTION_ERROR',
      `Unknown field key: ${fieldKey}. Available keys: ${availableFields.join(', ')}`,
      { fieldKey, availableFields, ...details }
    );
  }
}

export class FieldPathError extends DomainError {
  constructor(
    public readonly path: string,
    public readonly fieldKey: string,
    details?: Record<string, unknown>
  ) {
    super('FIELD_PATH_ERROR', `Failed to resolve field path '${path}' for key '${fieldKey}'`, {
      path,
      fieldKey,
      ...details,
    });
  }
}

/**
 * Type guard functions
 */
export const isAppError = (error: unknown): error is AppError => {
  return error instanceof AppError;
};

export const isRetryableError = (error: unknown): boolean => {
  return isAppError(error) && error.retryable;
};

export const isAuthError = (error: unknown): error is AuthenticationError => {
  return error instanceof AuthenticationError;
};

export const isValidationError = (error: unknown): error is ValidationError => {
  return error instanceof ValidationError;
};

export const isDomainError = (error: unknown): error is DomainError => {
  return error instanceof DomainError;
};

export const isInfrastructureError = (error: unknown): error is InfrastructureError => {
  return error instanceof InfrastructureError;
};

/** Checks if error is a 409 Conflict from optimistic locking. */
export const isConflictError = (error: unknown): boolean => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    (error as { status: unknown }).status === 409
  );
};
