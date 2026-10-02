import { useTextTruncation } from '@shared/hooks';
import { OccupancyBar, Tooltip } from '@shared/ui';
import { UserBadge } from '@shared/ui/components/badges';

import { BoxOccupancyMatrix } from './BoxOccupancyMatrix';

import type { StorageBoxMinimapProps } from './storageNavigatorTypes';

export function StorageBoxMinimap({
  box,
  tubes,
  filled,
  capacity,
  isSelected,
  onSelect,
  tabIndex,
  buttonRef,
  onFocus,
  ariaLevel,
  ariaPosinset,
  ariaSetsize,
  ownershipType,
  ownershipInitials,
}: StorageBoxMinimapProps) {
  const isFull = capacity > 0 && filled >= capacity;
  const { ref: nameRef, isTruncated } = useTextTruncation<HTMLSpanElement>([box.name]);

  return (
    <div data-level="box" data-id={box.id} className="ml-8 w-[calc(100%-2rem)]">
      <button
        ref={buttonRef}
        type="button"
        onClick={onSelect}
        onFocus={onFocus}
        tabIndex={tabIndex}
        role="treeitem"
        aria-level={ariaLevel}
        aria-posinset={ariaPosinset}
        aria-setsize={ariaSetsize}
        aria-selected={isSelected}
        data-full={isFull || undefined}
        aria-label={`Box ${box.name}, ${filled} of ${capacity} filled`}
        className="storage-nav-minimap row-glow relative flex w-full items-center gap-2.5 p-1.5 text-left text-foreground transition-[box-shadow,background] duration-150"
      >
        <BoxOccupancyMatrix gridConfig={box.gridConfig} tubes={tubes} size={48} />

        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center justify-between gap-2">
            <Tooltip content={box.name} disabled={!isTruncated} side="top" delayDuration={400}>
              <span
                ref={nameRef}
                className={`min-w-0 truncate font-display text-body-sm ${
                  isSelected ? 'font-semibold' : ''
                }`}
              >
                {box.name}
              </span>
            </Tooltip>
            {ownershipType && (
              <UserBadge type={ownershipType} initials={ownershipInitials} size="sm" />
            )}
          </span>
          <span className="flex items-center gap-1.5">
            <OccupancyBar filled={filled} capacity={capacity} className="flex-1" />
            <span
              className={`w-20 flex-none text-right font-mono text-data-sm tabular-nums tracking-[0.08em] ${
                isFull
                  ? 'text-danger-text'
                  : isSelected
                    ? 'font-semibold text-foreground'
                    : 'text-muted-foreground'
              }`}
            >
              {isFull ? 'FULL' : `${filled}/${capacity}`}
            </span>
          </span>
        </span>
      </button>
    </div>
  );
}
