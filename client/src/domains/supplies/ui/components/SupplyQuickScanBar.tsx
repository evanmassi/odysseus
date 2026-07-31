/**
 * Supply Quick Scan Bar
 *
 * Barcode scan input in the toolbar that resolves a barcode and shows a quick action dropdown
 * for immediate item viewing or transaction recording. Resolution is lab-wide, so a scan that
 * lands in another catalog is named rather than offered for linking to a supply.
 */

import { useState, useCallback, useRef } from 'react';

import { ScanBarcode, Eye, PackagePlus, PackageMinus, ClipboardCheck, Trash2 } from 'lucide-react';

import { useBarcodeResolver } from '@domains/lab-management';
import { SearchInput } from '@shared/ui';
import { DropdownMenu } from '@shared/ui/primitives/menus/DropdownMenu';
import { MenuDivider } from '@shared/ui/primitives/menus/MenuDivider';
import { MenuItem } from '@shared/ui/primitives/menus/MenuItem';
import { notifications } from '@shared/utils/notifications';
import { pluralizeUnit } from '@shared/utils/pluralizeUnit';

import { SupplyBarcodeLinkDialog } from './SupplyBarcodeLinkDialog';

import type { TransactionMode } from './SupplyTransactionForm';
import type { BarcodeMatch, SupplyItemWithStock } from '@odysseus/shared-schemas';

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
  const [resolvedMatch, setResolvedMatch] = useState<BarcodeMatch | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [unresolvedBarcode, setUnresolvedBarcode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
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

    setResolvedMatch(result.match);
    setShowActions(true);
  }, [scanValue, resolve]);

  const handleAction = useCallback(
    (action: 'view' | TransactionMode) => {
      if (!resolvedMatch) return;
      setShowActions(false);
      setScanValue('');
      setResolvedMatch(null);

      if (action === 'view') {
        onViewItem(resolvedMatch.itemId);
      } else {
        onRecordTransaction(resolvedMatch.itemId, action);
      }

      inputRef.current?.focus();
    },
    [resolvedMatch, onViewItem, onRecordTransaction]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleScan();
    }
  };

  const stockInfo = resolvedMatch ? items.find(p => p.id === resolvedMatch.itemId) : null;

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
            setResolvedMatch(null);
          }}
          triggerRef={triggerRef as React.RefObject<HTMLElement>}
          align="start"
          className="w-48"
        >
          {resolvedMatch && (
            <div className="py-1">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-body-sm font-semibold text-card-foreground">
                  {resolvedMatch.itemName}
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
        onLinked={itemId => {
          const item = items.find(i => i.id === itemId);
          if (item) {
            setResolvedMatch({ catalog: 'supply', itemId: item.id, itemName: item.name });
            setShowActions(true);
          }
        }}
        onClose={() => {
          setShowLinkDialog(false);
          setScanValue('');
        }}
      />
    </>
  );
}
