import { useShowCard } from '../../../../hooks/useShowCard';
import { useUpdateCard } from '../../../../hooks/useUpdateCard';
import { useWorkbenchStore } from '../../../../stores/workbenchStore';

import { WorkbenchPlateMapSideSwitch } from './WorkbenchPlateMapSideSwitch';
import { WorkbenchPlatePlaceChip } from './WorkbenchPlatePlaceChip';

import type { LinkedPlateMapCard } from '@odysseus/shared-schemas';

interface WorkbenchLinkedPlateMapCardControlsProps {
  card: LinkedPlateMapCard;
}

export function WorkbenchLinkedPlateMapCardControls({
  card,
}: WorkbenchLinkedPlateMapCardControlsProps) {
  const updateView = useUpdateCard(card);
  const showCard = useShowCard();
  const source = useWorkbenchStore(state =>
    state.protocol.cards.find(candidate => candidate.id === card.shows)
  );
  const sourcePlace = useWorkbenchStore(state => {
    if (!source) return undefined;
    if (source.page === card.page) return 'this page';
    return state.protocol.pages.find(page => page.id === source.page)?.name;
  });
  if (source?.type !== 'plateMap') return null;
  return (
    <>
      {sourcePlace && (
        <WorkbenchPlatePlaceChip label={`from ${sourcePlace}`} onShow={() => showCard(source.id)} />
      )}
      {
        <WorkbenchPlateMapSideSwitch
          side={card.side}
          onShow={side =>
            updateView(draft => {
              draft.side = side;
            })
          }
        />
      }
    </>
  );
}
