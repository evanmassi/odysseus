import { memo, useEffect, useRef } from 'react';
import type { MouseEvent } from 'react';

import { STEP_ROW_ATTRIBUTE } from './useStepDrag';
import { useUpdateStepPage } from './useUpdateStepPage';
import { WorkbenchStepGripButton } from './WorkbenchStepGripButton';
import { WorkbenchStepRowControls } from './WorkbenchStepRowControls';

import type { OutlineSection } from '../../../../utils/steps/stepOutline';

interface WorkbenchStepSectionRowProps {
  section: OutlineSection;
  pageId: string;
  numeral: string;
  stepCount: number;
  shouldFocus: boolean;
  dragStyle: string;
  onFocused: () => void;
  onGrab: (stepId: string, event: MouseEvent) => void;
  onAddStepBelow: (stepId: string) => void;
}

export const WorkbenchStepSectionRow = memo(function WorkbenchStepSectionRow({
  section,
  pageId,
  numeral,
  stepCount,
  shouldFocus,
  dragStyle,
  onFocused,
  onGrab,
  onAddStepBelow,
}: WorkbenchStepSectionRowProps) {
  const updatePage = useUpdateStepPage(pageId);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!shouldFocus || !titleRef.current) return;
    titleRef.current.focus();
    titleRef.current.select();
    onFocused();
  }, [shouldFocus, onFocused]);

  return (
    <div
      {...{ [STEP_ROW_ATTRIBUTE]: section.id }}
      className={`group/step row-tools-host relative mb-1.5 flex items-center gap-3 px-1.5 pb-2 pt-1 ${dragStyle}`}
    >
      <WorkbenchStepGripButton onGrab={event => onGrab(section.id, event)} />
      <span className="min-w-5 text-title-lg font-extralight leading-none text-foreground/30">
        {numeral}
      </span>
      <span className="inline-edit">
        <input
          ref={titleRef}
          value={section.text}
          aria-label="Section title"
          spellCheck={false}
          className="min-w-[60px] py-px type-label text-label-md font-semibold tracking-label-wide text-foreground"
          onChange={event => {
            const text = event.currentTarget.value;
            updatePage(page => {
              const draft = page.steps.find(candidate => candidate.id === section.id);
              if (draft) draft.text = text;
            });
          }}
          onKeyDown={event => {
            if (event.key !== 'Enter') return;
            if (event.shiftKey) onAddStepBelow(section.id);
            else event.currentTarget.blur();
          }}
        />
      </span>
      <span className="h-px flex-1 bg-gradient-to-r from-foreground/20 via-foreground/10 to-foreground/5" />
      <span className="whitespace-nowrap font-mono text-label-2xs text-foreground/35">
        {stepCount} step{stepCount === 1 ? '' : 's'}
      </span>
      <WorkbenchStepRowControls
        pageId={pageId}
        stepId={section.id}
        onAddStepBelow={() => onAddStepBelow(section.id)}
      />
    </div>
  );
});
