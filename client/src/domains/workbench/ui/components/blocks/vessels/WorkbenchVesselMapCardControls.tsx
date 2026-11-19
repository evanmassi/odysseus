import { useShowBlock } from '../../../../hooks/useShowBlock';
import { useUpdateBlock } from '../../../../hooks/useUpdateBlock';
import { useWorkbenchStore } from '../../../../stores/workbenchStore';
import { viewsOf } from '../../../../utils/blocks/plateViews';
import { activeTabOf } from '../../../../utils/vessels/vesselTabs';

import { WorkbenchPlatePlaceChip } from './WorkbenchPlatePlaceChip';
import { WorkbenchVesselSideSwitch } from './WorkbenchVesselSideSwitch';

import type { VesselMapBlock } from '@odysseus/shared-schemas';

interface WorkbenchVesselMapCardControlsProps {
  block: VesselMapBlock;
}

export function WorkbenchVesselMapCardControls({ block }: WorkbenchVesselMapCardControlsProps) {
  const updateBlock = useUpdateBlock(block);
  const showBlock = useShowBlock();
  const firstViewId = useWorkbenchStore(state => viewsOf(state.protocol.blocks, block.id)[0]?.id);
  const viewCount = useWorkbenchStore(state => viewsOf(state.protocol.blocks, block.id).length);
  const viewPlace = useWorkbenchStore(state => {
    const [view] = viewsOf(state.protocol.blocks, block.id);
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
      {activeTabOf(block).kind === 'plate' && (
        <WorkbenchVesselSideSwitch
          side={block.side}
          onShow={side =>
            updateBlock(draft => {
              draft.side = side;
            })
          }
        />
      )}
    </>
  );
}
