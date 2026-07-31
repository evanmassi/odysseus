/**
 * Supply Barcode Scan Input
 *
 * Focused input field for barcode scanning. Resolution is lab-wide, so a scan that lands in
 * another catalog is named rather than offered for linking to a supply.
 */

import { useState, useCallback } from 'react';

import { ScanBarcode } from 'lucide-react';

import { useBarcodeResolver } from '@domains/lab-management';
import { SearchInput } from '@shared/ui';
import { notifications } from '@shared/utils/notifications';

import { SupplyBarcodeLinkDialog } from './SupplyBarcodeLinkDialog';

import type { SupplyItemWithStock } from '@odysseus/shared-schemas';

interface SupplyBarcodeScanInputProps {
  items: SupplyItemWithStock[];
  onItemFound: (itemId: string) => void;
  placeholder?: string;
}

export function SupplyBarcodeScanInput({
  items,
  onItemFound,
  placeholder = 'Scan barcode...',
}: SupplyBarcodeScanInputProps) {
  const [scanValue, setScanValue] = useState('');
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [unresolvedBarcode, setUnresolvedBarcode] = useState('');
  const { resolve, isResolving } = useBarcodeResolver();

  const handleScan = useCallback(async () => {
    const value = scanValue.trim();
    if (!value) return;

    const result = await resolve(value);
    if (result.status === 'failed') return;

    if (result.status === 'unknown') {
      setUnresolvedBarcode(value);
      setShowLinkDialog(true);
      return;
    }

    if (result.match.catalog !== 'supply') {
      notifications.info(
        `That barcode belongs to the ${result.match.catalog} ${result.match.itemName}.`
      );
      setScanValue('');
      return;
    }

    onItemFound(result.match.itemId);
    setScanValue('');
  }, [scanValue, resolve, onItemFound]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleScan();
    }
  };

  return (
    <>
      <SearchInput
        value={scanValue}
        onChange={setScanValue}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isResolving}
        size="sm"
        icon={<ScanBarcode size={14} />}
        aria-label="Scan barcode"
      />

      <SupplyBarcodeLinkDialog
        isOpen={showLinkDialog}
        barcodeValue={unresolvedBarcode}
        items={items}
        onClose={() => setShowLinkDialog(false)}
        onLinked={id => {
          onItemFound(id);
          setScanValue('');
        }}
      />
    </>
  );
}
