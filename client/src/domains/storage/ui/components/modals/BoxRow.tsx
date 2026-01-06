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

  // Left border accent with subtle tint (modern, less visual weight)
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

  return (
    <div
      className={`flex items-center gap-1.5 py-0.5 px-1.5 hover:bg-slate-50/50 transition-colors border-l-4 ${leftBorderClass}`}
    >
      <OwnershipBadge userId={effectiveOwnerId} size="sm" isOwnedByCurrentUser={isBoxOwnedByUser} />

      <BoxIcon className="text-slate-700 flex-shrink-0" size={16} />
      <span className="font-medium text-slate-800 text-xs inline-block min-w-[60px]">
        {formatResourceDisplayName(box.name, box.customLabel)}
      </span>
      <span className={`text-xs px-2 py-1 rounded ${badgeClass}`}>
        {box.gridConfig.rows}×{box.gridConfig.cols}
      </span>

      <div className="flex-1"></div>

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

      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Custom Label Button (for owners) */}
        {canEditResource(box, rack) && (
          <CustomLabelButton
            onClick={() => onEditBoxLabel(tankId, rackId, box.id, box.customLabel ?? '')}
            size={12}
            className="text-slate-700 hover:bg-black/10 transition-colors p-1 rounded focus-ring-default"
          />
        )}

        {/* Edit/Delete buttons (Admin Only) */}
        {canManageStorage && (
          <>
            <Tooltip content="Change grid size" side="bottom">
              <button
                onClick={() => onEditBox(tankId, rackId, box)}
                className="text-slate-700 hover:bg-black/10 transition-colors p-1 rounded focus-ring-default"
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
          </>
        )}
      </div>
    </div>
  );
}
