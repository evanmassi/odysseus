/**
 * Storage Navigator Node
 *
 * A tank or rack row in the navigator, with an inline occupancy bar; boxes are
 * rendered separately as minimaps.
 */

import { refrigeratorFreezer } from '@lucide/lab';
import * as Collapsible from '@radix-ui/react-collapsible';
import { ChevronRight, Icon, Rows3 } from 'lucide-react';

import { useTextTruncation } from '@shared/hooks';
import { OccupancyBar, Tooltip } from '@shared/ui';
import { UserBadge } from '@shared/ui/components/badges';

import { TreeNub } from './TreeNub';

import type { StorageNavigatorNodeProps } from './storageNavigatorTypes';

const ICON_SIZE = { tank: 20, rack: 18 } as const;

function LevelIcon({ level }: { level: 'tank' | 'rack' }) {
  const size = ICON_SIZE[level];
  if (level === 'tank') return <Icon iconNode={refrigeratorFreezer} size={size} />;
  return <Rows3 size={size} />;
}

export function StorageNavigatorNode({
  id,
  name,
  level,
  hasChildren,
  isSelected,
  isExpanded,
  onToggle,
  onSelect,
  children,
  tabIndex = -1,
  buttonRef,
  onFocus,
  ariaLevel,
  ariaPosinset,
  ariaSetsize,
  ownershipType,
  ownershipInitials,
  occupancyFilled,
  occupancyCapacity,
}: StorageNavigatorNodeProps) {
  const { ref: textRef, isTruncated } = useTextTruncation<HTMLSpanElement>([name]);
  const showOccupancy = occupancyCapacity !== undefined && occupancyCapacity > 0;

  return (
    <Collapsible.Root open={isExpanded} onOpenChange={onToggle}>
      <div className="w-full" data-level={level} data-id={id}>
        <button
          ref={buttonRef}
          onClick={onSelect}
          onFocus={onFocus}
          tabIndex={tabIndex}
          className={`storage-nav-button row-glow storage-nav-button--${level} ${isSelected ? 'selected' : ''}`}
          role="treeitem"
          aria-level={ariaLevel}
          aria-posinset={ariaPosinset}
          aria-setsize={ariaSetsize}
          aria-expanded={hasChildren ? isExpanded : undefined}
          aria-selected={isSelected}
          aria-label={`${level} ${name}`}
        >
          {level === 'rack' && <TreeNub />}
          {hasChildren ? (
            <ChevronRight
              size={11}
              className={`storage-nav-button__chevron ${isExpanded ? 'rotate-90' : ''}`}
            />
          ) : (
            <span className="storage-nav-button__chevron-spacer" aria-hidden />
          )}
          <div className="storage-nav-button__icon">
            <LevelIcon level={level} />
          </div>
          <Tooltip content={name} disabled={!isTruncated} side="right" delayDuration={400}>
            <span ref={textRef} className="storage-nav-button__text font-mono tracking-[0.02em]">
              {name}
            </span>
          </Tooltip>
          {showOccupancy && (
            <span className="flex flex-none items-center gap-1.5">
              <OccupancyBar
                filled={occupancyFilled ?? 0}
                capacity={occupancyCapacity ?? 0}
                className="w-8"
              />
              <span className="font-mono text-data-sm tabular-nums tracking-[0.04em] text-foreground/45">
                {occupancyFilled ?? 0}
                <span className="text-foreground/25">/{occupancyCapacity}</span>
              </span>
            </span>
          )}
          {ownershipType && (
            <UserBadge type={ownershipType} initials={ownershipInitials} size="sm" />
          )}
        </button>

        {hasChildren && (
          <Collapsible.Content className="overflow-visible">
            <div className="mt-1 space-y-1">{children}</div>
          </Collapsible.Content>
        )}
      </div>
    </Collapsible.Root>
  );
}
