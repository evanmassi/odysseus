import { useEffect, useRef } from 'react';
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
  onGrab: (event: MouseEvent) => void;
}

export function WorkbenchStepSectionRow({
  section,
  pageId,
  numeral,
  stepCount,
  shouldFocus,
  dragStyle,
  onFocused,
  onGrab,
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
      className={`group/step row-tools-host -ml-1.5 mb-1.5 flex items-center gap-3 px-1 pb-2 pt-1 ${dragStyle}`}
    >
      <WorkbenchStepGripButton onGrab={onGrab} />
      <span className="min-w-9 text-right text-title-lg font-extralight leading-none text-foreground/30">
        {numeral}
      </span>
      <input
        ref={titleRef}
        value={section.text}
        aria-label="Section title"
        data-focus="border"
        spellCheck={false}
        className="min-w-[60px] max-w-[70%] border border-transparent bg-transparent px-1.5 py-0.5 type-label text-label-md font-semibold tracking-label-wide text-foreground outline-none [field-sizing:content] hover:border-line-mid focus:border-line-mid"
        onChange={event => {
          const text = event.currentTarget.value;
          updatePage(page => {
            const draft = page.steps.find(candidate => candidate.id === section.id);
            if (draft) draft.text = text;
          });
        }}
        onKeyDown={event => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
      />
      <span className="h-px flex-1 bg-gradient-to-r from-foreground/20 via-foreground/10 to-foreground/5" />
      <span className="whitespace-nowrap font-mono text-label-2xs text-foreground/35">
        {stepCount} step{stepCount === 1 ? '' : 's'}
      </span>
      <WorkbenchStepRowControls pageId={pageId} stepId={section.id} />
    </div>
  );
}
