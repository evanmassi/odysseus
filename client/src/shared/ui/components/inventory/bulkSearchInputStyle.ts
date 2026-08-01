/**
 * Bulk Search Input Style
 *
 * Console search-input styling (matching the `SearchInput` primitive) for the bulk Autocomplete
 * item-search fields, which cannot use `SearchInput` itself.
 */
import { INPUT_WELL_BASE, INPUT_WELL_BORDER_DEFAULT } from '@shared/ui';

export const SEARCH_INPUT_CLASS =
  'w-full h-8 pl-8 pr-3 text-data font-mono tracking-[0.04em] ' +
  `${INPUT_WELL_BASE} ${INPUT_WELL_BORDER_DEFAULT}`;
