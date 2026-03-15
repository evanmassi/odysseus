/**
 * Tube Form Component
 *
 * 7-row form layout for tube create/edit with admin-managed dropdowns.
 */

import {
  type CreateTubeRequest,
  type UpdateTubeRequest,
  type Researcher,
  formatResearcherDropdownDisplay,
} from '@odysseus/shared-schemas';
import { AlertTriangle } from 'lucide-react';
import { Controller, useWatch } from 'react-hook-form';

import { DatePicker, Select, ValidatedInput } from '@shared/ui';

import { TubeConcentrationField } from './TubeConcentrationField';

import type { SelectOption } from '@shared/ui/primitives/select/types';
import type { Control, UseFormRegister, FieldErrors, UseFormTrigger } from 'react-hook-form';

const CONFLICT_FIELD_MAP: Record<string, string> = {
  cellType: 'sample.cellType',
  donorInternalId: 'sample.donorInternalId',
  donorSourceId: 'sample.donorSourceId',
  concentration: 'sample.concentration',
  concentrationUnit: 'sample.concentration',
  date: 'sample.date',
  mediaType: 'sample.mediaType',
  mediaSupplements: 'sample.mediaSupplements',
  mediaSelection: 'sample.mediaSelection',
  cultureCondition: 'sample.cultureCondition',
  lotNumber: 'sample.lotNumber',
  species: 'sample.species',
  source: 'sample.source',
  catalogNumber: 'sample.catalogNumber',
  passageNumber: 'sample.passageNumber',
  notes: 'sample.notes',
  researcherId: 'researcherId',
};

// Conflict indicator icon for fields with mixed values
const ConflictIcon = () => <AlertTriangle className="w-3.5 h-3.5 text-warning-text" />;

type TubeFormValues = CreateTubeRequest | UpdateTubeRequest;

