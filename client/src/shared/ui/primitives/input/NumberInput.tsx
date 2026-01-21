/**
 * Number Input
 *
 * Custom number input with increment/decrement buttons replacing native spinners.
 */

import React, { forwardRef, useCallback } from 'react';

import { Minus, Plus } from 'lucide-react';

export interface NumberInputProps {
  /** Current value */
  value: number;
  /** Called when value changes */
  onChange: (value: number) => void;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Step increment */
  step?: number;
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Accessible label */
  'aria-label'?: string;
  /** Additional class name for the container */
  className?: string;
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
      'aria-label': ariaLabel,
      className = '',
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

    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const parsed = parseInt(e.target.value, 10);
        if (isNaN(parsed)) return;

        let newValue = parsed;
        if (min !== undefined && newValue < min) newValue = min;
        if (max !== undefined && newValue > max) newValue = max;
        onChange(newValue);
      },
      [min, max, onChange]
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          handleIncrement();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          handleDecrement();
        }
      },
      [handleIncrement, handleDecrement]
    );

    const canDecrement = min === undefined || value > min;
    const canIncrement = max === undefined || value < max;

    const sizeStyles = {
      xs: {
        container: 'h-6',
        button: 'w-5 text-xs',
        input: 'w-8 text-xs',
        icon: 12,
      },
      sm: {
        container: 'h-8',
        button: 'w-7 text-sm',
        input: 'w-12 text-sm',
        icon: 14,
      },
      md: {
        container: 'h-9',
        button: 'w-8 text-sm',
        input: 'w-14 text-sm',
        icon: 16,
      },
      lg: {
        container: 'h-12',
        button: 'w-9 text-base',
        input: 'w-16 text-base',
        icon: 18,
      },
    };

    const styles = sizeStyles[size];

    return (
      <div
        className={`
          inline-flex items-center
          ${styles.container}
          border border-border rounded-md
          bg-card
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
      >
        {/* Decrement button */}
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || !canDecrement}
          className={`
            ${styles.button}
            h-full
            flex items-center justify-center
            text-secondary-foreground
            hover:bg-muted hover:text-foreground
            disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent
            transition-colors
            rounded-l-md
            border-r border-border
            focus:outline-none focus:ring-2 focus:ring-inset focus:ring-action-focus
          `}
          aria-label="Decrease value"
        >
          <Minus size={styles.icon} />
        </button>

        {/* Input field */}
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-label={ariaLabel}
          className={`
            ${styles.input}
            h-full
            text-center
            bg-transparent
            border-none
            focus:outline-none
            disabled:cursor-not-allowed
            [appearance:textfield]
            [&::-webkit-outer-spin-button]:appearance-none
            [&::-webkit-inner-spin-button]:appearance-none
          `}
        />

        {/* Increment button */}
        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || !canIncrement}
          className={`
            ${styles.button}
            h-full
            flex items-center justify-center
            text-secondary-foreground
            hover:bg-muted hover:text-foreground
            disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent
            transition-colors
            rounded-r-md
            border-l border-border
            focus:outline-none focus:ring-2 focus:ring-inset focus:ring-action-focus
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
