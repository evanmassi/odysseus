/**
 * Equipment Maintenance Form
 *
 * Form for adding or editing maintenance log entries with lab-managed type dropdown.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { createEquipmentMaintenanceLogRequestSchema } from '@odysseus/shared-schemas';
import { Save, X } from 'lucide-react';
import { useForm, type FieldValues } from 'react-hook-form';

import {
  useAddEquipmentMaintenanceEntryMutation,
  useUpdateEquipmentMaintenanceEntryMutation,
} from '@domains/equipment/hooks/useEquipmentMutations';
import { useLookupValuesQuery } from '@shared/hooks/useLookupValuesQuery';
import { Button } from '@shared/ui';
import { ValidatedInput } from '@shared/ui/components/inputs/ValidatedInput';
import { notifications } from '@shared/utils/notifications';

import type {
  EquipmentMaintenanceLog,
  CreateEquipmentMaintenanceLogRequest,
} from '@odysseus/shared-schemas';

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

  const typeOptions = [
    { value: '', label: 'Select type...' },
    ...maintenanceTypes.map(t => ({ value: t.value, label: t.value })),
  ];

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createEquipmentMaintenanceLogRequestSchema) as never,
    defaultValues: isEditing
      ? {
          datePerformed: entry.datePerformed
            ? new Date(entry.datePerformed).toISOString().split('T')[0]
            : '',
          maintenanceType: entry.maintenanceType,
          performedBy: entry.performedBy ?? '',
          technician: entry.technician ?? '',
          description: entry.description ?? '',
          nextScheduledDate: entry.nextScheduledDate
            ? new Date(entry.nextScheduledDate).toISOString().split('T')[0]
            : '',
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
    <form onSubmit={handleSubmit(onFormSubmit)} className="p-4 space-y-4 overflow-y-auto h-full">
      <h3 className="text-sm font-semibold text-secondary-foreground">
        {isEditing ? 'Edit Maintenance Entry' : 'Add Maintenance Entry'}
      </h3>

      <div className="space-y-3">
        <ValidatedInput
          label="Date Performed"
          type="date"
          required
          error={!!errors.datePerformed}
          helperText={errors.datePerformed?.message}
          registration={register('datePerformed')}
        />

        <div>
          <label
            htmlFor="maint-type"
            className="text-xs font-medium text-secondary-foreground mb-1 block"
          >
            Maintenance Type <span className="text-danger">*</span>
          </label>
          <select
            id="maint-type"
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            {...register('maintenanceType')}
          >
            {typeOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {errors.maintenanceType && (
            <p className="text-xs text-danger mt-0.5">{errors.maintenanceType.message}</p>
          )}
        </div>

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

        <ValidatedInput
          label="Next Scheduled Date"
          type="date"
          error={!!errors.nextScheduledDate}
          helperText={errors.nextScheduledDate?.message}
          registration={register('nextScheduledDate')}
        />

        <ValidatedInput
          label="Cost"
          type="number"
          error={!!errors.cost}
          helperText={errors.cost?.message}
          registration={register('cost', { valueAsNumber: true })}
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
        <Button type="submit" size="sm" disabled={isSubmitting}>
          <Save size={14} className="mr-1" />
          {isEditing ? 'Save Changes' : 'Add Entry'}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          <X size={14} className="mr-1" />
          Cancel
        </Button>
      </div>
    </form>
  );
}
