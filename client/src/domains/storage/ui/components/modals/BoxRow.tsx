import React from 'react';

import { formatResourceDisplayName } from '@odysseus/shared-schemas';
import { Edit3, Trash2 } from 'lucide-react';

import { BoxIcon } from '@shared/ui/components/icons';

import { AssignmentDropdown } from './AssignmentDropdown';
import { CustomLabelButton } from './CustomLabelButton';
import { OwnershipBadge } from './OwnershipBadge';
import { useStorageManagementContext } from './StorageManagementContext';

import type { BoxConfiguration, RackConfiguration } from '@domains/storage';

interface BoxRowProps {
  box: BoxConfiguration;
  rack: RackConfiguration;
  tankId: string;
  rackId: string;
  isLast: boolean;
}

export function BoxRow({ box, rack, tankId, rackId, isLast }: BoxRowProps) {
  const {
    users,
    currentUser,
    isOwnedByCurrentUser,
    canEditResource,
    onAssignBox,
    onEditBoxLabel,
    onEditBox,
    onDeleteBox,
  } = useStorageManagementContext();

  const effectiveOwnerId = box.assignedUserId ?? rack.assignedUserId;
  const isBoxOwnedByUser = isOwnedByCurrentUser(box, rack);
  const isUnassigned = !effectiveOwnerId;
  const boxBgClass = isBoxOwnedByUser
    ? 'bg-blue-50'
    : isUnassigned
      ? 'bg-yellow-50'
      : 'bg-slate-200';

  return (
    <div
      className={`flex items-center gap-1.5 py-0.5 px-1.5 ${boxBgClass} rounded border border-slate-300`}
    >
      <span className="text-slate-400 font-mono text-xs flex-shrink-0">{isLast ? '└' : '├'}</span>

      <OwnershipBadge userId={effectiveOwnerId} size="sm" isOwnedByCurrentUser={isBoxOwnedByUser} />

      <BoxIcon className="text-slate-700 flex-shrink-0" size={16} />
      <span className="font-medium text-slate-800 text-xs inline-block min-w-[60px]">
        {formatResourceDisplayName(box.name, box.customLabel)}
      </span>
      <span className="text-xs px-2 py-1 bg-slate-300 rounded text-slate-700">
        {box.gridConfig.rows}×{box.gridConfig.cols}
      </span>

      {/* Assignment Dropdown (admin only) */}
      {currentUser?.role === 'admin' && (
        <AssignmentDropdown
          value={box.assignedUserId}
          users={users}
          onChange={userId => onAssignBox(tankId, rackId, box.id, userId)}
          size="sm"
        />
      )}

      <div className="flex-1"></div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Custom Label Button */}
        {canEditResource(box, rack) && (
          <CustomLabelButton
            onClick={() => onEditBoxLabel(tankId, rackId, box.id, box.customLabel ?? '')}
            size={12}
            className="text-slate-700 hover:bg-slate-300 p-1 rounded"
          />
        )}

        <button
          onClick={() => onEditBox(tankId, rackId, box)}
          className="text-slate-700 hover:bg-slate-300 p-1 rounded"
          title="Change grid size"
        >
          <Edit3 size={12} />
        </button>
        {rack.boxes.length > 1 && (
          <button
            onClick={() => onDeleteBox(tankId, rackId, box.id)}
            className="text-red-700 hover:bg-red-200 p-1 rounded"
            title="Remove this box"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
