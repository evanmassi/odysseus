/**
 * Equipment Edit Form
 *
 * React Hook Form for creating and editing equipment items with inline category creation.
 */

import { useMemo } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { createEquipmentItemRequestSchema } from '@odysseus/shared-schemas';
import { Save, X } from 'lucide-react';
import { useForm, Controller, type FieldValues } from 'react-hook-form';

import {
  useCreateEquipmentItemMutation,
  useUpdateEquipmentItemMutation,
} from '@domains/equipment/hooks/useEquipmentMutations';
import { Button, Select, DatePicker } from '@shared/ui';
import { ValidatedInput } from '@shared/ui/components/inputs/ValidatedInput';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { notifications } from '@shared/utils/notifications';

import type {
  EquipmentItem,
  EquipmentCategory,
  CreateEquipmentItemRequest,
} from '@odysseus/shared-schemas';
import type { SelectOption } from '@shared/ui/primitives/select/types';

interface EquipmentEditFormProps {
  item?: EquipmentItem;
  categories: EquipmentCategory[];
  onSubmit: () => void;
  onCancel: () => void;
}

const STATUS_OPTIONS = [
  { value: 'operational', label: 'In Use' },
  { value: 'maintenance', label: 'Under Maintenance' },
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
    resolver: zodResolver(createEquipmentItemRequestSchema) as never,
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
    <ScrollArea className="h-full">
      <form onSubmit={handleSubmit(onFormSubmit)} className="p-4 space-y-4">
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
                value={value ?? 'operational'}
                onChange={v => onChange(v)}
                fullWidth
              />
            )}
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

          <ValidatedInput
            label="Asset Tag"
            error={!!errors.assetTag}
            helperText={errors.assetTag?.message}
            registration={register('assetTag')}
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
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting}
            leftIcon={<Save className="w-3.5 h-3.5" />}
          >
            {isEditing ? 'Save Changes' : 'Create'}
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
