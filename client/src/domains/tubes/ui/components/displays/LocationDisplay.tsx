/**
 * LocationDisplay Component
 * 
 * Read-only display of tube location using user-friendly display names
 * Format: "TankName • RackName • BoxName • Position X"
 * 
 * Industry-standard component with proper type safety and configuration integration
 */

import { useMemo } from 'react';

import { EQUIPMENT_DEFAULTS } from '@odysseus/shared-schemas';
import { MapPin } from 'lucide-react';

import { useUserSettings } from '@domains/authentication/hooks/useUserSettings';
import { useStorageStore } from '@domains/storage';
import { formatPositionForBox } from '@domains/storage/utils/positionDisplayUtils';

export interface LocationDisplayProps {
  tankId: string;
  rackId: string;
  boxId: string;
  position: number;
  className?: string;
}

export const LocationDisplay = ({
  tankId,
  rackId,
  boxId,
  position,
  className = ''
}: LocationDisplayProps) => {
  const { getCurrentTanks } = useStorageStore();
  const { settings } = useUserSettings();

  // Resolve display names from configuration
  const locationDisplay = useMemo(() => {
    const tanks = getCurrentTanks();
    const tank = tanks.find(t => t.id === tankId);
    const tankName = tank?.name || `Tank ${tankId}`;

    const rack = tank?.racks?.find(r => r.id === rackId);
    const rackName = rack?.name || `Rack ${rackId}`;

    const box = rack?.boxes?.find(b => b.id === boxId);
    const boxName = box?.name || `Box ${boxId}`;

    // Format position label using box's configuration
    const gridConfig = box?.gridConfig || {
      rows: EQUIPMENT_DEFAULTS.GRID_ROWS,
      cols: EQUIPMENT_DEFAULTS.GRID_COLS,
      template: 'standard' as const,
    };
    const positionLabel = formatPositionForBox(position, tankId, rackId, boxId, gridConfig, settings);

    return {
      tankName,
      rackName,
      boxName,
      positionLabel
    };
  }, [tankId, rackId, boxId, position, getCurrentTanks, settings]);

  return (
    <div className={`flex items-center gap-2 px-3 py-2 bg-gradient-to-br from-teal-50 to-cyan-50 border-2 border-teal-500 rounded-lg shadow-md ${className}`}>
      <MapPin className="w-4 h-4 text-teal-500 flex-shrink-0" />
      <div className="flex items-center gap-2 text-sm font-medium text-odysseus-dark">
        <span className="font-semibold">{locationDisplay.tankName}</span>
        <span className="text-odysseus-muted">•</span>
        <span>{locationDisplay.rackName}</span>
        <span className="text-odysseus-muted">•</span>
        <span>{locationDisplay.boxName}</span>
        <span className="text-odysseus-muted">•</span>
        <span className="font-semibold">Position {locationDisplay.positionLabel}</span>
      </div>
    </div>
  );
};
