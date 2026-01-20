/**
 * Concentration Field Group Component
 *
 * Uses Zod validation from shared schemas.
 * Dependent field component implementing concentration/unit business rules.
 * Handles smart field dependencies with real-time validation and user feedback.
 */

import React, { useEffect } from 'react';

import { type CreateTubeRequest, type UpdateTubeRequest } from '@odysseus/shared-schemas';
import { Controller } from 'react-hook-form';

import { Select } from '@shared/ui';

import type { UseFormReturn } from 'react-hook-form';

/**
 * Form values union - supports both create and edit modes
 */
type TubeFormValues = CreateTubeRequest | UpdateTubeRequest;

interface ConcentrationFieldGroupProps {
  form: UseFormReturn<TubeFormValues>;
  disabled?: boolean;
}

/**
 * Smart concentration field group with dependent validation
 *
 * Business Rules:
 * 1. Concentration and unit must be provided together or both empty
 * 2. Auto-clear unit when concentration is cleared
 * 3. Auto-suggest default unit when concentration is entered
 * 4. Real-time validation feedback
 */
export const ConcentrationFieldGroup: React.FC<ConcentrationFieldGroupProps> = ({
  form,
  disabled = false,
}) => {
  const concentration = form.watch('sample.concentration');
  const concentrationUnit = form.watch('sample.concentrationUnit');

  // Smart field dependency logic (UX convenience, not authoritative validation)
  useEffect(() => {
    // Number-safe check - concentration is number | undefined from Zod preprocessing
    const hasConcentration = concentration !== undefined && concentration !== null;
    const hasUnit = !!concentrationUnit;

    // Auto-clear unit when concentration is cleared
    if (!hasConcentration && hasUnit) {
      form.setValue('sample.concentrationUnit', undefined, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });
    }

    // Auto-suggest default unit when concentration is entered
    if (hasConcentration && !hasUnit) {
      form.setValue('sample.concentrationUnit', 'c/v', {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });
    }
  }, [concentration, concentrationUnit, form]);

  return (
    <div className="space-y-4">
      {/* Concentration Field */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="concentration" className="block text-sm font-medium text-card-foreground">
            Concentration
          </label>
          <div className="relative">
            <input
              {...form.register('sample.concentration', {
                // Zod preprocessor handles conversion - keep number | undefined type
                setValueAs: v =>
                  v === '' || v === undefined || v === null ? undefined : Number(v),
                // Validation handled by zodResolver - no manual validation needed
              })}
              id="concentration"
              type="text"
              placeholder="e.g., 5e6, 1.5E7, 5000000"
              disabled={disabled}
              className={`input-field w-full ${form.formState.errors.sample?.concentration ? 'input-field-error' : 'input-field-normal'}`}
            />
            {form.formState.errors.sample?.concentration && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-5 h-5 rounded-full bg-danger-bg flex items-center justify-center">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
              </div>
            )}
          </div>
          {form.formState.errors.sample?.concentration && (
            <p className="text-sm text-danger-text flex items-center mt-1">
              <span className="mr-1">⚠️</span>
              {form.formState.errors.sample?.concentration.message}
            </p>
          )}
        </div>

        {/* Concentration Unit Field */}
        <div className="space-y-2">
          <label
            htmlFor="concentrationUnit"
            className="block text-sm font-medium text-card-foreground"
          >
            Unit
            {/* Number-safe check - required when concentration is provided */}
            {concentration !== undefined && concentration !== null && (
              <span className="text-danger-bg ml-1">*</span>
            )}
          </label>
          <Controller
            control={form.control}
            name="sample.concentrationUnit"
            render={({ field }) => (
              <Select
                options={[
                  { value: '', label: 'Select unit...' },
                  { value: 'c/v', label: 'c/v (cells per volume)' },
                  { value: 'c/mL', label: 'c/mL (cells per milliliter)' },
                ]}
                value={field.value ?? ''}
                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty string should also become undefined
                onChange={value => field.onChange(value || undefined)}
                disabled={disabled}
                state={form.formState.errors.sample?.concentrationUnit ? 'error' : 'default'}
                fullWidth
              />
            )}
          />
          {form.formState.errors.sample?.concentrationUnit && (
            <p className="text-sm text-danger-text flex items-center mt-1">
              <span className="mr-1">⚠️</span>
              {form.formState.errors.sample?.concentrationUnit.message}
            </p>
          )}
        </div>
      </div>

      {/* Smart Field Hint */}
      {(concentration ?? concentrationUnit) ? (
        <div className="flex items-center space-x-2 text-sm text-secondary-foreground bg-muted/50 rounded-lg p-3 border border-border/50">
          <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs">i</span>
          </div>
          <p>
            {concentration && concentrationUnit
              ? `Concentration: ${concentration} ${concentrationUnit}`
              : 'Both concentration value and unit are required together'}
          </p>
        </div>
      ) : null}
    </div>
  );
};
