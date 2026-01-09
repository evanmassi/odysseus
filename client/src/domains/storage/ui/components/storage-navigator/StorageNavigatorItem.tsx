import React, { useRef, useState, useEffect } from 'react';

import { refrigeratorFreezer } from '@lucide/lab';
import * as Collapsible from '@radix-ui/react-collapsible';
import { ChevronDown, Icon, Rows3, Box as BoxIcon } from 'lucide-react';

import { OwnershipIndicatorBadge } from '@shared/ui/components';
import { Tooltip } from '@shared/ui/primitives';

import type { StorageNavigatorItemProps } from './types';
import './storage-navigator.css';

export const StorageNavigatorItem: React.FC<StorageNavigatorItemProps> = ({
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
}) => {
  const hasChildren = !!children;
  const textRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  // Detect text truncation
  useEffect(() => {
    const checkTruncation = () => {
      if (textRef.current) {
        setIsTruncated(textRef.current.scrollWidth > textRef.current.clientWidth);
      }
    };

    checkTruncation();

    // Re-check on resize
    const resizeObserver = new ResizeObserver(checkTruncation);
    if (textRef.current) {
      resizeObserver.observe(textRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [name]);

  const iconSize = level === 'tank' ? 20 : level === 'rack' ? 18 : 16;

  const LevelIcon = () => {
    if (level === 'tank') {
      return <Icon iconNode={refrigeratorFreezer} size={iconSize} />;
    } else if (level === 'rack') {
      return <Rows3 size={iconSize} />;
    } else {
      return <BoxIcon size={iconSize} />;
    }
  };

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
            <LevelIcon />
          </div>
          <Tooltip content={name} disabled={!isTruncated} side="right" delayDuration={400}>
            <span ref={textRef} className="storage-nav-button__text">
              {name}
            </span>
          </Tooltip>
          {ownershipType && ownershipType !== 'otherUser' && (
            <OwnershipIndicatorBadge
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
          <Collapsible.Content className="overflow-visible data-[state=open]:animate-slideDown data-[state=closed]:animate-slideUp">
            <div className="mt-1 space-y-1">{children}</div>
          </Collapsible.Content>
        )}
      </div>
    </Collapsible.Root>
  );
};
