import type { ReactNode } from 'react';

import { ChevronDown, ChevronRight } from 'lucide-react';

import { AccentTick, SubsectionHeader } from '@shared/ui';

import { SECTION_RULE } from '../../board/sectionRuleClass';

interface WorkbenchMaterialSectionProps {
  title: string;
  count: number;
  isFolded?: boolean;
  isAccented?: boolean;
  onToggleFold?: () => void;
  action?: ReactNode;
  children: ReactNode;
}

export function WorkbenchMaterialSection({
  title,
  count,
  isFolded = false,
  isAccented = false,
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
            {isAccented && <AccentTick />}
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
