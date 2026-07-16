/**
 * Supply Item Form
 *
 * React Hook Form for creating and editing supply items with lookup-driven
 * dropdowns, packaging hierarchy management, and multi-select properties.
 */

import { useMemo, useState, useCallback, useEffect, useRef } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { createSupplyItemRequestSchema } from '@odysseus/shared-schemas';
import { Plus, Save, SquarePen, X } from 'lucide-react';
import { useForm, Controller, type FieldValues } from 'react-hook-form';

import { useSupplyItemDetailQuery } from '@domains/supplies/hooks';
import {
  useCreateSupplyItemMutation,
  useUpdateSupplyItemMutation,
  useAddSupplyPackagingLevelMutation,
  useRemoveSupplyPackagingLevelMutation,
} from '@domains/supplies/hooks/useSupplyMutations';
import { SupplyService } from '@domains/supplies/services/SupplyService';
import { computePackagingMultiplier } from '@domains/supplies/utils/packagingChain';
import { useLookupValuesQuery } from '@shared/hooks/useLookupValuesQuery';
import {
  Button,
  Checkbox,
  CompletenessMeter,
  Input,
  lookupOptions,
  NubDivider,
  SectionHeader,
  Select,
  withPlaceholder,
} from '@shared/ui';
import { FIELD_LABEL_COMPACT } from '@shared/ui/components/inputs/fieldLabelClass';
import { ValidatedInput } from '@shared/ui/components/inputs/ValidatedInput';
import { CategoryHierarchySelect } from '@shared/ui/components/inventory';
import { Chip } from '@shared/ui/primitives/chip/Chip';
import { ConsolePanel } from '@shared/ui/primitives/console-panel/ConsolePanel';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { notifications } from '@shared/utils/notifications';
import { pluralizeUnit } from '@shared/utils/pluralizeUnit';

import type {
  SupplyCategory,
  SupplyItemWithStock,
  CreateSupplyItemRequest,
} from '@odysseus/shared-schemas';
import type { SelectOption } from '@shared/ui/primitives/select/types';

interface SupplyItemFormProps {
  item?: SupplyItemWithStock;
  categories: SupplyCategory[];
  onSubmit: () => void;
  onCancel: () => void;
}

interface LocalPackagingLevel {
  unitName: string;
  quantity: number;
  parentUnit: string | null;
}

const TRACKED_FIELDS = [
  'name',
  'categoryId',
  'manufacturer',
  'catalogNumber',
  'vendorName',
  'vendorCatalogNumber',
  'baseItemName',
  'stockUnit',
  'properties',
  'reorderThreshold',
  'reorderQuantity',
  'reorderUnit',
  'unitPrice',
  'description',
  'notes',
];

