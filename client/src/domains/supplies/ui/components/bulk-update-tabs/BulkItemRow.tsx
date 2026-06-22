/**
 * Bulk Item Row
 *
 * A single item row in a bulk receive/issue form with packaging-aware
 * quantity inputs. Fetches the item's packaging levels and shows multi-level
 * inputs when available, or a single quantity field otherwise.
 */

import { useState, useMemo, useCallback } from 'react';

import { X } from 'lucide-react';

import { useSupplyItemDetailQuery } from '@domains/supplies/hooks';
import { Input, Select } from '@shared/ui';
import { pluralizeUnit } from '@shared/utils/pluralizeUnit';

import { SELECT_LABEL } from './fieldLabelStyle';

import type { SelectOption } from '@shared/ui/primitives/select/types';

interface BulkItemRowProps {
  itemId: string;
  itemName: string;
  locationId: string;
  locationOptions: SelectOption[];
  onLocationChange: (locationId: string) => void;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
  children?: React.ReactNode;
}

export function BulkItemRow({
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
    const ordered: typeof packagingLevels = [];
    const bottom = packagingLevels.find(l => l.parentUnit === null);
    if (bottom) {
      ordered.push(bottom);
      let current = bottom;
      for (let i = 0; i < packagingLevels.length; i++) {
        const next = packagingLevels.find(l => l.parentUnit === current.unitName);
        if (!next) break;
        ordered.push(next);
        current = next;
      }
    }
    return ordered;
  }, [hasPackaging, packagingLevels]);

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

  const handleLevelChange = useCallback(
    (key: string, value: string) => {
      const num = value === '' ? 0 : Number(value);
      setQtyByLevel(prev => {
        const next = { ...prev, [key]: num };
        let total = next['__stock__'] ?? 0;
        for (const level of packagingLevels) {
          const qty = next[level.unitName] ?? 0;
          if (qty > 0) total += qty * computeMultiplier(level.unitName);
        }
        onQuantityChange(total);
        return next;
      });
    },
    [packagingLevels, computeMultiplier, onQuantityChange]
  );

  const handleSimpleQtyChange = useCallback(
    (value: string) => {
      const num = parseInt(value) || 0;
      setSimpleQty(num);
      onQuantityChange(num);
    },
    [onQuantityChange]
  );

  return (
    <div className="border border-border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-body-sm font-semibold text-card-foreground">{itemName}</span>
        <button
          type="button"
          onClick={onRemove}
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
            <span className={SELECT_LABEL}>Qty *</span>
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
        <span className={SELECT_LABEL}>Location *</span>
        <Select
          options={locationOptions}
          value={locationId}
          onChange={v => onLocationChange(String(v ?? ''))}
          size="sm"
          fullWidth
        />
      </div>

      {children}
    </div>
  );
}
