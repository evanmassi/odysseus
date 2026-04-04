/**
 * Equipment Batch Update Modal
 *
 * Multi-select equipment items across categories and apply a bulk action:
 * log maintenance, change status, or relocate to a different category.
 */

import { useState, useMemo, useCallback } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  createEquipmentMaintenanceLogRequestSchema,
  equipmentBulkStatusValues,
  equipmentBulkStatusRequestSchema,
  equipmentBulkRelocateRequestSchema,
} from '@odysseus/shared-schemas';
import { Layers, Wrench, RefreshCw, FolderInput } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';

import { useEquipmentBulkUpdateMutation } from '@domains/equipment/hooks';
import { useLookupValuesQuery } from '@shared/hooks/useLookupValuesQuery';
import { Button, Checkbox, DatePicker, Select, Tabs, Tab } from '@shared/ui';
import { ValidatedInput } from '@shared/ui/components/inputs/ValidatedInput';
import { BaseModal } from '@shared/ui/components/overlays/BaseModal';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { notifications } from '@shared/utils/notifications';

import type {
  EquipmentItem,
  EquipmentCategory,
  EquipmentStatus,
  CreateEquipmentMaintenanceLogRequest,
  EquipmentBulkResponse,
} from '@odysseus/shared-schemas';
import type { SelectOption } from '@shared/ui';
import type { FieldValues } from 'react-hook-form';

type BatchActionType = 'maintenance' | 'status' | 'relocate';

interface EquipmentBatchUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: EquipmentItem[];
  categories: EquipmentCategory[];
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  under_maintenance: 'Under Maintenance',
  out_of_service: 'Out of Service',
};

// Selection

interface CategoryGroup {
  category: EquipmentCategory;
  items: EquipmentItem[];
  subcategories: Array<{
    category: EquipmentCategory;
    items: EquipmentItem[];
  }>;
}

