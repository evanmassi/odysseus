/**
 * Supply Barcode Print
 *
 * Modal with format/size selectors, live preview, and isolated print
 * (only the label hits the page, anchored top-left).
 */

import { useEffect, useRef, useState, useCallback } from 'react';

import JsBarcode from 'jsbarcode';
import { Printer, Barcode, QrCode } from 'lucide-react';
import { toCanvas as qrToCanvas } from 'qrcode';
import { createPortal } from 'react-dom';

import { Button } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/overlays';

import { PRINT_PORTAL_CLASS, buildBarcodePrintStyles } from './barcodePrintStyles';

export type BarcodeFormat = '1d' | '2d';

export interface LabelSize {
  name: string;
  width: number;
  height: number;
  nameFont: number;
  metaFont: number;
}

const LABEL_SIZES: readonly LabelSize[] = [
  { name: '4 × 2"', width: 4, height: 2, nameFont: 0.18, metaFont: 0.12 },
  { name: '3 × 1"', width: 3, height: 1, nameFont: 0.13, metaFont: 0.09 },
  { name: '2.625 × 1"', width: 2.625, height: 1, nameFont: 0.12, metaFont: 0.085 },
  { name: '2 × 1"', width: 2, height: 1, nameFont: 0.11, metaFont: 0.08 },
  { name: '1.5 × 0.5"', width: 1.5, height: 0.5, nameFont: 0.085, metaFont: 0.06 },
] as const;

const PREVIEW_MIN_HEIGHT_PX = 224;

export const FORMAT_OPTIONS: {
  value: BarcodeFormat;
  label: string;
  Icon: typeof Barcode;
}[] = [
  { value: '1d', label: 'Barcode', Icon: Barcode },
  { value: '2d', label: 'QR Code', Icon: QrCode },
];

const SELECTED_CLASS =
  'bg-action [[data-theme=dark]_&]:bg-action/70 border-action [[data-theme=dark]_&]:border-action/70 text-white shadow-md';
const UNSELECTED_CLASS =
  'bg-card border-border text-secondary-foreground hover:border-action hover:bg-action/10';

const PRINT_STYLE_ID = 'barcode-print-styles';

interface SupplyBarcodePrintProps {
  isOpen: boolean;
  onClose: () => void;
  barcodeValue: string;
  itemName: string;
  manufacturer?: string;
  catalogNumber?: string;
}

