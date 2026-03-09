/**
 * Naming Patterns and Conventions
 *
 * ID Pattern Design:
 * - Tanks: Globally unique with prefix pattern (tank-1, tank-2, etc.)
 * - Racks: Scoped within tank, simple sequential numbers ("1", "2", "3")
 * - Boxes: Scoped within rack, single letters ("A", "B", "C")
 */

export const NAMING_PATTERNS = {
  TANK: {
    PREFIX: 'tank-',
    DEFAULT_NAME: (n: number): string => `Tank ${n}`,
    // IDs are system-generated and not customizable
    ID_PATTERN: (n: number): string => `tank-${n}`,
    DEFAULT_LOCATION: 'Main Laboratory',
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
