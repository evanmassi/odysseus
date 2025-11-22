import React from 'react';

import { formatResourceDisplayName } from '@odysseus/shared-schemas';
import { ChevronDown, ChevronRight, Edit3, Plus, Trash2 } from 'lucide-react';

import { RackIcon } from '@shared/ui/components/icons';

import { AssignmentDropdown } from './AssignmentDropdown';
import { BoxRow } from './BoxRow';
import { CustomLabelButton } from './CustomLabelButton';
import { OwnershipBadge } from './OwnershipBadge';
import { useStorageManagementContext } from './StorageManagementContext';

import type { RackConfiguration } from '@domains/storage';

interface RackRowProps {
  rack: RackConfiguration;
  tankId: string;
  isLast: boolean;
  collapsed: boolean;
  boxCountToAdd: number;
  onToggleCollapse: () => void;
  onBoxCountChange: (count: number) => void;
  canDeleteRack: boolean;
}

export function RackRow({
  rack,
  tankId,
  isLast,
  collapsed,
  boxCountToAdd,
  onToggleCollapse,
  onBoxCountChange,
  canDeleteRack,
}: RackRowProps) {
  const {
    users,
    currentUser,
    isOwnedByCurrentUser,
    canEditResource,
    onAssignRack,
    onEditRackLabel,
    onEditRack,
    onDeleteRack,
    onAddBox,
  } = useStorageManagementContext();

  const rackKey = `${tankId}-rack-${rack.id}`;
  const isRackOwnedByUser = isOwnedByCurrentUser(rack);
  const isUnassigned = !rack.assignedUserId;
  const bgClass = isRackOwnedByUser
    ? 'bg-blue-100'
    : isUnassigned
      ? 'bg-yellow-50'
      : 'bg-slate-400';

  return (
    <div className="ml-2">
      {/* Rack Row */}
      <div
        className={`flex items-center gap-1.5 py-1 px-1.5 ${bgClass} rounded border border-slate-500`}
      >
        <span className="text-slate-600 font-mono text-sm flex-shrink-0">
          {isLast ? '└' : '├'}
        </span>

        <OwnershipBadge
          userId={rack.assignedUserId}
          users={users}
          size="md"
          isOwnedByCurrentUser={isRackOwnedByUser}
        />

        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer hover:bg-slate-500 -mx-1 px-1 py-0.5 rounded text-left"
          aria-expanded={!collapsed}
          aria-controls={`rack-content-${rackKey}`}
          aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${rack.name}`}
        >
          <div className="text-slate-700 flex-shrink-0" aria-hidden="true">
            {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          </div>
          <RackIcon className="text-slate-700 flex-shrink-0" size={18} aria-hidden="true" />
          <span className="font-medium text-slate-800 text-sm inline-block min-w-[60px]">
            {formatResourceDisplayName(rack.name, rack.customLabel)}
          </span>
          <span className="text-xs px-2 py-0.5 bg-slate-500 rounded text-white">
            {rack.boxes.length} {rack.boxes.length === 1 ? 'box' : 'boxes'}
          </span>
        </button>

        {/* Assignment Dropdown (admin only) */}
        {currentUser?.role === 'admin' && (
          <AssignmentDropdown
            value={rack.assignedUserId}
            users={users}
            onChange={userId => onAssignRack(tankId, rack.id, userId)}
            size="md"
          />
        )}

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Custom Label Button */}
          {canEditResource(rack) && (
            <CustomLabelButton
              onClick={() => onEditRackLabel(tankId, rack.id, rack.customLabel ?? '')}
            />
          )}

          <button
            onClick={() => onEditRack(tankId, rack)}
            className="text-slate-700 hover:bg-slate-500 p-1 rounded"
            title="Edit rack"
          >
            <Edit3 size={14} />
          </button>
          {canDeleteRack && (
            <button
              onClick={() => onDeleteRack(tankId, rack.id)}
              className="text-red-700 hover:bg-red-900 p-1 rounded"
              title="Delete rack"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Boxes - collapsible */}
      {!collapsed && (
        <div id={`rack-content-${rackKey}`} className="ml-5 mt-0.5 space-y-0.5">
          {rack.boxes.map((box, boxIndex) => (
            <BoxRow
              key={box.id}
              box={box}
              rack={rack}
              tankId={tankId}
              rackId={rack.id}
              isLast={boxIndex === rack.boxes.length - 1}
            />
          ))}

          {/* Add Box Button with Bulk Input */}
          <div className="flex items-center gap-1.5 py-0.5 px-1.5">
            <span className="text-slate-400 font-mono text-xs">└</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="26"
                value={boxCountToAdd}
                onChange={e =>
                  onBoxCountChange(Math.max(1, Math.min(26, parseInt(e.target.value) || 1)))
                }
                className="input-number-sm w-14 px-2 py-0.5"
                title="Number of boxes to add"
              />
              <button
                onClick={() => onAddBox(tankId, rack.id)}
                className="flex items-center gap-1 bg-slate-200 text-slate-800 px-2 py-1 rounded hover:bg-slate-300 text-xs"
              >
                <Plus size={12} />
                Add {boxCountToAdd > 1 ? 'Boxes' : 'Box'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
