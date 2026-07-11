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
import {
  Button,
  CompletenessMeter,
  lookupOptions,
  NubDivider,
  SectionHeader,
  Select,
} from '@shared/ui';
import { FIELD_LABEL_COMPACT } from '@shared/ui/components/inputs/fieldLabelClass';
import { ValidatedInput } from '@shared/ui/components/inputs/ValidatedInput';
import { ConsolePanel } from '@shared/ui/primitives/console-panel/ConsolePanel';
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
  const speciesOptions = lookupOptions(speciesValues, 'Select species...');

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

  const allValues = watch();
  const clinicalStatus = allValues.clinicalStatus;

  // Profile completeness — diagnosis/disease stage only count when the donor is diseased.
  const trackedFields: (keyof CreateDonorRequest)[] = [
    'donorSourceId',
    'donorInternalId',
    'species',
    'age',
    'sex',
    'ethnicity',
    'clinicalStatus',
    ...(clinicalStatus === 'Diseased' ? (['diagnosis', 'diseaseStage'] as const) : []),
    'notes',
  ];
  const filledCount = trackedFields.filter(f => {
    const v = allValues[f];
    return v != null && String(v).trim() !== '';
  }).length;

  const handleFormSubmit = (data: CreateDonorRequest) => {
    if (isEditMode && donor) {
      updateMutation.mutate({ id: donor.id, data }, { onSuccess: onSubmit });
    } else {
      createMutation.mutate(data, { onSuccess: onSubmit });
    }
  };

  // zodResolver parks the schema's pathless .refine error under the '' key, not root.
  const rootError =
    errors.root?.message ?? (errors as Record<string, { message?: string }>)['']?.message;

  return (
    <ConsolePanel intensity="soft" className="flex h-full min-h-0 flex-col">
      <div className="flex flex-shrink-0 items-center gap-3 border-b border-line-faint px-4 py-3">
        <span className="p-1.5 text-muted-foreground">
          {isEditMode ? <SquarePen size={20} /> : <Plus size={20} />}
        </span>
        <h2 className="text-lg font-medium text-foreground">
          {isEditMode ? 'Edit Donor' : 'Add Donor'}
        </h2>
      </div>

      <CompletenessMeter filled={filledCount} total={trackedFields.length} />

      <ScrollArea className="min-h-0 flex-1">
        <form id="donor-form" onSubmit={handleSubmit(handleFormSubmit)} className="space-y-2 p-4">
          {rootError && <p className="text-caption text-danger-text">{rootError}</p>}

          <SectionHeader title="Identifiers" size="sm" />
          <div className="grid grid-cols-2 gap-2.5 [&>*]:min-w-0">
            <ValidatedInput
              label="Source ID"
              labelStyle="compact"
              type="text"
              placeholder="External source ID"
              registration={register('donorSourceId')}
              error={!!errors.donorSourceId}
              helperText={errors.donorSourceId?.message}
              disabled={isPending}
            />
            <ValidatedInput
              label="Internal ID"
              labelStyle="compact"
              type="text"
              placeholder="Lab internal ID"
              registration={register('donorInternalId')}
              error={!!errors.donorInternalId}
              helperText={errors.donorInternalId?.message}
              disabled={isPending}
            />
          </div>

          <div className="!mt-3.5">
            <SectionHeader title="Demographics" size="sm" />
          </div>
          <div className="grid grid-cols-[1.4fr_70px_1.1fr] gap-2.5 [&>*]:min-w-0">
            <Controller
              name="species"
              control={control}
              render={({ field: { value, onChange } }) => (
                <div>
                  {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Select is a custom component without native input */}
                  <label id="species-label" className={FIELD_LABEL_COMPACT}>
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
            <ValidatedInput
              label="Age"
              labelStyle="compact"
              type="text"
              placeholder="45"
              registration={register('age')}
              error={!!errors.age}
              helperText={errors.age?.message}
              disabled={isPending}
            />
            <Controller
              name="sex"
              control={control}
              render={({ field: { value, onChange } }) => (
                <div>
                  {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Select is a custom component without native input */}
                  <label id="sex-label" className={FIELD_LABEL_COMPACT}>
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

          <div className="grid grid-cols-2 gap-2.5 [&>*]:min-w-0">
            <ValidatedInput
              label="Ethnicity"
              labelStyle="compact"
              type="text"
              placeholder="e.g., Caucasian"
              registration={register('ethnicity')}
              error={!!errors.ethnicity}
              helperText={errors.ethnicity?.message}
              disabled={isPending}
            />
            <Controller
              name="clinicalStatus"
              control={control}
              render={({ field: { value, onChange } }) => (
                <div>
                  {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Select is a custom component without native input */}
                  <label id="clinical-status-label" className={FIELD_LABEL_COMPACT}>
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

          {clinicalStatus === 'Diseased' && (
            <>
              <div className="!mt-3.5">
                <SectionHeader title="Clinical Details" size="sm" />
              </div>
              <div className="grid grid-cols-2 gap-2.5 [&>*]:min-w-0">
                <ValidatedInput
                  label="Diagnosis"
                  labelStyle="compact"
                  type="text"
                  placeholder="e.g., AML"
                  registration={register('diagnosis')}
                  error={!!errors.diagnosis}
                  helperText={errors.diagnosis?.message}
                  disabled={isPending}
                />
                <ValidatedInput
                  label="Disease Stage"
                  labelStyle="compact"
                  type="text"
                  placeholder="e.g., Stage III"
                  registration={register('diseaseStage')}
                  error={!!errors.diseaseStage}
                  helperText={errors.diseaseStage?.message}
                  disabled={isPending}
                />
              </div>
            </>
          )}

          <div className="!mt-3.5">
            <SectionHeader title="Notes" size="sm" />
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

      <div className="relative flex-shrink-0 border-t border-line-faint bg-card px-4 py-3 dark:bg-shade/15">
        <NubDivider tone="primary" className="absolute inset-x-0 -top-px" />
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="donor-form"
            variant="primary"
            size="sm"
            disabled={isPending}
            leftIcon={<Save className="h-3.5 w-3.5" />}
          >
            {isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </ConsolePanel>
  );
}
