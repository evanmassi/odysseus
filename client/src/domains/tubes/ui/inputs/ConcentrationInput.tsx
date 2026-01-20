import React, { useRef, useState } from 'react';

import { AlertCircle, AlertTriangle } from 'lucide-react';

import { Input, Select } from '@shared/ui';
import {
  formatToScientificNotation,
  isScientificNotationInput,
} from '@shared/utils/scientificNotation';

import type { InputState } from '@shared/ui/primitives/input/types';

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

  // Track initial values to determine if field was edited
  // useRef to capture initial value on first render only
  const initialValueRef = useRef<string>(value);
  const initialUnitRef = useRef<string>(unitValue);
  const [isDirty, setIsDirty] = useState(false);

  // Check if either value or unit has changed from initial
  const checkDirty = (newValue: string, newUnit: string) => {
    const valueChanged = newValue !== initialValueRef.current;
    const unitChanged = newUnit !== initialUnitRef.current;
    setIsDirty(valueChanged || unitChanged);
  };

  // Map validation state to InputState for the Input primitive
  // Only show success if user has actually edited the field
  const getInputState = (): InputState => {
    if (validation?.error) return 'error';
    if (validation?.warning) return 'warning';
    if (hasConflict) return 'warning';
    // Success only when: dirty (user edited) AND has value AND no errors
    if (isDirty && value && !validation?.error && !validation?.warning) return 'success';
    return 'default';
  };

  const getLabelClasses = () => {
    const baseClasses = 'block text-sm font-medium mb-1';

    if (validation?.error) {
      return `${baseClasses} text-danger-text`;
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
    checkDirty(newValue, unitValue);
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
        <Input
          type="text"
          value={value}
          onValueChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          state={getInputState()}
          className="flex-1 min-w-0"
        />

        <div className="w-20 relative z-50 flex-shrink-0">
          <Select
            options={unitOptions}
            value={unitValue}
            onChange={newValue => {
              const newUnit = String(newValue ?? '');
              onUnitChange(newUnit);
              checkDirty(value, newUnit);
            }}
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
              ? 'text-danger-text'
              : validation.warning
                ? 'text-validation-warning-helper'
                : 'text-muted-foreground'
          }
        `}
        >
          {validation.error && (
            <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0 text-danger-text" />
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
