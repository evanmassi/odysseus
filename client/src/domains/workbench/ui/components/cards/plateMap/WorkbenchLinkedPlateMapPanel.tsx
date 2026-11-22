import { useMemo } from 'react';

import { useUpdateCard } from '../../../../hooks/useUpdateCard';
import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { shownPlate } from '../../../../utils/cards/linkedPlateMaps';

import { WorkbenchPlateMapPanel } from './WorkbenchPlateMapPanel';

import type { LinkedPlateMapCard } from '@odysseus/shared-schemas';

interface WorkbenchLinkedPlateMapPanelProps {
  card: LinkedPlateMapCard;
}

export function WorkbenchLinkedPlateMapPanel({ card }: WorkbenchLinkedPlateMapPanelProps) {
  const source = useWorkbenchStore(state =>
    state.protocol.blocks.find(candidate => candidate.id === card.shows)
  );
  const updateView = useUpdateCard(card);
  const shown = useMemo(
    () => (source?.type === 'plate' ? shownPlate(source, card) : undefined),
    [source, card]
  );
  if (!shown) {
    return (
      <p className="px-3 py-2 text-body-sm text-muted-foreground">
        The card this one showed is gone.
      </p>
    );
  }
  return <WorkbenchPlateMapPanel card={shown} onDisplayChange={updateView} />;
}
