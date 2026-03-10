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
  SaveStorageRequestSchema,
  type GridConfiguration,
  type BoxConfiguration,
  type RackConfiguration,
  type TankConfiguration,
  type ColorScheme,
  type EquipmentConfiguration,
  type LabConfiguration,
  type GlobalSettings,
  type SystemConfiguration,
  type StorageResponse,
  type SaveStorageRequest,
} from './storageSchemas';

export {
  formatResourceDisplayName,
} from './storageFormatters';

export {
  positionDisplayFormatSchema,
  alphanumericConfigSchema,
  positionDisplayConfigSchema,
  positionDisplayPreferenceSchema,
  POSITION_DISPLAY_PRESETS,
  type PositionDisplayFormat,
  type AlphanumericConfig,
  type PositionDisplayConfig,
  type PositionDisplayPreference,
  generateAlphabeticLabels,
  generateNumericLabels,
  createAlphanumericConfig,
  createNumericConfig,
  getDefaultPositionDisplay,
} from './positionSchemas';

export {
  positionToLabel,
  labelToPosition,
  isValidPositionLabel,
  generatePositionLabels,
} from './positionFormatters';
