import React from 'react';

import { formatResourceDisplayName } from '@odysseus/shared-schemas';
import { Edit3, Trash2 } from 'lucide-react';

import { Tooltip } from '@shared/ui';
import { BoxIcon } from '@shared/ui/components/icons';

import { AssignmentDropdown } from './AssignmentDropdown';
import { CustomLabelButton } from './CustomLabelButton';
import { OwnershipBadge } from './OwnershipBadge';
import { useStorageManagerContext } from './StorageManagerContext';

import type { BoxConfiguration, RackConfiguration } from '@domains/storage';

interface BoxRowProps {
  box: BoxConfiguration;
  rack: RackConfiguration;
  tankId: string;
  rackId: string;
}

export function BoxRow({ box, rack, tankId, rackId }: BoxRowProps) {
  const {
    users,
    currentUser,
    isOwnedByCurrentUser,
    canEditResource,
    canManageStorage,
    onAssignBox,
    onEditBoxLabel,
    onEditBox,
    onDeleteBox,
  } = useStorageManagerContext();

  // null = explicitly unassigned/common, undefined = inherit from rack
  const effectiveOwnerId =
    box.assignedUserId === null ? undefined : (box.assignedUserId ?? rack.assignedUserId);
  const isBoxOwnedByUser = isOwnedByCurrentUser(box, rack);
  const isExplicitlyCommon = box.assignedUserId === null;
  const isUnassigned = !effectiveOwnerId;

  // Left border accent with subtle tint
  const leftBorderClass = isBoxOwnedByUser
    ? 'border-l-ownership-user-badge'
    : isUnassigned || isExplicitlyCommon
      ? 'border-l-ownership-unassigned-badge'
      : 'border-l-ownership-other-badge';

  // Badge colors - centralized via CSS variables
  const badgeClass = isBoxOwnedByUser
    ? 'bg-ownership-user-badge text-white'
    : isUnassigned || isExplicitlyCommon
      ? 'bg-ownership-unassigned-badge text-white'
      : 'bg-ownership-other-badge text-white';

  // Show non-admin custom label button on Row 1
  const showInlineCustomLabel = !canManageStorage && canEditResource(box, rack);

  return (
    <div
      className={`flex gap-1.5 py-0.5 px-1.5 hover:bg-accent/50 transition-colors border-l-4 ${leftBorderClass}`}
    >
      {/* Left side - vertically centered between rows */}
      <div className="flex items-center self-center">
        <OwnershipBadge
          userId={effectiveOwnerId}
          size="sm"
          isOwnedByCurrentUser={isBoxOwnedByUser}
        />
      </div>

      {/* Right side - stacked rows */}
      <div className="flex flex-col flex-1 min-w-0 gap-0.5">
        {/* Row 1: Identity + optional custom label for non-admins */}
        <div className="flex items-center">
          <div className="flex items-center gap-2 flex-1 px-1 py-0.5">
            <BoxIcon className="text-secondary-foreground flex-shrink-0" size={16} />
            <span className="font-medium text-card-foreground text-xs">
              {formatResourceDisplayName(box.name, box.customLabel)}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded ml-auto ${badgeClass}`}>
              {box.gridConfig.rows}×{box.gridConfig.cols}
            </span>
          </div>

          {/* Custom label button for non-admin owners (fixed width) */}
          {!canManageStorage && (
            <div className="w-7 flex-shrink-0 flex justify-center">
              {showInlineCustomLabel && (
                <CustomLabelButton
                  onClick={() => onEditBoxLabel(tankId, rackId, box.id, box.customLabel ?? '')}
                  size={12}
                  className="text-secondary-foreground hover:bg-black/10 transition-colors p-1 rounded focus-ring-default"
                />
              )}
            </div>
          )}
        </div>

        {/* Row 2: Admin actions only */}
        {canManageStorage && (
          <div className="flex items-center gap-1 pl-1">
            {/* Assignment Dropdown (admin only) */}
            {currentUser?.role === 'admin' && (
              <AssignmentDropdown
                value={box.assignedUserId}
                users={users}
                onChange={userId => onAssignBox(tankId, rackId, box.id, userId)}
                size="sm"
                showCommonOption
                parentUserId={rack.assignedUserId}
              />
            )}

            {/* Custom Label + Edit/Delete buttons - right aligned */}
            <div className="flex items-center gap-1 ml-auto">
              {/* Custom Label Button (for admin owners) */}
              {canEditResource(box, rack) && (
                <CustomLabelButton
                  onClick={() => onEditBoxLabel(tankId, rackId, box.id, box.customLabel ?? '')}
                  size={12}
                  className="text-secondary-foreground hover:bg-black/10 transition-colors p-1 rounded focus-ring-default"
                />
              )}
              <Tooltip content="Change grid size" side="bottom">
                <button
                  onClick={() => onEditBox(tankId, rackId, box)}
                  className="text-secondary-foreground hover:bg-black/10 transition-colors p-1 rounded focus-ring-default"
                >
                  <Edit3 size={12} />
                </button>
              </Tooltip>
              {rack.boxes.length > 1 && (
                <Tooltip content="Remove box" side="bottom">
                  <button
                    onClick={() => onDeleteBox(tankId, rackId, box.id)}
                    className="text-red-700 hover:bg-red-500/20 transition-colors p-1 rounded focus-ring-default"
                  >
                    <Trash2 size={12} />
                  </button>
                </Tooltip>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
