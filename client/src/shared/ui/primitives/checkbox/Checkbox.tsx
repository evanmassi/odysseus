/**
 * Checkbox
 *
 * Status-LED checkbox — dark inner well, soft connecting edges, and glowing
 * corner points; adds a tone fill plus halo when checked.
 */

import { forwardRef } from 'react';

export type CheckboxTone = 'primary' | 'success';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  'aria-label'?: string;
  id?: string;
  disabled?: boolean;
  indeterminate?: boolean;
  tone?: CheckboxTone;
  className?: string;
}

// One literal string per field per tone — Tailwind JIT can't see interpolated classes.
const TONE: Record<
  CheckboxTone,
  {
    bracket: string;
    fill: string;
    icon: string;
    iconShadow: string;
    glow: string;
    cornerGlow: string;
    bar: string;
    barShadow: string;
  }
> = {
  primary: {
    bracket: 'border-primary',
    fill: 'bg-action-light',
    icon: 'text-primary',
    iconShadow: 'drop-shadow(0 0 2px hsl(var(--primary) / var(--alpha-checkbox-shadow)))',
    glow: 'dark:shadow-[0_0_6px_1px_hsl(var(--primary)/var(--alpha-checkbox-glow-inner)),0_0_16px_2px_hsl(var(--primary)/var(--alpha-checkbox-glow-outer))]',
    cornerGlow: 'dark:shadow-[0_0_4px_hsl(var(--primary)/0.65)]',
    bar: 'bg-primary',
    barShadow: 'dark:shadow-[0_0_4px_hsl(var(--primary)/var(--alpha-checkbox-shadow))]',
  },
  success: {
    bracket: 'border-success-bg',
    fill: 'bg-success-light',
    icon: 'text-success-text',
    iconShadow: 'drop-shadow(0 0 2px hsl(var(--color-success-bg) / var(--alpha-checkbox-shadow)))',
    glow: 'dark:shadow-[0_0_6px_1px_hsl(var(--color-success-bg)/var(--alpha-checkbox-glow-inner)),0_0_16px_2px_hsl(var(--color-success-bg)/var(--alpha-checkbox-glow-outer))]',
    cornerGlow: 'dark:shadow-[0_0_4px_hsl(var(--color-success-bg)/0.65)]',
    bar: 'bg-success-bg',
    barShadow: 'dark:shadow-[0_0_4px_hsl(var(--color-success-bg)/var(--alpha-checkbox-shadow))]',
  },
};

// Resting-state corner accent + soft connecting edge (checked state uses the tone above).
const UNLIT_CORNER = 'bg-foreground/80';
const UNLIT_CORNER_GLOW =
  'dark:shadow-[0_0_4px_color-mix(in_srgb,hsl(var(--foreground))_55%,transparent)]';
const SOFT_EDGE = 'border border-foreground/[0.20] blur-[1px]';

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      checked,
      onChange,
      'aria-label': ariaLabel,
      id,
      disabled = false,
      indeterminate = false,
      tone = 'primary',
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

    const t = TONE[tone];
    const isLit = checked || indeterminate;
    const cornerFill = isLit ? t.bar : UNLIT_CORNER;
    const cornerGlow = isLit ? t.cornerGlow : UNLIT_CORNER_GLOW;
    const boxGlow = isLit ? t.glow : '';

    return (
      <label
        className={`relative inline-flex h-3.5 w-3.5 items-center justify-center ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${className}`}
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
          className={`absolute inset-0 ${isLit ? t.fill : 'bg-surface-void/30'} ${boxGlow}`}
        />
        <span aria-hidden className={`pointer-events-none absolute inset-0 ${SOFT_EDGE}`} />
        <span
          aria-hidden
          className={`pointer-events-none absolute left-0 top-0 h-0.5 w-0.5 ${cornerFill} ${cornerGlow}`}
        />
        <span
          aria-hidden
          className={`pointer-events-none absolute right-0 top-0 h-0.5 w-0.5 ${cornerFill} ${cornerGlow}`}
        />
        <span
          aria-hidden
          className={`pointer-events-none absolute bottom-0 left-0 h-0.5 w-0.5 ${cornerFill} ${cornerGlow}`}
        />
        <span
          aria-hidden
          className={`pointer-events-none absolute bottom-0 right-0 h-0.5 w-0.5 ${cornerFill} ${cornerGlow}`}
        />
        {checked && !indeterminate && (
          <svg
            aria-hidden
            className={`absolute inset-0 ${t.icon}`}
            style={{ filter: t.iconShadow }}
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
            className={`absolute top-1/2 right-[3px] left-[3px] h-0.5 -translate-y-1/2 ${t.bar} ${t.barShadow}`}
          />
        )}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
