/**
 * Supply Barcode Scan Input
 *
 * Focused input field for barcode scanning. On Enter, resolves the barcode via API.
 * If found, calls onItemFound. If unknown, prompts to link to an existing item.
 */

import { useState, useCallback, useMemo } from 'react';

import { ScanBarcode } from 'lucide-react';

import { useAddSupplyBarcodeMutation } from '@domains/supplies/hooks/useSupplyMutations';
import { SupplyService } from '@domains/supplies/services/SupplyService';
import { Button, SearchInput, Select } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/overlays';
import { notifications } from '@shared/utils/notifications';

import type { SupplyItemWithStock } from '@odysseus/shared-schemas';
import type { SelectOption } from '@shared/ui/primitives/select/types';

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

  const handleLink = useCallback(async () => {
    if (!linkItemId || !unresolvedBarcode) return;

    try {
      await addBarcodeMutation.mutateAsync({
        itemId: linkItemId,
        data: {
          barcodeValue: unresolvedBarcode,
          barcodeType: 'manufacturer_sku',
        },
      });
      notifications.success('Barcode linked');
      onItemFound(linkItemId);
      setShowLinkDialog(false);
      setUnresolvedBarcode('');
      setLinkItemId('');
      setScanValue('');
    } catch {
      notifications.error('Failed to link barcode');
    }
  }, [linkItemId, unresolvedBarcode, addBarcodeMutation, onItemFound]);

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

      <BaseModal
        isOpen={showLinkDialog}
        title="Unknown Barcode"
        icon={<ScanBarcode size={24} />}
        onClose={() => setShowLinkDialog(false)}
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-body text-muted-foreground">
            Barcode{' '}
            <span className="font-mono font-semibold text-card-foreground">
              {unresolvedBarcode}
            </span>{' '}
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
            <Button variant="secondary" onClick={() => setShowLinkDialog(false)}>
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
    </>
  );
}
