/**
 * Field Path Mapping Configuration
 *
 * Infrastructure layer configuration that defines the mapping between
 * flat field identifiers and nested object paths in the domain model.
 *
 * This configuration serves as the single source of truth for field access patterns,
 * enabling consistent data access across all components without hardcoding
 * nested property paths throughout the application.
 *
 * Architecture Benefits:
 * - Centralized field mapping reduces duplication
 * - Easy to update when domain model changes
 * - Type-safe field access through TypeScript
 * - Clear separation of concerns (config vs logic)
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { TubeData } from '@shared/types/Tube';

import type { FieldPathMapping } from '@domains/tubes/types/FieldResolver';

/**
 * Core field path mapping configuration
 *
 * Maps flat field keys to nested paths in the TubeData structure.
 * This configuration must be kept in sync with the actual TubeData interface.
 *
 * Format: 'fieldKey': 'nested.path.to.property'
 */
export const TUBE_FIELD_PATH_MAPPING: FieldPathMapping = {
  // SAMPLE DATA FIELDS
  cellType: 'sample.cellType',
  donorInternalId: 'sample.donorInternalId',
  donorSourceId: 'sample.donorSourceId',
  concentration: 'sample.concentration',
  concentrationUnit: 'sample.concentrationUnit',
  date: 'sample.date',
  media: 'sample.media',
  cultureCondition: 'sample.cultureCondition',
  lotNumber: 'sample.lotNumber',
  notes: 'sample.notes',

  // LOCATION FIELDS
  tankId: 'location.tankId',
  rackId: 'location.rackId',
  boxId: 'location.boxId',
  position: 'location.position',

  // DIRECT FIELDS (no nesting)
  researcherId: 'researcherId',
  id: 'id',

  // TIMESTAMP FIELDS
  createdAt: 'timestamps.createdAt',
  updatedAt: 'timestamps.updatedAt',
};

/**
 * Validated field keys - TypeScript utility type for compile-time validation
 * Ensures only valid field keys are used throughout the application
 */
export type ValidTubeFieldKey = keyof typeof TUBE_FIELD_PATH_MAPPING;

/**
 * Field metadata configuration
 * Additional information about fields for validation and display
 */
export interface FieldMetadata {
  /** Human-readable label for the field */
  label: string;
  /** Data type of the field */
  type: 'string' | 'number' | 'date' | 'boolean' | 'object';
  /** Whether this field is required */
  required?: boolean;
  /** Whether this field can be edited */
  editable?: boolean;
  /** Validation pattern for string fields */
  pattern?: RegExp;
  /** Description of the field for documentation */
  description?: string;
  /** Field category for grouping */
  category?: 'sample' | 'location' | 'metadata' | 'system';
}

/**
 * Field metadata mapping
 * Provides additional context for each field beyond just the path
 */
export const TUBE_FIELD_METADATA: Record<ValidTubeFieldKey, FieldMetadata> = {
  // Sample data fields
  cellType: {
    label: 'Cell Type',
    type: 'string',
    editable: true,
    category: 'sample',
    description: 'Type of cells stored in the tube',
  },
  donorInternalId: {
    label: 'Internal Donor ID',
    type: 'string',
    editable: true,
    category: 'sample',
    description: 'Internal laboratory donor identifier',
  },
  donorSourceId: {
    label: 'Source Donor ID',
    type: 'string',
    editable: true,
    category: 'sample',
    description: 'External source donor identifier',
  },
  concentration: {
    label: 'Concentration',
    type: 'number',
    editable: true,
    category: 'sample',
    description: 'Cell concentration in the tube',
  },
  concentrationUnit: {
    label: 'Concentration Unit',
    type: 'string',
    editable: true,
    category: 'sample',
    description: 'Unit of measurement for concentration',
  },
  date: {
    label: 'Storage Date',
    type: 'date',
    editable: true,
    category: 'sample',
    description: 'Date when sample was stored',
  },
  media: {
    label: 'Culture Media',
    type: 'string',
    editable: true,
    category: 'sample',
    description: 'Culture media used for the sample',
  },
  cultureCondition: {
    label: 'Culture Condition',
    type: 'string',
    editable: true,
    category: 'sample',
    description: 'Conditions under which sample was cultured',
  },
  lotNumber: {
    label: 'Lot Number',
    type: 'string',
    editable: true,
    category: 'sample',
    description: 'Batch or lot identification number',
  },
  notes: {
    label: 'Notes',
    type: 'string',
    editable: true,
    category: 'sample',
    description: 'Additional notes about the sample',
  },

  // Location fields
  tankId: {
    label: 'Tank ID',
    type: 'string',
    required: true,
    editable: false,
    category: 'location',
    description: 'Physical tank identifier',
  },
  rackId: {
    label: 'Rack ID',
    type: 'string',
    required: true,
    editable: false,
    category: 'location',
    description: 'Physical rack identifier within tank',
  },
  boxId: {
    label: 'Box ID',
    type: 'string',
    required: true,
    editable: false,
    category: 'location',
    description: 'Physical box identifier within rack',
  },
  position: {
    label: 'Position',
    type: 'number',
    required: true,
    editable: false,
    category: 'location',
    description: 'Numeric position within box (1-81)',
  },

  // Direct fields
  researcherId: {
    label: 'Researcher',
    type: 'string',
    editable: true,
    category: 'metadata',
    description: 'ID of researcher responsible for this tube',
  },
  id: {
    label: 'Tube ID',
    type: 'string',
    required: true,
    editable: false,
    category: 'system',
    description: 'Unique tube identifier',
  },

  // Timestamp fields
  createdAt: {
    label: 'Created Date',
    type: 'date',
    required: true,
    editable: false,
    category: 'system',
    description: 'Date and time when tube record was created',
  },
  updatedAt: {
    label: 'Updated Date',
    type: 'date',
    required: true,
    editable: false,
    category: 'system',
    description: 'Date and time when tube record was last updated',
  },
};

