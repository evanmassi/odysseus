import { useShowCard } from '../../../../hooks/useShowCard';
import { useUpdateCard } from '../../../../hooks/useUpdateCard';
import { useWorkbenchData } from '../../../../hooks/useWorkbenchSlice';
import { cardsShowing } from '../../../../utils/cards/createCard';

import { WorkbenchPlateMapSideSwitch } from './WorkbenchPlateMapSideSwitch';
import { WorkbenchPlatePlaceChip } from './WorkbenchPlatePlaceChip';

import type { PlateMapCard } from '@odysseus/shared-schemas';

interface WorkbenchPlateMapCardControlsProps {
  card: PlateMapCard;
}

export function WorkbenchPlateMapCardControls({ card }: WorkbenchPlateMapCardControlsProps) {
  const updateCard = useUpdateCard(card);
  const showCard = useShowCard();
  const others = useWorkbenchData(state =>
    cardsShowing(state.protocol.cards, card.shows)
      .filter(other => other.id !== card.id)
      .map(other => ({
        id: other.id,
        place:
          other.page === card.page
            ? 'this page'
            : (state.protocol.pages.find(page => page.id === other.page)?.name ?? 'another page'),
      }))
  );
  const [first] = others;
  return (
    <>
      {first && (
        <WorkbenchPlatePlaceChip
          label={`also on ${first.place}${others.length > 1 ? ` +${others.length - 1}` : ''}`}
          onShow={() => showCard(first.id)}
        />
      )}
      <WorkbenchPlateMapSideSwitch
        side={card.side}
        onShow={side =>
          updateCard(draft => {
            draft.side = side;
          })
        }
      />
    </>
  );
}
