/**
 * Bulk Item Row
 *
 * A single item row in a bulk receive/issue form with packaging-aware
 * quantity inputs. Fetches the item's packaging levels and shows multi-level
 * inputs when available, or a single quantity field otherwise.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';

import { X } from 'lucide-react';

import { useSupplyItemDetailQuery } from '@domains/supplies/hooks';
import { Input, Select } from '@shared/ui';
import { FIELD_LABEL_COMPACT } from '@shared/ui/components/inputs/fieldLabelClass';
import { computePackagingMultiplier, orderPackagingChain } from '@shared/utils/packagingChain';
import { pluralizeUnit } from '@shared/utils/pluralizeUnit';

import type { SelectOption } from '@shared/ui/primitives/select/types';

interface BulkItemRowProps {
  rowId: string;
  itemId: string;
  itemName: string;
  locationId: string;
  locationOptions: SelectOption[];
  onLocationChange: (rowId: string, locationId: string) => void;
  onQuantityChange: (rowId: string, quantity: number) => void;
  onRemove: (rowId: string) => void;
  children?: React.ReactNode;
}

export function BulkItemRow({
  rowId,
  itemId,
  itemName,
  locationId,
  locationOptions,
  onLocationChange,
  onQuantityChange,
  onRemove,
  children,
}: BulkItemRowProps) {
  const { data: detail } = useSupplyItemDetailQuery(itemId);
  const packagingLevels = useMemo(() => detail?.packagingLevels ?? [], [detail?.packagingLevels]);
  const hasPackaging = packagingLevels.length > 0;
  const stockUnit = detail?.item.stockUnit ?? '';
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

  // The parent mirrors this total rather than owning it. Reporting on every change — not just on
  // edit — keeps the two in step when the quantity moves without one: on mount, and when a lazily
  // fetched packaging chain arrives and switches the row from a simple quantity to per-level inputs.
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
    <div className="border border-border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-body-sm font-semibold text-card-foreground">{itemName}</span>
        <button
          type="button"
          onClick={() => onRemove(rowId)}
          className="p-1 text-muted-foreground hover:text-danger-text rounded transition-colors"
          aria-label={`Remove ${itemName}`}
        >
          <X size={14} />
        </button>
      </div>

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
                />
              </div>
              <span className="text-caption text-muted-foreground">
                loose {pluralizeUnit(stockUnitSingular, qtyByLevel['__stock__'] ?? 0)}
              </span>
            </div>
          )}
          {computedTotal > 0 && (
            <p className="text-caption font-medium text-muted-foreground px-1">
              = {computedTotal} {pluralizeUnit(stockUnitSingular, computedTotal)}
            </p>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="w-16">
            <span className={FIELD_LABEL_COMPACT}>Qty *</span>
            <Input
              type="number"
              value={String(simpleQty)}
              onValueChange={handleSimpleQtyChange}
              size="sm"
              fullWidth
            />
          </div>
          {stockUnit && (
            <span className="text-caption text-muted-foreground mt-4">
              {pluralizeUnit(stockUnitSingular, simpleQty)}
            </span>
          )}
        </div>
      )}

      <div>
        <span className={FIELD_LABEL_COMPACT}>Location *</span>
        <Select
          options={locationOptions}
          value={locationId}
          onChange={v => onLocationChange(rowId, String(v ?? ''))}
          size="sm"
          fullWidth
        />
      </div>

      {children}
    </div>
  );
}
