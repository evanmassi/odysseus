import { durationText } from '../../../../utils/flowDiagram/stepWaits';

import type { FlowDiagramFrame } from '../../../../utils/flowDiagram/flowDiagramLayout';
import type { FlowDiagramSection } from '../../../../utils/flowDiagram/flowDiagramModel';

interface WorkbenchFlowDiagramSectionFrameProps {
  frame: FlowDiagramFrame;
  section: FlowDiagramSection;
}

function sectionSummary({ stepCount, minutes, isOvernight }: FlowDiagramSection): string {
  return [
    `${stepCount} step${stepCount === 1 ? '' : 's'}`,
    minutes > 0 ? `≈ ${durationText(minutes)}` : '',
    isOvernight ? '+ overnight' : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

export function WorkbenchFlowDiagramSectionFrame({
  frame,
  section,
}: WorkbenchFlowDiagramSectionFrameProps) {
  return (
    <div
      className="absolute border border-foreground/15 bg-foreground/[0.02]"
      style={{ left: frame.x, top: frame.y, width: frame.width, height: frame.height }}
    >
      {section.numeral && (
        <div className="flex h-[30px] items-center gap-2 overflow-hidden whitespace-nowrap border-b border-foreground/10 bg-primary/10 px-2">
          <span className="bg-primary/25 px-1.5 font-mono text-label-xs font-bold text-foreground">
            {section.numeral}
          </span>
          <span className="truncate text-body-sm font-semibold text-foreground">
            {section.title || 'Untitled section'}
          </span>
          <span className="text-label-xs text-muted-foreground">
            {frame.isContinued ? 'continued' : sectionSummary(section)}
          </span>
        </div>
      )}
    </div>
  );
}
