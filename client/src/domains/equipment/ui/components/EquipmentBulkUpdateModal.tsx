/**
 * Equipment Bulk Update Modal
 *
 * Multi-select equipment items across categories and apply a bulk action:
 * log maintenance, change status, or relocate to a different category.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  createEquipmentMaintenanceLogRequestSchema,
  equipmentBulkStatusValues,
  equipmentBulkStatusRequestSchema,
  equipmentBulkRelocateRequestSchema,
} from '@odysseus/shared-schemas';
import { Layers, Wrench, RefreshCw, FolderInput, FolderOpen, CornerDownRight } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';

import { useEquipmentBulkUpdateMutation, type EquipmentBulkAction } from '@domains/equipment/hooks';
import { useLookupValuesQuery } from '@shared/hooks/useLookupValuesQuery';
import {
  Button,
  Checkbox,
  DatePicker,
  NubDivider,
  SearchInput,
  Select,
  Tabs,
  Tab,
} from '@shared/ui';
import { ValidatedInput } from '@shared/ui/components/inputs/ValidatedInput';
import { BaseModal } from '@shared/ui/components/overlays/BaseModal';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { BulkSelectTreeLines } from '@shared/ui/components/tree-lines';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { notifyBulkResult } from '@shared/utils/bulkResultNotifications';

import type {
  EquipmentItem,
  EquipmentCategory,
  EquipmentStatus,
  CreateEquipmentMaintenanceLogRequest,
  EquipmentBulkResponse,
} from '@odysseus/shared-schemas';
import type { SelectOption } from '@shared/ui';
import type { FieldValues } from 'react-hook-form';

type BulkActionType = 'maintenance' | 'status' | 'relocate';

interface EquipmentBulkUpdateModalProps {
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

// Field-label typography shared with the equipment/tube edit forms: uppercase mono micro-label.
const SELECT_LABEL =
  'block type-label text-label-2xs tracking-label-wide mb-1.5 text-muted-foreground';

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

/** A single equipment row in the selector — brighter than its containers, with mfr // asset. */
function BulkSelectItem({
  item,
  level,
  selected,
  onToggle,
}: {
  item: EquipmentItem;
  level: 'l2' | 'l3';
  selected: boolean;
  onToggle: () => void;
}) {
  const identity = [item.manufacturer, item.assetTag].filter(Boolean);

  return (
    <div data-level={level} data-id={item.id}>
      <div className="bulk-select-row flex items-center gap-2 py-1 pl-3 pr-1">
        <Checkbox checked={selected} onChange={onToggle} aria-label={`Select ${item.name}`} />
        <div className="min-w-0 flex-1">
          <span className="block truncate text-body-sm font-medium text-card-foreground">
            {item.name}
          </span>
          {identity.length > 0 && (
            <span className="block truncate text-caption text-muted-foreground">
              {identity.map((part, i) => (
                <span key={i}>
                  {i > 0 && <span className="mx-1 text-foreground/30">{'//'}</span>}
                  {part}
                </span>
              ))}
            </span>
          )}
        </div>
      </div>
    </div>
  );
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
  const [searchQuery, setSearchQuery] = useState('');

  const matchingCategoryIds = useMemo(() => {
    if (!searchQuery) return new Set<string>();
    const q = searchQuery.toLowerCase();
    const directMatches = categories.filter(c => c.name.toLowerCase().includes(q));
    const ids = new Set<string>();
    for (const cat of directMatches) {
      ids.add(cat.id);
      if (!cat.parentId) {
        categories.filter(c => c.parentId === cat.id).forEach(c => ids.add(c.id));
      }
    }
    return ids;
  }, [categories, searchQuery]);

  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      i =>
        i.name.toLowerCase().includes(q) ||
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean OR for search matching
        (i.manufacturer && i.manufacturer.toLowerCase().includes(q)) ||
        matchingCategoryIds.has(i.categoryId)
    );
  }, [items, searchQuery, matchingCategoryIds]);

  const groups = useMemo(
    () => buildCategoryGroups(categories, filteredItems),
    [categories, filteredItems]
  );

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

  const selectedCount = allSelectableIds.filter(id => selectedIds.has(id)).length;

  return (
    <div className="flex flex-col h-full min-h-0">
      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Filter equipment…"
        size="sm"
        className="mb-2 flex-shrink-0"
        inputClassName="text-body-sm"
        aria-label="Filter equipment"
      />
      <div className="mb-3 flex-shrink-0">
        <div className="flex items-center gap-2 pb-2">
          <Checkbox
            checked={allSelected}
            indeterminate={someSelected && !allSelected}
            onChange={toggleAll}
            aria-label="Select all equipment"
          />
          <span className="text-body-sm font-medium text-card-foreground flex-1">
            All Equipment
          </span>
          <span className="text-caption text-muted-foreground">
            {selectedCount}/{allSelectableIds.length} units
          </span>
        </div>
        <NubDivider tone="neutral" className="relative" />
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div data-tree-id="bulk-select" className="nav-tree-select relative space-y-2 pr-2">
          <BulkSelectTreeLines />
          {groups.length === 0 && searchQuery && (
            <p className="text-body-sm text-muted-foreground text-center py-4">
              No equipment matching &ldquo;{searchQuery}&rdquo;
            </p>
          )}
          {groups.map(group => {
            const groupIds = getAllItemIds(group);
            const groupAllChecked = groupIds.every(id => selectedIds.has(id));
            const groupSomeChecked = groupIds.some(id => selectedIds.has(id));
            const hasChildren =
              group.items.length > 0 || group.subcategories.some(s => s.items.length > 0);

            return (
              <div key={group.category.id} data-level="l1" data-id={group.category.id}>
                <div className="bulk-select-row flex items-center gap-2 py-1 pl-3 pr-1">
                  <Checkbox
                    checked={groupAllChecked}
                    indeterminate={groupSomeChecked && !groupAllChecked}
                    onChange={() => toggleCategory(groupIds)}
                    aria-label={`Select all in ${group.category.name}`}
                  />
                  <FolderOpen size={14} className="flex-shrink-0 text-muted-foreground" />
                  <span className="text-body-sm text-secondary-foreground">
                    {group.category.name}
                  </span>
                  <span className="text-caption text-muted-foreground ml-auto">
                    {groupIds.length} {groupIds.length === 1 ? 'unit' : 'units'}
                  </span>
                </div>

                {hasChildren && (
                  <div className="ml-3">
                    {group.items.map(item => (
                      <BulkSelectItem
                        key={item.id}
                        item={item}
                        level="l2"
                        selected={selectedIds.has(item.id)}
                        onToggle={() => toggleItem(item.id)}
                      />
                    ))}

                    {group.subcategories.map(sub => {
                      if (sub.items.length === 0) return null;
                      const subIds = sub.items.map(i => i.id);
                      const subAllChecked = subIds.every(id => selectedIds.has(id));
                      const subSomeChecked = subIds.some(id => selectedIds.has(id));

                      return (
                        <div key={sub.category.id} data-level="l2" data-id={sub.category.id}>
                          <div className="bulk-select-row flex items-center gap-2 py-1 pl-3 pr-1">
                            <Checkbox
                              checked={subAllChecked}
                              indeterminate={subSomeChecked && !subAllChecked}
                              onChange={() => toggleCategory(subIds)}
                              aria-label={`Select all in ${sub.category.name}`}
                            />
                            <CornerDownRight
                              size={13}
                              className="flex-shrink-0 text-muted-foreground"
                            />
                            <span className="text-body-sm text-secondary-foreground">
                              {sub.category.name}
                            </span>
                            <span className="text-caption text-muted-foreground ml-auto">
                              {subIds.length} {subIds.length === 1 ? 'unit' : 'units'}
                            </span>
                          </div>
                          <div className="ml-[30px]">
                            {sub.items.map(item => (
                              <BulkSelectItem
                                key={item.id}
                                item={item}
                                level="l3"
                                selected={selectedIds.has(item.id)}
                                onToggle={() => toggleItem(item.id)}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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
  onSubmit,
  onValidityChange,
}: {
  onSubmit: (data: CreateEquipmentMaintenanceLogRequest) => void;
  onValidityChange: (valid: boolean) => void;
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

  useEffect(() => {
    onValidityChange(isValid);
  }, [isValid, onValidityChange]);

  const onFormSubmit = (data: FieldValues) => {
    onSubmit(data as CreateEquipmentMaintenanceLogRequest);
  };

  return (
    <form id="bulk-action-form" onSubmit={handleSubmit(onFormSubmit)} className="space-y-3">
      <Controller
        name="datePerformed"
        control={control}
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <div>
            <span className={SELECT_LABEL}>
              Date Performed <span className="text-danger-bg">*</span>
            </span>
            <DatePicker
              value={(value as string) ?? ''}
              onChange={onChange}
              state={error ? 'error' : 'default'}
              fullWidth
            />
            {error && <p className="text-caption text-danger-text mt-1">{error.message}</p>}
          </div>
        )}
      />

      <Controller
        name="maintenanceType"
        control={control}
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <div>
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Select is a custom component without native input */}
            <label id="bulk-maint-type-label" className={SELECT_LABEL}>
              Maintenance Type
            </label>
            <Select
              options={typeOptions}
              value={value ?? ''}
              onChange={v => onChange(v)}
              state={error ? 'error' : 'default'}
              error={error?.message}
              fullWidth
              aria-labelledby="bulk-maint-type-label"
            />
          </div>
        )}
      />

      <ValidatedInput
        label="Performed By (Vendor/Service)"
        labelStyle="compact"
        placeholder="e.g., TSS, In-house"
        error={!!errors['performedBy']}
        helperText={errors['performedBy']?.message as string}
        registration={register('performedBy')}
      />

      <ValidatedInput
        label="Technician"
        labelStyle="compact"
        placeholder="e.g., John Smith"
        error={!!errors['technician']}
        helperText={errors['technician']?.message as string}
        registration={register('technician')}
      />

      <ValidatedInput
        label="Description"
        labelStyle="compact"
        type="textarea"
        placeholder="Work performed, parts replaced, etc."
        registration={register('description')}
      />

      <Controller
        name="nextScheduledDate"
        control={control}
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <div>
            <span className={SELECT_LABEL}>Next Scheduled Date</span>
            <DatePicker
              value={(value as string) ?? ''}
              onChange={onChange}
              state={error ? 'error' : 'default'}
              fullWidth
              clearable
            />
            {error && <p className="text-caption text-danger-text mt-1">{error.message}</p>}
          </div>
        )}
      />

      <ValidatedInput
        label="Cost ($)"
        labelStyle="compact"
        type="number"
        step="0.01"
        error={!!errors['cost']}
        helperText={errors['cost']?.message as string}
        registration={register('cost', {
          setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
        })}
      />

      <ValidatedInput
        label="Notes"
        labelStyle="compact"
        type="textarea"
        placeholder="Additional notes and observations..."
        registration={register('notes')}
      />
    </form>
  );
}

const bulkStatusFormSchema = equipmentBulkStatusRequestSchema.shape.data;

function StatusForm({
  onSubmit,
  onValidityChange,
}: {
  onSubmit: (data: { status: EquipmentStatus; conditionNotes?: string }) => void;
  onValidityChange: (valid: boolean) => void;
}) {
  const statusOptions: SelectOption[] = equipmentBulkStatusValues.map(s => ({
    value: s,
    label: STATUS_LABELS[s] ?? s,
  }));

  const {
    register,
    handleSubmit,
    control,
    formState: { isValid },
  } = useForm({
    resolver: zodResolver(bulkStatusFormSchema) as never,
    mode: 'onChange',
  });

  useEffect(() => {
    onValidityChange(isValid);
  }, [isValid, onValidityChange]);

  const onFormSubmit = (data: FieldValues) => {
    onSubmit(data as { status: EquipmentStatus; conditionNotes?: string });
  };

  return (
    <form id="bulk-action-form" onSubmit={handleSubmit(onFormSubmit)} className="space-y-3">
      <Controller
        name="status"
        control={control}
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <div>
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Select is a custom component without native input */}
            <label id="bulk-status-label" className={SELECT_LABEL}>
              Status
            </label>
            <Select
              options={[{ value: '', label: 'Select status...' }, ...statusOptions]}
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

const bulkRelocateFormSchema = equipmentBulkRelocateRequestSchema.shape.data;

function RelocateForm({
  categories,
  onSubmit,
  onValidityChange,
}: {
  categories: EquipmentCategory[];
  onSubmit: (data: { categoryId: string }) => void;
  onValidityChange: (valid: boolean) => void;
}) {
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
    handleSubmit,
    control,
    formState: { isValid },
  } = useForm({
    resolver: zodResolver(bulkRelocateFormSchema) as never,
    mode: 'onChange',
  });

  useEffect(() => {
    onValidityChange(isValid);
  }, [isValid, onValidityChange]);

  const onFormSubmit = (data: FieldValues) => {
    onSubmit(data as { categoryId: string });
  };

  return (
    <form id="bulk-action-form" onSubmit={handleSubmit(onFormSubmit)} className="space-y-3">
      <Controller
        name="categoryId"
        control={control}
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <div>
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Select is a custom component without native input */}
            <label id="bulk-relocate-label" className={SELECT_LABEL}>
              Category
            </label>
            <Select
              aria-labelledby="bulk-relocate-label"
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
                    <span className="text-muted-foreground opacity-40">Select category...</span>
                  );
                const parentName = parentNameMap.get(opt.value as string);
                if (parentName) {
                  return (
                    <span className="text-foreground text-body">
                      <span className="text-muted-foreground">{parentName}</span>
                      <span className="text-muted-foreground mx-1">›</span>
                      {opt.label}
                    </span>
                  );
                }
                return <span className="text-foreground text-body">{opt.label}</span>;
              }}
            />
          </div>
        )}
      />
    </form>
  );
}

