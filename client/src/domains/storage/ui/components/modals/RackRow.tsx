import React, { useMemo } from 'react';

import { formatResourceDisplayName } from '@odysseus/shared-schemas';
import { ChevronDown, ChevronRight, Edit3, Plus, Tag, Trash2 } from 'lucide-react';

import { Button, NumberInput, Tooltip } from '@shared/ui';
import { getOwnershipIndicatorStyles, type OwnershipType } from '@shared/ui/components/badges';
import { RackIcon } from '@shared/ui/components/icons';
import { OverflowMenu } from '@shared/ui/primitives/overflow-menu';

import { AssignmentDropdown } from './AssignmentDropdown';
import { BoxRow } from './BoxRow';
import { CustomLabelButton } from './CustomLabelButton';
import { OwnershipBadge } from './OwnershipBadge';
import { useStorageManagerContext } from './StorageManagerContext';

import type { RackConfiguration } from '@domains/storage';
import type { OverflowMenuItem } from '@shared/ui/primitives/overflow-menu';

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

  const ownershipType: OwnershipType = isRackOwnedByUser
    ? 'currentUser'
    : isUnassigned
      ? 'unassigned'
      : 'otherUser';
  const ownershipStyles = getOwnershipIndicatorStyles(ownershipType);

  // Show non-admin custom label button inline (not in overflow menu)
  const showInlineCustomLabel = !canManageStorage && canEditResource(rack);

  // Build overflow menu items for admin
  const overflowMenuItems = useMemo((): OverflowMenuItem[] => {
    if (!canManageStorage) return [];

    const items: OverflowMenuItem[] = [];

    // Custom label - only if user can edit this resource (admin owner or admin for unassigned)
    if (canEditResource(rack)) {
      items.push({
        icon: Tag,
        label: 'Custom Label',
        onClick: () => onEditRackLabel(tankId, rack.id, rack.customLabel ?? ''),
      });
    }

    items.push({
      icon: Edit3,
      label: 'Edit Rack',
      onClick: () => onEditRack(tankId, rack),
    });

    if (canDeleteRack) {
      items.push({
        icon: Trash2,
        label: 'Delete Rack',
        onClick: () => onDeleteRack(tankId, rack.id),
        danger: true,
      });
    }

    return items;
  }, [
    canManageStorage,
    canEditResource,
    canDeleteRack,
    rack,
    tankId,
    onEditRackLabel,
    onEditRack,
    onDeleteRack,
  ]);

  // Divider before Delete Rack
  const dividerBefore = canDeleteRack ? ['Delete Rack'] : [];

  return (
    <div className="ml-2">
      {/* Rack Row - Single line layout */}
      <div
        className={`flex items-center gap-1.5 py-1 px-1.5 hover:bg-accent/50 transition-colors border-l-4 ${ownershipStyles.border}`}
      >
        {/* Collapse toggle */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="text-secondary-foreground flex-shrink-0 hover:bg-black/10 rounded p-0.5 transition-colors"
          aria-expanded={!collapsed}
          aria-controls={`rack-content-${rackKey}`}
          aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${rack.name}`}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
        </button>

        {/* Ownership badge */}
        <OwnershipBadge
          userId={rack.assignedUserId}
          size="md"
          isOwnedByCurrentUser={isRackOwnedByUser}
        />

        {/* Rack identity - clickable for expand/collapse */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer hover:bg-black/10 transition-colors px-1 py-0.5 rounded text-left"
          aria-expanded={!collapsed}
          aria-controls={`rack-content-${rackKey}`}
          aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${rack.name}`}
        >
          <RackIcon
            className="text-secondary-foreground flex-shrink-0"
            size={18}
            aria-hidden="true"
          />
          <span className="font-medium text-card-foreground text-sm truncate">
            {formatResourceDisplayName(rack.name, rack.customLabel)}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded ml-auto flex-shrink-0 ${ownershipStyles.background} ${ownershipStyles.text}`}
          >
            {rack.boxes.length} {rack.boxes.length === 1 ? 'box' : 'boxes'}
          </span>
        </button>

        {/* Admin: Assignment dropdown + Overflow menu */}
        {canManageStorage && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {currentUser?.role === 'admin' && (
              <AssignmentDropdown
                value={rack.assignedUserId}
                users={users}
                onChange={userId => onAssignRack(tankId, rack.id, userId ?? undefined)}
                size="md"
              />
            )}
            {overflowMenuItems.length > 0 && (
              <OverflowMenu
                items={overflowMenuItems}
                dividerBefore={dividerBefore}
                size="sm"
                aria-label={`Actions for rack ${rack.name}`}
              />
            )}
          </div>
        )}

        {/* Non-admin owner: Custom label button */}
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
