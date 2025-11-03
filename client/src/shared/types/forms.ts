/**
 * Form configuration definitions for shared use across domains
 * Note: TubeFormData is now in @shared/types/tubeTypes.ts to avoid conflicts
 */

export interface FormFieldConfig {
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea' | 'date';
  required?: boolean;
  placeholder?: string;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface TubeFormConfig {
  [key: string]: FormFieldConfig;
}
