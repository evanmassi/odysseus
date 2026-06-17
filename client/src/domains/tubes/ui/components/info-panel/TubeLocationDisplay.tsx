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

type LocationVariant = 'inline' | 'strip';

interface SinglePositionProps {
  tankId: string;
  rackId: string;
  boxId: string;
  position: number;
  variant?: LocationVariant;
  className?: string;
}

interface PreResolvedProps {
  tankName: string;
  rackName: string;
  boxName: string;
  positionLabel: string;
  variant?: LocationVariant;
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
  variant = 'inline',
  className = '',
}: PreResolvedProps) {
  if (variant === 'strip') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <span className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.22em] text-muted-foreground">
          <span
            aria-hidden
            className="h-2.5 w-0.5 bg-primary/80 shadow-[0_0_6px_hsl(var(--primary)/0.55)]"
          />
          Location
        </span>
        <div className="flex flex-1 items-center gap-2 font-mono text-[11px] tracking-[0.06em] text-secondary-foreground">
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
  variant,
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
      variant={variant}
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
