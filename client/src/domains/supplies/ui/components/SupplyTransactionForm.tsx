/**
 * Supply Transaction Form
 *
 * Tabbed stock operation form for receiving, consuming, counting, and disposing
 * supply inventory. Multi-level packaging inputs on all tabs when packaging
 * levels are defined, with auto-computed totals in stock units.
 */

import { useMemo, useState, useCallback, useEffect } from 'react';

import { PackagePlus, PackageMinus, ClipboardCheck, ClipboardList, Trash2 } from 'lucide-react';
import { useForm, Controller, type FieldValues } from 'react-hook-form';

import { useSupplyProductDetailQuery, useSupplyLocationsQuery } from '@domains/supplies/hooks';
import {
  useRecordSupplyTransactionMutation,
  useRecordSupplyStockCountMutation,
} from '@domains/supplies/hooks/useSupplyMutations';
import { Button, Input, Select, DatePicker, Tabs, Tab } from '@shared/ui';
import { ValidatedInput } from '@shared/ui/components/inputs/ValidatedInput';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { formatDateForInput } from '@shared/utils/dateFormatters';
import { notifications } from '@shared/utils/notifications';
import { pluralizeUnit } from '@shared/utils/pluralizeUnit';

import type { SelectOption } from '@shared/ui/primitives/select/types';

type TransactionMode = 'received' | 'issued' | 'count' | 'disposed';

const MODE_LABELS: Record<TransactionMode, string> = {
  received: 'Receive:',
  issued: 'Issue:',
  count: 'Count:',
  disposed: 'Dispose:',
};

export interface TransactionPrefill {
  locationId?: string;
  quantity?: number;
  lotNumber?: string;
  expirationDate?: string;
  poNumber?: string;
  cost?: number;
  notes?: string;
}

interface SupplyTransactionFormProps {
  productId: string;
  productName: string;
  manufacturer?: string;
  catalogNumber?: string;
  initialTab?: TransactionMode;
  prefill?: TransactionPrefill;
  onSubmit: () => void;
  onCancel: () => void;
}

