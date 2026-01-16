/**
 * Select Component Types
 *
 * Type definitions for the accessible Select primitive component
 * Includes all variants, sizes, states, and interactive options
 */

import type { ReactNode } from 'react';

// Select variant types
export type SelectVariant =
  | 'default' // Default bordered select
  | 'filled' // Filled background select
  | 'outlined'; // Outlined with thicker border

// Select size types (matches input-field pattern)
export type SelectSize =
  | 'sm' // Small (32px height)
  | 'md' // Medium (36px height) - default
  | 'lg'; // Large (48px height)

// Select validation state types
export type SelectState =
  | 'default' // Normal state
  | 'error' // Error validation state
  | 'warning' // Warning validation state
  | 'success'; // Success validation state

// Select option interface
export interface SelectOption {
  /** Option value (used for selection) */
  value: string | number;
  /** Display label for the option */
  label: string;
  /** Whether option is disabled */
  disabled?: boolean;
  /** Optional description shown below label */
  description?: string;
  /** Optional icon to display */
  icon?: ReactNode;
}

// Base select props
export interface SelectProps {
  // Options
  /** Array of options to display */
  options: SelectOption[];
  /** Controlled value (single or array for multi-select) */
  value?: string | number | (string | number)[];
  /** Default value for uncontrolled mode */
  defaultValue?: string | number | (string | number)[];

  // Behavior
  /** Enable multi-select mode */
  multiple?: boolean;
  /** Enable search/filter functionality */
  searchable?: boolean;
  /** Show clear button */
  clearable?: boolean;
  /** Disable the select */
  disabled?: boolean;
  /** Show loading state */
  isLoading?: boolean;

  // Appearance
  /** Visual variant */
  variant?: SelectVariant;
  /** Size variant */
  size?: SelectSize;
  /** Validation state */
  state?: SelectState;
  /** Placeholder text when no selection */
  placeholder?: string;
  /** Full width mode */
  fullWidth?: boolean;

  // Label and description
  /** Label text above select */
  label?: string;
  /** Help text below select */
  description?: string;
  /** Error message (also sets error state) */
  error?: string;
  /** Warning message */
  warning?: string;
  /** Success message */
  success?: string;

  // Event handlers
  /** Called when selection changes */
  onChange?: (value: string | number | (string | number)[] | null) => void;
  /** Called when search query changes */
  onSearch?: (query: string) => void;
  /** Called when dropdown opens */
  onOpen?: () => void;
  /** Called when dropdown closes */
  onClose?: () => void;

  // Accessibility
  'aria-label'?: string;
  'aria-describedby'?: string;

  // Styling
  /** Additional CSS classes */
  className?: string;

  // Advanced
  /** Max height of dropdown in pixels */
  maxHeight?: number;
  /** Close dropdown on selection (default: true for single, false for multi) */
  closeOnSelect?: boolean;

  // Custom rendering
  /** Custom renderer for dropdown options */
  renderOption?: (
    option: SelectOption,
    state: { isSelected: boolean; isHighlighted: boolean }
  ) => ReactNode;
  /** Custom renderer for selected value display */
  renderValue?: (selectedOptions: SelectOption[]) => ReactNode;
}

// Select ref type
export type SelectRef = HTMLDivElement;

// Default props
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

// Type guards
export const isSelectVariant = (value: string): value is SelectVariant => {
  return ['default', 'filled', 'outlined'].includes(value);
};

export const isSelectSize = (value: string): value is SelectSize => {
  return ['sm', 'md', 'lg'].includes(value);
};

export const isSelectState = (value: string): value is SelectState => {
  return ['default', 'error', 'warning', 'success'].includes(value);
};
