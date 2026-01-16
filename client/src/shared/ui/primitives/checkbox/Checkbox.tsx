/**
 * Checkbox
 *
 * Styled checkbox input with semantic color tokens for theme support.
 */

import React, { forwardRef } from 'react';

export interface CheckboxProps {
  /** Whether the checkbox is checked */
  checked: boolean;
  /** Called when checkbox state changes */
  onChange: (checked: boolean) => void;
  /** Accessible label for the checkbox */
  'aria-label'?: string;
  /** HTML id for label association */
  id?: string;
  /** Whether the checkbox is disabled */
  disabled?: boolean;
  /** Whether the checkbox is in indeterminate state */
  indeterminate?: boolean;
  /** Additional class name */
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
    // Handle indeterminate state via ref
    const handleRef = (input: HTMLInputElement | null) => {
      if (input) {
        input.indeterminate = indeterminate;
      }
      // Forward ref
      if (typeof ref === 'function') {
        ref(input);
      } else if (ref) {
        ref.current = input;
      }
    };

    return (
      <input
        ref={handleRef}
        type="checkbox"
        id={id}
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        disabled={disabled}
        aria-label={ariaLabel}
        className={`
          w-4 h-4
          border-border
          rounded
          focus:outline-none focus:ring-2 focus:ring-action-focus focus:ring-offset-0
          disabled:cursor-not-allowed disabled:opacity-50
          ${className}
        `}
        style={{ accentColor: 'var(--color-action-default)' }}
      />
    );
  }
);

Checkbox.displayName = 'Checkbox';
