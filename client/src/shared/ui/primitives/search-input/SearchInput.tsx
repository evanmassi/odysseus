/**
 * Search Input
 *
 * Icon + text input for filter and scan fields.
 */

import React, { forwardRef } from 'react';
import type { ReactNode } from 'react';

import { Search } from 'lucide-react';

type SearchInputSize = 'xs' | 'sm' | 'md' | 'lg';

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

const FOCUS_SHADOW =
  'focus:shadow-[0_0_0_1px_hsl(var(--primary)/0.30),0_0_20px_-2px_hsl(var(--primary)/0.45),inset_0_0_12px_-4px_hsl(var(--primary)/0.25)]';

const SIZE = {
  xs: {
    container: 'h-6',
    text: 'text-body-sm',
    paddingX: 'pl-6 pr-2',
    paddingXWithTrailing: 'pl-6 pr-10',
    iconWrap: 'left-1.5',
    iconSize: 12,
  },
  sm: {
    container: 'h-8',
    text: 'text-body',
    paddingX: 'pl-8 pr-3',
    paddingXWithTrailing: 'pl-8 pr-12',
    iconWrap: 'left-2.5',
    iconSize: 12,
  },
  md: {
    container: 'h-9',
    text: 'text-body',
    paddingX: 'pl-9 pr-3',
    paddingXWithTrailing: 'pl-9 pr-12',
    iconWrap: 'left-3',
    iconSize: 14,
  },
  lg: {
    container: 'h-12',
    text: 'text-body-lg',
    paddingX: 'pl-11 pr-4',
    paddingXWithTrailing: 'pl-11 pr-14',
    iconWrap: 'left-4',
    iconSize: 16,
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
            font-mono tracking-[0.04em] text-foreground
            bg-[hsl(var(--input-well))] border border-line-faint
            placeholder:text-foreground/40 placeholder:font-normal
            transition-[border-color,background,box-shadow] duration-200
            hover:border-foreground/30
            focus:outline-none focus:border-primary/70 focus:bg-primary/[0.04]
            ${FOCUS_SHADOW}
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
