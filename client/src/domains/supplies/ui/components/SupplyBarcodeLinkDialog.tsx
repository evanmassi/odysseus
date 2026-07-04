/**
 * Supply Barcode Link Dialog
 *
 * Prompts the user to link an unrecognized scanned barcode to an existing
 * supply item. Shared by the scan input and the quick-scan bar.
 */

import { useMemo, useState } from 'react';

import { Link } from 'lucide-react';

import { useAddSupplyBarcodeMutation } from '@domains/supplies/hooks/useSupplyMutations';
import { Button, Select } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/overlays';
import { notifications } from '@shared/utils/notifications';

import type { SupplyItemWithStock } from '@odysseus/shared-schemas';
import type { SelectOption } from '@shared/ui/primitives/select/types';

interface SupplyBarcodeLinkDialogProps {
  isOpen: boolean;
  barcodeValue: string;
  items: SupplyItemWithStock[];
  onClose: () => void;
  onLinked?: (itemId: string) => void;
}

export function SupplyBarcodeLinkDialog({
  isOpen,
  barcodeValue,
  items,
  onClose,
  onLinked,
}: SupplyBarcodeLinkDialogProps) {
  const [linkItemId, setLinkItemId] = useState('');
  const addBarcodeMutation = useAddSupplyBarcodeMutation();

  const itemOptions: SelectOption[] = useMemo(
    () => [
      { value: '', label: 'Select item...' },
      ...items
        .filter(p => p.status === 'active')
        .map(p => ({
          value: p.id,
          label: `${p.name}${p.catalogNumber ? ` (${p.catalogNumber})` : ''}`,
        })),
    ],
    [items]
  );

  const handleLink = async () => {
    if (!linkItemId || !barcodeValue) return;
    try {
      await addBarcodeMutation.mutateAsync({
        itemId: linkItemId,
        data: { barcodeValue, barcodeType: 'manufacturer_sku' },
      });
      notifications.success('Barcode linked');
      onLinked?.(linkItemId);
      setLinkItemId('');
      onClose();
    } catch {
      notifications.error('Failed to link barcode');
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      title="Unknown Barcode"
      icon={<Link size={24} />}
      onClose={onClose}
      className="max-w-md"
    >
      <div className="space-y-4">
        <p className="text-body text-muted-foreground">
          Barcode{' '}
          <span className="font-mono font-semibold text-card-foreground">{barcodeValue}</span>{' '}
          isn&apos;t linked to any item. Link it now?
        </p>

        <Select
          label="Link to Item"
          options={itemOptions}
          value={linkItemId}
          onChange={v => setLinkItemId(String(v ?? ''))}
          fullWidth
        />

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Skip
          </Button>
          <Button
            onClick={() => void handleLink()}
            disabled={!linkItemId}
            isLoading={addBarcodeMutation.isPending}
          >
            Link Barcode
          </Button>
        </div>
      </div>
    </BaseModal>
  );
}
