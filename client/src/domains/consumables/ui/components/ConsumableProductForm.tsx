/**
 * Consumable Product Form
 *
 * React Hook Form for creating and editing consumable products with lookup-driven
 * dropdowns for manufacturer, vendor, stock unit, and multi-select properties.
 */

import { useMemo, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { createConsumableProductRequestSchema } from '@odysseus/shared-schemas';
import { Plus, Save, SquarePen } from 'lucide-react';
import { useForm, Controller, type FieldValues } from 'react-hook-form';

import { useConsumableProductDetailQuery } from '@domains/consumables/hooks';
import {
  useCreateConsumableProductMutation,
  useUpdateConsumableProductMutation,
  useAddConsumablePackagingLevelMutation,
  useRemoveConsumablePackagingLevelMutation,
} from '@domains/consumables/hooks/useConsumableMutations';
import { useLookupValuesQuery } from '@shared/hooks/useLookupValuesQuery';
import { Button, Select, Checkbox } from '@shared/ui';
import { ValidatedInput } from '@shared/ui/components/inputs/ValidatedInput';
import { Chip } from '@shared/ui/primitives/chip/Chip';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { notifications } from '@shared/utils/notifications';

import type {
  ConsumableCategory,
  ConsumableProductWithStock,
  CreateConsumableProductRequest,
} from '@odysseus/shared-schemas';
import type { SelectOption } from '@shared/ui/primitives/select/types';

interface ConsumableProductFormProps {
  product?: ConsumableProductWithStock;
  categories: ConsumableCategory[];
  onSubmit: () => void;
  onCancel: () => void;
}

export function ConsumableProductForm({
  product,
  categories,
  onSubmit,
  onCancel,
}: ConsumableProductFormProps) {
  const isEditing = !!product;
  const createMutation = useCreateConsumableProductMutation();
  const updateMutation = useUpdateConsumableProductMutation();
  const addPackagingMutation = useAddConsumablePackagingLevelMutation();
  const removePackagingMutation = useRemoveConsumablePackagingLevelMutation();
  const { data: detail } = useConsumableProductDetailQuery(isEditing ? product.id : undefined);
  const [newLevelUnit, setNewLevelUnit] = useState('');
  const [newLevelQuantity, setNewLevelQuantity] = useState('');
  const [newLevelParent, setNewLevelParent] = useState<string | null>(null);

  const { data: manufacturers = [] } = useLookupValuesQuery('consumable_manufacturer');
  const { data: vendors = [] } = useLookupValuesQuery('consumable_vendor');
  const { data: stockUnits = [] } = useLookupValuesQuery('consumable_stock_unit');
  const { data: productProperties = [] } = useLookupValuesQuery('consumable_product_property');

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
    resolver: zodResolver(createConsumableProductRequestSchema) as never,
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

  const onFormSubmit = async (data: FieldValues) => {
    const validated = data as CreateConsumableProductRequest;
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: product.id, data: validated });
        notifications.success('Product updated');
      } else {
        await createMutation.mutateAsync(validated);
        notifications.success('Product created');
      }
      onSubmit();
    } catch {
      notifications.error(isEditing ? 'Failed to update product' : 'Failed to create product');
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <ScrollArea className="flex-1 min-h-0">
        <form
          id="consumable-product-form"
          onSubmit={handleSubmit(onFormSubmit)}
          className="p-4 space-y-4"
        >
          <h3 className="text-sm font-semibold text-secondary-foreground inline-flex items-center gap-1.5">
            {isEditing ? (
              <>
                <SquarePen size={14} className="text-muted-foreground" />
                Edit Product
              </>
            ) : (
              <>
                <Plus size={14} className="text-muted-foreground" />
                Add Product
              </>
            )}
          </h3>

          <ValidatedInput
            label="Name"
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
              <Select
                label="Category"
                options={categoryOptions}
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
                  if (!opt?.value) return 'Select category...';
                  return opt.description ? `${opt.description} > ${opt.label}` : opt.label;
                }}
              />
            )}
          />

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
              error={!!errors.catalogNumber}
              helperText={(errors.catalogNumber?.message as string) ?? undefined}
              registration={register('catalogNumber')}
            />
          </div>

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

          <div className="grid grid-cols-2 gap-3">
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
            <ValidatedInput
              label="Base Item Name"
              placeholder="e.g., tip, glove"
              registration={register('baseItemName')}
            />
          </div>

          <div>
            <div className="flex items-center gap-3 mb-2.5">
              <span className="text-xs text-muted-foreground/60 whitespace-nowrap font-medium">
                Reorder Settings
              </span>
              <div className="h-px flex-1 bg-muted-foreground/60" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <ValidatedInput
                label="Threshold"
                type="number"
                placeholder="e.g., 3"
                registration={register('reorderThreshold', { setValueAs: (v: string) => v === '' ? undefined : Number(v) })}
              />
              <ValidatedInput
                label="Quantity"
                type="number"
                placeholder="e.g., 5"
                registration={register('reorderQuantity', { setValueAs: (v: string) => v === '' ? undefined : Number(v) })}
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
            </div>
          </div>

          <ValidatedInput
            label="Unit Price ($)"
            type="number"
            step="0.01"
            placeholder="e.g., 45.00"
            registration={register('unitPrice', { setValueAs: (v: string) => v === '' ? undefined : Number(v) })}
          />

          {/* Properties multi-select */}
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
                              if (checked) {
                                onChange([...(value as string[]), pp.value]);
                              } else {
                                onChange((value as string[]).filter((p: string) => p !== pp.value));
                              }
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

          {/* Packaging Levels — edit mode only */}
          {isEditing && detail?.packagingLevels && (
            <div>
              <div className="flex items-center gap-3 mb-2.5">
                <span className="text-xs text-muted-foreground/60 whitespace-nowrap font-medium">
                  Packaging
                </span>
                <div className="h-px flex-1 bg-muted-foreground/60" />
              </div>

              {detail.packagingLevels.length > 0 && (
                <div className="space-y-1 mb-2">
                  {detail.packagingLevels.map(level => {
                    const hasChildren = detail.packagingLevels.some(l => l.parentUnit === level.unitName);
                    return (
                      <div key={level.id} className="flex items-center justify-between text-sm px-2 py-1 bg-muted rounded">
                        <span>
                          {level.quantity} {level.parentUnit ?? product.baseItemName ?? 'base'}{level.quantity !== 1 ? 's' : ''} per {level.unitName}
                        </span>
                        <button
                          type="button"
                          className={`text-xs ${hasChildren ? 'text-muted-foreground cursor-not-allowed' : 'text-danger-text hover:underline'}`}
                          disabled={hasChildren}
                          title={hasChildren ? 'Remove child levels first' : undefined}
                          onClick={() => void removePackagingMutation.mutateAsync({ productId: product.id, levelId: level.id })}
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Select
                    label="Unit Name"
                    options={[
                      { value: '', label: 'Select...' },
                      ...stockUnits
                        .filter((u: { value: string }) => !detail.packagingLevels.some(l => l.unitName === u.value))
                        .map((u: { value: string }) => ({ value: u.value, label: u.value })),
                    ]}
                    value={newLevelUnit}
                    onChange={v => setNewLevelUnit(String(v ?? ''))}
                    size="sm"
                    fullWidth
                  />
                </div>
                <div className="w-20">
                  <ValidatedInput
                    label="Qty"
                    type="number"
                    placeholder="e.g., 96"
                    registration={{ name: 'pkg-qty', onChange: (e: React.ChangeEvent<HTMLInputElement>) => setNewLevelQuantity(e.target.value), onBlur: () => {}, ref: () => {} } as never}
                  />
                </div>
                <div className="flex-1">
                  <Select
                    label="Per"
                    options={[
                      { value: '__base__', label: product.baseItemName ?? 'base item' },
                      ...detail.packagingLevels.map(l => ({ value: l.unitName, label: l.unitName })),
                    ]}
                    value={newLevelParent ?? '__base__'}
                    onChange={v => setNewLevelParent(v === '__base__' ? null : String(v ?? ''))}
                    size="sm"
                    fullWidth
                  />
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mb-0.5"
                  disabled={!newLevelUnit || !newLevelQuantity || Number(newLevelQuantity) <= 0}
                  onClick={() => {
                    void addPackagingMutation.mutateAsync({
                      productId: product.id,
                      data: { unitName: newLevelUnit, quantity: Number(newLevelQuantity), parentUnit: newLevelParent },
                    }).then(() => {
                      setNewLevelUnit('');
                      setNewLevelQuantity('');
                      setNewLevelParent(null);
                    });
                  }}
                >
                  Add
                </Button>
              </div>
            </div>
          )}

          <ValidatedInput
            label="Description"
            type="textarea"
            placeholder="Optional description"
            registration={register('description')}
          />

          <ValidatedInput
            label="Notes"
            type="textarea"
            placeholder="Admin notes"
            registration={register('notes')}
          />
        </form>
      </ScrollArea>

      <div className="flex justify-end gap-2 px-4 py-3 border-t border-border flex-shrink-0">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="consumable-product-form"
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
