import { zodResolver } from '@hookform/resolvers/zod';
import {
  createEquipmentMaintenanceLogRequestSchema,
  updateEquipmentMaintenanceLogRequestSchema,
} from '@odysseus/shared-schemas';
import { Save, Wrench } from 'lucide-react';
import { useForm, type FieldValues } from 'react-hook-form';

import {
  useAddEquipmentMaintenanceEntryMutation,
  useUpdateEquipmentMaintenanceEntryMutation,
} from '@domains/equipment/hooks/useEquipmentMutations';
import { useLookupValuesQuery } from '@shared/hooks/useLookupValuesQuery';
import { Button, lookupOptions, Divider } from '@shared/ui';
import { ConsolePanel } from '@shared/ui/primitives/console-panel/ConsolePanel';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { normalizeDateString } from '@shared/utils/dateFormatters';
import { notifications } from '@shared/utils/notifications';

import { EquipmentMaintenanceFields } from './EquipmentMaintenanceFields';

import type {
  EquipmentMaintenanceLog,
  CreateEquipmentMaintenanceLogRequest,
  UpdateEquipmentMaintenanceLogRequest,
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

  const typeOptions = lookupOptions(maintenanceTypes, 'Select type...');

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FieldValues>({
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

  const onFormSubmit = (data: FieldValues) => {
    if (isEditing) {
      updateMutation.mutate(
        { itemId, entryId: entry.id, data: data as UpdateEquipmentMaintenanceLogRequest },
        {
          onSuccess: () => {
            notifications.success('Maintenance entry updated');
            onSubmit();
          },
        }
      );
    } else {
      addMutation.mutate(
        { itemId, data: data as CreateEquipmentMaintenanceLogRequest },
        {
          onSuccess: () => {
            notifications.success('Maintenance entry added');
            onSubmit();
          },
        }
      );
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
          <EquipmentMaintenanceFields
            register={register}
            control={control}
            errors={errors}
            typeOptions={typeOptions}
            layout="grid"
          />
        </form>
      </ScrollArea>

      <div className="relative flex-shrink-0 border-t border-line-faint bg-card px-4 py-3 dark:bg-shade/15">
        <Divider tone="primary" className="absolute inset-x-0 -top-px" />
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="maintenance-form"
            variant="primary"
            size="sm"
            disabled={updateMutation.isPending || addMutation.isPending}
            leftIcon={<Save className="h-3.5 w-3.5" />}
          >
            {isEditing ? 'Save Changes' : 'Add Entry'}
          </Button>
        </div>
      </div>
    </ConsolePanel>
  );
}
