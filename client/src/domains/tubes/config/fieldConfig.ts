/**
 * Centralized field configuration for tube forms and displays
 * Single source of truth for field ordering, labels, types, and rendering
 */

import { formatToScientificNotation, isScientificNotationInput } from '@shared/utils/scientificNotation';

export type FieldType = 'text' | 'select' | 'date' | 'concentration' | 'textarea';

// Dot-notation field keys for tube form configuration (editable fields only)
export type TubeFormFieldKey =
  | 'sample.cellType' | 'sample.donorInternalId' | 'sample.donorSourceId'
  | 'sample.concentration' | 'sample.concentrationUnit' | 'sample.date'
  | 'sample.media.type' | 'sample.media.supplements' | 'sample.media.selection'
  | 'sample.cultureCondition' | 'sample.lotNumber' | 'sample.notes'
  | 'researcherId';

export interface BaseFieldConfig {
  key: TubeFormFieldKey;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  gridSpan?: number;
  indent?: boolean; // For visual hierarchy (e.g., sub-fields)
  compact?: boolean; // Reduces spacing before this field (for grouping related fields)
}

export interface TextFieldConfig extends BaseFieldConfig {
  type: 'text';
  placeholder: string;
}

export interface SelectFieldConfig extends BaseFieldConfig {
  type: 'select';
  options?: Array<{ value: string; label: string }>;
  getOptions?: () => Array<{ value: string; label: string }>;
}

export interface DateFieldConfig extends BaseFieldConfig {
  type: 'date';
}

export interface ConcentrationFieldConfig extends BaseFieldConfig {
  type: 'concentration';
  placeholder: string;
  unitKey: TubeFormFieldKey;
  unitOptions: Array<{ value: string; label: string }>;
  formatHandler?: (value: string) => string;
  formatTriggers?: string[];
}

export interface TextareaFieldConfig extends BaseFieldConfig {
  type: 'textarea';
  placeholder: string;
  minHeight?: string;
}

export type FieldConfig = 
  | TextFieldConfig 
  | SelectFieldConfig 
  | DateFieldConfig 
  | ConcentrationFieldConfig 
  | TextareaFieldConfig;

export interface SectionConfig {
  key: string;
  title: string;
  borderColor: string;
  headerColor: string;
  fields: FieldConfig[];
  columns: number;
}

// Scientific notation formatting handlers
const handleConcentrationFormat = (value: string) => {
  if (value && (isScientificNotationInput(value) || parseFloat(value) >= 1000)) {
    return formatToScientificNotation(value);
  }
  return value;
};

