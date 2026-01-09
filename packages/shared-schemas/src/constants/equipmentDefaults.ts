/**
 * Equipment Configuration Defaults
 */

export const EQUIPMENT_DEFAULTS = {
  /**
   * Default number of boxes per rack when creating a new rack
   * Creates boxes A-J (10 boxes)
   */
  BOXES_PER_RACK: 10,

  /**
   * Default maximum number of racks per tank
   * Standard laboratory tank capacity
   */
  MAX_RACKS_PER_TANK: 10,

  /**
   * Default grid dimensions for storage boxes
   * 9x9 grid = 81 positions (standard size)
   */
  GRID_ROWS: 9,
  GRID_COLS: 9,

  /**
   * Default total positions per box
   * Calculated from GRID_ROWS × GRID_COLS
   */
  POSITIONS_PER_BOX: 81,
} as const;
