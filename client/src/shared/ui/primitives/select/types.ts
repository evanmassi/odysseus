/**
 * Select Component Types
 *
 * Type definitions for the Select primitive component.
 */

import type { ReactNode } from 'react';

export type SelectVariant = 'default' | 'filled' | 'outlined';

export type SelectSize = 'xs' | 'sm' | 'md' | 'lg';

export type SelectState = 'default' | 'error' | 'warning' | 'success';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  /** Shown below the label in the dropdown */
  description?: string;
  icon?: ReactNode;
}

export interface SelectProps {
  // Options
  options: SelectOption[];
  value?: string | number | (string | number)[];
  defaultValue?: string | number | (string | number)[];

  // Behavior
  multiple?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  isLoading?: boolean;

  // Appearance
  variant?: SelectVariant;
  size?: SelectSize;
  state?: SelectState;
  placeholder?: string;
  fullWidth?: boolean;

  // Label and description
  label?: string;
  description?: string;
  /** Also sets error validation state */
  error?: string;
  warning?: string;
  success?: string;

  // Event handlers
  onChange?: (value: string | number | (string | number)[] | null) => void;
  onSearch?: (query: string) => void;
  onOpen?: () => void;
  onClose?: () => void;

  // Accessibility
  'aria-label'?: string;
  'aria-describedby'?: string;

  // Styling
  className?: string;

  // Advanced
  /** Max height of dropdown in pixels */
  maxHeight?: number;
  /** Default: true for single, false for multi */
  closeOnSelect?: boolean;

  // Custom rendering
  renderOption?: (
    option: SelectOption,
    state: { isSelected: boolean; isHighlighted: boolean }
  ) => ReactNode;
  renderValue?: (selectedOptions: SelectOption[]) => ReactNode;
}

export type SelectRef = HTMLDivElement;

export const defaultSelectProps: Partial<SelectProps> = {
  variant: 'outlined',
  size: 'md',
  state: 'default',
  multiple: false,
  searchable: false,
  clearable: false,
  disabled: false,
  isLoading: false,
  fullWidth: false,
  placeholder: 'Select an option...',
  maxHeight: 240,
};
