import { useMemo } from 'react';

import { formatResourceDisplayName } from '@odysseus/shared-schemas';
import { Edit3, Lock, Tag, Trash2 } from 'lucide-react';

import { OverflowMenu, Tooltip, type OverflowMenuItem } from '@shared/ui';
import { BoxIcon } from '@shared/ui/components/icons';

import { useStorageManagerContext } from '../../StorageManagerContext';
import { AssignmentBadge } from '../by-user/AssignmentBadge';
import { AssignmentDropdown } from '../by-user/AssignmentDropdown';

import { CustomLabelButton } from './CustomLabelButton';
import '../../../storage-navigator/storage-navigator.css';

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
    isResourceLocked,
    onAssignBox,
    onEditBoxLabel,
    onEditBox,
    onDeleteBox,
  } = useStorageManagerContext();

  // null = explicitly unassigned/common, undefined = inherit from rack
  const effectiveOwnerId =
    box.assignedUserId === null ? undefined : (box.assignedUserId ?? rack.assignedUserId);
  const isBoxOwnedByUser = isOwnedByCurrentUser(box, rack);
  const locked = isResourceLocked(box);

  // Show non-admin custom label button inline (not in overflow menu)
  const showInlineCustomLabel = !canManageStorage && canEditResource(box, rack);

  // Can delete box if there's more than one box in the rack
  const canDeleteBox = rack.boxes.length > 1;

  // Build overflow menu items for admin
  const overflowMenuItems = useMemo((): OverflowMenuItem[] => {
    if (!canManageStorage || locked) return [];

    const items: OverflowMenuItem[] = [];

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
    locked,
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
    <div data-level="box" data-id={box.id}>
      {/* Box Row - Navigator styled button with inline controls */}
      <div className="storage-nav-item--modal storage-nav-item--box">
        <button
          type="button"
          className="storage-nav-button storage-nav-button--box"
          aria-label={`Box ${box.name}`}
        >
          <AssignmentBadge
            userId={effectiveOwnerId}
            size="sm"
            isOwnedByCurrentUser={isBoxOwnedByUser}
          />
          <div className="storage-nav-button__icon">
            <BoxIcon size={14} aria-hidden="true" />
          </div>
          <span className="storage-nav-button__text">
            {formatResourceDisplayName(box.name, box.customLabel)}
          </span>
          <span className="storage-nav-pill storage-nav-pill--muted">
            {box.gridConfig.rows}×{box.gridConfig.cols}
          </span>
        </button>

        {/* Admin: Assignment dropdown + Overflow menu */}
        {canManageStorage && !locked && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {(currentUser?.role === 'lab_admin' || currentUser?.role === 'system_admin') && (
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
        {locked && (
          <div className="flex items-center px-1.5">
            <Tooltip content="Protected — part of demo setup" side="left">
              <Lock size={12} className="text-muted-foreground" />
            </Tooltip>
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
    </div>
  );
}
