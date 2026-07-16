/**
 * Supply Quick Scan Bar
 *
 * Barcode scan input in the toolbar that resolves a barcode and shows
 * a quick action dropdown for immediate item viewing or transaction recording.
 */

import { useState, useCallback, useRef } from 'react';

import { ScanBarcode, Eye, PackagePlus, PackageMinus, ClipboardCheck, Trash2 } from 'lucide-react';

import { SupplyService } from '@domains/supplies/services/SupplyService';
import { SearchInput } from '@shared/ui';
import { DropdownMenu } from '@shared/ui/primitives/menus/DropdownMenu';
import { MenuDivider } from '@shared/ui/primitives/menus/MenuDivider';
import { MenuItem } from '@shared/ui/primitives/menus/MenuItem';
import { notifications } from '@shared/utils/notifications';
import { pluralizeUnit } from '@shared/utils/pluralizeUnit';

import { SupplyBarcodeLinkDialog } from './SupplyBarcodeLinkDialog';

import type { TransactionMode } from './SupplyTransactionForm';
import type { SupplyItem, SupplyItemWithStock } from '@odysseus/shared-schemas';

interface SupplyQuickScanBarProps {
  items: SupplyItemWithStock[];
  onViewItem: (itemId: string) => void;
  onRecordTransaction: (itemId: string, initialTab: TransactionMode) => void;
}

export function SupplyQuickScanBar({
  items,
  onViewItem,
  onRecordTransaction,
}: SupplyQuickScanBarProps) {
  const [scanValue, setScanValue] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [resolvedItem, setResolvedItem] = useState<SupplyItem | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [unresolvedBarcode, setUnresolvedBarcode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleScan = useCallback(async () => {
    const value = scanValue.trim();
    if (!value) return;

    setIsResolving(true);
    try {
      const item = await SupplyService.resolveBarcode(value);
      if (item) {
        setResolvedItem(item);
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
    (action: 'view' | TransactionMode) => {
      if (!resolvedItem) return;
      setShowActions(false);
      setScanValue('');
      setResolvedItem(null);

      if (action === 'view') {
        onViewItem(resolvedItem.id);
      } else {
        onRecordTransaction(resolvedItem.id, action);
      }

      inputRef.current?.focus();
    },
    [resolvedItem, onViewItem, onRecordTransaction]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleScan();
    }
  };

  const stockInfo = resolvedItem ? items.find(p => p.id === resolvedItem.id) : null;

  return (
    <>
      <div ref={triggerRef} className="w-48">
        <SearchInput
          ref={inputRef}
          value={scanValue}
          onChange={setScanValue}
          onKeyDown={handleKeyDown}
          disabled={isResolving}
          placeholder="Scan barcode…"
          size="sm"
          icon={<ScanBarcode size={12} />}
          aria-label="Scan barcode"
        />

        <DropdownMenu
          isOpen={showActions}
          onClose={() => {
            setShowActions(false);
            setScanValue('');
            setResolvedItem(null);
          }}
          triggerRef={triggerRef as React.RefObject<HTMLElement>}
          align="start"
          className="w-48"
        >
          {resolvedItem && (
            <div className="py-1">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-body-sm font-semibold text-card-foreground">
                  {resolvedItem.name}
                </p>
                {stockInfo && (
                  <p className="text-caption text-muted-foreground">
                    {stockInfo.totalStock}{' '}
                    {pluralizeUnit(stockInfo.stockUnit ?? 'unit', stockInfo.totalStock)} in stock
                  </p>
                )}
              </div>
              <MenuItem icon={Eye} label="View Item" onClick={() => handleAction('view')} />
              <MenuDivider />
              <MenuItem icon={ClipboardCheck} label="Count" onClick={() => handleAction('count')} />
              <MenuItem
                icon={PackagePlus}
                label="Receive"
                onClick={() => handleAction('received')}
              />
              <MenuItem icon={PackageMinus} label="Issue" onClick={() => handleAction('issued')} />
              <MenuItem icon={Trash2} label="Dispose" onClick={() => handleAction('disposed')} />
            </div>
          )}
        </DropdownMenu>
      </div>

      <SupplyBarcodeLinkDialog
        isOpen={showLinkDialog}
        barcodeValue={unresolvedBarcode}
        items={items}
        onClose={() => {
          setShowLinkDialog(false);
          setScanValue('');
        }}
      />
    </>
  );
}
