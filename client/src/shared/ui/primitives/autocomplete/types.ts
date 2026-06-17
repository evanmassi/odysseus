/**
 * Autocomplete Component Types
 *
 * Type definitions for the Autocomplete primitive component.
 */

import type { ReactNode } from 'react';

import type { InputState } from '../input/types';

export interface AutocompleteOption {
  value: string;
  label: string;
  secondary?: string;
}

export interface AutocompleteProps {
  options: AutocompleteOption[];
  value?: string;
  onChange?: (value: string) => void;
  onSelect?: (option: AutocompleteOption) => void;
  placeholder?: string;
  disabled?: boolean;
  state?: InputState;
  fullWidth?: boolean;
  minChars?: number;
  'aria-label'?: string;
  className?: string;
  inputClassName?: string;
  renderOption?: (option: AutocompleteOption, state: { isHighlighted: boolean }) => ReactNode;
}

export type AutocompleteRef = HTMLInputElement;
