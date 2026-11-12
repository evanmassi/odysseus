import { Fragment } from 'react';

import { Timer } from 'lucide-react';

import { FLOW_DONE_CLASSES, FLOW_PLACE_CLASSES } from './flowKindStyles';

import type { FlowWait } from '../../../../utils/flow/flowModel';

interface WorkbenchFlowWaitLabelProps {
  waits: readonly FlowWait[];
  x: number;
  y: number;
  anchor: 'middle' | 'start';
  placeId: string | undefined;
  isDone: (stepId: string) => boolean;
  onSelect: (stepId: string) => void;
}

const WAIT_TIME = 'bg-warning-text/20 px-1 font-mono text-data-sm text-warning-text';

function WaitParts({ wait }: { wait: FlowWait }) {
  return (
    <>
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
    </>
  );
}

export function WorkbenchFlowWaitLabel({
  waits,
  x,
  y,
  anchor,
  placeId,
  isDone,
  onSelect,
}: WorkbenchFlowWaitLabelProps) {
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
            {wait.step ? (
              <button
                type="button"
                data-flow-step={wait.step.id}
                aria-current={placeId === wait.step.id ? 'step' : undefined}
                onClick={() => wait.step && onSelect(wait.step.id)}
                className={`pointer-events-auto relative flex items-center gap-1.5 px-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  placeId === wait.step.id ? FLOW_PLACE_CLASSES : ''
                } ${isDone(wait.step.id) ? FLOW_DONE_CLASSES : ''}`}
              >
                <WaitParts wait={wait} />
              </button>
            ) : (
              <span className="flex items-center gap-1.5">
                <WaitParts wait={wait} />
              </span>
            )}
          </Fragment>
        ))}
      </span>
      {conditions && (
        <span className="mt-1 bg-card px-1 text-label-xs text-muted-foreground">{conditions}</span>
      )}
    </div>
  );
}
