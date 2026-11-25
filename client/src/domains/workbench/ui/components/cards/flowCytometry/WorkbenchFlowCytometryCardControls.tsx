import { useState } from 'react';

import { Trash2 } from 'lucide-react';

import { Tooltip } from '@shared/ui';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';

import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { removalMessage, removalTitle } from '../../../../utils/cards/permanentRemoval';
import { removeFlowCytometryPanel } from '../../../../utils/flowCytometry/flowCytometryPanel';
import { CARD_HEADER_DANGER_BUTTON } from '../../board/cardHeaderStyles';

import type { FlowCytometryPanelCard } from '@odysseus/shared-schemas';

interface WorkbenchFlowCytometryCardControlsProps {
  card: FlowCytometryPanelCard;
}

export function WorkbenchFlowCytometryCardControls({
  card,
}: WorkbenchFlowCytometryCardControlsProps) {
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);
  const title = useWorkbenchStore(
    state => state.protocol.flowCytometryPanels.find(panel => panel.id === card.shows)?.title
  );
  const [isConfirming, setIsConfirming] = useState(false);
  if (title === undefined) return null;
  return (
    <>
      <Tooltip content="Remove this Flow panel">
        <button
          type="button"
          className={CARD_HEADER_DANGER_BUTTON}
          aria-label="Remove this Flow panel"
          onClick={() => setIsConfirming(true)}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </Tooltip>
      <ConfirmDialog
        isOpen={isConfirming}
        variant="danger"
        title={removalTitle('flowCytometryPanel')}
        message={removalMessage('flowCytometryPanel', title)}
        confirmText="Remove"
        onConfirm={() => {
          setIsConfirming(false);
          updateProtocol(draft => removeFlowCytometryPanel(draft, card.shows));
        }}
        onCancel={() => setIsConfirming(false)}
      />
    </>
  );
}
