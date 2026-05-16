/**
 * Checkbox
 *
 * Status-LED checkbox — dark inner well with hairline frame, L-bracket
 * corners, and a primary fill plus halo when checked.
 */

import { forwardRef } from 'react';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  'aria-label'?: string;
  id?: string;
  disabled?: boolean;
  indeterminate?: boolean;
  className?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      checked,
      onChange,
      'aria-label': ariaLabel,
      id,
      disabled = false,
      indeterminate = false,
      className = '',
    },
    ref
  ) => {
    const handleRef = (input: HTMLInputElement | null) => {
      if (input) {
        input.indeterminate = indeterminate;
      }
      if (typeof ref === 'function') {
        ref(input);
      } else if (ref) {
        ref.current = input;
      }
    };

    const isLit = checked || indeterminate;
    const bracketColor = isLit ? 'border-primary' : 'border-line-strong';
    const boxGlow = isLit ? 'shadow-[0_0_4px_hsl(var(--primary)/0.3)]' : '';

    return (
      <label
        className={`relative inline-flex h-4 w-4 items-center justify-center ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${className}`}
      >
        <input
          ref={handleRef}
          type="checkbox"
          id={id}
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          disabled={disabled}
          aria-label={ariaLabel}
          className="sr-only"
        />
        <span
          aria-hidden
          className={`absolute inset-0 ${isLit ? 'bg-action-light' : 'bg-surface-void/30'} ${boxGlow}`}
        />
        <span
          aria-hidden
          className={`absolute -top-px -left-px h-1 w-1 border-t border-l ${bracketColor}`}
        />
        <span
          aria-hidden
          className={`absolute -top-px -right-px h-1 w-1 border-t border-r ${bracketColor}`}
        />
        <span
          aria-hidden
          className={`absolute -bottom-px -left-px h-1 w-1 border-b border-l ${bracketColor}`}
        />
        <span
          aria-hidden
          className={`absolute -right-px -bottom-px h-1 w-1 border-b border-r ${bracketColor}`}
        />
        {checked && !indeterminate && (
          <svg
            aria-hidden
            className="absolute inset-0 text-primary"
            style={{ filter: 'drop-shadow(0 0 2px hsl(var(--primary) / 0.6))' }}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5L6.5 10.5L4 8" />
          </svg>
        )}
        {indeterminate && (
          <span
            aria-hidden
            className="absolute top-1/2 right-[3px] left-[3px] h-0.5 -translate-y-1/2 bg-primary shadow-[0_0_4px_hsl(var(--primary)/0.6)]"
          />
        )}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
