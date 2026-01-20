/**
 * Auth Input
 *
 * Floating-label input for authentication forms with validation state styling.
 */

import React, { forwardRef, useState } from 'react';

import { Eye, EyeOff } from 'lucide-react';

export type AuthInputValidationState = 'default' | 'success' | 'warning' | 'error';

export interface AuthInputProps {
  /** HTML id for label association */
  id: string;
  /** Input type */
  type?: 'text' | 'password' | 'email';
  /** Current value */
  value: string;
  /** Called when value changes */
  onChange: (value: string) => void;
  /** Called when input loses focus */
  onBlur?: () => void;
  /** Floating label text */
  label: string;
  /** Placeholder text */
  placeholder?: string;
  /** Icon displayed on the left side */
  icon?: React.ReactNode;
  /** Validation state controlling border and label colors */
  state?: AuthInputValidationState;
  /** Show required asterisk after label */
  required?: boolean;
  /** Disable the input */
  disabled?: boolean;
  /** Maximum character length */
  maxLength?: number;
  /** Auto-focus the input on mount */
  autoFocus?: boolean;
  /** Additional class for the container */
  className?: string;
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  (
    {
      id,
      type = 'text',
      value,
      onChange,
      onBlur,
      label,
      placeholder,
      icon,
      state = 'default',
      required = false,
      disabled = false,
      maxLength,
      autoFocus = false,
      className = '',
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);

    const isPasswordType = type === 'password';
    const effectiveType = isPasswordType && showPassword ? 'text' : type;

    // Border classes based on validation state
    const borderClass = {
      default: 'border-border',
      success: 'border-success-border',
      warning: 'border-warning-border',
      error: 'input-field-error',
    }[state];

    // Label color based on validation state
    const labelColorClass = {
      default: 'text-muted-foreground',
      success: 'text-success-text',
      warning: 'text-warning-text',
      error: 'text-danger-text',
    }[state];

    // Icon color based on validation state
    const iconColorClass = {
      default: 'text-muted-foreground',
      success: 'text-success-text',
      warning: 'text-warning-text',
      error: 'text-danger-text',
    }[state];

    // Input text color based on validation state
    const inputTextClass =
      state === 'error'
        ? 'text-danger-text'
        : state === 'warning'
          ? 'text-warning-text'
          : 'text-foreground';

    return (
      <div className={`auth-input-container ${borderClass} ${className}`}>
        <label
          htmlFor={id}
          className={`absolute -top-2 left-3 bg-card px-1 text-[10px] font-medium transition-colors ${labelColorClass}`}
        >
          {label}
          {required && <span className="text-danger-text"> *</span>}
        </label>
        <div className="relative px-3 py-2">
          {icon && (
            <span
              className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${iconColorClass}`}
            >
              {icon}
            </span>
          )}
          <input
            ref={ref}
            type={effectiveType}
            id={id}
            value={value}
            onChange={e => onChange(e.target.value)}
            onBlur={onBlur}
            disabled={disabled}
            required={required}
            maxLength={maxLength}
            // eslint-disable-next-line jsx-a11y/no-autofocus -- Controlled by parent for intentional UX
            autoFocus={autoFocus}
            className={`${icon ? 'pl-7' : ''} ${isPasswordType ? 'pr-8' : ''} text-sm placeholder:text-muted-foreground placeholder:opacity-40 ${inputTextClass}`}
            placeholder={placeholder}
          />
          {isPasswordType && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-secondary-foreground rounded"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
        </div>
      </div>
    );
  }
);

AuthInput.displayName = 'AuthInput';
