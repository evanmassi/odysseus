import { ArrowDown, ArrowUp, CornerDownRight, Heading, ListPlus, Trash2 } from 'lucide-react';

import { OverflowMenu, Tooltip, type OverflowMenuItem } from '@shared/ui';

import { moveStepDown, moveStepUp } from '../../../../utils/steps/stepOrder';

import { useUpdateStepPage } from './useUpdateStepPage';

interface WorkbenchStepRowControlsProps {
  pageId: string;
  stepId: string;
  onAddSubStep?: () => void;
  onAddStepBelow: () => void;
  onAddSectionBelow?: () => void;
  onAddSectionAbove?: () => void;
}

const CONTROL =
  'inline-flex h-5 w-5 items-center justify-center text-muted-foreground transition-colors hover:text-foreground';
const REMOVE_LABEL = 'Remove';

export function WorkbenchStepRowControls({
  pageId,
  stepId,
  onAddSubStep,
  onAddStepBelow,
  onAddSectionBelow,
  onAddSectionAbove,
}: WorkbenchStepRowControlsProps) {
  const updatePage = useUpdateStepPage(pageId);
  const quickAdds = [
    { label: 'Add step', hint: 'Shift+Enter', Icon: ListPlus, onClick: onAddStepBelow },
    { label: 'Add sub-step', Icon: CornerDownRight, onClick: onAddSubStep },
  ];
  const menuItems: OverflowMenuItem[] = [
    ...(onAddSectionBelow
      ? [{ icon: Heading, label: 'Add section below', onClick: onAddSectionBelow }]
      : []),
    ...(onAddSectionAbove
      ? [{ icon: Heading, label: 'Add section above', onClick: onAddSectionAbove }]
      : []),
    {
      icon: ArrowUp,
      label: 'Move up',
      onClick: () =>
        updatePage(page => {
          page.steps = moveStepUp(page.steps, stepId);
        }),
    },
    {
      icon: ArrowDown,
      label: 'Move down',
      onClick: () =>
        updatePage(page => {
          page.steps = moveStepDown(page.steps, stepId);
        }),
    },
    {
      icon: Trash2,
      label: REMOVE_LABEL,
      danger: true,
      onClick: () =>
        updatePage(page => {
          page.steps = page.steps.filter(step => step.id !== stepId);
        }),
    },
  ];

  return (
    <span className="row-tools absolute -top-5 right-1 z-10">
      <span className="flex items-center gap-0.5 border border-line-mid bg-popover px-1 py-0.5 shadow-lg">
        {quickAdds.map(
          ({ label, hint, Icon, onClick }) =>
            onClick && (
              <Tooltip key={label} content={hint ? `${label} (${hint})` : label}>
                <button type="button" className={CONTROL} aria-label={label} onClick={onClick}>
                  <Icon aria-hidden className="h-3.5 w-3.5" />
                </button>
              </Tooltip>
            )
        )}
        <OverflowMenu
          items={menuItems}
          dividerBefore={[REMOVE_LABEL]}
          size="sm"
          aria-label="More step actions"
        />
      </span>
    </span>
  );
}
