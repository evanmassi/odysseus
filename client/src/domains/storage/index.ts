/**
 * Storage Domain
 *
 * Manages storage equipment (tanks, racks, boxes) and configuration.
 * Types from shared-schemas, data from React Query.
 */

// Hooks
export * from './hooks';

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
