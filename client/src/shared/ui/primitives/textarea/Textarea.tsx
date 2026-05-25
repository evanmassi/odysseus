/**
 * Textarea
 *
 * Multi-line text input primitive with consistent styling and validation states.
 */

import React, { forwardRef } from 'react';

export type TextareaState = 'default' | 'error' | 'warning' | 'success';
export type TextareaSize = 'sm' | 'md' | 'lg';
export type TextareaResize = 'none' | 'vertical' | 'horizontal' | 'both';

export interface TextareaProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  /** Convenience handler that passes the string value directly */
  onValueChange?: (value: string) => void;
  onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  state?: TextareaState;
  size?: TextareaSize;
  resize?: TextareaResize;
  fullWidth?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  name?: string;
  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-required'?: boolean;
  'aria-invalid'?: boolean;
  className?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      value,
      onChange,
      onValueChange,
      onBlur,
      placeholder,
      rows = 3,
      maxLength,
      state = 'default',
      size = 'md',
      resize = 'none',
      fullWidth = true,
      disabled = false,
      readOnly = false,
      name,
      id,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      'aria-describedby': ariaDescribedBy,
      'aria-required': ariaRequired,
      'aria-invalid': ariaInvalid,
      className = '',
    },
    ref
  ) => {
    const sizeClasses = {
      sm: 'px-2 py-1.5 text-xs',
      md: 'px-3 py-2 text-sm',
      lg: 'px-4 py-3 text-base',
    };

    const stateClasses = {
      default: 'border-line-faint hover:border-foreground/30',
      error: 'border-danger-border',
      warning: 'border-warning-border',
      success: 'border-success-border',
    };

    const resizeClasses = {
      none: 'resize-none',
      vertical: 'resize-y',
      horizontal: 'resize-x',
      both: 'resize',
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e);
      onValueChange?.(e.target.value);
    };

    return (
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onBlur={onBlur}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        disabled={disabled}
        readOnly={readOnly}
        name={name}
        id={id}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-required={ariaRequired}
        aria-invalid={ariaInvalid ?? state === 'error'}
        className={`
          ${fullWidth ? 'w-full' : 'w-auto'}
          bg-foreground/[0.02] border
          text-foreground
          placeholder:text-foreground/40
          transition-[border-color,background,box-shadow] duration-200
          focus:outline-none focus:border-primary/70 focus:bg-primary/[0.04]
          focus:shadow-[0_0_0_1px_hsl(var(--primary)/0.30),0_0_20px_-2px_hsl(var(--primary)/0.45),inset_0_0_12px_-4px_hsl(var(--primary)/0.25)]
          disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-line-faint
          read-only:cursor-default
          ${sizeClasses[size]}
          ${stateClasses[state]}
          ${resizeClasses[resize]}
          ${className}
        `}
      />
    );
  }
);

Textarea.displayName = 'Textarea';
