/**
 * Search Input
 *
 * Icon + text input for filter and scan fields.
 */

import React, { forwardRef } from 'react';
import type { ReactNode } from 'react';

import { Search } from 'lucide-react';

import { INPUT_WELL_BASE, INPUT_WELL_BORDER_DEFAULT } from './fieldStyles';

type SearchInputSize = 'sm';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  size?: SearchInputSize;
  icon?: ReactNode;
  trailingSlot?: ReactNode;
  disabled?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  className?: string;
  inputClassName?: string;
  'aria-label'?: string;
}

const SIZE = {
  sm: {
    container: 'h-8',
    text: 'text-body',
    paddingX: 'pl-8 pr-3',
    paddingXWithTrailing: 'pl-8 pr-12',
    iconWrap: 'left-2.5',
    iconSize: 12,
  },
} as const;

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      value,
      onChange,
      placeholder,
      size = 'sm',
      icon,
      trailingSlot,
      disabled = false,
      onKeyDown,
      onFocus,
      onBlur,
      className,
      inputClassName,
      'aria-label': ariaLabel,
    },
    ref
  ) => {
    const styles = SIZE[size];
    const resolvedIcon = icon ?? <Search size={styles.iconSize} />;
    const padding = trailingSlot ? styles.paddingXWithTrailing : styles.paddingX;

    return (
      <div className={`relative ${className ?? ''}`}>
        <span
          aria-hidden
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground ${styles.iconWrap}`}
        >
          {resolvedIcon}
        </span>
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={ariaLabel}
          className={`
            w-full
            ${styles.container}
            ${styles.text}
            ${padding}
            font-mono tracking-[0.04em]
            ${INPUT_WELL_BASE}
            ${INPUT_WELL_BORDER_DEFAULT}
            placeholder:font-normal
            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-line-faint
            ${inputClassName ?? ''}
          `}
        />
        {trailingSlot && (
          <div className="absolute right-1 top-1/2 z-10 flex -translate-y-1/2 items-center gap-1">
            {trailingSlot}
          </div>
        )}
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
