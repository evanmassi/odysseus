/**
 * Storage Store
 * State management for storage equipment configurations
 * Types from shared-schemas (single source of truth)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  LabConfiguration,
  SystemConfiguration,
  TankConfiguration,
  RackConfiguration,
  BoxConfiguration,
  GridConfiguration,
  PositionDisplayConfig,
  EQUIPMENT_DEFAULTS,
  NAMING_PATTERNS,
  SYSTEM_DEFAULTS,
} from '@odysseus/shared-schemas';
import {
  DEFAULT_GRID_CONFIG,
  GRID_TEMPLATES,
} from '../utils/gridHelpers';

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
  deleteLab: (labId: string) => void;
  
  // Tank management
  addTank: (labId: string, tank: TankConfiguration) => void;
  updateTank: (labId: string, tankId: string, updates: Partial<TankConfiguration>) => void;
  deleteTank: (labId: string, tankId: string) => Promise<void>;
  deleteTankLocally: (labId: string, tankId: string) => void;

  // Equipment management
  addRack: (labId: string, tankId: string, rack: RackConfiguration) => void;
  updateRack: (labId: string, tankId: string, rackId: string, updates: Partial<RackConfiguration>) => void;
  deleteRack: (labId: string, tankId: string, rackId: string) => void;
  
  // Box management (individual customization)
  updateBox: (labId: string, tankId: string, rackId: string, boxId: string, updates: Partial<BoxConfiguration>) => void;
  addBoxToRack: (labId: string, tankId: string, rackId: string, box: BoxConfiguration) => void;
  deleteBox: (labId: string, tankId: string, rackId: string, boxId: string) => void;
  
  // Grid configuration
  updateBoxGridConfig: (labId: string, tankId: string, rackId: string, boxId: string, gridConfig: GridConfiguration) => void;
  getAvailableGridTemplates: () => readonly GridConfiguration[];
  
  // Utilities
  getCurrentTanks: () => TankConfiguration[];
  getCurrentRacks: (tankId?: string) => RackConfiguration[];
  getCurrentBoxes: (tankId: string, rackId: string) => BoxConfiguration[];
  getBox: (tankId: string, rackId: string, boxId: string) => BoxConfiguration | undefined;
  getBoxPositionDisplay: (tankId: string, rackId: string, boxId: string) => PositionDisplayConfig | undefined;
  resetToDefaults: () => void;
  
  // Server synchronization (now delegated to React Query)
  // Note: loadFromServer and saveToServer are deprecated - use React Query hooks instead
  loadFromServer: () => Promise<void>;
  saveToServer: () => Promise<void>;
  migrateConfigurationStructure: (config: any) => any;
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
  description: 'Standard laboratory storage box with 9x9 grid',
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
      location: NAMING_PATTERNS.TANK.DEFAULT_LOCATION,
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
function migrateGridConfig(oldGrid: any): GridConfiguration {
  if (!oldGrid) return DEFAULT_GRID_CONFIG;

  // If already has new format, return as-is
  if (oldGrid.cols !== undefined && oldGrid.template !== undefined) {
    return oldGrid as GridConfiguration;
  }

  // If has old format, convert it
  if (oldGrid.columns !== undefined) {
    // Determine template based on dimensions
    let template = 'standard';
    if (oldGrid.rows === 8 && oldGrid.columns === 8) template = 'compact';
    else if (oldGrid.rows === 9 && oldGrid.columns === 9) template = 'standard';
    else if (oldGrid.rows === 10 && oldGrid.columns === 10) template = 'large';
    else if (oldGrid.rows === 12 && oldGrid.columns === 8) template = 'rectangular';

    return {
      rows: oldGrid.rows,
      cols: oldGrid.columns,
      template
    };
  }

  return DEFAULT_GRID_CONFIG;
}

export const useStorageStore = create<ConfigurationState>()(
  persist(
    (set, get) => {
      // Helper to derive currentLab from systemConfig
      const deriveCurrentLab = (systemConfig: SystemConfiguration): LabConfiguration => {
        const lab = systemConfig.availableLabs.find(
          l => l.id === systemConfig.currentLabId
        );
        return lab || DEFAULT_LAB_CONFIG;
      };

      // Wrapped set function that auto-syncs currentLab
      const syncedSet = (updates: Partial<ConfigurationState> | ((state: ConfigurationState) => Partial<ConfigurationState>)) => {
        if (typeof updates === 'function') {
          set((state) => {
            const partial = updates(state);
            // If systemConfig changed, auto-sync currentLab
            if (partial.systemConfig) {
              return {
                ...partial,
                currentLab: deriveCurrentLab(partial.systemConfig)
              };
            }
            return partial;
          });
        } else {
          // If systemConfig changed, auto-sync currentLab
          if (updates.systemConfig) {
            set({
              ...updates,
              currentLab: deriveCurrentLab(updates.systemConfig)
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
              currentLabId: labId
            }
          });
          // currentLab automatically synced
        }
      },

      addLab: (lab: LabConfiguration) => {
        const { systemConfig } = get();
        const newLab = {
          ...lab,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        syncedSet({
          systemConfig: {
            ...systemConfig,
            availableLabs: [...systemConfig.availableLabs, newLab]
          }
        });
      },

      updateLab: (labId: string, updates: Partial<LabConfiguration>) => {
        const { systemConfig } = get();
        const updatedLabs = systemConfig.availableLabs.map(lab =>
          lab.id === labId
            ? { ...lab, ...updates, updatedAt: new Date().toISOString() }
            : lab
        );

        syncedSet({
          systemConfig: {
            ...systemConfig,
            availableLabs: updatedLabs
          }
        });
        // currentLab automatically synced
      },

      deleteLab: (labId: string) => {
        const { systemConfig } = get();
        const filteredLabs = systemConfig.availableLabs.filter(lab => lab.id !== labId);

        // If deleting current lab, switch to first available
        const newCurrentLabId = labId === systemConfig.currentLabId
          ? filteredLabs[0]?.id || DEFAULT_LAB_CONFIG.id
          : systemConfig.currentLabId;

        syncedSet({
          systemConfig: {
            ...systemConfig,
            availableLabs: filteredLabs,
            currentLabId: newCurrentLabId
          }
        });
        // currentLab automatically synced
      },

      addTank: (labId: string, tank: TankConfiguration) => {
        get().updateLab(labId, {
          equipment: {
            ...get().currentLab.equipment,
            tanks: [...get().currentLab.equipment.tanks, tank]
          }
        });
      },

      updateTank: (labId: string, tankId: string, updates: Partial<TankConfiguration>) => {
        const { systemConfig } = get();
        const lab = systemConfig.availableLabs.find(l => l.id === labId);
        if (!lab || !lab.equipment.tanks) return;

        const updatedTanks = lab.equipment.tanks.map(tank =>
          tank.id === tankId ? { ...tank, ...updates, updatedAt: new Date().toISOString() } : tank
        );

        // Create the updated lab with new tank data
        const updatedLab = {
          ...lab,
          equipment: {
            ...lab.equipment,
            tanks: updatedTanks
          },
          updatedAt: new Date().toISOString()
        };

        // Update availableLabs
        const updatedAvailableLabs = systemConfig.availableLabs.map(l =>
          l.id === labId ? updatedLab : l
        );

        syncedSet({
          systemConfig: {
            ...systemConfig,
            availableLabs: updatedAvailableLabs
          }
        });
        // currentLab automatically synced
      },

      deleteTank: async (labId: string, tankId: string) => {
        // Note: This method now requires React Query mutation to be called from components
        // The actual server deletion should be done via useDeleteTankMutation()
        // This method only handles local state cleanup
        
        console.warn('⚠️ ConfigurationStore.deleteTank() is deprecated. Use useDeleteTankMutation() from components instead.');
        
        // Only perform local cleanup
        const lab = get().systemConfig.availableLabs.find(l => l.id === labId);
        if (lab?.equipment?.tanks) {
          const filteredTanks = lab.equipment.tanks.filter(tank => tank.id !== tankId);
          get().updateLab(labId, {
            equipment: {
              ...lab.equipment,
              tanks: filteredTanks
            }
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
              tanks: filteredTanks
            }
          });
        }
      },

      addRack: (labId: string, tankId: string, rack: RackConfiguration) => {
        const lab = get().systemConfig.availableLabs.find(l => l.id === labId);
        if (!lab || !lab.equipment.tanks) return;

        const updatedTanks = lab.equipment.tanks.map(tank =>
          tank.id === tankId 
            ? { ...tank, racks: [...tank.racks, rack] }
            : tank
        );

        get().updateLab(labId, {
          equipment: {
            ...lab.equipment,
            tanks: updatedTanks
          }
        });
      },

      updateRack: (labId: string, tankId: string, rackId: string, updates: Partial<RackConfiguration>) => {
        const lab = get().systemConfig.availableLabs.find(l => l.id === labId);
        if (!lab || !lab.equipment.tanks) return;

        const updatedTanks = lab.equipment.tanks.map(tank =>
          tank.id === tankId
            ? {
                ...tank,
                racks: tank.racks.map(rack =>
                  rack.id === rackId ? { ...rack, ...updates } : rack
                )
              }
            : tank
        );

        get().updateLab(labId, {
          equipment: {
            ...lab.equipment,
            tanks: updatedTanks
          }
        });
      },

      deleteRack: (labId: string, tankId: string, rackId: string) => {
        const lab = get().systemConfig.availableLabs.find(l => l.id === labId);
        if (!lab || !lab.equipment.tanks) return;

        const updatedTanks = lab.equipment.tanks.map(tank =>
          tank.id === tankId
            ? { ...tank, racks: tank.racks.filter(rack => rack.id !== rackId) }
            : tank
        );

        get().updateLab(labId, {
          equipment: {
            ...lab.equipment,
            tanks: updatedTanks
          }
        });
      },

      updateBox: (labId: string, tankId: string, rackId: string, boxId: string, updates: Partial<BoxConfiguration>) => {
        const lab = get().systemConfig.availableLabs.find(l => l.id === labId);
        if (!lab || !lab.equipment.tanks) return;

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
                        )
                      }
                    : rack
                )
              }
            : tank
        );

        get().updateLab(labId, {
          equipment: {
            ...lab.equipment,
            tanks: updatedTanks
          }
        });
      },

      addBoxToRack: (labId: string, tankId: string, rackId: string, box: BoxConfiguration) => {
        const lab = get().systemConfig.availableLabs.find(l => l.id === labId);
        if (!lab || !lab.equipment.tanks) return;

        const updatedTanks = lab.equipment.tanks.map(tank =>
          tank.id === tankId
            ? {
                ...tank,
                racks: tank.racks.map(rack =>
                  rack.id === rackId
                    ? { ...rack, boxes: [...rack.boxes, box] }
                    : rack
                )
              }
            : tank
        );

        get().updateLab(labId, {
          equipment: {
            ...lab.equipment,
            tanks: updatedTanks
          }
        });
      },

      deleteBox: (labId: string, tankId: string, rackId: string, boxId: string) => {
        const lab = get().systemConfig.availableLabs.find(l => l.id === labId);
        if (!lab || !lab.equipment.tanks) return;

        const updatedTanks = lab.equipment.tanks.map(tank =>
          tank.id === tankId
            ? {
                ...tank,
                racks: tank.racks.map(rack =>
                  rack.id === rackId
                    ? { ...rack, boxes: rack.boxes.filter(box => box.id !== boxId) }
                    : rack
                )
              }
            : tank
        );

        get().updateLab(labId, {
          equipment: {
            ...lab.equipment,
            tanks: updatedTanks
          }
        });
      },

      updateBoxGridConfig: (labId: string, tankId: string, rackId: string, boxId: string, gridConfig: GridConfiguration) => {
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
        const racks = tank?.racks || [];

        return racks;
      },

      getCurrentBoxes: (tankId: string, rackId: string) => {
        const state = get();
        const currentLab = state.currentLab || DEFAULT_LAB_CONFIG;
        const equipment = currentLab.equipment;
        const tanks = equipment.tanks || [];
        const tank = tanks.find(t => t.id === tankId);
        const rack = tank?.racks?.find(r => r.id === rackId);
        return rack?.boxes || [];
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
          systemConfig: createDefaultSystemConfig()
        });
        // currentLab automatically synced
      },

      // Server synchronization methods (DEPRECATED - use React Query hooks)
      loadFromServer: async () => {
        console.warn('⚠️ ConfigurationStore.loadFromServer() is deprecated. Use useLoadConfigurationQuery() hook instead.');
        
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
          const existingRacks = (currentLab.equipment as any)?.racks;

          const tanks = existingRacks ? [
            {
              id: NAMING_PATTERNS.TANK.ID_PATTERN(1),
              name: NAMING_PATTERNS.TANK.DEFAULT_NAME(1),
              location: NAMING_PATTERNS.TANK.DEFAULT_LOCATION,
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              defaultGridConfig: DEFAULT_GRID_CONFIG,
              racks: existingRacks // Use existing racks
            }
          ] : [
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
                  boxes: Array.from({ length: EQUIPMENT_DEFAULTS.BOXES_PER_RACK }, (_, i) => ({
                    id: NAMING_PATTERNS.BOX.LETTER_NAME(i),
                    name: NAMING_PATTERNS.BOX.DEFAULT_NAME(i),
                    gridConfig: DEFAULT_GRID_CONFIG,
                    position: i + 1
                  }))
                }
              ]
            }
          ];

          const updatedLab = {
            ...currentLab,
            equipment: {
              ...currentLab.equipment,
              tanks
            }
          };

          // Remove old racks property if it exists
          if ((updatedLab.equipment as any).racks) {
            delete (updatedLab.equipment as any).racks;
          }

          // Update in availableLabs (single source of truth)
          const updatedAvailableLabs = systemConfig.availableLabs.map(lab =>
            lab.id === currentLab.id ? updatedLab : lab
          );

          syncedSet({
            systemConfig: {
              ...systemConfig,
              availableLabs: updatedAvailableLabs
            }
          });
          // currentLab automatically synced
        }
      },

      // Migration helper to convert old racks structure to tanks structure
      migrateConfigurationStructure: (config: any) => {
        if (config.currentLab?.equipment?.racks && !config.currentLab?.equipment?.tanks) {


          // Create a default tank with the existing racks
          const defaultTank = {
            id: NAMING_PATTERNS.TANK.ID_PATTERN(1),
            name: NAMING_PATTERNS.TANK.DEFAULT_NAME(1),
            location: NAMING_PATTERNS.TANK.DEFAULT_LOCATION,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            defaultGridConfig: DEFAULT_GRID_CONFIG,
            racks: config.currentLab.equipment.racks
          };

          // Update the structure
          config.currentLab.equipment.tanks = [defaultTank];
          delete config.currentLab.equipment.racks; // Remove old structure


        }
        return config;
      },

      saveToServer: async () => {
        console.warn('⚠️ ConfigurationStore.saveToServer() is deprecated. Use useSaveConfigurationMutation() hook instead.');
        
        // This method is now deprecated in favor of React Query mutations
        // Components should use useSaveConfigurationMutation() for consistent error handling and cache management
      },
      
      // Initialize and migrate data structure
      initialize: () => {
        get().ensureDefaultConfiguration();
      }
    };
  },
    {
      name: 'odysseus-configuration-store',
      version: 2, // Bumped version to trigger migration
      migrate: (persistedState: any, version: number) => {
        // Migrate from version 1 to version 2 (grid schema changes)
        if (version < 2) {
          const state = persistedState as any;

          // Migrate all grid configurations in the stored state
          if (state.currentLab?.equipment?.tanks) {
            state.currentLab.equipment.tanks = state.currentLab.equipment.tanks.map((tank: any) => ({
              ...tank,
              defaultGridConfig: migrateGridConfig(tank.defaultGridConfig),
              racks: tank.racks?.map((rack: any) => ({
                ...rack,
                boxes: rack.boxes?.map((box: any) => ({
                  ...box,
                  gridConfig: migrateGridConfig(box.gridConfig)
                }))
              }))
            }));
          }

          // Migrate default grid configs
          if (state.currentLab?.equipment?.defaultGridConfig) {
            state.currentLab.equipment.defaultGridConfig = migrateGridConfig(state.currentLab.equipment.defaultGridConfig);
          }

          if (state.currentLab?.equipment?.defaultBoxConfig?.gridConfig) {
            state.currentLab.equipment.defaultBoxConfig.gridConfig = migrateGridConfig(state.currentLab.equipment.defaultBoxConfig.gridConfig);
          }

          // Migrate all labs in systemConfig
          if (state.systemConfig?.availableLabs) {
            state.systemConfig.availableLabs = state.systemConfig.availableLabs.map((lab: any) => {
              if (!lab.equipment?.tanks) return lab;

              return {
                ...lab,
                equipment: {
                  ...lab.equipment,
                  defaultGridConfig: migrateGridConfig(lab.equipment.defaultGridConfig),
                  defaultBoxConfig: lab.equipment.defaultBoxConfig ? {
                    ...lab.equipment.defaultBoxConfig,
                    gridConfig: migrateGridConfig(lab.equipment.defaultBoxConfig.gridConfig)
                  } : undefined,
                  tanks: lab.equipment.tanks.map((tank: any) => ({
                    ...tank,
                    defaultGridConfig: migrateGridConfig(tank.defaultGridConfig),
                    racks: tank.racks?.map((rack: any) => ({
                      ...rack,
                      boxes: rack.boxes?.map((box: any) => ({
                        ...box,
                        gridConfig: migrateGridConfig(box.gridConfig)
                      }))
                    }))
                  }))
                }
              };
            });
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
