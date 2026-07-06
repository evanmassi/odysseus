/**
 * Tube Concentration Field
 *
 * Paired numeric input + unit selector with scientific notation formatting.
 */

import React, { useRef, useState } from 'react';

import { formatConcentrationDisplay } from '@odysseus/shared-schemas';
import { AlertCircle, AlertTriangle } from 'lucide-react';

import { Input, Select, type InputState } from '@shared/ui';

const UNIT_OPTIONS = [
  { value: '', label: '--' },
  { value: 'c/v', label: 'c/v' },
  { value: 'c/mL', label: 'c/mL' },
];

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
  badge?: React.ReactNode;
  hasConflict?: boolean;
}

export function TubeConcentrationField({
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
  // useRef captures initial value on first render only
  const initialValueRef = useRef<string>(value);
  const initialUnitRef = useRef<string>(unitValue);
  const [isDirty, setIsDirty] = useState(false);

  const checkDirty = (newValue: string, newUnit: string) => {
    const valueChanged = newValue !== initialValueRef.current;
    const unitChanged = newUnit !== initialUnitRef.current;
    setIsDirty(valueChanged || unitChanged);
  };

  // Only show success state if user has actually edited the field
  const getInputState = (): InputState => {
    if (validation?.error) return 'error';
    if (validation?.warning) return 'warning';
    if (hasConflict) return 'warning';
    if (isDirty && value && !validation?.error && !validation?.warning) return 'success';
    return 'default';
  };

  const getLabelClasses = () => {
    const baseClasses = 'block type-label text-label-2xs tracking-label-wide mb-1.5';

    if (validation?.error) {
      return `${baseClasses} text-danger-text`;
    } else if (validation?.warning) {
      return `${baseClasses} text-warning-text`;
    } else {
      return `${baseClasses} text-muted-foreground`;
    }
  };

  const handleFormat = (inputValue: string): string => {
    if (!inputValue || inputValue.trim() === '') return inputValue;

    const numValue = parseFloat(inputValue);
    if (!isNaN(numValue) && numValue >= 1000) {
      return formatConcentrationDisplay(numValue);
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

    validation?.onBlur?.();
  };

  return (
    <div className={className}>
      <label className={getLabelClasses()}>
        <span className="flex items-center gap-1.5">
          {label}
          {badge}
        </span>
      </label>

      <div className="flex">
        <Input
          type="text"
          value={value}
          onValueChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          state={getInputState()}
          inputClassName="hover:z-10 focus:z-10"
          className="flex-1 min-w-0"
        />

        <div className="w-20 relative flex-shrink-0 -ml-px [&_[role=combobox]]:hover:z-10 [&_[role=combobox]]:focus-within:z-10">
          <Select
            options={UNIT_OPTIONS}
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
          flex items-center mt-1 text-body-sm
          ${
            validation.error
              ? 'text-danger-text'
              : validation.warning
                ? 'text-warning-text'
                : 'text-muted-foreground'
          }
        `}
        >
          {validation.error && (
            <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0 text-danger-text" />
          )}
          {validation.warning && (
            <AlertTriangle className="w-4 h-4 mr-1 flex-shrink-0 text-warning-text" />
          )}
          <span>{validation.helperText}</span>
        </div>
      )}
    </div>
  );
}