export function SupplyTransactionForm({
  productId,
  productName,
  manufacturer,
  catalogNumber,
  initialTab,
  prefill,
  onSubmit,
  onCancel,
}: SupplyTransactionFormProps) {
  const { data: detail } = useSupplyProductDetailQuery(productId);
  const { data: locations = [] } = useSupplyLocationsQuery();
  const recordTransactionMutation = useRecordSupplyTransactionMutation();
  const recordStockCountMutation = useRecordSupplyStockCountMutation();

  const locationOptions: SelectOption[] = useMemo(
    () => [
      { value: '', label: 'Select location...' },
      ...locations.map(l => ({ value: l.id, label: l.name })),
    ],
    [locations]
  );

  const packagingLevels = useMemo(() => detail?.packagingLevels ?? [], [detail?.packagingLevels]);
  const hasPackaging = packagingLevels.length > 0;
  const stockUnit = detail?.product.stockUnit ?? '';
  const stockUnitSingular = stockUnit || 'unit';
  const stockUnitLabel = pluralizeUnit(stockUnitSingular, 2);

  const computeMultiplier = useCallback(
    (fromUnit: string): number => {
      if (fromUnit === stockUnit) return 1;
      let multiplier = 1;
      let current = fromUnit;
      for (let i = 0; i < packagingLevels.length + 1; i++) {
        const level = packagingLevels.find(l => l.unitName === current);
        if (!level) return 1;
        multiplier *= level.quantity;
        if (level.parentUnit === null || level.parentUnit === stockUnit) return multiplier;
        current = level.parentUnit;
      }
      return multiplier;
    },
    [stockUnit, packagingLevels]
  );

  const orderedLevels = useMemo(() => {
    if (!hasPackaging) return [];
    const levels = [...packagingLevels];
    const ordered: typeof levels = [];
    const bottom = levels.find(l => l.parentUnit === null);
    if (bottom) {
      ordered.push(bottom);
      let current = bottom;
      for (let i = 0; i < levels.length; i++) {
        const next = levels.find(l => l.parentUnit === current.unitName);
        if (!next) break;
        ordered.push(next);
        current = next;
      }
    }
    return ordered;
  }, [hasPackaging, packagingLevels]);

  const showLooseRow = hasPackaging && !packagingLevels.some(l => l.unitName === stockUnit);

  const [qtyByLevel, setQtyByLevel] = useState<Record<string, number>>({});

  const computedTotal = useMemo(() => {
    if (!hasPackaging) return undefined;
    let total = qtyByLevel['__stock__'] ?? 0;
    for (const level of packagingLevels) {
      const qty = qtyByLevel[level.unitName] ?? 0;
      if (qty > 0) {
        total += qty * computeMultiplier(level.unitName);
      }
    }
    return total;
  }, [hasPackaging, qtyByLevel, packagingLevels, computeMultiplier]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      productId,
      locationId: prefill?.locationId ?? '',
      type: (initialTab ?? 'received') as string,
      quantity: prefill?.quantity as number | undefined,
      lotNumber: prefill?.lotNumber ?? '',
      expirationDate: prefill?.expirationDate ?? '',
      poNumber: prefill?.poNumber ?? '',
      cost: prefill?.cost as number | undefined,
      notes: prefill?.notes ?? '',
    },
  });

  const mode = watch('type') as TransactionMode;
  const selectedLocationId = watch('locationId') as string;

  const currentStockAtLocation = useMemo(() => {
    if (!detail || !selectedLocationId) return 0;
    return detail.stock.find(s => s.locationId === selectedLocationId)?.quantity ?? 0;
  }, [detail, selectedLocationId]);

  const actualCount = watch('quantity') as number | undefined;
  const countDelta =
    mode === 'count' && actualCount !== undefined
      ? actualCount - currentStockAtLocation
      : undefined;

  const handleLevelChange = useCallback((key: string, value: string) => {
    setQtyByLevel(prev => ({ ...prev, [key]: value === '' ? 0 : Number(value) }));
  }, []);

  useEffect(() => {
    if (hasPackaging && computedTotal !== undefined) {
      setValue('quantity', computedTotal);
    }
  }, [hasPackaging, computedTotal, setValue]);

  const onFormSubmit = async (data: FieldValues) => {
    const quantity = Number(data['quantity']);
    const locationId = data['locationId'] as string;
    if (!locationId || isNaN(quantity)) {
      notifications.error('Quantity and location are required');
      return;
    }

    try {
      if (mode === 'count') {
        await recordStockCountMutation.mutateAsync({
          productId,
          locationId: data['locationId'] as string,
          actualCount: quantity,
          lotNumber: (data['lotNumber'] as string) || undefined,
          expirationDate: (data['expirationDate'] as string) || undefined,
          notes: (data['notes'] as string) || undefined,
        });
      } else {
        await recordTransactionMutation.mutateAsync({
          productId,
          locationId: data['locationId'] as string,
          type: data['type'] as 'received' | 'issued' | 'disposed',
          quantity,
          lotNumber: (data['lotNumber'] as string) || undefined,
          expirationDate: (data['expirationDate'] as string) || undefined,
          poNumber: (data['poNumber'] as string) || undefined,
          cost: data['cost'] as number | undefined,
          notes: (data['notes'] as string) || undefined,
        });
      }
      notifications.success(
        mode === 'received'
          ? 'Stock received'
          : mode === 'issued'
            ? 'Stock issued'
            : mode === 'count'
              ? 'Stock count recorded'
              : 'Stock disposed'
      );
      reset();
      onSubmit();
    } catch {
      notifications.error('Failed to record transaction');
    }
  };

  const handleModeChange = (newMode: string) => {
    setQtyByLevel({});
    reset({
      productId,
      locationId: '',
      type: newMode,
      quantity: undefined,
      lotNumber: '',
      expirationDate: '',
      poNumber: '',
      cost: undefined,
      notes: '',
    });
  };

  const quantityLabel =
    mode === 'count'
      ? `Actual Count${stockUnit ? ` (${stockUnitLabel})` : ''}`
      : `Quantity${stockUnit ? ` (${stockUnitLabel})` : ''}`;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 pt-4 pb-2 flex-shrink-0">
        <h3 className="text-sm font-semibold text-muted-foreground tracking-wide inline-flex items-center gap-1.5 mb-1.5">
          <ClipboardList size={14} className="text-secondary-foreground" />
          Record Transaction
        </h3>
        <p className="text-sm font-semibold text-card-foreground">{productName}</p>
        {(manufacturer ?? catalogNumber) && (
          <p className="text-xs text-muted-foreground truncate">
            {[manufacturer, catalogNumber].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>

      <div className="px-4 pb-2 flex-shrink-0">
        <Tabs
          value={mode}
          onChange={handleModeChange}
          orientation="horizontal"
          className="!gap-0 !px-0 [&_button]:!px-2.5 [&_button]:flex-1 [&_button]:justify-center"
        >
          <Tab id="count" icon={<ClipboardCheck size={14} />}>
            Count
          </Tab>
          <Tab id="received" icon={<PackagePlus size={14} />}>
            Receive
          </Tab>
          <Tab id="issued" icon={<PackageMinus size={14} />}>
            Issue
          </Tab>
          <Tab id="disposed" icon={<Trash2 size={14} />}>
            Dispose
          </Tab>
        </Tabs>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <form
          id="supply-transaction-form"
          onSubmit={handleSubmit(onFormSubmit)}
          className="px-4 pb-4 space-y-3"
        >
          <input type="hidden" {...register('productId')} />
          <input type="hidden" {...register('type')} />

          {hasPackaging ? (
            <div className="space-y-2">
              <span className="text-sm font-medium text-secondary-foreground block">
                {MODE_LABELS[mode]}
              </span>
              <div className="space-y-1.5">
                {orderedLevels.map(level => (
                  <div key={level.unitName} className="flex items-center gap-2">
                    <div className="w-20">
                      <Input
                        type="number"
                        value={qtyByLevel[level.unitName] || ''}
                        onValueChange={v => handleLevelChange(level.unitName, v)}
                        placeholder="0"
                        size="sm"
                        fullWidth
                        aria-label={pluralizeUnit(level.unitName, 2)}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {pluralizeUnit(level.unitName, qtyByLevel[level.unitName] ?? 0)}
                    </span>
                    <span className="text-xs text-muted-foreground/50">
                      ({level.quantity}{' '}
                      {pluralizeUnit(
                        level.parentUnit ?? detail?.product.baseItemName ?? 'item',
                        level.quantity
                      )}{' '}
                      each)
                    </span>
                  </div>
                ))}
                {showLooseRow && (
                  <div className="flex items-center gap-2">
                    <div className="w-20">
                      <Input
                        type="number"
                        value={qtyByLevel['__stock__'] || ''}
                        onValueChange={v => handleLevelChange('__stock__', v)}
                        placeholder="0"
                        size="sm"
                        fullWidth
                        aria-label={`Loose ${stockUnitLabel}`}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      loose {pluralizeUnit(stockUnitSingular, qtyByLevel['__stock__'] ?? 0)}
                    </span>
                  </div>
                )}
              </div>
              {computedTotal !== undefined && computedTotal > 0 && (
                <div className="bg-muted rounded-md px-3 py-1.5 text-sm font-medium">
                  Total: {computedTotal} {pluralizeUnit(stockUnitSingular, computedTotal)}
                </div>
              )}
              <input
                type="hidden"
                {...register('quantity', {
                  setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
                })}
              />
            </div>
          ) : (
            <ValidatedInput
              label={quantityLabel}
              type="number"
              required
              placeholder={mode === 'count' ? 'Enter actual count...' : 'Enter quantity...'}
              error={!!errors.quantity}
              helperText={(errors.quantity?.message as string) ?? undefined}
              registration={register('quantity', {
                setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
              })}
            />
          )}

          {mode === 'count' && selectedLocationId && actualCount !== undefined && (
            <div className="text-xs space-y-0.5 px-1">
              <div className="flex justify-between text-muted-foreground">
                <span>Current stock at location:</span>
                <span className="font-medium">
                  {currentStockAtLocation}{' '}
                  {pluralizeUnit(stockUnitSingular, currentStockAtLocation)}
                </span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Adjustment:</span>
                <span
                  className={
                    countDelta !== undefined && countDelta < 0
                      ? 'text-danger-text'
                      : countDelta !== undefined && countDelta > 0
                        ? 'text-success-text'
                        : ''
                  }
                >
                  {countDelta !== undefined
                    ? `${countDelta >= 0 ? '+' : ''}${countDelta} ${pluralizeUnit(stockUnitSingular, Math.abs(countDelta))}`
                    : '—'}
                </span>
              </div>
            </div>
          )}

          <Controller
            name="locationId"
            control={control}
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <Select
                label="Location"
                options={locationOptions}
                value={value ?? ''}
                onChange={v => onChange(v)}
                state={error ? 'error' : 'default'}
                error={error?.message}
                fullWidth
              />
            )}
          />

          {mode === 'received' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <ValidatedInput
                  label="Lot #"
                  placeholder="Lot number"
                  registration={register('lotNumber')}
                />
                <div>
                  <span className="text-sm font-medium text-secondary-foreground block mb-1">
                    Expiration Date
                  </span>
                  <Controller
                    name="expirationDate"
                    control={control}
                    render={({ field: { value, onChange } }) => (
                      <DatePicker
                        value={formatDateForInput(value)}
                        onChange={onChange}
                        clearable
                        fullWidth
                      />
                    )}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <ValidatedInput
                  label="PO #"
                  placeholder="PO number"
                  registration={register('poNumber')}
                />
                <ValidatedInput
                  label="Cost ($)"
                  type="number"
                  step="0.01"
                  placeholder="e.g., 225.00"
                  registration={register('cost', {
                    setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
                  })}
                />
              </div>
            </>
          )}

          <ValidatedInput
            label="Notes"
            type="textarea"
            placeholder={mode === 'count' ? 'e.g., Weekly inventory count' : 'Optional notes'}
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
          form="supply-transaction-form"
          isLoading={isSubmitting}
          loadingText="Recording..."
        >
          {mode === 'received'
            ? 'Receive Stock'
            : mode === 'issued'
              ? 'Record Consumption'
              : mode === 'count'
                ? 'Save Count'
                : 'Record Disposal'}
        </Button>
      </div>
    </div>
  );
}
