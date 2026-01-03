/**
 * LocationDisplay Component
 *
 * Read-only display of tube location using user-friendly display names
 * Format: "TankName • RackName • BoxName • Position X"
 *
 * Uses useLocationDisplayNames hook as single source of truth for display names
 * with customLabel support.
 */

import { useMemo } from 'react';

import { EQUIPMENT_DEFAULTS } from '@odysseus/shared-schemas';
import { MapPin } from 'lucide-react';

import { useUserSettings } from '@domains/authentication/hooks/useUserSettings';
import { useStorageData, useLocationDisplayNames } from '@domains/storage';
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
  className = '',
}: LocationDisplayProps) => {
  const { currentLab } = useStorageData();
  const { settings } = useUserSettings();

  // Single source of truth for location display names (includes customLabels)
  const { tankName, rackName, boxName, box } = useLocationDisplayNames(tankId, rackId, boxId);

  // Format position label using box's configuration
  const positionLabel = useMemo(() => {
    const gridConfig = box?.gridConfig ?? {
      rows: EQUIPMENT_DEFAULTS.GRID_ROWS,
      cols: EQUIPMENT_DEFAULTS.GRID_COLS,
      template: 'standard' as const,
    };
    return formatPositionForBox(position, tankId, rackId, boxId, gridConfig, currentLab, settings);
  }, [box, position, tankId, rackId, boxId, currentLab, settings]);

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 bg-slate-50 border-l-4 border-l-slate-400 rounded-lg shadow-sm ${className}`}
    >
      <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
      <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
        <span className="font-semibold">{tankName}</span>
        <span className="text-slate-300">•</span>
        <span>{rackName}</span>
        <span className="text-slate-300">•</span>
        <span>{boxName}</span>
        <span className="text-slate-300">•</span>
        <span className="font-semibold">Position {positionLabel}</span>
      </div>
    </div>
  );
};
