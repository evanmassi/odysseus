/**
 * Tank Creator
 * Template-based object creation for consistent defaults
 *
 * Creates equipment configurations from EQUIPMENT_DEFAULTS constants.
 * Prevents data drift and ensures consistency across tank/rack/box creation.
 */

import { EQUIPMENT_DEFAULTS, NAMING_PATTERNS } from '@odysseus/shared-schemas';

import type {
  TankConfiguration,
  RackConfiguration,
  BoxConfiguration,
  GridConfiguration,
} from '@odysseus/shared-schemas';

/**
 * Create a fresh box configuration from defaults
 * No cloning - generated from constants
 */
export function createBoxFromDefaults(
  rackId: string,
  boxIndex: number,
  gridConfig: GridConfiguration
): BoxConfiguration {
  const boxLetter = NAMING_PATTERNS.BOX.LETTER_NAME(boxIndex);

  return {
    id: boxLetter,
    name: NAMING_PATTERNS.BOX.DEFAULT_NAME(boxIndex),
    gridConfig: {
      rows: gridConfig.rows,
      cols: gridConfig.cols,
      template: gridConfig.template,
    },
    position: boxIndex + 1, // Add position property (1-indexed)
  };
}

/**
 * Create a fresh rack configuration from defaults
 * Generates boxes using EQUIPMENT_DEFAULTS.BOXES_PER_RACK
 * No cloning - generated from constants
 */
export function createRackFromDefaults(
  tankId: string,
  rackNumber: number,
  gridConfig: GridConfiguration
): RackConfiguration {
  const rackId = rackNumber.toString();

  // Generate boxes A through J (or however many BOXES_PER_RACK specifies)
  const boxes: BoxConfiguration[] = Array.from(
    { length: EQUIPMENT_DEFAULTS.BOXES_PER_RACK },
    (_, i) => createBoxFromDefaults(`${tankId}-rack${rackId}`, i, gridConfig)
  );

  return {
    id: rackId,
    name: NAMING_PATTERNS.RACK.DEFAULT_NAME(rackNumber),
    capacity: EQUIPMENT_DEFAULTS.BOXES_PER_RACK, // Backend uses this for maxBoxes
    isActive: true,
    boxes,
  };
}

/**
 * Create a fresh tank configuration from defaults
 * Generates 3 default racks with boxes
 * No cloning - generated from constants
 *
 * @param tankNumber - Sequential tank number (1, 2, 3, ...)
 * @param gridConfig - Grid configuration for all boxes (from lab defaults)
 * @param numRacks - Number of racks to create (default: 3)
 */
export function createTankFromDefaults(
  tankNumber: number,
  gridConfig: GridConfiguration,
  numRacks: number = 3
): TankConfiguration {
  const tankId = NAMING_PATTERNS.TANK.ID_PATTERN(tankNumber);

  // Generate default racks (1, 2, 3)
  const racks: RackConfiguration[] = Array.from({ length: numRacks }, (_, i) =>
    createRackFromDefaults(tankId, i + 1, gridConfig)
  );

  return {
    id: tankId,
    name: NAMING_PATTERNS.TANK.DEFAULT_NAME(tankNumber),
    location: NAMING_PATTERNS.TANK.DEFAULT_LOCATION,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    defaultGridConfig: {
      rows: gridConfig.rows,
      cols: gridConfig.cols,
      template: gridConfig.template,
    },
    racks,
  };
}

/**
 * Get next available tank number from existing tanks
 */
export function getNextTankNumber(existingTanks: TankConfiguration[]): number {
  const tankNumbers = existingTanks
    .map(tank => tank.id.replace(NAMING_PATTERNS.TANK.PREFIX, ''))
    .filter(num => num !== undefined && num !== '')
    .map(num => parseInt(num!))
    .filter(num => !isNaN(num));

  return tankNumbers.length > 0 ? Math.max(...tankNumbers) + 1 : 1;
}
