import { useShowBlock } from '../../../../hooks/useShowBlock';
import { useUpdateBlock } from '../../../../hooks/useUpdateBlock';
import { useWorkbenchStore } from '../../../../stores/workbenchStore';

import { WorkbenchPlateMapSideSwitch } from './WorkbenchPlateMapSideSwitch';
import { WorkbenchPlatePlaceChip } from './WorkbenchPlatePlaceChip';

import type { LinkedPlateMapBlock } from '@odysseus/shared-schemas';

interface WorkbenchLinkedPlateMapCardControlsProps {
  block: LinkedPlateMapBlock;
}

export function WorkbenchLinkedPlateMapCardControls({
  block,
}: WorkbenchLinkedPlateMapCardControlsProps) {
  const updateView = useUpdateBlock(block);
  const showBlock = useShowBlock();
  const source = useWorkbenchStore(state =>
    state.protocol.blocks.find(candidate => candidate.id === block.shows)
  );
  const sourcePlace = useWorkbenchStore(state => {
    if (!source) return undefined;
    if (source.page === block.page) return 'this page';
    return state.protocol.pages.find(page => page.id === source.page)?.name;
  });
  if (source?.type !== 'plate') return null;
  return (
    <>
      {sourcePlace && (
        <WorkbenchPlatePlaceChip
          label={`from ${sourcePlace}`}
          onShow={() => showBlock(source.id)}
        />
      )}
      {
        <WorkbenchPlateMapSideSwitch
          side={block.side}
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
