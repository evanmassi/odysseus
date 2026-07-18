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

import { useSupplyItemDetailQuery, useSupplyLocationsQuery } from '@domains/supplies/hooks';
import {
  useRecordSupplyTransactionMutation,
  useRecordSupplyStockCountMutation,
} from '@domains/supplies/hooks/useSupplyMutations';
import {
  computePackagingMultiplier,
  orderPackagingChain,
} from '@domains/supplies/utils/packagingChain';
import {
  AccentTick,
  Button,
  DatePicker,
  HeaderStrip,
  Input,
  NubDivider,
  Select,
  Tab,
  Tabs,
  withPlaceholder,
} from '@shared/ui';
import { FIELD_LABEL_COMPACT } from '@shared/ui/components/inputs/fieldLabelClass';
import { ValidatedInput } from '@shared/ui/components/inputs/ValidatedInput';
import { ConsolePanel } from '@shared/ui/primitives/console-panel/ConsolePanel';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { normalizeDateString } from '@shared/utils/dateFormatters';
import { notifications } from '@shared/utils/notifications';
import { pluralizeUnit } from '@shared/utils/pluralizeUnit';

export type TransactionMode = 'received' | 'issued' | 'count' | 'disposed';

const MODE_LABELS: Record<TransactionMode, string> = {
  received: 'Receive',
  issued: 'Issue',
  count: 'Count',
  disposed: 'Dispose',
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
  itemId: string;
  itemName: string;
  manufacturer?: string;
  catalogNumber?: string;
  initialTab?: TransactionMode;
  prefill?: TransactionPrefill;
  onSubmit: () => void;
  onCancel: () => void;
}

