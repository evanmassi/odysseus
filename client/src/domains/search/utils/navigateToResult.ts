/**
 * Search Result Navigation
 *
 * Navigates to a tube's storage location and selects it in the grid.
 */

import { useTubeStore } from '@domains/tubes';
import { toPositionKey } from '@domains/tubes/types/gridSelectionTypes';

import type { TubeData } from '@domains/tubes/types';

export async function navigateToResult(tubes: TubeData[]): Promise<void> {
  if (tubes.length === 0) return;

  const firstTube = tubes[0];
  const tankId = firstTube.location.tankId;
  const rackId = firstTube.location.rackId;
  const boxId = firstTube.location.boxId;

  const { navigateToLocation } = await import('@domains/tubes/utils/gridNavigation');
  await navigateToLocation({ tankId, rackId, boxId });

  const tubeStore = useTubeStore.getState();

  const positionKeys = tubes.map(tube =>
    toPositionKey(
      {
        tankId: tube.location.tankId || tankId,
        rackId: tube.location.rackId,
        boxId: tube.location.boxId,
      },
      tube.location.position
    )
  );
  tubeStore.setSelection(new Set(positionKeys));
}
