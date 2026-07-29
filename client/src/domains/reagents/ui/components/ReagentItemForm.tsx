/**
 * Reagent Item Form
 *
 * React Hook Form for creating and editing reagents: sourcing and chemistry fields,
 * registry-backed unit dropdowns, and the packaging chain editor.
 */

import { useCallback, useMemo, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  createReagentItemRequestSchema,
  updateReagentItemRequestSchema,
  type CreateReagentItemRequest,
  type UpdateReagentItemRequest,
  type ReagentCategory,
  type ReagentItemWithStock,
} from '@odysseus/shared-schemas';
import { Plus, Save, SquarePen, X } from 'lucide-react';
import { useForm, Controller, type FieldValues } from 'react-hook-form';

import {
  useAddReagentPackagingLevelMutation,
  useCreateReagentItemMutation,
  useReagentItemDetailQuery,
  useRemoveReagentPackagingLevelMutation,
  useUpdateReagentItemMutation,
} from '@domains/reagents/hooks';
import { ReagentService } from '@domains/reagents/services/ReagentService';
import { useLookupValuesQuery } from '@shared/hooks/useLookupValuesQuery';
import {
  Button,
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
import { ConsolePanel } from '@shared/ui/primitives/console-panel/ConsolePanel';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { notifications } from '@shared/utils/notifications';
import { pluralizeUnit } from '@shared/utils/pluralizeUnit';
import {
  AMOUNT_UNIT_OPTIONS,
  CONCENTRATION_UNIT_OPTIONS,
  PACK_UNITS,
} from '@shared/utils/unitOptions';

interface ReagentItemFormProps {
  item?: ReagentItemWithStock;
  categories: ReagentCategory[];
  onSubmit: () => void;
  onCancel: () => void;
}

interface LocalPackagingLevel {
  unitName: string;
  quantity: number;
  parentUnit: string | null;
}

/** Rendered rows come from local state while creating and from the server while editing. */
type PackagingLevelRow = LocalPackagingLevel & { id?: string };

const TRACKED_FIELDS = [
  'name',
  'categoryId',
  'manufacturer',
  'catalogNumber',
  'vendorName',
  'vendorCatalogNumber',
  'reagentType',
  'casNumber',
  'concentration',
  'stockUnit',
  'reorderThreshold',
  'reorderQuantity',
  'unitPrice',
  'description',
  'notes',
];

export function ReagentItemForm({ item, categories, onSubmit, onCancel }: ReagentItemFormProps) {
  const isEditing = !!item;
  const createMutation = useCreateReagentItemMutation();
  const updateMutation = useUpdateReagentItemMutation();
  const addPackagingMutation = useAddReagentPackagingLevelMutation();
  const removePackagingMutation = useRemoveReagentPackagingLevelMutation();
  const { data: detail } = useReagentItemDetailQuery(isEditing ? item.id : undefined);

  const [localPackagingLevels, setLocalPackagingLevels] = useState<LocalPackagingLevel[]>([]);
  const packagingLevels = useMemo(
    () => (isEditing ? (detail?.packagingLevels ?? []) : localPackagingLevels),
    [isEditing, detail?.packagingLevels, localPackagingLevels]
  );

  const [newLevelQty, setNewLevelQty] = useState('');
  const [newLevelUnit, setNewLevelUnit] = useState('');

  // A level's `parentUnit` names what it holds, so the outermost pack is the one no other
  // level points at. New packs wrap it; the first pack holds the stock unit itself.
  const outermostPack = useMemo(() => {
    const held = new Set(
      packagingLevels.map(level => level.parentUnit).filter((unit): unit is string => !!unit)
    );
    return packagingLevels.find(level => !held.has(level.unitName))?.unitName ?? null;
  }, [packagingLevels]);

  const { data: manufacturers = [] } = useLookupValuesQuery('manufacturer');
  const { data: vendors = [] } = useLookupValuesQuery('vendor');
  const { data: reagentTypes = [] } = useLookupValuesQuery('reagent_type');

  const manufacturerOptions = useMemo(() => lookupOptions(manufacturers), [manufacturers]);
  const vendorOptions = useMemo(() => lookupOptions(vendors), [vendors]);
  const reagentTypeOptions = useMemo(() => lookupOptions(reagentTypes), [reagentTypes]);

  const packUnitOptions = useMemo(() => {
    const used = new Set(packagingLevels.map(level => level.unitName));
    return withPlaceholder(
      'pack unit',
      PACK_UNITS.filter(unit => !used.has(unit.id)).map(unit => ({
        value: unit.id,
        label: unit.label,
      }))
    );
  }, [packagingLevels]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    // The concentration preprocessor accepts `unknown`, so the schema's input type doesn't meet
    // the resolver's FieldValues constraint even though every field arrives from an input as text.
    resolver: zodResolver(
      (isEditing ? updateReagentItemRequestSchema : createReagentItemRequestSchema) as never
    ) as never,
    defaultValues: isEditing
      ? {
          categoryId: item.categoryId,
          name: item.name,
          manufacturer: item.manufacturer ?? '',
          catalogNumber: item.catalogNumber ?? '',
          vendorName: item.vendorName ?? '',
          vendorCatalogNumber: item.vendorCatalogNumber ?? '',
          reagentType: item.reagentType ?? '',
          casNumber: item.casNumber ?? '',
          concentration: item.concentration ?? '',
          concentrationUnit: item.concentrationUnit ?? '',
          stockUnit: item.stockUnit ?? '',
          reorderThreshold: item.reorderThreshold,
          reorderQuantity: item.reorderQuantity,
          reorderUnit: item.reorderUnit ?? '',
          unitPrice: item.unitPrice,
          expiryWarningDays: item.expiryWarningDays,
          description: item.description ?? '',
          notes: item.notes ?? '',
        }
      : { categoryId: '', name: '' },
  });

  // Blank clears the field on edit (null) but stays absent on create (undefined).
  const numberField = (value: string) =>
    value === '' ? (isEditing ? null : undefined) : Number(value);

  const allValues = watch() as Record<string, unknown>;
  const filledCount = TRACKED_FIELDS.filter(field => {
    const value = allValues[field];
    return value != null && String(value).trim() !== '';
  }).length;

  const currentStockUnit = allValues['stockUnit'] as string | undefined;

  const handleAddLevel = useCallback(() => {
    const quantity = Number(newLevelQty);
    if (!newLevelUnit || quantity <= 0) return;

    const parentUnit = outermostPack;

    if (isEditing) {
      addPackagingMutation.mutate(
        { itemId: item.id, data: { unitName: newLevelUnit, quantity, parentUnit } },
        {
          onSuccess: () => {
            setNewLevelQty('');
            setNewLevelUnit('');
          },
        }
      );
      return;
    }

    setLocalPackagingLevels(prev => [...prev, { unitName: newLevelUnit, quantity, parentUnit }]);
    setNewLevelQty('');
    setNewLevelUnit('');
  }, [isEditing, item, newLevelQty, newLevelUnit, outermostPack, addPackagingMutation]);

  const handleRemoveLevel = useCallback(
    (index: number, levelId?: string) => {
      if (isEditing && levelId) {
        removePackagingMutation.mutate({ itemId: item.id, levelId });
        return;
      }
      setLocalPackagingLevels(prev => prev.filter((_, i) => i !== index));
    },
    [isEditing, item, removePackagingMutation]
  );

  const onFormSubmit = async (data: FieldValues) => {
    if (isEditing) {
      updateMutation.mutate(
        { id: item.id, data: data as UpdateReagentItemRequest },
        {
          onSuccess: () => {
            notifications.success('Reagent updated');
            onSubmit();
          },
        }
      );
      return;
    }

    try {
      const created = await createMutation.mutateAsync(data as CreateReagentItemRequest);

      // Packaging levels need the new item id, so they sequence off the create. The service is
      // called directly: a failed level shouldn't lose the item, and there is no cache to patch.
      for (const level of localPackagingLevels) {
        try {
          await ReagentService.addPackagingLevel(created.id, level);
        } catch {
          notifications.warning(`Reagent created without the "${level.unitName}" packaging level`);
        }
      }

      notifications.success('Reagent created');
      onSubmit();
    } catch {
      // The global handler toasts the create failure; the form stays open for a retry.
    }
  };

  return (
    <ConsolePanel intensity="soft" className="flex h-full min-h-0 flex-col">
      <div className="flex flex-shrink-0 items-center gap-3 border-b border-line-faint px-4 py-3">
        <span className="p-1.5 text-muted-foreground">
          {isEditing ? <SquarePen size={20} /> : <Plus size={20} />}
        </span>
        <h2 className="text-lg font-medium text-foreground">
          {isEditing ? 'Edit Reagent' : 'Add Reagent'}
        </h2>
      </div>

      <CompletenessMeter filled={filledCount} total={TRACKED_FIELDS.length} />

      <ScrollArea className="min-h-0 flex-1">
        <form
          id="reagent-item-form"
          onSubmit={handleSubmit(onFormSubmit)}
          className="space-y-2 p-4"
        >
          <SectionHeader title="Identification" size="sm" />
          <ValidatedInput
            label="Name"
            labelStyle="compact"
            required
            placeholder="e.g., anti-CD3 (UCHT1)"
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
                labelId="reagent-category-label"
                error={error?.message}
              />
            )}
          />

          <div className="!mt-3.5">
            <SectionHeader title="Sourcing" size="sm" />
          </div>
          <div className="grid grid-cols-2 gap-2.5 [&>*]:min-w-0">
            <Controller
              name="manufacturer"
              control={control}
              render={({ field: { value, onChange } }) => (
                <div>
                  {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Select is a custom component without native input */}
                  <label id="reagent-manufacturer-label" className={FIELD_LABEL_COMPACT}>
                    Manufacturer
                  </label>
                  <Select
                    aria-labelledby="reagent-manufacturer-label"
                    options={manufacturerOptions}
                    value={(value as string) ?? ''}
                    onChange={v => onChange(v)}
                    fullWidth
                  />
                </div>
              )}
            />
            <ValidatedInput
              label="Catalog #"
              labelStyle="compact"
              placeholder="e.g., 300402"
              registration={register('catalogNumber')}
            />
            <Controller
              name="vendorName"
              control={control}
              render={({ field: { value, onChange } }) => (
                <div>
                  {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Select is a custom component without native input */}
                  <label id="reagent-vendor-label" className={FIELD_LABEL_COMPACT}>
                    Vendor
                  </label>
                  <Select
                    aria-labelledby="reagent-vendor-label"
                    options={vendorOptions}
                    value={(value as string) ?? ''}
                    onChange={v => onChange(v)}
                    fullWidth
                  />
                </div>
              )}
            />
            <ValidatedInput
              label="Vendor Catalog #"
              labelStyle="compact"
              placeholder="e.g., BLG-300402"
              registration={register('vendorCatalogNumber')}
            />
          </div>

          <div className="!mt-3.5">
            <SectionHeader title="Chemistry" size="sm" />
          </div>
          <div className="grid grid-cols-2 gap-2.5 [&>*]:min-w-0">
            <Controller
              name="reagentType"
              control={control}
              render={({ field: { value, onChange } }) => (
                <div>
                  {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Select is a custom component without native input */}
                  <label id="reagent-type-label" className={FIELD_LABEL_COMPACT}>
                    Type
                  </label>
                  <Select
                    aria-labelledby="reagent-type-label"
                    options={reagentTypeOptions}
                    value={(value as string) ?? ''}
                    onChange={v => onChange(v)}
                    fullWidth
                  />
                </div>
              )}
            />
            <ValidatedInput
              label="CAS #"
              labelStyle="compact"
              placeholder="e.g., 64-17-5"
              registration={register('casNumber')}
            />
            <ValidatedInput
              label="Concentration"
              labelStyle="compact"
              placeholder="e.g., 1.5 or 5e6"
              error={!!errors.concentration}
              helperText={(errors.concentration?.message as string) ?? undefined}
              registration={register('concentration')}
            />
            <Controller
              name="concentrationUnit"
              control={control}
              render={({ field: { value, onChange }, fieldState: { error } }) => (
                <div>
                  {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Select is a custom component without native input */}
                  <label id="reagent-concentration-unit-label" className={FIELD_LABEL_COMPACT}>
                    Concentration Unit
                  </label>
                  <Select
                    aria-labelledby="reagent-concentration-unit-label"
                    options={CONCENTRATION_UNIT_OPTIONS}
                    value={(value as string) ?? ''}
                    onChange={v => onChange(v)}
                    error={error?.message}
                    fullWidth
                  />
                </div>
              )}
            />
          </div>

          <div className="!mt-3.5">
            <SectionHeader title="Unit & Packaging" size="sm" />
          </div>
          <Controller
            name="stockUnit"
            control={control}
            render={({ field: { value, onChange } }) => (
              <div>
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Select is a custom component without native input */}
                <label id="reagent-stock-unit-label" className={FIELD_LABEL_COMPACT}>
                  Stock Unit
                </label>
                <Select
                  aria-labelledby="reagent-stock-unit-label"
                  options={AMOUNT_UNIT_OPTIONS}
                  value={(value as string) ?? ''}
                  onChange={v => onChange(v)}
                  fullWidth
                />
                <p className="mt-1 text-caption text-muted-foreground">
                  The unit you consume in — µL for an antibody you pipette, each for a kit.
                </p>
              </div>
            )}
          />
          <div>
            <span className={FIELD_LABEL_COMPACT}>Packaging</span>
            {packagingLevels.length > 0 && (
              <div className="mb-2 space-y-1">
                {packagingLevels.map((level: PackagingLevelRow, index) => {
                  const contained = level.parentUnit ?? currentStockUnit ?? 'unit';
                  const hasChildren = packagingLevels.some(l => l.parentUnit === level.unitName);
                  return (
                    <div
                      key={level.id ?? `local-${index}`}
                      className="flex items-center justify-between border border-line-faint bg-shade/20 px-2.5 py-1.5 text-body-sm"
                    >
                      <span>
                        1 {level.unitName} = {level.quantity}{' '}
                        {pluralizeUnit(contained, level.quantity)}
                      </span>
                      <button
                        type="button"
                        className={`p-0.5 ${hasChildren ? 'cursor-not-allowed text-muted-foreground' : 'text-danger-text hover:text-danger-text/80'}`}
                        disabled={hasChildren}
                        title={hasChildren ? 'Remove the outer pack first' : 'Remove'}
                        onClick={() => handleRemoveLevel(index, level.id)}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Select
                  options={packUnitOptions}
                  value={newLevelUnit}
                  onChange={v => setNewLevelUnit(String(v ?? ''))}
                  size="sm"
                  fullWidth
                  aria-label="Pack unit"
                />
              </div>
              <span className="pb-1.5 text-caption text-muted-foreground">holds</span>
              <div className="w-20">
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
              <span className="pb-1.5 text-caption text-muted-foreground">
                {outermostPack ?? currentStockUnit ?? ''}
              </span>
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

          <div className="!mt-3.5">
            <SectionHeader title="Reorder Settings" size="sm" />
          </div>
          <div className="grid grid-cols-3 gap-2.5 [&>*]:min-w-0">
            <ValidatedInput
              label="Threshold"
              labelStyle="compact"
              type="number"
              placeholder="e.g., 200"
              registration={register('reorderThreshold', { setValueAs: numberField })}
            />
            <ValidatedInput
              label="Reorder Qty"
              labelStyle="compact"
              type="number"
              placeholder="e.g., 1"
              registration={register('reorderQuantity', { setValueAs: numberField })}
            />
            <Controller
              name="reorderUnit"
              control={control}
              render={({ field: { value, onChange } }) => (
                <div>
                  {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Select is a custom component without native input */}
                  <label id="reagent-reorder-unit-label" className={FIELD_LABEL_COMPACT}>
                    Reorder Unit
                  </label>
                  <Select
                    aria-labelledby="reagent-reorder-unit-label"
                    options={AMOUNT_UNIT_OPTIONS}
                    value={(value as string) ?? ''}
                    onChange={v => onChange(v)}
                    fullWidth
                  />
                </div>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5 [&>*]:min-w-0">
            <ValidatedInput
              label="Price ($)"
              labelStyle="compact"
              type="number"
              step="0.01"
              placeholder="e.g., 285"
              registration={register('unitPrice', { setValueAs: numberField })}
            />
            <ValidatedInput
              label="Expiry Warning (days)"
              labelStyle="compact"
              type="number"
              placeholder="90"
              registration={register('expiryWarningDays', { setValueAs: numberField })}
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
            form="reagent-item-form"
            variant="primary"
            size="sm"
            isLoading={isSubmitting || updateMutation.isPending}
            loadingText={isEditing ? 'Saving...' : 'Adding...'}
            leftIcon={
              isEditing ? <Save className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />
            }
          >
            {isEditing ? 'Save Changes' : 'Add Reagent'}
          </Button>
        </div>
      </div>
    </ConsolePanel>
  );
}
