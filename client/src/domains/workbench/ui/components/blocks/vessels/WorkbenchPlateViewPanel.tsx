import { useMemo } from 'react';

import { useUpdateBlock } from '../../../../hooks/useUpdateBlock';
import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { shownPlate } from '../../../../utils/blocks/plateViews';

import { WorkbenchVesselMapPanel } from './WorkbenchVesselMapPanel';

import type { PlateViewBlock } from '@odysseus/shared-schemas';

interface WorkbenchPlateViewPanelProps {
  block: PlateViewBlock;
}

export function WorkbenchPlateViewPanel({ block }: WorkbenchPlateViewPanelProps) {
  const source = useWorkbenchStore(state =>
    state.protocol.blocks.find(candidate => candidate.id === block.shows)
  );
  const updateView = useUpdateBlock(block);
  const shown = useMemo(
    () => (source?.type === 'plate' ? shownPlate(source, block) : undefined),
    [source, block]
  );
  if (!shown) {
    return (
      <p className="px-3 py-2 text-body-sm text-muted-foreground">
        The card this one showed is gone.
      </p>
    );
  }
  return <WorkbenchVesselMapPanel block={shown} onDisplayChange={updateView} />;
}
