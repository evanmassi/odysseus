/**
 * Tube Position Display
 *
 * Read-only location breadcrumb showing tank › rack › box · position.
 */

import { useMemo } from 'react';

import { useStorageData, useStorageLocationNames, DEFAULT_GRID_CONFIG } from '@domains/storage';
import { formatPositionForBox } from '@domains/storage/utils/positionDisplayUtils';
import { useUserSettings } from '@domains/users';

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
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="flex items-center gap-2 type-label text-label-2xs tracking-label-wide text-muted-foreground">
        <span
          aria-hidden
          className="h-2.5 w-0.5 bg-primary/80 dark:shadow-[0_0_6px_hsl(var(--primary)/0.55)]"
        />
        Location
      </span>
      <div className="flex flex-1 items-center gap-2 font-mono text-data-sm tracking-[0.06em] text-secondary-foreground">
        <span className="text-foreground">{tankName}</span>
        <span className="text-foreground/40">›</span>
        <span className="text-foreground">{rackName}</span>
        <span className="text-foreground/40">›</span>
        <span className="text-foreground">{boxName}</span>
        {positionLabel && (
          <>
            <span className="text-foreground/40">·</span>
            <span className="text-foreground">{positionLabel}</span>
          </>
        )}
      </div>
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
