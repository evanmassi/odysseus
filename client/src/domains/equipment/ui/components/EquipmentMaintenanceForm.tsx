/**
 * Equipment Maintenance Form
 *
 * Form for adding or editing maintenance log entries with lab-managed type dropdown.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { createEquipmentMaintenanceLogRequestSchema } from '@odysseus/shared-schemas';
import { Save, X } from 'lucide-react';
import { useForm, Controller, type FieldValues } from 'react-hook-form';

import {
  useAddEquipmentMaintenanceEntryMutation,
  useUpdateEquipmentMaintenanceEntryMutation,
} from '@domains/equipment/hooks/useEquipmentMutations';
import { useLookupValuesQuery } from '@shared/hooks/useLookupValuesQuery';
import { Button, Select, DatePicker } from '@shared/ui';
import { ValidatedInput } from '@shared/ui/components/inputs/ValidatedInput';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { formatDateForInput } from '@shared/utils/dateFormatters';
import { notifications } from '@shared/utils/notifications';

import type {
  EquipmentMaintenanceLog,
  CreateEquipmentMaintenanceLogRequest,
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
    resolver: zodResolver(createEquipmentMaintenanceLogRequestSchema) as never,
    defaultValues: isEditing
      ? {
          datePerformed: formatDateForInput(entry.datePerformed),
          maintenanceType: entry.maintenanceType,
          performedBy: entry.performedBy ?? '',
          technician: entry.technician ?? '',
          description: entry.description ?? '',
          nextScheduledDate: formatDateForInput(entry.nextScheduledDate),
          cost: entry.cost,
          notes: entry.notes ?? '',
        }
      : {},
  });

  const onFormSubmit = async (data: FieldValues) => {
    const validated = data as CreateEquipmentMaintenanceLogRequest;
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ itemId, entryId: entry.id, data: validated });
        notifications.success('Maintenance entry updated');
      } else {
        await addMutation.mutateAsync({ itemId, data: validated });
        notifications.success('Maintenance entry added');
      }
      onSubmit();
    } catch {
      notifications.error(isEditing ? 'Failed to update entry' : 'Failed to add entry');
    }
  };

  return (
    <ScrollArea className="h-full">
      <form onSubmit={handleSubmit(onFormSubmit)} className="p-4 space-y-4">
        <h3 className="text-sm font-semibold text-secondary-foreground">
          {isEditing ? 'Edit Maintenance Entry' : 'Add Maintenance Entry'}
        </h3>

        <div className="space-y-3">
          <Controller
            name="datePerformed"
            control={control}
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <div>
                <span className="block text-sm font-medium text-secondary-foreground mb-1">
                  Date Performed *
                </span>
                <DatePicker
                  value={(value as string) ?? ''}
                  onChange={onChange}
                  state={error ? 'error' : 'default'}
                  fullWidth
                />
                {error && <p className="text-xs text-danger-text mt-1">{error.message}</p>}
              </div>
            )}
          />

          <Controller
            name="maintenanceType"
            control={control}
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <Select
                label="Maintenance Type"
                options={typeOptions}
                value={value ?? ''}
                onChange={v => onChange(v)}
                state={error ? 'error' : 'default'}
                error={error?.message}
                fullWidth
              />
            )}
          />

          <ValidatedInput
            label="Performed By (Vendor/Service)"
            error={!!errors.performedBy}
            helperText={errors.performedBy?.message}
            registration={register('performedBy')}
          />

          <ValidatedInput
            label="Technician"
            error={!!errors.technician}
            helperText={errors.technician?.message}
            registration={register('technician')}
          />

          <div>
            <label
              htmlFor="maint-description"
              className="text-xs font-medium text-secondary-foreground mb-1 block"
            >
              Description
            </label>
            <textarea
              id="maint-description"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              rows={3}
              {...register('description')}
            />
          </div>

          <Controller
            name="nextScheduledDate"
            control={control}
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <div>
                <span className="block text-sm font-medium text-secondary-foreground mb-1">
                  Next Scheduled Date
                </span>
                <DatePicker
                  value={(value as string) ?? ''}
                  onChange={onChange}
                  state={error ? 'error' : 'default'}
                  fullWidth
                  clearable
                />
                {error && <p className="text-xs text-danger-text mt-1">{error.message}</p>}
              </div>
            )}
          />

          <ValidatedInput
            label="Cost"
            type="number"
            step="0.01"
            error={!!errors.cost}
            helperText={errors.cost?.message}
            registration={register('cost', {
              setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
            })}
          />

          <div>
            <label
              htmlFor="maint-notes"
              className="text-xs font-medium text-secondary-foreground mb-1 block"
            >
              Notes
            </label>
            <textarea
              id="maint-notes"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              rows={2}
              {...register('notes')}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting}
            leftIcon={<Save className="w-3.5 h-3.5" />}
          >
            {isEditing ? 'Save Changes' : 'Add Entry'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onCancel}
            leftIcon={<X className="w-3.5 h-3.5" />}
          >
            Cancel
          </Button>
        </div>
      </form>
    </ScrollArea>
  );
}
