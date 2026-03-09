/**
 * System-Wide Defaults
 *
 * Used for initial setup and fallback values.
 */

export const SYSTEM_DEFAULTS = {
  LAB: {
    NAME: 'Standard Laboratory',
    ORGANIZATION: 'Default Organization',
  },

  SETTINGS: {
    TIMEZONE: 'America/Los_Angeles', // Pacific Time (San Francisco)
    THEME: 'light' as const,
    LANGUAGE: 'en',
    AUTO_BACKUP: true,
    REQUIRE_AUTH: true,
    ENABLE_REAL_TIME_SYNC: true,
    // Can be enabled for compliance requirements
    AUDIT_TRAIL_ENABLED: false,
  },

  CONFIGURATION: {
    // Increments on each change
    VERSION: 1,
  },
} as const;
