/**
 * Equipment Bulk Update Modal
 *
 * Multi-select equipment items across categories and apply a bulk action:
 * log maintenance, change status, or relocate to a different category.
 */

import { useState, useCallback, useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  createEquipmentMaintenanceLogRequestSchema,
  equipmentBulkStatusValues,
  equipmentBulkStatusRequestSchema,
  equipmentBulkRelocateRequestSchema,
} from '@odysseus/shared-schemas';
import { Layers, Wrench, RefreshCw, FolderInput } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';

import {
  useEquipmentBulkUpdateMutation,
  type EquipmentBulkAction,
} from '@domains/equipment/hooks/useEquipmentMutations';
import { EQUIPMENT_STATUS_LABELS } from '@domains/equipment/utils/equipmentStatus';
import { useLookupValuesQuery } from '@shared/hooks/useLookupValuesQuery';
import { Button, DatePicker, Select, Tabs, Tab } from '@shared/ui';
import { FIELD_LABEL_COMPACT } from '@shared/ui/components/inputs/fieldLabelClass';
import { ValidatedInput } from '@shared/ui/components/inputs/ValidatedInput';
import {
  BulkCategoryTreeSelector,
  type BulkCategoryTreeSelectorLabels,
  CategoryHierarchySelect,
} from '@shared/ui/components/inventory';
import { BaseModal } from '@shared/ui/components/overlays/BaseModal';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { notifyBulkResult } from '@shared/utils/bulkResultNotifications';

import type {
  EquipmentItem,
  EquipmentCategory,
  EquipmentBulkStatusRequest,
  EquipmentBulkRelocateRequest,
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

const isEquipmentSelectable = (item: EquipmentItem) => item.status !== 'decommissioned';

const getEquipmentSecondaryText = (item: EquipmentItem) => [item.manufacturer, item.assetTag];

const BULK_SELECTOR_LABELS: BulkCategoryTreeSelectorLabels = {
  countNoun: ['unit', 'units'],
  filterPlaceholder: 'Filter equipment…',
  filterAriaLabel: 'Filter equipment',
  selectAllLabel: 'All Equipment',
  selectAllAriaLabel: 'Select all equipment',
  noMatch: 'No equipment matching',
};

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
            <span className={FIELD_LABEL_COMPACT}>
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
            <label id="bulk-maint-type-label" className={FIELD_LABEL_COMPACT}>
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
            <span className={FIELD_LABEL_COMPACT}>Next Scheduled Date</span>
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
  onSubmit: (data: EquipmentBulkStatusRequest['data']) => void;
  onValidityChange: (valid: boolean) => void;
}) {
  const statusOptions: SelectOption[] = equipmentBulkStatusValues.map(s => ({
    value: s,
    label: EQUIPMENT_STATUS_LABELS[s],
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
    onSubmit(data as EquipmentBulkStatusRequest['data']);
  };

  return (
    <form id="bulk-action-form" onSubmit={handleSubmit(onFormSubmit)} className="space-y-3">
      <Controller
        name="status"
        control={control}
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <div>
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Select is a custom component without native input */}
            <label id="bulk-status-label" className={FIELD_LABEL_COMPACT}>
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
  onSubmit: (data: EquipmentBulkRelocateRequest['data']) => void;
  onValidityChange: (valid: boolean) => void;
}) {
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
    onSubmit(data as EquipmentBulkRelocateRequest['data']);
  };

  return (
    <form id="bulk-action-form" onSubmit={handleSubmit(onFormSubmit)} className="space-y-3">
      <Controller
        name="categoryId"
        control={control}
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <CategoryHierarchySelect
            categories={categories}
            value={(value as string) ?? ''}
            onChange={onChange}
            error={error?.message}
            labelId="bulk-relocate-label"
          />
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
  const [searchQuery, setSearchQuery] = useState('');
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
    (data: EquipmentBulkStatusRequest['data']) => {
      setPendingAction({ type: 'status', itemIds: Array.from(selectedIds), data });
    },
    [selectedIds]
  );

  const handleRelocateSubmit = useCallback(
    (data: EquipmentBulkRelocateRequest['data']) => {
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
    setSearchQuery('');
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
            <BulkCategoryTreeSelector
              categories={categories}
              items={items}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              isSelectable={isEquipmentSelectable}
              getSecondaryText={getEquipmentSecondaryText}
              labels={BULK_SELECTOR_LABELS}
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
