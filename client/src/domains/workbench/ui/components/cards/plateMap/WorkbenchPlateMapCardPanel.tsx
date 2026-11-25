import { useMemo } from 'react';

import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { shownPlateMap } from '../../../../utils/plateMap/shownPlateMap';

import { WorkbenchPlateMapPanel } from './WorkbenchPlateMapPanel';

import type { PlateMapCard } from '@odysseus/shared-schemas';

interface WorkbenchPlateMapCardPanelProps {
  card: PlateMapCard;
}

export function WorkbenchPlateMapCardPanel({ card }: WorkbenchPlateMapCardPanelProps) {
  const plateMap = useWorkbenchStore(state =>
    state.protocol.plateMaps.find(candidate => candidate.id === card.shows)
  );
  const shown = useMemo(() => plateMap && shownPlateMap(plateMap, card), [plateMap, card]);
  if (!shown) {
    return (
      <p className="px-3 py-2 text-body-sm text-muted-foreground">
        The plate map this card showed is gone.
      </p>
    );
  }
  return <WorkbenchPlateMapPanel card={card} plateMap={shown} />;
}
