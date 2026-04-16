/**
 * Supply Barcode Sheet Modal
 *
 * Full-size modal that previews and prints a multi-label sheet layout for
 * bulk barcode printing.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import { createPortal } from 'react-dom';

import { Button } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/overlays';

import { PRINT_PORTAL_CLASS, buildBarcodePrintStyles } from './barcodePrintStyles';
import { deriveLabelSize, type SheetTemplate } from './sheetTemplates';
import { BarcodeLabel } from './SupplyBarcodePrint';
import { SupplyBarcodeSheetPreview } from './SupplyBarcodeSheetPreview';

import type { BarcodeFormat } from './SupplyBarcodePrint';
import type { PrintableLabel } from './supplyBarcodeSheetTypes';

const PRINT_STYLE_ID = 'barcode-sheet-print-styles';
const PRINT_SHEET_CLASS = 'barcode-print-sheet';

const EMPTY_SKIPPED_SLOTS: ReadonlySet<number> = new Set();

/**
 * Distributes labels onto sheet pages, advancing past skipped slots.
 * Invariant: always returns at least one page, so `pageSlots.length === totalPages`
 * and any `pageSlots[safeCurrentPage - 1]` access at the render site is defined.
 */
export function placeLabelsOnSheets(
  labels: readonly PrintableLabel[],
  template: SheetTemplate,
  startingPosition: number,
  skippedSlots: ReadonlySet<number>
): { pageSlots: Array<Array<PrintableLabel | null>>; totalPages: number } {
  const slotsPerSheet = template.columns * template.rows;
  const slots: Array<Array<PrintableLabel | null>> = [];
  let slotCursor = startingPosition - 1;

  for (let labelIndex = 0; labelIndex < labels.length; labelIndex++) {
    while (skippedSlots.has(slotCursor)) slotCursor++;
    const pageIndex = Math.floor(slotCursor / slotsPerSheet);
    const slotInPage = slotCursor % slotsPerSheet;
    while (slots.length <= pageIndex) {
      slots.push(new Array(slotsPerSheet).fill(null));
    }
    slots[pageIndex][slotInPage] = labels[labelIndex];
    slotCursor++;
  }

  // Preserves the one-page-minimum invariant when labels is empty.
  if (slots.length === 0) {
    slots.push(new Array(slotsPerSheet).fill(null));
  }

  return {
    pageSlots: slots,
    totalPages: slots.length,
  };
}

interface SupplyBarcodeSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  labels: PrintableLabel[];
  template: SheetTemplate;
  startingPosition: number;
  format: BarcodeFormat;
}

export function SupplyBarcodeSheetModal({
  isOpen,
  onClose,
  labels,
  template,
  startingPosition,
  format,
}: SupplyBarcodeSheetModalProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const skippedSlots = EMPTY_SKIPPED_SLOTS;

  const slotsPerSheet = template.columns * template.rows;
  const { pageSlots, totalPages } = useMemo(
    () => placeLabelsOnSheets(labels, template, startingPosition, skippedSlots),
    [labels, template, startingPosition, skippedSlots]
  );

  // Render-time clamp protects *this* render against a stale out-of-range
  // currentPage (e.g. totalPages just shrank after a skip). The useEffect
  // below syncs stored state so subsequent renders and click handlers see
  // a valid value. Both are needed — the clamp alone leaves state stale,
  // the effect alone leaks the bad value into one render before syncing.
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const currentPageSlots = pageSlots[safeCurrentPage - 1];

  useEffect(() => {
    setCurrentPage(p => Math.min(p, totalPages));
  }, [totalPages]);

  useEffect(() => {
    if (!isOpen) return;
    const style = document.createElement('style');
    style.id = PRINT_STYLE_ID;
    style.textContent = buildBarcodePrintStyles({
      pageSize: { kind: 'sheet', paperSize: template.paperSize },
      includeSheetBreaks: true,
    });
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, [isOpen, template.paperSize]);

  const labelSize = useMemo(() => deriveLabelSize(template), [template]);

  // Portal sheets are deferred until the user commits to printing — mounting
  // hundreds of BarcodeLabels eagerly on modal open costs real time for large
  // batches, especially with QR (async qrToCanvas). Once mounted, they stay.
  const [hasMountedSheets, setHasMountedSheets] = useState(false);

  useEffect(() => {
    if (!hasMountedSheets) return;
    // JsBarcode is sync; qrToCanvas is a promise with no ready signal from
    // BarcodeLabel, so 2D needs a larger fixed buffer before window.print().
    const delay = format === '2d' ? 500 : 50;
    const timer = setTimeout(() => window.print(), delay);
    return () => clearTimeout(timer);
    // Intentionally only reacting to the sheets-mounted transition; format is
    // stable per modal instance (changing it requires closing and reopening).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMountedSheets]);

  const handlePrint = useCallback(() => {
    if (hasMountedSheets) {
      window.print();
      return;
    }
    setHasMountedSheets(true);
  }, [hasMountedSheets]);

  const footer = (
    <div className="flex justify-end gap-2">
      <Button variant="secondary" onClick={onClose}>
        Close
      </Button>
      <Button onClick={handlePrint} leftIcon={<Printer size={16} />}>
        Print
      </Button>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      title="Print Barcode Sheet"
      icon={<Printer size={24} />}
      onClose={onClose}
      size="full"
      fixedHeight
      footer={footer}
    >
      <div className="flex flex-col gap-3 h-full min-h-0">
        <div className="flex items-center justify-between flex-shrink-0">
          <p className="text-sm text-muted-foreground">
            {labels.length} label{labels.length === 1 ? '' : 's'} · {totalPages} sheet
            {totalPages === 1 ? '' : 's'} · {template.name}
          </p>

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                aria-label="Previous sheet"
              >
                <ChevronLeft size={16} />
              </Button>
              <span className="text-sm text-card-foreground">
                Sheet {safeCurrentPage} of {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage === totalPages}
                aria-label="Next sheet"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0">
          <SupplyBarcodeSheetPreview template={template} slots={currentPageSlots} format={format} />
        </div>
      </div>

      {createPortal(
        <div className={PRINT_PORTAL_CLASS}>
          {hasMountedSheets &&
            pageSlots.map((sheetSlots, sheetIndex) => (
              <div
                key={sheetIndex}
                className={PRINT_SHEET_CLASS}
                style={{
                  width: `${template.paperWidth}in`,
                  height: `${template.paperHeight}in`,
                  position: 'relative',
                }}
              >
                {sheetSlots.map((label, slotIndex) => {
                  const col = slotIndex % template.columns;
                  const row = Math.floor(slotIndex / template.columns);
                  const top = template.marginTop + row * (template.labelHeight + template.rowGap);
                  const left =
                    template.marginLeft + col * (template.labelWidth + template.columnGap);
                  const wrapperStyle = {
                    position: 'absolute' as const,
                    top: `${top}in`,
                    left: `${left}in`,
                    width: `${template.labelWidth}in`,
                    height: `${template.labelHeight}in`,
                    overflow: 'hidden' as const,
                  };

                  if (!label) {
                    return (
                      <div key={sheetIndex * slotsPerSheet + slotIndex} style={wrapperStyle} />
                    );
                  }

                  return (
                    <div key={label.itemId} style={wrapperStyle}>
                      <BarcodeLabel
                        format={format}
                        labelSize={labelSize}
                        itemName={label.itemName}
                        manufacturer={label.manufacturer}
                        catalogNumber={label.catalogNumber}
                        barcodeValue={label.barcodeValue}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
        </div>,
        document.body
      )}
    </BaseModal>
  );
}
