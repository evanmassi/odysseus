/**
 * Input Component
 *
 * Text/number input with size and state variants.
 */

import { forwardRef, useCallback } from 'react';
import type { ChangeEvent } from 'react';

import { cva } from 'class-variance-authority';

import { INPUT_WELL_BASE, INPUT_WELL_BORDER_DEFAULT } from './fieldStyles';
import { defaultInputProps } from './types';

import type { InputProps, InputRef } from './types';

const wrapperVariants = cva(['relative flex flex-col'], {
  variants: {
    fullWidth: {
      true: 'w-full',
      false: 'w-auto',
    },
  },
  defaultVariants: {
    fullWidth: false,
  },
});

const inputVariants = cva(
  [
    'w-full relative',
    INPUT_WELL_BASE,
    INPUT_WELL_BORDER_DEFAULT,
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-line-faint',
    'read-only:cursor-default',
  ],
  {
    variants: {
      size: {
        xs: 'h-7 px-2 text-body-sm',
        sm: 'h-8 px-3 text-body',
        md: 'h-9 px-3 text-body',
      },

      state: {
        default: '',
        error: 'border-danger-border',
        warning: 'border-warning-border',
        success: 'border-success-border',
      },

      fullWidth: {
        true: 'w-full',
        false: 'w-auto',
      },
    },

    defaultVariants: {
      size: 'md',
      state: 'default',
      fullWidth: false,
    },
  }
);

// Hide the native number spinners so numeric fields match text fields.
const NUMBER_SPINNER_HIDDEN =
  ' [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

export const Input = forwardRef<InputRef, InputProps>(
  (
    {
      size = defaultInputProps.size,
      state = defaultInputProps.state,
      fullWidth = defaultInputProps.fullWidth,
      className,
      inputClassName,
      type = defaultInputProps.type,
      onChange,
      onValueChange,
      'aria-invalid': ariaInvalid,
      ...props
    },
    ref
  ) => {
    const handleChange = useCallback(
      (event: ChangeEvent<HTMLInputElement>) => {
        onChange?.(event);
        onValueChange?.(event.target.value);
      },
      [onChange, onValueChange]
    );

    const inputClasses = inputVariants({ size, state, fullWidth, className: inputClassName });

    return (
      <div className={wrapperVariants({ fullWidth, className })}>
        <input
          ref={ref}
          type={type}
          className={`${inputClasses}${type === 'number' ? NUMBER_SPINNER_HIDDEN : ''}`}
          aria-invalid={ariaInvalid ?? state === 'error'}
          onChange={handleChange}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = 'Input';
