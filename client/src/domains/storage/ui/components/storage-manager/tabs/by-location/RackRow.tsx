/**
 * Rack Row
 *
 * Collapsible rack node in the By Location tab with box management and assignment controls.
 */

import { useMemo, useState } from 'react';

import {
  EQUIPMENT_DEFAULTS,
  formatStorageDisplayName,
  isAdminRole,
} from '@odysseus/shared-schemas';
import * as Collapsible from '@radix-ui/react-collapsible';
import { ChevronDown, Edit3, Lock, Plus, Tag, Trash2 } from 'lucide-react';

import { Button, NumberInput, OverflowMenu, Tooltip, type OverflowMenuItem } from '@shared/ui';
import { RackIcon } from '@shared/ui/components/icons';

import { useStorageManagerContext } from '../../StorageManagerContext';
import { AssignmentBadge } from '../by-user/AssignmentBadge';
import { AssignmentDropdown } from '../by-user/AssignmentDropdown';

import { BoxRow } from './BoxRow';
import { CustomLabelButton } from './CustomLabelButton';

import type { RackConfiguration } from '@domains/storage';

interface RackRowProps {
  rack: RackConfiguration;
  tankId: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  canDeleteRack: boolean;
}

export function RackRow({
  rack,
  tankId,
  collapsed,
  onToggleCollapse,
  canDeleteRack,
}: RackRowProps) {
  const {
    users,
    currentUser,
    isOwnedByCurrentUser,
    canEditResource,
    canManageStorage,
    isResourceLocked,
    isDemo,
    demoLimits,
    hasSeededResources,
    onAssignRack,
    onEditRackLabel,
    onEditRack,
    onDeleteRack,
    onAddBoxes,
  } = useStorageManagerContext();

  const [boxCountToAdd, setBoxCountToAdd] = useState(1);
  const rackKey = `${tankId}-rack-${rack.id}`;
  const isRackOwnedByUser = isOwnedByCurrentUser(rack);
  const locked = isResourceLocked(rack);
  const demoLimitsActive = isDemo && demoLimits && hasSeededResources;
  const nonSeededBoxCount = rack.boxes.filter(b => !b.isSeeded).length;
  const boxBaseline = !rack.isSeeded ? EQUIPMENT_DEFAULTS.BOXES_PER_RACK : 0;
  const extraBoxCount = Math.max(0, nonSeededBoxCount - boxBaseline);
  const boxLimitReached = demoLimitsActive && extraBoxCount >= demoLimits.maxBoxesPerRack;

  // Show non-admin custom label button inline (not in overflow menu)
  const showInlineCustomLabel = !canManageStorage && canEditResource(rack);

  const overflowMenuItems = useMemo((): OverflowMenuItem[] => {
    if (!canManageStorage || locked) return [];

    const items: OverflowMenuItem[] = [];

    if (canEditResource(rack)) {
      items.push({
        icon: Tag,
        label: 'Rename Rack',
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
    locked,
    canEditResource,
    canDeleteRack,
    rack,
    tankId,
    onEditRackLabel,
    onEditRack,
    onDeleteRack,
  ]);

  const dividerBefore = canDeleteRack ? ['Delete Rack'] : [];

  return (
    <Collapsible.Root open={!collapsed} onOpenChange={onToggleCollapse}>
      <div data-level="rack" data-id={rack.id}>
        <div className="storage-nav-item--modal storage-nav-item--rack">
          <div
            onClick={onToggleCollapse}
            onKeyDown={e => {
              if (e.key === 'Enter') onToggleCollapse();
            }}
            className={`storage-nav-button storage-nav-button--rack ${!collapsed ? 'selected' : ''}`}
            role="button"
            tabIndex={0}
            aria-expanded={!collapsed}
            aria-controls={`rack-content-${rackKey}`}
            aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${rack.name}`}
          >
            <ChevronDown
              size={12}
              className={`storage-nav-button__chevron transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`}
              aria-hidden="true"
            />
            {canManageStorage && !locked && overflowMenuItems.length > 0 && (
              <div
                role="presentation"
                onClick={e => e.stopPropagation()}
                onKeyDown={e => e.stopPropagation()}
                className="flex-shrink-0"
              >
                <OverflowMenu
                  items={overflowMenuItems}
                  dividerBefore={dividerBefore}
                  size="sm"
                  aria-label={`Actions for rack ${rack.name}`}
                />
              </div>
            )}
            <AssignmentBadge
              userId={rack.assignedUserId}
              size="md"
              isOwnedByCurrentUser={isRackOwnedByUser}
            />
            <div className="storage-nav-button__icon">
              <RackIcon size={16} aria-hidden="true" />
            </div>
            <span className="storage-nav-button__text">
              {formatStorageDisplayName(rack.name, rack.customLabel)}
            </span>
            <span className="storage-nav-pill storage-nav-pill--muted">
              {rack.boxes.length} {rack.boxes.length === 1 ? 'box' : 'boxes'}
            </span>
          </div>

          {canManageStorage && !locked && isAdminRole(currentUser?.role) && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <AssignmentDropdown
                value={rack.assignedUserId}
                users={users}
                onChange={userId => onAssignRack(tankId, rack.id, userId ?? undefined)}
                size="md"
              />
            </div>
          )}
          {locked && (
            <div className="flex items-center px-1.5">
              <Tooltip content="Protected — part of demo setup" side="left">
                <Lock size={12} className="text-muted-foreground" />
              </Tooltip>
            </div>
          )}

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

        <Collapsible.Content className="overflow-visible">
          <div id={`rack-content-${rackKey}`} className="storage-nav-children mt-0.5 space-y-0.5">
            {rack.boxes.map(box => (
              <BoxRow key={box.id} box={box} rack={rack} tankId={tankId} rackId={rack.id} />
            ))}

            {canManageStorage && !locked && (
              <div className="storage-nav-add-controls storage-nav-item--box">
                {demoLimitsActive && (
                  <span className="text-xs text-muted-foreground mr-1">
                    {extraBoxCount}/{demoLimits.maxBoxesPerRack}
                  </span>
                )}
                <Tooltip content="Number of boxes to add" side="bottom">
                  <NumberInput
                    value={boxCountToAdd}
                    onChange={setBoxCountToAdd}
                    min={1}
                    max={
                      demoLimitsActive
                        ? Math.max(1, demoLimits.maxBoxesPerRack - extraBoxCount)
                        : 26
                    }
                    size="xs"
                    aria-label="Number of boxes to add"
                  />
                </Tooltip>
                <Button
                  variant="primary"
                  size="xs"
                  onClick={() =>
                    onAddBoxes(tankId, rack.id, boxCountToAdd, {
                      onSuccess: () => setBoxCountToAdd(1),
                    })
                  }
                  leftIcon={<Plus size={12} />}
                  disabled={!!boxLimitReached}
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
