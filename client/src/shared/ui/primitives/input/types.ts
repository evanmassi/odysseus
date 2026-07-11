/**
 * Input Component Types
 */

import type { ComponentProps, ReactNode } from 'react';

export type InputSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type InputState = 'default' | 'error' | 'warning' | 'success';

type InputType =
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

type ValidationFunction = (value: string) => ValidationResult | Promise<ValidationResult>;

export interface InputProps extends Omit<ComponentProps<'input'>, 'size' | 'prefix'> {
  size?: InputSize;
  state?: InputState;
  type?: InputType;
  label?: string;
  description?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  prefix?: string | ReactNode;
  suffix?: string | ReactNode;
  error?: string;
  warning?: string;
  success?: string;
  validate?: ValidationFunction | ValidationFunction[];
  validateOn?: 'blur' | 'change' | 'submit';
  isLoading?: boolean;
  fullWidth?: boolean;
  inputClassName?: string;
  labelClassName?: string;
  onValueChange?: (value: string) => void;
  onValidationChange?: (result: ValidationResult) => void;
}

export type InputRef = HTMLInputElement;

export const defaultInputProps = {
  type: 'text',
  size: 'md',
  state: 'default',
  validateOn: 'blur',
  fullWidth: false,
  required: false,
  disabled: false,
  readOnly: false,
  isLoading: false,
  spellCheck: true,
} satisfies Partial<InputProps>;
