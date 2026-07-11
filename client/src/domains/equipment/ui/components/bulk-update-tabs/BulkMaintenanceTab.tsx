/**
 * Bulk Maintenance Tab
 *
 * Logs a maintenance entry against every selected equipment item.
 */

import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { createEquipmentMaintenanceLogRequestSchema } from '@odysseus/shared-schemas';
import { useForm, Controller } from 'react-hook-form';

import { useLookupValuesQuery } from '@shared/hooks/useLookupValuesQuery';
import { DatePicker, lookupOptions, Select } from '@shared/ui';
import { FIELD_LABEL_COMPACT } from '@shared/ui/components/inputs/fieldLabelClass';
import { ValidatedInput } from '@shared/ui/components/inputs/ValidatedInput';

import type { CreateEquipmentMaintenanceLogRequest } from '@odysseus/shared-schemas';
import type { FieldValues } from 'react-hook-form';

export function BulkMaintenanceTab({
  onSubmit,
  onValidityChange,
}: {
  onSubmit: (data: CreateEquipmentMaintenanceLogRequest) => void;
  onValidityChange: (valid: boolean) => void;
}) {
  const { data: maintenanceTypes = [] } = useLookupValuesQuery('equipment_maintenance_type');

  const typeOptions = lookupOptions(maintenanceTypes, 'Select type...');

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid },
  } = useForm({
    resolver: zodResolver(createEquipmentMaintenanceLogRequestSchema) as never,
    mode: 'onChange',
  });

  useEffect(() => {
    onValidityChange(isValid);
  }, [isValid, onValidityChange]);

  const onFormSubmit = (data: FieldValues) => {
    onSubmit(data as CreateEquipmentMaintenanceLogRequest);
  };

  return (
    <form id="bulk-action-form" onSubmit={handleSubmit(onFormSubmit)} className="space-y-3">
      <Controller
        name="datePerformed"
        control={control}
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <div>
            <span className={FIELD_LABEL_COMPACT}>
              Date Performed <span className="text-danger-bg">*</span>
            </span>
            <DatePicker
              value={(value as string) ?? ''}
              onChange={onChange}
              state={error ? 'error' : 'default'}
              fullWidth
            />
            {error && <p className="text-caption text-danger-text mt-1">{error.message}</p>}
          </div>
        )}
      />

      <Controller
        name="maintenanceType"
        control={control}
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <div>
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Select is a custom component without native input */}
            <label id="bulk-maint-type-label" className={FIELD_LABEL_COMPACT}>
              Maintenance Type
            </label>
            <Select
              options={typeOptions}
              value={value ?? ''}
              onChange={v => onChange(v)}
              state={error ? 'error' : 'default'}
              error={error?.message}
              fullWidth
              aria-labelledby="bulk-maint-type-label"
            />
          </div>
        )}
      />

      <ValidatedInput
        label="Performed By (Vendor/Service)"
        labelStyle="compact"
        placeholder="e.g., TSS, In-house"
        error={!!errors['performedBy']}
        helperText={errors['performedBy']?.message as string}
        registration={register('performedBy')}
      />

      <ValidatedInput
        label="Technician"
        labelStyle="compact"
        placeholder="e.g., John Smith"
        error={!!errors['technician']}
        helperText={errors['technician']?.message as string}
        registration={register('technician')}
      />

      <ValidatedInput
        label="Description"
        labelStyle="compact"
        type="textarea"
        placeholder="Work performed, parts replaced, etc."
        registration={register('description')}
      />

      <Controller
        name="nextScheduledDate"
        control={control}
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <div>
            <span className={FIELD_LABEL_COMPACT}>Next Scheduled Date</span>
            <DatePicker
              value={(value as string) ?? ''}
              onChange={onChange}
              state={error ? 'error' : 'default'}
              fullWidth
              clearable
            />
            {error && <p className="text-caption text-danger-text mt-1">{error.message}</p>}
          </div>
        )}
      />

      <ValidatedInput
        label="Cost ($)"
        labelStyle="compact"
        type="number"
        step="0.01"
        error={!!errors['cost']}
        helperText={errors['cost']?.message as string}
        registration={register('cost', {
          setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
        })}
      />

      <ValidatedInput
        label="Notes"
        labelStyle="compact"
        type="textarea"
        placeholder="Additional notes and observations..."
        registration={register('notes')}
      />
    </form>
  );
}
