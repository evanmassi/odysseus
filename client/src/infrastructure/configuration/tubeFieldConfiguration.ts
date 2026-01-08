/**
 * Tube Field Configuration - Infrastructure Layer
 *
 * Configuration that defines how tube fields should be displayed, validated,
 * and processed across the application. This configuration works in conjunction
 * with the Field Resolver service to provide consistent field handling.
 *
 * Architecture Benefits:
 * - Single source of truth for field display configuration
 * - Resolver-compatible field definitions
 * - Type-safe field configuration with validation
 * - Separation of field access (resolver) from field presentation (config)
 */

import { env } from '@shared/config';
import { logger } from '@shared/infrastructure/logger';
import { formatToScientificNotation } from '@shared/utils/scientificNotation';

import type { ValidTubeFieldKey } from './fieldPathMapping';
import type { FieldResolver } from '@domains/tubes/types/FieldResolver';
import type { TubeData } from '@odysseus/shared-schemas';

export type FieldDisplayType =
  | 'text'
  | 'select'
  | 'date'
  | 'concentration'
  | 'textarea'
  | 'readonly';

/**
 * Field configuration for display and form rendering
 * Works with field resolver to provide complete field handling
 */
export interface TubeFieldConfig {
  /** Field key that maps to field resolver */
  key: ValidTubeFieldKey;
  /** Human-readable label */
  label: string;
  /** Display type for rendering */
  displayType: FieldDisplayType;
  /** Placeholder text for inputs */
  placeholder?: string;
  /** Whether field is required for forms */
  required?: boolean;
  /** Grid column span for layout */
  gridSpan?: number;
  /** Custom renderer function */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic field value for flexible rendering
  customRenderer?: (value: any, tube: TubeData) => React.ReactNode;
  /** Field validation function */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic field value for flexible validation
  validator?: (value: any) => boolean;
  /** Value transformation for display */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic field value transformation
  displayTransform?: (value: any) => any;
  /** Options for select fields */
  selectOptions?: Array<{ value: string; label: string }>;
  /** Dynamic options generator */
  getSelectOptions?: () => Array<{ value: string; label: string }>;
}

/**
 * Section configuration for grouping related fields
 */
export interface TubeFieldSection {
  key: string;
  title: string;
  description?: string;
  borderColor: string;
  headerColor: string;
  backgroundColor?: string;
  fields: TubeFieldConfig[];
  columns: number;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

/**
 * Complete tube field configuration using field resolver pattern
 */
export const TUBE_FIELD_SECTIONS: TubeFieldSection[] = [
  {
    key: 'primary',
    title: 'PRIMARY INFORMATION',
    description: 'Core sample identification and classification',
    borderColor: 'border-odysseus-primary',
    headerColor: 'text-odysseus-primary',
    backgroundColor: 'bg-blue-50',
    columns: 3,
    fields: [
      {
        key: 'cellType',
        label: 'Cell Type',
        displayType: 'text',
        placeholder: 'e.g., Jurkat, HEK293, HeLa',
        required: false,
        gridSpan: 1,
        validator: (value: string) => !value || value.length <= 100,
        displayTransform: (value: string) => value?.trim(),
      },
      {
        key: 'donorInternalId',
        label: 'Internal Donor ID',
        displayType: 'text',
        placeholder: 'Internal tracking ID',
        required: false,
        gridSpan: 1,
        validator: (value: string) => !value || /^[A-Za-z0-9\-_]+$/.test(value),
      },
      {
        key: 'donorSourceId',
        label: 'Source Donor ID',
        displayType: 'text',
        placeholder: 'External source ID',
        required: false,
        gridSpan: 1,
        validator: (value: string) => !value || value.length <= 50,
      },
    ],
  },
  {
    key: 'sample',
    title: 'SAMPLE DETAILS',
    description: 'Scientific and experimental sample information',
    borderColor: 'border-purple-400',
    headerColor: 'text-purple-600',
    backgroundColor: 'bg-purple-50',
    columns: 3,
    fields: [
      {
        key: 'concentration',
        label: 'Concentration',
        displayType: 'concentration',
        placeholder: 'e.g., 5e6, 1.5E+07',
        required: false,
        gridSpan: 2,
        displayTransform: (value: number) => {
          if (!value) return '';
          return value >= 1000 ? formatToScientificNotation(value.toString()) : value.toString();
        },
        validator: (value: string | number) => {
          if (!value) return true;
          const numValue = typeof value === 'string' ? parseFloat(value) : value;
          return !isNaN(numValue) && numValue > 0;
        },
      },
      {
        key: 'concentrationUnit',
        label: 'Unit',
        displayType: 'select',
        required: false,
        gridSpan: 1,
        selectOptions: [
          { value: '', label: 'Select unit' },
          { value: 'c/v', label: 'c/v' },
          { value: 'c/mL', label: 'c/mL' },
        ],
      },
      {
        key: 'media',
        label: 'Culture Media',
        displayType: 'text',
        placeholder: 'e.g., RPMI +10% HI-FBS',
        required: false,
        gridSpan: 1,
        validator: (value: string) => !value || value.length <= 100,
      },
      {
        key: 'cultureCondition',
        label: 'Culture Condition',
        displayType: 'text',
        placeholder: 'e.g., 5% O₂, 37°C',
        required: false,
        gridSpan: 1,
        validator: (value: string) => !value || value.length <= 100,
      },
      {
        key: 'lotNumber',
        label: 'Lot Number',
        displayType: 'text',
        placeholder: 'e.g., LOT001, BATCH-2025-01',
        required: false,
        gridSpan: 1,
        validator: (value: string) => !value || /^[A-Za-z0-9\-_]+$/.test(value),
      },
      {
        key: 'date',
        label: 'Storage Date',
        displayType: 'date',
        required: false,
        gridSpan: 1,
        validator: (value: string) => {
          if (!value) return true;
          const date = new Date(value);
          return !isNaN(date.getTime()) && date <= new Date();
        },
      },
    ],
  },
  {
    key: 'metadata',
    title: 'RESEARCHER & NOTES',
    description: 'Ownership and additional information',
    borderColor: 'border-gray-400',
    headerColor: 'text-gray-600',
    backgroundColor: 'bg-gray-50',
    columns: 1,
    fields: [
      {
        key: 'researcherId',
        label: 'Researcher',
        displayType: 'select',
        placeholder: 'Select researcher',
        required: false,
        gridSpan: 1,
        getSelectOptions: () => {
          // This will be populated dynamically by components
          // Components should inject researcher data
          return [{ value: '', label: 'Select researcher' }];
        },
      },
      {
        key: 'notes',
        label: 'Additional Notes',
        displayType: 'textarea',
        placeholder: 'Additional notes and observations...',
        required: false,
        gridSpan: 1,
        validator: (value: string) => !value || value.length <= 1000,
      },
    ],
  },
];

/**
 * Utility functions for working with field configuration
 */
export class TubeFieldConfigurationService {
  private readonly fieldResolver: FieldResolver;

