/**
 * Number Input
 *
 * Boxed number field with hold-to-ramp stepping and an odometer readout.
 */

import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';

import { Minus, Plus } from 'lucide-react';

const CONTAINER_FOCUS_SHADOW =
  'focus-within:shadow-[0_0_0_1px_hsl(var(--primary)/0.30),0_0_20px_-2px_hsl(var(--primary)/0.45),inset_0_0_12px_-4px_hsl(var(--primary)/0.25)]';

// Resting inner glow — Toggle's inset primary pool, dialed below the focus state so
// the well reads lit/dimensional without looking focused.
const WELL_GLOW = 'dark:shadow-[inset_0_0_12px_-3px_hsl(var(--primary)/0.14)]';

const DIVIDER =
  '[border-image:linear-gradient(180deg,transparent_0%,hsl(var(--foreground)/0.28)_18%,hsl(var(--foreground)/0.28)_82%,transparent_100%)_1]';

// Lit knob treatment borrowed from Toggle's active state — keeps the two primitives
// speaking the same primary-ring + bloom language.
const CHARGE_GLOW =
  'shadow-[0_0_0_1px_hsl(var(--primary)/0.55),0_0_10px_0_hsl(var(--primary)/0.65)]';

const RAMP_DELAY = 350; // ms held before auto-repeat begins
const RAMP_FULL = 1500; // ms held to reach full charge / ×5

const multiplierFor = (heldMs: number): number => (heldMs >= RAMP_FULL ? 5 : heldMs >= 600 ? 2 : 1);
const intervalFor = (heldMs: number): number => Math.max(45, 150 - heldMs / 12);

/**
 * Press-and-hold ramp: tap steps once; holding auto-repeats with an accelerating
 * interval and a climbing ×1 → ×2 → ×5 multiplier, exposing live charge for the
 * button fill. Reads the latest step fn from a ref so the repeat loop never goes stale.
 */
function useHoldRamp(step: (delta: number) => void, baseStep: number, disabled: boolean) {
  const stepRef = useRef(step);
  stepRef.current = step;
  const baseRef = useRef(baseStep);
  baseRef.current = baseStep;

  const dirRef = useRef<1 | -1>(1);
  const startRef = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const raf = useRef<number>();

  const [activeDir, setActiveDir] = useState<0 | 1 | -1>(0);
  const [charge, setCharge] = useState(0);
  const [multiplier, setMultiplier] = useState(1);

  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (raf.current) cancelAnimationFrame(raf.current);
    timer.current = undefined;
    raf.current = undefined;
    setActiveDir(0);
    setCharge(0);
    setMultiplier(1);
  }, []);

  const tick = useCallback(() => {
    const heldMs = performance.now() - startRef.current;
    setMultiplier(multiplierFor(heldMs));
    stepRef.current(dirRef.current * baseRef.current * multiplierFor(heldMs));
    timer.current = setTimeout(tick, intervalFor(heldMs));
  }, []);

  const animate = useCallback(() => {
    setCharge(Math.min(1, (performance.now() - startRef.current) / RAMP_FULL));
    raf.current = requestAnimationFrame(animate);
  }, []);

  const start = useCallback(
    (dir: 1 | -1) => {
      if (disabled) return;
      dirRef.current = dir;
      startRef.current = performance.now();
      setActiveDir(dir);
      setMultiplier(1);
      setCharge(0);
      stepRef.current(dir * baseRef.current);
      timer.current = setTimeout(tick, RAMP_DELAY);
      raf.current = requestAnimationFrame(animate);
    },
    [disabled, tick, animate]
  );

  useEffect(() => {
    if (disabled) stop();
  }, [disabled, stop]);
  useEffect(() => stop, [stop]); // cleanup on unmount

  return { activeDir, charge, multiplier, start, stop };
}

export interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  disabled?: boolean;
  allowDecimals?: boolean;
  'aria-label'?: string;
  /** Applied to the outer container */
  className?: string;
  /** Override the readout's width class — e.g. "w-20" */
  inputWidth?: string;
}

