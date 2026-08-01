/**
 * Item Autocomplete Options
 *
 * Maps a catalog's active items to Autocomplete options with a manufacturer · catalog subtitle.
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
