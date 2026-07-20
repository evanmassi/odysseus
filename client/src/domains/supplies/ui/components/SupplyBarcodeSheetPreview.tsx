/**
 * Supply Barcode Sheet Preview
 *
 * On-screen scaled rendering of one label sheet. Matches the print layout
 * so the preview reflects the printed output.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import { deriveLabelSize, type SheetTemplate } from './sheetTemplates';
import { BarcodeLabel } from './SupplyBarcodeLabel';

import type { BarcodeFormat } from './SupplyBarcodeLabel';
import type { PrintableLabel } from './supplyBarcodeSheetTypes';

const CSS_PX_PER_INCH = 96;

interface SupplyBarcodeSheetPreviewProps {
  template: SheetTemplate;
  slots: ReadonlyArray<PrintableLabel | null>;
  format: BarcodeFormat;
  pageStartGlobalSlot: number;
  skippedSlots: ReadonlySet<number>;
  onToggleSkip: (globalSlot: number) => void;
}

export function SupplyBarcodeSheetPreview({
  template,
  slots,
  format,
  pageStartGlobalSlot,
  skippedSlots,
  onToggleSkip,
}: SupplyBarcodeSheetPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setContainerSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const naturalWidth = template.paperWidth * CSS_PX_PER_INCH;
  const naturalHeight = template.paperHeight * CSS_PX_PER_INCH;
  const scale =
    containerSize.width === 0 || containerSize.height === 0
      ? 0
      : Math.min(1, containerSize.width / naturalWidth, containerSize.height / naturalHeight);

  const labelSize = useMemo(() => deriveLabelSize(template), [template]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex justify-center items-start overflow-hidden"
    >
      {scale > 0 && (
        // Compensating wrapper — CSS transform is visual-only and doesn't
        // shrink the element's layout box, so the inner natural-size sheet
        // would overflow its parent without this scaled-size wrapper.
        <div
          style={{
            width: `${naturalWidth * scale}px`,
            height: `${naturalHeight * scale}px`,
            overflow: 'hidden',
          }}
        >
          <div
            className="bg-white shadow-md relative"
            style={{
              width: `${naturalWidth}px`,
              height: `${naturalHeight}px`,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              border: '1px solid rgba(0,0,0,0.1)',
            }}
          >
            {slots.map((label, slotIndex) => {
              const globalSlot = pageStartGlobalSlot + slotIndex;
              const isSkipped = skippedSlots.has(globalSlot);
              const col = slotIndex % template.columns;
              const row = Math.floor(slotIndex / template.columns);
              const top = template.marginTop + row * (template.labelHeight + template.rowGap);
              const left = template.marginLeft + col * (template.labelWidth + template.columnGap);
              const buttonStyle = {
                position: 'absolute' as const,
                top: `${top}in`,
                left: `${left}in`,
                width: `${template.labelWidth}in`,
                height: `${template.labelHeight}in`,
                overflow: 'hidden' as const,
                padding: 0,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer' as const,
              };
              const key = label ? label.itemId : globalSlot;
              const ariaLabel = label
                ? `${label.itemName}, click to skip this slot`
                : isSkipped
                  ? 'Slot skipped, click to include'
                  : 'Empty slot, click to skip';

              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={isSkipped}
                  aria-label={ariaLabel}
                  onClick={() => onToggleSkip(globalSlot)}
                  style={buttonStyle}
                >
                  {label ? (
                    <BarcodeLabel
                      format={format}
                      labelSize={labelSize}
                      itemName={label.itemName}
                      manufacturer={label.manufacturer}
                      catalogNumber={label.catalogNumber}
                      barcodeValue={label.barcodeValue}
                    />
                  ) : isSkipped ? (
                    <SkipIndicator />
                  ) : (
                    <EmptyPlaceholder />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyPlaceholder() {
  return (
    <div className="w-full h-full bg-muted/20 border border-dashed border-muted-foreground/30 flex items-center justify-center">
      <span className="text-[8px] text-muted-foreground">Empty</span>
    </div>
  );
}

function SkipIndicator() {
  return (
    <div className="w-full h-full bg-muted/40 border border-dashed border-muted-foreground/50 flex items-center justify-center relative overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.1) 4px, rgba(0,0,0,0.1) 8px)',
        }}
      />
      <span className="relative text-[8px] font-semibold text-muted-foreground">Skip</span>
    </div>
  );
}
