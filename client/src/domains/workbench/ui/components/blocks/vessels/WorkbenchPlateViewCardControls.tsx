import { useShowBlock } from '../../../../hooks/useShowBlock';
import { useUpdateBlock } from '../../../../hooks/useUpdateBlock';
import { useWorkbenchStore } from '../../../../stores/workbenchStore';

import { WorkbenchPlatePlaceChip } from './WorkbenchPlatePlaceChip';
import { WorkbenchVesselSideSwitch } from './WorkbenchVesselSideSwitch';

import type { PlateViewBlock } from '@odysseus/shared-schemas';

interface WorkbenchPlateViewCardControlsProps {
  block: PlateViewBlock;
}

export function WorkbenchPlateViewCardControls({ block }: WorkbenchPlateViewCardControlsProps) {
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
        <WorkbenchVesselSideSwitch
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
