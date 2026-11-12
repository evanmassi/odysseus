import { Fragment } from 'react';

import { Tooltip } from '@shared/ui';

import { splitProse } from '../../../../utils/steps/stepTemplate';
import { STEP_PROSE_CLASSES } from '../steps/stepProseClasses';
import { wellTooltipContent } from '../vessels/wellTooltipContent';

import { FLOW_KIND_COLORS } from './flowKindStyles';
import { WorkbenchFlowPicture } from './WorkbenchFlowPicture';

import type { PlacedStep } from '../../../../utils/flow/flowLayout';

interface WorkbenchFlowStepBoxProps {
  placed: PlacedStep;
  onOpen: ((stepId: string) => void) | undefined;
}

const BLANK = /(\[[^\]]+\])/;

function StepText({ text }: { text: string }) {
  return (
    <>
      {text.split(BLANK).map((part, partIndex) =>
        partIndex % 2 ? (
          <span
            key={partIndex}
            className="border-b border-dashed border-warning-text/75 text-warning-text"
          >
            {part.slice(1, -1)}
          </span>
        ) : (
          splitProse(part, false).map((piece, pieceIndex) => (
            <span key={`${partIndex}-${pieceIndex}`} className={STEP_PROSE_CLASSES[piece.kind]}>
              {piece.text}
            </span>
          ))
        )
      )}
    </>
  );
}

export function WorkbenchFlowStepBox({ placed, onOpen }: WorkbenchFlowStepBoxProps) {
  const { step, duringOf } = placed;
  const color = FLOW_KIND_COLORS[step.kind];
  const tooltip = [
    step.fullText || 'Empty step',
    ...step.subSteps.map(sub => `${sub.number}. ${sub.text}`),
  ];

  return (
    <Tooltip content={wellTooltipContent(tooltip)} delayDuration={400}>
      <button
        type="button"
        disabled={!onOpen}
        onClick={() => onOpen?.(step.id)}
        className={`absolute flex items-start gap-x-2.5 overflow-hidden border border-l-[3px] border-foreground/20 bg-card px-2 py-1.5 text-left transition-colors enabled:hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          duringOf ? 'border-dashed bg-card/60' : ''
        }`}
        style={{
          left: placed.x,
          top: placed.y,
          width: placed.width,
          height: placed.height,
          borderLeftColor: color,
          borderLeftStyle: 'solid',
        }}
      >
        {step.pictures.map(({ picture, kind }) => (
          <WorkbenchFlowPicture key={picture} picture={picture} color={FLOW_KIND_COLORS[kind]} />
        ))}
        <span className="min-w-0 flex-1">
          <span className="flex h-[18px] items-center gap-1.5 whitespace-nowrap">
            {duringOf ? (
              <span className="type-label text-label-2xs font-semibold text-muted-foreground">
                During {duringOf}
              </span>
            ) : (
              <span className="font-mono text-data-sm font-bold text-muted-foreground">
                {step.number}
              </span>
            )}
            {step.verbs.length > 0 && (
              <span className="truncate text-label-xs font-bold uppercase tracking-meta text-foreground">
                {step.verbs.map((verb, index) => (
                  <Fragment key={verb}>
                    {index > 0 && <span className="px-1 font-normal text-muted-foreground">·</span>}
                    {verb}
                  </Fragment>
                ))}
              </span>
            )}
            {step.timeInBox && (
              <span className="ml-auto bg-primary/15 px-1 font-mono text-data-sm text-foreground">
                {step.timeInBox.label}
              </span>
            )}
          </span>
          <span className="mt-0.5 line-clamp-2 text-body-sm leading-snug text-foreground/90">
            <StepText text={step.text} />
          </span>
          {step.subSteps.length > 0 && (
            <span className="mt-0.5 block text-label-xs text-muted-foreground">
              + {step.subSteps.length} sub-step{step.subSteps.length === 1 ? '' : 's'}
            </span>
          )}
        </span>
      </button>
    </Tooltip>
  );
}
