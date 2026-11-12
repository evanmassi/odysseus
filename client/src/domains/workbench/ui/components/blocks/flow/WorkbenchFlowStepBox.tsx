import { splitProse } from '../../../../utils/steps/stepTemplate';
import { STEP_PROSE_CLASSES } from '../steps/stepProseClasses';

import { FLOW_DONE_CLASSES, FLOW_KIND_COLORS, FLOW_PLACE_CLASSES } from './flowKindStyles';
import { WorkbenchFlowPicture } from './WorkbenchFlowPicture';

import type { PlacedStep } from '../../../../utils/flow/flowLayout';
import type { FlowSubStep } from '../../../../utils/flow/flowModel';

interface WorkbenchFlowStepBoxProps {
  placed: PlacedStep;
  isPlace: boolean;
  isDone: boolean;
  onSelect: (stepId: string) => void;
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

function SubStepLine({ sub, isNested }: { sub: FlowSubStep; isNested: boolean }) {
  return (
    <span className="flex flex-col gap-1">
      <span className="flex gap-2 text-label-xs leading-snug">
        <span
          className={`flex-none font-mono font-bold text-muted-foreground ${isNested ? 'w-6' : 'w-3'}`}
        >
          {sub.number}
        </span>
        <span className="min-w-0 text-foreground/90">
          {sub.verb && (
            <span
              className="mr-1 text-label-2xs font-bold uppercase tracking-meta"
              style={{ color: FLOW_KIND_COLORS[sub.kind] }}
            >
              {sub.verb}
            </span>
          )}
          <StepText text={sub.text} />
        </span>
      </span>
      {sub.subSteps.length > 0 && (
        <span className="ml-[5px] flex flex-col gap-1 border-l border-foreground/20 pl-3">
          {sub.subSteps.map(child => (
            <SubStepLine key={child.id} sub={child} isNested />
          ))}
        </span>
      )}
    </span>
  );
}

function SubStepLines({ subSteps }: { subSteps: FlowSubStep[] }) {
  return (
    <span className="mt-0.5 flex flex-col gap-1 border-t border-foreground/10 pt-1.5">
      {subSteps.map(sub => (
        <SubStepLine key={sub.id} sub={sub} isNested={false} />
      ))}
    </span>
  );
}

export function WorkbenchFlowStepBox({
  placed,
  isPlace,
  isDone,
  onSelect,
  onOpen,
}: WorkbenchFlowStepBoxProps) {
  const { step, duringOf } = placed;
  const color = FLOW_KIND_COLORS[step.kind];

  return (
    <button
      type="button"
      data-flow-step={step.id}
      aria-current={isPlace ? 'step' : undefined}
      onClick={() => onSelect(step.id)}
      onDoubleClick={() => onOpen?.(step.id)}
      className={`absolute flex flex-col border border-l-[3px] border-foreground/20 bg-card py-1.5 pl-[30px] pr-2 text-left transition-[border-color,opacity] hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        duringOf ? 'border-dashed bg-card/60' : ''
      } ${isPlace ? FLOW_PLACE_CLASSES : ''} ${isDone ? FLOW_DONE_CLASSES : ''}`}
      style={{
        left: placed.x,
        top: placed.y,
        width: placed.width,
        height: placed.height,
        borderLeftColor: color,
        borderLeftStyle: 'solid',
      }}
    >
      <span
        className="absolute left-0 top-0 flex h-5 min-w-[22px] items-center justify-center px-1 font-mono text-data-sm font-bold text-foreground"
        style={{ backgroundColor: `color-mix(in srgb, ${color} 38%, hsl(var(--card)))` }}
      >
        {step.number}
      </span>
      <span data-measure-id={step.id} className="flex flex-col gap-1">
        {step.actions.map((action, index) => {
          const actionColor = FLOW_KIND_COLORS[action.look.kind];
          const hasHeading = !!action.verb || (index === 0 && !!duringOf);
          return (
            <span key={index} className="flex items-start gap-x-2.5">
              <WorkbenchFlowPicture picture={action.look.picture} color={actionColor} />
              <span className="min-w-0 flex-1">
                {hasHeading && (
                  <span className="flex h-[18px] items-center gap-1.5 whitespace-nowrap">
                    {index === 0 && duringOf && (
                      <span className="type-label text-label-2xs font-semibold text-muted-foreground">
                        During {duringOf}
                      </span>
                    )}
                    {action.verb && (
                      <span
                        className="truncate text-label-xs font-bold uppercase tracking-meta"
                        style={{ color: actionColor }}
                      >
                        {action.verb}
                      </span>
                    )}
                  </span>
                )}
                <span className="mt-0.5 block text-body-sm leading-snug text-foreground/90">
                  <StepText text={action.text} />
                </span>
              </span>
            </span>
          );
        })}
        {step.subSteps.length > 0 && <SubStepLines subSteps={step.subSteps} />}
      </span>
    </button>
  );
}
