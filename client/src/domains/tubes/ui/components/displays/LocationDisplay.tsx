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
    <div className={`flex items-center gap-1.5 text-sm text-muted-foreground ${className}`}>
      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
      <span>{tankName}</span>
      <span>›</span>
      <span>{rackName}</span>
      <span>›</span>
      <span>{boxName}</span>
      <span>·</span>
      <span className="font-semibold text-secondary-foreground">{positionLabel}</span>
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
