/**
 * Context Menu Component
 *
 * Windows 11-style context menu with clean, minimal design.
 * Gray icons, subtle hover states, keyboard shortcuts on the right.
 */

import { useEffect, useRef } from 'react';

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
  type LucideIcon,
} from 'lucide-react';

interface ContextMenuProps {
  isVisible: boolean;
  position: { x: number; y: number };
  selectedCount: number;
  hasFilledSelection: boolean;
  isMixedSelection: boolean;
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

/** Divider component for separating menu sections */
function MenuDivider() {
  return <div className="h-px bg-gray-200 my-1" />;
}

/** Menu item component */
function MenuItem({
  icon: Icon,
  label,
  shortcut,
  onClick,
  disabled = false,
  danger = false,
}: {
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full flex items-center justify-between py-2 px-3 rounded-md text-sm
        transition-colors duration-150
        disabled:opacity-40 disabled:cursor-not-allowed
        ${danger ? 'text-gray-700 hover:bg-red-50 hover:text-red-600' : 'text-gray-700 hover:bg-gray-100'}
      `}
    >
      <div className="flex items-center gap-3">
        <Icon
          size={16}
          className={danger ? 'text-gray-400 group-hover:text-red-500' : 'text-gray-400'}
        />
        <span>{label}</span>
      </div>
      {shortcut && <span className="text-xs text-gray-400 font-mono ml-4">{shortcut}</span>}
    </button>
  );
}

export function ContextMenu({
  isVisible,
  position,
  selectedCount,
  hasFilledSelection,
  isMixedSelection,
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
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Calculate position to keep menu in viewport
  const adjustedPosition = (() => {
    const estimatedWidth = 220;
    const estimatedHeight = 320;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let { x, y } = position;

    if (x + estimatedWidth > viewportWidth) {
      x = Math.max(10, viewportWidth - estimatedWidth - 10);
    }

    if (y + estimatedHeight > viewportHeight) {
      y = Math.max(10, viewportHeight - estimatedHeight - 10);
    }

    return { x, y };
  })();

  // Handle click outside and escape to close
  useEffect(() => {
    if (!isVisible) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  // Determine Add/Edit label and icon
  const isEditMode = hasFilledSelection && !isMixedSelection;
  const openLabel = isEditMode ? 'Edit' : 'Add';
  const OpenIcon = isEditMode ? Edit : Plus;

  // Check which sections have content
  const hasClipboardSection = hasFilledSelection || (canPaste && selectedCount > 0);
  // Boolean OR logic for checking if any lock action is available
  /* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
  const hasLockSection =
    (lockableCount > 0 && onLock) ||
    (unlockableCount > 0 && onUnlock) ||
    (sharableCount > 0 && onShare);
  /* eslint-enable @typescript-eslint/prefer-nullish-coalescing */

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1.5 min-w-52"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      {/* Section 1: Add/Edit */}
      {selectedCount > 0 && (
        <>
          <div className="px-1">
            <MenuItem icon={OpenIcon} label={openLabel} shortcut="Enter" onClick={onOpen} />
          </div>
          {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean OR logic for divider visibility */}
          {(hasClipboardSection || hasLockSection || hasFilledSelection) && <MenuDivider />}
        </>
      )}

      {/* Section 2: Copy, Cut, Paste */}
      {hasClipboardSection && (
        <>
          <div className="px-1">
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
          {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean OR logic for divider visibility */}
          {(hasLockSection || hasFilledSelection) && <MenuDivider />}
        </>
      )}

      {/* Section 3: Lock, Unlock, Share */}
      {hasLockSection && (
        <>
          <div className="px-1">
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
          {hasFilledSelection && <MenuDivider />}
        </>
      )}

      {/* Section 4: Remove (at bottom) */}
      {hasFilledSelection && (
        <div className="px-1">
          <MenuItem icon={Trash2} label="Remove" shortcut="Del" onClick={onDelete} danger />
        </div>
      )}
    </div>
  );
}