export function SupplyBarcodePrint({
  isOpen,
  onClose,
  barcodeValue,
  itemName,
  manufacturer,
  catalogNumber,
}: SupplyBarcodePrintProps) {
  const [format, setFormat] = useState<BarcodeFormat>('1d');
  const [labelSize, setLabelSize] = useState<LabelSize>(LABEL_SIZES[0]);

  useEffect(() => {
    if (!isOpen) return;
    const style = document.createElement('style');
    style.id = PRINT_STYLE_ID;
    style.textContent = buildBarcodePrintStyles({
      pageSize: { kind: 'label', width: labelSize.width, height: labelSize.height },
      includeSheetBreaks: false,
    });
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, [isOpen, labelSize]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

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
      title="Print Barcode"
      icon={<Printer size={24} />}
      onClose={onClose}
      size="md"
      footer={footer}
    >
      <div className="space-y-4">
        <div>
          <h4 className="text-body-sm font-semibold text-card-foreground mb-2">Format</h4>
          <div className="grid grid-cols-2 gap-2">
            {FORMAT_OPTIONS.map(({ value, label, Icon }) => {
              const isSelected = format === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFormat(value)}
                  className={`px-3 py-2 rounded-lg border-2 text-center transition-all flex items-center justify-center gap-2 ${
                    isSelected ? SELECTED_CLASS : UNSELECTED_CLASS
                  }`}
                >
                  <Icon
                    size={18}
                    className={isSelected ? 'text-white' : 'text-secondary-foreground'}
                  />
                  <span className="text-body-sm font-semibold">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h4 className="text-body-sm font-semibold text-card-foreground mb-2">Label Size</h4>
          <div className="grid grid-cols-5 gap-2">
            {LABEL_SIZES.map(size => {
              const isSelected = labelSize.name === size.name;
              return (
                <button
                  key={size.name}
                  type="button"
                  onClick={() => setLabelSize(size)}
                  className={`px-2 py-2 rounded-lg border-2 text-center transition-all ${
                    isSelected ? SELECTED_CLASS : UNSELECTED_CLASS
                  }`}
                >
                  <div className="text-caption font-semibold">{size.name}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h4 className="text-body-sm font-semibold text-card-foreground mb-2">Preview</h4>
          <div
            className="flex justify-center items-center p-4 bg-muted/30 rounded-lg border border-border"
            style={{ minHeight: `${PREVIEW_MIN_HEIGHT_PX}px` }}
          >
            <BarcodeLabel
              format={format}
              labelSize={labelSize}
              itemName={itemName}
              manufacturer={manufacturer}
              catalogNumber={catalogNumber}
              barcodeValue={barcodeValue}
            />
          </div>
        </div>
      </div>
      {createPortal(
        <div className={PRINT_PORTAL_CLASS}>
          <BarcodeLabel
            format={format}
            labelSize={labelSize}
            itemName={itemName}
            manufacturer={manufacturer}
            catalogNumber={catalogNumber}
            barcodeValue={barcodeValue}
          />
        </div>,
        document.body
      )}
    </BaseModal>
  );
}

interface BarcodeLabelProps {
  format: BarcodeFormat;
  labelSize: LabelSize;
  itemName: string;
  manufacturer?: string;
  catalogNumber?: string;
  barcodeValue: string;
}

export function BarcodeLabel({
  format,
  labelSize,
  itemName,
  manufacturer,
  catalogNumber,
  barcodeValue,
}: BarcodeLabelProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);

  const padIn = Math.max(0.05, labelSize.height * 0.06);
  const innerHeightIn = labelSize.height - padIn * 2;
  const qrSizeIn = innerHeightIn;

  useEffect(() => {
    if (format !== '1d' || !barcodeRef.current || !barcodeValue) return;
    try {
      JsBarcode(barcodeRef.current, barcodeValue, {
        format: 'CODE128',
        displayValue: false,
        margin: 0,
        height: 100,
      });
    } catch {
      // Invalid value — SVG stays empty
    }
  }, [format, barcodeValue, labelSize]);

  useEffect(() => {
    if (format !== '2d' || !qrRef.current || !barcodeValue) return;
    const canvas = qrRef.current;
    const pixelSize = Math.max(256, Math.round(qrSizeIn * 300));
    void qrToCanvas(canvas, barcodeValue, {
      width: pixelSize,
      margin: 0,
    })
      .then(() => {
        canvas.style.width = `${qrSizeIn}in`;
        canvas.style.height = `${qrSizeIn}in`;
      })
      .catch(() => {});
  }, [format, barcodeValue, qrSizeIn]);

  const metaLine = [manufacturer, catalogNumber, barcodeValue]
    .filter((p): p is string => !!p && p.length > 0)
    .join(' · ');

  const nameFontStyle = {
    fontSize: `${labelSize.nameFont}in`,
    fontWeight: 700,
    lineHeight: 1.15,
    wordBreak: 'break-word' as const,
  };
  const metaFontStyle = {
    fontSize: `${labelSize.metaFont}in`,
    lineHeight: 1.15,
  };
  const truncate = {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  };

  const containerStyle = {
    width: `${labelSize.width}in`,
    height: `${labelSize.height}in`,
    maxWidth: `${labelSize.width}in`,
    maxHeight: `${labelSize.height}in`,
    padding: `${padIn}in`,
    fontFamily: 'Arial, Helvetica, sans-serif',
    color: '#000',
    background: '#fff',
    boxSizing: 'border-box' as const,
    overflow: 'hidden' as const,
  };

  if (format === '1d') {
    return (
      <div className="flex flex-col" style={containerStyle}>
        <div style={{ ...nameFontStyle, textAlign: 'center' }}>{itemName}</div>
        <div
          style={{
            ...metaFontStyle,
            ...truncate,
            textAlign: 'center',
            marginTop: `${padIn * 0.3}in`,
          }}
        >
          {metaLine}
        </div>
        <div
          className="flex-1 flex items-end"
          style={{ marginTop: `${padIn * 0.4}in`, minHeight: 0 }}
        >
          <svg
            ref={barcodeRef}
            preserveAspectRatio="none"
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        ...containerStyle,
        display: 'grid',
        gridTemplateColumns: `1fr ${qrSizeIn}in`,
        gridTemplateRows: `${innerHeightIn}in`,
        gap: `${padIn}in`,
        alignItems: 'center',
      }}
    >
      <div style={{ minWidth: 0, overflow: 'hidden' }}>
        <div style={nameFontStyle}>{itemName}</div>
        {manufacturer && <div style={{ ...metaFontStyle, ...truncate }}>{manufacturer}</div>}
        {catalogNumber && <div style={{ ...metaFontStyle, ...truncate }}>{catalogNumber}</div>}
        <div style={{ ...metaFontStyle, ...truncate, fontFamily: 'monospace' }}>{barcodeValue}</div>
      </div>
      <canvas
        ref={qrRef}
        style={{
          width: `${qrSizeIn}in`,
          height: `${qrSizeIn}in`,
          display: 'block',
        }}
      />
    </div>
  );
}
