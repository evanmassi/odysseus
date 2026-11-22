import { useMemo } from 'react';

import { useUpdateBlock } from '../../../../hooks/useUpdateBlock';
import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { shownPlate } from '../../../../utils/blocks/plateViews';

import { WorkbenchPlateMapPanel } from './WorkbenchPlateMapPanel';

import type { LinkedPlateMapBlock } from '@odysseus/shared-schemas';

interface WorkbenchLinkedPlateMapPanelProps {
  block: LinkedPlateMapBlock;
}

export function WorkbenchLinkedPlateMapPanel({ block }: WorkbenchLinkedPlateMapPanelProps) {
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
  return <WorkbenchPlateMapPanel block={shown} onDisplayChange={updateView} />;
}
