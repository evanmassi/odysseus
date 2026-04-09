/**
 * Supply Barcode Print
 *
 * Renders Code 128 (1D) and QR code (2D) for a item's barcode value
 * with a print-friendly layout.
 */

import { useEffect, useRef, useCallback } from 'react';

import JsBarcode from 'jsbarcode';
import { Printer } from 'lucide-react';
import { toCanvas as qrToCanvas } from 'qrcode';

import { Button } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/overlays';

interface SupplyBarcodePrintProps {
  isOpen: boolean;
  onClose: () => void;
  barcodeValue: string;
  itemName: string;
  catalogNumber?: string;
}

export function SupplyBarcodePrint({
  isOpen,
  onClose,
  barcodeValue,
  itemName,
  catalogNumber,
}: SupplyBarcodePrintProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isOpen || !barcodeValue) return;

    if (barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, barcodeValue, {
          format: 'CODE128',
          width: 2,
          height: 60,
          displayValue: true,
          fontSize: 14,
          margin: 10,
        });
      } catch {
        // Invalid barcode format — SVG stays empty
      }
    }

    if (qrCanvasRef.current) {
      void qrToCanvas(qrCanvasRef.current, barcodeValue, {
        width: 150,
        margin: 2,
      });
    }
  }, [isOpen, barcodeValue]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <BaseModal
      isOpen={isOpen}
      title="Print Barcode"
      icon={<Printer size={24} />}
      onClose={onClose}
      className="max-w-md"
    >
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-sm font-semibold text-card-foreground">{itemName}</h3>
          {catalogNumber && <p className="text-xs text-muted-foreground">Cat # {catalogNumber}</p>}
        </div>

        <div className="flex flex-col items-center gap-6 print:gap-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-2 print:hidden">Code 128 (1D)</p>
            <svg ref={barcodeRef} className="max-w-full" />
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-2 print:hidden">QR Code (2D)</p>
            <canvas ref={qrCanvasRef} className="mx-auto" />
          </div>
        </div>

        <div className="flex justify-end gap-2 print:hidden">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handlePrint} leftIcon={<Printer className="w-3.5 h-3.5" />}>
            Print
          </Button>
        </div>
      </div>
    </BaseModal>
  );
}
