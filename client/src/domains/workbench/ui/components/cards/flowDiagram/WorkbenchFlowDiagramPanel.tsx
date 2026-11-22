import { useEffect, useMemo, useRef, type KeyboardEvent } from 'react';

import { Workflow } from 'lucide-react';

import { PanelEmptyState } from '@shared/ui';

import { useContentHeights } from '../../../../hooks/useContentHeights';
import { useElementWidth } from '../../../../hooks/useElementWidth';
import { useShowCard } from '../../../../hooks/useShowCard';
import { useFlowDiagramPlaceStore } from '../../../../stores/flowDiagramPlaceStore';
import { useStepEditingStore } from '../../../../stores/stepEditingStore';
import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { flowDiagramLayout } from '../../../../utils/flowDiagram/flowDiagramLayout';
import { flowDiagramModel } from '../../../../utils/flowDiagram/flowDiagramModel';
import { durationText } from '../../../../utils/flowDiagram/stepWaits';

import { FLOW_DIAGRAM_HANDS_OFF_COLOR, FLOW_DIAGRAM_PICTURE_COLOR } from './flowDiagramKindStyles';
import { WorkbenchFlowDiagramSectionFrame } from './WorkbenchFlowDiagramSectionFrame';
import { WorkbenchFlowDiagramStepBox } from './WorkbenchFlowDiagramStepBox';
import { WorkbenchFlowDiagramWaitLabel } from './WorkbenchFlowDiagramWaitLabel';

import type { ProtocolCard, ProtocolStep } from '@odysseus/shared-schemas';

interface WorkbenchFlowDiagramPanelProps {
  card: Extract<ProtocolCard, { type: 'flow' }>;
}

const NO_STEPS: ProtocolStep[] = [];
const STEP_KEYS: Readonly<Record<string, number>> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};
const PLAIN_LINE = 'hsl(var(--muted-foreground) / 0.7)';
const WAIT_LINE = FLOW_DIAGRAM_HANDS_OFF_COLOR;

export function WorkbenchFlowDiagramPanel({ card }: WorkbenchFlowDiagramPanelProps) {
  const steps = useWorkbenchStore(
    state => state.protocol.pages.find(page => page.id === card.page)?.steps ?? NO_STEPS
  );
  const board = useWorkbenchStore(state => state.board);
  const procedureCardId = useWorkbenchStore(
    state =>
      state.protocol.blocks.find(
        candidate => candidate.type === 'steps' && candidate.page === card.page
      )?.id
  );
  const editStep = useStepEditingStore(state => state.editStep);
  const showCard = useShowCard();
  const stageRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(stageRef);

  const model = useMemo(() => flowDiagramModel(steps, board), [steps, board]);
  const contentHeights = useContentHeights(stageRef, width > 0 ? model : undefined);
  const layout = useMemo(
    () => flowDiagramLayout(model, width, contentHeights),
    [model, width, contentHeights]
  );
  const legend = useMemo(() => {
    const kinds = model.boxes.flatMap(({ step }) =>
      [step, ...step.during].flatMap(shown => shown.actions.map(action => action.look.kind))
    );
    const hasWaitArrow = layout.arrows.some(arrow => arrow.waits.length > 0);
    return [
      {
        label: 'Hands-on',
        color: FLOW_DIAGRAM_PICTURE_COLOR,
        isShown: kinds.some(kind => kind !== 'wait'),
      },
      {
        label: 'Hands-off',
        color: FLOW_DIAGRAM_HANDS_OFF_COLOR,
        isShown: hasWaitArrow || kinds.includes('wait'),
      },
    ].filter(entry => entry.isShown);
  }, [model, layout]);

  const placeId = useFlowDiagramPlaceStore(state => state.placeByCard[card.id]);
  const setPlace = useFlowDiagramPlaceStore(state => state.setPlace);
  const orderOf = useMemo(
    () => new Map(model.stepOrder.map((stepId, index) => [stepId, index])),
    [model]
  );
  const placeIndex = placeId === undefined ? -1 : (orderOf.get(placeId) ?? -1);
  const isDone = (stepId: string) => placeIndex >= 0 && (orderOf.get(stepId) ?? -1) < placeIndex;
  const selectStep = (stepId: string) => setPlace(card.id, stepId);

  useEffect(() => {
    if (placeId === undefined) return;
    const element = stageRef.current?.querySelector<HTMLElement>(
      `[data-flow-diagram-step="${CSS.escape(placeId)}"]`
    );
    element?.focus({ preventScroll: true });
    element?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [placeId]);

  const moveThroughSteps = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setPlace(card.id, undefined);
      return;
    }
    const direction = STEP_KEYS[event.key];
    if (!direction || !model.stepOrder.length) return;
    event.preventDefault();
    const next = placeIndex < 0 ? 0 : placeIndex + direction;
    const clamped = Math.min(model.stepOrder.length - 1, Math.max(0, next));
    setPlace(card.id, model.stepOrder[clamped]);
  };

  const openStep = procedureCardId
    ? (stepId: string) => {
        editStep(stepId);
        showCard(procedureCardId);
      }
    : undefined;
  const plainMarker = `flow-diagram-plain-${card.id}`;
  const waitMarker = `flow-diagram-wait-${card.id}`;
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
          {legend.map(entry => (
            <span key={entry.label} className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-2 w-2" style={{ backgroundColor: entry.color }} />
              {entry.label}
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
          <PanelEmptyState
            icon={Workflow}
            message="Add steps in Procedure"
            description="Each step is drawn here as it's written"
          />
        ) : (
          width > 0 && (
            <>
              {layout.frames.map(frame => (
                <WorkbenchFlowDiagramSectionFrame
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
                  if (isWait && arrow.isStraight) return null;
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
                  <WorkbenchFlowDiagramWaitLabel
                    key={arrow.path}
                    waits={arrow.waits}
                    x={arrow.labelX}
                    y={arrow.labelY}
                    anchor={arrow.labelAnchor}
                    direction={arrow.direction}
                    placeId={placeId}
                    isDone={isDone}
                    onSelect={selectStep}
                  />
                ))}
              {layout.steps.map(placed => (
                <WorkbenchFlowDiagramStepBox
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
