/**
 * Context Menu
 *
 * Right-click menu for grid cell operations with keyboard shortcut hints.
 * Implements WAI-ARIA Menu pattern for full keyboard accessibility.
 */
import { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react';

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
  Printer,
  type LucideIcon,
} from 'lucide-react';

import { useMenuKeyboardNavigation } from '@shared/hooks/keyboard';

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
  canPrintLabel?: boolean;
  onPrintLabel?: () => void;
}

const ANIMATION_DURATION = 50;
const VIEWPORT_PADDING = 8;

function MenuDivider() {
  return <div className="h-px bg-border my-1" />;
}

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
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!disabled) {
        onClick();
      }
    }
  };

  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className={`
        w-full flex items-center justify-between py-2 px-3 rounded-md text-sm
        transition-colors duration-150
        disabled:opacity-40 disabled:cursor-not-allowed
        ${danger ? 'text-secondary-foreground hover:bg-danger-light hover:text-danger-text dark:hover:text-danger-text-hover' : 'text-secondary-foreground hover:bg-accent'}
      `}
    >
      <div className="flex items-center gap-3">
        <Icon
          size={16}
          className={
            danger ? 'text-muted-foreground group-hover:text-danger-text' : 'text-muted-foreground'
          }
        />
        <span>{label}</span>
      </div>
      {shortcut && <span className="text-xs text-muted-foreground font-mono ml-4">{shortcut}</span>}
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
  canPrintLabel = false,
  onPrintLabel,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);
  const [adjustedPosition, setAdjustedPosition] = useState({ x: 0, y: 0 });
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPositionRef = useRef<{ x: number; y: number } | null>(null);

  // Adjust position to keep menu in viewport (after measuring actual size)
  useLayoutEffect(() => {
    if (!isVisible || !menuRef.current) {
      return;
    }

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = position.x;
    let y = position.y;

    // Flip horizontally if would overflow right
    if (x + rect.width > viewportWidth - VIEWPORT_PADDING) {
      x = Math.max(VIEWPORT_PADDING, x - rect.width);
    }

    // Flip vertically if would overflow bottom
    if (y + rect.height > viewportHeight - VIEWPORT_PADDING) {
      y = Math.max(VIEWPORT_PADDING, y - rect.height);
    }

    // Ensure doesn't go off left/top
    x = Math.max(VIEWPORT_PADDING, x);
    y = Math.max(VIEWPORT_PADDING, y);

    setAdjustedPosition({ x, y });
  }, [isVisible, position.x, position.y]);

  // Handle visibility and animation
  useEffect(() => {
    if (isVisible) {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }

      // Small delay to allow position adjustment before animating
      requestAnimationFrame(() => {
        setIsAnimatingIn(true);
      });
    } else {
      setIsAnimatingIn(false);
    }
  }, [isVisible]);

  // Handle position changes while menu is open (right-click on different tube)
  // Using useLayoutEffect to prevent visual flicker when cancelling close animation
  useLayoutEffect(() => {
    if (!isVisible) {
      prevPositionRef.current = null;
      return;
    }

    const positionChanged =
      prevPositionRef.current &&
      (prevPositionRef.current.x !== position.x || prevPositionRef.current.y !== position.y);

    if (positionChanged) {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      setIsAnimatingIn(true);
    }

    prevPositionRef.current = { x: position.x, y: position.y };
  }, [isVisible, position.x, position.y]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  const closeMenu = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    onClose();
  }, [onClose]);

  const { handleKeyDown, handleBlur } = useMenuKeyboardNavigation({
    menuRef,
    isOpen: isVisible,
    onClose: closeMenu,
  });

  // Handle click outside
  useEffect(() => {
    if (!isVisible) return;

    const handleClickOutside = (e: MouseEvent) => {
      // Ignore right-clicks - they update position via contextmenu event
      // This prevents the close animation from starting before position updates
      if (e.button === 2) return;

      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isVisible, closeMenu]);

  // Don't render if not visible
  if (!isVisible) return null;

  const isEditMode = hasFilledSelection && !isMixedSelection;
  const openLabel = isEditMode ? 'Edit' : 'Add';
  const OpenIcon = isEditMode ? Edit : Plus;
  const hasClipboardSection = hasFilledSelection || (canPaste && selectedCount > 0);

  /* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
  const hasLockSection =
    (lockableCount > 0 && onLock) ||
    (unlockableCount > 0 && onUnlock) ||
    (sharableCount > 0 && onShare);
  /* eslint-enable @typescript-eslint/prefer-nullish-coalescing */

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-popover rounded-lg shadow-lg border border-border py-1.5 min-w-52"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
        transform: isAnimatingIn ? 'scale(1)' : 'scale(0.95)',
        opacity: isAnimatingIn ? 1 : 0,
        transition: `transform ${ANIMATION_DURATION}ms ease-out, opacity ${ANIMATION_DURATION}ms ease-out`,
      }}
      role="menu"
      aria-label="Context menu"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
    >
      {selectedCount > 0 && (
        <>
          <div className="px-1">
            <MenuItem icon={OpenIcon} label={openLabel} shortcut="Enter" onClick={onOpen} />
          </div>
          {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing */}
          {(hasClipboardSection || hasLockSection || hasFilledSelection) && <MenuDivider />}
        </>
      )}

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
                    closeMenu();
                  }}
                />
                <MenuItem
                  icon={Scissors}
                  label="Cut"
                  shortcut="Ctrl+X"
                  onClick={() => {
                    onCut();
                    closeMenu();
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
                  closeMenu();
                }}
              />
            )}
          </div>
          {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing */}
          {(hasLockSection || hasFilledSelection) && <MenuDivider />}
        </>
      )}

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
                  closeMenu();
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
                    closeMenu();
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
                  closeMenu();
                }}
              />
            )}
          </div>
          {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing */}
          {(canPrintLabel || hasFilledSelection) && <MenuDivider />}
        </>
      )}

      {canPrintLabel && onPrintLabel && (
        <>
          <div className="px-1">
            <MenuItem
              icon={Printer}
              label="Print Label"
              onClick={() => {
                onPrintLabel();
                closeMenu();
              }}
            />
          </div>
          {hasFilledSelection && <MenuDivider />}
        </>
      )}

      {hasFilledSelection && (
        <div className="px-1">
          <MenuItem
            icon={Trash2}
            label="Remove"
            shortcut="Del"
            onClick={() => {
              onDelete();
              closeMenu();
            }}
            danger
          />
        </div>
      )}
    </div>
  );
}
