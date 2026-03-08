/**
 * Search Panel
 *
 * Top-bar search input with dropdown results and filter panel.
 */

import { useState, useRef, useEffect, useCallback } from 'react';

import { Search, SlidersHorizontal, X } from 'lucide-react';

import { useSearch, useSearchStore } from '@domains/search';
import { logger } from '@shared/infrastructure/logger';
import { Tooltip } from '@shared/ui';

import { SearchFilterPanel } from './SearchFilterPanel';
import { SearchResultsPanel } from './SearchResultsPanel';

export function SearchPanel() {
  const { query, filters, results, isSearching, search, clear, refetch } = useSearch();

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
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2 w-3 h-3 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search..."
              value={query}
              onChange={e => search(e.target.value)}
              onKeyDown={handleInputKeyDown}
              className="input-search w-56 pl-8 pr-[4.5rem]"
            />

            <div className="absolute right-1 top-1 flex items-center space-x-1 z-50">
              {!query && <span className="text-xs text-muted-foreground/40 font-mono">Ctrl+F</span>}

              <Tooltip content="Filters" side="bottom">
                <button
                  onClick={handleFilterToggle}
                  className={
                    hasActiveFilters || showFilters ? 'btn-icon-action' : 'btn-icon-secondary'
                  }
                >
                  <SlidersHorizontal className="w-2.5 h-2.5" />
                </button>
              </Tooltip>

              <Tooltip content="Clear" side="bottom">
                <button onClick={handleClear} className="btn-icon-secondary">
                  <X className="w-2.5 h-2.5" />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

      {(showDropdown || isClosingDropdown) && (
        <div
          ref={dropdownRef}
          className={`absolute top-full right-0 mt-2 z-40 bg-popover border border-border rounded-lg shadow-lg overflow-hidden ${
            isClosingDropdown ? 'animate-dropdown-reveal-out' : 'animate-dropdown-reveal-in'
          }`}
        >
          <div className="flex items-stretch">
            <div
              className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                showFilters ? 'w-80' : 'w-0'
              }`}
            >
              <div className="w-80 h-[500px] flex flex-col border-r border-border">
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
