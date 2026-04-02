/**
 * Equipment Edit Form
 *
 * React Hook Form for creating and editing equipment items with inline category creation.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { createEquipmentItemRequestSchema } from '@odysseus/shared-schemas';
import { Save, X } from 'lucide-react';
import { useForm, type FieldValues } from 'react-hook-form';

import {
  useCreateEquipmentItemMutation,
  useUpdateEquipmentItemMutation,
} from '@domains/equipment/hooks/useEquipmentMutations';
import { Button } from '@shared/ui';
import { ValidatedInput } from '@shared/ui/components/inputs/ValidatedInput';
import { notifications } from '@shared/utils/notifications';

import type {
  EquipmentItem,
  EquipmentCategory,
  CreateEquipmentItemRequest,
} from '@odysseus/shared-schemas';

interface EquipmentEditFormProps {
  item?: EquipmentItem;
  categories: EquipmentCategory[];
  onSubmit: () => void;
  onCancel: () => void;
}

const STATUS_OPTIONS = [
  { value: 'operational', label: 'Operational' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'out_of_service', label: 'Out of Service' },
];

export function EquipmentEditForm({
  item,
  categories,
  onSubmit,
  onCancel,
}: EquipmentEditFormProps) {
  const isEditing = !!item;
  const createMutation = useCreateEquipmentItemMutation();
  const updateMutation = useUpdateEquipmentItemMutation();

  const categoryOptions = categories.map(c => ({
    value: c.id,
    label: c.parentId
      ? `${categories.find(p => p.id === c.parentId)?.name ?? ''} > ${c.name}`
      : c.name,
  }));

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createEquipmentItemRequestSchema) as never,
    defaultValues: isEditing
      ? {
          categoryId: item.categoryId,
          name: item.name,
          internalId: item.internalId ?? '',
          serialNumber: item.serialNumber ?? '',
          manufacturer: item.manufacturer ?? '',
          model: item.model ?? '',
          description: item.description ?? '',
          location: item.location ?? '',
          status: item.status,
          conditionNotes: item.conditionNotes ?? '',
          purchaseDate: item.purchaseDate
            ? new Date(item.purchaseDate).toISOString().split('T')[0]
            : '',
          warrantyExpiration: item.warrantyExpiration
            ? new Date(item.warrantyExpiration).toISOString().split('T')[0]
            : '',
          purchaseCost: item.purchaseCost,
          assetTag: item.assetTag ?? '',
          nextMaintenanceDate: item.nextMaintenanceDate
            ? new Date(item.nextMaintenanceDate).toISOString().split('T')[0]
            : '',
          notes: item.notes ?? '',
        }
      : {
          status: 'operational',
        },
  });

  const onFormSubmit = async (data: FieldValues) => {
    const validated = data as CreateEquipmentItemRequest;
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: item.id, data: validated });
        notifications.success('Equipment updated');
      } else {
        await createMutation.mutateAsync(validated);
        notifications.success('Equipment created');
      }
      onSubmit();
    } catch {
      notifications.error(isEditing ? 'Failed to update equipment' : 'Failed to create equipment');
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="p-4 space-y-4 overflow-y-auto h-full">
      <h3 className="text-sm font-semibold text-secondary-foreground">
        {isEditing ? 'Edit Equipment' : 'Add Equipment'}
      </h3>

      <div className="space-y-3">
        <ValidatedInput
          label="Name"
          required
          error={!!errors.name}
          helperText={errors.name?.message}
          registration={register('name')}
        />

        <div>
          <label
            htmlFor="eq-categoryId"
            className="text-xs font-medium text-secondary-foreground mb-1 block"
          >
            Category <span className="text-danger">*</span>
          </label>
          <select
            id="eq-categoryId"
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            {...register('categoryId')}
          >
            <option value="">Select category...</option>
            {categoryOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {errors.categoryId && (
            <p className="text-xs text-danger mt-0.5">{errors.categoryId.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="eq-status"
            className="text-xs font-medium text-secondary-foreground mb-1 block"
          >
            Status
          </label>
          <select
            id="eq-status"
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            {...register('status')}
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <ValidatedInput
          label="Internal ID"
          error={!!errors.internalId}
          helperText={errors.internalId?.message}
          registration={register('internalId')}
        />

        <ValidatedInput
          label="Serial Number"
          error={!!errors.serialNumber}
          helperText={errors.serialNumber?.message}
          registration={register('serialNumber')}
        />

        <ValidatedInput
          label="Manufacturer"
          error={!!errors.manufacturer}
          helperText={errors.manufacturer?.message}
          registration={register('manufacturer')}
        />

        <ValidatedInput
          label="Model"
          error={!!errors.model}
          helperText={errors.model?.message}
          registration={register('model')}
        />

        <ValidatedInput
          label="Location"
          error={!!errors.location}
          helperText={errors.location?.message}
          registration={register('location')}
        />

        <ValidatedInput
          label="Purchase Date"
          type="date"
          error={!!errors.purchaseDate}
          helperText={errors.purchaseDate?.message}
          registration={register('purchaseDate')}
        />

        <ValidatedInput
          label="Warranty Expiration"
          type="date"
          error={!!errors.warrantyExpiration}
          helperText={errors.warrantyExpiration?.message}
          registration={register('warrantyExpiration')}
        />

        <ValidatedInput
          label="Purchase Cost"
          type="number"
          error={!!errors.purchaseCost}
          helperText={errors.purchaseCost?.message}
          registration={register('purchaseCost', { valueAsNumber: true })}
        />

        <ValidatedInput
          label="Asset Tag"
          error={!!errors.assetTag}
          helperText={errors.assetTag?.message}
          registration={register('assetTag')}
        />

        <ValidatedInput
          label="Next Maintenance Date"
          type="date"
          error={!!errors.nextMaintenanceDate}
          helperText={errors.nextMaintenanceDate?.message}
          registration={register('nextMaintenanceDate')}
        />

        <ValidatedInput
          label="Condition Notes"
          error={!!errors.conditionNotes}
          helperText={errors.conditionNotes?.message}
          registration={register('conditionNotes')}
        />

        <div>
          <label
            htmlFor="eq-description"
            className="text-xs font-medium text-secondary-foreground mb-1 block"
          >
            Description
          </label>
          <textarea
            id="eq-description"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            rows={3}
            {...register('description')}
          />
        </div>

        <div>
          <label
            htmlFor="eq-notes"
            className="text-xs font-medium text-secondary-foreground mb-1 block"
          >
            Notes
          </label>
          <textarea
            id="eq-notes"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            rows={3}
            {...register('notes')}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          <Save size={14} className="mr-1" />
          {isEditing ? 'Save Changes' : 'Create'}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          <X size={14} className="mr-1" />
          Cancel
        </Button>
      </div>
    </form>
  );
}
