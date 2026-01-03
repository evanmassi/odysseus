/* eslint-disable no-console */
/**
 * Client-side logger with environment-aware behavior
 *
 * This file is the logging abstraction layer and is allowed to use console methods.
 * All application code must use logger methods instead of direct console calls.
 *
 * Log level behavior:
 * - Development: All levels (debug, info, warn, error) output to console
 * - Production: Only warn and error output (debug/info suppressed)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class ClientLogger {
  private readonly isDevelopment = import.meta.env.DEV;
  private readonly appName = 'Odysseus';

  /**
   * Core logging method with timestamp and level prefix
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    // Skip debug and info logs in production (only warn/error in prod)
    if (!this.isDevelopment && (level === 'debug' || level === 'info')) {
      return;
    }

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${this.appName}] [${level.toUpperCase()}]`;

    // Format context if provided
    const logArgs = context ? [prefix, message, context] : [prefix, message];

    switch (level) {
      case 'debug':
        console.debug(...logArgs);
        break;
      case 'info':
        console.info(...logArgs);
        break;
      case 'warn':
        console.warn(...logArgs);
        break;
      case 'error':
        console.error(...logArgs);
        break;
    }

    // Production error tracking
    if (!this.isDevelopment && level === 'error') {
      this.sendToMonitoring(message, context);
    }
  }

  /**
   * Send errors to external monitoring service (Sentry, LogRocket, etc.)
   */
  private sendToMonitoring(_message: string, _context?: LogContext): void {
    // TODO: Integrate with monitoring service when ready
    // Example: Sentry.captureException(new Error(_message), { extra: _context });
  }

  /**
   * Debug-level logging (development only)
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  /**
   * Info-level logging (operational events)
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * Warning-level logging (recoverable issues)
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  /**
   * Error-level logging (failures requiring attention)
   */
  error(message: string, context?: LogContext): void {
    this.log('error', message, context);
  }
}

// Singleton instance
export const logger = new ClientLogger();
