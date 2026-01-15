/**
 * LocationDisplay Component
 *
 * Read-only display of tube location using user-friendly display names.
 * Format: "TankName • RackName • BoxName • Position X"
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
      className={`flex items-center gap-2 px-3 py-2 bg-muted border-l-4 border-l-muted-foreground rounded-lg shadow-sm ${className}`}
    >
      <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <div className="flex items-center gap-2 text-sm font-medium text-secondary-foreground">
        <span className="font-semibold">{tankName}</span>
        <span className="text-muted-foreground">•</span>
        <span>{rackName}</span>
        <span className="text-muted-foreground">•</span>
        <span>{boxName}</span>
        <span className="text-muted-foreground">•</span>
        <span className="font-semibold">Position {positionLabel}</span>
      </div>
    </div>
  );
};
