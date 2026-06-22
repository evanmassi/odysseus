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
import { Button, DatePicker, HeaderStrip, NubDivider, SectionHeader, Select } from '@shared/ui';
import { ValidatedInput } from '@shared/ui/components/inputs/ValidatedInput';
import { ConsolePanel } from '@shared/ui/primitives/console-panel/ConsolePanel';
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

const SELECT_LABEL =
  'block type-label text-label-2xs tracking-label-wide mb-1.5 text-muted-foreground';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'under_maintenance', label: 'Under Maintenance' },
  { value: 'out_of_service', label: 'Out of Service' },
];

const TRACKED_FIELDS = [
  'name',
  'categoryId',
  'status',
  'manufacturer',
  'model',
  'serialNumber',
  'assetTag',
  'description',
  'location',
  'purchaseDate',
  'purchaseCost',
  'warrantyExpiration',
  'nextMaintenanceDate',
  'conditionNotes',
  'notes',
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
    watch,
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

  const allValues = watch() as Record<string, unknown>;
  const filledCount = TRACKED_FIELDS.filter(f => {
    const v = allValues[f];
    return v != null && String(v).trim() !== '';
  }).length;
  const completionPct = Math.round((filledCount / TRACKED_FIELDS.length) * 100);

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
    <ConsolePanel intensity="soft" className="flex h-full min-h-0 flex-col">
      <div className="flex flex-shrink-0 items-center gap-3 border-b border-line-faint px-4 py-3">
        <span className="p-1.5 text-muted-foreground">
          {isEditing ? <SquarePen size={20} /> : <Plus size={20} />}
        </span>
        <h2 className="text-lg font-medium text-foreground">
          {isEditing ? 'Edit Equipment' : 'Add Equipment'}
        </h2>
      </div>

      <HeaderStrip className="px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 whitespace-nowrap type-label text-label-2xs tracking-label-wide text-muted-foreground">
            <span
              aria-hidden
              className="h-2.5 w-0.5 bg-primary/80 dark:shadow-[0_0_6px_hsl(var(--primary)/0.55)]"
            />
            Completeness
          </span>
          <span className="font-mono text-data-sm tracking-[0.06em] text-foreground">
            {filledCount}/{TRACKED_FIELDS.length}
          </span>
          <span className="relative h-1 w-20 overflow-hidden bg-foreground/10">
            <span
              className="absolute inset-y-0 left-0 bg-primary/70 dark:shadow-[0_0_6px_hsl(var(--primary)/0.5)] transition-[width] duration-300"
              style={{ width: `${completionPct}%` }}
            />
          </span>
        </div>
      </HeaderStrip>

      <ScrollArea className="min-h-0 flex-1">
        <form id="equipment-form" onSubmit={handleSubmit(onFormSubmit)} className="space-y-2 p-4">
          <SectionHeader title="Identification" size="sm" />
          <ValidatedInput
            label="Name"
            labelStyle="compact"
            required
            placeholder="e.g., P200 Pipette"
            error={!!errors.name}
            helperText={errors.name?.message}
            registration={register('name')}
          />
          <div className="grid grid-cols-2 gap-2.5 [&>*]:min-w-0">
            <Controller
              name="categoryId"
              control={control}
              render={({ field: { value, onChange }, fieldState: { error } }) => (
                <div>
                  {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Select is a custom component without native input */}
                  <label id="category-label" className={SELECT_LABEL}>
                    Category
                  </label>
                  <Select
                    options={[{ value: '', label: 'Select category...' }, ...categoryOptions]}
                    value={value ?? ''}
                    onChange={v => onChange(v)}
                    state={error ? 'error' : 'default'}
                    error={error?.message}
                    fullWidth
                    aria-labelledby="category-label"
                    renderOption={option => {
                      const isSub = !!option.description;
                      return (
                        <div className="w-full">
                          {isSub ? (
                            <span className="pl-4 text-body">{option.label}</span>
                          ) : (
                            <span className="text-body font-semibold">{option.label}</span>
                          )}
                        </div>
                      );
                    }}
                    renderValue={selected => {
                      const opt = selected[0];
                      if (!opt)
                        return (
                          <span className="text-muted-foreground opacity-40">
                            Select category...
                          </span>
                        );
                      const parentName = parentNameMap.get(opt.value as string);
                      if (parentName) {
                        return (
                          <span className="text-body text-foreground">
                            <span className="text-muted-foreground">{parentName}</span>
                            <span className="mx-1 text-muted-foreground">›</span>
                            {opt.label}
                          </span>
                        );
                      }
                      return <span className="text-body text-foreground">{opt.label}</span>;
                    }}
                  />
                </div>
              )}
            />
            <Controller
              name="status"
              control={control}
              render={({ field: { value, onChange } }) => (
                <div>
                  {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Select is a custom component without native input */}
                  <label id="status-label" className={SELECT_LABEL}>
                    Status
                  </label>
                  <Select
                    options={STATUS_OPTIONS}
                    value={value ?? 'active'}
                    onChange={v => onChange(v)}
                    fullWidth
                    aria-labelledby="status-label"
                  />
                </div>
              )}
            />
          </div>

          <div className="!mt-3.5">
            <SectionHeader title="Details" size="sm" />
          </div>
          <div className="grid grid-cols-2 gap-2.5 [&>*]:min-w-0">
            <ValidatedInput
              label="Manufacturer"
              labelStyle="compact"
              placeholder="e.g., Eppendorf"
              error={!!errors.manufacturer}
              helperText={errors.manufacturer?.message}
              registration={register('manufacturer')}
            />
            <ValidatedInput
              label="Model"
              labelStyle="compact"
              placeholder="e.g., Research Plus"
              error={!!errors.model}
              helperText={errors.model?.message}
              registration={register('model')}
            />
            <ValidatedInput
              label="Serial Number"
              labelStyle="compact"
              placeholder="e.g., SN-2024-001"
              error={!!errors.serialNumber}
              helperText={errors.serialNumber?.message}
              registration={register('serialNumber')}
            />
            <ValidatedInput
              label="Asset Tag"
              labelStyle="compact"
              placeholder="e.g., EQ-0042"
              error={!!errors.assetTag}
              helperText={errors.assetTag?.message}
              registration={register('assetTag')}
            />
            <ValidatedInput
              label="Location"
              labelStyle="compact"
              className="col-span-2"
              placeholder="e.g., Room 204, Bench 3"
              error={!!errors.location}
              helperText={errors.location?.message}
              registration={register('location')}
            />
            <ValidatedInput
              label="Description"
              labelStyle="compact"
              type="textarea"
              className="col-span-2"
              placeholder="Brief description of the equipment..."
              registration={register('description')}
            />
          </div>

          <div className="!mt-3.5">
            <SectionHeader title="Procurement & Warranty" size="sm" />
          </div>
          <div className="grid grid-cols-2 gap-2.5 [&>*]:min-w-0">
            <Controller
              name="purchaseDate"
              control={control}
              render={({ field: { value, onChange }, fieldState: { error } }) => (
                <div>
                  <span className={SELECT_LABEL}>Purchase Date</span>
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
              label="Purchase Cost"
              labelStyle="compact"
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
                  <span className={SELECT_LABEL}>Warranty Expiration</span>
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
          </div>

          <div className="!mt-3.5">
            <SectionHeader title="Maintenance" size="sm" />
          </div>
          <div className="grid grid-cols-2 gap-2.5 [&>*]:min-w-0">
            <Controller
              name="nextMaintenanceDate"
              control={control}
              render={({ field: { value, onChange }, fieldState: { error } }) => (
                <div>
                  <span className={SELECT_LABEL}>Next Maintenance</span>
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
              label="Condition Notes"
              labelStyle="compact"
              placeholder="Current condition or issues..."
              error={!!errors.conditionNotes}
              helperText={errors.conditionNotes?.message}
              registration={register('conditionNotes')}
            />
          </div>

          <div className="!mt-3.5">
            <SectionHeader title="Notes" size="sm" />
          </div>
          <ValidatedInput
            label=""
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
            form="equipment-form"
            variant="primary"
            size="sm"
            disabled={isSubmitting}
            leftIcon={
              isEditing ? <Save className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />
            }
          >
            {isEditing ? 'Save Changes' : 'Add Equipment'}
          </Button>
        </div>
      </div>
    </ConsolePanel>
  );
}
