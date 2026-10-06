import type { ReactNode } from 'react';

import { PLAIN_SECTION_RULE } from '../titles/SectionHeader';
import { SubsectionHeader } from '../titles/SubsectionHeader';

interface SettingsRowProps {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SettingsRow({ label, hint, children, className }: SettingsRowProps) {
  return (
    <div className={`flex items-center justify-between gap-4 py-3 ${className ?? ''}`}>
      <div className="min-w-0">
        <div className="font-display text-body-sm text-foreground">{label}</div>
        {hint && (
          <div className="mt-0.5 font-display text-caption leading-snug text-muted-foreground">
            {hint}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

interface SubsectionProps {
  title: ReactNode;
  index?: number;
  meta?: ReactNode;
  accent?: boolean;
  isCompact?: boolean;
  children: ReactNode;
  className?: string;
}

export function Subsection({
  title,
  index,
  meta,
  accent,
  isCompact = false,
  children,
  className,
}: SubsectionProps) {
  return (
    <div className={`${isCompact ? 'pt-7 first:pt-0' : 'pt-10 first:pt-0'} ${className ?? ''}`}>
      <div className="flex items-center gap-3 pb-2">
        <SubsectionHeader title={title} index={index} meta={meta} accent={accent} />
        <span aria-hidden className={`h-px flex-1 ${PLAIN_SECTION_RULE}`} />
      </div>
      <div className={isCompact ? 'pl-3 pt-1.5' : 'grid grid-cols-2 gap-x-10 pl-4 pr-6'}>
        {children}
      </div>
    </div>
  );
}
