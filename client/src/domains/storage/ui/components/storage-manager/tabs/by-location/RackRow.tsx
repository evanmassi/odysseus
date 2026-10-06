import { useMemo } from 'react';

import { EQUIPMENT_DEFAULTS, formatStorageDisplayName } from '@odysseus/shared-schemas';
import * as Collapsible from '@radix-ui/react-collapsible';
import { ChevronDown, Lock, SquarePen, Tag, Trash2 } from 'lucide-react';

import { OverflowMenu, Tooltip, type OverflowMenuItem } from '@shared/ui';
import { RackIcon } from '@shared/ui/components/icons';

import { useStorageManagerContext } from '../../StorageManagerContext';
import { AssignmentBadge } from '../by-user/AssignmentBadge';
import { AssignmentDropdown } from '../by-user/AssignmentDropdown';

import { AddStorageTool } from './AddStorageTool';
import { CustomLabelButton } from './CustomLabelButton';
import { RackBoxMinimaps } from './RackBoxMinimaps';
import { RowMeta } from './RowMeta';

import type { RackConfiguration } from '@odysseus/shared-schemas';

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

  const rackKey = `${tankId}-rack-${rack.id}`;
  const isRackOwnedByUser = isOwnedByCurrentUser(rack);
  const locked = isResourceLocked(rack);
  const demoLimitsActive = isDemo && demoLimits && hasSeededResources;
  const nonSeededBoxCount = rack.boxes.filter(b => !b.isSeeded).length;
  const boxBaseline = !rack.isSeeded ? EQUIPMENT_DEFAULTS.BOXES_PER_RACK : 0;
  const extraBoxCount = Math.max(0, nonSeededBoxCount - boxBaseline);
  const boxLimitReached = demoLimitsActive && extraBoxCount >= demoLimits.maxBoxesPerRack;

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
      icon: SquarePen,
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
            className={`storage-nav-button row-glow row-tools-host storage-nav-button--rack ${!collapsed ? 'selected' : ''}`}
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
            <AssignmentBadge
              userId={rack.assignedUserId}
              size="md"
              isOwnedByCurrentUser={isRackOwnedByUser}
            />
            <div className="storage-nav-button__icon">
              <RackIcon size={16} aria-hidden="true" />
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="min-w-0 truncate">
                {formatStorageDisplayName(rack.name, rack.customLabel)}
              </span>
              <RowMeta
                parts={[`${rack.boxes.length} ${rack.boxes.length === 1 ? 'box' : 'boxes'}`]}
              />
            </div>
            {canManageStorage && !locked && (
              <>
                <div
                  role="presentation"
                  onClick={e => e.stopPropagation()}
                  onKeyDown={e => e.stopPropagation()}
                  className="flex items-center gap-1 flex-shrink-0"
                >
                  <AssignmentDropdown
                    value={rack.assignedUserId}
                    users={users}
                    onChange={userId => onAssignRack(tankId, rack.id, userId ?? undefined)}
                    currentUserId={currentUser?.id}
                    isQuiet
                  />
                </div>
                <span className="row-tools -ml-2">
                  <span
                    className="flex items-center gap-1 pl-1.5"
                    role="presentation"
                    onClick={e => e.stopPropagation()}
                    onKeyDown={e => e.stopPropagation()}
                  >
                    <AddStorageTool
                      noun="Box"
                      pluralNoun="Boxes"
                      max={
                        demoLimitsActive
                          ? Math.max(1, demoLimits.maxBoxesPerRack - extraBoxCount)
                          : 26
                      }
                      limitLabel={
                        demoLimitsActive
                          ? `${extraBoxCount}/${demoLimits.maxBoxesPerRack}`
                          : undefined
                      }
                      isLimitReached={!!boxLimitReached}
                      onAdd={(count, options) => onAddBoxes(tankId, rack.id, count, options)}
                    />
                    {overflowMenuItems.length > 0 && (
                      <OverflowMenu
                        items={overflowMenuItems}
                        dividerBefore={dividerBefore}
                        size="sm"
                        aria-label={`Actions for rack ${rack.name}`}
                      />
                    )}
                  </span>
                </span>
              </>
            )}
          </div>
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
            <RackBoxMinimaps tankId={tankId} rack={rack} />
          </div>
        </Collapsible.Content>
      </div>
    </Collapsible.Root>
  );
}
