export const VALUE_CELL = 'min-w-28 whitespace-nowrap px-3 py-2 text-right align-middle';

export const VALUE_NAME_CELL =
  'sticky left-0 z-[1] min-w-52 whitespace-nowrap py-2 pr-4 text-left align-middle text-body-sm';

export const VALUE_HEAD_CELL =
  'whitespace-nowrap px-3 py-2.5 text-right type-label text-label-2xs font-semibold text-primary/80 dark:text-foreground/80';

export const ZEBRA_TINT = 'hsl(var(--foreground) / var(--alpha-zebra))';

export const stickyBackground = (isZebra: boolean): string =>
  isZebra ? `linear-gradient(${ZEBRA_TINT}, ${ZEBRA_TINT}), hsl(var(--card))` : 'hsl(var(--card))';
