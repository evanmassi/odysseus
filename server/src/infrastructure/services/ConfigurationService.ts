/**
 * Application Configuration
 *
 * Zod-validated configuration loaded from environment variables at startup.
 */

import { z } from 'zod';
import { logger } from '@infrastructure/logging/logger';

const ConfigurationSchema = z.object({
  server: z.object({
    port: z.number().int().min(1).max(65535),
    host: z.string().default('localhost'),
    environment: z.enum(['development', 'production', 'test']),
  }),
  database: z.object({
    type: z.literal('postgresql'),
    maxConnections: z.number().int().min(1).default(10),
  }),
  jwt: z.object({
    secret: z.string().min(32, 'JWT secret must be at least 32 characters'),
    expirationTime: z.string().default('24h'),
    issuer: z.string().default('odysseus-api'),
    audience: z.string().default('odysseus-client'),
    algorithm: z.enum(['HS256', 'HS384', 'HS512']).default('HS256'),
  }),
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    enableConsole: z.boolean().default(true),
    enableFile: z.boolean().default(false),
  }),
});

export type Configuration = z.infer<typeof ConfigurationSchema>;

export interface ConfigurationService {
  get<K extends keyof Configuration>(key: K): Configuration[K];
  getAll(): Configuration;
  isDevelopment(): boolean;
  isProduction(): boolean;
}

export class ConfigurationService implements ConfigurationService {
  private readonly config: Configuration;

  constructor() {
    this.config = this.loadConfiguration();
  }

  get<K extends keyof Configuration>(key: K): Configuration[K] {
    return this.config[key];
  }

  getAll(): Configuration {
    return { ...this.config };
  }

  isDevelopment(): boolean {
    return this.config.server.environment === 'development';
  }

  isProduction(): boolean {
    return this.config.server.environment === 'production';
  }

  private loadConfiguration(): Configuration {
    const environment = process.env.NODE_ENV || 'development';

    const rawConfig = {
      server: {
        port: parseInt(process.env.PORT || '3001', 10),
        host: process.env.HOST || 'localhost',
        environment,
      },
      database: {
        type: 'postgresql',
        maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '10', 10),
      },
      jwt: {
        secret: process.env.JWT_SECRET || this.getJwtSecret(environment),
        expirationTime: process.env.JWT_EXPIRATION || '24h',
        issuer: process.env.JWT_ISSUER || 'odysseus-api',
        audience: process.env.JWT_AUDIENCE || 'odysseus-client',
        algorithm: process.env.JWT_ALGORITHM || 'HS256',
      },
      logging: {
        level: process.env.LOG_LEVEL ||
               (environment === 'development' ? 'debug' : 'info'),
        enableConsole: process.env.LOG_CONSOLE !== 'false',
        enableFile: process.env.LOG_FILE === 'true',
      },
    };

    return ConfigurationSchema.parse(rawConfig);
  }

  private getJwtSecret(environment: string): string {
    if (environment === 'production') {
      throw new Error(
        'JWT_SECRET environment variable is required in production. ' +
        'Generate a secure secret with: openssl rand -base64 64'
      );
    }

    // Fixed secret so dev sessions survive server restarts
    const devSecret = 'odysseus-development-jwt-secret-key-for-local-testing-only-not-secure-for-production';

    logger.warn('Using fixed development JWT secret. Set JWT_SECRET environment variable for production.');

    return devSecret;
  }
}
