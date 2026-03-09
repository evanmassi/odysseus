/**
 * Input Component Types
 *
 * Type definitions for accessible Input primitive components
 * Includes text, number, search, and validation functionality
 */

import type { ComponentProps, ReactNode } from 'react';

// Input variant types
export type InputVariant =
  | 'default' // Standard input
  | 'filled' // Filled background input
  | 'outlined' // Outlined input (default)
  | 'underlined' // Underlined input
  | 'ghost'; // Minimal input (no border)

// Input size types
export type InputSize =
  | 'xs' // Extra small (28px height)
  | 'sm' // Small (32px height)
  | 'md' // Medium (40px height) - default
  | 'lg' // Large (48px height)
  | 'xl'; // Extra large (56px height)

// Input state types
export type InputState =
  | 'default' // Normal state
  | 'error' // Error state
  | 'warning' // Warning state
  | 'success'; // Success state

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
  required?: boolean;
  validate?: ValidationFunction | ValidationFunction[];
  validateOn?: 'blur' | 'change' | 'submit';

  // State
  isLoading?: boolean;
  readOnly?: boolean;
  disabled?: boolean;

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

// Default props
export const defaultInputProps: Partial<InputProps> = {
  type: 'text',
  variant: 'outlined',
  size: 'md',
  state: 'default',
  validateOn: 'blur',
  fullWidth: false,
  required: false,
  disabled: false,
  readOnly: false,
  isLoading: false,
  spellCheck: true,
};
