/**
 * LocationDisplay Component
 *
 * Read-only display of tube location using user-friendly display names.
 * Supports single position (resolves IDs internally) and pre-resolved batch display.
 * Format: "TankName › RackName › BoxName · Position(s)"
 */

import { useMemo } from 'react';

import { MapPin } from 'lucide-react';

import { useUserSettings } from '@domains/authentication/hooks/useUserSettings';
import { useStorageData, useLocationDisplayNames, DEFAULT_GRID_CONFIG } from '@domains/storage';
import { formatPositionForBox } from '@domains/storage/utils/positionDisplayUtils';

interface SinglePositionProps {
  tankId: string;
  rackId: string;
  boxId: string;
  position: number;
  className?: string;
}

interface PreResolvedProps {
  tankName: string;
  rackName: string;
  boxName: string;
  positionLabel: string;
  className?: string;
}

export type LocationDisplayProps = SinglePositionProps | PreResolvedProps;

function isPreResolved(props: LocationDisplayProps): props is PreResolvedProps {
  return 'tankName' in props;
}

function LocationBreadcrumb({
  tankName,
  rackName,
  boxName,
  positionLabel,
  className = '',
}: PreResolvedProps) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 bg-muted border-l-4 border-l-muted-foreground rounded-lg shadow-sm ${className}`}
    >
      <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <div className="flex items-center gap-2 text-sm font-medium text-secondary-foreground">
        <span>{tankName}</span>
        <span className="text-muted-foreground">›</span>
        <span>{rackName}</span>
        <span className="text-muted-foreground">›</span>
        <span>{boxName}</span>
        <span className="text-muted-foreground">·</span>
        <span className="font-semibold">{positionLabel}</span>
      </div>
    </div>
  );
}

function SinglePositionDisplay({
  tankId,
  rackId,
  boxId,
  position,
  className,
}: SinglePositionProps) {
  const { currentLab } = useStorageData();
  const { settings } = useUserSettings();
  const { tankName, rackName, boxName, box } = useLocationDisplayNames(tankId, rackId, boxId);

  const positionLabel = useMemo(() => {
    const gridConfig = box?.gridConfig ?? DEFAULT_GRID_CONFIG;
    return formatPositionForBox(position, tankId, rackId, boxId, gridConfig, currentLab, settings);
  }, [box, position, tankId, rackId, boxId, currentLab, settings]);

  return (
    <LocationBreadcrumb
      tankName={tankName}
      rackName={rackName}
      boxName={boxName}
      positionLabel={positionLabel}
      className={className}
    />
  );
}

export function LocationDisplay(props: LocationDisplayProps) {
  if (isPreResolved(props)) {
    return <LocationBreadcrumb {...props} />;
  }
  return <SinglePositionDisplay {...props} />;
}
