import { Fragment } from 'react';

import { Timer } from 'lucide-react';

import type { FlowWait } from '../../../../utils/flow/flowModel';

interface WorkbenchFlowWaitLabelProps {
  waits: readonly FlowWait[];
  x: number;
  y: number;
  anchor: 'middle' | 'start';
}

const WAIT_TIME = 'bg-warning-text/20 px-1 font-mono text-data-sm text-warning-text';

export function WorkbenchFlowWaitLabel({ waits, x, y, anchor }: WorkbenchFlowWaitLabelProps) {
  const conditions = waits.flatMap(wait => wait.conditions).join(' · ');
  return (
    <div
      className={`pointer-events-none absolute flex flex-col whitespace-nowrap ${
        anchor === 'middle' ? '-translate-x-1/2 items-center' : 'items-start'
      }`}
      style={{ left: x, top: y - 11 }}
    >
      <span className="flex h-[22px] items-center gap-1.5 border border-warning-text/55 bg-card px-1.5">
        {waits.map((wait, index) => (
          <Fragment key={wait.step?.id ?? `own-${index}`}>
            {index > 0 && <span className="text-label-xs text-muted-foreground">+</span>}
            {wait.step && (
              <span className="font-mono text-data-sm font-bold text-muted-foreground">
                {wait.step.number}
              </span>
            )}
            <Timer aria-hidden className="h-3.5 w-3.5 text-warning-text" />
            {wait.step?.verb && (
              <span className="text-label-xs font-bold uppercase tracking-meta text-foreground">
                {wait.step.verb}
              </span>
            )}
            <span className={WAIT_TIME}>{wait.time.label}</span>
          </Fragment>
        ))}
      </span>
      {conditions && (
        <span className="mt-1 bg-card px-1 text-label-xs text-muted-foreground">{conditions}</span>
      )}
    </div>
  );
}