/**
 * Configuration validation utilities
 */
export class FieldPathMappingValidator {
  /**
   * Validate that all paths in the mapping are structurally sound
   */
  static validatePaths(mapping: FieldPathMapping): string[] {
    const errors: string[] = [];

    Object.entries(mapping).forEach(([fieldKey, path]) => {
      // Check for empty paths
      if (!path || path.trim() === '') {
        errors.push(`Field '${fieldKey}' has empty path`);
        return;
      }

      // Check for invalid path characters
      if (!/^[a-zA-Z0-9_.]+$/.test(path)) {
        errors.push(`Field '${fieldKey}' has invalid characters in path '${path}'`);
      }

      // Check for double dots
      if (path.includes('..')) {
        errors.push(`Field '${fieldKey}' has invalid double dots in path '${path}'`);
      }

      // Check path depth (reasonable limit)
      if (path.split('.').length > 5) {
        errors.push(`Field '${fieldKey}' path too deep: '${path}' (max 5 levels)`);
      }
    });

    return errors;
  }

  /**
   * Validate that all field keys follow naming conventions
   */
  static validateFieldKeys(mapping: FieldPathMapping): string[] {
    const errors: string[] = [];

    Object.keys(mapping).forEach(fieldKey => {
      // Check camelCase convention
      if (!/^[a-z][a-zA-Z0-9]*$/.test(fieldKey)) {
        errors.push(`Field key '${fieldKey}' does not follow camelCase convention`);
      }

      // Check reasonable length
      if (fieldKey.length > 50) {
        errors.push(`Field key '${fieldKey}' is too long (max 50 characters)`);
      }
    });

    return errors;
  }

  /**
   * Comprehensive validation of field path mapping
   */
  static validate(mapping: FieldPathMapping): { isValid: boolean; errors: string[] } {
    const pathErrors = this.validatePaths(mapping);
    const keyErrors = this.validateFieldKeys(mapping);
    const allErrors = [...pathErrors, ...keyErrors];

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
    };
  }
}

/**
 * Runtime configuration validation
 * Validates the current configuration during application startup
 */
export function validateTubeFieldPathMapping(): void {
  const validation = FieldPathMappingValidator.validate(TUBE_FIELD_PATH_MAPPING);

  if (!validation.isValid) {
    const errorMessage = `Field path mapping validation failed:\n${validation.errors.join('\n')}`;
    throw new Error(errorMessage);
  }

  // Additional runtime checks
  const fieldKeys = Object.keys(TUBE_FIELD_PATH_MAPPING);
  const metadataKeys = Object.keys(TUBE_FIELD_METADATA);

  // Ensure metadata exists for all field keys
  const missingMetadata = fieldKeys.filter(key => !metadataKeys.includes(key));
  if (missingMetadata.length > 0) {
    throw new Error(`Missing metadata for field keys: ${missingMetadata.join(', ')}`);
  }

  // Ensure no extra metadata exists
  const extraMetadata = metadataKeys.filter(key => !fieldKeys.includes(key));
  if (extraMetadata.length > 0) {
    throw new Error(`Extra metadata for unknown field keys: ${extraMetadata.join(', ')}`);
  }
}

/**
 * Development utilities for field mapping inspection
 */
export const FieldMappingUtils = {
  /**
   * Get all field keys by category
   */
  getFieldsByCategory(category: FieldMetadata['category']): ValidTubeFieldKey[] {
    return (Object.keys(TUBE_FIELD_METADATA) as ValidTubeFieldKey[]).filter(
      key => TUBE_FIELD_METADATA[key].category === category
    );
  },

  /**
   * Get editable fields only
   */
  getEditableFields(): ValidTubeFieldKey[] {
    return (Object.keys(TUBE_FIELD_METADATA) as ValidTubeFieldKey[]).filter(
      key => TUBE_FIELD_METADATA[key].editable === true
    );
  },

  /**
   * Get required fields only
   */
  getRequiredFields(): ValidTubeFieldKey[] {
    return (Object.keys(TUBE_FIELD_METADATA) as ValidTubeFieldKey[]).filter(
      key => TUBE_FIELD_METADATA[key].required === true
    );
  },

  /**
   * Get field metadata by key
   */
  getFieldMetadata(fieldKey: ValidTubeFieldKey): FieldMetadata {
    return TUBE_FIELD_METADATA[fieldKey];
  },

  /**
   * Get field path by key
   */
  getFieldPath(fieldKey: ValidTubeFieldKey): string {
    return TUBE_FIELD_PATH_MAPPING[fieldKey];
  },
};
