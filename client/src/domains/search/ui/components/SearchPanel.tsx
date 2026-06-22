/**
 * Search Panel
 *
 * Top-bar search input with dropdown results and filter panel.
 */

import { useState, useRef, useEffect, useCallback } from 'react';

import { SlidersHorizontal, X } from 'lucide-react';

import { useSearch, useSearchStore } from '@domains/search';
import { logger } from '@infra/logger';
import { useResolvedTheme } from '@shared/hooks';
import { SearchInput, Tooltip } from '@shared/ui';

import { SearchFilterPanel } from './SearchFilterPanel';
import { SearchResultsPanel } from './SearchResultsPanel';

export function SearchPanel() {
  const { query, filters, results, isSearching, search, clear, refetch } = useSearch();
  const resolvedTheme = useResolvedTheme();

  const [showDropdown, setShowDropdown] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isClosingDropdown, setIsClosingDropdown] = useState(false);

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
    <div ref={containerRef} className="relative">
      <div className="relative">
        <div className="flex items-center">
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
                    onClick={handleFilterToggle}
                    className={
                      hasActiveFilters || showFilters ? 'btn-icon-action' : 'btn-icon-secondary'
                    }
                  >
                    <SlidersHorizontal className="h-2.5 w-2.5" />
                  </button>
                </Tooltip>

                <Tooltip content="Clear" side="bottom">
                  <button onClick={handleClear} className="btn-icon-secondary">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Tooltip>
              </>
            }
          />
        </div>
      </div>

      {(showDropdown || isClosingDropdown) && (
        <div
          ref={dropdownRef}
          data-theme={resolvedTheme}
          className={`absolute top-full right-0 mt-2 z-40 overflow-hidden border border-line-soft bg-card shadow-[0_24px_50px_-24px_hsl(var(--recess)/0.7)] ${
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
        </div>
      )}
    </div>
  );
}
