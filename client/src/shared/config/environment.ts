/**
 * Centralized Environment Configuration
 * 
 * Uses Vite's native environment variables for type-safe, build-optimized environment detection.
 * Replaces direct process.env.NODE_ENV access with proper Vite API.
 */

export const environment = {
  /**
   * True when running in development mode
   * Vite automatically sets this based on the command used (dev vs build)
   */
  isDevelopment: import.meta.env.DEV,

  /**
   * True when running in production mode
   * Vite automatically sets this based on the command used (dev vs build)
   */
  isProduction: import.meta.env.PROD,

  /**
   * Current mode string (development, production, test, etc.)
   */
  mode: import.meta.env.MODE,

  /**
   * Base URL for the application
   */
  baseUrl: import.meta.env.BASE_URL,
} as const;

/**
 * Type-safe environment utilities
 */
export const env = {
  /**
   * Check if we're in development mode
   */
  isDev: () => environment.isDevelopment,

  /**
   * Check if we're in production mode  
   */
  isProd: () => environment.isProduction,

  /**
   * Get the current mode
   */
  getMode: () => environment.mode,

  /**
   * Check if we're in a specific mode
   */
  isMode: (mode: string) => environment.mode === mode,

  /**
   * Check if we're in test mode
   */
  isTest: () => environment.mode === 'test',

  /**
   * Get a custom environment variable with optional default
   */
  get: (key: string, defaultValue?: string) =>
    (import.meta.env as Record<string, string | undefined>)[key] ?? defaultValue,

  /**
   * Get a boolean environment variable
   */
  getBoolean: (key: string, defaultValue = false) => {
    const value = (import.meta.env as Record<string, string | undefined>)[key];
    if (value === undefined) return defaultValue;
    return value === 'true' || value === '1' || value === 'yes';
  },

  /**
   * Get a number environment variable
   */
  getNumber: (key: string, defaultValue?: number) => {
    const value = (import.meta.env as Record<string, string | undefined>)[key];
    if (value === undefined) return defaultValue;
    const parsed = Number(value);
    return isNaN(parsed) ? defaultValue : parsed;
  },
} as const;
