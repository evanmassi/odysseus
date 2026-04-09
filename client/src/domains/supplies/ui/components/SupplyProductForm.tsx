/**
 * Supply Product Form
 *
 * React Hook Form for creating and editing supply products with lookup-driven
 * dropdowns, packaging hierarchy management, and multi-select properties.
 */

import { useMemo, useState, useCallback } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { createSupplyProductRequestSchema } from '@odysseus/shared-schemas';
import { Plus, Save, SquarePen, X } from 'lucide-react';
import { useForm, Controller, type FieldValues } from 'react-hook-form';

import { useSupplyProductDetailQuery } from '@domains/supplies/hooks';
import {
  useCreateSupplyProductMutation,
  useUpdateSupplyProductMutation,
  useAddSupplyPackagingLevelMutation,
  useRemoveSupplyPackagingLevelMutation,
} from '@domains/supplies/hooks/useSupplyMutations';
import { SupplyService } from '@domains/supplies/services/SupplyService';
import { useLookupValuesQuery } from '@shared/hooks/useLookupValuesQuery';
import { Button, Select, Checkbox, Input } from '@shared/ui';
import { ValidatedInput } from '@shared/ui/components/inputs/ValidatedInput';
import { Chip } from '@shared/ui/primitives/chip/Chip';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { notifications } from '@shared/utils/notifications';

import type {
  SupplyCategory,
  SupplyProductWithStock,
  CreateSupplyProductRequest,
} from '@odysseus/shared-schemas';
import type { SelectOption } from '@shared/ui/primitives/select/types';

interface SupplyProductFormProps {
  product?: SupplyProductWithStock;
  categories: SupplyCategory[];
  onSubmit: () => void;
  onCancel: () => void;
}

interface LocalPackagingLevel {
  unitName: string;
  quantity: number;
  parentUnit: string | null;
}

