/**
 * Item Autocomplete Options
 *
 * Maps a catalog's active items to Autocomplete options with a manufacturer · catalog subtitle,
 * and narrows them as the user types — the Autocomplete primitive renders what it is given.
 */

import type { AutocompleteOption } from '@shared/ui';

interface AutocompletableItem {
  id: string;
  name: string;
  status: string;
  manufacturer?: string;
  catalogNumber?: string;
}

export function toItemAutocompleteOptions(items: AutocompletableItem[]): AutocompleteOption[] {
  return items
    .filter(p => p.status === 'active')
    .map(p => ({
      value: p.id,
      label: p.name,
      secondary: [p.manufacturer, p.catalogNumber].filter(Boolean).join(' · '),
    }));
}

/** Case-insensitive match over the name and the manufacturer · catalog subtitle. */
export function filterItemAutocompleteOptions(
  options: AutocompleteOption[],
  query: string
): AutocompleteOption[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return options;
  return options.filter(
    option =>
      option.label.toLowerCase().includes(needle) ||
      (option.secondary?.toLowerCase().includes(needle) ?? false)
  );
}
