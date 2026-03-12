/**
 * Environment Configuration Service Tests
 *
 * Validates startup config loading, defaults, Zod validation, and environment-specific behavior.
 */

import { EnvironmentConfigurationService } from './EnvironmentConfigurationService';

const REQUIRED_ENV = {
  DATABASE_URL: 'postgresql://localhost:5432/test_db',
};

const DEV_DEFAULTS = {
  NODE_ENV: 'development',
  ...REQUIRED_ENV,
};

describe('EnvironmentConfigurationService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    // Clear all config-related env vars so each test starts clean
    delete process.env.NODE_ENV;
    delete process.env.PORT;
    delete process.env.HOST;
    delete process.env.ALLOWED_ORIGINS;
    delete process.env.DATABASE_URL;
    delete process.env.DATABASE_MAX_CONNECTIONS;
    delete process.env.JWT_SECRET;
    delete process.env.JWT_EXPIRATION;
    delete process.env.JWT_ISSUER;
    delete process.env.JWT_AUDIENCE;
    delete process.env.JWT_ALGORITHM;
    delete process.env.LOG_LEVEL;
    delete process.env.LOG_CONSOLE;
    delete process.env.LOG_FILE;
    delete process.env.VERIFICATION_BASE_URL;
    delete process.env.RESET_PASSWORD_BASE_URL;
    delete process.env.SYSTEM_ADMIN_SETUP_KEY;
    delete process.env.ELECTRON_APP;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function createService(overrides: Record<string, string> = {}): EnvironmentConfigurationService {
    Object.assign(process.env, DEV_DEFAULTS, overrides);
    return new EnvironmentConfigurationService();
  }

  describe('defaults', () => {
    it('should apply server defaults', () => {
      const service = createService();
      const server = service.get('server');

      expect(server.port).toBe(3001);
      expect(server.host).toBe('localhost');
      expect(server.environment).toBe('development');
      expect(server.allowedOrigins).toEqual(['http://localhost:3000', 'http://localhost:5173']);
    });

    it('should apply database defaults', () => {
      const service = createService();
      const db = service.get('database');

      expect(db.type).toBe('postgresql');
      expect(db.url).toBe('postgresql://localhost:5432/test_db');
      expect(db.ssl).toBe(false);
      expect(db.maxConnections).toBe(10);
    });

    it('should apply JWT defaults in development', () => {
      const service = createService();
      const jwt = service.get('jwt');

      expect(jwt.expirationTime).toBe('24h');
      expect(jwt.issuer).toBe('odysseus-api');
      expect(jwt.audience).toBe('odysseus-client');
      expect(jwt.algorithm).toBe('HS256');
      expect(jwt.secret.length).toBeGreaterThanOrEqual(32);
    });

    it('should apply logging defaults for development', () => {
      const service = createService();
      const logging = service.get('logging');

      expect(logging.level).toBe('debug');
      expect(logging.enableConsole).toBe(true);
      expect(logging.enableFile).toBe(false);
    });

    it('should apply email defaults', () => {
      const service = createService();
      const email = service.get('email');

      expect(email.verificationBaseUrl).toBe('http://localhost:3000/verify-email');
      expect(email.resetPasswordBaseUrl).toBe('http://localhost:3000/reset-password');
    });

    it('should apply app defaults', () => {
      const service = createService();
      const app = service.get('app');

      expect(typeof app.version).toBe('string');
      expect(app.version.length).toBeGreaterThan(0);
      expect(app.isElectron).toBe(false);
    });
  });

  describe('env var overrides', () => {
    it('should use custom port', () => {
      const service = createService({ PORT: '4000' });
      expect(service.get('server').port).toBe(4000);
    });

    it('should parse comma-separated allowed origins', () => {
      const service = createService({ ALLOWED_ORIGINS: 'https://a.com, https://b.com' });
      expect(service.get('server').allowedOrigins).toEqual(['https://a.com', 'https://b.com']);
    });

    it('should use custom database max connections', () => {
      const service = createService({ DATABASE_MAX_CONNECTIONS: '25' });
      expect(service.get('database').maxConnections).toBe(25);
    });

    it('should enable SSL in production', () => {
      const service = createService({
        NODE_ENV: 'production',
        JWT_SECRET: 'a'.repeat(64),
      });
      expect(service.get('database').ssl).toBe(true);
    });

    it('should use custom JWT settings', () => {
      const secret = 'custom-secret-that-is-at-least-32-chars-long';
      const service = createService({
        JWT_SECRET: secret,
        JWT_EXPIRATION: '1h',
        JWT_ALGORITHM: 'HS512',
      });
      const jwt = service.get('jwt');

      expect(jwt.secret).toBe(secret);
      expect(jwt.expirationTime).toBe('1h');
      expect(jwt.algorithm).toBe('HS512');
    });

    it('should use info log level in production', () => {
      const service = createService({
        NODE_ENV: 'production',
        JWT_SECRET: 'a'.repeat(64),
      });
      expect(service.get('logging').level).toBe('info');
    });

    it('should set isElectron when ELECTRON_APP is true', () => {
      const service = createService({ ELECTRON_APP: 'true' });
      expect(service.get('app').isElectron).toBe(true);
    });

    it('should pass through system admin setup key', () => {
      const service = createService({ SYSTEM_ADMIN_SETUP_KEY: 'my-secret-key' });
      expect(service.get('security').systemAdminSetupKey).toBe('my-secret-key');
    });
  });

  describe('validation', () => {
    it('should reject missing DATABASE_URL', () => {
      Object.assign(process.env, { NODE_ENV: 'development' });
      // DATABASE_URL intentionally not set
      expect(() => new EnvironmentConfigurationService()).toThrow();
    });

    it('should reject invalid port', () => {
      expect(() => createService({ PORT: '0' })).toThrow();
      expect(() => createService({ PORT: '99999' })).toThrow();
    });

    it('should reject JWT secret shorter than 32 characters', () => {
      expect(() => createService({
        NODE_ENV: 'production',
        JWT_SECRET: 'too-short',
      })).toThrow(/JWT secret must be at least 32 characters/);
    });

    it('should require JWT_SECRET in production', () => {
      expect(() => createService({
        NODE_ENV: 'production',
      })).toThrow(/JWT_SECRET environment variable is required in production/);
    });
  });

  describe('isDevelopment / isProduction', () => {
    it('should return true for isDevelopment in development', () => {
      const service = createService({ NODE_ENV: 'development' });
      expect(service.isDevelopment()).toBe(true);
      expect(service.isProduction()).toBe(false);
    });

    it('should return true for isProduction in production', () => {
      const service = createService({
        NODE_ENV: 'production',
        JWT_SECRET: 'a'.repeat(64),
      });
      expect(service.isDevelopment()).toBe(false);
      expect(service.isProduction()).toBe(true);
    });
  });

  describe('getAll', () => {
    it('should return a shallow copy of config', () => {
      const service = createService();
      const config1 = service.getAll();
      const config2 = service.getAll();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2);
    });
  });
});
