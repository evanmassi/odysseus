/**
 * Textarea
 *
 * Multi-line text input primitive with consistent styling and validation states.
 */

import { forwardRef } from 'react';
import type { ChangeEvent, FocusEvent } from 'react';

type TextareaState = 'default' | 'error' | 'warning' | 'success';
type TextareaSize = 'sm' | 'md' | 'lg';
type TextareaResize = 'none' | 'vertical' | 'horizontal' | 'both';

interface TextareaProps {
  value?: string;
  onChange?: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  /** Convenience handler that passes the string value directly */
  onValueChange?: (value: string) => void;
  onBlur?: (e: FocusEvent<HTMLTextAreaElement>) => void;
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

const SIZE_CLASSES: Record<TextareaSize, string> = {
  sm: 'px-2 py-1.5 text-body-sm',
  md: 'px-3 py-2 text-body',
  lg: 'px-4 py-3 text-body-lg',
};

const STATE_CLASSES: Record<TextareaState, string> = {
  default: 'border-line-faint hover:border-foreground/30',
  error: 'border-danger-border',
  warning: 'border-warning-border',
  success: 'border-success-border',
};

const RESIZE_CLASSES: Record<TextareaResize, string> = {
  none: 'resize-none',
  vertical: 'resize-y',
  horizontal: 'resize-x',
  both: 'resize',
};

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
    const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
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
          bg-[hsl(var(--input-well))] border
          text-foreground
          placeholder:text-foreground/40
          transition-[border-color,background,box-shadow] duration-200
          focus:outline-none focus:border-primary/70 focus:bg-primary/[0.04]
          focus:shadow-[var(--input-focus-shadow)]
          disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-line-faint
          read-only:cursor-default
          ${SIZE_CLASSES[size]}
          ${STATE_CLASSES[state]}
          ${RESIZE_CLASSES[resize]}
          ${className}
        `}
      />
    );
  }
);

Textarea.displayName = 'Textarea';
