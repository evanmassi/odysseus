/**
 * Base Domain Error
 *
 * Abstract base for all domain-layer errors with consistent serialization.
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
