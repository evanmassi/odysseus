/**
 * Equipment Maintenance Fields
 *
 * The maintenance-log field set (date, type, performer, cost, notes) shared by
 * the single-item form (paired grid) and the bulk tab (stacked).
 */

import { useId, type ReactNode } from 'react';

import { Controller } from 'react-hook-form';

import { DatePicker, Select } from '@shared/ui';
import { FIELD_LABEL_COMPACT } from '@shared/ui/components/inputs/fieldLabelClass';
import { ValidatedInput } from '@shared/ui/components/inputs/ValidatedInput';

import type { SelectOption } from '@shared/ui';
import type { Control, FieldErrors, FieldValues, UseFormRegister } from 'react-hook-form';

interface EquipmentMaintenanceFieldsProps {
  register: UseFormRegister<FieldValues>;
  control: Control<FieldValues>;
  errors: FieldErrors<FieldValues>;
  typeOptions: SelectOption[];
  layout: 'grid' | 'stacked';
}

export function EquipmentMaintenanceFields({
  register,
  control,
  errors,
  typeOptions,
  layout,
}: EquipmentMaintenanceFieldsProps) {
  const typeLabelId = useId();

  const performedBy = (
    <ValidatedInput
      label="Performed By"
      labelStyle="compact"
      placeholder="e.g., TSS, In-house"
      error={!!errors['performedBy']}
      helperText={errors['performedBy']?.message as string | undefined}
      registration={register('performedBy')}
    />
  );
  const technician = (
    <ValidatedInput
      label="Technician"
      labelStyle="compact"
      placeholder="e.g., John Smith"
      error={!!errors['technician']}
      helperText={errors['technician']?.message as string | undefined}
      registration={register('technician')}
    />
  );
  const nextScheduled = (
    <Controller
      name="nextScheduledDate"
      control={control}
      render={({ field: { value, onChange }, fieldState: { error } }) => (
        <div>
          <span className={FIELD_LABEL_COMPACT}>Next Scheduled</span>
          <DatePicker
            value={(value as string) ?? ''}
            onChange={onChange}
            state={error ? 'error' : 'default'}
            fullWidth
            clearable
          />
          {error && <p className="mt-1 text-caption text-danger-text">{error.message}</p>}
        </div>
      )}
    />
  );
  const cost = (
    <ValidatedInput
      label="Cost ($)"
      labelStyle="compact"
      type="number"
      step="0.01"
      error={!!errors['cost']}
      helperText={errors['cost']?.message as string | undefined}
      registration={register('cost', {
        setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
      })}
    />
  );

  const pair = (a: ReactNode, b: ReactNode) =>
    layout === 'grid' ? (
      <div className="grid grid-cols-2 gap-2.5 [&>*]:min-w-0">
        {a}
        {b}
      </div>
    ) : (
      <>
        {a}
        {b}
      </>
    );

  return (
    <>
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
            {error && <p className="mt-1 text-caption text-danger-text">{error.message}</p>}
          </div>
        )}
      />

      <Controller
        name="maintenanceType"
        control={control}
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <div>
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Select is a custom component without native input */}
            <label id={typeLabelId} className={FIELD_LABEL_COMPACT}>
              Maintenance Type <span className="text-danger-bg">*</span>
            </label>
            <Select
              options={typeOptions}
              value={value ?? ''}
              onChange={v => onChange(v)}
              state={error ? 'error' : 'default'}
              error={error?.message}
              fullWidth
              aria-labelledby={typeLabelId}
            />
          </div>
        )}
      />

      {pair(performedBy, technician)}

      <ValidatedInput
        label="Description"
        labelStyle="compact"
        type="textarea"
        placeholder="Work performed, parts replaced, etc."
        registration={register('description')}
      />

      {pair(nextScheduled, cost)}

      <ValidatedInput
        label="Notes"
        labelStyle="compact"
        type="textarea"
        placeholder="Additional notes and observations..."
        registration={register('notes')}
      />
    </>
  );
}
