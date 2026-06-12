/**
 * Equipment Edit Form
 *
 * React Hook Form for creating and editing equipment items with category tree dropdown.
 */

import { useMemo } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  createEquipmentItemRequestSchema,
  updateEquipmentItemRequestSchema,
} from '@odysseus/shared-schemas';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Save, SquarePen } from 'lucide-react';
import { useForm, Controller, type FieldValues } from 'react-hook-form';

import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';
import {
  useCreateEquipmentItemMutation,
  useUpdateEquipmentItemMutation,
} from '@domains/equipment/hooks/useEquipmentMutations';
import { Button, Select, DatePicker } from '@shared/ui';
import { ValidatedInput } from '@shared/ui/components/inputs/ValidatedInput';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { formatDateForInput } from '@shared/utils/dateFormatters';
import { notifications } from '@shared/utils/notifications';

import type {
  EquipmentItem,
  EquipmentCategory,
  CreateEquipmentItemRequest,
  UpdateEquipmentItemRequest,
} from '@odysseus/shared-schemas';
import type { SelectOption } from '@shared/ui/primitives/select/types';

interface EquipmentEditFormProps {
  item?: EquipmentItem;
  categories: EquipmentCategory[];
  onSubmit: () => void;
  onCancel: () => void;
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'under_maintenance', label: 'Under Maintenance' },
  { value: 'out_of_service', label: 'Out of Service' },
];

