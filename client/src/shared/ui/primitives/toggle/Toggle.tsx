/**
 * Toggle
 *
 * Sliding toggle switch for boolean settings with semantic color tokens.
 */

import { forwardRef } from 'react';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  'aria-label'?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  (
    { checked, onChange, 'aria-label': ariaLabel, disabled = false, size = 'md', className = '' },
    ref
  ) => {
    const sizeClasses = {
      sm: {
        track: 'w-9 h-5',
        thumb: 'after:h-4 after:w-4 after:top-[2px] after:left-[2px]',
        translate: 'peer-checked:after:translate-x-4',
      },
      md: {
        track: 'w-11 h-6',
        thumb: 'after:h-5 after:w-5 after:top-[2px] after:left-[2px]',
        translate: 'peer-checked:after:translate-x-full',
      },
    };

    const sizes = sizeClasses[size];

    return (
      <label
        className={`relative inline-flex items-center ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${className}`}
      >
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
          aria-label={ariaLabel}
        />
        <div
          className={`
            ${sizes.track}
            bg-secondary
            peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ring/30
            rounded-full peer
            ${sizes.translate}
            peer-checked:after:border-card
            after:content-['']
            after:absolute
            ${sizes.thumb}
            after:bg-card
            after:border-border
            after:border
            after:rounded-full
            after:transition-all
            peer-checked:bg-action [[data-theme=dark]_&]:peer-checked:bg-action/70
          `}
        />
      </label>
    );
  }
);

Toggle.displayName = 'Toggle';
