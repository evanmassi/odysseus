/**
 * Client Logger
 *
 * Logging abstraction layer with environment-aware level filtering.
 * Development: all levels output. Production: only warn/error.
 */

/* eslint-disable no-console -- ClientLogger is the console wrapper */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = Record<string, unknown>;

class ClientLogger {
  private readonly isDevelopment = import.meta.env.DEV;
  private readonly appName = 'Odysseus';

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.isDevelopment && (level === 'debug' || level === 'info')) {
      return;
    }

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${this.appName}] [${level.toUpperCase()}]`;
    const logArgs = context ? [prefix, message, context] : [prefix, message];

    console[level](...logArgs);
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log('error', message, context);
  }
}

export const logger = new ClientLogger();
