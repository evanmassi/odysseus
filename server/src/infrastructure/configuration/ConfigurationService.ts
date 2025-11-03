/**
 * Configuration Management Service
 * 
 * Centralized configuration management with validation, environment handling,
 * and fail-fast error detection. Eliminates scattered process.env usage and
 * provides consistent configuration across all services.
 */

import { z } from 'zod';
import { randomUUID } from 'crypto';

/**
 * Configuration Schema Definition
 * 
 * Defines all application configuration with validation rules,
 * required vs optional settings, and type safety.
 */
const ConfigurationSchema = z.object({
  // Server Configuration
  server: z.object({
    port: z.number().int().min(1).max(65535),
    host: z.string().default('localhost'),
    environment: z.enum(['development', 'production', 'test']),
  }),

  // Database Configuration  
  database: z.object({
    path: z.string(),
    backupEnabled: z.boolean().default(true),
    maxConnections: z.number().int().min(1).default(10),
  }),

  // JWT Authentication Configuration
  jwt: z.object({
    secret: z.string().min(32, 'JWT secret must be at least 32 characters'),
    expirationTime: z.string().default('24h'),
    issuer: z.string().default('odysseus-api'),
    audience: z.string().default('odysseus-client'),
    algorithm: z.enum(['HS256', 'HS384', 'HS512']).default('HS256'),
  }),

  // Logging Configuration
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    enableConsole: z.boolean().default(true),
    enableFile: z.boolean().default(false),
  }),
});

export type Configuration = z.infer<typeof ConfigurationSchema>;

/**
 * Configuration Service Interface
 */
export interface ConfigurationService {
  get<K extends keyof Configuration>(key: K): Configuration[K];
  getAll(): Configuration;
  validate(): void;
  isDevelopment(): boolean;
  isProduction(): boolean;
}

/**
 * Configuration Service Implementation
 * 
 * Handles environment variable loading, validation, defaults,
 * and provides type-safe configuration access.
 */
export class ConfigurationService implements ConfigurationService {
  private readonly config: Configuration;

  constructor() {
    this.config = this.loadConfiguration();
    this.validate();
  }

  get<K extends keyof Configuration>(key: K): Configuration[K] {
    return this.config[key];
  }

  getAll(): Configuration {
    return { ...this.config };
  }

  validate(): void {
    try {
      ConfigurationSchema.parse(this.config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues.map(issue => 
          `${issue.path.join('.')}: ${issue.message}`
        ).join('\n');
        
        throw new Error(`Configuration validation failed:\n${issues}`);
      }
      throw error;
    }
  }

  isDevelopment(): boolean {
    return this.config.server.environment === 'development';
  }

  isProduction(): boolean {
    return this.config.server.environment === 'production';
  }

  private loadConfiguration(): Configuration {
    const environment = (process.env.NODE_ENV as Configuration['server']['environment']) || 'development';
    
    const rawConfig = {
      server: {
        port: parseInt(process.env.PORT || '3001', 10),
        host: process.env.HOST || 'localhost',
        environment,
      },
      database: {
        path: process.env.DATABASE_PATH || this.getDefaultDatabasePath(environment),
        backupEnabled: process.env.DATABASE_BACKUP_ENABLED !== 'false',
        maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '10', 10),
      },
      jwt: {
        secret: process.env.JWT_SECRET || this.getJwtSecret(environment),
        expirationTime: process.env.JWT_EXPIRATION || '24h',
        issuer: process.env.JWT_ISSUER || 'odysseus-api',
        audience: process.env.JWT_AUDIENCE || 'odysseus-client',
        algorithm: (process.env.JWT_ALGORITHM as Configuration['jwt']['algorithm']) || 'HS256',
      },
      logging: {
        level: (process.env.LOG_LEVEL as Configuration['logging']['level']) || 
               (environment === 'development' ? 'debug' : 'info'),
        enableConsole: process.env.LOG_CONSOLE !== 'false',
        enableFile: process.env.LOG_FILE === 'true',
      },
    };

    return ConfigurationSchema.parse(rawConfig);
  }

  private getDefaultDatabasePath(environment: string): string {
    const baseDir = environment === 'development' 
      ? './data' 
      : process.env.APPDATA || process.env.HOME || './data';
    
    return `${baseDir}/odysseus.sqlite`;
  }

  private getJwtSecret(environment: string): string {
    if (environment === 'production') {
      throw new Error(
        'JWT_SECRET environment variable is required in production. ' +
        'Generate a secure secret with: openssl rand -base64 64'
      );
    }

    // Fixed development secret - eliminates random secret issues
    const devSecret = 'odysseus-development-jwt-secret-key-for-local-testing-only-not-secure-for-production';
    
    console.warn(
      '🔧 Using fixed development JWT secret. ' +
      'Set JWT_SECRET environment variable for production.'
    );
    
    return devSecret;
  }
}
