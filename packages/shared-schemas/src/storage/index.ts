/**
 * Storage Module Exports
 *
 * Lab configuration, equipment schemas, position display, and formatters.
 */

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
  StorageResponseSchema,
  type GridConfiguration,
  type BoxConfiguration,
  type RackConfiguration,
  type TankConfiguration,
  type EquipmentConfiguration,
  type LabConfiguration,
  type SystemConfiguration,
  type StorageResponse,
  addTankResponseSchema,
  addRacksResponseSchema,
  addBoxesResponseSchema,
  bulkOperationResponseSchema,
} from './storageSchemas';

export {
  addTankRequestSchema,
  updateTankRequestSchema,
  addRacksRequestSchema,
  updateRackRequestSchema,
  assignRackRequestSchema,
  addBoxesRequestSchema,
  updateBoxRequestSchema,
  assignBoxRequestSchema,
  updateResourceLabelRequestSchema,
  updateSystemStorageRequestSchema,
  initializeStorageRequestSchema,
  bulkUnassignRequestSchema,
  bulkReassignRequestSchema,
} from './storageRequestSchemas';

export {
  formatStorageDisplayName,
} from './storageFormatters';

export {
  positionDisplayFormatSchema,
  alphanumericConfigSchema,
  positionDisplayConfigSchema,
  positionDisplayPreferenceSchema,
  type PositionDisplayConfig,
  type PositionDisplayPreference,
  createAlphanumericConfig,
  createNumericConfig,
  getDefaultPositionDisplay,
} from './positionSchemas';

export {
  positionToLabel,
  labelToPosition,
} from './positionFormatters';
