/**
 * Tube Form Component
 *
 * Compact 5-row form layout for tube create/edit with admin-managed dropdowns.
 */

import {
  type CreateTubeRequest,
  type UpdateTubeRequest,
  type Researcher,
  formatResearcherDropdownDisplay,
} from '@odysseus/shared-schemas';
import { AlertTriangle } from 'lucide-react';
import { Controller } from 'react-hook-form';

import { Select, ValidatedInput } from '@shared/ui';

import { ConcentrationInput } from '../../inputs/ConcentrationInput';

import type { SelectOption } from '@shared/ui/primitives/select/types';
import type { Control, UseFormRegister, FieldErrors, UseFormTrigger } from 'react-hook-form';

const CONFLICT_FIELD_MAP: Record<string, string> = {
  cellType: 'sample.cellType',
  donorInternalId: 'sample.donorInternalId',
  donorSourceId: 'sample.donorSourceId',
  concentration: 'sample.concentration',
  concentrationUnit: 'sample.concentration',
  date: 'sample.date',
  'media.type': 'sample.media.type',
  'media.supplements': 'sample.media.supplements',
  'media.selection': 'sample.media.selection',
  cultureCondition: 'sample.cultureCondition',
  lotNumber: 'sample.lotNumber',
  species: 'sample.species',
  vendor: 'sample.vendor',
  catalogNumber: 'sample.catalogNumber',
  passageNumber: 'sample.passageNumber',
  notes: 'sample.notes',
  researcherId: 'researcherId',
};

// Conflict indicator icon for fields with mixed values
const ConflictIcon = () => <AlertTriangle className="w-3.5 h-3.5 text-warning-text" />;

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
  speciesOptions: SelectOption[];
  vendorOptions: SelectOption[];
  isLoading: boolean;
  conflictingFields?: string[];
}

