import {
  ClipboardPaste,
  Copy,
  Group,
  Merge,
  Pencil,
  Scissors,
  Trash2,
  Ungroup,
} from 'lucide-react';

import { ContextMenu, MenuDivider, MenuItem } from '@shared/ui';

export interface StainPooling {
  poolCount: number;
  onPoolSamples: (() => void) | undefined;
  onPoolReplicates: (() => void) | undefined;
  onUnpool: (() => void) | undefined;
}

interface WorkbenchPlateContextMenuProps {
  menuPosition: { x: number; y: number } | undefined;
  hasFilledSelection: boolean;
  canPaste: boolean;
  pooling: StainPooling | undefined;
  onClose: () => void;
  onEdit: (() => void) | undefined;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onClear: () => void;
}

export function WorkbenchPlateContextMenu({
  menuPosition,
  hasFilledSelection,
  canPaste,
  pooling,
  onClose,
  onEdit,
  onCopy,
  onCut,
  onPaste,
  onClear,
}: WorkbenchPlateContextMenuProps) {
  const run = (action: () => void) => () => {
    action();
    onClose();
  };
  const hasClipboardSection = hasFilledSelection || canPaste;
  const hasPooling =
    !!pooling && !!(pooling.onPoolSamples ?? pooling.onPoolReplicates ?? pooling.onUnpool);

  return (
    <ContextMenu
      isOpen={!!menuPosition}
      position={menuPosition ?? { x: 0, y: 0 }}
      onClose={onClose}
    >
      {onEdit && <MenuItem icon={Pencil} label="Edit" shortcut="Enter" onClick={run(onEdit)} />}
      {pooling && hasPooling && (
        <>
          {pooling.onPoolSamples && (
            <MenuItem
              icon={Merge}
              label={`Pool ${pooling.poolCount} samples`}
              onClick={run(pooling.onPoolSamples)}
            />
          )}
          {pooling.onPoolReplicates && (
            <MenuItem
              icon={Group}
              label="Pool replicates"
              onClick={run(pooling.onPoolReplicates)}
            />
          )}
          {pooling.onUnpool && (
            <MenuItem icon={Ungroup} label="Unpool" onClick={run(pooling.onUnpool)} />
          )}
        </>
      )}
      {hasClipboardSection && (
        <>
          {(onEdit !== undefined || hasPooling) && <MenuDivider subtle />}
          {hasFilledSelection && (
            <>
              <MenuItem icon={Copy} label="Copy" shortcut="Ctrl+C" onClick={run(onCopy)} />
              <MenuItem icon={Scissors} label="Cut" shortcut="Ctrl+X" onClick={run(onCut)} />
            </>
          )}
          {canPaste && (
            <MenuItem
              icon={ClipboardPaste}
              label="Paste"
              shortcut="Ctrl+V"
              onClick={run(onPaste)}
            />
          )}
        </>
      )}
      {hasFilledSelection && (
        <>
          <MenuDivider subtle />
          <MenuItem icon={Trash2} label="Clear" shortcut="Del" danger onClick={run(onClear)} />
        </>
      )}
    </ContextMenu>
  );
}
