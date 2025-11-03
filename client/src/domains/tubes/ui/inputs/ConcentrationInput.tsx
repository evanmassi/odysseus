import React from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { ValidatedInput } from '@shared/ui';
import { formatToScientificNotation, isScientificNotationInput } from '@shared/utils/scientificNotation';

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
  className = ''
}: ConcentrationFieldProps) {
  
  const unitOptions = [
    { value: '', label: '--' },
    { value: 'c/v', label: 'c/v' },
    { value: 'c/mL', label: 'c/mL' }
  ];

  const getInputClasses = () => {
    if (validation?.error) {
      return 'input-field input-field-error';
    } else if (validation?.warning) {
      return 'input-field border-2 border-validation-warning-border bg-validation-warning-bg text-validation-warning-text';
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
      return `${baseClasses} text-odysseus-secondary`;
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
        {label}
      </label>
      
      <div className="flex gap-1">
        <input
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={`${getInputClasses()} flex-[7] min-w-0`}
        />
        
        <select
          value={unitValue}
          onChange={(e) => onUnitChange(e.target.value)}
          disabled={disabled}
          className={`${getInputClasses()} flex-[3] relative z-50`}
        >
          {unitOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      
      {validation?.helperText && (
        <div className={`
          flex items-center mt-1 text-xs
          ${validation.error
            ? 'text-validation-error-helper'
            : validation.warning
            ? 'text-validation-warning-helper'
            : 'text-odysseus-muted'
          }
        `}>
          {validation.error && <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0 text-validation-error-icon" />}
          {validation.warning && <AlertTriangle className="w-4 h-4 mr-1 flex-shrink-0 text-validation-warning-icon" />}
          <span>{validation.helperText}</span>
        </div>
      )}
    </div>
  );
}
