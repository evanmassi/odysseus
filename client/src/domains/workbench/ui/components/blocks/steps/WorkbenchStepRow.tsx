import { memo, useId, useRef } from 'react';
import type { MouseEvent } from 'react';

import { Checkbox } from '@shared/ui';

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
  onStartEdit: (stepId: string) => void;
  onEndEdit: () => void;
  onGrab: (stepId: string, event: MouseEvent) => void;
}

const OPTION_LABEL = 'flex items-center gap-1.5 text-label-2xs text-muted-foreground';

export const WorkbenchStepRow = memo(function WorkbenchStepRow({
  step,
  pageId,
  number,
  duringStep,
  isEditing,
  dragStyle,
  onStartEdit,
  onEndEdit,
  onGrab,
}: WorkbenchStepRowProps) {
  const updatePage = useUpdateStepPage(pageId);
  const rowRef = useRef<HTMLDivElement>(null);
  const subStepId = useId();
  const meanwhileId = useId();
  const isSubStep = step.level === 2;

  const updateStep = (recipe: (draft: OutlineStep) => void) =>
    updatePage(page => {
      const draft = page.steps.find(candidate => candidate.id === step.id);
      if (draft?.kind === 'step') recipe(draft);
    });

  const sizing = isSubStep
    ? 'ml-8 py-0.5 text-caption text-foreground/90'
    : 'py-1.5 text-body-sm text-foreground';

  return (
    <div
      ref={rowRef}
      {...{ [STEP_ROW_ATTRIBUTE]: step.id }}
      className={`group/step row-tools-host flex items-baseline gap-2.5 px-1.5 ${sizing} ${isEditing ? 'bg-primary/[0.04]' : ''} ${dragStyle}`}
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
              <span className={OPTION_LABEL}>
                <Checkbox
                  id={subStepId}
                  checked={isSubStep}
                  onChange={isChecked =>
                    updateStep(draft => {
                      draft.level = isChecked ? 2 : 1;
                    })
                  }
                />
                <label htmlFor={subStepId}>sub-step</label>
              </span>
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
      {!isEditing && <WorkbenchStepRowControls pageId={pageId} stepId={step.id} />}
    </div>
  );
});
