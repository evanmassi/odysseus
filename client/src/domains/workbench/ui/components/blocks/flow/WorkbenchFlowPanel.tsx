import { useEffect, useMemo, useRef, type KeyboardEvent } from 'react';

import { useContentHeights } from '../../../../hooks/useContentHeights';
import { useElementWidth } from '../../../../hooks/useElementWidth';
import { useShowBlock } from '../../../../hooks/useShowBlock';
import { useFlowPlaceStore } from '../../../../stores/flowPlaceStore';
import { useStepEditingStore } from '../../../../stores/stepEditingStore';
import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { flowLayout } from '../../../../utils/flow/flowLayout';
import { flowModel } from '../../../../utils/flow/flowModel';
import { durationText } from '../../../../utils/flow/stepWaits';

import { FLOW_KIND_COLORS, FLOW_KIND_LABELS } from './flowKindStyles';
import { WorkbenchFlowSectionFrame } from './WorkbenchFlowSectionFrame';
import { WorkbenchFlowStepBox } from './WorkbenchFlowStepBox';
import { WorkbenchFlowWaitLabel } from './WorkbenchFlowWaitLabel';

import type { StepKind } from '../../../../utils/flow/stepKinds';
import type { ProtocolBlock, ProtocolStep } from '@odysseus/shared-schemas';

interface WorkbenchFlowPanelProps {
  block: Extract<ProtocolBlock, { type: 'flow' }>;
}

const NO_STEPS: ProtocolStep[] = [];
const STEP_KEYS: Readonly<Record<string, number>> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};
const PLAIN_LINE = 'hsl(var(--muted-foreground) / 0.7)';
const WAIT_LINE = FLOW_KIND_COLORS.wait;

