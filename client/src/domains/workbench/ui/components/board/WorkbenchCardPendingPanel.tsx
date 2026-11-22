import { CARD_TYPES } from '../../../utils/cards/cardTypes';

import type { ProtocolCard } from '@odysseus/shared-schemas';

interface WorkbenchCardPendingPanelProps {
  card: ProtocolCard;
}

export function WorkbenchCardPendingPanel({ card }: WorkbenchCardPendingPanelProps) {
  return (
    <p className="px-4 py-3 text-body-sm text-muted-foreground">
      {CARD_TYPES[card.type].label} cards are kept safely in this file but cannot be edited in the
      app yet.
    </p>
  );
}
