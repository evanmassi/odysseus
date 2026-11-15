import { WorkbenchAddBar } from '../../board/WorkbenchAddBar';

import { WorkbenchMaterialGuessPreview } from './WorkbenchMaterialGuessPreview';
import { WorkbenchMaterialPastePanel } from './WorkbenchMaterialPastePanel';

import type { MaterialAdding } from './useMaterialAdding';
import type { MaterialItem } from '@odysseus/shared-schemas';

export type NewGroupTarget = { place: 'guess' } | { place: 'paste'; index: number };

interface WorkbenchMaterialAddBarProps {
  adding: MaterialAdding;
  items: readonly MaterialItem[];
  customGroups: readonly string[];
  onNewGroup: (target: NewGroupTarget) => void;
}

export function WorkbenchMaterialAddBar({
  adding,
  items,
  customGroups,
  onNewGroup,
}: WorkbenchMaterialAddBarProps) {
  const pendingDuplicate = items.find(item => item.id === adding.pendingDuplicate?.duplicateId);

  return (
    <div className="mb-6">
      <WorkbenchAddBar
        value={adding.text}
        placeholder="e.g. RPMI 1640, or paste a list"
        itemLabel="Material"
        inputRef={adding.inputRef}
        onValueChange={adding.changeText}
        onSubmit={adding.submit}
        onEscape={adding.clear}
        onPaste={event => {
          if (adding.pasteText(event.clipboardData.getData('text'))) event.preventDefault();
        }}
      />
      <WorkbenchMaterialGuessPreview
        typed={adding.text}
        preview={adding.preview}
        pendingDuplicate={pendingDuplicate}
        customGroups={customGroups}
        onChooseKind={adding.chooseKind}
        onNewGroup={() => onNewGroup({ place: 'guess' })}
        onResolveDuplicate={adding.resolveDuplicate}
      />
      {adding.paste && (
        <WorkbenchMaterialPastePanel
          paste={adding.paste}
          customGroups={customGroups}
          onChooseKind={adding.setPasteRowKind}
          onNewGroup={index => onNewGroup({ place: 'paste', index })}
          onToggleKeep={adding.togglePasteKeep}
          onDropRow={adding.dropPasteRow}
          onAdd={adding.addPasted}
          onCancel={adding.cancelPaste}
        />
      )}
    </div>
  );
}