export function SupplyProductForm({
  product,
  categories,
  onSubmit,
  onCancel,
}: SupplyProductFormProps) {
  const isEditing = !!product;
  const createMutation = useCreateSupplyProductMutation();
  const updateMutation = useUpdateSupplyProductMutation();
  const addPackagingMutation = useAddSupplyPackagingLevelMutation();
  const removePackagingMutation = useRemoveSupplyPackagingLevelMutation();
  const { data: detail } = useSupplyProductDetailQuery(isEditing ? product.id : undefined);

  // Packaging — local state for create, server data for edit
  const [localPackagingLevels, setLocalPackagingLevels] = useState<LocalPackagingLevel[]>([]);
  const packagingLevels = useMemo(
    () => (isEditing ? (detail?.packagingLevels ?? []) : localPackagingLevels),
    [isEditing, detail?.packagingLevels, localPackagingLevels]
  );

  const [newLevelQty, setNewLevelQty] = useState('');
  const [newLevelUnit, setNewLevelUnit] = useState('');
  const [newLevelParent, setNewLevelParent] = useState<string | null>(null);
  const [manufacturerBarcode, setManufacturerBarcode] = useState('');
  const [manufacturerBarcodeLabel, setManufacturerBarcodeLabel] = useState('');

  const { data: manufacturers = [] } = useLookupValuesQuery('supply_manufacturer');
  const { data: vendors = [] } = useLookupValuesQuery('supply_vendor');
  const { data: stockUnits = [] } = useLookupValuesQuery('supply_stock_unit');
  const { data: productProperties = [] } = useLookupValuesQuery('supply_product_property');

  const manufacturerOptions: SelectOption[] = useMemo(
    () => [
      { value: '', label: 'Select...' },
      ...manufacturers.map((m: { value: string }) => ({ value: m.value, label: m.value })),
    ],
    [manufacturers]
  );

  const vendorOptions: SelectOption[] = useMemo(
    () => [
      { value: '', label: 'Select...' },
      ...vendors.map((v: { value: string }) => ({ value: v.value, label: v.value })),
    ],
    [vendors]
  );

  const stockUnitOptions: SelectOption[] = useMemo(
    () => [
      { value: '', label: 'Select...' },
      ...stockUnits.map((u: { value: string }) => ({ value: u.value, label: u.value })),
    ],
    [stockUnits]
  );

  const categoryOptions: SelectOption[] = useMemo(() => {
    const topLevel = categories
      .filter(c => !c.parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    const options: SelectOption[] = [{ value: '', label: 'Select category...' }];
    topLevel.forEach(parent => {
      options.push({ value: parent.id, label: parent.name });
      categories
        .filter(c => c.parentId === parent.id)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
        .forEach(sub => options.push({ value: sub.id, label: sub.name, description: parent.name }));
    });
    return options;
  }, [categories]);

  // Available units for the add-level "unit" dropdown (exclude already-used names)
  const availableUnitOptions: SelectOption[] = useMemo(() => {
    const usedNames = packagingLevels.map(l => ('unitName' in l ? l.unitName : ''));
    return [
      { value: '', label: 'Select...' },
      ...stockUnits
        .filter((u: { value: string }) => !usedNames.includes(u.value))
        .map((u: { value: string }) => ({ value: u.value, label: u.value })),
    ];
  }, [stockUnits, packagingLevels]);

  // Parent options for the add-level "per" dropdown
  const parentOptions: SelectOption[] = useMemo(
    () => [
      { value: '__base__', label: 'base item' },
      ...packagingLevels.map(l => ({
        value: 'unitName' in l ? l.unitName : '',
        label: 'unitName' in l ? l.unitName : '',
      })),
    ],
    [packagingLevels]
  );

  const topOfChain = useMemo(() => {
    if (packagingLevels.length === 0) return null;
    const childParents = new Set(
      packagingLevels.map(l => ('parentUnit' in l ? l.parentUnit : null)).filter(Boolean)
    );
    const top = packagingLevels.find(l => !childParents.has(l.unitName));
    return top?.unitName ?? null;
  }, [packagingLevels]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createSupplyProductRequestSchema) as never,
    defaultValues: isEditing
      ? {
          categoryId: product.categoryId,
          name: product.name,
          manufacturer: product.manufacturer ?? '',
          catalogNumber: product.catalogNumber ?? '',
          vendorName: product.vendorName ?? '',
          vendorCatalogNumber: product.vendorCatalogNumber ?? '',
          stockUnit: product.stockUnit ?? '',
          baseItemName: product.baseItemName ?? '',
          reorderThreshold: product.reorderThreshold,
          reorderQuantity: product.reorderQuantity,
          reorderUnit: product.reorderUnit ?? '',
          unitPrice: product.unitPrice,
          properties: product.properties,
          description: product.description ?? '',
          notes: product.notes ?? '',
        }
      : {
          categoryId: '',
          name: '',
          properties: [] as string[],
        },
  });

  const currentBaseItemName = watch('baseItemName') as string | undefined;

  const handleAddLevel = useCallback(() => {
    const qty = Number(newLevelQty);
    if (!newLevelUnit || qty <= 0) return;

    const resolvedParent = newLevelParent ?? topOfChain;
    const addedUnit = newLevelUnit;
    if (isEditing && product) {
      void addPackagingMutation
        .mutateAsync({
          productId: product.id,
          data: { unitName: newLevelUnit, quantity: qty, parentUnit: resolvedParent },
        })
        .then(() => {
          setNewLevelQty('');
          setNewLevelUnit('');
          setNewLevelParent(addedUnit);
        });
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
    product,
    newLevelQty,
    newLevelUnit,
    newLevelParent,
    topOfChain,
    addPackagingMutation,
  ]);

  const handleRemoveLevel = useCallback(
    (index: number, levelId?: string) => {
      if (isEditing && product && levelId) {
        void removePackagingMutation.mutateAsync({ productId: product.id, levelId });
      } else {
        setLocalPackagingLevels(prev => prev.filter((_, i) => i !== index));
      }
    },
    [isEditing, product, removePackagingMutation]
  );

  const onFormSubmit = async (data: FieldValues) => {
    const validated = data as CreateSupplyProductRequest;
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: product.id, data: validated });
        notifications.success('Product updated');
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
            notifications.warning('Product created but failed to save manufacturer barcode');
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
              `Product created but failed to save packaging level "${level.unitName}"`
            );
          }
        }

        notifications.success('Product created');
      }
      onSubmit();
    } catch {
      notifications.error(isEditing ? 'Failed to update product' : 'Failed to create product');
    }
  };

  const formatLevelDisplay = (level: {
    unitName: string;
    quantity: number;
    parentUnit: string | null;
  }) => {
    const parentName = level.parentUnit ?? currentBaseItemName ?? 'item';
    return `${level.quantity} ${parentName}${level.quantity !== 1 ? 's' : ''} per ${level.unitName}`;
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <ScrollArea className="flex-1 min-h-0">
        <form
          id="supply-product-form"
          onSubmit={handleSubmit(onFormSubmit)}
          className="p-4 space-y-4"
        >
          <h3 className="text-sm font-semibold text-secondary-foreground inline-flex items-center gap-1.5">
            {isEditing ? (
              <>
                <SquarePen size={14} className="text-muted-foreground" /> Edit Product
              </>
            ) : (
              <>
                <Plus size={14} className="text-muted-foreground" /> Add Product
              </>
            )}
          </h3>

          {/* Name */}
          <ValidatedInput
            label="Name"
            required
            placeholder="e.g., 200μL Filter Tips"
            error={!!errors.name}
            helperText={(errors.name?.message as string) ?? undefined}
            registration={register('name')}
          />

          {/* Category */}
          <Controller
            name="categoryId"
            control={control}
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <Select
                label="Category"
                options={categoryOptions}
                value={value ?? ''}
                onChange={v => onChange(v)}
                state={error ? 'error' : 'default'}
                error={error?.message}
                fullWidth
                renderOption={option => (
                  <div className="w-full">
                    {option.description ? (
                      <span className="pl-4 text-sm">{option.label}</span>
                    ) : (
                      <span className="text-sm font-semibold">{option.label}</span>
                    )}
                  </div>
                )}
                renderValue={selected => {
                  const opt = selected[0];
                  if (!opt?.value) return 'Select category...';
                  return opt.description ? `${opt.description} > ${opt.label}` : opt.label;
                }}
              />
            )}
          />

          {/* Manufacturer Barcode — create only */}
          {!isEditing && (
            <div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="mfg-barcode"
                    className="text-sm font-medium text-secondary-foreground block mb-1"
                  >
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
                  <label
                    htmlFor="mfg-barcode-label"
                    className="text-sm font-medium text-secondary-foreground block mb-1"
                  >
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
              <p className="text-xs text-muted-foreground mt-0.5">
                Optional — scan the barcode on the physical box to link it automatically
              </p>
            </div>
          )}

          {/* Manufacturer / Catalog # */}
          <div className="grid grid-cols-2 gap-3">
            <Controller
              name="manufacturer"
              control={control}
              render={({ field: { value, onChange } }) => (
                <Select
                  label="Manufacturer"
                  options={manufacturerOptions}
                  value={value ?? ''}
                  onChange={v => onChange(v)}
                  fullWidth
                />
              )}
            />
            <ValidatedInput
              label="Catalog #"
              placeholder="e.g., 4806"
              registration={register('catalogNumber')}
            />
          </div>

          {/* Vendor / Vendor Catalog # */}
          <div className="grid grid-cols-2 gap-3">
            <Controller
              name="vendorName"
              control={control}
              render={({ field: { value, onChange } }) => (
                <Select
                  label="Vendor"
                  options={vendorOptions}
                  value={value ?? ''}
                  onChange={v => onChange(v)}
                  fullWidth
                />
              )}
            />
            <ValidatedInput
              label="Vendor Catalog #"
              placeholder="e.g., 07-200-XXX"
              registration={register('vendorCatalogNumber')}
            />
          </div>

          {/* Item / Stock Unit */}
          <div className="grid grid-cols-2 gap-3">
            <ValidatedInput
              label="Item"
              placeholder="e.g., tip, glove, filter"
              registration={register('baseItemName')}
            />
            <Controller
              name="stockUnit"
              control={control}
              render={({ field: { value, onChange } }) => (
                <Select
                  label="Stock Unit"
                  options={stockUnitOptions}
                  value={value ?? ''}
                  onChange={v => onChange(v)}
                  fullWidth
                />
              )}
            />
          </div>

          {/* Properties */}
          {productProperties.length > 0 && (
            <div>
              <span className="text-sm font-medium text-secondary-foreground mb-1 block">
                Properties
              </span>
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
                      {productProperties.map((pp: { id: string; value: string }) => (
                        <label
                          key={pp.id}
                          className="flex items-center gap-1.5 text-sm cursor-pointer"
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
            </div>
          )}

          {/* Packaging */}
          <div>
            <div className="flex items-center gap-3 mb-2.5">
              <span className="text-xs text-muted-foreground/60 whitespace-nowrap font-medium">
                Packaging
              </span>
              <div className="h-px flex-1 bg-muted-foreground/60" />
            </div>

            {packagingLevels.length > 0 && (
              <div className="space-y-1 mb-2">
                {packagingLevels.map((level, index) => {
                  const levelData = {
                    unitName: level.unitName,
                    quantity: level.quantity,
                    parentUnit: ('parentUnit' in level ? level.parentUnit : null) as string | null,
                  };
                  const levelId = 'id' in level ? (level.id as string) : undefined;
                  const hasChildren = packagingLevels.some(
                    l => ('parentUnit' in l ? l.parentUnit : null) === levelData.unitName
                  );
                  return (
                    <div
                      key={levelId ?? `local-${index}`}
                      className="flex items-center justify-between text-sm px-2 py-1 bg-muted rounded"
                    >
                      <span>{formatLevelDisplay(levelData)}</span>
                      <button
                        type="button"
                        className={`p-0.5 ${hasChildren ? 'text-muted-foreground cursor-not-allowed' : 'text-danger-text hover:text-danger-text/80'}`}
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
                  value={newLevelParent ?? topOfChain ?? '__base__'}
                  onChange={v => setNewLevelParent(v === '__base__' ? null : String(v ?? ''))}
                  size="sm"
                  fullWidth
                  aria-label="Contents"
                />
              </div>
              <span className="text-xs text-muted-foreground pb-1.5">per</span>
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

          {/* Description */}
          <ValidatedInput
            label="Description"
            type="textarea"
            placeholder="Optional description"
            registration={register('description')}
          />

          {/* Notes */}
          <ValidatedInput
            label="Notes"
            type="textarea"
            placeholder="Admin notes"
            registration={register('notes')}
          />

          {/* Reorder Settings — at the bottom */}
          <div>
            <div className="flex items-center gap-3 mb-2.5">
              <span className="text-xs text-muted-foreground/60 whitespace-nowrap font-medium">
                Reorder Settings
              </span>
              <div className="h-px flex-1 bg-muted-foreground/60" />
            </div>
            <div className="grid grid-cols-4 gap-3">
              <ValidatedInput
                label="Threshold"
                type="number"
                placeholder="e.g., 3"
                registration={register('reorderThreshold', {
                  setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
                })}
              />
              <ValidatedInput
                label="Quantity"
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
                  <Select
                    label="Unit"
                    options={stockUnitOptions}
                    value={value ?? ''}
                    onChange={v => onChange(v)}
                    fullWidth
                  />
                )}
              />
              <ValidatedInput
                label="Price ($)"
                type="number"
                step="0.01"
                placeholder="e.g., 45"
                registration={register('unitPrice', {
                  setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
                })}
              />
            </div>
          </div>
        </form>
      </ScrollArea>

      <div className="flex justify-end gap-2 px-4 py-3 border-t border-border flex-shrink-0">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="supply-product-form"
          isLoading={isSubmitting}
          loadingText={isEditing ? 'Saving...' : 'Adding...'}
          leftIcon={isEditing ? <Save size={16} /> : <Plus size={16} />}
        >
          {isEditing ? 'Save' : 'Add Product'}
        </Button>
      </div>
    </div>
  );
}
