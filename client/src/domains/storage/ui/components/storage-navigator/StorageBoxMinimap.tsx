/**
 * Storage Box Minimap
 *
 * Renders one box as an occupancy thumbnail — its grid matrix painted in each
 * tube's real smart color — so a rack's boxes are picked by seeing the fill
 * rather than reading a list.
 */

import { useTextTruncation } from '@shared/hooks';
import { Tooltip } from '@shared/ui';
import { UserBadge } from '@shared/ui/components/badges';

import { BoxOccupancyMatrix } from './BoxOccupancyMatrix';
import { TreeNub } from './TreeNub';

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
        className={`storage-nav-minimap relative flex w-full items-center gap-2.5 border p-1.5 text-left transition-[box-shadow,border-color] duration-150 ${
          isSelected
            ? isFull
              ? 'border-warning-border text-foreground'
              : 'border-primary text-foreground'
            : isFull
              ? 'border-warning-border/60 text-foreground/70'
              : 'border-line-faint text-foreground/70'
        }`}
      >
        <TreeNub full={isFull} />

        <BoxOccupancyMatrix gridConfig={box.gridConfig} tubes={tubes} size={48} />

        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center justify-between gap-2">
            <Tooltip content={box.name} disabled={!isTruncated} side="top" delayDuration={400}>
              <span
                ref={nameRef}
                className={`min-w-0 truncate font-mono text-data-sm tracking-[0.04em] ${
                  isSelected ? 'font-medium' : ''
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
            <span className="relative h-0.5 flex-1 bg-foreground/[0.07]">
              <span
                className={`absolute inset-y-0 left-0 ${isFull ? 'bg-warning-bg' : 'bg-primary/80'}`}
                style={{ width: `${capacity > 0 ? Math.min(100, (filled / capacity) * 100) : 0}%` }}
              />
            </span>
            <span
              className={`w-20 flex-none text-right font-mono text-data-sm tabular-nums tracking-[0.08em] ${
                isFull ? 'text-warning-text' : isSelected ? 'text-primary' : 'text-foreground/40'
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