const sizeStyles = {
  xs: {
    container: 'h-6',
    button: 'w-5',
    inputWidth: 'w-8',
    cellH: 16,
    font: 'text-data-sm',
    icon: 12,
  },
  sm: {
    container: 'h-8',
    button: 'w-7',
    inputWidth: 'w-12',
    cellH: 18,
    font: 'text-data-sm',
    icon: 14,
  },
  md: {
    container: 'h-9',
    button: 'w-8',
    inputWidth: 'w-14',
    cellH: 20,
    font: 'text-data',
    icon: 16,
  },
  lg: {
    container: 'h-12',
    button: 'w-9',
    inputWidth: 'w-16',
    cellH: 26,
    font: 'text-data-lg',
    icon: 18,
  },
} as const;

/** Rolling digit reels — digits translate to their place with a per-column stagger. */
function Odometer({ text, cellH, font }: { text: string; cellH: number; font: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none flex items-center overflow-hidden font-mono text-foreground ${font}`}
      style={{ height: cellH }}
    >
      {text.split('').map((ch, i) => {
        if (ch < '0' || ch > '9') {
          return (
            <span
              key={i}
              className="flex w-[1ch] items-center justify-center"
              style={{ height: cellH }}
            >
              {ch}
            </span>
          );
        }
        return (
          <span key={i} className="relative block w-[1ch]" style={{ height: cellH }}>
            <span
              className="flex flex-col [transition:transform_300ms_cubic-bezier(.2,.7,.3,1)]"
              style={{
                transform: `translateY(${-Number(ch) * cellH}px)`,
                transitionDelay: `${i * 28}ms`,
              }}
            >
              {Array.from({ length: 10 }, (_, n) => (
                <span
                  key={n}
                  className="flex items-center justify-center"
                  style={{ height: cellH }}
                >
                  {n}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </div>
  );
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      value,
      onChange,
      min,
      max,
      step = 1,
      size = 'md',
      disabled = false,
      allowDecimals = false,
      'aria-label': ariaLabel,
      className = '',
      inputWidth,
    },
    ref
  ) => {
    const valueRef = useRef(value);
    valueRef.current = value;

    const stepBy = useCallback(
      (delta: number) => {
        const cur = valueRef.current;
        let next = cur + delta;
        if (min !== undefined && next < min) next = min;
        if (max !== undefined && next > max) next = max;
        if (next !== cur) onChange(next);
      },
      [min, max, onChange]
    );

    const ramp = useHoldRamp(stepBy, step, disabled);

    // Decimal mode buffers typed text locally so intermediate states like "0." and
    // "1.5" survive re-renders. Integer mode commits on each keystroke.
    const [inputText, setInputText] = useState(String(value));

    useEffect(() => {
      if (allowDecimals) setInputText(String(value));
    }, [value, allowDecimals]);

    const commitInputText = useCallback(() => {
      if (!allowDecimals) return;
      const parsed = parseFloat(inputText);
      if (isNaN(parsed)) {
        setInputText(String(value));
        return;
      }
      let next = parsed;
      if (min !== undefined && next < min) next = min;
      if (max !== undefined && next > max) next = max;
      onChange(next);
      setInputText(String(next));
    }, [allowDecimals, inputText, min, max, onChange, value]);

    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        if (allowDecimals) {
          setInputText(e.target.value);
          return;
        }
        const parsed = parseInt(e.target.value, 10);
        if (isNaN(parsed)) return;
        let next = parsed;
        if (min !== undefined && next < min) next = min;
        if (max !== undefined && next > max) next = max;
        onChange(next);
      },
      [min, max, onChange, allowDecimals]
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        const magnitude = (e.shiftKey ? 10 : 1) * step;
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          stepBy(magnitude);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          stepBy(-magnitude);
        } else if (e.key === 'Enter' && allowDecimals) {
          e.preventDefault();
          commitInputText();
        }
      },
      [stepBy, step, allowDecimals, commitInputText]
    );

    const canDecrement = min === undefined || value > min;
    const canIncrement = max === undefined || value < max;

    const styles = sizeStyles[size];
    const resolvedInputWidth = inputWidth ?? styles.inputWidth;
    const displayText = allowDecimals ? inputText : String(value);

    const stepButton = (dir: 1 | -1) => {
      const enabled = dir === 1 ? canIncrement : canDecrement;
      const charging = ramp.activeDir === dir;
      return (
        <button
          type="button"
          onPointerDown={e => {
            if (disabled || !enabled) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            ramp.start(dir);
          }}
          onPointerUp={ramp.stop}
          onPointerCancel={ramp.stop}
          onLostPointerCapture={ramp.stop}
          onClick={e => {
            // Keyboard activation (Enter/Space) synthesizes a click with detail 0;
            // pointer interactions already stepped via onPointerDown.
            if (e.detail === 0) stepBy(dir * step);
          }}
          disabled={disabled || !enabled}
          className={`
            relative overflow-hidden
            ${styles.button} h-full
            flex items-center justify-center
            text-secondary-foreground
            hover:text-foreground dark:hover:[text-shadow:0_0_8px_color-mix(in_srgb,currentColor_70%,transparent)]
            focus-visible:text-foreground
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-[color,text-shadow,box-shadow] duration-150
            ${dir === 1 ? 'border-l' : 'border-r'} border-transparent ${DIVIDER}
            focus:outline-none
            ${charging ? CHARGE_GLOW : ''}
          `}
          aria-label={dir === 1 ? 'Increase value' : 'Decrease value'}
        >
          <span
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-full origin-bottom bg-primary/90 transition-transform duration-75 ease-out"
            style={{ transform: `scaleY(${charging ? ramp.charge : 0})` }}
          />
          {dir === 1 ? (
            <Plus
              size={styles.icon}
              className={`relative ${charging && ramp.charge > 0.5 ? 'text-primary-foreground' : ''}`}
            />
          ) : (
            <Minus
              size={styles.icon}
              className={`relative ${charging && ramp.charge > 0.5 ? 'text-primary-foreground' : ''}`}
            />
          )}
        </button>
      );
    };

    return (
      <div
        className={`
          inline-flex items-center
          ${styles.container}
          bg-[hsl(var(--input-well))]
          border border-line-mid
          transition-[border-color,background,box-shadow] duration-200
          hover:border-foreground/30
          focus-within:border-primary/70
          focus-within:bg-primary/[0.04]
          ${WELL_GLOW}
          ${CONTAINER_FOCUS_SHADOW}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
      >
        {stepButton(-1)}

        <div className={`relative ${resolvedInputWidth} h-full flex items-center justify-center`}>
          {ramp.activeDir !== 0 && ramp.multiplier > 1 && (
            <span
              aria-hidden
              className="type-label tracking-meta pointer-events-none absolute right-0.5 top-0.5 text-label-2xs font-medium text-primary"
            >
              ×{ramp.multiplier}
            </span>
          )}

          <Odometer text={displayText} cellH={styles.cellH} font={styles.font} />

          <input
            ref={ref}
            type="text"
            inputMode={allowDecimals ? 'decimal' : 'numeric'}
            pattern={allowDecimals ? '[0-9]*\\.?[0-9]*' : '[0-9]*'}
            value={allowDecimals ? inputText : value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={commitInputText}
            disabled={disabled}
            aria-label={ariaLabel}
            className={`
              absolute inset-0 h-full w-full
              ${styles.font}
              font-mono
              text-center text-transparent
              [caret-color:hsl(var(--primary))]
              bg-transparent border-none
              focus:outline-none
              disabled:cursor-not-allowed
              [appearance:textfield]
              [&::-webkit-outer-spin-button]:appearance-none
              [&::-webkit-inner-spin-button]:appearance-none
            `}
          />
        </div>

        {stepButton(1)}
      </div>
    );
  }
);

NumberInput.displayName = 'NumberInput';
