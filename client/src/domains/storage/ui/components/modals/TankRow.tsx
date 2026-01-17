import React from 'react';

import { ChevronDown, ChevronRight, Edit3, Plus, Trash2 } from 'lucide-react';

import { Button, NumberInput, Tooltip } from '@shared/ui';
import { TankIcon } from '@shared/ui/components/icons';

import { RackRow } from './RackRow';
import { useStorageManagerContext } from './StorageManagerContext';

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
  const { onEditTank, onDeleteTank, onAddRack, canManageStorage } = useStorageManagerContext();
  return (
    <div className="border border-border rounded-lg bg-card border-l-4 border-l-secondary-foreground">
      {/* Tank Header */}
      <div className="bg-muted px-2 py-1.5 rounded-tr-lg">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer hover:bg-accent transition-colors -mx-1 px-1 py-1 rounded text-left focus-ring-default"
            aria-expanded={!collapsed}
            aria-controls={`tank-content-${tank.id}`}
            aria-label={`${collapsed ? 'Expand' : 'Collapse'} tank ${tank.name}`}
          >
            <div className="text-muted-foreground flex-shrink-0" aria-hidden="true">
              {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            </div>
            <TankIcon
              className="text-secondary-foreground flex-shrink-0"
              size={24}
              aria-hidden="true"
            />
            <h3 className="text-base font-semibold text-card-foreground truncate">{tank.name}</h3>
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 ml-auto">
              <span>{tank.location}</span>
              <span className="text-muted-foreground">•</span>
              <span>
                {tank.racks.length} {tank.racks.length === 1 ? 'rack' : 'racks'}
              </span>
            </span>
          </button>
          {canManageStorage && (
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <Tooltip content="Edit tank" side="bottom">
                <Button
                  variant="ghost"
                  size="xs"
                  iconOnly
                  onClick={() => onEditTank(tank)}
                  aria-label="Edit tank"
                >
                  <Edit3 size={16} />
                </Button>
              </Tooltip>
              {canDeleteTank && (
                <Tooltip content="Remove tank" side="bottom">
                  <Button
                    variant="danger"
                    size="xs"
                    iconOnly
                    onClick={() => onDeleteTank(tank.id)}
                    aria-label="Remove tank"
                  >
                    <Trash2 size={16} />
                  </Button>
                </Tooltip>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tank Content - collapsible */}
      {!collapsed && (
        <div id={`tank-content-${tank.id}`} className="p-2">
          <div className="space-y-1.5">
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

            {/* Add Rack Button with Bulk Input (Admin Only) */}
            {canManageStorage && (
              <div className="ml-2 mt-1">
                <div className="flex items-center gap-2 py-1 px-1.5">
                  <Tooltip content="Number of racks to add" side="bottom">
                    <NumberInput
                      value={rackCountToAdd}
                      onChange={onRackCountChange}
                      min={1}
                      max={50}
                      size="sm"
                      aria-label="Number of racks to add"
                    />
                  </Tooltip>
                  <Button
                    variant="primary"
                    size="xs"
                    onClick={() => onAddRack(tank.id)}
                    leftIcon={<Plus size={12} />}
                  >
                    Add {rackCountToAdd > 1 ? 'Racks' : 'Rack'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
