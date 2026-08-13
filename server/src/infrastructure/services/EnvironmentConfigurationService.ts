/**
 * Environment-Based Configuration
 *
 * Loads and validates all application config from process.env at startup.
 */

import * as fs from 'fs';
import * as path from 'path';

import { z } from 'zod';

import type {
  ConfigurationService,
  Configuration,
} from '@application/contracts/ConfigurationService';

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
    issuer: z.string().default('odysseus-api'),
    audience: z.string().default('odysseus-client'),
    algorithm: z.enum(['HS256', 'HS384', 'HS512']).default('HS256'),
  }),
  email: z.object({
    verificationBaseUrl: z.string(),
    resetPasswordBaseUrl: z.string(),
  }),
  security: z.object({
    systemAdminSetupKey: z.string().optional(),
  }),
  demo: z.object({
    username: z.string().optional(),
    resetKey: z.string().optional(),
  }),
  app: z.object({
    version: z.string(),
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

  isDevelopment(): boolean {
    return this.config.server.environment === 'development';
  }

  private loadConfiguration(): Configuration {
    // Unset/empty NODE_ENV defaults to 'production' so security decisions (JWT secret required,
    // DB SSL) fail closed on a misconfigured deploy. Local dev sets NODE_ENV via .env.development.
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- env var: empty string must fall through to the default
    const environment = process.env.NODE_ENV || 'production';

    const rawConfig = {
      server: {
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- env var: empty string must fall through to the default
        port: parseInt(process.env.PORT || '3001', 10),
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- env var: empty string must fall through to the default
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
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- env var: empty string must fall through to the default
        maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '10', 10),
      },
      jwt: {
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- env var: empty string must fall through to the default
        secret: process.env.JWT_SECRET || this.getJwtSecret(environment),
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- env var: empty string must fall through to the default
        issuer: process.env.JWT_ISSUER || 'odysseus-api',
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- env var: empty string must fall through to the default
        audience: process.env.JWT_AUDIENCE || 'odysseus-client',
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- env var: empty string must fall through to the default
        algorithm: process.env.JWT_ALGORITHM || 'HS256',
      },
      email: {
        verificationBaseUrl:
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- env var: empty string must fall through to the default
          process.env.VERIFICATION_BASE_URL || 'http://localhost:3000/verify-email',
        resetPasswordBaseUrl:
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- env var: empty string must fall through to the default
          process.env.RESET_PASSWORD_BASE_URL || 'http://localhost:3000/reset-password',
      },
      security: {
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- env var: empty string must normalize to undefined
        systemAdminSetupKey: process.env.SYSTEM_ADMIN_SETUP_KEY || undefined,
      },
      demo: {
        /* eslint-disable @typescript-eslint/prefer-nullish-coalescing -- env var: empty string must normalize to undefined */
        username: process.env.DEMO_USERNAME || undefined,
        resetKey: process.env.DEMO_RESET_KEY || undefined,
        /* eslint-enable @typescript-eslint/prefer-nullish-coalescing */
      },
      app: {
        version: this.readPackageVersion(),
      },
    };

    return ConfigurationSchema.parse(rawConfig);
  }

  private getJwtSecret(environment: string): string {
    // The fixed dev secret is only ever handed out for local development/CI; any other
    // environment (production, staging, unset) must supply JWT_SECRET or the server refuses to boot.
    if (environment !== 'development' && environment !== 'test') {
      throw new Error(
        'JWT_SECRET environment variable is required outside development. ' +
          'Generate a secure secret with: openssl rand -base64 64'
      );
    }

    // Fixed secret so dev sessions survive server restarts
    const devSecret =
      'odysseus-development-jwt-secret-key-for-local-testing-only-not-secure-for-production';

    // eslint-disable-next-line no-console -- runs before logger is initialized
    console.warn(
      'Using fixed development JWT secret. Set JWT_SECRET environment variable for production.'
    );

    return devSecret;
  }

  private readPackageVersion(): string {
    try {
      const packagePath = path.resolve(__dirname, '..', '..', '..', 'package.json');
      const raw = fs.readFileSync(packagePath, 'utf-8');
      return JSON.parse(raw).version || '1.0.0';
    } catch {
      return '1.0.0';
    }
  }
}