export function EquipmentEditForm({
  item,
  categories,
  onSubmit,
  onCancel,
}: EquipmentEditFormProps) {
  const isEditing = !!item;
  const queryClient = useQueryClient();
  const labId = useLabId();
  const createMutation = useCreateEquipmentItemMutation();
  const updateMutation = useUpdateEquipmentItemMutation();

  const parentNameMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach(c => {
      if (c.parentId) {
        const parent = categories.find(p => p.id === c.parentId);
        if (parent) map.set(c.id, parent.name);
      }
    });
    return map;
  }, [categories]);

  const categoryOptions: SelectOption[] = useMemo(() => {
    const topLevel = categories
      .filter(c => !c.parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

    const options: SelectOption[] = [];
    topLevel.forEach(parent => {
      options.push({ value: parent.id, label: parent.name });
      const subs = categories
        .filter(c => c.parentId === parent.id)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
      subs.forEach(sub => {
        options.push({ value: sub.id, label: sub.name, description: parent.name });
      });
    });
    return options;
  }, [categories]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(
      isEditing ? updateEquipmentItemRequestSchema : createEquipmentItemRequestSchema
    ) as never,
    defaultValues: isEditing
      ? {
          categoryId: item.categoryId,
          name: item.name,
          serialNumber: item.serialNumber ?? '',
          manufacturer: item.manufacturer ?? '',
          model: item.model ?? '',
          description: item.description ?? '',
          location: item.location ?? '',
          status: item.status,
          conditionNotes: item.conditionNotes ?? '',
          purchaseDate: formatDateForInput(item.purchaseDate),
          warrantyExpiration: formatDateForInput(item.warrantyExpiration),
          purchaseCost: item.purchaseCost,
          assetTag: item.assetTag ?? '',
          nextMaintenanceDate: formatDateForInput(item.nextMaintenanceDate),
          notes: item.notes ?? '',
        }
      : {
          status: 'active',
        },
  });

  const onFormSubmit = async (data: FieldValues) => {
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: item.id,
          data: data as UpdateEquipmentItemRequest,
        });
        notifications.success('Equipment updated');
      } else {
        await createMutation.mutateAsync(data as CreateEquipmentItemRequest);
        notifications.success('Equipment created');
      }
      await queryClient.refetchQueries({ queryKey: queryKeys.equipment.items(labId) });
      onSubmit();
    } catch {
      notifications.error(isEditing ? 'Failed to update equipment' : 'Failed to create equipment');
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <ScrollArea className="flex-1 min-h-0">
        <form id="equipment-form" onSubmit={handleSubmit(onFormSubmit)} className="p-4 space-y-4">
          <h3 className="text-sm font-semibold text-secondary-foreground inline-flex items-center gap-1.5">
            {isEditing ? (
              <>
                <SquarePen size={14} className="text-muted-foreground" />
                Edit Equipment Information
              </>
            ) : (
              <>
                <Plus size={14} className="text-muted-foreground" />
                Add Equipment
              </>
            )}
          </h3>

          <div className="space-y-3">
            <ValidatedInput
              label="Name"
              required
              placeholder="e.g., P200 Pipette"
              error={!!errors.name}
              helperText={errors.name?.message}
              registration={register('name')}
            />

            <Controller
              name="categoryId"
              control={control}
              render={({ field: { value, onChange }, fieldState: { error } }) => (
                <Select
                  label="Category"
                  options={[{ value: '', label: 'Select category...' }, ...categoryOptions]}
                  value={value ?? ''}
                  onChange={v => onChange(v)}
                  state={error ? 'error' : 'default'}
                  error={error?.message}
                  fullWidth
                  renderOption={option => {
                    const isSub = !!option.description;
                    return (
                      <div className="w-full">
                        {isSub ? (
                          <span className="pl-4 text-sm">{option.label}</span>
                        ) : (
                          <span className="text-sm font-semibold">{option.label}</span>
                        )}
                      </div>
                    );
                  }}
                  renderValue={selected => {
                    const opt = selected[0];
                    if (!opt)
                      return (
                        <span className="text-muted-foreground opacity-40">Select category...</span>
                      );
                    const parentName = parentNameMap.get(opt.value as string);
                    if (parentName) {
                      return (
                        <span className="text-foreground text-sm">
                          <span className="text-muted-foreground">{parentName}</span>
                          <span className="text-muted-foreground mx-1">›</span>
                          {opt.label}
                        </span>
                      );
                    }
                    return <span className="text-foreground text-sm">{opt.label}</span>;
                  }}
                />
              )}
            />

            <Controller
              name="status"
              control={control}
              render={({ field: { value, onChange } }) => (
                <Select
                  label="Status"
                  options={STATUS_OPTIONS}
                  value={value ?? 'active'}
                  onChange={v => onChange(v)}
                  fullWidth
                />
              )}
            />

            <ValidatedInput
              label="Manufacturer"
              placeholder="e.g., Eppendorf, Thermo Fisher"
              error={!!errors.manufacturer}
              helperText={errors.manufacturer?.message}
              registration={register('manufacturer')}
            />

            <ValidatedInput
              label="Model"
              placeholder="e.g., Research Plus"
              error={!!errors.model}
              helperText={errors.model?.message}
              registration={register('model')}
            />

            <ValidatedInput
              label="Serial Number"
              placeholder="e.g., SN-2024-001"
              error={!!errors.serialNumber}
              helperText={errors.serialNumber?.message}
              registration={register('serialNumber')}
            />

            <ValidatedInput
              label="Asset Tag"
              placeholder="e.g., EQ-0042"
              error={!!errors.assetTag}
              helperText={errors.assetTag?.message}
              registration={register('assetTag')}
            />

            <ValidatedInput
              label="Description"
              type="textarea"
              placeholder="Brief description of the equipment..."
              registration={register('description')}
            />

            <ValidatedInput
              label="Location"
              placeholder="e.g., Room 204, Bench 3"
              error={!!errors.location}
              helperText={errors.location?.message}
              registration={register('location')}
            />

            <Controller
              name="purchaseDate"
              control={control}
              render={({ field: { value, onChange }, fieldState: { error } }) => (
                <div>
                  <span className="block text-sm font-medium text-secondary-foreground mb-1">
                    Purchase Date
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
              label="Purchase Cost"
              type="number"
              step="0.01"
              error={!!errors.purchaseCost}
              helperText={errors.purchaseCost?.message}
              registration={register('purchaseCost', {
                setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
              })}
            />

            <Controller
              name="warrantyExpiration"
              control={control}
              render={({ field: { value, onChange }, fieldState: { error } }) => (
                <div>
                  <span className="block text-sm font-medium text-secondary-foreground mb-1">
                    Warranty Expiration
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

            <Controller
              name="nextMaintenanceDate"
              control={control}
              render={({ field: { value, onChange }, fieldState: { error } }) => (
                <div>
                  <span className="block text-sm font-medium text-secondary-foreground mb-1">
                    Next Maintenance Date
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
              label="Condition Notes"
              placeholder="Current condition or issues..."
              error={!!errors.conditionNotes}
              helperText={errors.conditionNotes?.message}
              registration={register('conditionNotes')}
            />

            <ValidatedInput
              label="Notes"
              type="textarea"
              placeholder="Additional notes and observations..."
              registration={register('notes')}
            />
          </div>
        </form>
      </ScrollArea>

      <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border flex-shrink-0">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="equipment-form"
          size="sm"
          disabled={isSubmitting}
          leftIcon={isEditing ? <Save className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
        >
          {isEditing ? 'Save Changes' : 'Add Equipment'}
        </Button>
      </div>
    </div>
  );
}
