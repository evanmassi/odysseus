/**
 * Consumable Quick Scan Bar
 *
 * Barcode scan input in the toolbar that resolves a barcode and shows
 * a quick action dropdown for immediate product viewing or transaction recording.
 */

import { useState, useCallback, useRef } from 'react';

import {
  ScanBarcode,
  Eye,
  PackagePlus,
  PackageMinus,
  ClipboardCheck,
  Trash2,
  Link,
} from 'lucide-react';

import { useAddConsumableBarcodeMutation } from '@domains/consumables/hooks/useConsumableMutations';
import { ConsumableService } from '@domains/consumables/services/ConsumableService';
import { Button, Select } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/overlays';
import { DropdownMenu } from '@shared/ui/primitives/menus/DropdownMenu';
import { MenuDivider } from '@shared/ui/primitives/menus/MenuDivider';
import { MenuItem } from '@shared/ui/primitives/menus/MenuItem';
import { notifications } from '@shared/utils/notifications';
import { pluralizeUnit } from '@shared/utils/pluralizeUnit';

import type { ConsumableProduct, ConsumableProductWithStock } from '@odysseus/shared-schemas';
import type { SelectOption } from '@shared/ui/primitives/select/types';

type TransactionTab = 'received' | 'consumed' | 'count' | 'disposed';

interface ConsumableQuickScanBarProps {
  products: ConsumableProductWithStock[];
  onViewProduct: (productId: string) => void;
  onRecordTransaction: (productId: string, initialTab: TransactionTab) => void;
}

export function ConsumableQuickScanBar({
  products,
  onViewProduct,
  onRecordTransaction,
}: ConsumableQuickScanBarProps) {
  const [scanValue, setScanValue] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [resolvedProduct, setResolvedProduct] = useState<ConsumableProduct | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [unresolvedBarcode, setUnresolvedBarcode] = useState('');
  const [linkProductId, setLinkProductId] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const addBarcodeMutation = useAddConsumableBarcodeMutation();

  const productOptions: SelectOption[] = [
    { value: '', label: 'Select product...' },
    ...products
      .filter(p => p.status === 'active')
      .map(p => ({
        value: p.id,
        label: `${p.name}${p.catalogNumber ? ` (${p.catalogNumber})` : ''}`,
      })),
  ];

  const handleScan = useCallback(async () => {
    const value = scanValue.trim();
    if (!value) return;

    setIsResolving(true);
    try {
      const product = await ConsumableService.resolveBarcode(value);
      if (product) {
        setResolvedProduct(product);
        setShowActions(true);
      } else {
        setUnresolvedBarcode(value);
        setShowLinkDialog(true);
      }
    } catch {
      notifications.error('Failed to resolve barcode');
    } finally {
      setIsResolving(false);
    }
  }, [scanValue]);

  const handleAction = useCallback(
    (action: 'view' | TransactionTab) => {
      if (!resolvedProduct) return;
      setShowActions(false);
      setScanValue('');
      setResolvedProduct(null);

      if (action === 'view') {
        onViewProduct(resolvedProduct.id);
      } else {
        onRecordTransaction(resolvedProduct.id, action);
      }

      inputRef.current?.focus();
    },
    [resolvedProduct, onViewProduct, onRecordTransaction]
  );

  const handleLink = useCallback(async () => {
    if (!linkProductId || !unresolvedBarcode) return;
    try {
      await addBarcodeMutation.mutateAsync({
        productId: linkProductId,
        data: { barcodeValue: unresolvedBarcode, barcodeType: 'manufacturer_sku' },
      });
      notifications.success('Barcode linked');
      setShowLinkDialog(false);
      setUnresolvedBarcode('');
      setLinkProductId('');
      setScanValue('');
    } catch {
      notifications.error('Failed to link barcode');
    }
  }, [linkProductId, unresolvedBarcode, addBarcodeMutation]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleScan();
    }
  };

  const stockInfo = resolvedProduct ? products.find(p => p.id === resolvedProduct.id) : null;

  return (
    <>
      <div ref={triggerRef} className="relative w-48">
        <ScanBarcode className="absolute left-2.5 top-2 w-3 h-3 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Scan barcode..."
          value={scanValue}
          onChange={e => setScanValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isResolving}
          className="input-search w-full pl-8"
        />

        <DropdownMenu
          isOpen={showActions}
          onClose={() => {
            setShowActions(false);
            setScanValue('');
            setResolvedProduct(null);
          }}
          triggerRef={triggerRef as React.RefObject<HTMLElement>}
          align="start"
          className="w-48"
        >
          {resolvedProduct && (
            <div className="py-1">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-sm font-semibold text-card-foreground">{resolvedProduct.name}</p>
                {stockInfo && (
                  <p className="text-xs text-muted-foreground">
                    {stockInfo.totalStock}{' '}
                    {pluralizeUnit(stockInfo.stockUnit ?? 'unit', stockInfo.totalStock)} in stock
                  </p>
                )}
              </div>
              <MenuItem icon={Eye} label="View Product" onClick={() => handleAction('view')} />
              <MenuDivider />
              <MenuItem icon={ClipboardCheck} label="Count" onClick={() => handleAction('count')} />
              <MenuItem
                icon={PackagePlus}
                label="Receive"
                onClick={() => handleAction('received')}
              />
              <MenuItem
                icon={PackageMinus}
                label="Consume"
                onClick={() => handleAction('consumed')}
              />
              <MenuItem icon={Trash2} label="Dispose" onClick={() => handleAction('disposed')} />
            </div>
          )}
        </DropdownMenu>
      </div>

      <BaseModal
        isOpen={showLinkDialog}
        title="Unknown Barcode"
        icon={<Link size={24} />}
        onClose={() => {
          setShowLinkDialog(false);
          setScanValue('');
        }}
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
            <Button
              variant="secondary"
              onClick={() => {
                setShowLinkDialog(false);
                setScanValue('');
              }}
            >
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
