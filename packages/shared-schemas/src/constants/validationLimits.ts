/**
 * Validation Limits
 * Single source of truth for validation constraints across the system
 * These limits are enforced in both domain entities and API validation
 */

export const VALIDATION_LIMITS = {
  /**
   * Tank validation constraints
   */
  TANK: {
    /**
     * Maximum length for tank ID
     * Example: "tank-1" (7 chars), "tank-999" (9 chars)
     */
    ID_MAX_LENGTH: 50,

    /**
     * Maximum length for tank name
     * Example: "Main Cryogenic Storage Building A Room 101"
     */
    NAME_MAX_LENGTH: 100,

    /**
     * Minimum number of racks a tank must have
     */
    MIN_RACKS: 1,

    /**
     * Maximum number of racks a tank can have
     */
    MAX_RACKS: 100,
  },

  /**
   * Rack validation constraints
   */
  RACK: {
    /**
     * Minimum number of boxes a rack must have
     */
    MIN_BOXES: 1,

    /**
     * Maximum number of boxes a rack can have
     * Limited by A-Z alphabet (26 letters)
     */
    MAX_BOXES: 26,
  },

  /**
   * Box validation constraints
   */
  BOX: {
    /**
     * Minimum number of positions a box can have
     */
    MIN_POSITIONS: 1,

    /**
     * Maximum number of positions a box can have
     * 1000 positions would be approximately 31x31 grid
     */
    MAX_POSITIONS: 1000,

    /**
     * Minimum grid dimension (rows or cols)
     * Must be at least 1x1
     */
    MIN_GRID_DIMENSION: 1,
  },
} as const;
