/**
 * Equipment Maintenance Form
 *
 * Form for adding or editing maintenance log entries with lab-managed type dropdown.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import {
  createEquipmentMaintenanceLogRequestSchema,
  updateEquipmentMaintenanceLogRequestSchema,
} from '@odysseus/shared-schemas';
import { Save, Wrench } from 'lucide-react';
import { useForm, Controller, type FieldValues } from 'react-hook-form';

import {
  useAddEquipmentMaintenanceEntryMutation,
  useUpdateEquipmentMaintenanceEntryMutation,
} from '@domains/equipment/hooks/useEquipmentMutations';
import { useLookupValuesQuery } from '@shared/hooks/useLookupValuesQuery';
import { Button, DatePicker, NubDivider, Select } from '@shared/ui';
import { FIELD_LABEL_COMPACT } from '@shared/ui/components/inputs/fieldLabelClass';
import { ValidatedInput } from '@shared/ui/components/inputs/ValidatedInput';
import { ConsolePanel } from '@shared/ui/primitives/console-panel/ConsolePanel';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { normalizeDateString } from '@shared/utils/dateFormatters';
import { notifications } from '@shared/utils/notifications';

import type {
  EquipmentMaintenanceLog,
  CreateEquipmentMaintenanceLogRequest,
  UpdateEquipmentMaintenanceLogRequest,
} from '@odysseus/shared-schemas';
import type { SelectOption } from '@shared/ui/primitives/select/types';

interface EquipmentMaintenanceFormProps {
  itemId: string;
  entry?: EquipmentMaintenanceLog;
  onSubmit: () => void;
  onCancel: () => void;
}

export function EquipmentMaintenanceForm({
  itemId,
  entry,
  onSubmit,
  onCancel,
}: EquipmentMaintenanceFormProps) {
  const isEditing = !!entry;
  const addMutation = useAddEquipmentMaintenanceEntryMutation();
  const updateMutation = useUpdateEquipmentMaintenanceEntryMutation();
  const { data: maintenanceTypes = [] } = useLookupValuesQuery('equipment_maintenance_type');

  const typeOptions: SelectOption[] = [
    { value: '', label: 'Select type...' },
    ...maintenanceTypes.map(t => ({ value: t.value, label: t.value })),
  ];

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(
      isEditing
        ? updateEquipmentMaintenanceLogRequestSchema
        : createEquipmentMaintenanceLogRequestSchema
    ) as never,
    defaultValues: isEditing
      ? {
          datePerformed: normalizeDateString(entry.datePerformed),
          maintenanceType: entry.maintenanceType,
          performedBy: entry.performedBy ?? '',
          technician: entry.technician ?? '',
          description: entry.description ?? '',
          nextScheduledDate: normalizeDateString(entry.nextScheduledDate),
          cost: entry.cost,
          notes: entry.notes ?? '',
        }
      : {},
  });

  const onFormSubmit = async (data: FieldValues) => {
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          itemId,
          entryId: entry.id,
          data: data as UpdateEquipmentMaintenanceLogRequest,
        });
        notifications.success('Maintenance entry updated');
      } else {
        await addMutation.mutateAsync({
          itemId,
          data: data as CreateEquipmentMaintenanceLogRequest,
        });
        notifications.success('Maintenance entry added');
      }
      onSubmit();
    } catch {
      notifications.error(isEditing ? 'Failed to update entry' : 'Failed to add entry');
    }
  };

  return (
    <ConsolePanel intensity="soft" className="flex h-full min-h-0 flex-col">
      <div className="flex flex-shrink-0 items-center gap-3 border-b border-line-faint px-4 py-3">
        <span className="p-1.5 text-muted-foreground">
          <Wrench size={20} />
        </span>
        <h2 className="text-lg font-medium text-foreground">
          {isEditing ? 'Edit Maintenance Entry' : 'Add Maintenance Entry'}
        </h2>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <form id="maintenance-form" onSubmit={handleSubmit(onFormSubmit)} className="space-y-3 p-4">
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
                <label id="maintenance-type-label" className={FIELD_LABEL_COMPACT}>
                  Maintenance Type <span className="text-danger-bg">*</span>
                </label>
                <Select
                  options={typeOptions}
                  value={value ?? ''}
                  onChange={v => onChange(v)}
                  state={error ? 'error' : 'default'}
                  error={error?.message}
                  fullWidth
                  aria-labelledby="maintenance-type-label"
                />
              </div>
            )}
          />

          <div className="grid grid-cols-2 gap-2.5 [&>*]:min-w-0">
            <ValidatedInput
              label="Performed By"
              labelStyle="compact"
              placeholder="e.g., TSS, In-house"
              error={!!errors.performedBy}
              helperText={errors.performedBy?.message}
              registration={register('performedBy')}
            />
            <ValidatedInput
              label="Technician"
              labelStyle="compact"
              placeholder="e.g., John Smith"
              error={!!errors.technician}
              helperText={errors.technician?.message}
              registration={register('technician')}
            />
          </div>

          <ValidatedInput
            label="Description"
            labelStyle="compact"
            type="textarea"
            placeholder="Work performed, parts replaced, etc."
            registration={register('description')}
          />

          <div className="grid grid-cols-2 gap-2.5 [&>*]:min-w-0">
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
            <ValidatedInput
              label="Cost ($)"
              labelStyle="compact"
              type="number"
              step="0.01"
              error={!!errors.cost}
              helperText={errors.cost?.message}
              registration={register('cost', {
                setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
              })}
            />
          </div>

          <ValidatedInput
            label="Notes"
            labelStyle="compact"
            type="textarea"
            placeholder="Additional notes and observations..."
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
            form="maintenance-form"
            variant="primary"
            size="sm"
            disabled={isSubmitting}
            leftIcon={<Save className="h-3.5 w-3.5" />}
          >
            {isEditing ? 'Save Changes' : 'Add Entry'}
          </Button>
        </div>
      </div>
    </ConsolePanel>
  );
}
