/**
 * Storage Domain
 *
 * Manages storage equipment (tanks, racks, boxes) and configuration.
 * Types from shared-schemas, data from React Query.
 */

// Hooks (Server State - Primary Data Access)
export { useStorageData, getStorageDataFromCache } from './hooks/useStorageData';
export { useLoadStorageQuery, useStorageExistsQuery } from './hooks/useStorageQueries';
export { useStorageSync } from './hooks/useStorageSync';
export { useStorageLocationNames } from './hooks/useStorageLocationNames';
export type { LocationDisplayNames } from './hooks/useStorageLocationNames';

// Equipment Mutation Hooks
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
  useUpdateResourceLabelMutation,
} from './hooks/useStorageMutations';

// Services
export { StorageService } from './services/StorageService';

// Types and Schemas (re-exported from shared package)
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
export { getGridTotalPositions, GRID_TEMPLATES, DEFAULT_GRID_CONFIG } from './utils/gridHelpers';

// Position Display Utilities
export { formatPositionForBox, formatPositionRangesForBox } from './utils/positionDisplayUtils';

// User Assignment Utilities
export { extractAssignedUserIds } from './utils/extractAssignedUserIds';
