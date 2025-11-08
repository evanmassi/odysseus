/**
 * Tube Form Component
 *
 * Uses API schema directly, supports both create and edit modes:
 * - Form fields match CreateTubeRequest/UpdateTubeRequest
 * - No transformation needed
 * - Media uses structured object: { type, supplements, selection }
 * - Concentration handled by ConcentrationInput with Zod preprocessing
 *
 * Compact 4-row layout:
 * - Row 1: Donor Information (Cell Type*, Internal ID, Source ID)
 * - Row 2: Sample Information Part 1 (Concentration + Unit, Media Type, Supplements, Selection)
 * - Row 3: Sample Information Part 2 (Culture Condition, Lot #, Date, Researcher)
 * - Row 4: Notes
 *
 * * = Required field (only Cell Type)
 */

import {
  type CreateTubeRequest,
  type UpdateTubeRequest,
  type Researcher,
  formatResearcherDropdownDisplay
} from '@odysseus/shared-schemas';
import { Controller } from 'react-hook-form';

import { ValidatedInput } from '@shared/ui';

import { ConcentrationInput } from '../../inputs/ConcentrationInput';

import type { Control, UseFormRegister, FieldErrors, UseFormTrigger} from 'react-hook-form';

/**
 * Form values union - supports both create and edit modes
 */
type TubeFormValues = CreateTubeRequest | UpdateTubeRequest;

export interface TubeFormProps {
  control: Control<TubeFormValues>;
  register: UseFormRegister<TubeFormValues>;
  errors: FieldErrors<TubeFormValues>;
  trigger: UseFormTrigger<TubeFormValues>;
  researchers: Researcher[];
  isLoading: boolean;
}

