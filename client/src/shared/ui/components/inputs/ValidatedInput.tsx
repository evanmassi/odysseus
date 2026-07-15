/**
 * Validated Input
 *
 * Form input wrapper that integrates React Hook Form registration with validation states.
 */

import type { ReactNode } from 'react';

import { AlertCircle } from 'lucide-react';

import { Input, Textarea } from '../../primitives';

import type { InputState } from '../../primitives/input/types';
import type { UseFormRegisterReturn } from 'react-hook-form';

interface ValidatedInputProps {
  label: string;
  registration?: UseFormRegisterReturn;
  type?: 'text' | 'number' | 'textarea';
  placeholder?: string;
  error?: boolean;
  helperText?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  maxLength?: number;
  step?: string;
  badge?: ReactNode;
  hasConflict?: boolean;
  /** Label typography. 'default' = title-case sans; 'compact' = uppercase mono micro-label. */
  labelStyle?: 'default' | 'compact';
}

export function ValidatedInput({
  label,
  registration,
  type = 'text',
  placeholder,
  error = false,
  helperText,
  className = '',
  disabled = false,
  required = false,
  maxLength,
  step,
  badge,
  hasConflict = false,
  labelStyle = 'default',
}: ValidatedInputProps) {
  const getLabelClasses = () => {
    const baseClasses =
      labelStyle === 'compact'
        ? 'block type-label text-label-2xs tracking-label-wide mb-1.5'
        : 'block text-body-sm font-medium mb-1';

    if (error) {
      return `${baseClasses} text-danger-text`;
    } else if (labelStyle === 'compact') {
      return `${baseClasses} text-muted-foreground`;
    } else {
      return `${baseClasses} text-secondary-foreground`;
    }
  };

  const getHelperTextClasses = () => {
    const baseClasses = 'flex items-center mt-1 text-caption';
    return error ? `${baseClasses} text-danger-text` : `${baseClasses} text-muted-foreground`;
  };

  const getInputState = (): InputState => {
    if (error) return 'error';
    if (hasConflict) return 'warning';
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

      {type === 'textarea' ? (
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
        />
      )}

      {helperText && (
        <div className={getHelperTextClasses()}>
          {error && <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0 text-danger-text" />}
          <span>{helperText}</span>
        </div>
      )}
    </div>
  );
}
