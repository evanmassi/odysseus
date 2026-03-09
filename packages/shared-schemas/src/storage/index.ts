/**
 * Storage Barrel
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
  ConfigurationResponseSchema,
  SaveConfigurationRequestSchema,
  DeleteTankResponseSchema,
  type GridConfiguration,
  type BoxConfiguration,
  type RackConfiguration,
  type TankConfiguration,
  type ColorScheme,
  type EquipmentConfiguration,
  type LabConfiguration,
  type GlobalSettings,
  type SystemConfiguration,
  type ConfigurationResponse,
  type SaveConfigurationRequest,
  type DeleteTankResponse,
} from './configurationSchemas';

export {
  formatResourceDisplayName,
} from './formatters';

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
