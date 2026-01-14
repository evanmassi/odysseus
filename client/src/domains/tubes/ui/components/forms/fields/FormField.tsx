/**
 * Form Field Components
 *
 * Reusable, accessible form field components with consistent styling,
 * validation, and behavior across all forms.
 */

import React from 'react';

import { type CreateTubeRequest } from '@odysseus/shared-schemas';
import { get } from 'react-hook-form';

import type { UseFormReturn } from 'react-hook-form';

interface BaseFieldProps {
  form: UseFormReturn<CreateTubeRequest>;
  disabled?: boolean;
}

// Field paths for CreateTubeRequest (editable fields only, no location)
type TubeFormFieldPath =
  | 'researcherId'
  | 'sample.cellType'
  | 'sample.donorInternalId'
  | 'sample.donorSourceId'
  | 'sample.concentration'
  | 'sample.concentrationUnit'
  | 'sample.date'
  | 'sample.media'
  | 'sample.cultureCondition'
  | 'sample.lotNumber'
  | 'sample.notes';

interface TextFieldProps extends BaseFieldProps {
  name: TubeFormFieldPath;
  label: string;
  placeholder?: string;
  required?: boolean;
  type?: 'text' | 'number' | 'email';
  step?: string;
  min?: string;
  max?: string;
}

interface SelectFieldProps extends BaseFieldProps {
  name: TubeFormFieldPath;
  label: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  required?: boolean;
  placeholder?: string;
}

interface DateFieldProps extends BaseFieldProps {
  name: TubeFormFieldPath;
  label: string;
  required?: boolean;
}

interface TextAreaFieldProps extends BaseFieldProps {
  name: TubeFormFieldPath;
  label: string;
  placeholder?: string;
  rows?: number;
}

/**
 * Standard text input field with validation
 */
export const TextField: React.FC<TextFieldProps> = ({
  form,
  name,
  label,
  placeholder,
  required = false,
  disabled = false,
  type = 'text',
  step,
  min,
  max,
}) => {
  const error = get(form.formState.errors, name);

  return (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-medium text-text-primary">
        {label}
        {required && <span className="text-validation-error-required ml-1">*</span>}
      </label>
      <div className="relative">
        <input
          {...form.register(name)}
          id={name}
          type={type}
          step={step}
          min={min}
          max={max}
          placeholder={placeholder}
          disabled={disabled}
          className={`input-field w-full ${error ? 'input-field-error' : 'input-field-normal'}`}
        />
        {error && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-5 h-5 rounded-full bg-validation-error-icon flex items-center justify-center">
              <span className="text-white text-xs font-bold">!</span>
            </div>
          </div>
        )}
      </div>
      {error && (
        <p className="text-sm text-validation-error-helper flex items-center mt-1">
          <span className="mr-1">⚠️</span>
          {error.message}
        </p>
      )}
    </div>
  );
};

/**
 * Standard select field with validation
 */
export const SelectField: React.FC<SelectFieldProps> = ({
  form,
  name,
  label,
  options,
  required = false,
  disabled = false,
  placeholder = 'Select an option...',
}) => {
  const error = get(form.formState.errors, name);

  return (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-medium text-text-primary">
        {label}
        {required && <span className="text-validation-error-required ml-1">*</span>}
      </label>
      <div className="relative">
        <select
          {...form.register(name)}
          id={name}
          disabled={disabled}
          className={`input-field w-full ${error ? 'input-field-error' : 'input-field-normal'}`}
        >
          <option value="">{placeholder}</option>
          {options.map(option => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
            <div className="w-5 h-5 rounded-full bg-validation-error-icon flex items-center justify-center">
              <span className="text-white text-xs font-bold">!</span>
            </div>
          </div>
        )}
      </div>
      {error && (
        <p className="text-sm text-validation-error-helper flex items-center mt-1">
          <span className="mr-1">⚠️</span>
          {error.message}
        </p>
      )}
    </div>
  );
};

/**
 * Standard date input field with validation
 */
export const DateField: React.FC<DateFieldProps> = ({
  form,
  name,
  label,
  required = false,
  disabled = false,
}) => {
  const error = get(form.formState.errors, name);

  return (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-medium text-text-primary">
        {label}
        {required && <span className="text-validation-error-required ml-1">*</span>}
      </label>
      <div className="relative">
        <input
          {...form.register(name)}
          id={name}
          type="date"
          disabled={disabled}
          className={`input-field w-full ${error ? 'input-field-error' : 'input-field-normal'}`}
        />
        {error && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-5 h-5 rounded-full bg-validation-error-icon flex items-center justify-center">
              <span className="text-white text-xs font-bold">!</span>
            </div>
          </div>
        )}
      </div>
      {error && (
        <p className="text-sm text-validation-error-helper flex items-center mt-1">
          <span className="mr-1">⚠️</span>
          {error.message}
        </p>
      )}
    </div>
  );
};

/**
 * Standard textarea field with validation
 */
export const TextAreaField: React.FC<TextAreaFieldProps> = ({
  form,
  name,
  label,
  placeholder,
  rows = 3,
  disabled = false,
}) => {
  const error = get(form.formState.errors, name);

  return (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-medium text-text-primary">
        {label}
      </label>
      <div className="relative">
        <textarea
          {...form.register(name)}
          id={name}
          rows={rows}
          placeholder={placeholder}
          disabled={disabled}
          className={`input-field w-full resize-none ${error ? 'input-field-error' : 'input-field-normal'}`}
        />
        {error && (
          <div className="absolute right-3 top-3">
            <div className="w-5 h-5 rounded-full bg-validation-error-icon flex items-center justify-center">
              <span className="text-white text-xs font-bold">!</span>
            </div>
          </div>
        )}
      </div>
      {error && (
        <p className="text-sm text-validation-error-helper flex items-center mt-1">
          <span className="mr-1">⚠️</span>
          {error.message}
        </p>
      )}
    </div>
  );
};
