/**
 * Donor ID Autocomplete
 *
 * Input with registry search dropdown for donor ID fields in the tube editor.
 */

import { useState, useRef, useEffect } from 'react';

import { useDonorSearchQuery } from '@domains/donors/hooks/useDonorSearchQuery';
import { useDebounce } from '@shared/hooks';
import { ValidatedInput } from '@shared/ui/components/inputs/ValidatedInput';

import type { UseFormRegisterReturn } from 'react-hook-form';

interface DonorIdAutocompleteProps {
  label: string;
  placeholder: string;
  registration: UseFormRegisterReturn;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  fieldType: 'source' | 'internal';
  badge?: React.ReactNode;
  hasConflict?: boolean;
  onValueSelect?: (value: string) => void;
}

export function DonorIdAutocomplete({
  label,
  placeholder,
  registration,
  error,
  helperText,
  disabled,
  fieldType,
  badge,
  hasConflict,
  onValueSelect,
}: DonorIdAutocompleteProps) {
  const [inputValue, setInputValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(inputValue, 300);
  const { data: results = [] } = useDonorSearchQuery(debouncedQuery);

  const hasResults = results.length > 0 && isFocused && debouncedQuery.length >= 2;

  useEffect(() => {
    setShowDropdown(hasResults);
  }, [hasResults]);

  const handleSelect = (value: string) => {
    onValueSelect?.(value);
    setShowDropdown(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      className="relative"
      ref={dropdownRef}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setTimeout(() => setIsFocused(false), 200)}
    >
      <ValidatedInput
        label={label}
        type="text"
        placeholder={placeholder}
        registration={{
          ...registration,
          onChange: e => {
            setInputValue((e.target as HTMLInputElement).value);
            return registration.onChange(e);
          },
        }}
        error={error}
        helperText={helperText}
        disabled={disabled}
        badge={badge}
        hasConflict={hasConflict}
      />

      {showDropdown && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
          {results.map(result => {
            const displayValue =
              fieldType === 'source' ? result.donorSourceId : result.donorInternalId;
            const secondaryValue =
              fieldType === 'source' ? result.donorInternalId : result.donorSourceId;

            if (!displayValue) return null;

            return (
              <button
                key={result.id}
                type="button"
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                onMouseDown={e => {
                  e.preventDefault();
                  handleSelect(displayValue);
                }}
              >
                <span className="font-medium">{displayValue}</span>
                {secondaryValue && (
                  <span className="text-muted-foreground ml-2 text-xs">({secondaryValue})</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
