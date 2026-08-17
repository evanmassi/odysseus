/**
 * Box Row
 *
 * Leaf node in the By Location tab — an occupancy minimap with assignment and
 * edit controls.
 */

import { useMemo } from 'react';

import { formatStorageDisplayName } from '@odysseus/shared-schemas';
import { Lock, SquarePen, Tag, Trash2 } from 'lucide-react';

import { OccupancyBar, OverflowMenu, Tooltip, type OverflowMenuItem } from '@shared/ui';

import { getEffectiveOwnerId } from '../../../../../utils/effectiveOwner';
import { BoxOccupancyMatrix, boxOccupancyKey } from '../../../storage-navigator';
import { TreeNub } from '../../../storage-navigator/TreeNub';
import { useStorageManagerContext } from '../../StorageManagerContext';
import { AssignmentBadge } from '../by-user/AssignmentBadge';
import { AssignmentDropdown } from '../by-user/AssignmentDropdown';

import { CustomLabelButton } from './CustomLabelButton';
import { RowMeta } from './RowMeta';

import type { BoxConfiguration, RackConfiguration, RackTube } from '@odysseus/shared-schemas';

interface BoxRowProps {
  box: BoxConfiguration;
  rack: RackConfiguration;
  tankId: string;
  rackId: string;
  tubes: RackTube[];
}

export function BoxRow({ box, rack, tankId, rackId, tubes }: BoxRowProps) {
  const {
    users,
    currentUser,
    occupancy,
    isOwnedByCurrentUser,
    canEditResource,
    canManageStorage,
    isResourceLocked,
    onAssignBox,
    onEditBoxLabel,
    onEditBox,
    onDeleteBox,
  } = useStorageManagerContext();

  const effectiveOwnerId =
    getEffectiveOwnerId(box.assignedUserId, rack.assignedUserId) ?? undefined;
  const isBoxOwnedByUser = isOwnedByCurrentUser(box, rack);
  const locked = isResourceLocked(box);

  const boxOcc = occupancy.byBox.get(boxOccupancyKey(tankId, rackId, box.id));
  const filled = boxOcc?.filled ?? 0;
  const capacity = boxOcc?.capacity ?? 0;
  const isFull = capacity > 0 && filled >= capacity;

  // Show non-admin custom label button inline (not in overflow menu)
  const showInlineCustomLabel = !canManageStorage && canEditResource(box, rack);

  const canDeleteBox = rack.boxes.length > 1;

  const overflowMenuItems = useMemo((): OverflowMenuItem[] => {
    if (!canManageStorage || locked) return [];

    const items: OverflowMenuItem[] = [];

    if (canEditResource(box, rack)) {
      items.push({
        icon: Tag,
        label: 'Rename Box',
        onClick: () => onEditBoxLabel(tankId, rackId, box.id, box.customLabel ?? ''),
      });
    }

    items.push({
      icon: SquarePen,
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

  const dividerBefore = canDeleteBox ? ['Delete Box'] : [];

  return (
    <div data-level="box" data-id={box.id}>
      <div className="storage-nav-item--modal storage-nav-item--box">
        <div className="storage-nav-button row-glow storage-nav-button--box">
          <TreeNub full={isFull} />
          <BoxOccupancyMatrix gridConfig={box.gridConfig} tubes={tubes} size={46} />
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
            <div className="flex items-center gap-2">
              <AssignmentBadge
                userId={effectiveOwnerId}
                size="sm"
                isOwnedByCurrentUser={isBoxOwnedByUser}
              />
              <span className="min-w-0 truncate">
                {formatStorageDisplayName(box.name, box.customLabel)}
              </span>
              <RowMeta parts={[`${box.gridConfig.rows}×${box.gridConfig.cols}`]} />
              <span className="flex-1" />
              {locked ? (
                <Tooltip content="Protected — part of demo setup" side="left">
                  <Lock size={12} className="text-muted-foreground" />
                </Tooltip>
              ) : (
                <>
                  {canManageStorage && (
                    <AssignmentDropdown
                      value={box.assignedUserId}
                      users={users}
                      onChange={userId => onAssignBox(tankId, rackId, box.id, userId)}
                      currentUserId={currentUser?.id}
                      showCommonOption
                      parentUserId={rack.assignedUserId}
                    />
                  )}
                  {canManageStorage && overflowMenuItems.length > 0 && (
                    <OverflowMenu
                      items={overflowMenuItems}
                      dividerBefore={dividerBefore}
                      size="sm"
                      aria-label={`Actions for box ${box.name}`}
                    />
                  )}
                  {showInlineCustomLabel && (
                    <CustomLabelButton
                      onClick={() => onEditBoxLabel(tankId, rackId, box.id, box.customLabel ?? '')}
                      size={12}
                    />
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <OccupancyBar filled={filled} capacity={capacity} full={isFull} className="flex-1" />
              <span
                className={`flex-none font-mono text-data-sm tracking-[0.08em] ${
                  isFull ? 'text-warning-text' : 'text-foreground/40'
                }`}
              >
                {isFull ? 'FULL' : `${filled}/${capacity}`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
