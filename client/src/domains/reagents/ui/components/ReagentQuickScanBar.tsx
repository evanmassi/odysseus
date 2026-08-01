/**
 * Reagent Quick Scan Bar
 *
 * Toolbar scan box that resolves a barcode and offers the actions to take next. A lot label
 * opens the transaction against that lot rather than letting FEFO pick.
 */

import { useState, useCallback, useRef } from 'react';

import { formatQuantity } from '@odysseus/shared-schemas';
import { ScanBarcode, Eye, PackagePlus, PackageMinus, ClipboardCheck, Trash2 } from 'lucide-react';

import { useBarcodeResolver } from '@domains/lab-management';
import { useAddReagentBarcodeMutation } from '@domains/reagents/hooks';
import { SearchInput } from '@shared/ui';
import { BarcodeLinkDialog } from '@shared/ui/components/barcodes';
import { DropdownMenu } from '@shared/ui/primitives/menus/DropdownMenu';
import { MenuDivider } from '@shared/ui/primitives/menus/MenuDivider';
import { MenuItem } from '@shared/ui/primitives/menus/MenuItem';
import { notifications } from '@shared/utils/notifications';

import type { TransactionMode, TransactionPrefill } from './ReagentTransactionForm';
import type { BarcodeMatch, ReagentItemWithStock } from '@odysseus/shared-schemas';

interface ReagentQuickScanBarProps {
  items: ReagentItemWithStock[];
  onViewItem: (itemId: string) => void;
  onRecordTransaction: (
    itemId: string,
    initialTab: TransactionMode,
    prefill?: TransactionPrefill
  ) => void;
}

export function ReagentQuickScanBar({
  items,
  onViewItem,
  onRecordTransaction,
}: ReagentQuickScanBarProps) {
  const [scanValue, setScanValue] = useState('');
  const [resolvedMatch, setResolvedMatch] = useState<BarcodeMatch | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [unresolvedBarcode, setUnresolvedBarcode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const { resolve, isResolving } = useBarcodeResolver();
  const addBarcodeMutation = useAddReagentBarcodeMutation();

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

    if (result.match.catalog !== 'reagent') {
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
      const { itemId, lotId } = resolvedMatch;
      setShowActions(false);
      setScanValue('');
      setResolvedMatch(null);

      if (action === 'view') {
        onViewItem(itemId);
      } else {
        onRecordTransaction(itemId, action, lotId ? { lotId } : undefined);
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

  const stockInfo = resolvedMatch ? items.find(i => i.id === resolvedMatch.itemId) : null;

  return (
    <>
      {/* The menu is absolutely positioned, so this has to be its containing block. */}
      <div ref={triggerRef} className="relative w-48">
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
          className="w-52"
        >
          {resolvedMatch && (
            <div className="py-1">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-body-sm font-semibold text-card-foreground">
                  {resolvedMatch.itemName}
                </p>
                {stockInfo && (
                  <p className="text-caption text-muted-foreground">
                    {formatQuantity(stockInfo.totalStock, stockInfo.stockUnit ?? '')} in stock
                  </p>
                )}
                {resolvedMatch.lotId && (
                  <p className="text-caption text-muted-foreground">
                    Lot label — actions target that lot.
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

      <BarcodeLinkDialog
        isOpen={showLinkDialog}
        barcodeValue={unresolvedBarcode}
        items={items}
        isPending={addBarcodeMutation.isPending}
        onLink={(itemId, data, onSuccess) =>
          addBarcodeMutation.mutate(
            { itemId, data },
            {
              onSuccess: () => {
                onSuccess();
                const item = items.find(i => i.id === itemId);
                if (item) {
                  setResolvedMatch({
                    catalog: 'reagent',
                    itemId: item.id,
                    itemName: item.name,
                    lotId: null,
                  });
                  setShowActions(true);
                }
              },
            }
          )
        }
        onClose={() => {
          setShowLinkDialog(false);
          setScanValue('');
        }}
      />
    </>
  );
}
