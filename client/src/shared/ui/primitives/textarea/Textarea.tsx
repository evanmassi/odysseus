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
    // Size classes
    const sizeClasses = {
      sm: 'px-2 py-1.5 text-xs rounded-sm',
      md: 'px-3 py-2 text-sm rounded-md',
      lg: 'px-4 py-3 text-base rounded-lg',
    };

    const stateClasses = {
      default: 'border-border hover:border-muted-foreground',
      error: 'border-2 border-danger-border',
      warning: 'border-2 border-warning-border',
      success: 'border-2 border-success-border',
    };

    // Resize classes
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
          bg-card border
          text-card-foreground
          placeholder:text-muted-foreground placeholder:opacity-40
          transition-colors duration-200
          disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted
          read-only:cursor-default read-only:bg-muted
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
