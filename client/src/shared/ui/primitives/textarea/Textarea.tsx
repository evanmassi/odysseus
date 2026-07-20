/**
 * Textarea
 *
 * Multi-line text input primitive with consistent styling and validation states.
 */

import { forwardRef } from 'react';
import type { ChangeEvent, FocusEvent } from 'react';

import { INPUT_WELL_BASE, INPUT_WELL_BORDER_DEFAULT } from '../input/fieldStyles';

type TextareaState = 'default' | 'error' | 'warning' | 'success';
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
  resize?: TextareaResize;
  fullWidth?: boolean;
  disabled?: boolean;
  name?: string;
  id?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  className?: string;
}

const STATE_CLASSES: Record<TextareaState, string> = {
  default: INPUT_WELL_BORDER_DEFAULT,
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
      resize = 'none',
      fullWidth = true,
      disabled = false,
      name,
      id,
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
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
        name={name}
        id={id}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid ?? state === 'error'}
        className={`
          ${fullWidth ? 'w-full' : 'w-auto'}
          ${INPUT_WELL_BASE}
          disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-line-faint
          px-3 py-2 text-body
          ${STATE_CLASSES[state]}
          ${RESIZE_CLASSES[resize]}
          ${className}
        `}
      />
    );
  }
);

Textarea.displayName = 'Textarea';
