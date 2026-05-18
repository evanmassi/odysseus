/**
 * Toggle
 *
 * Terminal-style boolean switch — boxed track with a sliding knob and
 * inline ON/OFF letterforms.
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

const SIZES = {
  sm: {
    track: 'w-[48px] h-[22px]',
    knob: 'h-[16px] w-[16px]',
    knobOnX: 'translate-x-[26px]',
    label: 'text-[8px]',
    onLabelInset: 'left-1.5',
    offLabelInset: 'right-1.5',
  },
  md: {
    track: 'w-[64px] h-[28px]',
    knob: 'h-[22px] w-[22px]',
    knobOnX: 'translate-x-[36px]',
    label: 'text-[9px]',
    onLabelInset: 'left-2',
    offLabelInset: 'right-2',
  },
} as const;

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  (
    { checked, onChange, 'aria-label': ariaLabel, disabled = false, size = 'md', className = '' },
    ref
  ) => {
    const s = SIZES[size];

    const trackTone = checked
      ? 'bg-[hsl(var(--primary)/0.10)] border-primary/40 shadow-[inset_0_0_12px_-2px_hsl(var(--primary)/0.30),0_0_18px_-4px_hsl(var(--primary)/0.50)]'
      : 'bg-foreground/[0.02] border-line-mid';

    const knobTone = checked
      ? `${s.knobOnX} bg-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.55),0_0_10px_0_hsl(var(--primary)/0.65)]`
      : 'translate-x-0 bg-muted-foreground';

    const knobLineTone = checked ? 'bg-black/35' : 'bg-black/40';

    return (
      <label
        className={`
          relative inline-block select-none font-mono [-webkit-tap-highlight-color:transparent]
          ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
          has-[:focus-visible]:outline has-[:focus-visible]:outline-1 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary/40
          ${className}
        `}
      >
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
          aria-label={ariaLabel}
        />

        <span
          className={`
            relative inline-block border
            ${s.track}
            ${trackTone}
            transition-[background-color,border-color,box-shadow] duration-200
          `}
        >
          <span
            aria-hidden
            className={`absolute bottom-0 top-0 flex items-center font-medium uppercase tracking-[0.18em] text-muted-foreground transition-opacity duration-200 ${s.label} ${s.offLabelInset} ${checked ? 'opacity-0' : 'opacity-100'}`}
          >
            OFF
          </span>
          <span
            aria-hidden
            className={`absolute bottom-0 top-0 flex items-center font-medium uppercase tracking-[0.18em] text-primary transition-opacity duration-200 ${s.label} ${s.onLabelInset} ${checked ? 'opacity-100' : 'opacity-0'}`}
          >
            ON
          </span>

          <span
            aria-hidden
            className={`
              absolute left-[2px] top-[2px]
              ${s.knob}
              ${knobTone}
              [transition:transform_200ms_cubic-bezier(.6,.2,.2,1),background-color_160ms_ease,box-shadow_200ms_ease]
            `}
          >
            <span aria-hidden className={`absolute left-1 right-1 top-1/2 h-px ${knobLineTone}`} />
          </span>
        </span>
      </label>
    );
  }
);

Toggle.displayName = 'Toggle';
