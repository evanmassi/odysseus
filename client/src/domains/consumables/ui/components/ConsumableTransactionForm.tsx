/**
 * Consumable Transaction Form
 *
 * Tabbed stock operation form for receiving, consuming, counting, and disposing
 * consumable inventory. Optimized for speed with auto-focused quantity field.
 */

import { useMemo, useState } from 'react';

import { PackagePlus, PackageMinus, ClipboardCheck, Trash2 } from 'lucide-react';
import { useForm, Controller, type FieldValues } from 'react-hook-form';

import {
  useConsumableProductDetailQuery,
  useConsumableLocationsQuery,
} from '@domains/consumables/hooks';
import {
  useRecordConsumableTransactionMutation,
  useRecordConsumableStockCountMutation,
} from '@domains/consumables/hooks/useConsumableMutations';
import { Button, Select, DatePicker, Tabs, Tab } from '@shared/ui';
import { ValidatedInput } from '@shared/ui/components/inputs/ValidatedInput';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { formatDateForInput } from '@shared/utils/dateFormatters';
import { notifications } from '@shared/utils/notifications';

import type { SelectOption } from '@shared/ui/primitives/select/types';

type TransactionMode = 'received' | 'consumed' | 'count' | 'disposed';

interface ConsumableTransactionFormProps {
  productId: string;
  productName: string;
  onSubmit: () => void;
  onCancel: () => void;
}

export function ConsumableTransactionForm({
  productId,
  productName,
  onSubmit,
  onCancel,
}: ConsumableTransactionFormProps) {
  const { data: detail } = useConsumableProductDetailQuery(productId);
  const { data: locations = [] } = useConsumableLocationsQuery();
  const recordTransactionMutation = useRecordConsumableTransactionMutation();
  const recordStockCountMutation = useRecordConsumableStockCountMutation();

  const locationOptions: SelectOption[] = useMemo(
    () => [
      { value: '', label: 'Select location...' },
      ...locations.map(l => ({ value: l.id, label: l.name })),
    ],
    [locations]
  );

  const [receivingUnit, setReceivingUnit] = useState('');

  const unitConversions = useMemo(() => detail?.unitConversions ?? [], [detail?.unitConversions]);
  const hasConversions = unitConversions.length > 0;
  const selectedConversion = unitConversions.find(c => c.unitName === receivingUnit);
  const stockUnit = detail?.product.stockUnit ?? '';

  const unitOptions: SelectOption[] = useMemo(() => {
    if (!hasConversions) return [];
    return [
      { value: '', label: stockUnit || 'stock unit' },
      ...unitConversions.map(c => ({ value: c.unitName, label: c.unitName })),
    ];
  }, [hasConversions, stockUnit, unitConversions]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      productId,
      locationId: '',
      type: 'received' as string,
      quantity: undefined as number | undefined,
      lotNumber: '',
      expirationDate: '',
      poNumber: '',
      cost: undefined as number | undefined,
      notes: '',
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
          actualCount: data['quantity'] as number,
          lotNumber: (data['lotNumber'] as string) || undefined,
          expirationDate: (data['expirationDate'] as string) || undefined,
          notes: (data['notes'] as string) || undefined,
        });
      } else {
        await recordTransactionMutation.mutateAsync({
          productId,
          locationId: data['locationId'] as string,
          type: data['type'] as 'received' | 'consumed' | 'disposed',
          quantity: data['quantity'] as number,
          lotNumber: (data['lotNumber'] as string) || undefined,
          expirationDate: (data['expirationDate'] as string) || undefined,
          poNumber: (data['poNumber'] as string) || undefined,
          cost: data['cost'] as number | undefined,
          notes: (data['notes'] as string) || undefined,
          receivingUnit: receivingUnit || undefined,
        });
      }
      notifications.success(
        mode === 'received'
          ? 'Stock received'
          : mode === 'consumed'
            ? 'Stock consumed'
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
    setReceivingUnit('');
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

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 pt-4 pb-2 flex-shrink-0">
        <h3 className="text-sm font-semibold text-secondary-foreground mb-1">Record Transaction</h3>
        <p className="text-xs text-muted-foreground truncate">{productName}</p>
      </div>

      <div className="px-4 pb-2 flex-shrink-0">
        <Tabs value={mode} onChange={handleModeChange}>
          <Tab id="received" icon={<PackagePlus size={14} />}>
            Receive
          </Tab>
          <Tab id="consumed" icon={<PackageMinus size={14} />}>
            Consume
          </Tab>
          <Tab id="count" icon={<ClipboardCheck size={14} />}>
            Count
          </Tab>
          <Tab id="disposed" icon={<Trash2 size={14} />}>
            Dispose
          </Tab>
        </Tabs>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <form
          id="consumable-transaction-form"
          onSubmit={handleSubmit(onFormSubmit)}
          className="px-4 pb-4 space-y-3"
        >
          <input type="hidden" {...register('productId')} />
          <input type="hidden" {...register('type')} />

          <ValidatedInput
            label={mode === 'count' ? 'Actual Count' : 'Quantity'}
            type="number"
            required
            placeholder={mode === 'count' ? 'Enter actual count...' : 'Enter quantity...'}
            error={!!errors.quantity}
            helperText={(errors.quantity?.message as string) ?? undefined}
            registration={register('quantity', { valueAsNumber: true })}
          />

          {mode === 'received' && hasConversions && (
            <div>
              <Select
                label="Receiving Unit"
                options={unitOptions}
                value={receivingUnit}
                onChange={v => setReceivingUnit(String(v ?? ''))}
                size="sm"
                fullWidth
              />
              {receivingUnit && selectedConversion && (
                <p className="text-xs text-muted-foreground mt-1 px-1">
                  = {(watch('quantity') as number || 0) * selectedConversion.multiplier} {stockUnit}{((watch('quantity') as number || 0) * selectedConversion.multiplier) !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}

          {mode === 'count' && selectedLocationId && actualCount !== undefined && (
            <div className="text-xs space-y-0.5 px-1">
              <div className="flex justify-between text-muted-foreground">
                <span>Current stock at location:</span>
                <span className="font-medium">{currentStockAtLocation}</span>
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
                    ? countDelta >= 0
                      ? `+${countDelta}`
                      : countDelta
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
              <ValidatedInput
                label="Lot #"
                placeholder="Manufacturer lot number"
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
              <ValidatedInput
                label="PO #"
                placeholder="Purchase order number"
                registration={register('poNumber')}
              />
              <ValidatedInput
                label="Cost ($)"
                type="number"
                step="0.01"
                placeholder="e.g., 225.00"
                registration={register('cost', { valueAsNumber: true })}
              />
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
          form="consumable-transaction-form"
          isLoading={isSubmitting}
          loadingText="Recording..."
        >
          {mode === 'received'
            ? 'Receive Stock'
            : mode === 'consumed'
              ? 'Record Consumption'
              : mode === 'count'
                ? 'Save Count'
                : 'Record Disposal'}
        </Button>
      </div>
    </div>
  );
}
