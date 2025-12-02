/**
 * Storage Store
 * State management for storage equipment configurations
 * Types from shared-schemas (single source of truth)
 */

import { EQUIPMENT_DEFAULTS, NAMING_PATTERNS, SYSTEM_DEFAULTS } from '@odysseus/shared-schemas';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { logger } from '@shared/infrastructure/logger';

import {
  isGridConfiguration,
  isLegacyGridConfig,
  hasEquipment,
  hasRacks,
  hasTanks,
} from '../types/migrations';
import { DEFAULT_GRID_CONFIG, GRID_TEMPLATES } from '../utils/gridHelpers';

import type {
  LabConfiguration,
  SystemConfiguration,
  TankConfiguration,
  RackConfiguration,
  BoxConfiguration,
  GridConfiguration,
  PositionDisplayConfig,
} from '@odysseus/shared-schemas';

interface ConfigurationState {
  // Current state
  systemConfig: SystemConfiguration;

  // Auto-synced from systemConfig.availableLabs
  // Single source of truth: availableLabs is authoritative, currentLab is auto-computed
  currentLab: LabConfiguration;

  // Actions
  setCurrentLab: (labId: string) => void;
  addLab: (lab: LabConfiguration) => void;
  updateLab: (labId: string, updates: Partial<LabConfiguration>) => void;
  replaceLab: (labId: string, lab: LabConfiguration) => void;
  deleteLab: (labId: string) => void;

  // Tank management
  addTank: (labId: string, tank: TankConfiguration) => void;
  updateTank: (labId: string, tankId: string, updates: Partial<TankConfiguration>) => void;
  deleteTank: (labId: string, tankId: string) => Promise<void>;
  deleteTankLocally: (labId: string, tankId: string) => void;

  // Equipment management
  addRack: (labId: string, tankId: string, rack: RackConfiguration) => void;
  updateRack: (
    labId: string,
    tankId: string,
    rackId: string,
    updates: Partial<RackConfiguration>
  ) => void;
  deleteRack: (labId: string, tankId: string, rackId: string) => void;

  // Box management (individual customization)
  updateBox: (
    labId: string,
    tankId: string,
    rackId: string,
    boxId: string,
    updates: Partial<BoxConfiguration>
  ) => void;
  addBoxToRack: (labId: string, tankId: string, rackId: string, box: BoxConfiguration) => void;
  deleteBox: (labId: string, tankId: string, rackId: string, boxId: string) => void;

  // Grid configuration
  updateBoxGridConfig: (
    labId: string,
    tankId: string,
    rackId: string,
    boxId: string,
    gridConfig: GridConfiguration
  ) => void;
  getAvailableGridTemplates: () => readonly GridConfiguration[];

  // Utilities
  getCurrentTanks: () => TankConfiguration[];
  getCurrentRacks: (tankId?: string) => RackConfiguration[];
  getCurrentBoxes: (tankId: string, rackId: string) => BoxConfiguration[];
  getBox: (tankId: string, rackId: string, boxId: string) => BoxConfiguration | undefined;
  getBoxPositionDisplay: (
    tankId: string,
    rackId: string,
    boxId: string
  ) => PositionDisplayConfig | undefined;
  resetToDefaults: () => void;

  // Server synchronization (now delegated to React Query)
  // Note: loadFromServer and saveToServer are deprecated - use React Query hooks instead
  loadFromServer: () => Promise<void>;
  saveToServer: () => Promise<void>;
  migrateConfigurationStructure: (config: unknown) => unknown;
  ensureDefaultConfiguration: () => void;
  initialize: () => void;
}

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
const createDefaultSystemConfig = (): SystemConfiguration => ({
  currentLabId: DEFAULT_LAB_CONFIG.id,
  availableLabs: [DEFAULT_LAB_CONFIG],
  globalSettings: {
    theme: SYSTEM_DEFAULTS.SETTINGS.THEME,
    language: SYSTEM_DEFAULTS.SETTINGS.LANGUAGE,
    timezone: SYSTEM_DEFAULTS.SETTINGS.TIMEZONE,
    autoBackup: SYSTEM_DEFAULTS.SETTINGS.AUTO_BACKUP,
  },
  version: SYSTEM_DEFAULTS.CONFIGURATION.VERSION,
});

