import { useWorkbenchStore } from '../../../../stores/workbenchStore';

import { WorkbenchFlowCytometryPanel } from './WorkbenchFlowCytometryPanel';

import type { FlowCytometryPanelCard } from '@odysseus/shared-schemas';

interface WorkbenchFlowCytometryCardPanelProps {
  card: FlowCytometryPanelCard;
}

export function WorkbenchFlowCytometryCardPanel({ card }: WorkbenchFlowCytometryCardPanelProps) {
  const panel = useWorkbenchStore(state =>
    state.protocol.flowCytometryPanels.find(candidate => candidate.id === card.shows)
  );
  if (!panel) {
    return (
      <p className="px-3 py-2 text-body-sm text-muted-foreground">
        The Flow panel this card showed is gone.
      </p>
    );
  }
  return <WorkbenchFlowCytometryPanel panel={panel} />;
}
