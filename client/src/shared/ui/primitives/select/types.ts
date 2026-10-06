import type { ReactNode } from 'react';

type SelectSize = 'xs' | 'sm' | 'md';

type SelectState = 'default' | 'error' | 'warning' | 'success';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  description?: string;
  depth?: number;
  icon?: ReactNode;
  // PITFALL: options must arrive already grouped; the list is not reordered by group.
  group?: string;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string | number | null;
  clearable?: boolean;
  disabled?: boolean;
  size?: SelectSize;
  state?: SelectState;
  placeholder?: string;
  fullWidth?: boolean;
  isQuiet?: boolean;
  label?: string;
  labelClassName?: string;
  error?: string;
  onChange?: (value: string | number | null) => void;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  className?: string;
  renderOption?: (
    option: SelectOption,
    state: { isSelected: boolean; isHighlighted: boolean }
  ) => ReactNode;
  renderValue?: (selectedOptions: SelectOption[]) => ReactNode;
}

export type SelectRef = HTMLDivElement;

export const defaultSelectProps = {
  size: 'md',
  state: 'default',
  clearable: false,
  disabled: false,
  fullWidth: false,
  isQuiet: false,
  placeholder: 'Select an option...',
} satisfies Partial<SelectProps>;
