/**
 * Subsection Header
 *
 * Subsection label prefixed with a section index — one tier below SectionHeader.
 */

import type { ReactNode } from 'react';

interface SubsectionHeaderProps {
  title: ReactNode;
  /** Zero-padded section ordinal rendered before the title (e.g. 1 → "01 /"). */
  index?: number;
  meta?: ReactNode;
  /** Lead the header with a glowing primary accent bar. */
  accent?: boolean;
  className?: string;
}

export function SubsectionHeader({
  title,
  index,
  meta,
  accent = false,
  className,
}: SubsectionHeaderProps) {
  const content = (
    <>
      {index !== undefined && (
        <span aria-hidden className="font-mono text-label-xs tracking-meta text-foreground/40">
          {String(index).padStart(2, '0')}
          <span className="pl-2.5 text-foreground/30">/</span>
        </span>
      )}
      <span className="type-label text-label-xs leading-none tracking-label-wide text-foreground/70">
        {title}
      </span>
      {meta && (
        <span className="ml-1 type-label text-label-2xs leading-none text-foreground/35">
          {meta}
        </span>
      )}
    </>
  );

  if (accent) {
    return (
      <div className={`flex items-center gap-2.5 ${className ?? ''}`}>
        <span
          aria-hidden
          className="h-3 w-0.5 shrink-0 bg-primary/80 dark:shadow-[0_0_6px_hsl(var(--primary)/0.6)]"
        />
        <div className="flex items-baseline gap-2.5">{content}</div>
      </div>
    );
  }

  return <div className={`flex items-baseline gap-2.5 ${className ?? ''}`}>{content}</div>;
}