export function SupplyTransactionForm({
  itemId,
  itemName,
  manufacturer,
  catalogNumber,
  initialTab,
  prefill,
  onSubmit,
  onCancel,
}: SupplyTransactionFormProps) {
  const { data: detail } = useSupplyItemDetailQuery(itemId);
  const { data: locations = [] } = useSupplyLocationsQuery();
  const recordTransactionMutation = useRecordSupplyTransactionMutation();
  const recordStockCountMutation = useRecordSupplyStockCountMutation();

  const locationOptions = useMemo(
    () =>
      withPlaceholder(
        'Select location...',
        locations.map(l => ({ value: l.id, label: l.name }))
      ),
    [locations]
  );

  const packagingLevels = useMemo(() => detail?.packagingLevels ?? [], [detail?.packagingLevels]);
  const hasPackaging = packagingLevels.length > 0;
  const stockUnit = detail?.item.stockUnit ?? '';
  const stockUnitSingular = stockUnit || 'unit';
  const stockUnitLabel = pluralizeUnit(stockUnitSingular, 2);

  const identityParts = [manufacturer, catalogNumber].filter(Boolean);

  const computeMultiplier = useCallback(
    (fromUnit: string) => computePackagingMultiplier(packagingLevels, fromUnit, stockUnit),
    [stockUnit, packagingLevels]
  );

  const orderedLevels = useMemo(() => orderPackagingChain(packagingLevels), [packagingLevels]);

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
    formState: { errors },
  } = useForm({
    defaultValues: {
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

  // A count of zero is a real measurement; receiving, issuing, or disposing of zero is not.
  const validateQuantity = (value: unknown) => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return mode === 'count' ? 'Count is required' : 'Quantity is required';
    }
    if (mode === 'count') return value >= 0 || 'Count cannot be negative';
    return value > 0 || 'Quantity must be greater than 0';
  };

  const onFormSubmit = (data: FieldValues) => {
    const quantity = data['quantity'] as number;

    const onSuccess = () => {
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
    };

    if (mode === 'count') {
      recordStockCountMutation.mutate(
        {
          itemId,
          locationId: data['locationId'] as string,
          actualCount: quantity,
          lotNumber: (data['lotNumber'] as string) || undefined,
          expirationDate: (data['expirationDate'] as string) || undefined,
          notes: (data['notes'] as string) || undefined,
        },
        { onSuccess }
      );
    } else {
      recordTransactionMutation.mutate(
        {
          itemId,
          locationId: data['locationId'] as string,
          type: data['type'] as 'received' | 'issued' | 'disposed',
          quantity,
          lotNumber: (data['lotNumber'] as string) || undefined,
          expirationDate: (data['expirationDate'] as string) || undefined,
          poNumber: (data['poNumber'] as string) || undefined,
          cost: data['cost'] as number | undefined,
          notes: (data['notes'] as string) || undefined,
        },
        { onSuccess }
      );
    }
  };

  const handleModeChange = (newMode: string) => {
    setQtyByLevel({});
    reset({
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
    <ConsolePanel intensity="soft" className="flex h-full min-h-0 flex-col">
      <div className="flex flex-shrink-0 items-center gap-3 border-b border-line-faint px-4 py-3">
        <span className="p-1.5 text-muted-foreground">
          <ClipboardList size={20} />
        </span>
        <h2 className="text-lg font-medium text-foreground">Record Transaction</h2>
      </div>

      <HeaderStrip className="px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <AccentTick />
          <span className="truncate font-display text-body-sm text-foreground">{itemName}</span>
          {identityParts.length > 0 && (
            <span className="truncate font-mono text-data-sm tracking-[0.04em] text-muted-foreground">
              {identityParts.map((part, i) => (
                <span key={i}>
                  {i > 0 && <span className="mx-1.5 text-foreground/30">{'//'}</span>}
                  {part}
                </span>
              ))}
            </span>
          )}
        </div>
      </HeaderStrip>

      <div className="flex-shrink-0 border-b border-line-faint px-4">
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

      <ScrollArea className="min-h-0 flex-1">
        <form
          id="supply-transaction-form"
          onSubmit={handleSubmit(onFormSubmit)}
          className="space-y-3 p-4"
        >
          <input type="hidden" {...register('type')} />

          {hasPackaging ? (
            <div className="space-y-2">
              <span className={FIELD_LABEL_COMPACT}>{MODE_LABELS[mode]}</span>
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
                    <span className="text-body-sm text-muted-foreground">
                      {pluralizeUnit(level.unitName, qtyByLevel[level.unitName] ?? 0)}
                    </span>
                    <span className="text-caption text-muted-foreground/50">
                      ({level.quantity}{' '}
                      {pluralizeUnit(
                        level.parentUnit ?? detail?.item.baseItemName ?? 'item',
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
                    <span className="text-body-sm text-muted-foreground">
                      loose {pluralizeUnit(stockUnitSingular, qtyByLevel['__stock__'] ?? 0)}
                    </span>
                  </div>
                )}
              </div>
              {computedTotal !== undefined && computedTotal > 0 && (
                <div className="border border-line-faint bg-shade/20 px-3 py-1.5 text-body-sm font-medium">
                  Total: {computedTotal} {pluralizeUnit(stockUnitSingular, computedTotal)}
                </div>
              )}
              <input
                type="hidden"
                {...register('quantity', {
                  setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
                  validate: validateQuantity,
                })}
              />
              {errors.quantity && (
                <p className="text-caption text-danger-text">{errors.quantity.message as string}</p>
              )}
            </div>
          ) : (
            <ValidatedInput
              label={quantityLabel}
              labelStyle="compact"
              type="number"
              required
              placeholder={mode === 'count' ? 'Enter actual count...' : 'Enter quantity...'}
              error={!!errors.quantity}
              helperText={(errors.quantity?.message as string) ?? undefined}
              registration={register('quantity', {
                setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
                validate: validateQuantity,
              })}
            />
          )}

          {mode === 'count' && selectedLocationId && actualCount !== undefined && (
            <div className="space-y-0.5 px-1 text-caption">
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
            rules={{ required: 'Location is required' }}
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <div>
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Select is a custom component without native input */}
                <label id="txn-location-label" className={FIELD_LABEL_COMPACT}>
                  Location
                </label>
                <Select
                  aria-labelledby="txn-location-label"
                  options={locationOptions}
                  value={value ?? ''}
                  onChange={v => onChange(v)}
                  state={error ? 'error' : 'default'}
                  error={error?.message}
                  fullWidth
                />
              </div>
            )}
          />

          {mode === 'received' && (
            <>
              <div className="grid grid-cols-2 gap-2.5 [&>*]:min-w-0">
                <ValidatedInput
                  label="Lot #"
                  labelStyle="compact"
                  placeholder="Lot number"
                  registration={register('lotNumber')}
                />
                <div>
                  <span className={FIELD_LABEL_COMPACT}>Expiration Date</span>
                  <Controller
                    name="expirationDate"
                    control={control}
                    render={({ field: { value, onChange } }) => (
                      <DatePicker
                        value={normalizeDateString(value)}
                        onChange={onChange}
                        clearable
                        fullWidth
                      />
                    )}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5 [&>*]:min-w-0">
                <ValidatedInput
                  label="PO #"
                  labelStyle="compact"
                  placeholder="PO number"
                  registration={register('poNumber')}
                />
                <ValidatedInput
                  label="Cost ($)"
                  labelStyle="compact"
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
            labelStyle="compact"
            type="textarea"
            placeholder={mode === 'count' ? 'e.g., Weekly inventory count' : 'Optional notes'}
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
            form="supply-transaction-form"
            variant="primary"
            size="sm"
            isLoading={recordStockCountMutation.isPending || recordTransactionMutation.isPending}
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
    </ConsolePanel>
  );
}
