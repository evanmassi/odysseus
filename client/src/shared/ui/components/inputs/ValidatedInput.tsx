import React, { useRef, useEffect, useCallback } from 'react';

import { AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';

import { Input, Select, Textarea } from '../../primitives';

import type { InputState } from '../../primitives/input/types';
import type { UseFormRegisterReturn } from 'react-hook-form';

interface ValidationAwareInputProps {
  label: string;

  // Controlled mode (legacy)
  value?: string;
  onChange?: (value: string) => void;

  // Uncontrolled mode (React Hook Form register)
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
  children?: React.ReactNode;
  options?: Array<{ value: string; label: string }>; // For select type
  autoFocus?: boolean;
  badge?: React.ReactNode; // Optional badge/icon shown next to label
  hasConflict?: boolean; // Applies amber highlight for conflicting values in batch edit
  'aria-invalid'?: boolean;
  'data-testid'?: string;
}

export function ValidatedInput({
  label,
  value,
  onChange,
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
  children,
  options,
  autoFocus = false,
  badge,
  hasConflict = false,
  ...ariaProps
}: ValidationAwareInputProps) {
  // Determine if controlled or uncontrolled
  const isUncontrolled = Boolean(registration);

  // Programmatic focus using ref + useEffect
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
  }, []); // Run once on mount when autoFocus is true

  const getInputClasses = () => {
    if (error) {
      return 'input-field input-field-error w-full';
    } else if (warning) {
      return 'input-field w-full border-2 border-warning-border';
    } else if (hasConflict) {
      return 'input-field input-field-conflict w-full';
    } else if (!isUncontrolled && value && !error && !warning) {
      return 'input-field w-full border-2 border-success-border';
    } else {
      return 'input-field input-field-normal w-full';
    }
  };

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
    } else if (!isUncontrolled && value && !error && !warning) {
      return <CheckCircle className="w-4 h-4 mr-1 flex-shrink-0 text-success-text" />;
    }
    return null;
  };

  // Handle controlled mode change - convert event to value for parent
  const handleControlledChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      onChange?.(e.target.value);
    },
    [onChange]
  );

  // Determine InputState for the Input primitive
  const getInputState = (): InputState => {
    if (error) return 'error';
    if (warning) return 'warning';
    if (hasConflict) return 'warning'; // Conflict uses warning-like styling
    if (!isUncontrolled && value && !error && !warning) return 'success';
    return 'default';
  };

  return (
    <div className={`${className}`}>
      <label className={getLabelClasses()}>
        <span className="flex items-center gap-1.5">
          {label}
          {required && <span className="text-danger-bg">*</span>}
          {badge}
        </span>
      </label>

      {type === 'select' ? (
        // Use Select primitive for controlled mode, native select for uncontrolled (registration)
        isUncontrolled ? (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            {...registration}
            onBlur={onBlur}
            className={getInputClasses()}
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
        ) : (
          <Select
            options={options ?? []}
            value={value ?? ''}
            onChange={newValue => onChange?.(String(newValue ?? ''))}
            disabled={disabled}
            state={error ? 'error' : warning ? 'warning' : hasConflict ? 'warning' : 'default'}
            fullWidth
          />
        )
      ) : type === 'textarea' ? (
        <Textarea
          ref={
            isUncontrolled ? registration?.ref : (inputRef as React.RefObject<HTMLTextAreaElement>)
          }
          name={registration?.name}
          value={isUncontrolled ? undefined : value}
          onChange={isUncontrolled ? registration?.onChange : handleControlledChange}
          onBlur={isUncontrolled ? registration?.onBlur : onBlur}
          placeholder={placeholder}
          state={getInputState()}
          disabled={disabled}
          maxLength={maxLength}
          rows={2}
          resize="none"
          fullWidth
          {...ariaProps}
        />
      ) : (
        // Use Input primitive for text, email, password, number, date types
        <Input
          ref={isUncontrolled ? registration?.ref : (inputRef as React.RefObject<HTMLInputElement>)}
          type={type}
          name={registration?.name}
          value={isUncontrolled ? undefined : value}
          onChange={isUncontrolled ? registration?.onChange : handleControlledChange}
          onBlur={isUncontrolled ? registration?.onBlur : onBlur}
          placeholder={placeholder}
          state={getInputState()}
          disabled={disabled}
          maxLength={maxLength}
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

      {/* Character count for long fields */}
      {maxLength && !isUncontrolled && value && (
        <div className="text-xs text-muted-foreground mt-1 text-right">
          {value.length}/{maxLength}
        </div>
      )}
    </div>
  );
}
