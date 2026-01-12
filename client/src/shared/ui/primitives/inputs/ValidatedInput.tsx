import React, { useRef, useEffect } from 'react';

import { AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';

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
      return 'input-field w-full border-2 border-validation-warning-border bg-validation-warning-bg text-validation-warning-text';
    } else if (hasConflict) {
      return 'input-field input-field-conflict w-full';
    } else if (!isUncontrolled && value && !error && !warning) {
      return 'input-field input-field-normal w-full border-validation-success-border bg-validation-success-bg';
    } else {
      return 'input-field input-field-normal w-full';
    }
  };

  const getLabelClasses = () => {
    const baseClasses = 'block text-sm font-medium mb-1';

    if (error) {
      return `${baseClasses} text-validation-error-label`;
    } else if (warning) {
      return `${baseClasses} text-validation-warning-label`;
    } else {
      return `${baseClasses} text-odysseus-secondary`;
    }
  };

  const getHelperTextClasses = () => {
    const baseClasses = 'flex items-center mt-1 text-xs';

    if (error) {
      return `${baseClasses} text-validation-error-helper`;
    } else if (warning) {
      return `${baseClasses} text-validation-warning-helper`;
    } else {
      return `${baseClasses} text-odysseus-muted`;
    }
  };

  const getIcon = () => {
    if (error) {
      return <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0 text-validation-error-icon" />;
    } else if (warning) {
      return <AlertTriangle className="w-4 h-4 mr-1 flex-shrink-0 text-validation-warning-icon" />;
    } else if (!isUncontrolled && value && !error && !warning) {
      return <CheckCircle className="w-4 h-4 mr-1 flex-shrink-0 text-validation-success-icon" />;
    }
    return null;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  return (
    <div className={`${className}`}>
      <label className={getLabelClasses()}>
        <span className="flex items-center gap-1.5">
          {label}
          {required && <span className="text-validation-error-required">*</span>}
          {badge}
        </span>
      </label>

      {type === 'select' ? (
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          {...(isUncontrolled ? registration : { value, onChange: handleInputChange })}
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
      ) : type === 'textarea' ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          {...(isUncontrolled ? registration : { value, onChange: handleInputChange })}
          onBlur={onBlur}
          placeholder={placeholder}
          className={getInputClasses()}
          disabled={disabled}
          maxLength={maxLength}
          rows={2}
          {...ariaProps}
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type={type}
          {...(isUncontrolled ? registration : { value, onChange: handleInputChange })}
          onBlur={onBlur}
          placeholder={placeholder}
          className={getInputClasses()}
          disabled={disabled}
          maxLength={maxLength}
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
        <div className="text-xs text-gray-400 mt-1 text-right">
          {value.length}/{maxLength}
        </div>
      )}
    </div>
  );
}
