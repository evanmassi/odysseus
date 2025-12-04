/**
 * Default Configuration
 *
 * Creates default storage configurations for fresh installs.
 * Uses shared-schemas constants for consistency.
 */

import { EQUIPMENT_DEFAULTS, NAMING_PATTERNS, SYSTEM_DEFAULTS } from '@odysseus/shared-schemas';

import { DEFAULT_GRID_CONFIG } from './gridHelpers';

import type {
  LabConfiguration,
  SystemConfiguration,
  TankConfiguration,
  BoxConfiguration,
} from '@odysseus/shared-schemas';

/**
 * Default Box Configuration
 */
const DEFAULT_BOX_CONFIG: BoxConfiguration = {
  id: 'default-box',
  name: 'Standard Box',
  gridConfig: DEFAULT_GRID_CONFIG,
};

/**
 * Default Tank Configuration
 * Uses shared constants for naming and defaults
 */
const DEFAULT_TANK_CONFIG: TankConfiguration = {
  id: NAMING_PATTERNS.TANK.ID_PATTERN(1),
  name: NAMING_PATTERNS.TANK.DEFAULT_NAME(1),
  location: NAMING_PATTERNS.TANK.DEFAULT_LOCATION,
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  defaultGridConfig: DEFAULT_GRID_CONFIG,
  racks: [
    {
      id: '1',
      name: NAMING_PATTERNS.RACK.DEFAULT_NAME(1),
      capacity: EQUIPMENT_DEFAULTS.BOXES_PER_RACK,
      isActive: true,
      boxes: Array.from({ length: EQUIPMENT_DEFAULTS.BOXES_PER_RACK }, (_, i) => ({
        id: NAMING_PATTERNS.BOX.LETTER_NAME(i),
        name: NAMING_PATTERNS.BOX.DEFAULT_NAME(i),
        gridConfig: DEFAULT_GRID_CONFIG,
        position: i + 1,
      })),
    },
  ],
};

/**
 * Default Lab Configuration
 * Uses shared constants for system defaults
 */
const DEFAULT_LAB_CONFIG: LabConfiguration = {
  id: 'default-lab',
  name: SYSTEM_DEFAULTS.LAB.NAME,
  organization: SYSTEM_DEFAULTS.LAB.ORGANIZATION,
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  equipment: {
    tanks: [DEFAULT_TANK_CONFIG],
    defaultBoxConfig: DEFAULT_BOX_CONFIG,
    defaultGridConfig: DEFAULT_GRID_CONFIG,
  },
  settings: {
    requireAuth: SYSTEM_DEFAULTS.SETTINGS.REQUIRE_AUTH,
    allowDataExport: true,
    enableRealTimeSync: SYSTEM_DEFAULTS.SETTINGS.ENABLE_REAL_TIME_SYNC,
  },
};

/**
 * Create default system configuration
 * Uses shared constants for all defaults
 */
export function createDefaultSystemConfig(): SystemConfiguration {
  return {
    currentLabId: DEFAULT_LAB_CONFIG.id,
    availableLabs: [DEFAULT_LAB_CONFIG],
    globalSettings: {
      theme: SYSTEM_DEFAULTS.SETTINGS.THEME,
      language: SYSTEM_DEFAULTS.SETTINGS.LANGUAGE,
      timezone: SYSTEM_DEFAULTS.SETTINGS.TIMEZONE,
      autoBackup: SYSTEM_DEFAULTS.SETTINGS.AUTO_BACKUP,
    },
    version: SYSTEM_DEFAULTS.CONFIGURATION.VERSION,
  };
}

/**
 * Create default configuration payload for fresh installs
 */
export function createDefaultConfiguration(): {
  systemConfig: SystemConfiguration;
  currentLab: LabConfiguration;
} {
  const systemConfig = createDefaultSystemConfig();
  return {
    systemConfig,
    currentLab: DEFAULT_LAB_CONFIG,
  };
}
