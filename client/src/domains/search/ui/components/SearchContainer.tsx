import { useState, useRef, useEffect } from 'react';

import { Search, SlidersHorizontal, X } from 'lucide-react';

import { useSearch } from '@domains/search';

import { FilterPanel } from './FilterPanel';
import { SearchResults } from './SearchResults';

interface SearchContainerProps {}

export function SearchContainer({}: SearchContainerProps) {
  // Unified search hook - combines all search functionality
  const { query, filters, results, isSearching, search, clear, refetch } = useSearch();

  const [showFilters, setShowFilters] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Ctrl+F keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      // Escape key to close results and filters
      if (e.key === 'Escape') {
        setShowResults(false);
        setShowFilters(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside to close results and filters
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false);
        setShowFilters(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async () => {
    if (!query.trim() && Object.keys(filters).length === 0) {
      return;
    }

    // Trigger search
    await refetch();
    setShowResults(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      void (async () => {
        try {
          await handleSearch();
        } catch (error) {
          console.error('Search failed:', error);
          // Error already shown by React Query
        }
      })();
    }
  };

  // Auto-show/hide results when query or filters change (not when results update)
  useEffect(() => {
    if (query.trim() || Object.keys(filters).length > 0) {
      setShowResults(true);
    } else {
      // Close results when search is empty
      setShowResults(false);
    }
  }, [query, filters]);

  const handleClear = () => {
    clear();
    setShowResults(false);
  };

  const hasActiveFilters = Object.values(filters).some(value =>
    Array.isArray(value) ? value.length > 0 : value !== undefined
  );

  return (
    <div ref={containerRef} className="relative">
      {/* Compact Integrated Search Bar */}
      <div className="relative">
        <div className="flex items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2 w-3 h-3" style={{ color: '#76a6d8' }} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search tubes..."
              value={query}
              onChange={(e) => search(e.target.value)}
              onKeyPress={handleKeyPress}
              className="input-compact w-56 pl-8 pr-16 bg-white"
            />

            {/* Integrated Action Buttons */}
            <div className="absolute right-1 top-1 flex items-center space-x-1">
              <button
                onClick={handleSearch}
                disabled={isSearching}
                title="Search"
                className="btn-icon-sm bg-action hover:bg-action-hover disabled:bg-gray-400 text-white"
              >
                {isSearching ? (
                  <div className="animate-spin w-2.5 h-2.5 border border-white border-t-transparent rounded-full" />
                ) : (
                  <Search className="w-2.5 h-2.5" />
                )}
              </button>

              <button
                onClick={() => setShowFilters(!showFilters)}
                title="Filters"
                className={`btn-icon-sm ${
                  hasActiveFilters || showFilters
                    ? 'bg-action text-white hover:bg-action-hover'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                <SlidersHorizontal className="w-2.5 h-2.5" />
              </button>

              <button
                onClick={handleClear}
                title="Clear"
                className="btn-icon-sm bg-gray-200 hover:bg-gray-300 text-gray-600"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="absolute top-full right-0 mt-2 w-96 h-[600px] bg-white border border-gray-300 rounded-lg shadow-lg z-50 flex flex-col overflow-hidden">
          <FilterPanel onClose={() => setShowFilters(false)} />
        </div>
      )}

      {/* Search Results */}
      {showResults && (
        <div className="absolute top-full right-0 mt-2 w-96 bg-white border border-gray-300 rounded-lg shadow-lg z-40">
          <SearchResults
            results={results}
            isSearching={isSearching}
            onClose={() => setShowResults(false)}
          />
        </div>
      )}
    </div>
  );
}
