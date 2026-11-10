import { ArrowDown, ArrowUp, CornerDownRight, X } from 'lucide-react';

import { Tooltip } from '@shared/ui';

import { moveStepDown, moveStepUp } from '../../../../utils/steps/stepOrder';

import { useUpdateStepPage } from './useUpdateStepPage';

interface WorkbenchStepRowControlsProps {
  pageId: string;
  stepId: string;
  onAddSubStep?: () => void;
}

const CONTROL =
  'inline-flex h-5 w-5 items-center justify-center text-muted-foreground transition-colors hover:text-foreground';

export function WorkbenchStepRowControls({
  pageId,
  stepId,
  onAddSubStep,
}: WorkbenchStepRowControlsProps) {
  const updatePage = useUpdateStepPage(pageId);
  return (
    <span className="row-tools self-center">
      <span className="flex">
        {onAddSubStep && (
          <Tooltip content="Add sub-step">
            <button
              type="button"
              className={CONTROL}
              aria-label="Add sub-step"
              onClick={onAddSubStep}
            >
              <CornerDownRight aria-hidden className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        )}
        <Tooltip content="Move up">
          <button
            type="button"
            className={CONTROL}
            aria-label="Move up"
            onClick={() =>
              updatePage(page => {
                page.steps = moveStepUp(page.steps, stepId);
              })
            }
          >
            <ArrowUp aria-hidden className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
        <Tooltip content="Move down">
          <button
            type="button"
            className={CONTROL}
            aria-label="Move down"
            onClick={() =>
              updatePage(page => {
                page.steps = moveStepDown(page.steps, stepId);
              })
            }
          >
            <ArrowDown aria-hidden className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
        <Tooltip content="Remove">
          <button
            type="button"
            className={`${CONTROL} hover:text-danger-text`}
            aria-label="Remove"
            onClick={() =>
              updatePage(page => {
                page.steps = page.steps.filter(step => step.id !== stepId);
              })
            }
          >
            <X aria-hidden className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
      </span>
    </span>
  );
}
