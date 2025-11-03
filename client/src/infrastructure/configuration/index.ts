/**
 * Infrastructure Configuration - Clean Architecture Layer
 * 
 * Export all infrastructure configuration following Clean Architecture principles.
 * Infrastructure layer contains configuration, external service integrations,
 * and framework-specific implementations.
 */

// Field path mapping
export {
  TUBE_FIELD_PATH_MAPPING,
  TUBE_FIELD_METADATA,
  FieldPathMappingValidator,
  validateTubeFieldPathMapping,
  FieldMappingUtils
} from './fieldPathMapping';
export type { 
  ValidTubeFieldKey,
  FieldMetadata 
} from './fieldPathMapping';

// Field configuration
export {
  TUBE_FIELD_SECTIONS,
  TubeFieldConfigurationService,
  FieldRenderingUtils,
  createTubeFieldConfigurationService,
  validateTubeFieldConfiguration,
  initializeTubeFieldConfiguration,
  FieldConfigDevUtils
} from './tubeFieldConfiguration';
export type {
  TubeFieldConfig,
  TubeFieldSection,
  FieldDisplayType
} from './tubeFieldConfiguration';
