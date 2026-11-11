import { memo, useId, useRef } from 'react';
import type { MouseEvent } from 'react';

import { IndentDecrease, IndentIncrease, ListPlus } from 'lucide-react';

import { Checkbox } from '@shared/ui';
import { ROW_HOVER_GLOW } from '@shared/ui/primitives/table/rowGlow';

import { DEEPEST_STEP_LEVEL, shiftStepLevel } from '../../../../utils/steps/stepOrder';
import { isInInsertTray } from '../../tray/trayFocus';
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
  onAddStepBelow: (stepId: string) => void;
  isFirstOnPage: boolean;
  onAddSection: (stepId: string, isBelow: boolean) => void;
}

const OPTION_LABEL = 'flex items-center gap-1.5 text-label-2xs text-muted-foreground';
const LEVEL_BUTTON = `${OPTION_LABEL} transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40`;
const KEY_HINT = 'font-mono text-muted-foreground/60';
const LEVEL_SIZING: Record<OutlineStep['level'], string> = {
  1: 'py-1.5 text-body-sm text-foreground',
  2: 'ml-[34px] py-0.5 text-caption text-foreground/90',
  3: 'ml-[60px] py-0.5 text-caption text-foreground/90',
};
// PITFALL: each level's margin starts its number where the level above's text starts (row padding + number column + gap), so change these widths and the margins above together.
const NUMBER_COLUMN: Record<OutlineStep['level'], string> = {
  1: 'min-w-6 text-data-sm',
  2: 'min-w-4 text-label-2xs',
  3: 'min-w-8 text-right text-label-2xs',
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
  onAddStepBelow,
  isFirstOnPage,
  onAddSection,
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
      className={`group/step row-tools-host relative flex items-baseline gap-2.5 px-1.5 ${LEVEL_SIZING[step.level]} ${isEditing ? 'bg-primary/[0.04]' : ''} ${dragStyle || ROW_HOVER_GLOW.primary}`}
      onBlur={event => {
        const isStillHere =
          event.currentTarget.contains(event.relatedTarget) || isInInsertTray(event.relatedTarget);
        if (isEditing && !isStillHere) onEndEdit();
      }}
    >
      {!isEditing && <WorkbenchStepGripButton onGrab={event => onGrab(step.id, event)} />}
      <span className={`flex-none font-mono text-muted-foreground ${NUMBER_COLUMN[step.level]}`}>
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
              onShiftLevel={shiftLevel}
              onAddStepBelow={() => onAddStepBelow(step.id)}
              onLeave={onEndEdit}
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
                <span className={KEY_HINT}>Shift+Tab</span>
              </button>
              <button
                type="button"
                className={LEVEL_BUTTON}
                disabled={!canMoveIn}
                onClick={() => shiftLevel(1)}
              >
                <IndentIncrease aria-hidden className="h-3.5 w-3.5" />
                Move in
                <span className={KEY_HINT}>Tab</span>
              </button>
              <button
                type="button"
                className={LEVEL_BUTTON}
                onClick={() => onAddStepBelow(step.id)}
              >
                <ListPlus aria-hidden className="h-3.5 w-3.5" />
                Add step
                <span className={KEY_HINT}>Shift+Enter</span>
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
            className="inline-edit-host cursor-text leading-normal"
            onMouseDown={event => {
              if (event.button !== 0) return;
              event.preventDefault();
              onStartEdit(step.id);
            }}
            onKeyDown={event => {
              if (event.key === 'Enter') onStartEdit(step.id);
            }}
          >
            <span className="inline-edit">
              {step.isMeanwhile && duringStep && (
                <span className="mr-1 italic text-muted-foreground">During step {duringStep}:</span>
              )}
              {step.text ? (
                <WorkbenchStepPreview text={step.text} />
              ) : (
                <span className="italic text-muted-foreground">Click to write this step</span>
              )}
            </span>
          </div>
        )}
      </div>
      {!isEditing && (
        <WorkbenchStepRowControls
          pageId={pageId}
          stepId={step.id}
          onAddSubStep={step.level < DEEPEST_STEP_LEVEL ? () => onAddSubStep(step.id) : undefined}
          onAddStepBelow={() => onAddStepBelow(step.id)}
          onAddSectionBelow={isSubStep ? undefined : () => onAddSection(step.id, true)}
          onAddSectionAbove={isFirstOnPage ? () => onAddSection(step.id, false) : undefined}
        />
      )}
    </div>
  );
});
