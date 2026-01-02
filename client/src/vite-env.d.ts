/// <reference types="vite/client" />

/**
 * Vite Environment Variables Type Definitions
 *
 * This file provides TypeScript type definitions for Vite's environment variables.
 * Extends the default ImportMetaEnv interface with application-specific variables.
 */

interface ImportMetaEnv {
  // API & Socket configuration
  readonly VITE_API_URL?: string;
  readonly VITE_SOCKET_URL?: string;

  // Application configuration
  readonly VITE_APP_TITLE?: string;
  readonly VITE_APP_VERSION?: string;
  readonly VITE_API_TIMEOUT?: string;

  // Development & debugging
  readonly VITE_ENABLE_DEVTOOLS?: string;
  readonly VITE_LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error';
  readonly VITE_ENABLE_MOCK_API?: string;

  // Feature flags
  readonly VITE_ENABLE_ANALYTICS?: string;
  readonly VITE_ENABLE_ERROR_REPORTING?: string;
  readonly VITE_ENABLE_PERFORMANCE_MONITORING?: string;

  // Build configuration
  readonly VITE_PORT?: string;
  readonly VITE_BUILD_TARGET?: string;

  // Add other custom environment variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
