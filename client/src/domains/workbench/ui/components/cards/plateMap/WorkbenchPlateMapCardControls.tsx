import { useShowCard } from '../../../../hooks/useShowCard';
import { useUpdateCard } from '../../../../hooks/useUpdateCard';
import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { linkedPlateMapsOf } from '../../../../utils/cards/linkedPlateMaps';

import { WorkbenchPlateMapSideSwitch } from './WorkbenchPlateMapSideSwitch';
import { WorkbenchPlatePlaceChip } from './WorkbenchPlatePlaceChip';

import type { PlateMapCard } from '@odysseus/shared-schemas';

interface WorkbenchPlateMapCardControlsProps {
  card: PlateMapCard;
}

export function WorkbenchPlateMapCardControls({ card }: WorkbenchPlateMapCardControlsProps) {
  const updateCard = useUpdateCard(card);
  const showCard = useShowCard();
  const firstViewId = useWorkbenchStore(
    state => linkedPlateMapsOf(state.protocol.cards, card.id)[0]?.id
  );
  const viewCount = useWorkbenchStore(
    state => linkedPlateMapsOf(state.protocol.cards, card.id).length
  );
  const viewPlace = useWorkbenchStore(state => {
    const [view] = linkedPlateMapsOf(state.protocol.cards, card.id);
    if (!view) return undefined;
    if (view.page === card.page) return 'this page';
    return state.protocol.pages.find(page => page.id === view.page)?.name;
  });
  return (
    <>
      {firstViewId && viewPlace && (
        <WorkbenchPlatePlaceChip
          label={`also on ${viewPlace}${viewCount > 1 ? ` +${viewCount - 1}` : ''}`}
          onShow={() => showCard(firstViewId)}
        />
      )}
      {
        <WorkbenchPlateMapSideSwitch
          side={card.side}
          onShow={side =>
            updateCard(draft => {
              draft.side = side;
            })
          }
        />
      }
    </>
  );
}
