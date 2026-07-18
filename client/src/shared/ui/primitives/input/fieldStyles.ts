/**
 * Input Field Styles
 *
 * The console text-field look — input-well background, focus ring, and default border —
 * shared by the text, search, autocomplete, and textarea primitives so they stay identical.
 */

/** Well background, border width, text/placeholder color, transition, and focus ring. Size- and state-independent. */
export const INPUT_WELL_BASE =
  'bg-[hsl(var(--input-well))] border text-foreground placeholder:text-foreground/40 ' +
  'transition-[border-color,background,box-shadow] duration-200 ' +
  'focus:outline-none focus:border-primary/70 focus:bg-primary/[0.04] focus:shadow-[var(--input-focus-shadow)]';

/** Resting border color and hover for a non-error field; error/warning states swap this out. */
export const INPUT_WELL_BORDER_DEFAULT = 'border-line-faint hover:border-foreground/30';
