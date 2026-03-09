/**
 * Tank Row
 *
 * Collapsible tank node in the By Location tab with rack management controls.
 */

import { useMemo } from 'react';

import * as Collapsible from '@radix-ui/react-collapsible';
import { ChevronDown, Edit3, Lock, Plus, Trash2 } from 'lucide-react';

import { Button, NumberInput, Tooltip, OverflowMenu, type OverflowMenuItem } from '@shared/ui';
import { TankIcon } from '@shared/ui/components/icons';

import { useStorageManagerContext } from '../../StorageManagerContext';

import { RackRow } from './RackRow';

import type { TankConfiguration } from '@domains/storage';

interface TankRowProps {
  tank: TankConfiguration;
  collapsed: boolean;
  rackCountToAdd: number;
  boxCountToAdd: Record<string, number>;
  onToggleCollapse: () => void;
  onToggleRackCollapse: (rackKey: string) => void;
  onRackCountChange: (count: number) => void;
  onBoxCountChange: (rackKey: string, count: number) => void;
  collapsedRacks: Set<string>;
  canDeleteTank: boolean;
}

export function TankRow({
  tank,
  collapsed,
  rackCountToAdd,
  boxCountToAdd,
  onToggleCollapse,
  onToggleRackCollapse,
  onRackCountChange,
  onBoxCountChange,
  collapsedRacks,
  canDeleteTank,
}: TankRowProps) {
  const {
    onEditTank,
    onDeleteTank,
    onAddRack,
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
        icon: Edit3,
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
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`storage-nav-button storage-nav-button--tank ${!collapsed ? 'selected' : ''}`}
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
            <span className="storage-nav-button__text">{tank.name}</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 mr-1">
              <span>{tank.location}</span>
              <span>•</span>
              <span>
                {tank.racks.length} {tank.racks.length === 1 ? 'rack' : 'racks'}
              </span>
            </span>
          </button>
          {canManageStorage && !locked && overflowMenuItems.length > 0 && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <OverflowMenu
                items={overflowMenuItems}
                dividerBefore={dividerBefore}
                size="sm"
                aria-label={`Actions for tank ${tank.name}`}
              />
            </div>
          )}
          {locked && (
            <div className="flex items-center px-1.5">
              <Tooltip content="Protected — part of demo setup" side="left">
                <Lock size={14} className="text-muted-foreground" />
              </Tooltip>
            </div>
          )}
        </div>

        <Collapsible.Content className="overflow-visible data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
          <div id={`tank-content-${tank.id}`} className="storage-nav-children mt-1 space-y-1">
            {tank.racks.map(rack => {
              const rackKey = `${tank.id}-rack-${rack.id}`;
              return (
                <RackRow
                  key={rack.id}
                  rack={rack}
                  tankId={tank.id}
                  collapsed={collapsedRacks.has(rackKey)}
                  boxCountToAdd={boxCountToAdd[`${tank.id}-${rack.id}`] || 1}
                  onToggleCollapse={() => onToggleRackCollapse(rackKey)}
                  onBoxCountChange={count => onBoxCountChange(`${tank.id}-${rack.id}`, count)}
                  canDeleteRack={tank.racks.length > 1}
                />
              );
            })}

            {canManageStorage && (
              <div className="storage-nav-add-controls storage-nav-item--rack">
                {demoLimitsActive && (
                  <span className="text-xs text-muted-foreground mr-1">
                    {extraRackCount}/{demoLimits.maxRacksPerTank}
                  </span>
                )}
                <Tooltip content="Number of racks to add" side="bottom">
                  <NumberInput
                    value={rackCountToAdd}
                    onChange={onRackCountChange}
                    min={1}
                    max={
                      demoLimitsActive
                        ? Math.max(1, demoLimits.maxRacksPerTank - extraRackCount)
                        : 50
                    }
                    size="xs"
                    aria-label="Number of racks to add"
                  />
                </Tooltip>
                <Button
                  variant="primary"
                  size="xs"
                  onClick={() => onAddRack(tank.id)}
                  leftIcon={<Plus size={12} />}
                  disabled={!!rackLimitReached}
                >
                  Add {rackCountToAdd > 1 ? 'Racks' : 'Rack'}
                </Button>
              </div>
            )}
          </div>
        </Collapsible.Content>
      </div>
    </Collapsible.Root>
  );
}
