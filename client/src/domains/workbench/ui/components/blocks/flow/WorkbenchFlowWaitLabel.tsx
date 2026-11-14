import { Fragment } from 'react';

import { Timer } from 'lucide-react';

import { FLOW_DONE_CLASSES, FLOW_PLACE_CLASSES } from './flowKindStyles';

import type { FlowArrow } from '../../../../utils/flow/flowLayout';
import type { FlowWait } from '../../../../utils/flow/flowModel';

interface WorkbenchFlowWaitLabelProps {
  waits: readonly FlowWait[];
  x: number;
  y: number;
  anchor: FlowArrow['labelAnchor'];
  direction: FlowArrow['direction'];
  placeId: string | undefined;
  isDone: (stepId: string) => boolean;
  onSelect: (stepId: string) => void;
}

interface ArrowShape {
  clipPath: string;
  body: string;
  halfHeight: number;
}

const ARROW_SHAPES: Readonly<Record<FlowArrow['direction'], ArrowShape>> = {
  right: {
    clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)',
    body: 'h-[32px] pl-2 pr-6',
    halfHeight: 16,
  },
  down: {
    clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 9px), 50% 100%, 0 calc(100% - 9px))',
    body: 'h-[42px] pb-3 pl-2 pr-3',
    halfHeight: 21,
  },
};

const BORDER_FILL = 'color-mix(in srgb, hsl(var(--color-warning-text)) 60%, transparent)';
const BODY_FILL = 'color-mix(in srgb, hsl(var(--color-warning-text)) 8%, hsl(var(--card)))';

function WaitParts({ wait }: { wait: FlowWait }) {
  return (
    <>
      <span className="flex h-5 min-w-[22px] items-center justify-center bg-warning-text/25 px-1 font-mono text-data-sm font-bold text-foreground">
        {wait.number}
      </span>
      <Timer aria-hidden className="h-3.5 w-3.5 text-warning-text" />
      {wait.step?.verb && (
        <span className="text-label-xs font-bold uppercase tracking-meta text-warning-text">
          {wait.step.verb}
        </span>
      )}
      {wait.conditions.length > 0 && (
        <span className="text-label-xs text-muted-foreground">{wait.conditions.join(' · ')}</span>
      )}
      <span className="font-mono text-data-sm font-semibold text-warning-text">
        {wait.time.label}
      </span>
    </>
  );
}

export function WorkbenchFlowWaitLabel({
  waits,
  x,
  y,
  anchor,
  direction,
  placeId,
  isDone,
  onSelect,
}: WorkbenchFlowWaitLabelProps) {
  const shape = ARROW_SHAPES[direction];
  return (
    <div
      className={`pointer-events-none absolute whitespace-nowrap ${
        anchor === 'middle' ? '-translate-x-1/2' : ''
      }`}
      style={{ left: x, top: y - shape.halfHeight }}
    >
      <span className={`relative flex items-center gap-1.5 ${shape.body}`}>
        <span
          aria-hidden
          className="absolute inset-0"
          style={{ clipPath: shape.clipPath, backgroundColor: BORDER_FILL }}
        />
        <span
          aria-hidden
          className="absolute inset-[1px] left-[3px]"
          style={{ clipPath: shape.clipPath, backgroundColor: BODY_FILL }}
        />
        {waits.map((wait, index) => (
          <Fragment key={wait.step?.id ?? `own-${index}`}>
            {index > 0 && <span className="relative text-label-xs text-muted-foreground">+</span>}
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
              <span className="relative flex items-center gap-1.5">
                <WaitParts wait={wait} />
              </span>
            )}
          </Fragment>
        ))}
      </span>
    </div>
  );
}
