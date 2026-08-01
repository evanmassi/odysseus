/**
 * Reagent Transaction Form
 *
 * Tabbed stock operation form. Receiving creates or tops up a lot; issuing and
 * disposing draw from a chosen lot or, by default, the first to expire; counting
 * reconciles one lot. Packaging levels let quantities be entered by the pack.
 */

import { useCallback, useMemo, useState } from 'react';

import { formatQuantity } from '@odysseus/shared-schemas';
import { ClipboardCheck, ClipboardList, PackageMinus, PackagePlus, Trash2 } from 'lucide-react';
import { useForm, Controller, type FieldValues } from 'react-hook-form';

import { useLocationsQuery } from '@domains/lab-management';
import {
  useReagentItemDetailQuery,
  useRecordReagentStockCountMutation,
  useRecordReagentTransactionMutation,
} from '@domains/reagents/hooks';
import { isLotExpired } from '@domains/reagents/utils/reagentExpiry';
import { isLotDrawable } from '@domains/reagents/utils/reagentLots';
import { useUnitOptions } from '@shared/hooks/useUnitOptions';
import {
  AccentTick,
  Button,
  Checkbox,
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
import { formatDateForDisplay, normalizeDateString } from '@shared/utils/dateFormatters';
import { notifications } from '@shared/utils/notifications';
import { computePackagingMultiplier, orderPackagingChain } from '@shared/utils/packagingChain';
import { pluralizeUnit } from '@shared/utils/pluralizeUnit';

import type { ReagentLot } from '@odysseus/shared-schemas';

export type TransactionMode = 'count' | 'received' | 'issued' | 'disposed';

const MODE_LABELS: Record<TransactionMode, string> = {
  count: 'Count',
  received: 'Receive',
  issued: 'Issue',
  disposed: 'Dispose',
};

const SUBMIT_LABELS: Record<TransactionMode, string> = {
  count: 'Save Count',
  received: 'Receive Stock',
  issued: 'Record Issue',
  disposed: 'Record Disposal',
};

const SUCCESS_LABELS: Record<TransactionMode, string> = {
  count: 'Stock count recorded',
  received: 'Stock received',
  issued: 'Stock issued',
  disposed: 'Stock disposed',
};

const AUTO_LOT = '__auto__';

export interface TransactionPrefill {
  locationId?: string;
  quantity?: number;
  lotNumber?: string;
  expirationDate?: string;
  poNumber?: string;
  cost?: number;
  notes?: string;
}

interface ReagentTransactionFormProps {
  itemId: string;
  itemName: string;
  manufacturer?: string;
  catalogNumber?: string;
  initialTab?: TransactionMode;
  prefill?: TransactionPrefill;
  onSubmit: () => void;
  onCancel: () => void;
}

export function ReagentTransactionForm({
  itemId,
  itemName,
  manufacturer,
  catalogNumber,
  initialTab,
  prefill,
  onSubmit,
  onCancel,
}: ReagentTransactionFormProps) {
  const { data: detail } = useReagentItemDetailQuery(itemId);
  const { data: locations = [] } = useLocationsQuery();
  const unitOptions = useUnitOptions();
  const recordTransactionMutation = useRecordReagentTransactionMutation();
  const recordStockCountMutation = useRecordReagentStockCountMutation();

  const stockUnit = detail?.item.stockUnit ?? '';
  const stockUnitSingular = stockUnit || 'unit';
  const packagingLevels = useMemo(() => detail?.packagingLevels ?? [], [detail?.packagingLevels]);
  const hasPackaging = packagingLevels.length > 0;
  const identityParts = [manufacturer, catalogNumber].filter(Boolean);

  const locationOptions = useMemo(
    () =>
      withPlaceholder(
        'Select location...',
        locations.map(l => ({ value: l.id, label: l.name }))
      ),
    [locations]
  );

  const [qtyByLevel, setQtyByLevel] = useState<Record<string, number>>({});
  const orderedLevels = useMemo(() => orderPackagingChain(packagingLevels), [packagingLevels]);
  // A level named after the stock unit already is the loose row; a second input would
  // share its key and overwrite it.
  const showLooseRow = packagingLevels.every(level => level.unitName !== stockUnitSingular);

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
      type: (initialTab ?? 'received') as string,
      locationId: prefill?.locationId ?? '',
      quantity: prefill?.quantity,
      lotId: initialTab === 'count' ? '' : AUTO_LOT,
      lotNumber: prefill?.lotNumber ?? '',
      expirationDate: prefill?.expirationDate ?? '',
      receivedDate: '',
      concentration: '',
      concentrationUnit: '',
      poNumber: prefill?.poNumber ?? '',
      cost: prefill?.cost,
      includeExpired: false,
      notes: prefill?.notes ?? '',
    },
  });

  const mode = watch('type') as TransactionMode;
  const locationId = watch('locationId');
  const selectedLotId = watch('lotId');
  const quantity = watch('quantity');

  // Draws are scoped to one location, so only lots stocked there can be targeted.
  const lotsAtLocation = useMemo(
    () => (detail?.lots ?? []).filter(lot => isLotDrawable(lot) && lot.locationId === locationId),
    [detail?.lots, locationId]
  );

  const describeLot = useCallback(
    (lot: ReagentLot) => {
      const amount = stockUnit ? formatQuantity(lot.quantity, stockUnit) : String(lot.quantity);
      const expiry = lot.expirationDate
        ? ` · ${isLotExpired(lot.expirationDate) ? 'EXPIRED' : `exp ${formatDateForDisplay(lot.expirationDate)}`}`
        : '';
      return `${lot.lotNumber ?? 'No lot #'} · ${amount}${expiry}`;
    },
    [stockUnit]
  );

  // FEFO order for display only — the server plans the actual draw.
  const lotsByExpiry = useMemo(
    () =>
      [...lotsAtLocation].sort((a, b) => {
        const [aExpired, bExpired] = [
          isLotExpired(a.expirationDate),
          isLotExpired(b.expirationDate),
        ];
        if (aExpired !== bExpired) return aExpired ? 1 : -1;
        if (a.expirationDate === b.expirationDate) return 0;
        if (!a.expirationDate) return 1;
        if (!b.expirationDate) return -1;
        return a.expirationDate < b.expirationDate ? -1 : 1;
      }),
    [lotsAtLocation]
  );

  const isDraw = mode === 'issued' || mode === 'disposed';
  const selectedLot = lotsByExpiry.find(lot => lot.id === selectedLotId);
  const nextLot = lotsByExpiry[0];

  // The server refuses expired stock unless acknowledged: either the chosen lot is
  // expired, or every lot the auto draw could reach is.
  const needsExpiredAck =
    isDraw &&
    lotsByExpiry.length > 0 &&
    (selectedLot
      ? isLotExpired(selectedLot.expirationDate)
      : lotsByExpiry.every(lot => isLotExpired(lot.expirationDate)));

  const countLotOptions = useMemo(
    () =>
      withPlaceholder(
        'Select lot...',
        lotsByExpiry.map(lot => ({ value: lot.id, label: describeLot(lot) }))
      ),
    [lotsByExpiry, describeLot]
  );

  const drawLotOptions = useMemo(
    () => [
      { value: AUTO_LOT, label: 'Auto — first to expire' },
      ...lotsByExpiry.map(lot => ({ value: lot.id, label: describeLot(lot) })),
    ],
    [lotsByExpiry, describeLot]
  );

  const countLot = mode === 'count' ? selectedLot : undefined;
  const countDelta =
    countLot && typeof quantity === 'number' ? quantity - countLot.quantity : undefined;

  const handleLevelChange = useCallback(
    (unitName: string, value: string) => {
      const next = { ...qtyByLevel, [unitName]: value === '' ? 0 : Number(value) };
      setQtyByLevel(next);
      const total = Object.entries(next).reduce(
        (sum, [unit, qty]) =>
          sum +
          qty *
            (unit === stockUnitSingular
              ? 1
              : computePackagingMultiplier(packagingLevels, unit, stockUnit)),
        0
      );
      setValue('quantity', total > 0 ? total : undefined);
    },
    [qtyByLevel, packagingLevels, stockUnit, stockUnitSingular, setValue]
  );

  const handleModeChange = (next: string) => {
    setQtyByLevel({});
    reset({
      type: next,
      locationId: '',
      quantity: undefined,
      lotId: next === 'count' ? '' : AUTO_LOT,
      lotNumber: '',
      expirationDate: '',
      receivedDate: '',
      concentration: '',
      concentrationUnit: '',
      poNumber: '',
      cost: undefined,
      includeExpired: false,
      notes: '',
    });
  };

  // Counting zero is a real measurement; moving zero stock is not.
  const validateQuantity = (value: unknown) => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return mode === 'count' ? 'Count is required' : 'Quantity is required';
    }
    if (mode === 'count') return value >= 0 || 'Count cannot be negative';
    return value > 0 || 'Quantity must be greater than 0';
  };

  const onFormSubmit = (data: FieldValues) => {
    const onSuccess = (transactions: unknown[]) => {
      const drewAcross =
        isDraw && transactions.length > 1 ? ` across ${transactions.length} lots` : '';
      notifications.success(`${SUCCESS_LABELS[mode]}${drewAcross}`);
      onSubmit();
    };

    if (mode === 'count') {
      recordStockCountMutation.mutate(
        {
          itemId,
          locationId: data['locationId'] as string,
          lotId: data['lotId'] as string,
          actualCount: data['quantity'] as number,
          notes: (data['notes'] as string) || undefined,
        },
        { onSuccess }
      );
      return;
    }

    const lotId = data['lotId'] as string;
    recordTransactionMutation.mutate(
      {
        itemId,
        locationId: data['locationId'] as string,
        type: mode,
        quantity: data['quantity'] as number,
        lotId: isDraw && lotId !== AUTO_LOT ? lotId : undefined,
        includeExpired: isDraw ? (data['includeExpired'] as boolean) : undefined,
        lotNumber: mode === 'received' ? (data['lotNumber'] as string) || undefined : undefined,
        expirationDate:
          mode === 'received' ? (data['expirationDate'] as string) || undefined : undefined,
        receivedDate:
          mode === 'received' ? (data['receivedDate'] as string) || undefined : undefined,
        // Concentration crosses the wire as typed — the server's preprocessor parses
        // scientific and caret notation, so the request type's `number` is its output.
        concentration:
          mode === 'received'
            ? (((data['concentration'] as string) || undefined) as unknown as number | undefined)
            : undefined,
        concentrationUnit:
          mode === 'received' ? (data['concentrationUnit'] as string) || undefined : undefined,
        poNumber: mode === 'received' ? (data['poNumber'] as string) || undefined : undefined,
        cost: mode === 'received' ? (data['cost'] as number | undefined) : undefined,
        notes: (data['notes'] as string) || undefined,
      },
      { onSuccess }
    );
  };

  const quantityLabel = `${mode === 'count' ? 'Actual Count' : 'Quantity'}${
    stockUnit ? ` (${pluralizeUnit(stockUnitSingular, 2)})` : ''
  }`;

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
          size="sm"
          className="!gap-0 !px-0 [&_button]:!px-2.5 [&_button]:flex-1 [&_button]:justify-center"
        >
          <Tab id="count" icon={<ClipboardCheck size={12} />}>
            {MODE_LABELS.count}
          </Tab>
          <Tab id="received" icon={<PackagePlus size={12} />}>
            {MODE_LABELS.received}
          </Tab>
          <Tab id="issued" icon={<PackageMinus size={12} />}>
            {MODE_LABELS.issued}
          </Tab>
          <Tab id="disposed" icon={<Trash2 size={12} />}>
            {MODE_LABELS.disposed}
          </Tab>
        </Tabs>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <form
          id="reagent-transaction-form"
          onSubmit={handleSubmit(onFormSubmit)}
          className="space-y-3 p-4"
        >
          <input type="hidden" {...register('type')} />

          <Controller
            name="locationId"
            control={control}
            rules={{ required: 'Location is required' }}
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <div>
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Select is a custom component without native input */}
                <label id="reagent-txn-location-label" className={FIELD_LABEL_COMPACT}>
                  Location
                </label>
                <Select
                  aria-labelledby="reagent-txn-location-label"
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

          {mode === 'count' && (
            <Controller
              name="lotId"
              control={control}
              rules={{ required: 'Lot is required' }}
              render={({ field: { value, onChange }, fieldState: { error } }) => (
                <div>
                  {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Select is a custom component without native input */}
                  <label id="reagent-count-lot-label" className={FIELD_LABEL_COMPACT}>
                    Lot
                  </label>
                  <Select
                    aria-labelledby="reagent-count-lot-label"
                    options={countLotOptions}
                    value={value ?? ''}
                    onChange={v => onChange(v)}
                    state={error ? 'error' : 'default'}
                    error={error?.message}
                    disabled={!locationId}
                    fullWidth
                  />
                  {locationId && lotsByExpiry.length === 0 && (
                    <p className="mt-1 text-caption text-muted-foreground">
                      No stocked lots here — receive stock before counting it.
                    </p>
                  )}
                </div>
              )}
            />
          )}

          {isDraw && (
            <Controller
              name="lotId"
              control={control}
              render={({ field: { value, onChange } }) => (
                <div>
                  {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Select is a custom component without native input */}
                  <label id="reagent-draw-lot-label" className={FIELD_LABEL_COMPACT}>
                    Lot
                  </label>
                  <Select
                    aria-labelledby="reagent-draw-lot-label"
                    options={drawLotOptions}
                    value={value ?? AUTO_LOT}
                    onChange={v => onChange(v)}
                    disabled={!locationId}
                    fullWidth
                  />
                  {locationId && value === AUTO_LOT && nextLot && (
                    <p className="mt-1 text-caption text-muted-foreground">
                      Starts from {nextLot.lotNumber ?? 'the undated lot'}
                      {nextLot.expirationDate ? `, expiring ${nextLot.expirationDate}` : ''}.
                    </p>
                  )}
                </div>
              )}
            />
          )}

          {hasPackaging && mode !== 'count' ? (
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
                      {pluralizeUnit(level.parentUnit ?? stockUnitSingular, level.quantity)} each)
                    </span>
                  </div>
                ))}
                {showLooseRow && (
                  <div className="flex items-center gap-2">
                    <div className="w-20">
                      <Input
                        type="number"
                        value={qtyByLevel[stockUnitSingular] || ''}
                        onValueChange={v => handleLevelChange(stockUnitSingular, v)}
                        placeholder="0"
                        size="sm"
                        fullWidth
                        aria-label={`Loose ${pluralizeUnit(stockUnitSingular, 2)}`}
                      />
                    </div>
                    <span className="text-body-sm text-muted-foreground">
                      loose {pluralizeUnit(stockUnitSingular, qtyByLevel[stockUnitSingular] ?? 0)}
                    </span>
                  </div>
                )}
              </div>
              {typeof quantity === 'number' && quantity > 0 && (
                <div className="border border-line-faint bg-shade/20 px-3 py-1.5 text-body-sm font-medium">
                  Total: {stockUnit ? formatQuantity(quantity, stockUnit) : quantity}
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

          {countDelta !== undefined && countLot && (
            <div className="space-y-0.5 px-1 text-caption">
              <div className="flex justify-between text-muted-foreground">
                <span>Recorded for this lot:</span>
                <span className="font-medium">
                  {stockUnit ? formatQuantity(countLot.quantity, stockUnit) : countLot.quantity}
                </span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Adjustment:</span>
                <span
                  className={
                    countDelta < 0 ? 'text-danger-text' : countDelta > 0 ? 'text-success-text' : ''
                  }
                >
                  {countDelta >= 0 ? '+' : ''}
                  {stockUnit ? formatQuantity(countDelta, stockUnit) : countDelta}
                </span>
              </div>
            </div>
          )}

          {needsExpiredAck && (
            <Controller
              name="includeExpired"
              control={control}
              render={({ field: { value, onChange } }) => (
                <label
                  htmlFor="reagent-include-expired"
                  className="flex cursor-pointer items-center gap-2 border border-warning-border bg-warning-bg/[0.08] px-3 py-2 text-body-sm text-warning-text"
                >
                  <Checkbox id="reagent-include-expired" checked={!!value} onChange={onChange} />
                  Use expired stock — I accept the risk
                </label>
              )}
            />
          )}

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
                <div>
                  <span className={FIELD_LABEL_COMPACT}>Received Date</span>
                  <Controller
                    name="receivedDate"
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
                <ValidatedInput
                  label="PO #"
                  labelStyle="compact"
                  placeholder="PO number"
                  registration={register('poNumber')}
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5 [&>*]:min-w-0">
                <ValidatedInput
                  label="Lot Concentration"
                  labelStyle="compact"
                  placeholder="Overrides the item's"
                  registration={register('concentration')}
                />
                <Controller
                  name="concentrationUnit"
                  control={control}
                  render={({ field: { value, onChange } }) => (
                    <div>
                      {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Select is a custom component without native input */}
                      <label id="reagent-txn-conc-unit-label" className={FIELD_LABEL_COMPACT}>
                        Concentration Unit
                      </label>
                      <Select
                        aria-labelledby="reagent-txn-conc-unit-label"
                        options={unitOptions.concentration}
                        value={value ?? ''}
                        onChange={v => onChange(v)}
                        fullWidth
                      />
                    </div>
                  )}
                />
              </div>
              <ValidatedInput
                label="Cost ($)"
                labelStyle="compact"
                type="number"
                step="0.01"
                placeholder="e.g., 285.00"
                registration={register('cost', {
                  setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
                })}
              />
            </>
          )}

          <ValidatedInput
            label="Notes"
            labelStyle="compact"
            type="textarea"
            placeholder={mode === 'count' ? 'e.g., Monthly freezer audit' : 'Optional notes'}
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
            form="reagent-transaction-form"
            variant="primary"
            size="sm"
            isLoading={recordTransactionMutation.isPending || recordStockCountMutation.isPending}
            loadingText="Recording..."
          >
            {SUBMIT_LABELS[mode]}
          </Button>
        </div>
      </div>
    </ConsolePanel>
  );
}
