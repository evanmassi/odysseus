/**
 * Validation Limits
 *
 * Enforced in both domain entities and API validation.
 */

export const VALIDATION_LIMITS = {
  TANK: {
    // e.g. "tank-1" (7 chars), "tank-999" (9 chars)
    ID_MAX_LENGTH: 50,
    // e.g. "Main Cryogenic Storage Building A Room 101"
    NAME_MAX_LENGTH: 100,
    MIN_RACKS: 1,
    MAX_RACKS: 100,
  },

  RACK: {
    MIN_BOXES: 1,
    // Limited by A-Z alphabet (26 letters)
    MAX_BOXES: 26,
  },

  BOX: {
    MIN_POSITIONS: 1,
    // ~31x31 grid at maximum
    MAX_POSITIONS: 1000,
    MIN_GRID_DIMENSION: 1,
  },
} as const;