// Main modal

export function EquipmentBulkUpdateModal({
  isOpen,
  onClose,
  items,
  categories,
}: EquipmentBulkUpdateModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionType, setActionType] = useState<BulkActionType>('maintenance');
  const [isFormValid, setIsFormValid] = useState(false);
  const [pendingAction, setPendingAction] = useState<EquipmentBulkAction | null>(null);
  const bulkMutation = useEquipmentBulkUpdateMutation();

  const handleResult = useCallback(
    (result: EquipmentBulkResponse) => {
      notifyBulkResult(result, { entityLabel: 'items', actionVerb: 'Updated' });
      setSelectedIds(new Set());
      onClose();
    },
    [onClose]
  );

  const handleMaintenanceSubmit = useCallback(
    (data: CreateEquipmentMaintenanceLogRequest) => {
      setPendingAction({ type: 'maintenance', itemIds: Array.from(selectedIds), data });
    },
    [selectedIds]
  );

  const handleStatusSubmit = useCallback(
    (data: { status: EquipmentStatus; conditionNotes?: string }) => {
      setPendingAction({ type: 'status', itemIds: Array.from(selectedIds), data });
    },
    [selectedIds]
  );

  const handleRelocateSubmit = useCallback(
    (data: { categoryId: string }) => {
      setPendingAction({ type: 'relocate', itemIds: Array.from(selectedIds), data });
    },
    [selectedIds]
  );

  const confirmAction = useCallback(() => {
    if (!pendingAction) return;
    bulkMutation.mutate(pendingAction, {
      onSuccess: result => {
        handleResult(result);
        setPendingAction(null);
      },
    });
  }, [pendingAction, bulkMutation, handleResult]);

  const handleClose = useCallback(() => {
    setSelectedIds(new Set());
    setActionType('maintenance');
    setIsFormValid(false);
    setPendingAction(null);
    onClose();
  }, [onClose]);

  const actionLabels: Record<BulkActionType, string> = {
    maintenance: 'Log Maintenance',
    status: 'Change Status',
    relocate: 'Relocate',
  };

  const itemLabel = selectedIds.size === 1 ? 'item' : 'items';

  const selectableCount = items.filter(i => i.status !== 'decommissioned').length;

  const locator = (
    <div className="flex items-center gap-3">
      <span className="flex items-center gap-1.5">
        <span
          aria-hidden
          className="h-2.5 w-0.5 flex-shrink-0 bg-primary/80 dark:shadow-[0_0_6px_hsl(var(--primary)/0.55)]"
        />
        <span className="font-mono text-data-sm tracking-[0.04em] text-foreground">
          {selectedIds.size} <span className="text-foreground/45">selected</span>
        </span>
      </span>
      <span className="flex-1" />
      <span className="font-mono text-data-sm tracking-[0.06em] text-foreground/45">
        {selectableCount} total
      </span>
    </div>
  );

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="secondary" size="sm" onClick={handleClose}>
        Cancel
      </Button>
      <Button
        type="submit"
        form="bulk-action-form"
        variant="primary"
        size="sm"
        disabled={selectedIds.size === 0 || !isFormValid}
        isLoading={bulkMutation.isPending}
      >
        {actionLabels[actionType]} for {selectedIds.size} {itemLabel}
      </Button>
    </div>
  );

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        title="Bulk Update"
        icon={<Layers className="w-4 h-4" />}
        onClose={handleClose}
        size="lg"
        fixedHeight
        locator={locator}
        contentClassName="p-0 h-full"
        footer={footer}
      >
        <div className="flex h-full min-h-0">
          <div className="w-2/5 border-r border-border p-4 flex flex-col min-h-0 overflow-auto bg-muted/30">
            <ItemSelector
              categories={categories}
              items={items}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
            />
          </div>

          <div className="w-3/5 flex flex-col min-h-0">
            <div className="flex-shrink-0 border-b border-border">
              <Tabs
                value={actionType}
                onChange={v => setActionType(v as BulkActionType)}
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
                  onSubmit={handleMaintenanceSubmit}
                  onValidityChange={setIsFormValid}
                />
              )}
              {actionType === 'status' && (
                <StatusForm onSubmit={handleStatusSubmit} onValidityChange={setIsFormValid} />
              )}
              {actionType === 'relocate' && (
                <RelocateForm
                  categories={categories}
                  onSubmit={handleRelocateSubmit}
                  onValidityChange={setIsFormValid}
                />
              )}
            </ScrollArea>
          </div>
        </div>
      </BaseModal>

      {pendingAction && (
        <ConfirmDialog
          isOpen={true}
          variant="warning"
          title="Confirm Bulk Update"
          message={`${actionLabels[pendingAction.type as BulkActionType]} for ${pendingAction.itemIds.length} ${pendingAction.itemIds.length === 1 ? 'item' : 'items'}?`}
          confirmText="Apply"
          onConfirm={confirmAction}
          onCancel={() => setPendingAction(null)}
          isLoading={bulkMutation.isPending}
        />
      )}
    </>
  );
}
