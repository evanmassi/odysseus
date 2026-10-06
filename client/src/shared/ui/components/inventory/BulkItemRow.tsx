import { useState, useMemo, useCallback, useEffect } from 'react';

import { pluralizeUnit } from '@odysseus/shared-schemas';
import { X } from 'lucide-react';

import { AccentTick, Input, Select } from '@shared/ui';
import { FIELD_LABEL_COMPACT } from '@shared/ui/components/inputs/fieldLabelClass';
import { computePackagingMultiplier, orderPackagingChain } from '@shared/utils/packagingChain';

import type { SelectOption } from '@shared/ui/primitives/select/types';

export interface ItemPackaging {
  packagingLevels: { unitName: string; quantity: number; parentUnit: string | null }[];
  stockUnit: string;
}

interface BulkItemRowProps {
  rowId: string;
  itemId: string;
  itemName: string;
  secondaryText?: string;
  locationId: string;
  locationOptions: SelectOption[];
  onLocationChange: (rowId: string, locationId: string) => void;
  onQuantityChange: (rowId: string, quantity: number) => void;
  onRemove: (rowId: string) => void;
  useItemPackaging: (itemId: string) => ItemPackaging;
  children?: React.ReactNode;
}

export function BulkItemRow({
  rowId,
  itemId,
  itemName,
  secondaryText,
  locationId,
  locationOptions,
  onLocationChange,
  onQuantityChange,
  onRemove,
  useItemPackaging,
  children,
}: BulkItemRowProps) {
  const { packagingLevels, stockUnit } = useItemPackaging(itemId);
  const hasPackaging = packagingLevels.length > 0;
  const stockUnitSingular = stockUnit || 'unit';

  const [qtyByLevel, setQtyByLevel] = useState<Record<string, number>>({});
  const [simpleQty, setSimpleQty] = useState(1);

  const computeMultiplier = useCallback(
    (fromUnit: string) => computePackagingMultiplier(packagingLevels, fromUnit, stockUnit),
    [stockUnit, packagingLevels]
  );

  const orderedLevels = useMemo(() => orderPackagingChain(packagingLevels), [packagingLevels]);

  const showLooseRow = hasPackaging && !packagingLevels.some(l => l.unitName === stockUnit);

  const computedTotal = useMemo(() => {
    if (!hasPackaging) return simpleQty;
    let total = qtyByLevel['__stock__'] ?? 0;
    for (const level of packagingLevels) {
      const qty = qtyByLevel[level.unitName] ?? 0;
      if (qty > 0) total += qty * computeMultiplier(level.unitName);
    }
    return total;
  }, [hasPackaging, simpleQty, qtyByLevel, packagingLevels, computeMultiplier]);

  // PITFALL: the total is reported on every change, not just on edit, so the parent stays in step on mount and when a lazily fetched packaging chain swaps the inputs.
  useEffect(() => {
    onQuantityChange(rowId, computedTotal);
  }, [rowId, computedTotal, onQuantityChange]);

  const handleLevelChange = useCallback((key: string, value: string) => {
    setQtyByLevel(prev => ({ ...prev, [key]: value === '' ? 0 : Number(value) }));
  }, []);

  const handleSimpleQtyChange = useCallback((value: string) => {
    setSimpleQty(parseInt(value) || 0);
  }, []);

  return (
    <div className="row-tools-host border border-line-mid">
      <div className="flex items-center gap-2 border-b border-line-faint py-2 pl-3 pr-1.5">
        <AccentTick />
        <span className="truncate text-body-sm font-semibold text-foreground">{itemName}</span>
        {secondaryText && (
          <span className="truncate font-mono text-data-sm tracking-[0.04em] text-muted-foreground">
            {secondaryText}
          </span>
        )}
        <span className="row-tools ml-auto">
          <span>
            <button
              type="button"
              onClick={() => onRemove(rowId)}
              className="p-1 text-muted-foreground transition-colors hover:text-danger-text"
              aria-label={`Remove ${itemName}`}
            >
              <X size={14} />
            </button>
          </span>
        </span>
      </div>

      <div className="space-y-3 p-3">
        <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
          <div>
            <span className={FIELD_LABEL_COMPACT}>Quantity</span>
            {hasPackaging ? (
              <div className="space-y-1">
                {orderedLevels.map(level => (
                  <div key={level.unitName} className="flex items-center gap-2">
                    <div className="w-16">
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
                    <span className="text-caption text-muted-foreground">
                      {pluralizeUnit(level.unitName, qtyByLevel[level.unitName] ?? 0)}
                    </span>
                  </div>
                ))}
                {showLooseRow && (
                  <div className="flex items-center gap-2">
                    <div className="w-16">
                      <Input
                        type="number"
                        value={qtyByLevel['__stock__'] || ''}
                        onValueChange={v => handleLevelChange('__stock__', v)}
                        placeholder="0"
                        size="sm"
                        fullWidth
                        aria-label={`Loose ${pluralizeUnit(stockUnitSingular, 2)}`}
                      />
                    </div>
                    <span className="text-caption text-muted-foreground">
                      loose {pluralizeUnit(stockUnitSingular, qtyByLevel['__stock__'] ?? 0)}
                    </span>
                  </div>
                )}
                {computedTotal > 0 && (
                  <p className="font-mono text-data-sm text-muted-foreground">
                    = {computedTotal} {pluralizeUnit(stockUnitSingular, computedTotal)}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-16">
                  <Input
                    type="number"
                    value={String(simpleQty)}
                    onValueChange={handleSimpleQtyChange}
                    size="sm"
                    fullWidth
                    aria-label="Quantity"
                  />
                </div>
                {stockUnit && (
                  <span className="text-caption text-muted-foreground">
                    {pluralizeUnit(stockUnitSingular, simpleQty)}
                  </span>
                )}
              </div>
            )}
          </div>

          <div>
            <span className={FIELD_LABEL_COMPACT}>Location</span>
            <Select
              options={locationOptions}
              value={locationId}
              onChange={v => onLocationChange(rowId, String(v ?? ''))}
              size="sm"
              fullWidth
              aria-label="Location"
            />
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
