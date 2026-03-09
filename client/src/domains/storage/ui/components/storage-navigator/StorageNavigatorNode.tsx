/**
 * Storage Navigator Node
 *
 * Single tree node representing a tank, rack, or box in the navigator.
 */

import { refrigeratorFreezer } from '@lucide/lab';
import * as Collapsible from '@radix-ui/react-collapsible';
import { ChevronDown, Icon, Rows3, Box as BoxIcon } from 'lucide-react';

import { useTextTruncation } from '@shared/hooks';
import { Tooltip } from '@shared/ui';
import { UserBadge } from '@shared/ui/components/badges';

import type { StorageNavigatorNodeProps } from './types';

const ICON_SIZE = { tank: 20, rack: 18, box: 16 } as const;

function LevelIcon({ level }: { level: 'tank' | 'rack' | 'box' }) {
  const size = ICON_SIZE[level];
  if (level === 'tank') return <Icon iconNode={refrigeratorFreezer} size={size} />;
  if (level === 'rack') return <Rows3 size={size} />;
  return <BoxIcon size={size} />;
}

export function StorageNavigatorNode({
  id,
  name,
  level,
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
}: StorageNavigatorNodeProps) {
  const hasChildren = !!children;
  const { ref: textRef, isTruncated } = useTextTruncation<HTMLSpanElement>([name]);

  return (
    <Collapsible.Root open={isExpanded} onOpenChange={onToggle}>
      <div className="w-full" data-level={level} data-id={id}>
        <button
          ref={buttonRef}
          onClick={onSelect}
          onFocus={onFocus}
          tabIndex={tabIndex}
          className={`storage-nav-button storage-nav-button--${level} ${isSelected ? 'selected' : ''}`}
          role="treeitem"
          aria-level={ariaLevel}
          aria-posinset={ariaPosinset}
          aria-setsize={ariaSetsize}
          aria-expanded={hasChildren ? isExpanded : undefined}
          aria-selected={isSelected}
          aria-label={`${level} ${name}`}
        >
          <div className="storage-nav-button__icon">
            <LevelIcon level={level} />
          </div>
          <Tooltip content={name} disabled={!isTruncated} side="right" delayDuration={400}>
            <span ref={textRef} className="storage-nav-button__text">
              {name}
            </span>
          </Tooltip>
          {ownershipType && (
            <UserBadge
              type={ownershipType}
              initials={ownershipInitials}
              size="sm"
              variant="navigator"
            />
          )}
          {hasChildren && (
            <ChevronDown
              size={14}
              className={`storage-nav-button__chevron ${isExpanded ? 'rotate-180' : ''}`}
            />
          )}
        </button>

        {hasChildren && (
          <Collapsible.Content className="overflow-visible data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
            <div className="mt-1 space-y-1">{children}</div>
          </Collapsible.Content>
        )}
      </div>
    </Collapsible.Root>
  );
}
