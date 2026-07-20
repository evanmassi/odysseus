/**
 * System-Wide Defaults
 *
 * Used for initial setup and fallback values.
 */

export const SYSTEM_DEFAULTS = {
  LAB: {
    NAME: 'Standard Laboratory',
  },

  SETTINGS: {
    AUTO_BACKUP: true,
    ENABLE_REAL_TIME_SYNC: true,
    // Can be enabled for compliance requirements
    AUDIT_TRAIL_ENABLED: false,
  },
} as const;
