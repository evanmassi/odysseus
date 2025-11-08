import { useEffect, useRef, useState } from 'react';

import { Plus, Edit, Trash2, Copy, Scissors, ClipboardPaste, X } from 'lucide-react';

import { NOTIFICATION_COLORS } from '@shared/utils/notifications';

interface ContextMenuProps {
  isVisible: boolean;
  position: { x: number; y: number };
  selectedCount: number;
  hasFilledSelection: boolean;
  isMixedSelection: boolean;
  clipboardCount: number;
  onClose: () => void;
  onOpen: () => void; // Unified modal opener
  onDelete: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  canPaste?: boolean;
}

export function ContextMenu({
  isVisible,
  position,
  selectedCount,
  hasFilledSelection,
  isMixedSelection,
  clipboardCount,
  onClose,
  onOpen,
  onDelete,
  onCopy,
  onCut,
  onPaste,
  canPaste = false,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Calculate position once to keep menu in viewport
  const adjustedPosition = (() => {
    // Use fixed size estimation to avoid recalculation
    const estimatedWidth = 200;
    const estimatedHeight = 300;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let { x, y } = position;

    // Adjust horizontal position
    if (x + estimatedWidth > viewportWidth) {
      x = Math.max(10, viewportWidth - estimatedWidth - 10);
    }

    // Adjust vertical position  
    if (y + estimatedHeight > viewportHeight) {
      y = Math.max(10, viewportHeight - estimatedHeight - 10);
    }

    return { x, y };
  })();

  // Handle click outside to close
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

  // Helper: Generate dynamic action labels
  const getLabel = (action: string, count: number): string => {
    if (count === 0) return action;
    if (count === 1) return `${action} Tube`;
    return `${action} ${count} Tubes`;
  };

  // Unified action label based on selection type
  const getOpenLabel = () => {
    if (isMixedSelection) {
      return selectedCount === 1 ? 'Add Tube' : `Add ${selectedCount} Tubes`;
    } else if (hasFilledSelection) {
      return selectedCount === 1 ? 'Edit Tube' : `Edit ${selectedCount} Tubes`;
    } else {
      return selectedCount === 1 ? 'Add Tube' : `Add ${selectedCount} Tubes`;
    }
  };

  const getOpenIcon = () => {
    return hasFilledSelection && !isMixedSelection ? Edit : Plus;
  };

  // Smart action list - only show relevant actions
  const actions = [
    // Unified Open action - always show when positions selected (Edit/Add)
    ...(selectedCount > 0 ? [{
      icon: getOpenIcon(),
      label: getOpenLabel(),
      shortcut: 'Enter',
      onClick: onOpen,
      variant: 'edit' as const, // Minty Frost - matches update/edit/add operations
      disabled: false,
    }] : []),

    // Delete, Copy, Cut - only for tubes that exist
    ...(hasFilledSelection ? [
      {
        icon: Trash2,
        label: getLabel('Delete', selectedCount),
        shortcut: 'Del',
        onClick: onDelete,
        variant: 'danger' as const,
        disabled: false,
      },
      {
        icon: Copy,
        label: getLabel('Copy', selectedCount),
        shortcut: 'Ctrl+C',
        onClick: () => {
          onCopy();
          onClose(); // Close menu after copy
        },
        variant: 'copy' as const, // Icy Blue - matches copy operation
        disabled: false,
      },
      {
        icon: Scissors,
        label: getLabel('Cut', selectedCount),
        shortcut: 'Ctrl+X',
        onClick: () => {
          onCut();
          onClose(); // Close menu after cut
        },
        variant: 'cut' as const, // Light Amber - matches cut/move operations
        disabled: false,
      },
    ] : []),

    // Paste - show when clipboard has data and positions are selected
    ...(canPaste && selectedCount > 0 ? [{
      icon: ClipboardPaste,
      label: getLabel('Paste', clipboardCount),
      shortcut: 'Ctrl+V',
      onClick: () => {
        onPaste();
        onClose(); // Close menu after paste
      },
      variant: 'copy' as const, // Icy Blue - matches copy/paste operations
      disabled: false,
    }] : []),
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-odysseus-surface rounded-xl shadow-2xl border border-odysseus-border p-2 min-w-48 animate-in slide-in-from-top-2 duration-200"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-odysseus-border">
        <span className="text-sm font-bold text-odysseus-dark">
          {selectedCount} {selectedCount === 1 ? 'Tube' : 'Tubes'} Selected
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-odysseus-surface-hover text-odysseus-muted hover:text-odysseus-dark transition-all duration-200"
        >
          <X size={14} />
        </button>
      </div>

      {/* Actions */}
      <div className="p-2 space-y-2">
        {actions.map(({ icon: Icon, label, shortcut, onClick, variant, disabled = false }) => {
          const baseClasses = "w-full flex items-center justify-between py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

          const variantClasses = {
            edit: "bg-edit-bg text-white hover:bg-edit-hover",
            copy: "bg-copy-bg text-white hover:bg-copy-hover",
            cut: "bg-cut-bg text-white hover:bg-cut-hover",
            danger: "bg-danger-bg text-white hover:bg-danger-hover",
          };

          return (
            <button
              key={label}
              onClick={onClick}
              disabled={disabled}
              className={`${baseClasses} ${variantClasses[variant]}`}
            >
              <div className="flex items-center space-x-3 flex-1">
                <Icon size={16} />
                <span>{label}</span>
              </div>
              {shortcut && (
                <span className="text-xs text-white/80 font-mono bg-black/20 px-2 py-1 rounded ml-4">
                  {shortcut.toLowerCase()}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