export const TubeForm = ({
  control,
  register,
  errors,
  trigger,
  researchers,
  isLoading
}: TubeFormProps) => {
  // Helper function to get field errors from nested React Hook Form structure
  const getFieldError = (fieldPath: string, errors: FieldErrors<CreateTubeRequest>): string | undefined => {
    const pathParts = fieldPath.split('.');
    let currentError = errors as any;

    for (const part of pathParts) {
      if (currentError?.[part]) {
        currentError = currentError[part];
      } else {
        return undefined;
      }
    }

    return currentError?.message;
  };

  // Helper to get concentration field errors (checks both nested and refinement errors)
  const getConcentrationError = (): string | undefined => {
    // Check for direct concentration field error
    const directError = getFieldError('sample.concentration', errors);
    if (directError) return directError;

    // Check for concentrationUnit field error
    const unitError = getFieldError('sample.concentrationUnit', errors);
    if (unitError) return unitError;

    // Check for refinement error at sample level (concentration/unit invariant)
    const sampleError = (errors as any)?.sample;
    if (sampleError && typeof sampleError.message === 'string') {
      return sampleError.message;
    }

    return undefined;
  };

  return (
    <div className="space-y-3">
      {/* ROW 1: DONOR INFORMATION */}
      <div className="space-y-1.5">
        <h3 className="text-xs font-semibold text-storage-tank-hover tracking-wide uppercase">Donor Information</h3>
        <div className="grid grid-cols-3 gap-2.5">
          <ValidatedInput
            label="Cell Type"
            type="text"
            placeholder="e.g., Jurkat, HEK293"
            registration={register('sample.cellType')}
            error={Boolean(getFieldError('sample.cellType', errors))}
            helperText={getFieldError('sample.cellType', errors)}
            disabled={isLoading}
            required
          />
          <ValidatedInput
            label="Internal ID"
            type="text"
            placeholder="Internal tracking ID"
            registration={register('sample.donorInternalId')}
            error={Boolean(getFieldError('sample.donorInternalId', errors))}
            helperText={getFieldError('sample.donorInternalId', errors)}
            disabled={isLoading}
          />
          <ValidatedInput
            label="Source ID"
            type="text"
            placeholder="Original source ID"
            registration={register('sample.donorSourceId')}
            error={Boolean(getFieldError('sample.donorSourceId', errors))}
            helperText={getFieldError('sample.donorSourceId', errors)}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* ROW 2: SAMPLE INFORMATION (PART 1) - Media Fields */}
      <div className="space-y-1.5">
        <h3 className="text-xs font-semibold text-storage-rack-hover tracking-wide uppercase">Sample Information</h3>
        <div className="grid grid-cols-4 gap-2.5">
          <div>
            <Controller
              name="sample.concentration"
              control={control}
              render={({ field: { value, onChange } }) => (
                <Controller
                  name="sample.concentrationUnit"
                  control={control}
                  render={({ field: { value: unitValue, onChange: onUnitChange } }) => (
                    <ConcentrationInput
                      label="Concentration"
                      value={String(value || '')}
                      unitValue={unitValue || ''}
                      onChange={onChange}
                      onUnitChange={async (newUnit) => {
                        onUnitChange(newUnit);
                        await trigger('sample');
                      }}
                      placeholder="e.g., 5e6"
                      disabled={isLoading}
                      validation={{
                        error: Boolean(getConcentrationError()),
                        warning: false,
                        helperText: getConcentrationError(),
                        onBlur: () => {}
                      }}
                    />
                  )}
                />
              )}
            />
          </div>
          <ValidatedInput
            label="Media Type"
            type="text"
            placeholder="e.g., RPMI-1640"
            registration={register('sample.media.type')}
            error={Boolean(getFieldError('sample.media.type', errors))}
            helperText={getFieldError('sample.media.type', errors)}
            disabled={isLoading}
          />
          <ValidatedInput
            label="Supplements"
            type="text"
            placeholder="e.g., 10% FBS"
            registration={register('sample.media.supplements')}
            error={Boolean(getFieldError('sample.media.supplements', errors))}
            helperText={getFieldError('sample.media.supplements', errors)}
            disabled={isLoading}
          />
          <ValidatedInput
            label="Selection"
            type="text"
            placeholder="e.g., Puromycin"
            registration={register('sample.media.selection')}
            error={Boolean(getFieldError('sample.media.selection', errors))}
            helperText={getFieldError('sample.media.selection', errors)}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* ROW 3: SAMPLE INFORMATION (PART 2) */}
      <div className="grid grid-cols-4 gap-2.5">
        <ValidatedInput
          label="Culture Condition"
          type="text"
          placeholder="e.g., 5% O₂, 37°C"
          registration={register('sample.cultureCondition')}
          error={Boolean(getFieldError('sample.cultureCondition', errors))}
          helperText={getFieldError('sample.cultureCondition', errors)}
          disabled={isLoading}
        />
        <ValidatedInput
          label="Lot #"
          type="text"
          placeholder="LOT001"
          registration={register('sample.lotNumber')}
          error={Boolean(getFieldError('sample.lotNumber', errors))}
          helperText={getFieldError('sample.lotNumber', errors)}
          disabled={isLoading}
        />
        <ValidatedInput
          label="Date"
          type="date"
          registration={register('sample.date')}
          error={Boolean(getFieldError('sample.date', errors))}
          helperText={getFieldError('sample.date', errors)}
          disabled={isLoading}
        />
        <ValidatedInput
          label="Researcher"
          type="select"
          registration={register('researcherId')}
          error={Boolean(getFieldError('researcherId', errors))}
          helperText={getFieldError('researcherId', errors)}
          disabled={isLoading}
          options={[
            { value: '', label: 'Select researcher...' },
            ...researchers.map(r => ({
              value: r.id,
              label: formatResearcherDropdownDisplay(r)
            }))
          ]}
        />
      </div>

      {/* ROW 4: NOTES */}
      <div className="space-y-1.5">
        <h3 className="text-xs font-semibold text-storage-box-hover tracking-wide uppercase">Notes</h3>
        <ValidatedInput
          label=""
          type="textarea"
          maxLength={500}
          placeholder="Additional notes and observations..."
          registration={register('sample.notes')}
          error={Boolean(getFieldError('sample.notes', errors))}
          helperText={getFieldError('sample.notes', errors)}
          disabled={isLoading}
        />
      </div>
    </div>
  );
};
