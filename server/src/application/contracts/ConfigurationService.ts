/**
 * Configuration Service Contract
 *
 * Interface for typed, validated application configuration access.
 */

export interface Configuration {
  server: {
    port: number;
    host: string;
    environment: 'development' | 'production' | 'test';
    allowedOrigins: string[];
  };
  database: {
    type: 'postgresql';
    url: string;
    ssl: boolean;
    maxConnections: number;
  };
  jwt: {
    secret: string;
    expirationTime: string;
    issuer: string;
    audience: string;
    algorithm: 'HS256' | 'HS384' | 'HS512';
  };
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
    enableConsole: boolean;
    enableFile: boolean;
  };
  email: {
    verificationBaseUrl: string;
    resetPasswordBaseUrl: string;
  };
  security: {
    systemAdminSetupKey?: string;
  };
  app: {
    version: string;
  };
}

export interface ConfigurationService {
  get<K extends keyof Configuration>(key: K): Configuration[K];
  isDevelopment(): boolean;
}
