/**
 * Storage Domain - Storage Equipment & Configuration
 *
 * Manages physical storage infrastructure including:
 * - Storage equipment (tanks, racks, boxes)
 * - Equipment layout and configuration
 * - Physical storage space management
 *
 * All types from shared-schemas.
 *
 * Architecture:
 * - React Query is the SINGLE SOURCE OF TRUTH for server data
 * - Use useStorageData() to read server data
 * - Use CQRS mutation hooks (useAddTankMutation, etc.) to modify data
 */

// Hooks (Server State - Primary Data Access)
export { useStorageData, getStorageDataFromCache } from './hooks/useStorageData';
export {
  useLoadStorageQuery,
  useStorageExistsQuery,
  useUpdateResourceLabelMutation,
} from './hooks/useStorageQuery';
export { useConfigurationSync } from './hooks/useConfigurationSync';
export { useLocationDisplayNames } from './hooks/useLocationDisplayNames';
export type { LocationDisplayNames } from './hooks/useLocationDisplayNames';

// CQRS Equipment Mutation Hooks (Preferred for all modifications)
export {
  // Tank mutations
  useAddTankMutation,
  useUpdateTankMutation,
  useDeleteTankMutation,
  // Rack mutations
  useAddRacksMutation,
  useUpdateRackMutation,
  useDeleteRackMutation,
  useAssignRackMutation,
  // Box mutations
  useAddBoxesMutation,
  useUpdateBoxMutation,
  useDeleteBoxMutation,
  useAssignBoxMutation,
  // Bulk operations
  useBulkUnassignMutation,
  useBulkReassignMutation,
  useInitializeConfigurationMutation,
} from './hooks/useStorageEquipmentMutations';

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

// Default Configuration (for fresh installs)
export {
  createDefaultConfiguration,
  createDefaultSystemConfig,
} from './utils/defaultConfiguration';

// User Assignment Utilities
export { extractAssignedUserIds } from './utils/extractAssignedUserIds';

// Label Change Detection
export { extractLabelChanges } from './utils/extractLabelChanges';
export type { LabelChange } from './utils/extractLabelChanges';
