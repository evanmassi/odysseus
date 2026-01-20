import React, { useMemo } from 'react';

import { formatResourceDisplayName } from '@odysseus/shared-schemas';
import { Edit3, Tag, Trash2 } from 'lucide-react';

import { getOwnershipIndicatorStyles, type OwnershipType } from '@shared/ui/components/badges';
import { BoxIcon } from '@shared/ui/components/icons';
import { OverflowMenu } from '@shared/ui/primitives/overflow-menu';

import { AssignmentDropdown } from './AssignmentDropdown';
import { CustomLabelButton } from './CustomLabelButton';
import { OwnershipBadge } from './OwnershipBadge';
import { useStorageManagerContext } from './StorageManagerContext';

import type { BoxConfiguration, RackConfiguration } from '@domains/storage';
import type { OverflowMenuItem } from '@shared/ui/primitives/overflow-menu';

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

  const ownershipType: OwnershipType = isBoxOwnedByUser
    ? 'currentUser'
    : isUnassigned || isExplicitlyCommon
      ? 'unassigned'
      : 'otherUser';
  const ownershipStyles = getOwnershipIndicatorStyles(ownershipType);

  // Show non-admin custom label button inline (not in overflow menu)
  const showInlineCustomLabel = !canManageStorage && canEditResource(box, rack);

  // Can delete box if there's more than one box in the rack
  const canDeleteBox = rack.boxes.length > 1;

  // Build overflow menu items for admin
  const overflowMenuItems = useMemo((): OverflowMenuItem[] => {
    if (!canManageStorage) return [];

    const items: OverflowMenuItem[] = [];

    // Custom label - only if user can edit this resource
    if (canEditResource(box, rack)) {
      items.push({
        icon: Tag,
        label: 'Custom Label',
        onClick: () => onEditBoxLabel(tankId, rackId, box.id, box.customLabel ?? ''),
      });
    }

    items.push({
      icon: Edit3,
      label: 'Change Grid',
      onClick: () => onEditBox(tankId, rackId, box),
    });

    if (canDeleteBox) {
      items.push({
        icon: Trash2,
        label: 'Delete Box',
        onClick: () => onDeleteBox(tankId, rackId, box.id),
        danger: true,
      });
    }

    return items;
  }, [
    canManageStorage,
    canEditResource,
    canDeleteBox,
    box,
    rack,
    tankId,
    rackId,
    onEditBoxLabel,
    onEditBox,
    onDeleteBox,
  ]);

  // Divider before Delete Box
  const dividerBefore = canDeleteBox ? ['Delete Box'] : [];

  return (
    <div
      className={`flex items-center gap-1.5 py-0.5 px-1.5 hover:bg-accent/50 transition-colors border-l-4 ${ownershipStyles.border}`}
    >
      {/* Ownership badge */}
      <OwnershipBadge userId={effectiveOwnerId} size="sm" isOwnedByCurrentUser={isBoxOwnedByUser} />

      {/* Box identity */}
      <div className="flex items-center gap-2 flex-1 min-w-0 px-1 py-0.5">
        <BoxIcon className="text-secondary-foreground flex-shrink-0" size={16} />
        <span className="font-medium text-card-foreground text-xs truncate">
          {formatResourceDisplayName(box.name, box.customLabel)}
        </span>
        <span
          className={`text-xs px-2 py-0.5 rounded ml-auto flex-shrink-0 ${ownershipStyles.background} ${ownershipStyles.text}`}
        >
          {box.gridConfig.rows}×{box.gridConfig.cols}
        </span>
      </div>

      {/* Admin: Assignment dropdown + Overflow menu */}
      {canManageStorage && (
        <div className="flex items-center gap-1 flex-shrink-0">
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
          {overflowMenuItems.length > 0 && (
            <OverflowMenu
              items={overflowMenuItems}
              dividerBefore={dividerBefore}
              size="sm"
              aria-label={`Actions for box ${box.name}`}
            />
          )}
        </div>
      )}

      {/* Non-admin owner: Custom label button */}
      {!canManageStorage && (
        <div className="w-7 flex-shrink-0 flex justify-center">
          {showInlineCustomLabel && (
            <CustomLabelButton
              onClick={() => onEditBoxLabel(tankId, rackId, box.id, box.customLabel ?? '')}
              size={12}
              className="text-secondary-foreground hover:bg-black/10 transition-colors p-1 rounded"
            />
          )}
        </div>
      )}
    </div>
  );
}