export function WorkbenchFlowPanel({ block }: WorkbenchFlowPanelProps) {
  const steps = useWorkbenchStore(
    state => state.protocol.pages.find(page => page.id === block.page)?.steps ?? NO_STEPS
  );
  const calculation = useWorkbenchStore(state => state.calculation);
  const stepsBlockId = useWorkbenchStore(
    state =>
      state.protocol.blocks.find(
        candidate => candidate.type === 'steps' && candidate.page === block.page
      )?.id
  );
  const editStep = useStepEditingStore(state => state.editStep);
  const showBlock = useShowBlock();
  const stageRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(stageRef);

  const model = useMemo(() => flowModel(steps, calculation), [steps, calculation]);
  const contentHeights = useContentHeights(stageRef, width > 0 ? model : undefined);
  const layout = useMemo(
    () => flowLayout(model, width, contentHeights),
    [model, width, contentHeights]
  );
  const kinds = useMemo(
    () =>
      (Object.keys(FLOW_KIND_LABELS) as StepKind[]).filter(kind =>
        model.boxes.some(({ step }) =>
          [step, ...step.during].some(shown =>
            shown.actions.some(action => action.look.kind === kind)
          )
        )
      ),
    [model]
  );

  const placeId = useFlowPlaceStore(state => state.placeByBlock[block.id]);
  const setPlace = useFlowPlaceStore(state => state.setPlace);
  const orderOf = useMemo(
    () => new Map(model.stepOrder.map((stepId, index) => [stepId, index])),
    [model]
  );
  const placeIndex = placeId === undefined ? -1 : (orderOf.get(placeId) ?? -1);
  const isDone = (stepId: string) => placeIndex >= 0 && (orderOf.get(stepId) ?? -1) < placeIndex;
  const selectStep = (stepId: string) => setPlace(block.id, stepId);

  useEffect(() => {
    if (placeId === undefined) return;
    const element = stageRef.current?.querySelector<HTMLElement>(
      `[data-flow-step="${CSS.escape(placeId)}"]`
    );
    element?.focus({ preventScroll: true });
    element?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [placeId]);

  const moveThroughSteps = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setPlace(block.id, undefined);
      return;
    }
    const direction = STEP_KEYS[event.key];
    if (!direction || !model.stepOrder.length) return;
    event.preventDefault();
    const next = placeIndex < 0 ? 0 : placeIndex + direction;
    const clamped = Math.min(model.stepOrder.length - 1, Math.max(0, next));
    setPlace(block.id, model.stepOrder[clamped]);
  };

  const openStep = stepsBlockId
    ? (stepId: string) => {
        editStep(stepId);
        showBlock(stepsBlockId);
      }
    : undefined;
  const plainMarker = `flow-plain-${block.id}`;
  const waitMarker = `flow-wait-${block.id}`;
  const total = [
    model.minutes > 0 ? `≈ ${durationText(model.minutes)}` : '',
    model.isOvernight ? '+ overnight' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="px-3 pb-3 pt-2">
      {model.boxes.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-label-xs text-muted-foreground">
          {kinds.map(kind => (
            <span key={kind} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="h-2 w-2"
                style={{ backgroundColor: FLOW_KIND_COLORS[kind] }}
              />
              {FLOW_KIND_LABELS[kind]}
            </span>
          ))}
          {total && <span className="ml-auto font-mono text-data-sm text-foreground">{total}</span>}
        </div>
      )}
      <div
        ref={stageRef}
        role="toolbar"
        aria-label="Flow diagram steps"
        onKeyDown={moveThroughSteps}
        className="selection-pulse relative"
        style={model.boxes.length ? { height: layout.height } : undefined}
      >
        {model.boxes.length === 0 ? (
          <p className="text-body-sm italic text-muted-foreground">
            Add steps in Procedure and they are drawn here.
          </p>
        ) : (
          width > 0 && (
            <>
              {layout.frames.map(frame => (
                <WorkbenchFlowSectionFrame
                  key={`${frame.sectionIndex}-${frame.y}`}
                  frame={frame}
                  section={model.sections[frame.sectionIndex]}
                />
              ))}
              <svg
                aria-hidden
                className="pointer-events-none absolute left-0 top-0 overflow-visible"
                width={width}
                height={layout.height}
              >
                <defs>
                  {[
                    [plainMarker, PLAIN_LINE],
                    [waitMarker, WAIT_LINE],
                  ].map(([id, color]) => (
                    <marker
                      key={id}
                      id={id}
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="7"
                      markerHeight="7"
                      orient="auto"
                    >
                      <path d="M0 0L10 5L0 10z" fill={color} />
                    </marker>
                  ))}
                </defs>
                {layout.arrows.map(arrow => {
                  const isWait = arrow.waits.length > 0;
                  return (
                    <path
                      key={arrow.path}
                      d={arrow.path}
                      fill="none"
                      stroke={isWait ? WAIT_LINE : PLAIN_LINE}
                      strokeWidth={isWait ? 1.8 : 1.2}
                      markerEnd={`url(#${isWait ? waitMarker : plainMarker})`}
                    />
                  );
                })}
                {layout.links.map(link => (
                  <path
                    key={`${link.x}-${link.y1}`}
                    d={`M${link.x} ${link.y1} V${link.y2}`}
                    fill="none"
                    stroke={PLAIN_LINE}
                    strokeDasharray="3 3"
                  />
                ))}
              </svg>
              {layout.arrows
                .filter(arrow => arrow.waits.length > 0)
                .map(arrow => (
                  <WorkbenchFlowWaitLabel
                    key={arrow.path}
                    waits={arrow.waits}
                    x={arrow.labelX}
                    y={arrow.labelY}
                    anchor={arrow.labelAnchor}
                    placeId={placeId}
                    isDone={isDone}
                    onSelect={selectStep}
                  />
                ))}
              {layout.steps.map(placed => (
                <WorkbenchFlowStepBox
                  key={placed.step.id}
                  placed={placed}
                  isPlace={placed.step.id === placeId}
                  isDone={isDone(placed.step.id)}
                  onSelect={selectStep}
                  onOpen={openStep}
                />
              ))}
            </>
          )
        )}
      </div>
    </div>
  );
}
