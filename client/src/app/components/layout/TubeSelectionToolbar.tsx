/**
 * Tube Selection Toolbar
 *
 * Contextual action bar shown in the header when grid positions are selected —
 * add/edit, copy/cut/paste, lock/unlock/share, remove, and clear.
 */

import type { ReactNode } from 'react';

import {
  Plus,
  Edit,
  Trash2,
  Copy,
  Scissors,
  ClipboardPaste,
  X,
  Lock,
  Unlock,
  Share2,
  TestTubeDiagonal,
} from 'lucide-react';

import { useGridSelectionAnalysis } from '@domains/tubes/ui/components/grid/useGridSelectionAnalysis';
import { Button, Chip, Tooltip } from '@shared/ui';

import type { TubeData } from '@domains/tubes/types';
import type { PositionKey } from '@domains/tubes/types/gridSelectionTypes';

export interface GridController {
  openModal: () => void;
  copy: () => void;
  cut: () => void;
  paste: () => void;
  delete: () => void;
  canPaste: boolean;
  selection: {
    hasFilledSelection: boolean;
    isMixed: boolean;
    lockableCount?: number;
    unlockableCount?: number;
    sharableCount?: number;
    isUnlocking?: boolean;
  };
  lock?: () => void;
  unlock?: () => Promise<void>;
  shareAccess?: () => void;
}

interface TubeSelectionToolbarProps {
  selectedPositions: Set<PositionKey>;
  tubes: TubeData[];
  gridController?: GridController;
  isViewOnlySpace?: boolean;
  onClearSelection?: () => void;
}

function ToolbarDivider() {
  return <div className="w-px h-4 bg-border mx-0.5" />;
}

interface ToolbarButtonProps {
  tooltip: string;
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  variant?: 'ghost' | 'ghost-danger';
  disabled?: boolean;
}

function ToolbarButton({
  tooltip,
  icon,
  label,
  onClick,
  variant = 'ghost',
  disabled,
}: ToolbarButtonProps) {
  return (
    <Tooltip content={tooltip} side="bottom">
      <Button variant={variant} size="xs" onClick={onClick} disabled={disabled} leftIcon={icon}>
        {label}
      </Button>
    </Tooltip>
  );
}

export function TubeSelectionToolbar({
  selectedPositions,
  tubes,
  gridController,
  isViewOnlySpace = false,
  onClearSelection,
}: TubeSelectionToolbarProps) {
  const selectionAnalysis = useGridSelectionAnalysis(selectedPositions, tubes);

  if (!selectionAnalysis.hasSelection || !gridController) {
    return null;
  }

  const { selection } = gridController;
  const isEditing = selection.hasFilledSelection && !selection.isMixed;

  return (
    <div className="flex items-center space-x-1">
      {selectedPositions.size > 1 && (
        <Chip size="sm" color="default" lead={<TestTubeDiagonal />} className="mr-2">
          {selectedPositions.size} selected
        </Chip>
      )}

      {/* View-only mode shows actions in a banner on the grid instead. */}
      {!isViewOnlySpace && (
        <>
          <ToolbarButton
            tooltip={
              selection.isMixed
                ? 'Add tubes to mixed selection (overwrite prompt will appear)'
                : selection.hasFilledSelection
                  ? 'Edit selected tube(s)'
                  : 'Add new tube(s) to selected position(s)'
            }
            icon={isEditing ? <Edit className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            label={isEditing ? 'Edit' : 'Add'}
            onClick={gridController.openModal}
          />

          {(selectionAnalysis.hasFilled || gridController.canPaste) && (
            <>
              {selectionAnalysis.hasFilled && (
                <>
                  <ToolbarButton
                    tooltip="Copy selected tube(s)"
                    icon={<Copy className="w-3 h-3" />}
                    label="Copy"
                    onClick={gridController.copy}
                  />
                  <ToolbarButton
                    tooltip="Cut selected tube(s)"
                    icon={<Scissors className="w-3 h-3" />}
                    label="Cut"
                    onClick={gridController.cut}
                  />
                </>
              )}
              {gridController.canPaste && (
                <ToolbarButton
                  tooltip="Paste tube(s)"
                  icon={<ClipboardPaste className="w-3 h-3" />}
                  label="Paste"
                  onClick={gridController.paste}
                />
              )}
            </>
          )}

          {selectionAnalysis.hasFilled &&
            ((selection.lockableCount ?? 0) > 0 ||
              (selection.unlockableCount ?? 0) > 0 ||
              (selection.sharableCount ?? 0) > 0) && (
              <>
                <ToolbarDivider />
                {(selection.lockableCount ?? 0) > 0 && gridController.lock && (
                  <ToolbarButton
                    tooltip="Lock selected tube(s)"
                    icon={<Lock className="w-3 h-3" />}
                    label="Lock"
                    onClick={gridController.lock}
                  />
                )}
                {(selection.unlockableCount ?? 0) > 0 && gridController.unlock && (
                  <ToolbarButton
                    tooltip="Unlock selected tube(s)"
                    icon={<Unlock className="w-3 h-3" />}
                    label={selection.isUnlocking ? 'Unlocking...' : 'Unlock'}
                    onClick={gridController.unlock}
                    disabled={selection.isUnlocking}
                  />
                )}
                {(selection.sharableCount ?? 0) > 0 && gridController.shareAccess && (
                  <ToolbarButton
                    tooltip="Share access to locked tube(s)"
                    icon={<Share2 className="w-3 h-3" />}
                    label="Share"
                    onClick={gridController.shareAccess}
                  />
                )}
              </>
            )}

          {selectionAnalysis.hasFilled && (
            <>
              <ToolbarDivider />
              <ToolbarButton
                tooltip="Remove selected tube(s)"
                icon={<Trash2 className="w-3 h-3" />}
                label="Remove"
                onClick={gridController.delete}
                variant="ghost-danger"
              />
            </>
          )}
        </>
      )}

      {/* Clear stays visible even in view-only mode. */}
      {!isViewOnlySpace && <ToolbarDivider />}
      <ToolbarButton
        tooltip="Clear selection"
        icon={<X className="w-3 h-3" />}
        label="Clear"
        onClick={onClearSelection}
      />
    </div>
  );
}
