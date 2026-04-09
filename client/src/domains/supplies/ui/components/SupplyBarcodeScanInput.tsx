/**
 * Supply Barcode Scan Input
 *
 * Focused input field for barcode scanning. On Enter, resolves the barcode via API.
 * If found, calls onProductFound. If unknown, prompts to link to an existing product.
 */

import { useState, useCallback, useMemo } from 'react';

import { ScanBarcode } from 'lucide-react';

import { useAddSupplyBarcodeMutation } from '@domains/supplies/hooks/useSupplyMutations';
import { SupplyService } from '@domains/supplies/services/SupplyService';
import { Button, Select } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/overlays';
import { notifications } from '@shared/utils/notifications';

import type { SupplyProductWithStock } from '@odysseus/shared-schemas';
import type { SelectOption } from '@shared/ui/primitives/select/types';

interface SupplyBarcodeScanInputProps {
  products: SupplyProductWithStock[];
  onProductFound: (productId: string) => void;
  placeholder?: string;
}

export function SupplyBarcodeScanInput({
  products,
  onProductFound,
  placeholder = 'Scan barcode...',
}: SupplyBarcodeScanInputProps) {
  const [scanValue, setScanValue] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [unresolvedBarcode, setUnresolvedBarcode] = useState('');
  const [linkProductId, setLinkProductId] = useState('');
  const addBarcodeMutation = useAddSupplyBarcodeMutation();

  const productOptions: SelectOption[] = useMemo(
    () => [
      { value: '', label: 'Select product...' },
      ...products
        .filter(p => p.status === 'active')
        .map(p => ({
          value: p.id,
          label: `${p.name}${p.catalogNumber ? ` (${p.catalogNumber})` : ''}`,
        })),
    ],
    [products]
  );

  const handleScan = useCallback(async () => {
    const value = scanValue.trim();
    if (!value) return;

    setIsResolving(true);
    try {
      const product = await SupplyService.resolveBarcode(value);
      if (product) {
        onProductFound(product.id);
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
  }, [scanValue, onProductFound]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleScan();
    }
  };

  const handleLink = useCallback(async () => {
    if (!linkProductId || !unresolvedBarcode) return;

    try {
      await addBarcodeMutation.mutateAsync({
        productId: linkProductId,
        data: {
          barcodeValue: unresolvedBarcode,
          barcodeType: 'manufacturer_sku',
        },
      });
      notifications.success('Barcode linked');
      onProductFound(linkProductId);
      setShowLinkDialog(false);
      setUnresolvedBarcode('');
      setLinkProductId('');
      setScanValue('');
    } catch {
      notifications.error('Failed to link barcode');
    }
  }, [linkProductId, unresolvedBarcode, addBarcodeMutation, onProductFound]);

  return (
    <>
      <div className="relative">
        <ScanBarcode className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="text"
          value={scanValue}
          onChange={e => setScanValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isResolving}
          className="input-search w-full pl-8"
        />
      </div>

      <BaseModal
        isOpen={showLinkDialog}
        title="Unknown Barcode"
        icon={<ScanBarcode size={24} />}
        onClose={() => setShowLinkDialog(false)}
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Barcode{' '}
            <span className="font-mono font-semibold text-card-foreground">
              {unresolvedBarcode}
            </span>{' '}
            isn&apos;t linked to any product. Link it now?
          </p>

          <Select
            label="Link to Product"
            options={productOptions}
            value={linkProductId}
            onChange={v => setLinkProductId(String(v ?? ''))}
            fullWidth
          />

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowLinkDialog(false)}>
              Skip
            </Button>
            <Button
              onClick={() => void handleLink()}
              disabled={!linkProductId}
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