  constructor(fieldResolver: FieldResolver) {
    this.fieldResolver = fieldResolver;
  }

  /**
   * Get all field configurations flattened
   */
  getAllFields(): TubeFieldConfig[] {
    return TUBE_FIELD_SECTIONS.flatMap(section => section.fields);
  }

  /**
   * Get field configuration by key
   */
  getFieldConfig(fieldKey: ValidTubeFieldKey): TubeFieldConfig | undefined {
    return this.getAllFields().find(field => field.key === fieldKey);
  }

  /**
   * Get section configuration by key
   */
  getSectionConfig(sectionKey: string): TubeFieldSection | undefined {
    return TUBE_FIELD_SECTIONS.find(section => section.key === sectionKey);
  }

  /**
   * Get field value using resolver with display transformation
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic field value return type
  getDisplayValue(tube: TubeData, fieldKey: ValidTubeFieldKey): any {
    const config = this.getFieldConfig(fieldKey);
    const rawValue = this.fieldResolver.getValue(tube, fieldKey);

    if (config?.displayTransform) {
      return config.displayTransform(rawValue);
    }

    return rawValue;
  }

  /**
   * Validate field value using configuration rules
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic field value for validation
  validateFieldValue(fieldKey: ValidTubeFieldKey, value: any): boolean {
    const config = this.getFieldConfig(fieldKey);

    if (!config) {
      throw new Error(`No configuration found for field: ${fieldKey}`);
    }

    // Check required fields
    if (config.required && (!value || value === '')) {
      return false;
    }

    // Apply custom validator if provided
    if (config.validator) {
      return config.validator(value);
    }

    return true;
  }

  /**
   * Get fields by display type
   */
  getFieldsByType(displayType: FieldDisplayType): TubeFieldConfig[] {
    return this.getAllFields().filter(field => field.displayType === displayType);
  }

  /**
   * Get required fields only
   */
  getRequiredFields(): TubeFieldConfig[] {
    return this.getAllFields().filter(field => field.required === true);
  }

  /**
   * Get editable fields (all except readonly)
   */
  getEditableFields(): TubeFieldConfig[] {
    return this.getAllFields().filter(field => field.displayType !== 'readonly');
  }