/**
 * Migrate old GridConfiguration format to new format
 * Old: {rows, columns, totalPositions, displayName}
 * New: {rows, cols, template}
 */
function migrateGridConfig(oldGrid: unknown): GridConfiguration {
  if (!oldGrid) return DEFAULT_GRID_CONFIG;

  // If already has new format, return as-is
  if (isGridConfiguration(oldGrid)) {
    return oldGrid;
  }

  // If has old format, convert it
  if (isLegacyGridConfig(oldGrid)) {
    // Determine template based on dimensions
    let template = 'standard';
    if (oldGrid.rows === 8 && oldGrid.columns === 8) template = 'compact';
    else if (oldGrid.rows === 9 && oldGrid.columns === 9) template = 'standard';
    else if (oldGrid.rows === 10 && oldGrid.columns === 10) template = 'large';
    else if (oldGrid.rows === 12 && oldGrid.columns === 8) template = 'rectangular';

    return {
      rows: oldGrid.rows,
      cols: oldGrid.columns,
      template,
    };
  }

  return DEFAULT_GRID_CONFIG;
}

export const useStorageStore = create<ConfigurationState>()(
  persist(
    (set, get) => {
      // Helper to derive currentLab from systemConfig
      const deriveCurrentLab = (systemConfig: SystemConfiguration): LabConfiguration => {
        const lab = systemConfig.availableLabs.find(l => l.id === systemConfig.currentLabId);
        return lab ?? DEFAULT_LAB_CONFIG;
      };

      // Wrapped set function that auto-syncs currentLab
      const syncedSet = (
        updates:
          | Partial<ConfigurationState>
          | ((state: ConfigurationState) => Partial<ConfigurationState>)
      ) => {
        if (typeof updates === 'function') {
          set(state => {
            const partial = updates(state);
            // If systemConfig changed, auto-sync currentLab
            if (partial.systemConfig) {
              return {
                ...partial,
                currentLab: deriveCurrentLab(partial.systemConfig),
              };
            }
            return partial;
          });
        } else {
          // If systemConfig changed, auto-sync currentLab
          if (updates.systemConfig) {
            set({
              ...updates,
              currentLab: deriveCurrentLab(updates.systemConfig),
            });
          } else {
            set(updates);
          }
        }
      };

      const defaultSystemConfig = createDefaultSystemConfig();

      return {
        systemConfig: defaultSystemConfig,
        currentLab: deriveCurrentLab(defaultSystemConfig),

        setCurrentLab: (labId: string) => {
          const { systemConfig } = get();
          const lab = systemConfig.availableLabs.find(l => l.id === labId);
          if (lab) {
            syncedSet({
              systemConfig: {
                ...systemConfig,
                currentLabId: labId,
              },
            });
            // currentLab automatically synced
          }
        },

        addLab: (lab: LabConfiguration) => {
          const { systemConfig } = get();
          const newLab = {
            ...lab,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          syncedSet({
            systemConfig: {
              ...systemConfig,
              availableLabs: [...systemConfig.availableLabs, newLab],
            },
          });
        },

        updateLab: (labId: string, updates: Partial<LabConfiguration>) => {
          const { systemConfig } = get();
          const updatedLabs = systemConfig.availableLabs.map(lab =>
            lab.id === labId ? { ...lab, ...updates, updatedAt: new Date().toISOString() } : lab
          );

          syncedSet({
            systemConfig: {
              ...systemConfig,
              availableLabs: updatedLabs,
            },
          });
          // currentLab automatically synced
        },

        replaceLab: (labId: string, lab: LabConfiguration) => {
          const { systemConfig } = get();
          const updatedLabs = systemConfig.availableLabs.map(existing =>
            existing.id === labId ? { ...lab, updatedAt: new Date().toISOString() } : existing
          );

          syncedSet({
            systemConfig: {
              ...systemConfig,
              availableLabs: updatedLabs,
            },
          });
          // currentLab automatically synced
        },

        deleteLab: (labId: string) => {
          const { systemConfig } = get();
          const filteredLabs = systemConfig.availableLabs.filter(lab => lab.id !== labId);

          // If deleting current lab, switch to first available
          const newCurrentLabId =
            labId === systemConfig.currentLabId
              ? filteredLabs[0]?.id || DEFAULT_LAB_CONFIG.id
              : systemConfig.currentLabId;

          syncedSet({
            systemConfig: {
              ...systemConfig,
              availableLabs: filteredLabs,
              currentLabId: newCurrentLabId,
            },
          });
          // currentLab automatically synced
        },

        addTank: (labId: string, tank: TankConfiguration) => {
          get().updateLab(labId, {
            equipment: {
              ...get().currentLab.equipment,
              tanks: [...get().currentLab.equipment.tanks, tank],
            },
          });
        },

        updateTank: (labId: string, tankId: string, updates: Partial<TankConfiguration>) => {
          const { systemConfig } = get();
          const lab = systemConfig.availableLabs.find(l => l.id === labId);
          if (!lab?.equipment.tanks) return;

          const updatedTanks = lab.equipment.tanks.map(tank =>
            tank.id === tankId ? { ...tank, ...updates, updatedAt: new Date().toISOString() } : tank
          );

          // Create the updated lab with new tank data
          const updatedLab = {
            ...lab,
            equipment: {
              ...lab.equipment,
              tanks: updatedTanks,
            },
            updatedAt: new Date().toISOString(),
          };

          // Update availableLabs
          const updatedAvailableLabs = systemConfig.availableLabs.map(l =>
            l.id === labId ? updatedLab : l
          );

          syncedSet({
            systemConfig: {
              ...systemConfig,
              availableLabs: updatedAvailableLabs,
            },
          });
          // currentLab automatically synced
        },

        deleteTank: async (labId: string, tankId: string) => {
          // Remove tank from local state
          // Server sync handled by caller via saveToServer()
          const lab = get().systemConfig.availableLabs.find(l => l.id === labId);
          if (lab?.equipment?.tanks) {
            const filteredTanks = lab.equipment.tanks.filter(tank => tank.id !== tankId);
            get().updateLab(labId, {
              equipment: {
                ...lab.equipment,
                tanks: filteredTanks,
              },
            });
          }
        },

        deleteTankLocally: (labId: string, tankId: string) => {
          // Local tank deletion for use by React Query mutations
          const lab = get().systemConfig.availableLabs.find(l => l.id === labId);
          if (lab?.equipment?.tanks) {
            const filteredTanks = lab.equipment.tanks.filter(tank => tank.id !== tankId);
            get().updateLab(labId, {
              equipment: {
                ...lab.equipment,
                tanks: filteredTanks,
              },
            });
          }
        },

        addRack: (labId: string, tankId: string, rack: RackConfiguration) => {
          const lab = get().systemConfig.availableLabs.find(l => l.id === labId);
          if (!lab?.equipment.tanks) return;

          const updatedTanks = lab.equipment.tanks.map(tank =>
            tank.id === tankId ? { ...tank, racks: [...tank.racks, rack] } : tank
          );

          get().updateLab(labId, {
            equipment: {
              ...lab.equipment,
              tanks: updatedTanks,
            },
          });
        },

        updateRack: (
          labId: string,
          tankId: string,
          rackId: string,
          updates: Partial<RackConfiguration>
        ) => {
          const lab = get().systemConfig.availableLabs.find(l => l.id === labId);
          if (!lab?.equipment.tanks) return;

          const updatedTanks = lab.equipment.tanks.map(tank =>
            tank.id === tankId
              ? {
                  ...tank,
                  racks: tank.racks.map(rack =>
                    rack.id === rackId ? { ...rack, ...updates } : rack
                  ),
                }
              : tank
          );

          get().updateLab(labId, {
            equipment: {
              ...lab.equipment,
              tanks: updatedTanks,
            },
          });
        },

        deleteRack: (labId: string, tankId: string, rackId: string) => {
          const lab = get().systemConfig.availableLabs.find(l => l.id === labId);
          if (!lab?.equipment.tanks) return;

          const updatedTanks = lab.equipment.tanks.map(tank =>
            tank.id === tankId
              ? { ...tank, racks: tank.racks.filter(rack => rack.id !== rackId) }
              : tank
          );

          get().updateLab(labId, {
            equipment: {
              ...lab.equipment,
              tanks: updatedTanks,
            },
          });
        },

        updateBox: (
          labId: string,
          tankId: string,
          rackId: string,
          boxId: string,
          updates: Partial<BoxConfiguration>
        ) => {
          const lab = get().systemConfig.availableLabs.find(l => l.id === labId);
          if (!lab?.equipment.tanks) return;

          const updatedTanks = lab.equipment.tanks.map(tank =>
            tank.id === tankId
              ? {
                  ...tank,
                  racks: tank.racks.map(rack =>
                    rack.id === rackId
                      ? {
                          ...rack,
                          boxes: rack.boxes.map(box =>
                            box.id === boxId ? { ...box, ...updates } : box
                          ),
                        }
                      : rack
                  ),
                }
              : tank
          );

          get().updateLab(labId, {
            equipment: {
              ...lab.equipment,
              tanks: updatedTanks,
            },
          });
        },

        addBoxToRack: (labId: string, tankId: string, rackId: string, box: BoxConfiguration) => {
          const lab = get().systemConfig.availableLabs.find(l => l.id === labId);
          if (!lab?.equipment.tanks) return;

          const updatedTanks = lab.equipment.tanks.map(tank =>
            tank.id === tankId
              ? {
                  ...tank,
                  racks: tank.racks.map(rack =>
                    rack.id === rackId ? { ...rack, boxes: [...rack.boxes, box] } : rack
                  ),
                }
              : tank
          );

          get().updateLab(labId, {
            equipment: {
              ...lab.equipment,
              tanks: updatedTanks,
            },
          });
        },

        deleteBox: (labId: string, tankId: string, rackId: string, boxId: string) => {
          const lab = get().systemConfig.availableLabs.find(l => l.id === labId);
          if (!lab?.equipment.tanks) return;

          const updatedTanks = lab.equipment.tanks.map(tank =>
            tank.id === tankId
              ? {
                  ...tank,
                  racks: tank.racks.map(rack =>
                    rack.id === rackId
                      ? { ...rack, boxes: rack.boxes.filter(box => box.id !== boxId) }
                      : rack
                  ),
                }
              : tank
          );

          get().updateLab(labId, {
            equipment: {
              ...lab.equipment,
              tanks: updatedTanks,
            },
          });
        },

        updateBoxGridConfig: (
          labId: string,
          tankId: string,
          rackId: string,
          boxId: string,
          gridConfig: GridConfiguration
        ) => {
          get().updateBox(labId, tankId, rackId, boxId, { gridConfig });
        },

        getAvailableGridTemplates: () => GRID_TEMPLATES,

        getCurrentTanks: () => {
          const state = get();
          const currentLab = state.currentLab || DEFAULT_LAB_CONFIG;
          const tanks = currentLab.equipment?.tanks || [];

          return tanks;
        },

        getCurrentRacks: (tankId?: string) => {
          const state = get();
          const currentLab = state.currentLab || DEFAULT_LAB_CONFIG;
          const equipment = currentLab.equipment;
          const tanks = equipment?.tanks || [];

          if (!tankId) {
            // Return all racks from all tanks for backwards compatibility
            const allRacks = tanks.flatMap(tank => tank.racks || []);

            return allRacks;
          }

          const tank = tanks.find(t => t.id === tankId);
          const racks = tank?.racks ?? [];

          return racks;
        },

        getCurrentBoxes: (tankId: string, rackId: string) => {
          const state = get();
          const currentLab = state.currentLab || DEFAULT_LAB_CONFIG;
          const equipment = currentLab.equipment;
          const tanks = equipment.tanks || [];
          const tank = tanks.find(t => t.id === tankId);
          const rack = tank?.racks?.find(r => r.id === rackId);
          return rack?.boxes ?? [];
        },

        getBox: (tankId: string, rackId: string, boxId: string) => {
          const equipment = get().currentLab.equipment;
          const tanks = equipment.tanks || [];
          const tank = tanks.find(t => t.id === tankId);
          const rack = tank?.racks?.find(r => r.id === rackId);
          const box = rack?.boxes?.find(b => b.id === boxId);
          return box;
        },

        getBoxPositionDisplay: (tankId: string, rackId: string, boxId: string) => {
          const equipment = get().currentLab.equipment;
          const tanks = equipment.tanks || [];
          const tank = tanks.find(t => t.id === tankId);
          const rack = tank?.racks?.find(r => r.id === rackId);
          const box = rack?.boxes?.find(b => b.id === boxId);
          return box?.positionDisplay;
        },

        resetToDefaults: () => {
          syncedSet({
            systemConfig: createDefaultSystemConfig(),
          });
          // currentLab automatically synced
        },

        // Server synchronization methods (DEPRECATED - use React Query hooks)
        loadFromServer: async () => {
          logger.warn(
            '⚠️ ConfigurationStore.loadFromServer() is deprecated. Use useLoadConfigurationQuery() hook instead.'
          );

          // Fallback to ensure defaults for legacy compatibility
          get().ensureDefaultConfiguration();
        },

        // Ensure we have a valid default configuration
        ensureDefaultConfiguration: () => {
          const { systemConfig } = get();
          const currentLab = get().currentLab; // Access via getter

          // If current lab doesn't have tanks structure, fix it
          if (!currentLab.equipment.tanks) {
            // Check if we have existing racks to migrate
            const equipment = currentLab.equipment as Record<string, unknown>;
            const existingRacks = hasRacks(equipment) ? equipment['racks'] : undefined;

            const tanks = existingRacks
              ? [
                  {
                    id: NAMING_PATTERNS.TANK.ID_PATTERN(1),
                    name: NAMING_PATTERNS.TANK.DEFAULT_NAME(1),
                    location: NAMING_PATTERNS.TANK.DEFAULT_LOCATION,
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    defaultGridConfig: DEFAULT_GRID_CONFIG,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Type assertion after hasRacks validation
                    racks: existingRacks as any, // Type-safe cast: hasRacks already validated structure
                  },
                ]
              : [
                  {
                    id: NAMING_PATTERNS.TANK.ID_PATTERN(1),
                    name: NAMING_PATTERNS.TANK.DEFAULT_NAME(1),
                    location: NAMING_PATTERNS.TANK.DEFAULT_LOCATION,
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    defaultGridConfig: DEFAULT_GRID_CONFIG,
                    racks: [
                      {
                        id: 1,
                        name: NAMING_PATTERNS.RACK.DEFAULT_NAME(1),
                        capacity: EQUIPMENT_DEFAULTS.BOXES_PER_RACK,
                        location: NAMING_PATTERNS.TANK.DEFAULT_LOCATION,
                        isActive: true,
                        boxes: Array.from(
                          { length: EQUIPMENT_DEFAULTS.BOXES_PER_RACK },
                          (_, i) => ({
                            id: NAMING_PATTERNS.BOX.LETTER_NAME(i),
                            name: NAMING_PATTERNS.BOX.DEFAULT_NAME(i),
                            gridConfig: DEFAULT_GRID_CONFIG,
                            position: i + 1,
                          })
                        ),
                      },
                    ],
                  },
                ];

            const updatedLab = {
              ...currentLab,
              equipment: {
                ...currentLab.equipment,
                tanks,
              },
            };

            // Remove old racks property if it exists
            const updatedEquipment = updatedLab.equipment as Record<string, unknown>;
            if (hasRacks(updatedEquipment)) {
              Reflect.deleteProperty(updatedEquipment, 'racks');
            }

            // Update in availableLabs (single source of truth)
            const updatedAvailableLabs = systemConfig.availableLabs.map(lab =>
              lab.id === currentLab.id ? updatedLab : lab
            );

            syncedSet({
              systemConfig: {
                ...systemConfig,
                availableLabs: updatedAvailableLabs,
              },
            });
            // currentLab automatically synced
          }
        },

        // Migration helper to convert old racks structure to tanks structure
        migrateConfigurationStructure: (config: unknown) => {
          // Type guard: ensure config has the expected structure
          if (typeof config !== 'object' || config === null || !('currentLab' in config)) {
            return config;
          }

          const configObj = config as Record<string, unknown>;
          const currentLab = configObj['currentLab'];

          if (!hasEquipment(currentLab)) {
            return config;
          }

          // Check if migration is needed (has racks but no tanks)
          const equipment = currentLab.equipment as Record<string, unknown>;
          if (hasRacks(currentLab.equipment) && !hasTanks(currentLab.equipment)) {
            // Create a default tank with the existing racks
            const defaultTank = {
              id: NAMING_PATTERNS.TANK.ID_PATTERN(1),
              name: NAMING_PATTERNS.TANK.DEFAULT_NAME(1),
              location: NAMING_PATTERNS.TANK.DEFAULT_LOCATION,
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              defaultGridConfig: DEFAULT_GRID_CONFIG,
              racks: equipment['racks'],
            };

            // Update the structure
            equipment['tanks'] = [defaultTank];
            delete equipment['racks'];
          }

          return config;
        },

        saveToServer: async () => {
          logger.warn(
            '⚠️ ConfigurationStore.saveToServer() is deprecated. Use useSaveConfigurationMutation() hook instead.'
          );

          // This method is now deprecated in favor of React Query mutations
          // Components should use useSaveConfigurationMutation() for consistent error handling and cache management
        },

        // Initialize and migrate data structure
        initialize: () => {
          get().ensureDefaultConfiguration();
        },
      };
    },
    {
      name: 'odysseus-configuration-store',
      version: 2, // Bumped version to trigger migration
      migrate: (persistedState: unknown, version: number) => {
        // Migrate from version 1 to version 2 (grid schema changes)
        if (version < 2) {
          const state = persistedState as Record<string, unknown>;

          // Migrate all grid configurations in the stored state
          if (state['currentLab'] && hasEquipment(state['currentLab'])) {
            const equipment = (state['currentLab'] as Record<string, unknown>)[
              'equipment'
            ] as Record<string, unknown>;

            if (hasTanks(equipment)) {
              equipment['tanks'] = (equipment['tanks'] as unknown[]).map((tank: unknown) => {
                const tankObj = tank as Record<string, unknown>;
                return {
                  ...tankObj,
                  defaultGridConfig: migrateGridConfig(tankObj['defaultGridConfig']),
                  racks: Array.isArray(tankObj['racks'])
                    ? (tankObj['racks'] as unknown[]).map((rack: unknown) => {
                        const rackObj = rack as Record<string, unknown>;
                        return {
                          ...rackObj,
                          boxes: Array.isArray(rackObj['boxes'])
                            ? (rackObj['boxes'] as unknown[]).map((box: unknown) => {
                                const boxObj = box as Record<string, unknown>;
                                return {
                                  ...boxObj,
                                  gridConfig: migrateGridConfig(boxObj['gridConfig']),
                                };
                              })
                            : rackObj['boxes'],
                        };
                      })
                    : tankObj['racks'],
                };
              });
            }
          }

          // Migrate default grid configs
          if (state['currentLab'] && hasEquipment(state['currentLab'])) {
            const equipment = (state['currentLab'] as Record<string, unknown>)[
              'equipment'
            ] as Record<string, unknown>;

            if ('defaultGridConfig' in equipment) {
              equipment['defaultGridConfig'] = migrateGridConfig(equipment['defaultGridConfig']);
            }

            if (
              'defaultBoxConfig' in equipment &&
              typeof equipment['defaultBoxConfig'] === 'object' &&
              equipment['defaultBoxConfig'] !== null
            ) {
              const boxConfig = equipment['defaultBoxConfig'] as Record<string, unknown>;
              if ('gridConfig' in boxConfig) {
                boxConfig['gridConfig'] = migrateGridConfig(boxConfig['gridConfig']);
              }
            }
          }

          // Migrate all labs in systemConfig
          if (
            state['systemConfig'] &&
            typeof state['systemConfig'] === 'object' &&
            state['systemConfig'] !== null
          ) {
            const systemConfig = state['systemConfig'] as Record<string, unknown>;

            if ('availableLabs' in systemConfig && Array.isArray(systemConfig['availableLabs'])) {
              systemConfig['availableLabs'] = systemConfig['availableLabs'].map((lab: unknown) => {
                const labObj = lab as Record<string, unknown>;

                if (
                  !hasEquipment(labObj) ||
                  !hasTanks(labObj['equipment'] as Record<string, unknown>)
                ) {
                  return lab;
                }

                const labEquipment = labObj['equipment'] as Record<string, unknown>;

                return {
                  ...labObj,
                  equipment: {
                    ...labEquipment,
                    defaultGridConfig: migrateGridConfig(labEquipment['defaultGridConfig']),
                    defaultBoxConfig:
                      labEquipment['defaultBoxConfig'] &&
                      typeof labEquipment['defaultBoxConfig'] === 'object'
                        ? {
                            ...(labEquipment['defaultBoxConfig'] as Record<string, unknown>),
                            gridConfig: migrateGridConfig(
                              (labEquipment['defaultBoxConfig'] as Record<string, unknown>)[
                                'gridConfig'
                              ]
                            ),
                          }
                        : undefined,
                    tanks: (labEquipment['tanks'] as unknown[]).map((tank: unknown) => {
                      const tankObj = tank as Record<string, unknown>;
                      return {
                        ...tankObj,
                        defaultGridConfig: migrateGridConfig(tankObj['defaultGridConfig']),
                        racks: Array.isArray(tankObj['racks'])
                          ? (tankObj['racks'] as unknown[]).map((rack: unknown) => {
                              const rackObj = rack as Record<string, unknown>;
                              return {
                                ...rackObj,
                                boxes: Array.isArray(rackObj['boxes'])
                                  ? (rackObj['boxes'] as unknown[]).map((box: unknown) => {
                                      const boxObj = box as Record<string, unknown>;
                                      return {
                                        ...boxObj,
                                        gridConfig: migrateGridConfig(boxObj['gridConfig']),
                                      };
                                    })
                                  : rackObj['boxes'],
                              };
                            })
                          : tankObj['racks'],
                      };
                    }),
                  },
                };
              });
            }
          }
        }

        return persistedState;
      },
    }
  )
);

// Utility hooks for common operations
export const useCurrentLab = () => {
  const currentLab = useStorageStore(state => state.currentLab);
  return currentLab;
};

export const useCurrentTanks = () => {
  const getCurrentTanks = useStorageStore(state => state.getCurrentTanks);
  return getCurrentTanks();
};

export const useCurrentRacks = (tankId?: string) => {
  const getCurrentRacks = useStorageStore(state => state.getCurrentRacks);
  return getCurrentRacks(tankId);
};

export const useCurrentBoxes = (tankId: string, rackId: string) => {
  const getCurrentBoxes = useStorageStore(state => state.getCurrentBoxes);
  return getCurrentBoxes(tankId, rackId);
};

export const useGridTemplates = () => {
  const getAvailableGridTemplates = useStorageStore(state => state.getAvailableGridTemplates);
  return getAvailableGridTemplates();
};
