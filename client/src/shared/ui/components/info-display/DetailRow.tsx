/**
 * Detail Row
 *
 * Label–value ledger row for info panels: mono label left, value right, with the data
 * table's row-hover glow. Pass `children` for a custom value (e.g. a link); empty rows render nothing.
 */

import type { ReactNode } from 'react';

import { AlertTriangle } from 'lucide-react';

const FIELD_LABEL = 'type-label text-label-2xs tracking-label-wide text-muted-foreground';

// Row hover mirrors the data Table's row hover: light is a flat primary tint + soft leading
// stripe; the lit recipe (scanline + directional wash + bloom) is restored under `dark:`.
const ROW_HOVER =
  'hover:[background-image:linear-gradient(0deg,hsl(var(--primary)/0.06),hsl(var(--primary)/0.06))] ' +
  'hover:shadow-[inset_3px_0_0_0_hsl(var(--primary)/var(--alpha-hover-stripe))] ' +
  'dark:hover:[background-image:repeating-linear-gradient(to_bottom,hsl(var(--scanline))_0,hsl(var(--scanline))_1px,transparent_1px,transparent_3px),linear-gradient(90deg,hsl(var(--primary)/var(--alpha-hover-wash-1))_0%,hsl(var(--primary)/var(--alpha-hover-wash-2))_18%,hsl(var(--primary)/var(--alpha-hover-wash-3))_48%,hsl(var(--primary)/var(--alpha-hover-wash-4))_78%,hsl(var(--primary)/0)_100%)] ' +
  'dark:hover:shadow-[inset_3px_0_0_0_hsl(var(--primary)/var(--alpha-hover-stripe)),inset_14px_0_36px_-10px_hsl(var(--primary)/var(--alpha-hover-edge)),inset_0_1px_0_hsl(var(--primary)/var(--alpha-hover-rim)),inset_0_-1px_0_hsl(var(--primary)/var(--alpha-hover-rim)),inset_0_10px_16px_-8px_hsl(var(--primary)/var(--alpha-hover-bloom-edge)),inset_0_-10px_16px_-8px_hsl(var(--primary)/var(--alpha-hover-bloom-edge)),0_0_22px_-4px_hsl(var(--primary)/var(--alpha-hover-bloom)),0_0_50px_4px_hsl(var(--primary)/var(--alpha-hover-bloom-far))]';

export interface DetailRowProps {
  label: string;
  value?: string | number | null;
  isMixed?: boolean;
  children?: ReactNode;
}

export function DetailRow({ label, value, isMixed = false, children }: DetailRowProps) {
  const isEmpty = !children && !value && value !== 0 && !isMixed;
  if (isEmpty) return null;

  return (
    <div
      className={`group -mx-4 flex items-baseline justify-between gap-3 border-b border-line-faint px-4 py-2 transition-[color,box-shadow] duration-150 last:border-b-0 ${ROW_HOVER}`}
    >
      <span
        className={`flex items-center gap-1 whitespace-nowrap transition-colors group-hover:text-foreground/70 dark:group-hover:[text-shadow:0_0_5px_color-mix(in_srgb,currentColor_30%,transparent)] ${FIELD_LABEL}`}
      >
        {label}
        {isMixed && <AlertTriangle className="h-3 w-3 text-warning-text" />}
      </span>
      {isMixed ? (
        <span className="text-body text-card-foreground/30">—</span>
      ) : children ? (
        <span className="min-w-0 text-right text-body">{children}</span>
      ) : (
        <span className="min-w-0 break-words text-right text-body font-medium text-card-foreground transition-[text-shadow] duration-150 dark:group-hover:[text-shadow:0_0_5px_color-mix(in_srgb,currentColor_30%,transparent)]">
          {value}
        </span>
      )}
    </div>
  );
}
