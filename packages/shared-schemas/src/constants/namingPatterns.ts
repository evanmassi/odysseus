/**
 * Naming Patterns and Conventions
 *
 * ID Pattern Design:
 * - Tanks: Globally unique with prefix pattern (tank-1, tank-2, etc.)
 * - Racks: Scoped within tank, simple sequential numbers ("1", "2", "3")
 * - Boxes: Scoped within rack, single letters ("A", "B", "C")
 */

export const NAMING_PATTERNS = {
  /**
   * Tank naming and ID patterns
   * Tanks are globally unique across the entire system
   */
  TANK: {
    /**
     * Programmatic ID prefix for tanks
     * Example: "tank-" + 1 = "tank-1"
     */
    PREFIX: 'tank-',

    /**
     * Generate default display name for a tank
     * @param n - Tank number (1-based)
     * @returns Display name like "Tank 1", "Tank 2", etc.
     *
     * Note: This is just a default - users can customize to any name
     */
    DEFAULT_NAME: (n: number): string => `Tank ${n}`,

    /**
     * Generate programmatic ID for a tank
     * @param n - Tank number (1-based)
     * @returns ID like "tank-1", "tank-2", etc.
     *
     * Note: IDs are system-generated and not customizable
     */
    ID_PATTERN: (n: number): string => `tank-${n}`,

    /**
     * Default physical location for new tanks
     * Users can customize this per tank
     */
    DEFAULT_LOCATION: 'Main Laboratory',
  },

  /**
   * Rack naming patterns
   * Racks are scoped within their parent tank
   * Location is implied by parent tank (nested relationship)
   */
  RACK: {
    /**
     * Generate default display name for a rack
     * @param n - Rack number (1-based)
     * @returns Display name like "Rack 1", "Rack 2", etc.
     *
     * Note: This is just a default - users can customize to any name
     */
    DEFAULT_NAME: (n: number): string => `Rack ${n}`,

    // Note: Racks don't need location - it's implied by parent tank (nested relationship)
  },

  /**
   * Box naming patterns
   * Boxes are scoped within their parent rack
   */
  BOX: {
    /**
     * Generate letter name for a box (A-Z)
     * @param index - Zero-based index (0 = A, 1 = B, etc.)
     * @returns Single letter like "A", "B", "C"
     *
     * Uses ASCII code where 65 = 'A'
     * Maximum index is 25 (= Z)
     */
    LETTER_NAME: (index: number): string => String.fromCharCode(65 + index),

    /**
     * Generate default display name for a box
     * @param index - Zero-based index (0 = A, 1 = B, etc.)
     * @returns Display name like "Box A", "Box B", etc.
     *
     * Note: This is just a default - users can customize to any name
     */
    DEFAULT_NAME: (index: number): string => `Box ${String.fromCharCode(65 + index)}`,
  },
} as const;
