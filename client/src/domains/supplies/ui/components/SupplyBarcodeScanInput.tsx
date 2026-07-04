/**
 * Supply Barcode Scan Input
 *
 * Focused input field for barcode scanning. On Enter, resolves the barcode via API.
 * If found, calls onItemFound. If unknown, prompts to link to an existing item.
 */

import { useState, useCallback } from 'react';

import { ScanBarcode } from 'lucide-react';

import { SupplyService } from '@domains/supplies/services/SupplyService';
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
  const [isResolving, setIsResolving] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [unresolvedBarcode, setUnresolvedBarcode] = useState('');

  const handleScan = useCallback(async () => {
    const value = scanValue.trim();
    if (!value) return;

    setIsResolving(true);
    try {
      const item = await SupplyService.resolveBarcode(value);
      if (item) {
        onItemFound(item.id);
        setScanValue('');
      } else {
        setUnresolvedBarcode(value);
        setShowLinkDialog(true);
      }
    } catch {
      notifications.error('Failed to resolve barcode');
    } finally {
      setIsResolving(false);
    }
  }, [scanValue, onItemFound]);

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
