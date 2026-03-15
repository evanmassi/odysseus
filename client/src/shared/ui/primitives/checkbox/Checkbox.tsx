/**
 * Checkbox
 *
 * Styled checkbox input with semantic color tokens for theme support.
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
    // Handle indeterminate state via ref
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

    // Inline SVG data URIs for checked/indeterminate icons (white strokes on transparent)
    const checkmarkSvg = `url("data:image/svg+xml,%3Csvg viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12 5L6.5 10.5L4 8' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`;
    const indeterminateSvg = `url("data:image/svg+xml,%3Csvg viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 8h8' stroke='white' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E")`;

    const isActive = checked || indeterminate;

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
          w-4 h-4 appearance-none rounded cursor-pointer
          border border-border bg-input transition-colors
          hover:border-muted-foreground
          checked:bg-action checked:border-action checked:hover:border-action
          focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0
          disabled:cursor-not-allowed disabled:opacity-50
          ${className}
        `}
        style={
          isActive
            ? {
                backgroundImage: indeterminate ? indeterminateSvg : checkmarkSvg,
                backgroundSize: '100%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }
            : undefined
        }
      />
    );
  }
);

Checkbox.displayName = 'Checkbox';
