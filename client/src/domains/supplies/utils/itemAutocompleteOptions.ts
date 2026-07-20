/**
 * Item Autocomplete Options
 *
 * Maps active supply items to Autocomplete options with a manufacturer · catalog subtitle.
 */

import type { SupplyItemWithStock } from '@odysseus/shared-schemas';
import type { AutocompleteOption } from '@shared/ui';

export function toItemAutocompleteOptions(items: SupplyItemWithStock[]): AutocompleteOption[] {
  return items
    .filter(p => p.status === 'active')
    .map(p => ({
      value: p.id,
      label: p.name,
      secondary: [p.manufacturer, p.catalogNumber].filter(Boolean).join(' · '),
    }));
}
