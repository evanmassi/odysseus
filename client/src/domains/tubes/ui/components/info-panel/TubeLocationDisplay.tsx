import { useMemo } from 'react';

import {
  useStorageData,
  useStorageLocationNames,
  DEFAULT_GRID_CONFIG,
  formatPositionForBox,
} from '@domains/storage';
import { useUserSettings } from '@domains/users';
import { useTextTruncation } from '@shared/hooks';
import { AccentTick, Tooltip } from '@shared/ui';

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
  const { ref: tankRef, isTruncated: isTankTruncated } = useTextTruncation<HTMLSpanElement>([
    tankName,
    rackName,
    boxName,
  ]);
  const { ref: rackRef, isTruncated: isRackTruncated } = useTextTruncation<HTMLSpanElement>([
    tankName,
    rackName,
    boxName,
  ]);
  const fullPath = [tankName, rackName, boxName].join(' › ');

  return (
    <div className={`flex min-w-0 items-center gap-3 ${className}`}>
      <span className="flex flex-none items-center gap-2 type-label text-label-2xs tracking-label-wide text-muted-foreground">
        <AccentTick />
        Location
      </span>
      <Tooltip
        content={positionLabel ? `${fullPath} · ${positionLabel}` : fullPath}
        disabled={!isTankTruncated && !isRackTruncated}
        side="bottom"
        delayDuration={400}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden whitespace-nowrap font-mono text-data-sm tracking-[0.06em] text-foreground">
          <span ref={tankRef} className="min-w-0 shrink-[3] truncate">
            {tankName}
          </span>
          <span className="flex-none text-foreground/40">›</span>
          <span ref={rackRef} className="min-w-0 shrink-[2] truncate">
            {rackName}
          </span>
          <span className="flex-none text-foreground/40">›</span>
          <span className="flex-none">{boxName}</span>
          {positionLabel && (
            <>
              <span className="flex-none text-foreground/40">·</span>
              <span className="flex-none">{positionLabel}</span>
            </>
          )}
        </div>
      </Tooltip>
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
