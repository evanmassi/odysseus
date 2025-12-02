/**
 * Storage Domain - Storage Equipment & Configuration
 *
 * Manages physical storage infrastructure including:
 * - Storage equipment (tanks, racks, boxes)
 * - Equipment layout and configuration
 * - Physical storage space management
 *
 * All types from shared-schemas.
 */

// Hooks (Server State)
export {
  useLoadStorageQuery,
  useStorageExistsQuery,
  useSaveStorageMutation,
  useUpdateResourceLabelMutation,
  useStorageSync,
} from './hooks/useStorageQuery';
export { useConfigurationSync } from './hooks/useConfigurationSync';

// Services
export { StorageService } from './services/StorageService';

// Creators (Object Creation)
export {
  createBoxFromDefaults,
  createRackFromDefaults,
  createTankFromDefaults,
  getNextTankNumber,
} from './creators/TankCreator';

// Types and Schemas (re-exported from shared package - SINGLE SOURCE OF TRUTH)
export type {
  GridConfiguration,
  BoxConfiguration,
  RackConfiguration,
  TankConfiguration,
  ColorScheme,
  EquipmentConfiguration,
  LabConfiguration,
  GlobalSettings,
  SystemConfiguration,
  ConfigurationResponse,
  SaveConfigurationRequest,
  DeleteTankResponse,
} from '@odysseus/shared-schemas';

export {
  GridConfigurationSchema,
  BoxConfigurationSchema,
  RackConfigurationSchema,
  TankConfigurationSchema,
  ColorSchemeSchema,
  EquipmentConfigurationSchema,
  LabConfigurationSchema,
  GlobalSettingsSchema,
  SystemConfigurationSchema,
  ConfigurationResponseSchema,
  SaveConfigurationRequestSchema,
  DeleteTankResponseSchema,
} from '@odysseus/shared-schemas';

// UI Helpers (computed properties)
export {
  getGridTotalPositions,
  getGridDisplayName,
  getGridType,
  createGridConfig,
  GRID_TEMPLATES,
  DEFAULT_GRID_CONFIG,
} from './utils/gridHelpers';

// Position Display Utilities
export {
  formatPositionForBox,
  parsePositionLabelForBox,
  isValidLabelForBox,
  generateLabelsForBox,
  getPositionDisplayForBox,
  hasCustomPositionDisplay,
  formatPositionRangesForBox,
} from './utils/positionDisplayUtils';

// UI Store (Local Storage State)
export * from './stores/storageStore';