  /**
   * Validate configuration completeness
   */
  validateConfiguration(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const allFields = this.getAllFields();

    // Check that all field keys can be resolved
    allFields.forEach(field => {
      if (!this.fieldResolver.isValidField(field.key)) {
        errors.push(`Field '${field.key}' cannot be resolved by field resolver`);
      }
    });

    // Check for duplicate field keys
    const fieldKeys = allFields.map(f => f.key);
    const duplicates = fieldKeys.filter((key, index) => fieldKeys.indexOf(key) !== index);
    if (duplicates.length > 0) {
      errors.push(`Duplicate field keys found: ${duplicates.join(', ')}`);
    }

    // Check section keys are unique
    const sectionKeys = TUBE_FIELD_SECTIONS.map(s => s.key);
    const duplicateSections = sectionKeys.filter(
      (key, index) => sectionKeys.indexOf(key) !== index
    );
    if (duplicateSections.length > 0) {
      errors.push(`Duplicate section keys found: ${duplicateSections.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Field rendering utilities for components
 */
export class FieldRenderingUtils {
  /**
   * Get CSS classes for field based on configuration
   */
  static getFieldClasses(config: TubeFieldConfig, hasError: boolean = false): string {
    const baseClasses = 'field-input transition-all duration-200';
    const typeClasses = {
      text: 'text-input',
      select: 'select-input',
      date: 'date-input',
      concentration: 'concentration-input',
      textarea: 'textarea-input',
      readonly: 'readonly-input',
    };

    const errorClasses = hasError ? 'border-red-500 focus:border-red-500' : '';
    const requiredClasses = config.required ? 'required-field' : '';

    return [baseClasses, typeClasses[config.displayType], errorClasses, requiredClasses]
      .filter(Boolean)
      .join(' ');
  }

  /**
   * Get grid span classes for responsive layout
   */
  static getGridSpanClasses(gridSpan: number = 1): string {
    const spanClasses = {
      1: 'col-span-1',
      2: 'col-span-2',
      3: 'col-span-3',
      4: 'col-span-4',
      5: 'col-span-5',
      6: 'col-span-6',
    };

    return spanClasses[gridSpan as keyof typeof spanClasses] || 'col-span-1';
  }

  /**
   * Format field value for display
   */
  static formatDisplayValue(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic field value formatting
    value: any,
    config: TubeFieldConfig
  ): string {
    if (value === null || value === undefined) {
      return '';
    }

    // Apply display transformation if configured
    if (config.displayTransform) {
      const transformed = config.displayTransform(value);
      return String(transformed || '');
    }

    // Default formatting by type
    switch (config.displayType) {
      case 'date':
        if (value instanceof Date) {
          return value.toISOString().split('T')[0]; // YYYY-MM-DD format
        }
        return String(value);

      case 'concentration':
        if (typeof value === 'number' && value >= 1000) {
          // Format large numbers in scientific notation
          return value.toExponential(2);
        }
        return String(value);

      default:
        return String(value);
    }
  }
}

/**
 * Validation utilities for field configuration
 */
export function validateTubeFieldConfiguration(fieldResolver: FieldResolver): {
  isValid: boolean;
  errors: string[];
} {
  const configService = new TubeFieldConfigurationService(fieldResolver);
  return configService.validateConfiguration();
}

/**
 * Development utilities for field configuration debugging
 */
export const FieldConfigDevUtils = {
  /**
   * Log field configuration analysis
   */
  logConfigurationAnalysis(fieldResolver: FieldResolver): void {
    if (!env.isDev()) return;

    const allFields = TUBE_FIELD_SECTIONS.flatMap(s => s.fields);
    const analysis = {
      totalSections: TUBE_FIELD_SECTIONS.length,
      totalFields: allFields.length,
      fieldsByType: {} as Record<FieldDisplayType, number>,
      requiredFields: allFields.filter(f => f.required).length,
      resolverCompatibility: allFields.filter(f => fieldResolver.isValidField(f.key)).length,
    };

    // Count by type
    allFields.forEach(field => {
      analysis.fieldsByType[field.displayType] =
        (analysis.fieldsByType[field.displayType] || 0) + 1;
    });
  },

  /**
   * Validate that all fields can be resolved
   */
  validateFieldResolution(fieldResolver: FieldResolver): {
    valid: boolean;
    invalidFields: string[];
    validFields: string[];
  } {
    const allFields = TUBE_FIELD_SECTIONS.flatMap(s => s.fields);
    const invalidFields: string[] = [];
    const validFields: string[] = [];

    allFields.forEach(field => {
      if (fieldResolver.isValidField(field.key)) {
        validFields.push(field.key);
      } else {
        invalidFields.push(field.key);
      }
    });

    return {
      valid: invalidFields.length === 0,
      invalidFields,
      validFields,
    };
  },
};

/**
 * Create field configuration service with resolver
 */
export function createTubeFieldConfigurationService(
  fieldResolver: FieldResolver
): TubeFieldConfigurationService {
  return new TubeFieldConfigurationService(fieldResolver);
}

/**
 * Runtime validation to ensure configuration and resolver compatibility
 */
export function initializeTubeFieldConfiguration(fieldResolver: FieldResolver): void {
  // Validate that configuration is compatible with resolver
  const validation = validateTubeFieldConfiguration(fieldResolver);

  if (!validation.isValid) {
    const errorMessage = `Tube field configuration validation failed:\n${validation.errors.join('\n')}`;
    throw new Error(errorMessage);
  }

  // Development logging
  if (env.isDev()) {
    FieldConfigDevUtils.logConfigurationAnalysis(fieldResolver);

    const resolutionValidation = FieldConfigDevUtils.validateFieldResolution(fieldResolver);
    if (!resolutionValidation.valid) {
      logger.warn('Some fields cannot be resolved', {
        invalidFields: resolutionValidation.invalidFields,
      });
    }
  }
}
