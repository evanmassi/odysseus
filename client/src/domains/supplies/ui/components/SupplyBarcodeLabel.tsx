/**
 * Supply Barcode Label
 *
 * Print-label renderer and format primitives shared by the single-label print
 * modal, the bulk sheet modal, the sheet preview, and the print tab.
 */

import { useEffect, useRef } from 'react';

import JsBarcode from 'jsbarcode';
import { Barcode, QrCode } from 'lucide-react';
import { toCanvas as qrToCanvas } from 'qrcode';

export type BarcodeFormat = '1d' | '2d';

export interface LabelSize {
  name: string;
  width: number;
  height: number;
  nameFont: number;
  metaFont: number;
}

export const FORMAT_OPTIONS: {
  value: BarcodeFormat;
  label: string;
  Icon: typeof Barcode;
}[] = [
  { value: '1d', label: 'Barcode', Icon: Barcode },
  { value: '2d', label: 'QR Code', Icon: QrCode },
];

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