export function SupplyItemForm({ item, categories, onSubmit, onCancel }: SupplyItemFormProps) {
  const isEditing = !!item;
  const createMutation = useCreateSupplyItemMutation();
  const updateMutation = useUpdateSupplyItemMutation();
  const addPackagingMutation = useAddSupplyPackagingLevelMutation();
  const removePackagingMutation = useRemoveSupplyPackagingLevelMutation();
  const { data: detail } = useSupplyItemDetailQuery(isEditing ? item.id : undefined);

  // Packaging — local state for create, server data for edit
  const [localPackagingLevels, setLocalPackagingLevels] = useState<LocalPackagingLevel[]>([]);
  const packagingLevels = useMemo(
    () => (isEditing ? (detail?.packagingLevels ?? []) : localPackagingLevels),
    [isEditing, detail?.packagingLevels, localPackagingLevels]
  );

  const [newLevelQty, setNewLevelQty] = useState('');
  const [newLevelUnit, setNewLevelUnit] = useState('');
  // '__base__' = parent to the base item, '' = unset (defaults to the top of the chain), else a unit.
  const [newLevelParent, setNewLevelParent] = useState('');
  const [manufacturerBarcode, setManufacturerBarcode] = useState('');
  const [manufacturerBarcodeLabel, setManufacturerBarcodeLabel] = useState('');
  const [thresholdInputQty, setThresholdInputQty] = useState('');
  // Stop the initializer below from overwriting the field once the user has edited it — otherwise
  // adding a packaging level (which changes packagingLevels) resets the display to the stored value
  // while the form still holds the user's number.
  const thresholdUserEdited = useRef(false);

  useEffect(() => {
    if (thresholdUserEdited.current) return;
    if (!isEditing || item?.reorderThreshold == null) return;
    if (!item.reorderThresholdUnit || item.reorderThresholdUnit === item.stockUnit) {
      setThresholdInputQty(String(item.reorderThreshold));
      return;
    }
    const levels = detail?.packagingLevels ?? [];
    if (levels.length === 0) return;
    let multiplier = 1;
    let current = item.reorderThresholdUnit;
    for (let i = 0; i < levels.length + 1; i++) {
      const level = levels.find(l => l.unitName === current);
      if (!level) break;
      multiplier *= level.quantity;
      if (level.parentUnit === null || level.parentUnit === item.stockUnit) break;
      current = level.parentUnit;
    }
    setThresholdInputQty(String(Math.round(item.reorderThreshold / multiplier)));
  }, [
    isEditing,
    item?.reorderThreshold,
    item?.reorderThresholdUnit,
    item?.stockUnit,
    detail?.packagingLevels,
  ]);
  const [thresholdUnit, setThresholdUnit] = useState(
    isEditing ? (item?.reorderThresholdUnit ?? '') : ''
  );

  const { data: manufacturers = [] } = useLookupValuesQuery('supply_manufacturer');
  const { data: vendors = [] } = useLookupValuesQuery('supply_vendor');
  const { data: stockUnits = [] } = useLookupValuesQuery('supply_stock_unit');
  const { data: itemProperties = [] } = useLookupValuesQuery('supply_item_property');

  const manufacturerOptions = useMemo(() => lookupOptions(manufacturers), [manufacturers]);
  const vendorOptions = useMemo(() => lookupOptions(vendors), [vendors]);
  const stockUnitOptions = useMemo(() => lookupOptions(stockUnits), [stockUnits]);

  // Available units for the add-level "unit" dropdown (exclude already-used names)
  const availableUnitOptions = useMemo(() => {
    const usedNames = packagingLevels.map(l => l.unitName);
    return lookupOptions(stockUnits.filter(u => !usedNames.includes(u.value)));
  }, [stockUnits, packagingLevels]);

  // Parent options for the add-level "per" dropdown
  const parentOptions: SelectOption[] = useMemo(
    () => [
      { value: '__base__', label: 'base item' },
      ...packagingLevels.map(l => ({ value: l.unitName, label: l.unitName })),
    ],
    [packagingLevels]
  );

  const topOfChain = useMemo(() => {
    if (packagingLevels.length === 0) return null;
    const childParents = new Set(packagingLevels.map(l => l.parentUnit).filter(Boolean));
    const top = packagingLevels.find(l => !childParents.has(l.unitName));
    return top?.unitName ?? null;
  }, [packagingLevels]);

  const thresholdUnitOptions: SelectOption[] = useMemo(() => {
    const hasLevels = packagingLevels.length > 0;
    if (!hasLevels) return [];
    return withPlaceholder(
      'stock unit',
      packagingLevels.map(l => ({ value: l.unitName, label: l.unitName }))
    );
  }, [packagingLevels]);

  const computeThresholdMultiplier = useCallback(
    (fromUnit: string, stockUnitOverride?: string) =>
      computePackagingMultiplier(packagingLevels, fromUnit, stockUnitOverride ?? ''),
    [packagingLevels]
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createSupplyItemRequestSchema) as never,
    defaultValues: isEditing
      ? {
          categoryId: item.categoryId,
          name: item.name,
          manufacturer: item.manufacturer ?? '',
          catalogNumber: item.catalogNumber ?? '',
          vendorName: item.vendorName ?? '',
          vendorCatalogNumber: item.vendorCatalogNumber ?? '',
          stockUnit: item.stockUnit ?? '',
          baseItemName: item.baseItemName ?? '',
          reorderThreshold: item.reorderThreshold,
          reorderThresholdUnit: item.reorderThresholdUnit ?? '',
          reorderQuantity: item.reorderQuantity,
          reorderUnit: item.reorderUnit ?? '',
          unitPrice: item.unitPrice,
          properties: item.properties,
          description: item.description ?? '',
          notes: item.notes ?? '',
        }
      : {
          categoryId: '',
          name: '',
          properties: [] as string[],
        },
  });

  const allValues = watch() as Record<string, unknown>;
  const filledCount = TRACKED_FIELDS.filter(f => {
    const v = allValues[f];
    if (Array.isArray(v)) return v.length > 0;
    return v != null && String(v).trim() !== '';
  }).length;

  const currentBaseItemName = allValues['baseItemName'] as string | undefined;
  const currentStockUnit = allValues['stockUnit'] as string | undefined;

  const handleAddLevel = useCallback(() => {
    const qty = Number(newLevelQty);
    if (!newLevelUnit || qty <= 0) return;

    const resolvedParent = newLevelParent === '__base__' ? null : newLevelParent || topOfChain;
    const addedUnit = newLevelUnit;
    if (isEditing && item) {
      addPackagingMutation.mutate(
        {
          itemId: item.id,
          data: { unitName: newLevelUnit, quantity: qty, parentUnit: resolvedParent },
        },
        {
          onSuccess: () => {
            setNewLevelQty('');
            setNewLevelUnit('');
            setNewLevelParent(addedUnit);
          },
        }
      );
    } else {
      setLocalPackagingLevels(prev => [
        ...prev,
        { unitName: newLevelUnit, quantity: qty, parentUnit: resolvedParent },
      ]);
      setNewLevelQty('');
      setNewLevelUnit('');
      setNewLevelParent(addedUnit);
    }
  }, [
    isEditing,
    item,
    newLevelQty,
    newLevelUnit,
    newLevelParent,
    topOfChain,
    addPackagingMutation,
  ]);

  const handleRemoveLevel = useCallback(
    (index: number, levelId?: string) => {
      if (isEditing && item && levelId) {
        removePackagingMutation.mutate({ itemId: item.id, levelId });
      } else {
        setLocalPackagingLevels(prev => prev.filter((_, i) => i !== index));
      }
    },
    [isEditing, item, removePackagingMutation]
  );

  const onFormSubmit = async (data: FieldValues) => {
    const validated = data as CreateSupplyItemRequest;
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: item.id, data: validated });
        notifications.success('Item updated');
      } else {
        const created = await createMutation.mutateAsync(validated);

        // Save manufacturer barcode
        if (manufacturerBarcode.trim()) {
          try {
            await SupplyService.addBarcode(created.id, {
              barcodeValue: manufacturerBarcode.trim(),
              barcodeType: 'manufacturer_sku',
              label: manufacturerBarcodeLabel.trim() || undefined,
            });
          } catch {
            notifications.warning('Item created but failed to save manufacturer barcode');
          }
        }

        // Save packaging levels
        for (const level of localPackagingLevels) {
          try {
            await SupplyService.addPackagingLevel(created.id, {
              unitName: level.unitName,
              quantity: level.quantity,
              parentUnit: level.parentUnit,
            });
          } catch {
            notifications.warning(
              `Item created but failed to save packaging level "${level.unitName}"`
            );
          }
        }

        notifications.success('Item created');
      }
      onSubmit();
    } catch {
      // Kept as mutateAsync: the create is awaited so the barcode + packaging follow-ups sequence
      // off the new item id, and RHF's isSubmitting spans the whole flow. The global handler still
      // toasts create/update failures.
    }
  };

  const formatLevelDisplay = (level: {
    unitName: string;
    quantity: number;
    parentUnit: string | null;
  }) => {
    const parentName = level.parentUnit ?? currentBaseItemName ?? 'item';
    return `${level.quantity} ${pluralizeUnit(parentName, level.quantity)} per ${level.unitName}`;
  };

  return (
    <ConsolePanel intensity="soft" className="flex h-full min-h-0 flex-col">
      <div className="flex flex-shrink-0 items-center gap-3 border-b border-line-faint px-4 py-3">
        <span className="p-1.5 text-muted-foreground">
          {isEditing ? <SquarePen size={20} /> : <Plus size={20} />}
        </span>
        <h2 className="text-lg font-medium text-foreground">
          {isEditing ? 'Edit Item' : 'Add Item'}
        </h2>
      </div>

      <CompletenessMeter filled={filledCount} total={TRACKED_FIELDS.length} />

      <ScrollArea className="min-h-0 flex-1">
        <form id="supply-item-form" onSubmit={handleSubmit(onFormSubmit)} className="space-y-2 p-4">
          <SectionHeader title="Identification" size="sm" />
          <ValidatedInput
            label="Name"
            labelStyle="compact"
            required
            placeholder="e.g., 200μL Filter Tips"
            error={!!errors.name}
            helperText={(errors.name?.message as string) ?? undefined}
            registration={register('name')}
          />
          <Controller
            name="categoryId"
            control={control}
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <CategoryHierarchySelect
                categories={categories}
                value={(value as string) ?? ''}
                onChange={onChange}
                labelId="supply-category-label"
                error={error?.message}
              />
            )}
          />

          <div className="!mt-3.5">
            <SectionHeader title="Sourcing" size="sm" />
          </div>
          {!isEditing && (
            <div>
              <div className="grid grid-cols-2 gap-2.5 [&>*]:min-w-0">
                <div>
                  <label htmlFor="mfg-barcode" className={FIELD_LABEL_COMPACT}>
                    Manufacturer Barcode
                  </label>
                  <Input
                    id="mfg-barcode"
                    type="text"
                    value={manufacturerBarcode}
                    onValueChange={setManufacturerBarcode}
                    placeholder="Scan or type barcode..."
                    fullWidth
                  />
                </div>
                <div>
                  <label htmlFor="mfg-barcode-label" className={FIELD_LABEL_COMPACT}>
                    Barcode Label
                  </label>
                  <Input
                    id="mfg-barcode-label"
                    type="text"
                    value={manufacturerBarcodeLabel}
                    onValueChange={setManufacturerBarcodeLabel}
                    placeholder="e.g., Fisher Cat #"
                    fullWidth
                  />
                </div>
              </div>
              <p className="mt-1 text-caption text-muted-foreground">
                Optional — scan the barcode on the physical box to link it automatically
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2.5 [&>*]:min-w-0">
            <Controller
              name="manufacturer"
              control={control}
              render={({ field: { value, onChange } }) => (
                <div>
                  {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Select is a custom component without native input */}
                  <label id="supply-manufacturer-label" className={FIELD_LABEL_COMPACT}>
                    Manufacturer
                  </label>
                  <Select
                    aria-labelledby="supply-manufacturer-label"
                    options={manufacturerOptions}
                    value={value ?? ''}
                    onChange={v => onChange(v)}
                    fullWidth
                  />
                </div>
              )}
            />
            <ValidatedInput
              label="Catalog #"
              labelStyle="compact"
              placeholder="e.g., 4806"
              registration={register('catalogNumber')}
            />
            <Controller
              name="vendorName"
              control={control}
              render={({ field: { value, onChange } }) => (
                <div>
                  {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Select is a custom component without native input */}
                  <label id="supply-vendor-label" className={FIELD_LABEL_COMPACT}>
                    Vendor
                  </label>
                  <Select
                    aria-labelledby="supply-vendor-label"
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
              placeholder="e.g., 07-200-XXX"
              registration={register('vendorCatalogNumber')}
            />
          </div>

          <div className="!mt-3.5">
            <SectionHeader title="Unit & Packaging" size="sm" />
          </div>
          <div className="grid grid-cols-2 gap-2.5 [&>*]:min-w-0">
            <ValidatedInput
              label="Item"
              labelStyle="compact"
              placeholder="e.g., tip, glove, filter"
              registration={register('baseItemName')}
            />
            <Controller
              name="stockUnit"
              control={control}
              render={({ field: { value, onChange } }) => (
                <div>
                  {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Select is a custom component without native input */}
                  <label id="supply-stock-unit-label" className={FIELD_LABEL_COMPACT}>
                    Stock Unit
                  </label>
                  <Select
                    aria-labelledby="supply-stock-unit-label"
                    options={stockUnitOptions}
                    value={value ?? ''}
                    onChange={v => onChange(v)}
                    fullWidth
                  />
                </div>
              )}
            />
          </div>
          <div>
            <span className={FIELD_LABEL_COMPACT}>Packaging</span>
            {packagingLevels.length > 0 && (
              <div className="mb-2 space-y-1">
                {packagingLevels.map((level, index) => {
                  const levelData = {
                    unitName: level.unitName,
                    quantity: level.quantity,
                    parentUnit: level.parentUnit,
                  };
                  const levelId = 'id' in level ? (level.id as string) : undefined;
                  const hasChildren = packagingLevels.some(
                    l => l.parentUnit === levelData.unitName
                  );
                  return (
                    <div
                      key={levelId ?? `local-${index}`}
                      className="flex items-center justify-between border border-line-faint bg-shade/20 px-2.5 py-1.5 text-body-sm"
                    >
                      <span>{formatLevelDisplay(levelData)}</span>
                      <button
                        type="button"
                        className={`p-0.5 ${hasChildren ? 'cursor-not-allowed text-muted-foreground' : 'text-danger-text hover:text-danger-text/80'}`}
                        disabled={hasChildren}
                        title={hasChildren ? 'Remove child levels first' : 'Remove'}
                        onClick={() => handleRemoveLevel(index, levelId)}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex items-end gap-2">
              <div className="w-16">
                <Input
                  type="number"
                  value={newLevelQty}
                  onValueChange={setNewLevelQty}
                  placeholder="Qty"
                  size="sm"
                  fullWidth
                  aria-label="Quantity"
                />
              </div>
              <div className="flex-1">
                <Select
                  options={parentOptions}
                  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- '' means unset and must fall through to the default
                  value={newLevelParent || topOfChain || '__base__'}
                  onChange={v => setNewLevelParent(String(v ?? ''))}
                  size="sm"
                  fullWidth
                  aria-label="Contents"
                />
              </div>
              <span className="pb-1.5 text-caption text-muted-foreground">per</span>
              <div className="flex-1">
                <Select
                  options={availableUnitOptions}
                  value={newLevelUnit}
                  onChange={v => setNewLevelUnit(String(v ?? ''))}
                  size="sm"
                  fullWidth
                  aria-label="New unit"
                />
              </div>
              <Button
                variant="secondary"
                size="sm"
                disabled={!newLevelUnit || !newLevelQty || Number(newLevelQty) <= 0}
                onClick={handleAddLevel}
              >
                Add
              </Button>
            </div>
          </div>

          {itemProperties.length > 0 && (
            <>
              <div className="!mt-3.5">
                <SectionHeader title="Properties" size="sm" />
              </div>
              <Controller
                name="properties"
                control={control}
                render={({ field: { value = [], onChange } }) => (
                  <div className="space-y-1.5">
                    {(value as string[]).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {(value as string[]).map((prop: string) => (
                          <Chip
                            key={prop}
                            color="default"
                            size="sm"
                            onRemove={() =>
                              onChange((value as string[]).filter((p: string) => p !== prop))
                            }
                          >
                            {prop}
                          </Chip>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-1">
                      {itemProperties.map((pp: { id: string; value: string }) => (
                        <label
                          key={pp.id}
                          className="flex cursor-pointer items-center gap-1.5 text-body-sm"
                        >
                          <Checkbox
                            checked={(value as string[]).includes(pp.value)}
                            onChange={checked => {
                              if (checked) onChange([...(value as string[]), pp.value]);
                              else
                                onChange((value as string[]).filter((p: string) => p !== pp.value));
                            }}
                          />
                          {pp.value}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              />
            </>
          )}

          <div className="!mt-3.5">
            <SectionHeader title="Reorder Settings" size="sm" />
          </div>
          <div className="grid grid-cols-3 items-end gap-2.5">
            <div>
              <label htmlFor="threshold-qty" className={FIELD_LABEL_COMPACT}>
                Threshold
              </label>
              <Input
                id="threshold-qty"
                type="number"
                value={thresholdInputQty}
                onValueChange={v => {
                  thresholdUserEdited.current = true;
                  setThresholdInputQty(v);
                  const qty = v === '' ? undefined : Number(v);
                  const multiplier = thresholdUnit
                    ? computeThresholdMultiplier(thresholdUnit, currentStockUnit)
                    : 1;
                  setValue('reorderThreshold', qty !== undefined ? qty * multiplier : undefined);
                  setValue('reorderThresholdUnit', thresholdUnit || undefined);
                }}
                placeholder="e.g., 2"
                size="sm"
                fullWidth
              />
            </div>
            {thresholdUnitOptions.length > 0 ? (
              <div>
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Select is a custom component without native input */}
                <label id="supply-threshold-unit-label" className={FIELD_LABEL_COMPACT}>
                  Unit
                </label>
                <Select
                  aria-labelledby="supply-threshold-unit-label"
                  options={thresholdUnitOptions}
                  value={thresholdUnit}
                  onChange={v => {
                    const unit = String(v ?? '');
                    setThresholdUnit(unit);
                    const qty = thresholdInputQty === '' ? undefined : Number(thresholdInputQty);
                    const multiplier = unit
                      ? computeThresholdMultiplier(unit, currentStockUnit)
                      : 1;
                    setValue('reorderThreshold', qty !== undefined ? qty * multiplier : undefined);
                    setValue('reorderThresholdUnit', unit || undefined);
                  }}
                  size="sm"
                  fullWidth
                />
              </div>
            ) : (
              <div />
            )}
            <div className="flex items-end pb-1">
              {thresholdUnit &&
                thresholdInputQty &&
                computeThresholdMultiplier(thresholdUnit, currentStockUnit) > 1 && (
                  <span className="whitespace-nowrap text-caption text-muted-foreground">
                    ={' '}
                    {Number(thresholdInputQty) *
                      computeThresholdMultiplier(thresholdUnit, currentStockUnit)}{' '}
                    {pluralizeUnit(
                      currentStockUnit ?? 'unit',
                      Number(thresholdInputQty) *
                        computeThresholdMultiplier(thresholdUnit, currentStockUnit)
                    )}
                  </span>
                )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2.5 [&>*]:min-w-0">
            <ValidatedInput
              label="Reorder Qty"
              labelStyle="compact"
              type="number"
              placeholder="e.g., 5"
              registration={register('reorderQuantity', {
                setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
              })}
            />
            <Controller
              name="reorderUnit"
              control={control}
              render={({ field: { value, onChange } }) => (
                <div>
                  {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Select is a custom component without native input */}
                  <label id="supply-reorder-unit-label" className={FIELD_LABEL_COMPACT}>
                    Reorder Unit
                  </label>
                  <Select
                    aria-labelledby="supply-reorder-unit-label"
                    options={stockUnitOptions}
                    value={value ?? ''}
                    onChange={v => onChange(v)}
                    fullWidth
                  />
                </div>
              )}
            />
            <ValidatedInput
              label="Price ($)"
              labelStyle="compact"
              type="number"
              step="0.01"
              placeholder="e.g., 45"
              registration={register('unitPrice', {
                setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
              })}
            />
          </div>

          <div className="!mt-3.5">
            <SectionHeader title="Notes" size="sm" />
          </div>
          <ValidatedInput
            label="Description"
            labelStyle="compact"
            type="textarea"
            placeholder="Optional description"
            registration={register('description')}
          />
          <ValidatedInput
            label="Notes"
            labelStyle="compact"
            type="textarea"
            placeholder="Admin notes"
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
            form="supply-item-form"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            loadingText={isEditing ? 'Saving...' : 'Adding...'}
            leftIcon={
              isEditing ? <Save className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />
            }
          >
            {isEditing ? 'Save Changes' : 'Add Item'}
          </Button>
        </div>
      </div>
    </ConsolePanel>
  );
}
