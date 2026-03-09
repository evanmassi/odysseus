/**
 * Naming Patterns and Conventions
 *
 * Default display names and ID generators for storage equipment.
 * Tanks have globally unique IDs (tank-1, tank-2). Racks and boxes
 * are scoped within their parent and named sequentially.
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
