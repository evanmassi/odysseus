/**
 * Validated Input
 *
 * Form input wrapper that integrates React Hook Form registration with validation states.
 */

import React, { useRef, useEffect } from 'react';

import { AlertTriangle, AlertCircle } from 'lucide-react';

import { Input, Textarea } from '../../primitives';

import type { InputState } from '../../primitives/input/types';
import type { UseFormRegisterReturn } from 'react-hook-form';

interface ValidatedInputProps {
  label: string;
  registration?: UseFormRegisterReturn;
  onBlur?: () => void;
  type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'select' | 'textarea';
  placeholder?: string;
  error?: boolean;
  warning?: boolean;
  helperText?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  maxLength?: number;
  step?: string;
  children?: React.ReactNode;
  options?: Array<{ value: string; label: string }>;
  autoFocus?: boolean;
  badge?: React.ReactNode;
  hasConflict?: boolean; // Applies amber highlight for conflicting values in batch edit
  'aria-invalid'?: boolean;
  'data-testid'?: string;
}

export function ValidatedInput({
  label,
  registration,
  onBlur,
  type = 'text',
  placeholder,
  error = false,
  warning = false,
  helperText,
  className = '',
  disabled = false,
  required = false,
  maxLength,
  step,
  children,
  options,
  autoFocus = false,
  badge,
  hasConflict = false,
  ...ariaProps
}: ValidatedInputProps) {
  // More reliable than HTML autoFocus attribute which depends on browser timing
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      // Wait for modal animation before focusing
      // 150ms provides enough time without feeling sluggish
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getLabelClasses = () => {
    const baseClasses = 'block text-sm font-medium mb-1';

    if (error) {
      return `${baseClasses} text-danger-text`;
    } else if (warning) {
      return `${baseClasses} text-warning-text`;
    } else {
      return `${baseClasses} text-secondary-foreground`;
    }
  };

  const getHelperTextClasses = () => {
    const baseClasses = 'flex items-center mt-1 text-xs';

    if (error) {
      return `${baseClasses} text-danger-text`;
    } else if (warning) {
      return `${baseClasses} text-warning-text`;
    } else {
      return `${baseClasses} text-muted-foreground`;
    }
  };

  const getIcon = () => {
    if (error) {
      return <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0 text-danger-text" />;
    } else if (warning) {
      return <AlertTriangle className="w-4 h-4 mr-1 flex-shrink-0 text-warning-text" />;
    }
    return null;
  };

  const getInputState = (): InputState => {
    if (error) return 'error';
    if (warning) return 'warning';
    if (hasConflict) return 'warning'; // Conflict uses warning-like styling
    return 'default';
  };

  return (
    <div className={`${className}`}>
      <label className={getLabelClasses()}>
        <span className="flex items-center gap-1.5">
          <span>
            {label}
            {required && <span className="text-danger-bg">*</span>}
          </span>
          {badge}
        </span>
      </label>

      {type === 'select' ? (
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          {...registration}
          onBlur={onBlur}
          className="input-field input-field-normal w-full"
          disabled={disabled}
          {...ariaProps}
        >
          {options?.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
          {children}
        </select>
      ) : type === 'textarea' ? (
        <Textarea
          ref={registration?.ref}
          name={registration?.name}
          onChange={registration?.onChange}
          onBlur={registration?.onBlur}
          placeholder={placeholder}
          state={getInputState()}
          disabled={disabled}
          maxLength={maxLength}
          rows={1}
          resize="none"
          fullWidth
          className="pr-12"
          {...ariaProps}
        />
      ) : (
        <Input
          ref={registration?.ref}
          type={type}
          name={registration?.name}
          onChange={registration?.onChange}
          onBlur={registration?.onBlur}
          placeholder={placeholder}
          state={getInputState()}
          disabled={disabled}
          maxLength={maxLength}
          step={step}
          fullWidth
          {...ariaProps}
        />
      )}

      {helperText && (
        <div className={getHelperTextClasses()}>
          {getIcon()}
          <span>{helperText}</span>
        </div>
      )}
    </div>
  );
}
