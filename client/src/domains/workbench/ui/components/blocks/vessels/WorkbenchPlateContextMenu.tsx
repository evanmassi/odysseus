import { ClipboardPaste, Copy, Pencil, Scissors, Trash2 } from 'lucide-react';

import { ContextMenu, MenuDivider, MenuItem } from '@shared/ui';

interface WorkbenchPlateContextMenuProps {
  position: { x: number; y: number } | undefined;
  hasFilledSelection: boolean;
  canPaste: boolean;
  onClose: () => void;
  onEdit: (() => void) | undefined;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onClear: () => void;
}

export function WorkbenchPlateContextMenu({
  position,
  hasFilledSelection,
  canPaste,
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

  return (
    <ContextMenu isOpen={!!position} position={position ?? { x: 0, y: 0 }} onClose={onClose}>
      {onEdit && <MenuItem icon={Pencil} label="Edit" shortcut="Enter" onClick={run(onEdit)} />}
      {hasClipboardSection && (
        <>
          {onEdit && <MenuDivider subtle />}
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
