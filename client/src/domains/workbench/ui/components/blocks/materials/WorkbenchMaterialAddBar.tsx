import { Plus } from 'lucide-react';

import { Button, Input } from '@shared/ui';

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

  const hasText = !!adding.text.trim();

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') adding.clear();
    if (event.key !== 'Enter' || !hasText) return;
    event.preventDefault();
    adding.submit();
  };

  return (
    <div className="mb-6">
      <div className="flex max-w-[38.75rem] items-center gap-2">
        <div className="min-w-0 flex-1">
          <Input
            ref={adding.inputRef}
            size="md"
            fullWidth
            value={adding.text}
            placeholder="e.g. RPMI 1640, or paste a list"
            aria-label="Add a material"
            spellCheck={false}
            autoComplete="off"
            inputClassName="placeholder:italic"
            onValueChange={adding.changeText}
            onKeyDown={handleKeyDown}
            onPaste={event => {
              if (adding.pasteText(event.clipboardData.getData('text'))) event.preventDefault();
            }}
          />
        </div>
        <Button
          variant="primary"
          size="md"
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={!hasText}
          onClick={adding.submit}
        >
          Add Material
        </Button>
      </div>
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
