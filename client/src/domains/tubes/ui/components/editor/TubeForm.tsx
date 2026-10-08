import {
  type CreateTubeRequest,
  type UpdateTubeRequest,
  type Researcher,
  formatResearcherDropdownDisplay,
} from '@odysseus/shared-schemas';
import { AlertTriangle } from 'lucide-react';
import { Controller, useWatch } from 'react-hook-form';

import { DonorIdAutocomplete } from '@domains/donors';
import { DatePicker, SectionHeader, Select, ValidatedInput, withPlaceholder } from '@shared/ui';

import { TubeConcentrationField } from './TubeConcentrationField';

import type { SelectOption } from '@shared/ui/primitives/select/types';
import type {
  Control,
  UseFormRegister,
  UseFormSetValue,
  FieldErrors,
  UseFormTrigger,
  FieldPath,
} from 'react-hook-form';

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

const ConflictIcon = () => <AlertTriangle className="w-3.5 h-3.5 text-warning-text" />;

type TubeFormValues = CreateTubeRequest | UpdateTubeRequest;

export interface TubeFormProps {
  control: Control<TubeFormValues>;
  register: UseFormRegister<TubeFormValues>;
  setValue: UseFormSetValue<TubeFormValues>;
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
  setValue,
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

  const getConcentrationError = (): string | undefined => {
    const directError = getFieldError('sample.concentration', errors);
    if (directError) return directError;

    const unitError = getFieldError('sample.concentrationUnit', errors);
    if (unitError) return unitError;

    // PITFALL: the concentration/unit refinement error lands on sample, not on either field.
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

  const renderSelectField = (
    name: FieldPath<TubeFormValues>,
    label: string,
    options: SelectOption[],
    placeholder: string
  ) => (
    <Controller
      name={name}
      control={control}
      render={({ field: { value, onChange } }) => {
        const error = getFieldError(name, errors);
        return (
          <div>
            <label
              className={`block type-label text-label-2xs tracking-label-wide mb-1.5 ${
                error ? 'text-danger-text' : 'text-muted-foreground'
              }`}
            >
              <span className="flex items-center gap-1.5">
                {label}
                {getConflictBadge(name)}
              </span>
            </label>
            <Select
              options={withPlaceholder(placeholder, options)}
              value={(value as string | undefined) ?? ''}
              onChange={newValue => onChange(newValue ?? '')}
              disabled={isLoading}
              state={error ? 'error' : hasConflict(name) ? 'warning' : 'default'}
              fullWidth
              placeholder={placeholder}
            />
            {error && (
              <div className="flex items-center mt-1 text-body-sm text-danger-text">
                <span>{error}</span>
              </div>
            )}
          </div>
        );
      }}
    />
  );

  return (
    <div className="space-y-2">
      <SectionHeader title="Donor Information" size="sm" />

      <div className="grid grid-cols-[2fr_1fr] gap-2.5 [&>*]:min-w-0">
        <ValidatedInput
          label="Cell Type"
          labelStyle="compact"
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
        {renderSelectField('sample.species', 'Species', speciesOptions, 'Select species...')}
      </div>

      <div className="grid grid-cols-2 gap-2.5 [&>*]:min-w-0">
        <Controller
          name="sample.donorInternalId"
          control={control}
          render={({ field: { value, onChange } }) => (
            <DonorIdAutocomplete
              label="Internal ID"
              placeholder="Internal tracking ID"
              value={(value as string) ?? ''}
              onChange={onChange}
              error={Boolean(getFieldError('sample.donorInternalId', errors))}
              helperText={getFieldError('sample.donorInternalId', errors)}
              disabled={isLoading}
              badge={getConflictBadge('sample.donorInternalId')}
              hasConflict={hasConflict('sample.donorInternalId')}
              fieldType="internal"
              onPairSelect={v =>
                setValue('sample.donorSourceId' as keyof TubeFormValues, v, { shouldDirty: true })
              }
            />
          )}
        />
        <Controller
          name="sample.donorSourceId"
          control={control}
          render={({ field: { value, onChange } }) => (
            <DonorIdAutocomplete
              label="Source ID"
              placeholder="Original source ID"
              value={(value as string) ?? ''}
              onChange={onChange}
              error={Boolean(getFieldError('sample.donorSourceId', errors))}
              helperText={getFieldError('sample.donorSourceId', errors)}
              disabled={isLoading}
              badge={getConflictBadge('sample.donorSourceId')}
              hasConflict={hasConflict('sample.donorSourceId')}
              fieldType="source"
              onPairSelect={v =>
                setValue('sample.donorInternalId' as keyof TubeFormValues, v, {
                  shouldDirty: true,
                })
              }
            />
          )}
        />
      </div>

      <div className="!mt-3.5">
        <SectionHeader title="Sample Information" size="sm" />
      </div>

      <div className="grid grid-cols-[1.2fr_1.5fr_90px] gap-2.5 [&>*]:min-w-0">
        <Controller
          name="sample.concentration"
          control={control}
          render={({ field: { value, onChange }, fieldState: concentrationState }) => (
            <Controller
              name="sample.concentrationUnit"
              control={control}
              render={({
                field: { value: unitValue, onChange: onUnitChange },
                fieldState: unitState,
              }) => (
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
                  isDirty={concentrationState.isDirty || unitState.isDirty}
                />
              )}
            />
          )}
        />
        <ValidatedInput
          label="Culture Condition"
          labelStyle="compact"
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
          label="Passage #"
          labelStyle="compact"
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

      <div className="grid grid-cols-[1fr_1.4fr_1.2fr] gap-2.5 [&>*]:min-w-0">
        {renderSelectField('sample.mediaType', 'Media Type', mediaOptions, 'Select media...')}
        <ValidatedInput
          label="Supplements"
          labelStyle="compact"
          type="text"
          placeholder="e.g., 10% FBS"
          registration={register('sample.mediaSupplements')}
          error={Boolean(getFieldError('sample.mediaSupplements', errors))}
          helperText={getFieldError('sample.mediaSupplements', errors)}
          disabled={isLoading}
          badge={getConflictBadge('sample.mediaSupplements')}
          hasConflict={hasConflict('sample.mediaSupplements')}
        />
        <ValidatedInput
          label="Selection"
          labelStyle="compact"
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

      <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-2.5 [&>*]:min-w-0">
        {renderSelectField('sample.source', 'Source', sourceOptions, 'Select source...')}
        <ValidatedInput
          label="Catalog #"
          labelStyle="compact"
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
          label="Lot #"
          labelStyle="compact"
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

      <div className="grid grid-cols-[1fr_1.4fr] gap-2.5 [&>*]:min-w-0">
        <Controller
          name="sample.date"
          control={control}
          render={({ field: { value, onChange } }) => {
            const error = getFieldError('sample.date', errors);
            const hasFieldConflict = hasConflict('sample.date');
            return (
              <div>
                <label
                  className={`block type-label text-label-2xs tracking-label-wide mb-1.5 ${
                    error ? 'text-danger-text' : 'text-muted-foreground'
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
                  <div className="flex items-center mt-1 text-body-sm text-danger-text">
                    <span>{error}</span>
                  </div>
                )}
              </div>
            );
          }}
        />
        {renderSelectField(
          'researcherId',
          'Researcher',
          researchers.map(r => ({ value: r.id, label: formatResearcherDropdownDisplay(r) })),
          'Select researcher...'
        )}
      </div>

      <div className="!mt-3.5">
        <SectionHeader
          title="Notes"
          size="sm"
          meta={hasConflict('sample.notes') ? <ConflictIcon /> : undefined}
        />
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
        <span className="pointer-events-none absolute -top-2 right-3 z-10 border border-line-faint bg-card px-2 py-0.5 type-label text-label-2xs tracking-label-wide text-foreground/40">
          {`${(notesValue ?? '').length}/500`}
        </span>
      </div>
    </div>
  );
};
