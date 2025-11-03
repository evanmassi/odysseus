/**
 * Validation types for form validation
 */

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings?: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationWarning {
  field: string;
  code: string;
  message: string;
}

export interface FieldValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
}

export interface FormValidationOptions {
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  debounceMs?: number;
  stopOnFirstError?: boolean;
}

export type ValidatorFunction<T = any> = (value: T, context?: any) => FieldValidationResult;

export interface FieldValidator {
  name: string;
  message: string;
  validator: ValidatorFunction;
}

export interface ValidationRule {
  required?: boolean | string;
  minLength?: number | string;
  maxLength?: number | string;
  pattern?: RegExp | string;
  min?: number | string;
  max?: number | string;
  custom?: ValidatorFunction;
}

export interface FieldValidationRules {
  [fieldName: string]: ValidationRule;
}

// Tube-specific validation errors
export interface TubeValidationErrors {
  tankId?: string;
  rackId?: string;
  boxId?: string;
  position?: string;
  cellType?: string;
  donorInternalId?: string;
  donorSourceId?: string;
  concentration?: string;
  concentrationUnit?: string;
  date?: string;
  researcherId?: string;
  media?: string;
  cultureCondition?: string;
  lotNumber?: string;
  notes?: string;
  [key: string]: string | undefined;
}
