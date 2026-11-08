import { ArrowDown, ArrowUp, X } from 'lucide-react';

import { moveStepDown, moveStepUp } from '../../../../utils/steps/stepOrder';

import { useUpdateStepPage } from './useUpdateStepPage';

interface WorkbenchStepRowControlsProps {
  pageId: string;
  stepId: string;
}

const CONTROL =
  'inline-flex h-5 w-5 items-center justify-center text-muted-foreground transition-colors hover:text-foreground';

export function WorkbenchStepRowControls({ pageId, stepId }: WorkbenchStepRowControlsProps) {
  const updatePage = useUpdateStepPage(pageId);
  return (
    <span className="row-tools self-center">
      <span className="flex">
        <button
          type="button"
          className={CONTROL}
          title="Move up"
          onClick={() =>
            updatePage(page => {
              page.steps = moveStepUp(page.steps, stepId);
            })
          }
        >
          <ArrowUp aria-hidden className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className={CONTROL}
          title="Move down"
          onClick={() =>
            updatePage(page => {
              page.steps = moveStepDown(page.steps, stepId);
            })
          }
        >
          <ArrowDown aria-hidden className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className={`${CONTROL} hover:text-danger-text`}
          title="Remove"
          onClick={() =>
            updatePage(page => {
              page.steps = page.steps.filter(step => step.id !== stepId);
            })
          }
        >
          <X aria-hidden className="h-3.5 w-3.5" />
        </button>
      </span>
    </span>
  );
}
