/**
 * Equipment Edit Form
 *
 * React Hook Form for creating and editing equipment items with category tree dropdown.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  createEquipmentItemRequestSchema,
  updateEquipmentItemRequestSchema,
} from '@odysseus/shared-schemas';
import { Plus, Save, SquarePen } from 'lucide-react';
import { useForm, Controller, type FieldValues } from 'react-hook-form';

import {
  useCreateEquipmentItemMutation,
  useSetEquipmentAttributeValueMutation,
  useUpdateEquipmentItemMutation,
} from '@domains/equipment/hooks/useEquipmentMutations';
import { useEquipmentItemDetailQuery } from '@domains/equipment/hooks/useEquipmentQueries';
import { EQUIPMENT_STATUS_DISPLAY } from '@domains/equipment/utils/equipmentStatus';
import { useAttributesQuery } from '@domains/lab-management';
import { useLookupValuesQuery } from '@shared/hooks/useLookupValuesQuery';
import {
  buildHierarchyOptions,
  Button,
  CompletenessMeter,
  DatePicker,
  NubDivider,
  SectionHeader,
  Select,
  withPlaceholder,
} from '@shared/ui';
import { FIELD_LABEL_COMPACT } from '@shared/ui/components/inputs/fieldLabelClass';
import { ValidatedInput } from '@shared/ui/components/inputs/ValidatedInput';
import {
  AttributeFields,
  changedAttributeRequests,
  draftsFromValues,
  type AttributeDrafts,
} from '@shared/ui/components/inventory';
import { ConsolePanel } from '@shared/ui/primitives/console-panel/ConsolePanel';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { lookupOptions } from '@shared/ui/primitives/select/selectOptions';
import { normalizeDateString } from '@shared/utils/dateFormatters';
import { notifications } from '@shared/utils/notifications';

import type {
  EquipmentItem,
  EquipmentCategory,
  CreateEquipmentItemRequest,
  UpdateEquipmentItemRequest,
} from '@odysseus/shared-schemas';

interface EquipmentEditFormProps {
  item?: EquipmentItem;
  categories: EquipmentCategory[];
  onSubmit: () => void;
  onCancel: () => void;
}

const STATUS_OPTIONS = (['active', 'inactive', 'under_maintenance', 'out_of_service'] as const).map(
  status => ({ value: status, label: EQUIPMENT_STATUS_DISPLAY[status].label })
);

const TRACKED_FIELDS = [
  'name',
  'categoryId',
  'status',
  'manufacturer',
  'vendorName',
  'vendorCatalogNumber',
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
  const createMutation = useCreateEquipmentItemMutation();
  const updateMutation = useUpdateEquipmentItemMutation();
  const setAttributeValueMutation = useSetEquipmentAttributeValueMutation();
  const { data: detail } = useEquipmentItemDetailQuery(isEditing ? item.id : undefined);
  const { data: attributes } = useAttributesQuery();

  const attributeDefinitions = useMemo(
    () =>
      (attributes?.definitions ?? []).filter(
        definition => !definition.appliesToCatalog || definition.appliesToCatalog === 'equipment'
      ),
    [attributes?.definitions]
  );

  const [attributeDrafts, setAttributeDrafts] = useState<AttributeDrafts>({});
  const savedDraftsRef = useRef<AttributeDrafts>({});
  const seededItemIdRef = useRef<string>();

  // Detail arrives after mount, and the panel reuses this component across items.
  useEffect(() => {
    if (!isEditing || !detail?.attributeValues || seededItemIdRef.current === item.id) return;
    const seeded = draftsFromValues(detail.attributeValues);
    savedDraftsRef.current = seeded;
    setAttributeDrafts(seeded);
    seededItemIdRef.current = item.id;
  }, [isEditing, detail?.attributeValues, item?.id]);

  const { data: manufacturers = [] } = useLookupValuesQuery('manufacturer');
  const { data: vendors = [] } = useLookupValuesQuery('vendor');
  const manufacturerOptions = useMemo(() => lookupOptions(manufacturers), [manufacturers]);
  const vendorOptions = useMemo(() => lookupOptions(vendors), [vendors]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
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
          vendorName: item.vendorName ?? '',
          vendorCatalogNumber: item.vendorCatalogNumber ?? '',
          model: item.model ?? '',
          description: item.description ?? '',
          location: item.location ?? '',
          status: item.status,
          conditionNotes: item.conditionNotes ?? '',
          purchaseDate: normalizeDateString(item.purchaseDate),
          warrantyExpiration: normalizeDateString(item.warrantyExpiration),
          purchaseCost: item.purchaseCost,
          assetTag: item.assetTag ?? '',
          nextMaintenanceDate: normalizeDateString(item.nextMaintenanceDate),
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

  // Attribute values are their own endpoint, so they sequence off a saved item. Failures are
  // reported by the global handler; the count comes back so the caller can say the item saved
  // without claiming its attributes did.
  const saveAttributeValues = async (itemId: string): Promise<number> => {
    const requests = changedAttributeRequests(
      savedDraftsRef.current,
      attributeDrafts,
      attributeDefinitions
    );
    if (requests.length === 0) return 0;

    const results = await Promise.allSettled(
      requests.map(data => setAttributeValueMutation.mutateAsync({ itemId, data }))
    );
    return results.filter(result => result.status === 'rejected').length;
  };

  const reportSaved = (verb: string, failed: number) => {
    if (failed === 0) {
      notifications.success(`Equipment ${verb}`);
      return;
    }
    notifications.warning(
      `Equipment ${verb}, but ${failed} ${failed === 1 ? 'attribute value' : 'attribute values'} could not be saved`
    );
  };

  const onFormSubmit = async (data: FieldValues) => {
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: item.id, data: data as UpdateEquipmentItemRequest });
        reportSaved('updated', await saveAttributeValues(item.id));
      } else {
        const created = await createMutation.mutateAsync(data as CreateEquipmentItemRequest);
        reportSaved('created', await saveAttributeValues(created.id));
      }
      onSubmit();
    } catch {
      // Kept as mutateAsync: the attribute writes sequence off the saved item id. The global
      // handler still toasts the create/update failure.
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

      <CompletenessMeter filled={filledCount} total={TRACKED_FIELDS.length} />

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
                <Select
                  label="Category"
                  labelClassName={FIELD_LABEL_COMPACT}
                  options={withPlaceholder('Select category...', buildHierarchyOptions(categories))}
                  value={(value as string) ?? ''}
                  onChange={v => onChange(String(v ?? ''))}
                  state={error ? 'error' : 'default'}
                  error={error?.message}
                  fullWidth
                />
              )}
            />
            <Controller
              name="status"
              control={control}
              render={({ field: { value, onChange } }) => (
                <div>
                  {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Select is a custom component without native input */}
                  <label id="status-label" className={FIELD_LABEL_COMPACT}>
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
            <Controller
              name="manufacturer"
              control={control}
              render={({ field: { value, onChange } }) => (
                <div>
                  {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Select is a custom component without native input */}
                  <label id="equipment-manufacturer-label" className={FIELD_LABEL_COMPACT}>
                    Manufacturer
                  </label>
                  <Select
                    aria-labelledby="equipment-manufacturer-label"
                    options={manufacturerOptions}
                    value={value ?? ''}
                    onChange={v => onChange(v)}
                    fullWidth
                  />
                </div>
              )}
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
              name="vendorName"
              control={control}
              render={({ field: { value, onChange } }) => (
                <div>
                  {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Select is a custom component without native input */}
                  <label id="equipment-vendor-label" className={FIELD_LABEL_COMPACT}>
                    Vendor
                  </label>
                  <Select
                    aria-labelledby="equipment-vendor-label"
                    options={vendorOptions}
                    value={value ?? ''}
                    onChange={v => onChange(v)}
                    fullWidth
                  />
                </div>
              )}
            />
            <ValidatedInput
              label="Vendor Catalog #"
              labelStyle="compact"
              placeholder="e.g., 14-955-240"
              error={!!errors.vendorCatalogNumber}
              helperText={errors.vendorCatalogNumber?.message}
              registration={register('vendorCatalogNumber')}
            />
            <Controller
              name="purchaseDate"
              control={control}
              render={({ field: { value, onChange }, fieldState: { error } }) => (
                <div>
                  <span className={FIELD_LABEL_COMPACT}>Purchase Date</span>
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
                  <span className={FIELD_LABEL_COMPACT}>Warranty Expiration</span>
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
                  <span className={FIELD_LABEL_COMPACT}>Next Maintenance</span>
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
            <SectionHeader title="Attributes" size="sm" />
          </div>
          <AttributeFields
            definitions={attributeDefinitions}
            options={attributes?.options ?? []}
            drafts={attributeDrafts}
            onChange={(definitionId, draft) =>
              setAttributeDrafts(prev => ({ ...prev, [definitionId]: draft }))
            }
            onRemove={definitionId =>
              setAttributeDrafts(prev => {
                const next = { ...prev };
                delete next[definitionId];
                return next;
              })
            }
          />

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
            disabled={updateMutation.isPending || createMutation.isPending}
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
