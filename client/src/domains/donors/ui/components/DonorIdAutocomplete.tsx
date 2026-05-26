/**
 * Donor ID Autocomplete
 *
 * Input with registry search dropdown for donor ID fields in the tube editor.
 */

import { useMemo } from 'react';

import { useDonorSearchQuery } from '@domains/donors/hooks/useDonorSearchQuery';
import { useDebounce } from '@shared/hooks';
import { Autocomplete } from '@shared/ui';

import type { AutocompleteOption } from '@shared/ui/primitives/autocomplete/types';
import type { InputState } from '@shared/ui/primitives/input/types';

interface DonorIdAutocompleteProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  fieldType: 'source' | 'internal';
  badge?: React.ReactNode;
  hasConflict?: boolean;
  state?: InputState;
  onPairSelect?: (secondaryValue: string) => void;
}

export function DonorIdAutocomplete({
  label,
  placeholder,
  value,
  onChange,
  error,
  helperText,
  disabled,
  fieldType,
  badge,
  hasConflict,
  onPairSelect,
}: DonorIdAutocompleteProps) {
  const debouncedQuery = useDebounce(value, 300);
  const { data: results = [] } = useDonorSearchQuery(debouncedQuery);

  const options: AutocompleteOption[] = useMemo(
    () =>
      results
        .reduce<AutocompleteOption[]>((acc, result) => {
          const primary = fieldType === 'source' ? result.donorSourceId : result.donorInternalId;
          const secondary = fieldType === 'source' ? result.donorInternalId : result.donorSourceId;
          if (primary) {
            acc.push({ value: primary, label: primary, secondary });
          }
          return acc;
        }, [])
        .sort((a, b) => a.label.localeCompare(b.label)),
    [results, fieldType]
  );

  const inputState: InputState = error ? 'error' : hasConflict ? 'warning' : 'default';

  return (
    <div>
      <label
        className={`block font-mono text-[10px] uppercase tracking-[0.22em] mb-1.5 ${error ? 'text-danger-text' : 'text-muted-foreground'}`}
      >
        <span className="flex items-center gap-1.5">
          {label}
          {badge}
        </span>
      </label>
      <Autocomplete
        options={options}
        value={value}
        onChange={onChange}
        onSelect={option => {
          onChange(option.value);
          if (option.secondary && onPairSelect) {
            onPairSelect(option.secondary);
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        state={inputState}
        fullWidth
      />
      {helperText && (
        <div
          className={`flex items-center mt-1 text-xs ${error ? 'text-danger-text' : 'text-muted-foreground'}`}
        >
          <span>{helperText}</span>
        </div>
      )}
    </div>
  );
}
