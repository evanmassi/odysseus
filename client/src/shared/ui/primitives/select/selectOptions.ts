/**
 * Select Option Builders
 *
 * Builds option arrays headed by the empty-value row the Select primitive
 * renders as placeholder text.
 */
import type { SelectOption } from './types';

export function withPlaceholder(placeholder: string, options: SelectOption[]): SelectOption[] {
  return [{ value: '', label: placeholder }, ...options];
}

/** Lookup values become self-labeled options (value doubles as the label). */
export function lookupOptions(
  values: ReadonlyArray<{ value: string }>,
  placeholder = 'Select...'
): SelectOption[] {
  return withPlaceholder(
    placeholder,
    values.map(v => ({ value: v.value, label: v.value }))
  );
}
