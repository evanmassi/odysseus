/**
 * Consumable Bulk Consume Modal
 *
 * Order-form style modal for recording consumption of multiple products in a single session.
 */

import { useState, useMemo, useCallback } from 'react';

import { PackageMinus, X } from 'lucide-react';

import { useConsumableLocationsQuery } from '@domains/consumables/hooks';
import { useConsumableBulkConsumeMutation } from '@domains/consumables/hooks/useConsumableMutations';
import { Autocomplete, Button, Select, Input } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/overlays';
import { ConfirmDialog } from '@shared/ui/components/overlays/ConfirmDialog';
import { ScrollArea } from '@shared/ui/primitives/scroll-area/ScrollArea';
import { notifyBulkResult } from '@shared/utils/bulkResultNotifications';
import { notifications } from '@shared/utils/notifications';

import type { ConsumableProductWithStock } from '@odysseus/shared-schemas';
import type { AutocompleteOption } from '@shared/ui';
import type { SelectOption } from '@shared/ui/primitives/select/types';

interface ConsumeRow {
  productId: string;
  productName: string;
  quantity: number;
  locationId: string;
}

interface ConsumableBulkConsumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ConsumableProductWithStock[];
}

export function ConsumableBulkConsumeModal({
  isOpen,
  onClose,
  products,
}: ConsumableBulkConsumeModalProps) {
  const [rows, setRows] = useState<ConsumeRow[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [lastLocationId, setLastLocationId] = useState('');
  const { data: locations = [] } = useConsumableLocationsQuery();
  const bulkConsumeMutation = useConsumableBulkConsumeMutation();

  const locationOptions: SelectOption[] = useMemo(
    () => [
      { value: '', label: 'Select...' },
      ...locations.map(l => ({ value: l.id, label: l.name })),
    ],
    [locations]
  );

  const productOptions: AutocompleteOption[] = useMemo(
    () =>
      products
        .filter(p => p.status === 'active')
        .map(p => ({
          value: p.id,
          label: p.name,
          secondary: [p.manufacturer, p.catalogNumber].filter(Boolean).join(' · '),
        })),
    [products]
  );

  const handleAddProduct = useCallback(
    (option: AutocompleteOption) => {
      setRows(prev => [
        ...prev,
        {
          productId: option.value,
          productName: option.label,
          quantity: 1,
          locationId: lastLocationId,
        },
      ]);
      setSearchValue('');
    },
    [lastLocationId]
  );

  const updateRow = useCallback(
    (index: number, field: keyof ConsumeRow, value: string | number) => {
      setRows(prev =>
        prev.map((row, i) => {
          if (i !== index) return row;
          const updated = { ...row, [field]: value };
          if (field === 'locationId') setLastLocationId(value as string);
          return updated;
        })
      );
    },
    []
  );

  const removeRow = useCallback((index: number) => {
    setRows(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(async () => {
    const items = rows
      .filter(r => r.quantity > 0 && r.locationId)
      .map(r => ({
        productId: r.productId,
        locationId: r.locationId,
        quantity: r.quantity,
      }));

    if (items.length === 0) return;

    try {
      const result = await bulkConsumeMutation.mutateAsync({ items });
      notifyBulkResult(result, 'products');
      setRows([]);
      onClose();
    } catch {
      notifications.error('Failed to record consumption');
    }
    setShowConfirm(false);
  }, [rows, bulkConsumeMutation, onClose]);

  const handleClose = useCallback(() => {
    setRows([]);
    setSearchValue('');
    onClose();
  }, [onClose]);

  const validRowCount = rows.filter(r => r.quantity > 0 && r.locationId).length;

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        title="Bulk Consume"
        icon={<PackageMinus size={24} />}
        onClose={handleClose}
        size="lg"
        fixedHeight
      >
        <div className="flex flex-col h-full min-h-0">
          <div className="px-4 pb-3 flex-shrink-0">
            <Autocomplete
              options={productOptions}
              value={searchValue}
              onChange={setSearchValue}
              onSelect={handleAddProduct}
              placeholder="Search products to add..."
              fullWidth
              aria-label="Search products"
            />
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-4 space-y-2">
              {rows.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Search for products above to add them to this consumption record.
                </p>
              )}

              {rows.map((row, index) => (
                <div
                  key={`${row.productId}-${index}`}
                  className="border border-border rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-card-foreground">
                      {row.productName}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      className="p-1 text-muted-foreground hover:text-danger-text rounded transition-colors"
                      aria-label={`Remove ${row.productName}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-xs text-muted-foreground block mb-0.5">Qty *</span>
                      <Input
                        type="number"
                        value={String(row.quantity)}
                        onValueChange={v => updateRow(index, 'quantity', parseInt(v) || 0)}
                        size="sm"
                        fullWidth
                      />
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs text-muted-foreground block mb-0.5">Location *</span>
                      <Select
                        options={locationOptions}
                        value={row.locationId}
                        onChange={v => updateRow(index, 'locationId', String(v ?? ''))}
                        size="sm"
                        fullWidth
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex items-center justify-between px-4 py-3 border-t border-border flex-shrink-0">
            <span className="text-xs text-muted-foreground">
              {validRowCount} product{validRowCount !== 1 ? 's' : ''} to consume
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={() => setShowConfirm(true)}
                disabled={validRowCount === 0}
                isLoading={bulkConsumeMutation.isPending}
              >
                Consume All
              </Button>
            </div>
          </div>
        </div>
      </BaseModal>

      <ConfirmDialog
        isOpen={showConfirm}
        variant="warning"
        title="Confirm Bulk Consumption"
        message={`Record consumption for ${validRowCount} product${validRowCount !== 1 ? 's' : ''}?`}
        confirmText="Consume"
        onConfirm={() => void handleSubmit()}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}
