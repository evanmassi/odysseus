import React from 'react';

import { ChevronDown, ChevronRight, Edit3, Plus, Trash2 } from 'lucide-react';

import { TankIcon } from '@shared/ui/components/icons';

import { RackRow } from './RackRow';
import { useStorageManagementContext } from './StorageManagementContext';

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
  const { onEditTank, onDeleteTank, onAddRack, canManageStorage } = useStorageManagementContext();
  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      {/* Tank Header */}
      <div className="bg-slate-50 px-2 py-1.5 border-b border-gray-200 border-l-4 border-l-slate-600 rounded-t-lg">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer hover:bg-slate-100 transition-colors -mx-1 px-1 py-1 rounded text-left focus-ring-default"
            aria-expanded={!collapsed}
            aria-controls={`tank-content-${tank.id}`}
            aria-label={`${collapsed ? 'Expand' : 'Collapse'} tank ${tank.name}`}
          >
            <div className="text-slate-500 flex-shrink-0" aria-hidden="true">
              {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            </div>
            <div className="flex-1 min-w-0 flex items-center gap-1.5">
              <TankIcon className="text-slate-600 flex-shrink-0" size={24} aria-hidden="true" />
              <h3 className="text-base font-semibold text-slate-800 truncate min-w-[80px]">
                {tank.name}
              </h3>
              <span className="text-xs px-2 py-1 bg-slate-200 rounded text-slate-600 flex items-center gap-1.5">
                <span>{tank.location}</span>
                <span>•</span>
                <span>
                  {tank.racks.length} {tank.racks.length === 1 ? 'rack' : 'racks'}
                </span>
              </span>
            </div>
          </button>
          {canManageStorage && (
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                onClick={() => onEditTank(tank)}
                className="text-slate-500 hover:bg-slate-200 transition-colors p-1 rounded focus-ring-default"
                title="Edit tank"
              >
                <Edit3 size={16} />
              </button>
              {canDeleteTank && (
                <button
                  onClick={() => onDeleteTank(tank.id)}
                  className="text-red-500 hover:bg-red-100 transition-colors p-1 rounded focus-ring-default"
                  title="Delete tank"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tank Content - collapsible */}
      {!collapsed && (
        <div id={`tank-content-${tank.id}`} className="p-2">
          <div className="space-y-1.5">
            {tank.racks.map((rack, rackIndex) => {
              const rackKey = `${tank.id}-rack-${rack.id}`;
              return (
                <RackRow
                  key={rack.id}
                  rack={rack}
                  tankId={tank.id}
                  isLast={rackIndex === tank.racks.length - 1}
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
                <div className="flex items-center gap-1.5 py-1 px-1.5">
                  <span className="text-gray-400 font-mono text-xs">└</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={rackCountToAdd}
                      onChange={e =>
                        onRackCountChange(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))
                      }
                      className="input-number-sm w-14 px-2 py-1 text-sm focus-ring-default"
                      title="Number of racks to add"
                    />
                    <button
                      onClick={() => onAddRack(tank.id)}
                      className="flex items-center gap-1 bg-slate-200 text-slate-700 px-2 py-1 rounded hover:bg-slate-300 text-sm focus-ring-default"
                    >
                      <Plus size={12} />
                      Add {rackCountToAdd > 1 ? 'Racks' : 'Rack'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
