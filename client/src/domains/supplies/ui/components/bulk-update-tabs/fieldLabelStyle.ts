/**
 * Bulk Form Field Styles
 *
 * Shared field typography for the bulk-update tab forms: the compact mono
 * micro-label (matching the edit-form `labelStyle="compact"`) and the console
 * search-input styling (matching the `SearchInput` primitive) for the
 * Autocomplete item-search fields.
 */
export const SELECT_LABEL =
  'block font-mono text-[10px] uppercase tracking-[0.22em] mb-1.5 text-muted-foreground';

export const SEARCH_INPUT_CLASS =
  'w-full h-8 pl-8 pr-3 text-sm font-mono tracking-[0.04em] text-foreground ' +
  'bg-[hsl(var(--input-well))] border border-line-faint placeholder:text-foreground/40 ' +
  'transition-[border-color,background,box-shadow] duration-200 hover:border-foreground/30 ' +
  'focus:outline-none focus:border-primary/70 focus:bg-primary/[0.04] ' +
  'focus:shadow-[0_0_0_1px_hsl(var(--primary)/0.30),0_0_20px_-2px_hsl(var(--primary)/0.45),inset_0_0_12px_-4px_hsl(var(--primary)/0.25)]';
