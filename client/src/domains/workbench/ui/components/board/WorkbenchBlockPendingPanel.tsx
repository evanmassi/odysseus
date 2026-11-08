import { BLOCK_TYPES } from '../../../utils/blocks/blockTypes';

import type { ProtocolBlock } from '@odysseus/shared-schemas';

interface WorkbenchBlockPendingPanelProps {
  block: ProtocolBlock;
}

export function WorkbenchBlockPendingPanel({ block }: WorkbenchBlockPendingPanelProps) {
  return (
    <p className="px-4 py-3 text-body-sm text-muted-foreground">
      {BLOCK_TYPES[block.type].label} blocks are kept safely in this file but cannot be edited in
      the app yet.
    </p>
  );
}
