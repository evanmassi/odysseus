/**
 * Search Panel
 *
 * Top-bar search input with dropdown results and filter panel.
 */

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';

import { SlidersHorizontal, X } from 'lucide-react';
import { createPortal } from 'react-dom';

import { useSearch, useSearchStore } from '@domains/search';
import { logger } from '@infra/logger';
import { useResolvedTheme } from '@shared/hooks';
import { SearchInput, Tooltip } from '@shared/ui';

import { SearchFilterPanel } from './SearchFilterPanel';
import { SearchResultsPanel } from './SearchResultsPanel';

/** Console icon button — chamfered like the selectable chips, with a primary selected state. */
const ICON_BTN_BASE =
  'flex h-6 w-6 items-center justify-center border transition-[background-color,border-color,box-shadow,color] duration-150';

/** Top-right chamfer matching the chip silhouette; only inset shadows survive the clip. */
const ICON_BTN_CHAMFER: React.CSSProperties = {
  clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)',
};

export function SearchPanel() {
  const { query, filters, results, isSearching, search, clear, refetch } = useSearch();
  const resolvedTheme = useResolvedTheme();

  const [showDropdown, setShowDropdown] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isClosingDropdown, setIsClosingDropdown] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeDropdown = useCallback(() => {
    if (!showDropdown || isClosingDropdown) return;

    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }

    setIsClosingDropdown(true);
    closeTimeoutRef.current = setTimeout(() => {
      setShowDropdown(false);
      setShowFilters(false);
      setIsClosingDropdown(false);
    }, 200);
  }, [isClosingDropdown, showDropdown]);

  const handleFilterToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();

      if (!showDropdown) {
        setShowFilters(true);
        setShowDropdown(true);
      } else {
        setShowFilters(prev => !prev);
      }
    },
    [showDropdown]
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      clear();
      closeDropdown();
    },
    [clear, closeDropdown]
  );

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  // The dropdown is portaled to <body> so it escapes the header's permanent
  // data-theme="dark" anchor (otherwise dark-only glows leak into light mode).
  // Position is tracked against the trigger since it no longer flows with it.
  useLayoutEffect(() => {
    if (!showDropdown && !isClosingDropdown) return;

    const updatePosition = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setDropdownPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [showDropdown, isClosingDropdown]);

  useEffect(() => {
    if (!showDropdown || isClosingDropdown) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isOutsideContainer = containerRef.current && !containerRef.current.contains(target);
      const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);
      const isInsideSelectDropdown = (target as Element).closest?.('[data-select-dropdown]');

      if (isOutsideContainer && isOutsideDropdown && !isInsideSelectDropdown) {
        closeDropdown();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown, isClosingDropdown, closeDropdown]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      if (e.key === 'Escape' && showDropdown) {
        closeDropdown();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeDropdown, showDropdown]);

  const handleSearch = async () => {
    if (!query.trim() && Object.keys(filters).length === 0) {
      return;
    }

    await refetch();
    setShowDropdown(true);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      void (async () => {
        try {
          await handleSearch();
        } catch (error) {
          logger.error('Search failed', { error });
        }
      })();
    }
  };

  useEffect(() => {
    if (query.trim() || Object.keys(filters).length > 0) {
      setShowDropdown(true);
    }
  }, [query, filters]);

  const hasActiveFilters = useSearchStore(state => state.hasActiveFilters());

  return (
    <div ref={containerRef} className="relative flex items-center">
      <SearchInput
        ref={searchInputRef}
        value={query}
        onChange={search}
        onKeyDown={handleInputKeyDown}
        placeholder="Search…"
        size="sm"
        className="flex-1"
        inputClassName="pr-[4.5rem]"
        aria-label="Search"
        trailingSlot={
          <>
            {!query && (
              <span className="font-mono text-data-sm text-muted-foreground/40">Ctrl+F</span>
            )}

            <Tooltip content="Filters" side="bottom">
              <button
                type="button"
                onClick={handleFilterToggle}
                style={ICON_BTN_CHAMFER}
                aria-pressed={hasActiveFilters || showFilters}
                className={`${ICON_BTN_BASE} ${
                  hasActiveFilters || showFilters
                    ? 'border-primary/55 bg-primary/[0.10] text-primary dark:shadow-[inset_0_0_11px_-2px_hsl(var(--primary)/0.40)]'
                    : 'border-line-soft text-foreground/55 hover:border-primary/40 hover:text-primary'
                }`}
              >
                <SlidersHorizontal className="h-2.5 w-2.5" />
              </button>
            </Tooltip>

            <Tooltip content="Clear" side="bottom">
              <button
                type="button"
                onClick={handleClear}
                style={ICON_BTN_CHAMFER}
                className={`${ICON_BTN_BASE} border-line-soft text-foreground/55 hover:border-primary/40 hover:text-primary`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Tooltip>
          </>
        }
      />

      {(showDropdown || isClosingDropdown) &&
        dropdownPos &&
        createPortal(
          <div
            ref={dropdownRef}
            data-theme={resolvedTheme}
            style={{ position: 'fixed', top: dropdownPos.top, right: dropdownPos.right }}
            className={`z-[9999] overflow-hidden border border-line-soft bg-card shadow-[0_24px_50px_-24px_hsl(var(--recess)/0.7)] ${
              isClosingDropdown ? 'animate-dropdown-reveal-out' : 'animate-dropdown-reveal-in'
            }`}
          >
            <div className="flex items-stretch">
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  showFilters ? 'w-80' : 'w-0'
                }`}
              >
                <div className="w-80 h-[500px] flex flex-col border-r border-line-soft">
                  <SearchFilterPanel onClose={() => setShowFilters(false)} />
                </div>
              </div>

              <div className="w-96 min-h-[500px] flex flex-col">
                <SearchResultsPanel
                  results={results}
                  isSearching={isSearching}
                  onClose={closeDropdown}
                />
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
