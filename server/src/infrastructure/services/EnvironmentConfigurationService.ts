/**
 * Environment-Based Configuration
 *
 * Loads and validates all application config from process.env at startup.
 */

import * as fs from 'fs';
import * as path from 'path';

import { z } from 'zod';

import type { ConfigurationService, Configuration } from '@application/contracts/ConfigurationService';

const ConfigurationSchema = z.object({
  server: z.object({
    port: z.number().int().min(1).max(65535),
    host: z.string().default('localhost'),
    environment: z.enum(['development', 'production', 'test']),
    allowedOrigins: z.array(z.string()),
  }),
  database: z.object({
    type: z.literal('postgresql'),
    url: z.string(),
    ssl: z.boolean(),
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
  email: z.object({
    verificationBaseUrl: z.string(),
    resetPasswordBaseUrl: z.string(),
  }),
  security: z.object({
    systemAdminSetupKey: z.string().optional(),
  }),
  app: z.object({
    version: z.string(),
    isElectron: z.boolean(),
  }),
});

export class EnvironmentConfigurationService implements ConfigurationService {
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
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    const environment = process.env.NODE_ENV || 'development';

    const rawConfig = {
      server: {
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        port: parseInt(process.env.PORT || '3001', 10),
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        host: process.env.HOST || 'localhost',
        environment,
        allowedOrigins: process.env.ALLOWED_ORIGINS
          ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
          : ['http://localhost:3000', 'http://localhost:5173'],
      },
      database: {
        type: 'postgresql',
        url: process.env.DATABASE_URL,
        ssl: environment === 'production',
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '10', 10),
      },
      jwt: {
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        secret: process.env.JWT_SECRET || this.getJwtSecret(environment),
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        expirationTime: process.env.JWT_EXPIRATION || '24h',
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        issuer: process.env.JWT_ISSUER || 'odysseus-api',
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        audience: process.env.JWT_AUDIENCE || 'odysseus-client',
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        algorithm: process.env.JWT_ALGORITHM || 'HS256',
      },
      logging: {
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        level: process.env.LOG_LEVEL ||
               (environment === 'development' ? 'debug' : 'info'),
        enableConsole: process.env.LOG_CONSOLE !== 'false',
        enableFile: process.env.LOG_FILE === 'true',
      },
      email: {
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        verificationBaseUrl: process.env.VERIFICATION_BASE_URL || 'http://localhost:3000/verify-email',
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        resetPasswordBaseUrl: process.env.RESET_PASSWORD_BASE_URL || 'http://localhost:3000/reset-password',
      },
      security: {
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        systemAdminSetupKey: process.env.SYSTEM_ADMIN_SETUP_KEY || undefined,
      },
      app: {
        version: this.readPackageVersion(),
        isElectron: process.env.ELECTRON_APP === 'true',
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

    console.warn('Using fixed development JWT secret. Set JWT_SECRET environment variable for production.');

    return devSecret;
  }

  private readPackageVersion(): string {
    try {
      const packagePath = path.resolve(__dirname, '..', '..', '..', 'package.json');
      const raw = fs.readFileSync(packagePath, 'utf-8');
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      return JSON.parse(raw).version || '1.0.0';
    } catch {
      return '1.0.0';
    }
  }
}
