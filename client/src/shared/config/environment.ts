/**
 * Environment Configuration
 *
 * Wrappers around Vite's build-time environment flags.
 */

export const env = {
  isDev: () => import.meta.env.DEV as boolean,
  isProd: () => import.meta.env.PROD as boolean,
} as const;
