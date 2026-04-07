/**
 * Consumable Barcode Form
 *
 * Inline form for adding a barcode (manufacturer SKU, UPC, or internal) to a consumable product.
 */

import { useState } from 'react';

import { Plus } from 'lucide-react';

import { useAddConsumableBarcodeMutation } from '@domains/consumables/hooks/useConsumableMutations';
import { Button, Input, Select, Checkbox } from '@shared/ui';
import { notifications } from '@shared/utils/notifications';

import type { ConsumableBarcodeType } from '@odysseus/shared-schemas';
import type { SelectOption } from '@shared/ui/primitives/select/types';

const BARCODE_TYPE_OPTIONS: SelectOption[] = [
  { value: 'internal', label: 'Internal' },
  { value: 'manufacturer_sku', label: 'Manufacturer SKU' },
  { value: 'upc', label: 'UPC' },
];

interface ConsumableBarcodeFormProps {
  productId: string;
  onAdded: () => void;
}

export function ConsumableBarcodeForm({ productId, onAdded }: ConsumableBarcodeFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [barcodeValue, setBarcodeValue] = useState('');
  const [barcodeType, setBarcodeType] = useState<ConsumableBarcodeType>('manufacturer_sku');
  const [isPrimary, setIsPrimary] = useState(false);
  const [label, setLabel] = useState('');
  const addMutation = useAddConsumableBarcodeMutation();

  const handleSubmit = async () => {
    if (!barcodeValue.trim()) return;
    try {
      await addMutation.mutateAsync({
        productId,
        data: {
          barcodeValue: barcodeValue.trim(),
          barcodeType,
          isPrimary: isPrimary || undefined,
          label: label.trim() || undefined,
        },
      });
      notifications.success('Barcode added');
      setBarcodeValue('');
      setBarcodeType('manufacturer_sku');
      setIsPrimary(false);
      setLabel('');
      setIsOpen(false);
      onAdded();
    } catch {
      notifications.error('Failed to add barcode — it may already be in use');
    }
  };

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        leftIcon={<Plus className="w-3 h-3" />}
      >
        Add Barcode
      </Button>
    );
  }

  return (
    <div className="space-y-2 p-2 border border-border rounded-md">
      <div>
        <label
          htmlFor="bc-value"
          className="text-xs font-medium text-secondary-foreground block mb-0.5"
        >
          Barcode Value *
        </label>
        <Input
          id="bc-value"
          type="text"
          value={barcodeValue}
          onValueChange={setBarcodeValue}
          placeholder="Scan or enter barcode..."
          fullWidth
          size="sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Select
          label="Type"
          options={BARCODE_TYPE_OPTIONS}
          value={barcodeType}
          onChange={v => setBarcodeType(v as ConsumableBarcodeType)}
          size="sm"
          fullWidth
        />
        <div>
          <label
            htmlFor="bc-label"
            className="text-xs font-medium text-secondary-foreground block mb-0.5"
          >
            Label
          </label>
          <Input
            id="bc-label"
            type="text"
            value={label}
            onValueChange={setLabel}
            placeholder="e.g., Fisher UPC"
            fullWidth
            size="sm"
          />
        </div>
      </div>
      {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- Checkbox is the control */}
      <label className="flex items-center gap-1.5 text-sm cursor-pointer">
        <Checkbox checked={isPrimary} onChange={setIsPrimary} />
        Set as primary barcode
      </label>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={() => setIsOpen(false)}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => void handleSubmit()}
          disabled={!barcodeValue.trim()}
          isLoading={addMutation.isPending}
        >
          Add
        </Button>
      </div>
    </div>
  );
}
