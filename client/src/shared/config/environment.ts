/**
 * Environment Configuration
 *
 * Wrappers around Vite's build-time environment flags.
 */

export const env = {
  isDev: () => import.meta.env.DEV,
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty-string URL is invalid, must fall back
  apiBaseUrl: () => import.meta.env['VITE_API_URL'] || 'http://localhost:3001/api',
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty-string URL is invalid, must fall back
  socketUrl: () => import.meta.env['VITE_SOCKET_URL'] || 'http://localhost:3001',
} as const;
