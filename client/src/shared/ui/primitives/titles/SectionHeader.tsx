import type { ReactNode } from 'react';

type SectionHeaderSize = 'sm' | 'md' | 'lg';

interface SectionHeaderProps {
  title: string;
  icon?: ReactNode;
  meta?: ReactNode;
  rightMeta?: ReactNode;
  size?: SectionHeaderSize;
  className?: string;
}

export const PLAIN_SECTION_RULE =
  '[background:linear-gradient(90deg,hsl(var(--foreground)/0.18)_0%,hsl(var(--foreground)/0.1)_70%,hsl(var(--foreground)/0.05)_100%)]';

const SPACING: Record<SectionHeaderSize, string> = {
  sm: 'pt-3 pb-1.5',
  md: 'pb-3.5',
  lg: 'pb-3.5',
};

const TITLE_SIZE: Record<SectionHeaderSize, string> = {
  sm: 'text-label-2xs',
  md: 'text-label-sm',
  lg: 'text-label-xl',
};

export function SectionHeader({
  title,
  icon,
  meta,
  rightMeta,
  size = 'md',
  className,
}: SectionHeaderProps) {
  return (
    <div className={`flex items-center gap-2.5 ${SPACING[size]} ${className ?? ''}`}>
      {icon && (
        <span aria-hidden className="flex shrink-0 items-center text-muted-foreground">
          {icon}
        </span>
      )}
      <span
        className={`type-label ${TITLE_SIZE[size]} font-semibold tracking-label-wide text-foreground`}
      >
        {title}
      </span>
      {meta && (
        <>
          <span aria-hidden className="font-mono text-label-sm text-foreground/35">
            ·
          </span>
          <span className="inline-flex items-center type-label text-label-xs tracking-label-wide text-muted-foreground">
            {meta}
          </span>
        </>
      )}
      {size === 'sm' ? (
        <span aria-hidden className={`h-px flex-1 ${PLAIN_SECTION_RULE}`} />
      ) : (
        <div className="relative flex flex-1 items-center">
          <span
            aria-hidden
            className="h-px flex-1 [background:linear-gradient(90deg,transparent_0%,hsl(var(--foreground)/0.22)_30%,hsl(var(--foreground)/0.18)_85%,transparent_100%)]"
          />
          <span
            aria-hidden
            className="absolute right-0 top-1/2 h-0.5 w-1 -translate-y-1/2 bg-foreground dark:shadow-[0_0_6px_1px_hsl(var(--foreground)/0.7)]"
          />
        </div>
      )}
      {rightMeta && (
        <span className="pl-4 type-label text-label-2xs tracking-label-wide text-foreground/40">
          {rightMeta}
        </span>
      )}
    </div>
  );
}
