import { memo, useId, useRef } from 'react';
import type { MouseEvent } from 'react';

import { IndentDecrease, IndentIncrease } from 'lucide-react';

import { Checkbox } from '@shared/ui';

import { DEEPEST_STEP_LEVEL, shiftStepLevel } from '../../../../utils/steps/stepOrder';
import { WorkbenchTrayToggleButton } from '../../tray/WorkbenchTrayToggleButton';

import { STEP_ROW_ATTRIBUTE } from './useStepDrag';
import { useUpdateStepPage } from './useUpdateStepPage';
import { WorkbenchStepGripButton } from './WorkbenchStepGripButton';
import { WorkbenchStepPreview } from './WorkbenchStepPreview';
import { WorkbenchStepRowControls } from './WorkbenchStepRowControls';
import { WorkbenchStepTextField } from './WorkbenchStepTextField';

import type { OutlineStep } from '../../../../utils/steps/stepOutline';

interface WorkbenchStepRowProps {
  step: OutlineStep;
  pageId: string;
  number: string;
  duringStep?: string;
  isEditing: boolean;
  dragStyle: string;
  canMoveIn: boolean;
  canMoveOut: boolean;
  onStartEdit: (stepId: string) => void;
  onEndEdit: () => void;
  onGrab: (stepId: string, event: MouseEvent) => void;
  onAddSubStep: (stepId: string) => void;
}

const OPTION_LABEL = 'flex items-center gap-1.5 text-label-2xs text-muted-foreground';
const LEVEL_BUTTON = `${OPTION_LABEL} transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40`;
const LEVEL_SIZING: Record<OutlineStep['level'], string> = {
  1: 'py-1.5 text-body-sm text-foreground',
  2: 'ml-8 py-0.5 text-caption text-foreground/90',
  3: 'ml-16 py-0.5 text-caption text-foreground/90',
};

export const WorkbenchStepRow = memo(function WorkbenchStepRow({
  step,
  pageId,
  number,
  duringStep,
  isEditing,
  dragStyle,
  canMoveIn,
  canMoveOut,
  onStartEdit,
  onEndEdit,
  onGrab,
  onAddSubStep,
}: WorkbenchStepRowProps) {
  const updatePage = useUpdateStepPage(pageId);
  const rowRef = useRef<HTMLDivElement>(null);
  const meanwhileId = useId();
  const isSubStep = step.level > 1;

  const updateStep = (recipe: (draft: OutlineStep) => void) =>
    updatePage(page => {
      const draft = page.steps.find(candidate => candidate.id === step.id);
      if (draft?.kind === 'step') recipe(draft);
    });

  const shiftLevel = (shift: 1 | -1) =>
    updatePage(page => {
      page.steps = shiftStepLevel(page.steps, step.id, shift);
    });

  return (
    <div
      ref={rowRef}
      {...{ [STEP_ROW_ATTRIBUTE]: step.id }}
      className={`group/step row-tools-host flex items-baseline gap-2.5 px-1.5 ${LEVEL_SIZING[step.level]} ${isEditing ? 'bg-primary/[0.04]' : ''} ${dragStyle}`}
      onBlur={event => {
        if (isEditing && !event.currentTarget.contains(event.relatedTarget)) onEndEdit();
      }}
    >
      {!isEditing && <WorkbenchStepGripButton onGrab={event => onGrab(step.id, event)} />}
      <span
        className={`flex-none text-right font-mono text-muted-foreground ${isSubStep ? 'min-w-3.5 text-label-2xs' : 'min-w-[22px] text-data-sm'}`}
      >
        {number}
      </span>
      <div className="min-w-0 flex-1">
        {isEditing ? (
          <>
            <WorkbenchStepTextField
              text={step.text}
              rowRef={rowRef}
              onTextChange={text =>
                updateStep(draft => {
                  draft.text = text;
                })
              }
            />
            {/* PITFALL: mousedown here would blur the editor and end editing before the checkbox click lands. */}
            <div
              role="presentation"
              className="mt-1.5 flex flex-wrap items-center gap-3.5"
              onMouseDown={event => event.preventDefault()}
            >
              <button
                type="button"
                className={LEVEL_BUTTON}
                disabled={!canMoveOut}
                onClick={() => shiftLevel(-1)}
              >
                <IndentDecrease aria-hidden className="h-3.5 w-3.5" />
                Move out
              </button>
              <button
                type="button"
                className={LEVEL_BUTTON}
                disabled={!canMoveIn}
                onClick={() => shiftLevel(1)}
              >
                <IndentIncrease aria-hidden className="h-3.5 w-3.5" />
                Move in
              </button>
              {duringStep && (
                <span className={OPTION_LABEL}>
                  <Checkbox
                    id={meanwhileId}
                    checked={step.isMeanwhile}
                    onChange={isChecked =>
                      updateStep(draft => {
                        draft.isMeanwhile = isChecked;
                      })
                    }
                  />
                  <label htmlFor={meanwhileId}>Runs during step {duringStep}</label>
                </span>
              )}
              <WorkbenchTrayToggleButton mode="step" />
            </div>
          </>
        ) : (
          <div
            role="button"
            tabIndex={0}
            className="cursor-text leading-normal"
            onMouseDown={event => {
              if (event.button !== 0) return;
              event.preventDefault();
              onStartEdit(step.id);
            }}
            onKeyDown={event => {
              if (event.key === 'Enter') onStartEdit(step.id);
            }}
          >
            {step.isMeanwhile && duringStep && (
              <span className="mr-1 italic text-muted-foreground">During step {duringStep}:</span>
            )}
            {step.text ? (
              <WorkbenchStepPreview text={step.text} />
            ) : (
              <span className="italic text-muted-foreground">Click to write this step</span>
            )}
          </div>
        )}
      </div>
      {!isEditing && (
        <WorkbenchStepRowControls
          pageId={pageId}
          stepId={step.id}
          onAddSubStep={step.level < DEEPEST_STEP_LEVEL ? () => onAddSubStep(step.id) : undefined}
        />
      )}
    </div>
  );
});
