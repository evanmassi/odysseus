/**
 * Input Component Types
 *
 * Type definitions for the Input primitive component.
 */

import type { ComponentProps, ReactNode } from 'react';

export type InputVariant = 'default' | 'filled' | 'outlined' | 'underlined' | 'ghost';

export type InputSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type InputState = 'default' | 'error' | 'warning' | 'success';

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

export interface ValidationResult {
  isValid: boolean;
  message?: string;
  type?: 'error' | 'warning' | 'success';
}

export type ValidationFunction = (value: string) => ValidationResult | Promise<ValidationResult>;

export interface BaseInputProps extends Omit<ComponentProps<'input'>, 'size' | 'prefix'> {
  variant?: InputVariant;
  size?: InputSize;
  state?: InputState;
  label?: string;
  description?: string;
  placeholder?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  prefix?: string | ReactNode;
  suffix?: string | ReactNode;
  error?: string;
  warning?: string;
  success?: string;
  required?: boolean;
  validate?: ValidationFunction | ValidationFunction[];
  validateOn?: 'blur' | 'change' | 'submit';
  isLoading?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-required'?: boolean;
  className?: string;
  inputClassName?: string;
  labelClassName?: string;
  onValueChange?: (value: string) => void;
  onValidationChange?: (result: ValidationResult) => void;
}

export type InputRef = HTMLInputElement;

export interface InputProps extends BaseInputProps {
  type?: InputType;
}

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
