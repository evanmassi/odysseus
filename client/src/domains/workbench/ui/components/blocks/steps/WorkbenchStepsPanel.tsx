import { useCallback, useMemo, useRef, useState } from 'react';

import { Button } from '@shared/ui';

import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { createId } from '../../../../utils/ids/createId';
import { stepNumbers } from '../../../../utils/steps/stepNumbering';
import { moveStepBlock } from '../../../../utils/steps/stepOrder';
import { groupStepsBySection, precedingMainSteps } from '../../../../utils/steps/stepOutline';

import { stepRowDragStyle } from './stepRowDragStyle';
import { useStepDrag, type StepDrop } from './useStepDrag';
import { useUpdateStepPage } from './useUpdateStepPage';
import { WorkbenchStepPasteModal } from './WorkbenchStepPasteModal';
import { WorkbenchStepRow } from './WorkbenchStepRow';
import { WorkbenchStepSectionRow } from './WorkbenchStepSectionRow';

import type { ProtocolBlock, ProtocolStep } from '@odysseus/shared-schemas';

interface WorkbenchStepsPanelProps {
  block: Extract<ProtocolBlock, { type: 'steps' }>;
}

const NO_STEPS: ProtocolStep[] = [];

export function WorkbenchStepsPanel({ block }: WorkbenchStepsPanelProps) {
  const steps = useWorkbenchStore(
    state => state.protocol.pages.find(page => page.id === block.page)?.steps ?? NO_STEPS
  );
  const updatePage = useUpdateStepPage(block.page);
  const [editingStepId, setEditingStepId] = useState<string>();
  const [freshSectionId, setFreshSectionId] = useState<string>();
  const [isPasting, setIsPasting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const numbers = useMemo(() => stepNumbers(steps), [steps]);
  const preceding = useMemo(() => precedingMainSteps(steps, numbers), [steps, numbers]);
  const groups = useMemo(() => groupStepsBySection(steps), [steps]);

  const dropStep = useCallback(
    (id: string, drop: StepDrop) =>
      updatePage(page => {
        page.steps = moveStepBlock(page.steps, id, drop.id, drop.isAfter);
      }),
    [updatePage]
  );
  const { draggingId, drop, startDrag } = useStepDrag(containerRef, dropStep);
  const clearFreshSection = useCallback(() => setFreshSectionId(undefined), []);
  const endEdit = useCallback(() => setEditingStepId(undefined), []);

  const addStep = () => {
    const id = createId();
    updatePage(page => {
      page.steps.push({ id, kind: 'step', level: 1, text: '', isMeanwhile: false });
    });
    setEditingStepId(id);
  };

  const addSection = () => {
    const id = createId();
    updatePage(page => {
      page.steps.push({ id, kind: 'section', text: 'New section' });
    });
    setEditingStepId(undefined);
    setFreshSectionId(id);
  };

  return (
    <div ref={containerRef} className="px-4 pb-4 pt-2">
      {groups.map(({ section, steps: groupSteps }) => (
        <section key={section?.id ?? 'loose'} className="mb-4">
          {section && (
            <WorkbenchStepSectionRow
              section={section}
              pageId={block.page}
              numeral={(numbers.get(section.id) ?? '').replace('.', '')}
              stepCount={groupSteps.length}
              shouldFocus={freshSectionId === section.id}
              dragStyle={stepRowDragStyle(section.id, draggingId, drop)}
              onFocused={clearFreshSection}
              onGrab={startDrag}
            />
          )}
          <div className={section ? 'ml-[22px] border-l border-line-mid pl-2.5' : ''}>
            {groupSteps.map(step => (
              <WorkbenchStepRow
                key={step.id}
                step={step}
                pageId={block.page}
                number={numbers.get(step.id) ?? ''}
                duringStep={step.level === 2 ? undefined : preceding.get(step.id)}
                isEditing={editingStepId === step.id}
                dragStyle={stepRowDragStyle(step.id, draggingId, drop)}
                onStartEdit={setEditingStepId}
                onEndEdit={endEdit}
                onGrab={startDrag}
              />
            ))}
          </div>
        </section>
      ))}
      <div className="mt-3 flex gap-2">
        <Button
          variant="ghost"
          size="xs"
          onMouseDown={event => event.preventDefault()}
          onClick={addStep}
        >
          + Step
        </Button>
        <Button variant="ghost" size="xs" onClick={addSection}>
          + Section
        </Button>
        <Button variant="ghost" size="xs" onClick={() => setIsPasting(true)}>
          Paste protocol
        </Button>
      </div>
      <WorkbenchStepPasteModal
        isOpen={isPasting}
        onClose={() => setIsPasting(false)}
        onAdd={parsed =>
          updatePage(page => {
            page.steps.push(...parsed.map(item => ({ ...item, id: createId() })));
          })
        }
      />
    </div>
  );
}
