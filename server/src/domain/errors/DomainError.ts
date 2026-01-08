/**
 * Base Domain Error - All domain errors extend this
 * Provides consistent error handling across the domain layer
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;

  constructor(
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert domain error to JSON for API responses
   */
  toJSON(): {
    error: string;
    code: string;
    message: string;
    context?: Record<string, unknown>;
  } {
    return {
      error: this.name,
      code: this.code,
      message: this.message,
      ...(this.context && { context: this.context })
    };
  }
}