export interface TubeFormProps {
  control: Control<TubeFormValues>;
  register: UseFormRegister<TubeFormValues>;
  errors: FieldErrors<TubeFormValues>;
  trigger: UseFormTrigger<TubeFormValues>;
  researchers: Researcher[];
  speciesOptions: SelectOption[];
  sourceOptions: SelectOption[];
  mediaOptions: SelectOption[];
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
  sourceOptions,
  mediaOptions,
  isLoading,
  conflictingFields = [],
}: TubeFormProps) => {
  const notesValue = useWatch({ control, name: 'sample.notes' }) as string | undefined;

  const hasConflict = (fieldPath: string): boolean => {
    return conflictingFields.some(conflictKey => CONFLICT_FIELD_MAP[conflictKey] === fieldPath);
  };

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
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <h3 className="text-xs font-medium text-muted-foreground/60 whitespace-nowrap">
          Donor information
        </h3>
        <div className="flex-1 h-px bg-muted-foreground/60"></div>
      </div>

      {/* ROW 1: Cell Type + Species */}
      <div className="flex gap-2.5">
        <div className="w-72">
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
        </div>
        <div className="w-48">
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
        </div>
      </div>

      {/* ROW 2: Donor IDs */}
      <div className="flex gap-2.5">
        <div className="w-64">
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
        </div>
        <div className="w-64">
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

      <div className="flex items-center gap-3 !mt-3.5">
        <h3 className="text-xs font-medium text-muted-foreground/60 whitespace-nowrap">
          Sample information
        </h3>
        <div className="flex-1 h-px bg-muted-foreground/60"></div>
      </div>

      {/* ROW 3: Concentration, Culture Condition, Passage # */}
      <div className="flex gap-2.5">
        <div className="w-48">
          <Controller
            name="sample.concentration"
            control={control}
            render={({ field: { value, onChange } }) => (
              <Controller
                name="sample.concentrationUnit"
                control={control}
                render={({ field: { value: unitValue, onChange: onUnitChange } }) => (
                  <TubeConcentrationField
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
        <div className="w-56">
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
        </div>
        <div className="w-20">
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
      </div>

      {/* ROW 4: Media */}
      <div className="flex gap-2.5">
        <div className="w-44">
          <Controller
            name="sample.mediaType"
            control={control}
            render={({ field: { value, onChange } }) => {
              const error = getFieldError('sample.mediaType', errors);
              const hasFieldConflict = hasConflict('sample.mediaType');
              return (
                <div>
                  <label
                    className={`block text-sm font-medium mb-1 ${
                      error ? 'text-danger-text' : 'text-secondary-foreground'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      Media Type
                      {getConflictBadge('sample.mediaType')}
                    </span>
                  </label>
                  <Select
                    options={[{ value: '', label: 'Select media...' }, ...mediaOptions]}
                    value={value ?? ''}
                    onChange={newValue => onChange(newValue ?? '')}
                    disabled={isLoading}
                    state={error ? 'error' : hasFieldConflict ? 'warning' : 'default'}
                    fullWidth
                    placeholder="Select media..."
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
        <div className="w-64">
          <ValidatedInput
            label="Supplements"
            type="text"
            placeholder="e.g., 10% FBS"
            registration={register('sample.mediaSupplements')}
            error={Boolean(getFieldError('sample.mediaSupplements', errors))}
            helperText={getFieldError('sample.mediaSupplements', errors)}
            disabled={isLoading}
            badge={getConflictBadge('sample.mediaSupplements')}
            hasConflict={hasConflict('sample.mediaSupplements')}
          />
        </div>
        <div className="w-44">
          <ValidatedInput
            label="Selection"
            type="text"
            placeholder="e.g., Puromycin"
            registration={register('sample.mediaSelection')}
            error={Boolean(getFieldError('sample.mediaSelection', errors))}
            helperText={getFieldError('sample.mediaSelection', errors)}
            disabled={isLoading}
            badge={getConflictBadge('sample.mediaSelection')}
            hasConflict={hasConflict('sample.mediaSelection')}
          />
        </div>
      </div>

      {/* ROW 5: Source, Catalog #, Lot # */}
      <div className="flex gap-2.5">
        <div className="w-64">
          <Controller
            name="sample.source"
            control={control}
            render={({ field: { value, onChange } }) => {
              const error = getFieldError('sample.source', errors);
              const hasFieldConflict = hasConflict('sample.source');
              return (
                <div>
                  <label
                    className={`block text-sm font-medium mb-1 ${
                      error ? 'text-danger-text' : 'text-secondary-foreground'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      Source
                      {getConflictBadge('sample.source')}
                    </span>
                  </label>
                  <Select
                    options={[{ value: '', label: 'Select source...' }, ...sourceOptions]}
                    value={value ?? ''}
                    onChange={newValue => onChange(newValue ?? '')}
                    disabled={isLoading}
                    state={error ? 'error' : hasFieldConflict ? 'warning' : 'default'}
                    fullWidth
                    placeholder="Select source..."
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
        <div className="w-44">
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
        </div>
        <div className="w-44">
          <ValidatedInput
            label="Lot #"
            type="text"
            placeholder="e.g., LOT001"
            registration={register('sample.lotNumber')}
            error={Boolean(getFieldError('sample.lotNumber', errors))}
            helperText={getFieldError('sample.lotNumber', errors)}
            disabled={isLoading}
            badge={getConflictBadge('sample.lotNumber')}
            hasConflict={hasConflict('sample.lotNumber')}
          />
        </div>
      </div>

      {/* ROW 6: Date + Researcher */}
      <div className="flex gap-2.5">
        <div className="w-48">
          <Controller
            name="sample.date"
            control={control}
            render={({ field: { value, onChange } }) => {
              const error = getFieldError('sample.date', errors);
              const hasFieldConflict = hasConflict('sample.date');
              return (
                <div>
                  <label
                    className={`block text-sm font-medium mb-1 ${
                      error ? 'text-danger-text' : 'text-secondary-foreground'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      Date
                      {getConflictBadge('sample.date')}
                    </span>
                  </label>
                  <DatePicker
                    value={(value as string) ?? ''}
                    onChange={newValue => onChange(newValue)}
                    disabled={isLoading}
                    state={error ? 'error' : hasFieldConflict ? 'warning' : 'default'}
                    fullWidth
                    clearable
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
        <div className="w-56">
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
      </div>

      {/* ROW 7: Notes */}
      <div className="flex items-center gap-3 !mt-3.5">
        <h3 className="text-xs font-medium text-muted-foreground/60 whitespace-nowrap flex items-center gap-1.5">
          Notes
          {getConflictBadge('sample.notes')}
        </h3>
        <div className="flex-1 h-px bg-muted-foreground/60"></div>
      </div>

      <div className="relative">
        <ValidatedInput
          label=""
          type="textarea"
          maxLength={500}
          placeholder="Additional notes and observations..."
          registration={register('sample.notes')}
          error={Boolean(getFieldError('sample.notes', errors))}
          helperText={getFieldError('sample.notes', errors)}
          disabled={isLoading}
          hasConflict={hasConflict('sample.notes')}
        />
        <span className="absolute bottom-1.5 right-2.5 text-[10px] text-muted-foreground/50 pointer-events-none">
          {(notesValue ?? '').length}/500
        </span>
      </div>
    </div>
  );
};
