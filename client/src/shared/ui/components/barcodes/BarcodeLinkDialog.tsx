/**
 * Barcode Link Dialog
 *
 * Offers to attach a scanned value that no catalog recognised to an item the user picks,
 * so an unlabelled bottle becomes scannable at the point someone first tries.
 */

import { useMemo, useState } from 'react';

import { Link } from 'lucide-react';

import { Button, Select, withPlaceholder } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/overlays';
import { notifications } from '@shared/utils/notifications';

import type { BarcodeType } from '@odysseus/shared-schemas';

interface LinkableItem {
  id: string;
  name: string;
  catalogNumber?: string;
  status: string;
}

interface BarcodeLinkDialogProps {
  isOpen: boolean;
  barcodeValue: string;
  items: LinkableItem[];
  isPending: boolean;
  onLink: (
    itemId: string,
    data: { barcodeValue: string; barcodeType: BarcodeType },
    onSuccess: () => void
  ) => void;
  onClose: () => void;
}

export function BarcodeLinkDialog({
  isOpen,
  barcodeValue,
  items,
  isPending,
  onLink,
  onClose,
}: BarcodeLinkDialogProps) {
  const [linkItemId, setLinkItemId] = useState('');

  const itemOptions = useMemo(
    () =>
      withPlaceholder(
        'Select item...',
        items
          .filter(item => item.status === 'active')
          .map(item => ({
            value: item.id,
            label: `${item.name}${item.catalogNumber ? ` (${item.catalogNumber})` : ''}`,
          }))
      ),
    [items]
  );

  const handleLink = () => {
    if (!linkItemId || !barcodeValue) return;
    // A value someone scanned off a product is the manufacturer's, not one we minted.
    onLink(linkItemId, { barcodeValue, barcodeType: 'manufacturer_sku' }, () => {
      notifications.success('Barcode linked');
      setLinkItemId('');
      onClose();
    });
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
          <Button onClick={handleLink} disabled={!linkItemId} isLoading={isPending}>
            Link Barcode
          </Button>
        </div>
      </div>
    </BaseModal>
  );
}
