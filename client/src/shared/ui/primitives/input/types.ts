/**
 * Input Component Types
 * 
 * Type definitions for accessible Input primitive components
 * Includes text, number, search, and validation functionality
 */

import type { ComponentProps, ReactNode } from 'react';

// Input variant types
export type InputVariant = 
  | 'default'       // Standard input
  | 'filled'        // Filled background input
  | 'outlined'      // Outlined input (default)
  | 'underlined'    // Underlined input
  | 'ghost';        // Minimal input (no border)

// Input size types
export type InputSize = 
  | 'xs'            // Extra small (28px height)
  | 'sm'            // Small (32px height)
  | 'md'            // Medium (40px height) - default
  | 'lg'            // Large (48px height)
  | 'xl';           // Extra large (56px height)

// Input state types
export type InputState = 
  | 'default'       // Normal state
  | 'error'         // Error state
  | 'warning'       // Warning state
  | 'success';      // Success state

// Input types (HTML input types)
export type InputType = 
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'tel'
  | 'url'
  | 'search'
  | 'date'
  | 'time'
  | 'datetime-local'
  | 'month'
  | 'week';

// Validation result
export interface ValidationResult {
  isValid: boolean;
  message?: string;
  type?: 'error' | 'warning' | 'success';
}

// Validation function type
export type ValidationFunction = (value: string) => ValidationResult | Promise<ValidationResult>;

// Base input props (extends HTML input attributes)
export interface BaseInputProps extends Omit<ComponentProps<'input'>, 'size' | 'prefix'> {
  // Appearance
  variant?: InputVariant;
  size?: InputSize;
  state?: InputState;
  
  // Label and description
  label?: string;
  description?: string;
  placeholder?: string;
  
  // Icons and addons
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  prefix?: string | ReactNode;
  suffix?: string | ReactNode;
  
  // Validation
  error?: string;
  warning?: string;
  success?: string;
  isRequired?: boolean;
  validate?: ValidationFunction | ValidationFunction[];
  validateOn?: 'blur' | 'change' | 'submit';
  
  // State
  isLoading?: boolean;
  isReadOnly?: boolean;
  isDisabled?: boolean;
  
  // Layout
  fullWidth?: boolean;
  
  // Accessibility
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-required'?: boolean;
  
  // Custom styling
  className?: string;
  inputClassName?: string;
  labelClassName?: string;
  
  // Event handlers
  onValueChange?: (value: string) => void;
  onValidationChange?: (result: ValidationResult) => void;
}

// Input ref type
export type InputRef = HTMLInputElement;

// Main input component props
export interface InputProps extends BaseInputProps {
  type?: InputType;
}

// Text input specific props
export interface TextInputProps extends BaseInputProps {
  type?: 'text' | 'email' | 'password' | 'url' | 'tel';
  autoComplete?: string;
  spellCheck?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
}

// Number input specific props
export interface NumberInputProps extends Omit<BaseInputProps, 'type'> {
  type?: 'number';
  min?: number;
  max?: number;
  step?: number | 'any';
  precision?: number;
  allowNegative?: boolean;
  allowDecimal?: boolean;
  thousandSeparator?: boolean;
  currency?: string;
  currencyPosition?: 'prefix' | 'suffix';
}

// Search input specific props
export interface SearchInputProps extends Omit<BaseInputProps, 'type'> {
  type?: 'search';
  onSearch?: (value: string) => void;
  onClear?: () => void;
  showClearButton?: boolean;
  searchDelay?: number; // Debounce delay in ms
  suggestions?: string[];
  onSuggestionSelect?: (suggestion: string) => void;
}

// Date input specific props
export interface DateInputProps extends Omit<BaseInputProps, 'type'> {
  type?: 'date' | 'time' | 'datetime-local' | 'month' | 'week';
  min?: string;
  max?: string;
  format?: string;
  locale?: string;
}

// Password input specific props
export interface PasswordInputProps extends Omit<BaseInputProps, 'type'> {
  type?: 'password';
  showPasswordToggle?: boolean;
  passwordStrength?: boolean;
  strengthIndicator?: 'bar' | 'text' | 'both';
  strengthRules?: {
    minLength?: number;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumbers?: boolean;
    requireSpecialChars?: boolean;
  };
}

// Input group props (for grouping related inputs)
export interface InputGroupProps {
  children: ReactNode;
  label?: string;
  description?: string;
  isRequired?: boolean;
  error?: string;
  orientation?: 'horizontal' | 'vertical';
  spacing?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

// Input addon props (for prefix/suffix addons)
export interface InputAddonProps {
  children: ReactNode;
  position: 'left' | 'right';
  className?: string;
}

// Input label props
export interface InputLabelProps {
  children: ReactNode;
  htmlFor?: string;
  isRequired?: boolean;
  className?: string;
}

// Input description props
export interface InputDescriptionProps {
  children: ReactNode;
  id?: string;
  className?: string;
}

// Input error message props
export interface InputErrorProps {
  children: ReactNode;
  id?: string;
  className?: string;
}

// Input style variants (for internal styling)
export interface InputStyleVariants {
  variant: Record<InputVariant, string>;
  size: Record<InputSize, string>;
  state: Record<InputState, string>;
}

// Input theme configuration
export interface InputTheme {
  // Base styles
  base: string;
  
  // Wrapper styles
  wrapper: string;
  
  // Input field styles
  input: string;
  
  // Variant styles
  variants: InputStyleVariants['variant'];
  
  // Size styles
  sizes: InputStyleVariants['size'];
  
  // State styles
  states: InputStyleVariants['state'];
  
  // Label styles
  label: {
    base: string;
    required: string;
    disabled: string;
  };
  
  // Description styles
  description: string;
  
  // Error message styles
  error: string;
  
  // Icon styles
  icons: {
    left: string;
    right: string;
    loading: string;
  };
  
  // Addon styles
  addons: {
    left: string;
    right: string;
  };
}

// Default props
export const defaultInputProps: Partial<InputProps> = {
  type: 'text',
  variant: 'outlined',
  size: 'md',
  state: 'default',
  validateOn: 'blur',
  fullWidth: false,
  isRequired: false,
  isDisabled: false,
  isReadOnly: false,
  isLoading: false,
  spellCheck: true,
};

// Type guards
export const isInputVariant = (value: string): value is InputVariant => {
  return ['default', 'filled', 'outlined', 'underlined', 'ghost'].includes(value);
};

export const isInputSize = (value: string): value is InputSize => {
  return ['xs', 'sm', 'md', 'lg', 'xl'].includes(value);
};

export const isInputState = (value: string): value is InputState => {
  return ['default', 'error', 'warning', 'success'].includes(value);
};

export const isInputType = (value: string): value is InputType => {
  return ['text', 'email', 'password', 'number', 'tel', 'url', 'search', 'date', 'time', 'datetime-local', 'month', 'week'].includes(value);
};
