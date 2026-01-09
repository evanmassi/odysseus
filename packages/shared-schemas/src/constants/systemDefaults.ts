/**
 * System-Wide Defaults
 *
 * Used for initial setup and fallback values.
 */

export const SYSTEM_DEFAULTS = {
  /**
   * Laboratory configuration defaults
   */
  LAB: {
    /**
     * Default laboratory name for new labs
     */
    NAME: 'Standard Laboratory',

    /**
     * Default organization name
     */
    ORGANIZATION: 'Default Organization',
  },

  /**
   * System settings defaults
   */
  SETTINGS: {
    /**
     * Default timezone - Pacific Time (San Francisco)
     */
    TIMEZONE: 'America/Los_Angeles',

    /**
     * Default UI theme
     */
    THEME: 'light' as const,

    /**
     * Default language
     */
    LANGUAGE: 'en',

    /**
     * Auto-backup enabled by default
     */
    AUTO_BACKUP: true,

    /**
     * Authentication required by default
     */
    REQUIRE_AUTH: true,

    /**
     * Real-time sync enabled by default
     */
    ENABLE_REAL_TIME_SYNC: true,

    /**
     * Audit trail disabled by default
     * Can be enabled for compliance requirements
     */
    AUDIT_TRAIL_ENABLED: false,
  },

  /**
   * Configuration versioning
   */
  CONFIGURATION: {
    /**
     * Initial configuration version (increments on each change)
     */
    VERSION: 1,
  },
} as const;
