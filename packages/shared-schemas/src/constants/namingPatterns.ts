/**
 * Naming Patterns and Conventions
 *
 * Default display names for storage equipment (tanks globally, racks/boxes scoped to parent).
 */

export const NAMING_PATTERNS = {
  TANK: {
    DEFAULT_NAME: (n: number): string => `Tank ${n}`,
  },

  // Location is implied by parent tank (nested relationship)
  RACK: {
    DEFAULT_NAME: (n: number): string => `Rack ${n}`,
  },

  BOX: {
    // Uses ASCII code where 65 = 'A'
    LETTER_NAME: (index: number): string => String.fromCharCode(65 + index),
    DEFAULT_NAME: (index: number): string => `Box ${String.fromCharCode(65 + index)}`,
  },
} as const;