function buildCategoryGroups(
  categories: EquipmentCategory[],
  items: EquipmentItem[]
): CategoryGroup[] {
  const nonDecommissioned = items.filter(i => i.status !== 'decommissioned');
  const topLevel = categories
    .filter(c => !c.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  return topLevel
    .map(parent => {
      const subs = categories
        .filter(c => c.parentId === parent.id)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

      const directItems = nonDecommissioned.filter(i => i.categoryId === parent.id);
      const subcategories = subs.map(sub => ({
        category: sub,
        items: nonDecommissioned.filter(i => i.categoryId === sub.id),
      }));

      return { category: parent, items: directItems, subcategories };
    })
    .filter(g => g.items.length > 0 || g.subcategories.some(s => s.items.length > 0));
}

function getAllItemIds(group: CategoryGroup): string[] {
  return [
    ...group.items.map(i => i.id),
    ...group.subcategories.flatMap(s => s.items.map(i => i.id)),
  ];
}

function ItemSelector({
  categories,
  items,
  selectedIds,
  onSelectionChange,
}: {
  categories: EquipmentCategory[];
  items: EquipmentItem[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
}) {
  const groups = useMemo(() => buildCategoryGroups(categories, items), [categories, items]);

  const allSelectableIds = useMemo(() => groups.flatMap(getAllItemIds), [groups]);

  const allSelected =
    allSelectableIds.length > 0 && allSelectableIds.every(id => selectedIds.has(id));
  const someSelected = allSelectableIds.some(id => selectedIds.has(id));

  const toggleAll = useCallback(() => {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(allSelectableIds));
    }
  }, [allSelected, allSelectableIds, onSelectionChange]);

  const toggleCategory = useCallback(
    (categoryItemIds: string[]) => {
      const next = new Set(selectedIds);
      const allChecked = categoryItemIds.every(id => next.has(id));
      categoryItemIds.forEach(id => (allChecked ? next.delete(id) : next.add(id)));
      onSelectionChange(next);
    },
    [selectedIds, onSelectionChange]
  );

  const toggleItem = useCallback(
    (itemId: string) => {
      const next = new Set(selectedIds);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      onSelectionChange(next);
    },
    [selectedIds, onSelectionChange]
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <span className="text-xs font-medium text-secondary-foreground">Equipment</span>
        <button type="button" onClick={toggleAll} className="text-xs text-primary hover:underline">
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>
      </div>
      <div className="flex items-center gap-2 mb-2 flex-shrink-0">
        <Checkbox
          checked={allSelected}
          indeterminate={someSelected && !allSelected}
          onChange={toggleAll}
          aria-label="Select all equipment"
        />
        <span className="text-sm text-card-foreground">
          All Equipment ({allSelectableIds.length})
        </span>
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-1 pr-2">
          {groups.map(group => {
            const groupIds = getAllItemIds(group);
            const groupAllChecked = groupIds.every(id => selectedIds.has(id));
            const groupSomeChecked = groupIds.some(id => selectedIds.has(id));

            return (
              <div key={group.category.id}>
                <div className="flex items-center gap-2 py-1">
                  <Checkbox
                    checked={groupAllChecked}
                    indeterminate={groupSomeChecked && !groupAllChecked}
                    onChange={() => toggleCategory(groupIds)}
                    aria-label={`Select all in ${group.category.name}`}
                  />
                  <span className="text-sm font-medium text-card-foreground">
                    {group.category.name}
                  </span>
                </div>

                {group.items.map(item => (
                  <div key={item.id} className="flex items-center gap-2 py-0.5 pl-6">
                    <Checkbox
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleItem(item.id)}
                      aria-label={`Select ${item.name}`}
                    />
                    <span className="text-sm text-card-foreground/80 truncate">{item.name}</span>
                  </div>
                ))}

                {group.subcategories.map(sub => {
                  if (sub.items.length === 0) return null;
                  const subIds = sub.items.map(i => i.id);
                  const subAllChecked = subIds.every(id => selectedIds.has(id));
                  const subSomeChecked = subIds.some(id => selectedIds.has(id));

                  return (
                    <div key={sub.category.id} className="pl-4">
                      <div className="flex items-center gap-2 py-1">
                        <Checkbox
                          checked={subAllChecked}
                          indeterminate={subSomeChecked && !subAllChecked}
                          onChange={() => toggleCategory(subIds)}
                          aria-label={`Select all in ${sub.category.name}`}
                        />
                        <span className="text-sm font-medium text-card-foreground/80">
                          {sub.category.name}
                        </span>
                      </div>
                      {sub.items.map(item => (
                        <div key={item.id} className="flex items-center gap-2 py-0.5 pl-6">
                          <Checkbox
                            checked={selectedIds.has(item.id)}
                            onChange={() => toggleItem(item.id)}
                            aria-label={`Select ${item.name}`}
                          />
                          <span className="text-sm text-card-foreground/80 truncate">
                            {item.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

// Action forms

function MaintenanceForm({
  selectedCount,
  isPending,
  onSubmit,
}: {
  selectedCount: number;
  isPending: boolean;
  onSubmit: (data: CreateEquipmentMaintenanceLogRequest) => void;
}) {
  const { data: maintenanceTypes = [] } = useLookupValuesQuery('equipment_maintenance_type');

  const typeOptions: SelectOption[] = [
    { value: '', label: 'Select type...' },
    ...maintenanceTypes.map(t => ({ value: t.value, label: t.value })),
  ];

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid },
  } = useForm({
    resolver: zodResolver(createEquipmentMaintenanceLogRequestSchema) as never,
    mode: 'onChange',
  });

  const onFormSubmit = (data: FieldValues) => {
    onSubmit(data as CreateEquipmentMaintenanceLogRequest);
  };

  return (
    <form id="batch-action-form" onSubmit={handleSubmit(onFormSubmit)} className="space-y-3">
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
            label="Maintenance Type *"
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
        error={!!errors['performedBy']}
        helperText={errors['performedBy']?.message as string}
        registration={register('performedBy')}
      />

      <ValidatedInput
        label="Technician"
        error={!!errors['technician']}
        helperText={errors['technician']?.message as string}
        registration={register('technician')}
      />

      <div>
        <label
          htmlFor="batch-description"
          className="text-xs font-medium text-secondary-foreground mb-1 block"
        >
          Description
        </label>
        <textarea
          id="batch-description"
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
        error={!!errors['cost']}
        helperText={errors['cost']?.message as string}
        registration={register('cost', {
          setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
        })}
      />

      <div>
        <label
          htmlFor="batch-notes"
          className="text-xs font-medium text-secondary-foreground mb-1 block"
        >
          Notes
        </label>
        <textarea
          id="batch-notes"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          rows={2}
          {...register('notes')}
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        size="sm"
        fullWidth
        disabled={selectedCount === 0 || !isValid}
        isLoading={isPending}
      >
        Log Maintenance for {selectedCount} {selectedCount === 1 ? 'item' : 'items'}
      </Button>
    </form>
  );
}

const bulkStatusFormSchema = equipmentBulkStatusRequestSchema.shape.data;

function StatusForm({
  selectedCount,
  isPending,
  onSubmit,
}: {
  selectedCount: number;
  isPending: boolean;
  onSubmit: (data: { status: EquipmentStatus; conditionNotes?: string }) => void;
}) {
  const statusOptions: SelectOption[] = equipmentBulkStatusValues.map(s => ({
    value: s,
    label: STATUS_LABELS[s] ?? s,
  }));

  const {
    handleSubmit,
    control,
    formState: { isValid },
  } = useForm({
    resolver: zodResolver(bulkStatusFormSchema) as never,
    mode: 'onChange',
  });

  const onFormSubmit = (data: FieldValues) => {
    onSubmit(data as { status: EquipmentStatus; conditionNotes?: string });
  };

  return (
    <form id="batch-action-form" onSubmit={handleSubmit(onFormSubmit)} className="space-y-3">
      <Controller
        name="status"
        control={control}
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <Select
            label="Status *"
            options={statusOptions}
            value={value ?? ''}
            onChange={v => onChange(v)}
            state={error ? 'error' : 'default'}
            error={error?.message}
            fullWidth
          />
        )}
      />

      <Controller
        name="conditionNotes"
        control={control}
        render={({ field: { value, onChange } }) => (
          <div>
            <label
              htmlFor="batch-condition"
              className="text-xs font-medium text-secondary-foreground mb-1 block"
            >
              Condition Notes
            </label>
            <textarea
              id="batch-condition"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              rows={3}
              value={(value as string) ?? ''}
              onChange={e => onChange(e.target.value)}
            />
          </div>
        )}
      />

      <Button
        type="submit"
        variant="primary"
        size="sm"
        fullWidth
        disabled={selectedCount === 0 || !isValid}
        isLoading={isPending}
      >
        Change Status for {selectedCount} {selectedCount === 1 ? 'item' : 'items'}
      </Button>
    </form>
  );
}

const bulkRelocateFormSchema = equipmentBulkRelocateRequestSchema.shape.data;

function RelocateForm({
  selectedCount,
  isPending,
  categories,
  onSubmit,
}: {
  selectedCount: number;
  isPending: boolean;
  categories: EquipmentCategory[];
  onSubmit: (data: { categoryId: string }) => void;
}) {
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
    handleSubmit,
    control,
    formState: { isValid },
  } = useForm({
    resolver: zodResolver(bulkRelocateFormSchema) as never,
    mode: 'onChange',
  });

  const onFormSubmit = (data: FieldValues) => {
    onSubmit(data as { categoryId: string });
  };

  return (
    <form id="batch-action-form" onSubmit={handleSubmit(onFormSubmit)} className="space-y-3">
      <Controller
        name="categoryId"
        control={control}
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <Select
            label="Target Category *"
            options={categoryOptions}
            value={value ?? ''}
            onChange={v => onChange(v)}
            state={error ? 'error' : 'default'}
            error={error?.message}
            fullWidth
          />
        )}
      />

      <Button
        type="submit"
        variant="primary"
        size="sm"
        fullWidth
        disabled={selectedCount === 0 || !isValid}
        isLoading={isPending}
      >
        Relocate {selectedCount} {selectedCount === 1 ? 'item' : 'items'}
      </Button>
    </form>
  );
}

// Main modal

export function EquipmentBatchUpdateModal({
  isOpen,
  onClose,
  items,
  categories,
}: EquipmentBatchUpdateModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionType, setActionType] = useState<BatchActionType>('maintenance');
  const bulkMutation = useEquipmentBulkUpdateMutation();

  const handleResult = useCallback(
    (result: EquipmentBulkResponse) => {
      if (result.failed.length === 0) {
        notifications.success(`Updated ${result.succeeded.length} items`);
      } else if (result.succeeded.length === 0) {
        notifications.error(`All ${result.failed.length} items failed`);
      } else {
        notifications.warning(
          `${result.succeeded.length} succeeded, ${result.failed.length} failed`
        );
      }
      setSelectedIds(new Set());
      onClose();
    },
    [onClose]
  );

  const handleMaintenanceSubmit = useCallback(
    (data: CreateEquipmentMaintenanceLogRequest) => {
      bulkMutation.mutate(
        { type: 'maintenance', itemIds: Array.from(selectedIds), data },
        { onSuccess: handleResult }
      );
    },
    [selectedIds, bulkMutation, handleResult]
  );

  const handleStatusSubmit = useCallback(
    (data: { status: EquipmentStatus; conditionNotes?: string }) => {
      bulkMutation.mutate(
        { type: 'status', itemIds: Array.from(selectedIds), data },
        { onSuccess: handleResult }
      );
    },
    [selectedIds, bulkMutation, handleResult]
  );

  const handleRelocateSubmit = useCallback(
    (data: { categoryId: string }) => {
      bulkMutation.mutate(
        { type: 'relocate', itemIds: Array.from(selectedIds), data },
        { onSuccess: handleResult }
      );
    },
    [selectedIds, bulkMutation, handleResult]
  );

  const handleClose = useCallback(() => {
    setSelectedIds(new Set());
    setActionType('maintenance');
    onClose();
  }, [onClose]);

  return (
    <BaseModal
      isOpen={isOpen}
      title="Batch Update"
      icon={<Layers className="w-4 h-4" />}
      onClose={handleClose}
      size="lg"
      fixedHeight
      contentClassName="p-0"
    >
      <div className="flex h-full min-h-0">
        <div className="w-1/2 border-r border-border p-4 flex flex-col min-h-0">
          <ItemSelector
            categories={categories}
            items={items}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        </div>

        <div className="w-1/2 flex flex-col min-h-0">
          <div className="flex-shrink-0 border-b border-border">
            <Tabs
              value={actionType}
              onChange={v => setActionType(v as BatchActionType)}
              orientation="horizontal"
            >
              <Tab id="maintenance" icon={<Wrench className="w-3.5 h-3.5" />}>
                Maintenance
              </Tab>
              <Tab id="status" icon={<RefreshCw className="w-3.5 h-3.5" />}>
                Status
              </Tab>
              <Tab id="relocate" icon={<FolderInput className="w-3.5 h-3.5" />}>
                Relocate
              </Tab>
            </Tabs>
          </div>

          <ScrollArea className="flex-1 min-h-0 p-4">
            {actionType === 'maintenance' && (
              <MaintenanceForm
                selectedCount={selectedIds.size}
                isPending={bulkMutation.isPending}
                onSubmit={handleMaintenanceSubmit}
              />
            )}
            {actionType === 'status' && (
              <StatusForm
                selectedCount={selectedIds.size}
                isPending={bulkMutation.isPending}
                onSubmit={handleStatusSubmit}
              />
            )}
            {actionType === 'relocate' && (
              <RelocateForm
                selectedCount={selectedIds.size}
                isPending={bulkMutation.isPending}
                categories={categories}
                onSubmit={handleRelocateSubmit}
              />
            )}
          </ScrollArea>
        </div>
      </div>
    </BaseModal>
  );
}
