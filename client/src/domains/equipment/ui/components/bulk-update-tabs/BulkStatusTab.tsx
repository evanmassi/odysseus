/**
 * Bulk Status Tab
 *
 * Changes the status and optional condition notes of every selected item.
 */

import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  equipmentBulkStatusValues,
  equipmentBulkStatusRequestSchema,
} from '@odysseus/shared-schemas';
import { useForm, Controller } from 'react-hook-form';

import { EQUIPMENT_STATUS_DISPLAY } from '@domains/equipment/utils/equipmentStatus';
import { Select, withPlaceholder } from '@shared/ui';
import { FIELD_LABEL_COMPACT } from '@shared/ui/components/inputs/fieldLabelClass';
import { ValidatedInput } from '@shared/ui/components/inputs/ValidatedInput';

import type { EquipmentBulkStatusRequest } from '@odysseus/shared-schemas';
import type { SelectOption } from '@shared/ui';

const bulkStatusFormSchema = equipmentBulkStatusRequestSchema.shape.data;

export function BulkStatusTab({
  onSubmit,
  onValidityChange,
}: {
  onSubmit: (data: EquipmentBulkStatusRequest['data']) => void;
  onValidityChange: (valid: boolean) => void;
}) {
  const statusOptions: SelectOption[] = equipmentBulkStatusValues.map(s => ({
    value: s,
    label: EQUIPMENT_STATUS_DISPLAY[s].label,
  }));

  const {
    register,
    handleSubmit,
    control,
    formState: { isValid },
  } = useForm<EquipmentBulkStatusRequest['data']>({
    resolver: zodResolver(bulkStatusFormSchema),
    mode: 'onChange',
  });

  useEffect(() => {
    onValidityChange(isValid);
  }, [isValid, onValidityChange]);

  return (
    <form id="bulk-action-form" onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <Controller
        name="status"
        control={control}
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <div>
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Select is a custom component without native input */}
            <label id="bulk-status-label" className={FIELD_LABEL_COMPACT}>
              Status
            </label>
            <Select
              options={withPlaceholder('Select status...', statusOptions)}
              value={value ?? ''}
              onChange={v => onChange(v)}
              state={error ? 'error' : 'default'}
              error={error?.message}
              fullWidth
              aria-labelledby="bulk-status-label"
            />
          </div>
        )}
      />

      <ValidatedInput
        label="Condition Notes"
        labelStyle="compact"
        type="textarea"
        placeholder="Current condition or issues..."
        registration={register('conditionNotes')}
      />
    </form>
  );
}
