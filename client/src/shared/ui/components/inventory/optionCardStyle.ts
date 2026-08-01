/**
 * Option Card Style
 *
 * The lit-card treatment for a small set of mutually exclusive choices, shared by the
 * bulk print tab's format picker and any catalog control sitting beside it.
 */

export const OPTION_CARD_BASE =
  'relative border px-3 py-2 transition-[background-color,border-color,box-shadow,color] duration-200 ' +
  'focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-primary/40';

export const OPTION_CARD_SELECTED =
  'border-primary/60 bg-[hsl(var(--primary)/0.10)] text-foreground ' +
  'dark:shadow-[inset_0_0_12px_-2px_hsl(var(--primary)/0.30),0_0_18px_-4px_hsl(var(--primary)/0.50)]';

export const OPTION_CARD_UNSELECTED =
  'border-line-mid text-secondary-foreground dark:shadow-[inset_0_0_12px_-3px_hsl(var(--primary)/0.10)] ' +
  'hover:border-primary/40 hover:text-foreground ' +
  'dark:hover:shadow-[inset_0_0_12px_-2px_hsl(var(--primary)/0.22),0_0_14px_-6px_hsl(var(--primary)/0.42)]';
