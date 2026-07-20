/**
 * Autocomplete Component Types
 */

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
  'aria-label'?: string;
  inputClassName?: string;
}

export type AutocompleteRef = HTMLInputElement;
