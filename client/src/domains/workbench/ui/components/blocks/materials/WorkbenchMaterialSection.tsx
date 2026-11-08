import type { ReactNode } from 'react';

import { ChevronDown, ChevronRight } from 'lucide-react';

import { SubsectionHeader } from '@shared/ui';

interface WorkbenchMaterialSectionProps {
  title: string;
  count: number;
  isFolded?: boolean;
  onToggleFold?: () => void;
  action?: ReactNode;
  children: ReactNode;
}

const SECTION_RULE =
  'h-px flex-1 bg-[linear-gradient(90deg,hsl(var(--foreground)/0.18)_0%,hsl(var(--foreground)/0.1)_70%,hsl(var(--foreground)/0.05)_100%)]';

export function WorkbenchMaterialSection({
  title,
  count,
  isFolded = false,
  onToggleFold,
  action,
  children,
}: WorkbenchMaterialSectionProps) {
  const heading = <SubsectionHeader title={title} meta={count} />;
  return (
    <section>
      <div className={`flex items-center gap-2.5 ${isFolded ? '' : 'pb-2'}`}>
        {onToggleFold ? (
          <button
            type="button"
            className="flex flex-1 select-none items-center gap-2.5 text-left"
            aria-expanded={!isFolded}
            onClick={onToggleFold}
          >
            {isFolded ? (
              <ChevronRight aria-hidden className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown aria-hidden className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            {heading}
            <span aria-hidden className={SECTION_RULE} />
          </button>
        ) : (
          <>
            {heading}
            <span aria-hidden className={SECTION_RULE} />
          </>
        )}
        {action}
      </div>
      {!isFolded && <div className="pl-3 pt-1.5">{children}</div>}
    </section>
  );
}
