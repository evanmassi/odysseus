/**
 * Number Input
 *
 * Custom number input with increment/decrement buttons replacing native spinners.
 */

import React, { forwardRef, useCallback, useEffect, useState } from 'react';

import { Minus, Plus } from 'lucide-react';

const CONTAINER_FOCUS_SHADOW =
  'focus-within:shadow-[0_0_0_1px_hsl(var(--primary)/0.30),0_0_20px_-2px_hsl(var(--primary)/0.45),inset_0_0_12px_-4px_hsl(var(--primary)/0.25)]';

const DIVIDER =
  '[border-image:linear-gradient(180deg,transparent_0%,hsl(var(--foreground)/0.28)_18%,hsl(var(--foreground)/0.28)_82%,transparent_100%)_1]';

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
  /** Override the input's width class — e.g. "w-20" */
  inputWidth?: string;
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
    const handleIncrement = useCallback(() => {
      if (disabled) return;
      const newValue = value + step;
      if (max !== undefined && newValue > max) return;
      onChange(newValue);
    }, [value, step, max, disabled, onChange]);

    const handleDecrement = useCallback(() => {
      if (disabled) return;
      const newValue = value - step;
      if (min !== undefined && newValue < min) return;
      onChange(newValue);
    }, [value, step, min, disabled, onChange]);

    // Decimal mode buffers typed text locally so intermediate states like
    // "0." and "1.5" survive re-renders — parsing on every keystroke would
    // coerce "0." back to 0 and strip the decimal point the user just typed.
    // Integer mode keeps the commit-on-keystroke behavior for back-compat.
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
      let newValue = parsed;
      if (min !== undefined && newValue < min) newValue = min;
      if (max !== undefined && newValue > max) newValue = max;
      onChange(newValue);
      setInputText(String(newValue));
    }, [allowDecimals, inputText, min, max, onChange, value]);

    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        if (allowDecimals) {
          setInputText(e.target.value);
          return;
        }
        const parsed = parseInt(e.target.value, 10);
        if (isNaN(parsed)) return;

        let newValue = parsed;
        if (min !== undefined && newValue < min) newValue = min;
        if (max !== undefined && newValue > max) newValue = max;
        onChange(newValue);
      },
      [min, max, onChange, allowDecimals]
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          handleIncrement();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          handleDecrement();
        } else if (e.key === 'Enter' && allowDecimals) {
          e.preventDefault();
          commitInputText();
        }
      },
      [handleIncrement, handleDecrement, allowDecimals, commitInputText]
    );

    const canDecrement = min === undefined || value > min;
    const canIncrement = max === undefined || value < max;

    const sizeStyles = {
      xs: {
        container: 'h-6',
        button: 'w-5 text-xs',
        inputWidth: 'w-8',
        inputText: 'text-xs',
        icon: 12,
      },
      sm: {
        container: 'h-8',
        button: 'w-7 text-sm',
        inputWidth: 'w-12',
        inputText: 'text-sm',
        icon: 14,
      },
      md: {
        container: 'h-9',
        button: 'w-8 text-sm',
        inputWidth: 'w-14',
        inputText: 'text-sm',
        icon: 16,
      },
      lg: {
        container: 'h-12',
        button: 'w-9 text-base',
        inputWidth: 'w-16',
        inputText: 'text-base',
        icon: 18,
      },
    };

    const styles = sizeStyles[size];
    const resolvedInputWidth = inputWidth ?? styles.inputWidth;

    return (
      <div
        className={`
          inline-flex items-center
          ${styles.container}
          bg-foreground/[0.02]
          border border-line-faint
          transition-[border-color,background,box-shadow] duration-200
          hover:border-foreground/30
          focus-within:border-primary/70
          focus-within:bg-primary/[0.04]
          ${CONTAINER_FOCUS_SHADOW}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
      >
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || !canDecrement}
          className={`
            ${styles.button}
            h-full
            flex items-center justify-center
            text-secondary-foreground
            hover:text-foreground hover:[text-shadow:0_0_8px_color-mix(in_srgb,currentColor_70%,transparent)]
            focus-visible:text-foreground focus-visible:[text-shadow:0_0_8px_color-mix(in_srgb,currentColor_70%,transparent)]
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-[color,text-shadow] duration-150
            border-r border-transparent
            ${DIVIDER}
            focus:outline-none
          `}
          aria-label="Decrease value"
        >
          <Minus size={styles.icon} />
        </button>

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
            ${resolvedInputWidth}
            ${styles.inputText}
            font-mono tracking-[0.04em]
            h-full
            text-center text-foreground
            bg-transparent
            border-none
            focus:outline-none
            disabled:cursor-not-allowed
            [appearance:textfield]
            [&::-webkit-outer-spin-button]:appearance-none
            [&::-webkit-inner-spin-button]:appearance-none
          `}
        />

        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || !canIncrement}
          className={`
            ${styles.button}
            h-full
            flex items-center justify-center
            text-secondary-foreground
            hover:text-foreground hover:[text-shadow:0_0_8px_color-mix(in_srgb,currentColor_70%,transparent)]
            focus-visible:text-foreground focus-visible:[text-shadow:0_0_8px_color-mix(in_srgb,currentColor_70%,transparent)]
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-[color,text-shadow] duration-150
            border-l border-transparent
            ${DIVIDER}
            focus:outline-none
          `}
          aria-label="Increase value"
        >
          <Plus size={styles.icon} />
        </button>
      </div>
    );
  }
);

NumberInput.displayName = 'NumberInput';
