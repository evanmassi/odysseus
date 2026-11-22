import type { ReactNode } from 'react';

import { AccentTick } from '@shared/ui';

import { SECTION_RULE } from '../../board/sectionRuleClass';
import { WorkbenchIndicatorSwatch } from '../plateMap/WorkbenchIndicatorSwatch';

import type { PlateSwatch } from '../../../../utils/plateMap/plateSwatches';

interface WorkbenchFormulaSectionHeaderProps {
  title: string;
  kind?: string;
  swatch?: PlateSwatch;
  children?: ReactNode;
}

export function WorkbenchFormulaSectionHeader({
  title,
  kind,
  swatch,
  children,
}: WorkbenchFormulaSectionHeaderProps) {
  return (
    <header className="group flex items-center gap-2.5 px-2 pb-1.5">
      <AccentTick />
      <WorkbenchIndicatorSwatch swatch={swatch} />
      <span className="max-w-full shrink-0 truncate type-name text-label-md font-semibold text-foreground">
        {title}
      </span>
      {kind && (
        <span className="min-w-0 truncate font-mono text-data-sm text-muted-foreground">
          · {kind}
        </span>
      )}
      <span aria-hidden className={`${SECTION_RULE} min-w-0`} />
      {children}
    </header>
  );
}
