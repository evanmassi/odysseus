/**
 * Tube Position Display
 *
 * Read-only location breadcrumb showing tank › rack › box · position.
 */

import { useMemo } from 'react';

import { MapPin } from 'lucide-react';

import { useStorageData, useStorageLocationNames, DEFAULT_GRID_CONFIG } from '@domains/storage';
import { formatPositionForBox } from '@domains/storage/utils/positionDisplayUtils';
import { useUserSettings } from '@domains/users/hooks/useUserSettings';

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

export type TubeLocationDisplayProps = SinglePositionProps | PreResolvedProps;

function isPreResolved(props: TubeLocationDisplayProps): props is PreResolvedProps {
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

function SingleLocationBreadcrumb({
  tankId,
  rackId,
  boxId,
  position,
  className,
}: SinglePositionProps) {
  const { currentLab } = useStorageData();
  const { settings } = useUserSettings();
  const { tankName, rackName, boxName, box } = useStorageLocationNames(tankId, rackId, boxId);

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

export function TubeLocationDisplay(props: TubeLocationDisplayProps) {
  if (isPreResolved(props)) {
    return <LocationBreadcrumb {...props} />;
  }
  return <SingleLocationBreadcrumb {...props} />;
}
