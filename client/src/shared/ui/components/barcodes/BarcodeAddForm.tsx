/**
 * Barcode Add Form
 *
 * Inline form for attaching a barcode to a catalog item, revealed from a button.
 */

import { useState } from 'react';

import { BARCODE_TYPE_VALUES, type BarcodeType } from '@odysseus/shared-schemas';
import { Plus } from 'lucide-react';

import { Button, Input, Select, Checkbox } from '@shared/ui';
import { notifications } from '@shared/utils/notifications';

import { BARCODE_TYPE_LABELS } from './barcodeTypeLabels';

const TYPE_OPTIONS = BARCODE_TYPE_VALUES.map(value => ({
  value,
  label: BARCODE_TYPE_LABELS[value],
}));

interface NewBarcode {
  barcodeValue: string;
  barcodeType: BarcodeType;
  isPrimary?: boolean;
  label?: string;
}

interface BarcodeAddFormProps {
  onAdd: (data: NewBarcode, onSuccess: () => void) => void;
  isPending: boolean;
}

export function BarcodeAddForm({ onAdd, isPending }: BarcodeAddFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [barcodeValue, setBarcodeValue] = useState('');
  const [barcodeType, setBarcodeType] = useState<BarcodeType>('manufacturer_sku');
  const [isPrimary, setIsPrimary] = useState(false);
  const [label, setLabel] = useState('');

  const handleSubmit = () => {
    if (!barcodeValue.trim()) return;
    onAdd(
      {
        barcodeValue: barcodeValue.trim(),
        barcodeType,
        isPrimary: isPrimary || undefined,
        label: label.trim() || undefined,
      },
      () => {
        notifications.success('Barcode added');
        setBarcodeValue('');
        setBarcodeType('manufacturer_sku');
        setIsPrimary(false);
        setLabel('');
        setIsOpen(false);
      }
    );
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
          className="text-body-sm font-medium text-secondary-foreground block mb-0.5"
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
          options={TYPE_OPTIONS}
          value={barcodeType}
          onChange={v => setBarcodeType(v as BarcodeType)}
          size="xs"
          fullWidth
        />
        <div>
          <label
            htmlFor="bc-label"
            className="text-body-sm font-medium text-secondary-foreground block mb-0.5"
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
      <label className="flex items-center gap-1.5 text-body-sm cursor-pointer">
        <Checkbox checked={isPrimary} onChange={setIsPrimary} />
        Set as primary barcode
      </label>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={() => setIsOpen(false)}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!barcodeValue.trim()}
          isLoading={isPending}
        >
          Add
        </Button>
      </div>
    </div>
  );
}
