import React from 'react';

import { formatResourceDisplayName } from '@odysseus/shared-schemas';
import { ChevronDown, ChevronRight, Edit3, Plus, Trash2 } from 'lucide-react';

import { Button, NumberInput, Tooltip } from '@shared/ui';
import { RackIcon } from '@shared/ui/components/icons';

import { AssignmentDropdown } from './AssignmentDropdown';
import { BoxRow } from './BoxRow';
import { CustomLabelButton } from './CustomLabelButton';
import { OwnershipBadge } from './OwnershipBadge';
import { useStorageManagerContext } from './StorageManagerContext';

import type { RackConfiguration } from '@domains/storage';

interface RackRowProps {
  rack: RackConfiguration;
  tankId: string;
  collapsed: boolean;
  boxCountToAdd: number;
  onToggleCollapse: () => void;
  onBoxCountChange: (count: number) => void;
  canDeleteRack: boolean;
}

export function RackRow({
  rack,
  tankId,
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
    canManageStorage,
    onAssignRack,
    onEditRackLabel,
    onEditRack,
    onDeleteRack,
    onAddBox,
  } = useStorageManagerContext();

  const rackKey = `${tankId}-rack-${rack.id}`;
  const isRackOwnedByUser = isOwnedByCurrentUser(rack);
  const isUnassigned = !rack.assignedUserId;

  // Left border accent with subtle tint
  const leftBorderClass = isRackOwnedByUser
    ? 'border-l-ownership-user-badge'
    : isUnassigned
      ? 'border-l-ownership-unassigned-badge'
      : 'border-l-ownership-other-badge';

  // Badge colors - centralized via CSS variables
  const badgeClass = isRackOwnedByUser
    ? 'bg-ownership-user-badge text-white'
    : isUnassigned
      ? 'bg-ownership-unassigned-badge text-white'
      : 'bg-ownership-other-badge text-white';

  // Show non-admin custom label button on Row 1
  const showInlineCustomLabel = !canManageStorage && canEditResource(rack);

  return (
    <div className="ml-2">
      {/* Rack Row */}
      <div
        className={`flex gap-1.5 py-1 px-1.5 hover:bg-accent/50 transition-colors border-l-4 ${leftBorderClass}`}
      >
        {/* Left side - vertically centered between rows */}
        <div className="flex items-center gap-1.5 self-center">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="text-secondary-foreground flex-shrink-0 hover:bg-black/10 rounded p-0.5 transition-colors focus-ring-default"
            aria-expanded={!collapsed}
            aria-controls={`rack-content-${rackKey}`}
            aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${rack.name}`}
          >
            {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          </button>
          <OwnershipBadge
            userId={rack.assignedUserId}
            size="md"
            isOwnedByCurrentUser={isRackOwnedByUser}
          />
        </div>

        {/* Right side - stacked rows */}
        <div className="flex flex-col flex-1 min-w-0 gap-0.5">
          {/* Row 1: Identity + optional custom label for non-admins */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="flex items-center gap-2 flex-1 cursor-pointer hover:bg-black/10 transition-colors px-1 py-0.5 rounded text-left focus-ring-default"
              aria-expanded={!collapsed}
              aria-controls={`rack-content-${rackKey}`}
              aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${rack.name}`}
            >
              <RackIcon
                className="text-secondary-foreground flex-shrink-0"
                size={18}
                aria-hidden="true"
              />
              <span className="font-medium text-card-foreground text-sm">
                {formatResourceDisplayName(rack.name, rack.customLabel)}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded ml-auto ${badgeClass}`}>
                {rack.boxes.length} {rack.boxes.length === 1 ? 'box' : 'boxes'}
              </span>
            </button>

            {/* Custom label button for non-admin owners (fixed width) */}
            {!canManageStorage && (
              <div className="w-7 flex-shrink-0 flex justify-center">
                {showInlineCustomLabel && (
                  <CustomLabelButton
                    onClick={() => onEditRackLabel(tankId, rack.id, rack.customLabel ?? '')}
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
                  value={rack.assignedUserId}
                  users={users}
                  onChange={userId => onAssignRack(tankId, rack.id, userId ?? undefined)}
                  size="md"
                />
              )}

              {/* Custom Label + Edit/Delete buttons - right aligned */}
              <div className="flex items-center gap-1 ml-auto">
                {/* Custom Label Button (for admin owners) */}
                {canEditResource(rack) && (
                  <CustomLabelButton
                    onClick={() => onEditRackLabel(tankId, rack.id, rack.customLabel ?? '')}
                  />
                )}
                <Tooltip content="Edit rack" side="bottom">
                  <Button
                    variant="ghost"
                    size="xs"
                    iconOnly
                    onClick={() => onEditRack(tankId, rack)}
                    aria-label="Edit rack"
                  >
                    <Edit3 size={14} />
                  </Button>
                </Tooltip>
                {canDeleteRack && (
                  <Tooltip content="Remove rack" side="bottom">
                    <Button
                      variant="danger"
                      size="xs"
                      iconOnly
                      onClick={() => onDeleteRack(tankId, rack.id)}
                      aria-label="Remove rack"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </Tooltip>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Boxes - collapsible */}
      {!collapsed && (
        <div id={`rack-content-${rackKey}`} className="ml-5 mt-0.5 space-y-0.5">
          {rack.boxes.map(box => (
            <BoxRow key={box.id} box={box} rack={rack} tankId={tankId} rackId={rack.id} />
          ))}

          {/* Add Box Button with Bulk Input (Admin Only) */}
          {canManageStorage && (
            <div className="flex items-center gap-2 py-0.5 px-1.5">
              <Tooltip content="Number of boxes to add" side="bottom">
                <NumberInput
                  value={boxCountToAdd}
                  onChange={onBoxCountChange}
                  min={1}
                  max={26}
                  size="sm"
                  aria-label="Number of boxes to add"
                />
              </Tooltip>
              <Button
                variant="primary"
                size="xs"
                onClick={() => onAddBox(tankId, rack.id)}
                leftIcon={<Plus size={12} />}
              >
                Add {boxCountToAdd > 1 ? 'Boxes' : 'Box'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
