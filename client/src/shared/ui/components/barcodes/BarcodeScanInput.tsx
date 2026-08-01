/**
 * Barcode Scan Input
 *
 * Focused input field for barcode scanning. Resolution is lab-wide, so a scan that lands in
 * another catalog is named rather than offered for linking to this one.
 */

import { useState, useCallback } from 'react';

import { ScanBarcode } from 'lucide-react';

import { useBarcodeResolver } from '@domains/lab-management';
import { SearchInput } from '@shared/ui';
import { notifications } from '@shared/utils/notifications';

import { BarcodeLinkDialog } from './BarcodeLinkDialog';

import type { BarcodeType } from '@odysseus/shared-schemas';

interface LinkableItem {
  id: string;
  name: string;
  catalogNumber?: string;
  status: string;
}

interface BarcodeScanInputProps {
  /** Which catalog this input belongs to; a match anywhere else is named, not linked. */
  catalog: 'supply' | 'reagent';
  items: LinkableItem[];
  onItemFound: (itemId: string) => void;
  onLink: (
    itemId: string,
    data: { barcodeValue: string; barcodeType: BarcodeType },
    onSuccess: () => void
  ) => void;
  isLinking: boolean;
  placeholder?: string;
}

export function BarcodeScanInput({
  catalog,
  items,
  onItemFound,
  onLink,
  isLinking,
  placeholder = 'Scan barcode...',
}: BarcodeScanInputProps) {
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

    if (result.match.catalog !== catalog) {
      notifications.info(
        `That barcode belongs to the ${result.match.catalog} ${result.match.itemName}.`
      );
      setScanValue('');
      return;
    }

    onItemFound(result.match.itemId);
    setScanValue('');
  }, [scanValue, resolve, catalog, onItemFound]);

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

      <BarcodeLinkDialog
        isOpen={showLinkDialog}
        barcodeValue={unresolvedBarcode}
        items={items}
        isPending={isLinking}
        onLink={(itemId, data, onSuccess) =>
          onLink(itemId, data, () => {
            onSuccess();
            onItemFound(itemId);
            setScanValue('');
          })
        }
        onClose={() => setShowLinkDialog(false)}
      />
    </>
  );
}
