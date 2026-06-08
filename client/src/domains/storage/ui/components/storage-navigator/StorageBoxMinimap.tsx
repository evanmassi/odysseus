/**
 * Storage Box Minimap
 *
 * Renders one box as an occupancy thumbnail — its grid matrix painted in each
 * tube's real smart color — so a rack's boxes are picked by seeing the fill
 * rather than reading a list.
 */

import { getTubeColorFromFields } from '@domains/tubes/utils';
import { UserBadge } from '@shared/ui/components/badges';

import type { StorageBoxMinimapProps } from './storageNavigatorTypes';
import type { RackTube } from '@odysseus/shared-schemas';

const EMPTY_CELL_COLOR = 'hsl(var(--foreground)/0.05)';

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
  const { rows, cols } = box.gridConfig;
  const isFull = capacity > 0 && filled >= capacity;

  const tubeByPosition = new Map<number, RackTube>();
  for (const tube of tubes) {
    tubeByPosition.set(tube.position, tube);
  }

  // Cells follow the real grid order (row-major, 1-based), so the thumbnail
  // mirrors what the box looks like in the full grid.
  const cellColors = Array.from({ length: rows * cols }, (_, index) => {
    const tube = tubeByPosition.get(index + 1);
    return tube ? getTubeColorFromFields(tube).backgroundColor : EMPTY_CELL_COLOR;
  });

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
        className={`relative flex w-full items-center gap-2.5 border p-1.5 text-left transition-[background-color,box-shadow,border-color] duration-150 ${
          isSelected
            ? 'border-primary bg-primary/[0.14] text-foreground shadow-[0_0_16px_-5px_hsl(var(--primary)/0.65)]'
            : isFull
              ? 'border-warning-border/60 text-foreground/70 hover:bg-primary/[0.06]'
              : 'border-line-faint text-foreground/70 hover:bg-primary/[0.06]'
        }`}
      >
        {isSelected && (
          <span
            aria-hidden
            className="absolute inset-y-0 -left-px w-0.5 bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
          />
        )}

        <span
          aria-hidden
          className="grid flex-none gap-px"
          style={{
            width: 48,
            aspectRatio: '1 / 1',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
          }}
        >
          {cellColors.map((color, index) => (
            <span key={index} style={{ backgroundColor: color, aspectRatio: '1 / 1' }} />
          ))}
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center justify-between gap-2">
            <span
              className={`min-w-0 truncate font-mono text-[10px] tracking-[0.06em] ${
                isSelected ? 'font-medium' : ''
              }`}
            >
              {box.name}
            </span>
            {ownershipType && (
              <UserBadge
                type={ownershipType}
                initials={ownershipInitials}
                size="sm"
                variant="navigator"
              />
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
