import { useMemo } from 'react';

import * as Collapsible from '@radix-ui/react-collapsible';
import { ChevronDown, Lock, SquarePen, Trash2 } from 'lucide-react';

import { Tooltip, OverflowMenu, type OverflowMenuItem } from '@shared/ui';
import { TankIcon } from '@shared/ui/components/icons';

import { useStorageManagerContext } from '../../StorageManagerContext';

import { AddStorageTool } from './AddStorageTool';
import { RackRow } from './RackRow';
import { RowMeta } from './RowMeta';

import type { TankConfiguration } from '@odysseus/shared-schemas';

interface TankRowProps {
  tank: TankConfiguration;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onToggleRackCollapse: (rackKey: string) => void;
  collapsedRacks: Set<string>;
  canDeleteTank: boolean;
}

export function TankRow({
  tank,
  collapsed,
  onToggleCollapse,
  onToggleRackCollapse,
  collapsedRacks,
  canDeleteTank,
}: TankRowProps) {
  const {
    onEditTank,
    onDeleteTank,
    onAddRacks,
    canManageStorage,
    isResourceLocked,
    isDemo,
    demoLimits,
    hasSeededResources,
  } = useStorageManagerContext();

  const locked = isResourceLocked(tank);
  const demoLimitsActive = isDemo && demoLimits && hasSeededResources;
  const nonSeededRackCount = tank.racks.filter(r => !r.isSeeded).length;
  const rackBaseline = !tank.isSeeded ? 1 : 0;
  const extraRackCount = Math.max(0, nonSeededRackCount - rackBaseline);
  const rackLimitReached = demoLimitsActive && extraRackCount >= demoLimits.maxRacksPerTank;

  const overflowMenuItems = useMemo((): OverflowMenuItem[] => {
    if (locked) return [];

    const items: OverflowMenuItem[] = [
      {
        icon: SquarePen,
        label: 'Edit Tank',
        onClick: () => onEditTank(tank),
      },
    ];

    if (canDeleteTank) {
      items.push({
        icon: Trash2,
        label: 'Delete Tank',
        onClick: () => onDeleteTank(tank.id),
        danger: true,
      });
    }

    return items;
  }, [tank, locked, canDeleteTank, onEditTank, onDeleteTank]);

  const dividerBefore = canDeleteTank ? ['Delete Tank'] : [];

  return (
    <Collapsible.Root open={!collapsed} onOpenChange={onToggleCollapse}>
      <div data-level="tank" data-id={tank.id}>
        <div className="storage-nav-item--modal storage-nav-item--tank">
          <div
            onClick={onToggleCollapse}
            onKeyDown={e => {
              if (e.key === 'Enter') onToggleCollapse();
            }}
            className={`storage-nav-button row-glow row-tools-host storage-nav-button--tank ${!collapsed ? 'selected' : ''}`}
            role="button"
            tabIndex={0}
            aria-expanded={!collapsed}
            aria-controls={`tank-content-${tank.id}`}
            aria-label={`${collapsed ? 'Expand' : 'Collapse'} tank ${tank.name}`}
          >
            <ChevronDown
              size={14}
              className={`storage-nav-button__chevron transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`}
              aria-hidden="true"
            />
            <div className="storage-nav-button__icon">
              <TankIcon size={18} aria-hidden="true" />
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="min-w-0 truncate">{tank.name}</span>
              <RowMeta
                parts={[
                  tank.location,
                  `${tank.racks.length} ${tank.racks.length === 1 ? 'rack' : 'racks'}`,
                ]}
              />
            </div>
            {canManageStorage && (
              <span className="row-tools -ml-2">
                <span
                  className="flex items-center gap-1 pl-2.5"
                  role="presentation"
                  onClick={e => e.stopPropagation()}
                  onKeyDown={e => e.stopPropagation()}
                >
                  <AddStorageTool
                    noun="Rack"
                    pluralNoun="Racks"
                    max={
                      demoLimitsActive
                        ? Math.max(1, demoLimits.maxRacksPerTank - extraRackCount)
                        : 50
                    }
                    limitLabel={
                      demoLimitsActive
                        ? `${extraRackCount}/${demoLimits.maxRacksPerTank}`
                        : undefined
                    }
                    isLimitReached={!!rackLimitReached}
                    onAdd={(count, options) => onAddRacks(tank.id, count, options)}
                  />
                  {!locked && overflowMenuItems.length > 0 && (
                    <OverflowMenu
                      items={overflowMenuItems}
                      dividerBefore={dividerBefore}
                      size="sm"
                      aria-label={`Actions for tank ${tank.name}`}
                    />
                  )}
                </span>
              </span>
            )}
          </div>
          {locked && (
            <div className="flex items-center px-1.5">
              <Tooltip content="Protected — part of demo setup" side="left">
                <Lock size={14} className="text-muted-foreground" />
              </Tooltip>
            </div>
          )}
        </div>

        <Collapsible.Content className="overflow-visible">
          <div id={`tank-content-${tank.id}`} className="storage-nav-children mt-1 space-y-1">
            {tank.racks.map(rack => {
              const rackKey = `${tank.id}-rack-${rack.id}`;
              return (
                <RackRow
                  key={rack.id}
                  rack={rack}
                  tankId={tank.id}
                  collapsed={collapsedRacks.has(rackKey)}
                  onToggleCollapse={() => onToggleRackCollapse(rackKey)}
                  canDeleteRack={tank.racks.length > 1}
                />
              );
            })}
          </div>
        </Collapsible.Content>
      </div>
    </Collapsible.Root>
  );
}
