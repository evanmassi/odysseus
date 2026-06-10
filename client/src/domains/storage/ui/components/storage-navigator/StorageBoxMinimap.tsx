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

// Selected/hover treatment mirrors the data Table's row glow (shared --alpha-glow-* /
// --alpha-hover-* tokens): a glowing leading stripe + directional primary wash + soft bloom.
const SELECTED_GLOW =
  '[background-image:linear-gradient(180deg,hsl(var(--primary)/var(--alpha-glow-tint)),hsl(var(--primary)/var(--alpha-glow-tint))),linear-gradient(90deg,hsl(var(--primary)/var(--alpha-glow-wash-1))_0%,hsl(var(--primary)/var(--alpha-glow-wash-2))_18%,hsl(var(--primary)/var(--alpha-glow-wash-3))_48%,hsl(var(--primary)/var(--alpha-glow-wash-4))_78%,hsl(var(--primary)/0)_100%)] shadow-[inset_3px_0_0_0_hsl(var(--primary)),inset_14px_0_36px_-10px_hsl(var(--primary)/var(--alpha-glow-edge-inner)),inset_0_10px_16px_-8px_hsl(var(--primary)/var(--alpha-glow-edge-bloom)),inset_0_-10px_16px_-8px_hsl(var(--primary)/var(--alpha-glow-edge-bloom)),0_0_32px_-4px_hsl(var(--primary)/var(--alpha-glow-outer-near)),0_0_80px_4px_hsl(var(--primary)/var(--alpha-glow-outer-far))]';
const HOVER_GLOW =
  'hover:[background-image:linear-gradient(90deg,hsl(var(--primary)/var(--alpha-hover-wash-1))_0%,hsl(var(--primary)/var(--alpha-hover-wash-2))_18%,hsl(var(--primary)/var(--alpha-hover-wash-3))_48%,hsl(var(--primary)/var(--alpha-hover-wash-4))_78%,hsl(var(--primary)/0)_100%)] hover:shadow-[inset_3px_0_0_0_hsl(var(--primary)/var(--alpha-hover-stripe)),inset_14px_0_36px_-10px_hsl(var(--primary)/var(--alpha-hover-edge)),inset_0_10px_16px_-8px_hsl(var(--primary)/var(--alpha-hover-bloom-edge)),inset_0_-10px_16px_-8px_hsl(var(--primary)/var(--alpha-hover-bloom-edge)),0_0_22px_-4px_hsl(var(--primary)/var(--alpha-hover-bloom)),0_0_50px_4px_hsl(var(--primary)/var(--alpha-hover-bloom-far))]';

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
        aria-label={`Box ${box.name}, ${filled} of ${capacity} filled`}
        className={`relative flex w-full items-center gap-2.5 border p-1.5 text-left transition-[box-shadow,border-color] duration-150 ${
          isSelected
            ? `border-primary text-foreground ${SELECTED_GLOW}`
            : `text-foreground/70 ${HOVER_GLOW} ${isFull ? 'border-warning-border/60' : 'border-line-faint'}`
        }`}
      >
        <TreeNub full={isFull} />

        <BoxOccupancyMatrix gridConfig={box.gridConfig} tubes={tubes} size={48} />

        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center justify-between gap-2">
            <Tooltip content={box.name} disabled={!isTruncated} side="top" delayDuration={400}>
              <span
                ref={nameRef}
                className={`min-w-0 truncate font-mono text-[13px] tracking-[0.04em] ${
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
                style={{ width: `${capacity > 0 ? (filled / capacity) * 100 : 0}%` }}
              />
            </span>
            <span
              className={`flex-none font-mono text-[8.5px] tracking-[0.08em] ${
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
