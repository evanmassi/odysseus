import type { ReactNode } from 'react';

import { AlertTriangle } from 'lucide-react';

import { ROW_HOVER_GLOW } from '@shared/ui/primitives/table/rowGlow';

const FIELD_LABEL = 'type-label text-label-2xs tracking-label-wide text-muted-foreground';

interface DetailRowProps {
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
      className={`group -mx-4 flex items-baseline justify-between gap-3 border-b border-line-faint px-4 py-2 transition-[color,box-shadow] duration-150 last:border-b-0 ${ROW_HOVER_GLOW.primary}`}
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
