import { useShowBlock } from '../../../../hooks/useShowBlock';
import { useUpdateBlock } from '../../../../hooks/useUpdateBlock';
import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { linkedPlateMapsOf } from '../../../../utils/blocks/plateViews';

import { WorkbenchPlateMapSideSwitch } from './WorkbenchPlateMapSideSwitch';
import { WorkbenchPlatePlaceChip } from './WorkbenchPlatePlaceChip';

import type { PlateMapBlock } from '@odysseus/shared-schemas';

interface WorkbenchPlateMapCardControlsProps {
  block: PlateMapBlock;
}

export function WorkbenchPlateMapCardControls({ block }: WorkbenchPlateMapCardControlsProps) {
  const updateBlock = useUpdateBlock(block);
  const showBlock = useShowBlock();
  const firstViewId = useWorkbenchStore(
    state => linkedPlateMapsOf(state.protocol.blocks, block.id)[0]?.id
  );
  const viewCount = useWorkbenchStore(
    state => linkedPlateMapsOf(state.protocol.blocks, block.id).length
  );
  const viewPlace = useWorkbenchStore(state => {
    const [view] = linkedPlateMapsOf(state.protocol.blocks, block.id);
    if (!view) return undefined;
    if (view.page === block.page) return 'this page';
    return state.protocol.pages.find(page => page.id === view.page)?.name;
  });
  return (
    <>
      {firstViewId && viewPlace && (
        <WorkbenchPlatePlaceChip
          label={`also on ${viewPlace}${viewCount > 1 ? ` +${viewCount - 1}` : ''}`}
          onShow={() => showBlock(firstViewId)}
        />
      )}
      {
        <WorkbenchPlateMapSideSwitch
          side={block.side}
          onShow={side =>
            updateBlock(draft => {
              draft.side = side;
            })
          }
        />
      }
    </>
  );
}