export const TubeForm = ({
  control,
  register,
  errors,
  trigger,
  researchers,
  speciesOptions,
  vendorOptions,
  isLoading,
  conflictingFields = [],
}: TubeFormProps) => {
  // Check if a field path has a conflict
  const hasConflict = (fieldPath: string): boolean => {
    return conflictingFields.some(conflictKey => CONFLICT_FIELD_MAP[conflictKey] === fieldPath);
  };

  // Get conflict indicator for a field
  const getConflictBadge = (fieldPath: string) => {
    return hasConflict(fieldPath) ? <ConflictIcon /> : undefined;
  };

  // Helper function to get field errors from nested React Hook Form structure
  const getFieldError = (
    fieldPath: string,
    errors: FieldErrors<CreateTubeRequest>
  ): string | undefined => {
    const pathParts = fieldPath.split('.');
    let currentError: unknown = errors;

    for (const part of pathParts) {
      if (currentError && typeof currentError === 'object' && part in currentError) {
        currentError = (currentError as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    if (currentError && typeof currentError === 'object' && 'message' in currentError) {
      return (currentError as { message?: string }).message;
    }

    return undefined;
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
    const sampleError = errors.sample;
    if (
      sampleError &&
      typeof sampleError === 'object' &&
      'message' in sampleError &&
      typeof sampleError.message === 'string'
    ) {
      return sampleError.message;
    }

    return undefined;
  };

  return (
    <div className="space-y-3">
      {/* ROW 1: Donor Information */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h3 className="text-[10px] font-medium text-muted-foreground">Donor information</h3>
          <div className="flex-1 h-px bg-secondary"></div>
        </div>
        <div className="grid grid-cols-4 gap-2.5">
          <ValidatedInput
            label="Cell Type"
            type="text"
            placeholder="e.g., Jurkat, HEK293"
            registration={register('sample.cellType')}
            error={Boolean(getFieldError('sample.cellType', errors))}
            helperText={getFieldError('sample.cellType', errors)}
            disabled={isLoading}
            required
            badge={getConflictBadge('sample.cellType')}
            hasConflict={hasConflict('sample.cellType')}
          />
          <Controller
            name="sample.species"
            control={control}
            render={({ field: { value, onChange } }) => {
              const error = getFieldError('sample.species', errors);
              const hasFieldConflict = hasConflict('sample.species');
              return (
                <div>
                  <label
                    className={`block text-sm font-medium mb-1 ${
                      error ? 'text-danger-text' : 'text-secondary-foreground'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      Species
                      {getConflictBadge('sample.species')}
                    </span>
                  </label>
                  <Select
                    options={[{ value: '', label: 'Select species...' }, ...speciesOptions]}
                    value={value ?? ''}
                    onChange={newValue => onChange(newValue ?? '')}
                    disabled={isLoading}
                    state={error ? 'error' : hasFieldConflict ? 'warning' : 'default'}
                    fullWidth
                    placeholder="Select species..."
                  />
                  {error && (
                    <div className="flex items-center mt-1 text-xs text-danger-text">
                      <span>{error}</span>
                    </div>
                  )}
                </div>
              );
            }}
          />
          <ValidatedInput
            label="Internal ID"
            type="text"
            placeholder="Internal tracking ID"
            registration={register('sample.donorInternalId')}
            error={Boolean(getFieldError('sample.donorInternalId', errors))}
            helperText={getFieldError('sample.donorInternalId', errors)}
            disabled={isLoading}
            badge={getConflictBadge('sample.donorInternalId')}
            hasConflict={hasConflict('sample.donorInternalId')}
          />
          <ValidatedInput
            label="Source ID"
            type="text"
            placeholder="Original source ID"
            registration={register('sample.donorSourceId')}
            error={Boolean(getFieldError('sample.donorSourceId', errors))}
            helperText={getFieldError('sample.donorSourceId', errors)}
            disabled={isLoading}
            badge={getConflictBadge('sample.donorSourceId')}
            hasConflict={hasConflict('sample.donorSourceId')}
          />
        </div>
      </div>

      {/* ROW 2: Sample Information (Part 1) - Media Fields */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h3 className="text-[10px] font-medium text-muted-foreground">Sample information</h3>
          <div className="flex-1 h-px bg-secondary"></div>
        </div>
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
                      value={String(value ?? '')}
                      unitValue={unitValue ?? ''}
                      onChange={async newValue => {
                        onChange(newValue);
                        await trigger('sample');
                      }}
                      onUnitChange={async newUnit => {
                        onUnitChange(newUnit);
                        await trigger('sample');
                      }}
                      placeholder="e.g., 5e6"
                      disabled={isLoading}
                      validation={{
                        error: Boolean(getConcentrationError()),
                        warning: false,
                        helperText: getConcentrationError(),
                        onBlur: () => {},
                      }}
                      badge={getConflictBadge('sample.concentration')}
                      hasConflict={hasConflict('sample.concentration')}
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
            badge={getConflictBadge('sample.media.type')}
            hasConflict={hasConflict('sample.media.type')}
          />
          <ValidatedInput
            label="Supplements"
            type="text"
            placeholder="e.g., 10% FBS"
            registration={register('sample.media.supplements')}
            error={Boolean(getFieldError('sample.media.supplements', errors))}
            helperText={getFieldError('sample.media.supplements', errors)}
            disabled={isLoading}
            badge={getConflictBadge('sample.media.supplements')}
            hasConflict={hasConflict('sample.media.supplements')}
          />
          <ValidatedInput
            label="Selection"
            type="text"
            placeholder="e.g., Puromycin"
            registration={register('sample.media.selection')}
            error={Boolean(getFieldError('sample.media.selection', errors))}
            helperText={getFieldError('sample.media.selection', errors)}
            disabled={isLoading}
            badge={getConflictBadge('sample.media.selection')}
            hasConflict={hasConflict('sample.media.selection')}
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
          badge={getConflictBadge('sample.cultureCondition')}
          hasConflict={hasConflict('sample.cultureCondition')}
        />
        <ValidatedInput
          label="Lot #"
          type="text"
          placeholder="LOT001"
          registration={register('sample.lotNumber')}
          error={Boolean(getFieldError('sample.lotNumber', errors))}
          helperText={getFieldError('sample.lotNumber', errors)}
          disabled={isLoading}
          badge={getConflictBadge('sample.lotNumber')}
          hasConflict={hasConflict('sample.lotNumber')}
        />
        <ValidatedInput
          label="Date"
          type="date"
          registration={register('sample.date')}
          error={Boolean(getFieldError('sample.date', errors))}
          helperText={getFieldError('sample.date', errors)}
          disabled={isLoading}
          badge={getConflictBadge('sample.date')}
          hasConflict={hasConflict('sample.date')}
        />
        <Controller
          name="researcherId"
          control={control}
          render={({ field: { value, onChange } }) => {
            const error = getFieldError('researcherId', errors);
            const hasFieldConflict = hasConflict('researcherId');
            return (
              <div>
                <label
                  className={`block text-sm font-medium mb-1 ${
                    error ? 'text-danger-text' : 'text-secondary-foreground'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    Researcher
                    {getConflictBadge('researcherId')}
                  </span>
                </label>
                <Select
                  options={[
                    { value: '', label: 'Select researcher...' },
                    ...researchers.map(r => ({
                      value: r.id,
                      label: formatResearcherDropdownDisplay(r),
                    })),
                  ]}
                  value={value ?? ''}
                  onChange={newValue => onChange(newValue ?? '')}
                  disabled={isLoading}
                  state={error ? 'error' : hasFieldConflict ? 'warning' : 'default'}
                  fullWidth
                  placeholder="Select researcher..."
                />
                {error && (
                  <div className="flex items-center mt-1 text-xs text-danger-text">
                    <span>{error}</span>
                  </div>
                )}
              </div>
            );
          }}
        />
      </div>

      {/* ROW 4: Supply Chain */}
      <div className="grid grid-cols-3 gap-2.5">
        <Controller
          name="sample.vendor"
          control={control}
          render={({ field: { value, onChange } }) => {
            const error = getFieldError('sample.vendor', errors);
            const hasFieldConflict = hasConflict('sample.vendor');
            return (
              <div>
                <label
                  className={`block text-sm font-medium mb-1 ${
                    error ? 'text-danger-text' : 'text-secondary-foreground'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    Vendor
                    {getConflictBadge('sample.vendor')}
                  </span>
                </label>
                <Select
                  options={[{ value: '', label: 'Select vendor...' }, ...vendorOptions]}
                  value={value ?? ''}
                  onChange={newValue => onChange(newValue ?? '')}
                  disabled={isLoading}
                  state={error ? 'error' : hasFieldConflict ? 'warning' : 'default'}
                  fullWidth
                  placeholder="Select vendor..."
                />
                {error && (
                  <div className="flex items-center mt-1 text-xs text-danger-text">
                    <span>{error}</span>
                  </div>
                )}
              </div>
            );
          }}
        />
        <ValidatedInput
          label="Catalog #"
          type="text"
          placeholder="e.g., CRL-2522"
          registration={register('sample.catalogNumber')}
          error={Boolean(getFieldError('sample.catalogNumber', errors))}
          helperText={getFieldError('sample.catalogNumber', errors)}
          disabled={isLoading}
          badge={getConflictBadge('sample.catalogNumber')}
          hasConflict={hasConflict('sample.catalogNumber')}
        />
        <ValidatedInput
          label="Passage #"
          type="number"
          placeholder="0-999"
          registration={register('sample.passageNumber')}
          error={Boolean(getFieldError('sample.passageNumber', errors))}
          helperText={getFieldError('sample.passageNumber', errors)}
          disabled={isLoading}
          badge={getConflictBadge('sample.passageNumber')}
          hasConflict={hasConflict('sample.passageNumber')}
        />
      </div>

      {/* ROW 5: Notes */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h3 className="text-[10px] font-medium text-muted-foreground">Notes</h3>
          <div className="flex-1 h-px bg-secondary"></div>
        </div>
        <ValidatedInput
          label=""
          type="textarea"
          maxLength={500}
          placeholder="Additional notes and observations..."
          registration={register('sample.notes')}
          error={Boolean(getFieldError('sample.notes', errors))}
          helperText={getFieldError('sample.notes', errors)}
          disabled={isLoading}
          badge={getConflictBadge('sample.notes')}
          hasConflict={hasConflict('sample.notes')}
        />
      </div>
    </div>
  );
};
