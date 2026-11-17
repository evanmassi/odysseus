import {
  Plus,
  Edit,
  Trash2,
  Copy,
  Scissors,
  ClipboardPaste,
  Lock,
  Unlock,
  Share2,
} from 'lucide-react';

import { ContextMenu, MenuDivider, MenuItem } from '@shared/ui';

interface TubeGridContextMenuProps {
  isVisible: boolean;
  position: { x: number; y: number };
  selectedCount: number;
  hasFilledSelection: boolean;
  isMixedSelection: boolean;
  isDeleteLocked: boolean;
  onClose: () => void;
  onOpen: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  canPaste?: boolean;
  lockableCount?: number;
  unlockableCount?: number;
  sharableCount?: number;
  onLock?: () => void;
  onUnlock?: () => void;
  onShare?: () => void;
  isUnlocking?: boolean;
}

export function TubeGridContextMenu({
  isVisible,
  position,
  selectedCount,
  hasFilledSelection,
  isMixedSelection,
  isDeleteLocked,
  onClose,
  onOpen,
  onDelete,
  onCopy,
  onCut,
  onPaste,
  canPaste = false,
  lockableCount = 0,
  unlockableCount = 0,
  sharableCount = 0,
  onLock,
  onUnlock,
  onShare,
  isUnlocking = false,
}: TubeGridContextMenuProps) {
  const isEditMode = hasFilledSelection && !isMixedSelection;
  const openLabel = isEditMode ? 'Edit' : 'Add';
  const OpenIcon = isEditMode ? Edit : Plus;
  const hasClipboardSection = hasFilledSelection || (canPaste && selectedCount > 0);

  const hasLockSection =
    (lockableCount > 0 && !!onLock) ||
    (unlockableCount > 0 && !!onUnlock) ||
    (sharableCount > 0 && !!onShare);

  return (
    <ContextMenu isOpen={isVisible} position={position} onClose={onClose}>
      {selectedCount > 0 && (
        <>
          <div>
            <MenuItem
              icon={OpenIcon}
              label={openLabel}
              shortcut="Enter"
              onClick={() => {
                onOpen();
                onClose();
              }}
            />
          </div>
          {(hasClipboardSection || hasLockSection || hasFilledSelection) && <MenuDivider subtle />}
        </>
      )}

      {hasClipboardSection && (
        <>
          <div>
            {hasFilledSelection && (
              <>
                <MenuItem
                  icon={Copy}
                  label="Copy"
                  shortcut="Ctrl+C"
                  onClick={() => {
                    onCopy();
                    onClose();
                  }}
                />
                <MenuItem
                  icon={Scissors}
                  label="Cut"
                  shortcut="Ctrl+X"
                  onClick={() => {
                    onCut();
                    onClose();
                  }}
                />
              </>
            )}
            {canPaste && selectedCount > 0 && (
              <MenuItem
                icon={ClipboardPaste}
                label="Paste"
                shortcut="Ctrl+V"
                onClick={() => {
                  onPaste();
                  onClose();
                }}
              />
            )}
          </div>
          {(hasLockSection || hasFilledSelection) && <MenuDivider subtle />}
        </>
      )}

      {hasLockSection && (
        <>
          <div>
            {lockableCount > 0 && onLock && (
              <MenuItem
                icon={Lock}
                label="Lock"
                shortcut="Shift+L"
                onClick={() => {
                  onLock();
                  onClose();
                }}
              />
            )}
            {unlockableCount > 0 && onUnlock && (
              <MenuItem
                icon={Unlock}
                label={isUnlocking ? 'Unlocking...' : 'Unlock'}
                shortcut="Shift+L"
                onClick={() => {
                  if (!isUnlocking) {
                    onUnlock();
                    onClose();
                  }
                }}
                disabled={isUnlocking}
              />
            )}
            {sharableCount > 0 && onShare && (
              <MenuItem
                icon={Share2}
                label="Share"
                shortcut="Shift+S"
                onClick={() => {
                  onShare();
                  onClose();
                }}
              />
            )}
          </div>
          {hasFilledSelection && !isDeleteLocked && <MenuDivider subtle />}
        </>
      )}

      {hasFilledSelection && !isDeleteLocked && (
        <div>
          <MenuItem
            icon={Trash2}
            label="Remove"
            shortcut="Del"
            onClick={() => {
              onDelete();
              onClose();
            }}
            danger
          />
        </div>
      )}
    </ContextMenu>
  );
}
