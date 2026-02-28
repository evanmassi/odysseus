import { useMemo } from 'react';

import { formatResourceDisplayName } from '@odysseus/shared-schemas';
import * as Collapsible from '@radix-ui/react-collapsible';
import { ChevronDown, Edit3, Plus, Tag, Trash2 } from 'lucide-react';

import { Button, NumberInput, Tooltip, OverflowMenu, type OverflowMenuItem } from '@shared/ui';
import { RackIcon } from '@shared/ui/components/icons';

import { AssignedUserBadge } from './AssignedUserBadge';
import { AssignmentDropdown } from './AssignmentDropdown';
import { BoxRow } from './BoxRow';
import { CustomLabelButton } from './CustomLabelButton';
import { useStorageManagerContext } from './StorageManagerContext';
import '../storage-navigator/storage-navigator.css';

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
    <Collapsible.Root open={!collapsed} onOpenChange={onToggleCollapse}>
      <div data-level="rack" data-id={rack.id}>
        {/* Rack Header - Navigator styled button with inline controls */}
        <div className="storage-nav-item--modal storage-nav-item--rack">
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`storage-nav-button storage-nav-button--rack ${!collapsed ? 'selected' : ''}`}
            aria-expanded={!collapsed}
            aria-controls={`rack-content-${rackKey}`}
            aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${rack.name}`}
          >
            <ChevronDown
              size={12}
              className={`storage-nav-button__chevron transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`}
              aria-hidden="true"
            />
            <AssignedUserBadge
              userId={rack.assignedUserId}
              size="md"
              isOwnedByCurrentUser={isRackOwnedByUser}
            />
            <div className="storage-nav-button__icon">
              <RackIcon size={16} aria-hidden="true" />
            </div>
            <span className="storage-nav-button__text">
              {formatResourceDisplayName(rack.name, rack.customLabel)}
            </span>
            <span className="storage-nav-pill storage-nav-pill--muted">
              {rack.boxes.length} {rack.boxes.length === 1 ? 'box' : 'boxes'}
            </span>
          </button>

          {/* Admin: Assignment dropdown + Overflow menu */}
          {canManageStorage && (
            <div className="flex items-center gap-1 flex-shrink-0">
              {(currentUser?.role === 'lab_admin' || currentUser?.role === 'system_admin') && (
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

        {/* Boxes - collapsible with animation */}
        <Collapsible.Content className="overflow-visible data-[state=open]:animate-slideDown data-[state=closed]:animate-slideUp">
          <div id={`rack-content-${rackKey}`} className="storage-nav-children mt-0.5 space-y-0.5">
            {rack.boxes.map(box => (
              <BoxRow key={box.id} box={box} rack={rack} tankId={tankId} rackId={rack.id} />
            ))}

            {/* Add Box Button with Bulk Input (Admin Only) */}
            {canManageStorage && (
              <div className="storage-nav-add-controls storage-nav-item--box">
                <Tooltip content="Number of boxes to add" side="bottom">
                  <NumberInput
                    value={boxCountToAdd}
                    onChange={onBoxCountChange}
                    min={1}
                    max={26}
                    size="xs"
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
        </Collapsible.Content>
      </div>
    </Collapsible.Root>
  );
}
