/**
 * Donor Edit Form
 *
 * React Hook Form for creating and editing donor records.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { createDonorRequestSchema } from '@odysseus/shared-schemas';
import { Plus, Save, SquarePen } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';

import {
  useCreateDonorMutation,
  useUpdateDonorMutation,
} from '@domains/donors/hooks/useDonorMutations';
import { useLookupValuesQuery } from '@shared/hooks/useLookupValuesQuery';
import { Button, Select } from '@shared/ui';
import { ValidatedInput } from '@shared/ui/components/inputs/ValidatedInput';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';

import type { DonorWithTubeCount, CreateDonorRequest } from '@odysseus/shared-schemas';

interface DonorEditFormProps {
  donor?: DonorWithTubeCount;
  onSubmit: () => void;
  onCancel: () => void;
}

const SEX_OPTIONS = [
  { value: '', label: 'Select sex...' },
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Unknown', label: 'Unknown' },
];

const CLINICAL_STATUS_OPTIONS = [
  { value: '', label: 'Select status...' },
  { value: 'Healthy', label: 'Healthy' },
  { value: 'Diseased', label: 'Diseased' },
];

export function DonorEditForm({ donor, onSubmit, onCancel }: DonorEditFormProps) {
  const isEditMode = !!donor;
  const createMutation = useCreateDonorMutation();
  const updateMutation = useUpdateDonorMutation();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const { data: speciesValues = [] } = useLookupValuesQuery('species');
  const speciesOptions = [
    { value: '', label: 'Select species...' },
    ...speciesValues.map(v => ({ value: v.value, label: v.value })),
  ];

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<CreateDonorRequest>({
    resolver: zodResolver(createDonorRequestSchema),
    defaultValues: {
      donorSourceId: donor?.donorSourceId ?? '',
      donorInternalId: donor?.donorInternalId ?? '',
      species: donor?.species ?? '',
      age: donor?.age ?? '',
      sex: donor?.sex ?? '',
      ethnicity: donor?.ethnicity ?? '',
      clinicalStatus: donor?.clinicalStatus ?? '',
      diagnosis: donor?.diagnosis ?? '',
      diseaseStage: donor?.diseaseStage ?? '',
      notes: donor?.notes ?? '',
    },
  });

  const clinicalStatus = watch('clinicalStatus');

  const handleFormSubmit = (data: CreateDonorRequest) => {
    if (isEditMode && donor) {
      updateMutation.mutate({ id: donor.id, data }, { onSuccess: onSubmit });
    } else {
      createMutation.mutate(data, { onSuccess: onSubmit });
    }
  };

  const rootError =
    errors.root?.message ?? (errors as Record<string, { message?: string }>)['']?.message;

  return (
    <div className="flex flex-col h-full min-h-0">
      <ScrollArea className="flex-1 min-h-0">
        <form id="donor-form" onSubmit={handleSubmit(handleFormSubmit)} className="space-y-3 p-1">
          <h3 className="text-sm font-semibold text-secondary-foreground inline-flex items-center gap-1.5">
            {isEditMode ? (
              <>
                <SquarePen size={14} className="text-muted-foreground" />
                Edit Donor
              </>
            ) : (
              <>
                <Plus size={14} className="text-muted-foreground" />
                Add Donor
              </>
            )}
          </h3>

          {rootError && <p className="text-xs text-danger-text">{rootError}</p>}

          <div className="flex items-center gap-3">
            <h4 className="text-xs font-medium text-muted-foreground/60 whitespace-nowrap">
              Identifiers
            </h4>
            <div className="flex-1 h-px bg-muted-foreground/60" />
          </div>

          <div className="flex gap-2.5">
            <div className="flex-1">
              <ValidatedInput
                label="Source ID"
                type="text"
                placeholder="External source ID"
                registration={register('donorSourceId')}
                error={!!errors.donorSourceId}
                helperText={errors.donorSourceId?.message}
                disabled={isPending}
              />
            </div>
            <div className="flex-1">
              <ValidatedInput
                label="Internal ID"
                type="text"
                placeholder="Lab internal ID"
                registration={register('donorInternalId')}
                error={!!errors.donorInternalId}
                helperText={errors.donorInternalId?.message}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <h4 className="text-xs font-medium text-muted-foreground/60 whitespace-nowrap">
              Demographics
            </h4>
            <div className="flex-1 h-px bg-muted-foreground/60" />
          </div>

          <div className="flex gap-2.5">
            <div className="w-44">
              <Controller
                name="species"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <div>
                    {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Select is a custom component without native input */}
                    <label
                      id="species-label"
                      className="block text-sm font-medium mb-1 text-secondary-foreground"
                    >
                      Species
                    </label>
                    <Select
                      options={speciesOptions}
                      value={value ?? ''}
                      onChange={v => onChange(v ?? '')}
                      disabled={isPending}
                      fullWidth
                      placeholder="Select species..."
                      aria-labelledby="species-label"
                    />
                  </div>
                )}
              />
            </div>
            <div className="w-24">
              <ValidatedInput
                label="Age"
                type="text"
                placeholder="e.g., 45"
                registration={register('age')}
                error={!!errors.age}
                helperText={errors.age?.message}
                disabled={isPending}
              />
            </div>
            <div className="w-36">
              <Controller
                name="sex"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <div>
                    {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Select is a custom component without native input */}
                    <label
                      id="sex-label"
                      className="block text-sm font-medium mb-1 text-secondary-foreground"
                    >
                      Sex
                    </label>
                    <Select
                      options={SEX_OPTIONS}
                      value={value ?? ''}
                      onChange={v => onChange(v ?? '')}
                      disabled={isPending}
                      fullWidth
                      aria-labelledby="sex-label"
                    />
                  </div>
                )}
              />
            </div>
          </div>

          <div className="flex gap-2.5">
            <div className="flex-1">
              <ValidatedInput
                label="Ethnicity"
                type="text"
                placeholder="e.g., Caucasian"
                registration={register('ethnicity')}
                error={!!errors.ethnicity}
                helperText={errors.ethnicity?.message}
                disabled={isPending}
              />
            </div>
            <div className="w-40">
              <Controller
                name="clinicalStatus"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <div>
                    {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Select is a custom component without native input */}
                    <label
                      id="clinical-status-label"
                      className="block text-sm font-medium mb-1 text-secondary-foreground"
                    >
                      Clinical Status
                    </label>
                    <Select
                      options={CLINICAL_STATUS_OPTIONS}
                      value={value ?? ''}
                      onChange={v => onChange(v ?? '')}
                      disabled={isPending}
                      fullWidth
                      aria-labelledby="clinical-status-label"
                    />
                  </div>
                )}
              />
            </div>
          </div>

          {clinicalStatus === 'Diseased' && (
            <>
              <div className="flex items-center gap-3">
                <h4 className="text-xs font-medium text-muted-foreground/60 whitespace-nowrap">
                  Clinical Details
                </h4>
                <div className="flex-1 h-px bg-muted-foreground/60" />
              </div>

              <div className="flex gap-2.5">
                <div className="flex-1">
                  <ValidatedInput
                    label="Diagnosis"
                    type="text"
                    placeholder="e.g., AML"
                    registration={register('diagnosis')}
                    error={!!errors.diagnosis}
                    helperText={errors.diagnosis?.message}
                    disabled={isPending}
                  />
                </div>
                <div className="flex-1">
                  <ValidatedInput
                    label="Disease Stage"
                    type="text"
                    placeholder="e.g., Stage III"
                    registration={register('diseaseStage')}
                    error={!!errors.diseaseStage}
                    helperText={errors.diseaseStage?.message}
                    disabled={isPending}
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex items-center gap-3">
            <h4 className="text-xs font-medium text-muted-foreground/60 whitespace-nowrap">
              Notes
            </h4>
            <div className="flex-1 h-px bg-muted-foreground/60" />
          </div>

          <ValidatedInput
            label=""
            type="textarea"
            placeholder="Additional notes about this donor..."
            disabled={isPending}
            registration={register('notes')}
          />
        </form>
      </ScrollArea>

      <div className="flex items-center justify-end gap-2 px-1 py-3 border-t border-border flex-shrink-0">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="donor-form"
          variant="primary"
          size="sm"
          disabled={isPending}
          leftIcon={<Save className="w-3.5 h-3.5" />}
        >
          {isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
