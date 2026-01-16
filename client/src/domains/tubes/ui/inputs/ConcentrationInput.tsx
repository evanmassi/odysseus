import React from 'react';

import { AlertCircle, AlertTriangle } from 'lucide-react';

import { Select } from '@shared/ui';
import {
  formatToScientificNotation,
  isScientificNotationInput,
} from '@shared/utils/scientificNotation';

interface ConcentrationFieldProps {
  label: string;
  value: string;
  unitValue: string;
  onChange: (value: string) => void;
  onUnitChange: (unit: string) => void;
  placeholder?: string;
  disabled?: boolean;
  validation?: {
    error: boolean;
    warning: boolean;
    helperText: string | undefined;
    onBlur: () => void;
  };
  className?: string;
  badge?: React.ReactNode; // Optional badge/icon shown next to label
  hasConflict?: boolean; // Applies amber highlight for conflicting values in batch edit
}

export function ConcentrationInput({
  label,
  value,
  unitValue,
  onChange,
  onUnitChange,
  placeholder = 'e.g., 5e6',
  disabled = false,
  validation,
  className = '',
  badge,
  hasConflict = false,
}: ConcentrationFieldProps) {
  const unitOptions = [
    { value: '', label: '--' },
    { value: 'c/v', label: 'c/v' },
    { value: 'c/mL', label: 'c/mL' },
  ];

  const getInputClasses = () => {
    if (validation?.error) {
      return 'input-field input-field-error';
    } else if (validation?.warning) {
      return 'input-field border-2 border-validation-warning-border bg-validation-warning-bg text-validation-warning-text';
    } else if (hasConflict) {
      return 'input-field input-field-conflict';
    } else if (value && !validation?.error && !validation?.warning) {
      return 'input-field input-field-normal border-validation-success-border bg-validation-success-bg';
    } else {
      return 'input-field input-field-normal';
    }
  };

  const getLabelClasses = () => {
    const baseClasses = 'block text-sm font-medium mb-1';

    if (validation?.error) {
      return `${baseClasses} text-validation-error-label`;
    } else if (validation?.warning) {
      return `${baseClasses} text-validation-warning-label`;
    } else {
      return `${baseClasses} text-secondary-foreground`;
    }
  };

  // Format to scientific notation when appropriate
  const handleFormat = (inputValue: string): string => {
    if (!inputValue || inputValue.trim() === '') return inputValue;

    // If it's already in scientific notation format, keep it
    if (isScientificNotationInput(inputValue) || inputValue.includes('E')) {
      return inputValue;
    }

    // If it's a large number, format to scientific notation
    const numValue = parseFloat(inputValue);
    if (!isNaN(numValue) && numValue >= 1000) {
      return formatToScientificNotation(inputValue);
    }

    return inputValue;
  };

  const handleInputChange = (newValue: string) => {
    onChange(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLInputElement;
      const formatted = handleFormat(target.value);
      if (formatted !== target.value) {
        onChange(formatted);
      }
    }
  };

  const handleBlur = () => {
    const formatted = handleFormat(value);
    if (formatted !== value) {
      onChange(formatted);
    }

    // Call validation onBlur if provided
    if (validation?.onBlur) {
      validation.onBlur();
    }
  };

  return (
    <div className={className}>
      <label className={getLabelClasses()}>
        <span className="flex items-center gap-1.5">
          {label}
          {badge}
        </span>
      </label>

      <div className="flex gap-1">
        <input
          type="text"
          value={value}
          onChange={e => handleInputChange(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={`${getInputClasses()} flex-1 min-w-0`}
        />

        <div className="w-20 relative z-50 flex-shrink-0">
          <Select
            options={unitOptions}
            value={unitValue}
            onChange={newValue => onUnitChange(String(newValue ?? ''))}
            disabled={disabled}
            state={
              validation?.error
                ? 'error'
                : // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean OR logic for validation states
                  validation?.warning || hasConflict
                  ? 'warning'
                  : 'default'
            }
            fullWidth
          />
        </div>
      </div>

      {validation?.helperText && (
        <div
          className={`
          flex items-center mt-1 text-xs
          ${
            validation.error
              ? 'text-validation-error-helper'
              : validation.warning
                ? 'text-validation-warning-helper'
                : 'text-muted-foreground'
          }
        `}
        >
          {validation.error && (
            <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0 text-validation-error-icon" />
          )}
          {validation.warning && (
            <AlertTriangle className="w-4 h-4 mr-1 flex-shrink-0 text-validation-warning-icon" />
          )}
          <span>{validation.helperText}</span>
        </div>
      )}
    </div>
  );
}