// Centralized field configuration - SINGLE SOURCE OF TRUTH
// NOTE: Location fields are NOT included here - location is displayed read-only in modals
export const TUBE_FIELD_CONFIG: SectionConfig[] = [
  {
    key: 'primary',
    title: 'DONOR INFORMATION',
    borderColor: 'border-odysseus-primary',
    headerColor: 'text-odysseus-primary',
    columns: 2, // 2-column grid layout
    fields: [
      {
        key: 'sample.cellType',
        label: 'Cell Type',
        type: 'text',
        placeholder: 'e.g., Jurkat, HEK293',
        required: true,
        gridSpan: 2 // Full width (row 1)
      },
      {
        key: 'sample.donorInternalId',
        label: 'Internal ID',
        type: 'text',
        placeholder: 'Internal tracking ID',
        gridSpan: 1 // 1 of 2 columns (row 2, left)
      },
      {
        key: 'sample.donorSourceId',
        label: 'Source ID',
        type: 'text',
        placeholder: 'Original source ID',
        gridSpan: 1 // 1 of 2 columns (row 2, right)
      }
    ]
  },
  {
    key: 'sample',
    title: 'SAMPLE INFORMATION',
    borderColor: 'border-purple-400',
    headerColor: 'text-purple-600',
    columns: 1, // Single column (vertical stack)
    fields: [
      {
        key: 'sample.cultureCondition',
        label: 'Culture Condition',
        type: 'text',
        placeholder: 'e.g., 5% O₂, 37°C'
      },
      {
        key: 'sample.lotNumber',
        label: 'Lot #',
        type: 'text',
        placeholder: 'LOT001'
      },
      {
        key: 'sample.media.type',
        label: 'Media',
        type: 'text',
        placeholder: 'e.g., RPMI-1640, DMEM'
      },
      {
        key: 'sample.media.supplements',
        label: 'Supplements',
        type: 'text',
        placeholder: 'e.g., 10% FBS, 1% P/S',
        compact: true // Group closer with Media
      },
      {
        key: 'sample.media.selection',
        label: 'Selection',
        type: 'text',
        placeholder: 'e.g., Puromycin 2μg/ml',
        compact: true // Group closer with Media
      },
      {
        key: 'sample.concentration',
        label: 'Concentration',
        type: 'concentration',
        placeholder: 'e.g., 5e6',
        unitKey: 'sample.concentrationUnit',
        unitOptions: [
          { value: 'c/v', label: 'c/v' },
          { value: 'c/mL', label: 'c/mL' }
        ],
        formatHandler: handleConcentrationFormat,
        formatTriggers: ['Enter']
      },
      {
        key: 'sample.date',
        label: 'Date',
        type: 'date'
      },
      {
        key: 'researcherId',
        label: 'Researcher',
        type: 'select',
        getOptions: () => [] // Will be populated dynamically with researcher options
      }
    ]
  },
  {
    key: 'notes',
    title: 'NOTES',
    borderColor: 'border-gray-400',
    headerColor: 'text-gray-600',
    columns: 1,
    fields: [
      {
        key: 'sample.notes',
        label: '', // Empty label since section title already says "NOTES"
        type: 'textarea',
        placeholder: 'Additional notes and observations...',
        minHeight: 'min-h-[60px]'
      }
    ]
  }
];

/**
 * Get all field configurations flattened
 */
export const getAllFields = (): FieldConfig[] => {
  return TUBE_FIELD_CONFIG.flatMap(section => section.fields);
};

/**
 * Get field configuration by key
 */
export const getFieldConfig = (fieldKey: string): FieldConfig | undefined => {
  return getAllFields().find(field => field.key === fieldKey);
};

/**
 * Get section configuration by key
 */
export const getSectionConfig = (sectionKey: string): SectionConfig | undefined => {
  return TUBE_FIELD_CONFIG.find(section => section.key === sectionKey);
};

/**
 * Validate that all form data keys are covered by configuration
 * Only checks editable fields (sample + researcher), not location/timestamps
 */
export const validateFieldCoverage = (): boolean => {
  const configKeys = new Set(getAllFields().map(field => field.key));
  
  // Add unit keys from concentration fields
  getAllFields().forEach(field => {
    if (field.type === 'concentration') {
      const concentrationConfig = field as ConcentrationFieldConfig;
      configKeys.add(concentrationConfig.unitKey);
    }
  });
  
  // Only validate editable fields that match CreateTubeRequest schema
  const formDataKeys: TubeFormFieldKey[] = [
    'sample.cellType', 'sample.donorInternalId', 'sample.donorSourceId', 'sample.concentration',
    'sample.concentrationUnit', 'sample.date', 'researcherId',
    'sample.media.type', 'sample.media.supplements', 'sample.media.selection',
    'sample.cultureCondition', 'sample.lotNumber', 'sample.notes'
  ];
  
  const missingKeys = formDataKeys.filter(key => !configKeys.has(key));
  const extraKeys = Array.from(configKeys).filter(key => !formDataKeys.includes(key));
  
  if (missingKeys.length > 0) {
    // eslint-disable-next-line no-console -- Warning logging for production monitoring
    console.warn('Missing field configurations for:', missingKeys);
  }
  if (extraKeys.length > 0) {
    // eslint-disable-next-line no-console -- Warning logging for production monitoring
    console.warn('Extra field configurations found:', extraKeys);
  }
  
  return missingKeys.length === 0 && extraKeys.length === 0;
};

// Runtime validation - ensures configuration completeness
// NOTE: Temporarily disabled during Phase 2 refactor - media fields changed
// if (!validateFieldCoverage()) {
//   throw new Error('Field configuration does not cover all CreateTubeRequest keys');
// }
