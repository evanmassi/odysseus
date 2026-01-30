/**
 * Print Label Modal
 *
 * Modal for printing a label for a single tube. Shows label preview,
 * printer selection, label size, and copy count options.
 */

import { useEffect, useState, useMemo } from 'react';

import { Printer, RefreshCw } from 'lucide-react';

import {
  usePrintLabels,
  formatTubeForLabel,
  BUILT_IN_LABEL_SIZES,
  DEFAULT_LABEL_SIZE_ID,
} from '@domains/printing';
import { useActiveResearchersQuery } from '@domains/researchers/hooks';
import { useTube } from '@domains/tubes/hooks';
import { AlertBanner, Button, Select, NumberInput, Spinner } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/modals';
import { notifications } from '@shared/utils/notifications';

import type { LabelLines, LabelSize, PreviewResult } from '@domains/printing';

export interface PrintLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  tubeId: string;
}

type ModalState = 'discovering' | 'no-printers' | 'ready' | 'printing' | 'success' | 'error';

interface LabelPreviewProps {
  lines: LabelLines;
  size: LabelSize;
  sdkPreview?: PreviewResult | null;
  isLoadingPreview?: boolean;
}

/** Visual preview of the label content */
function LabelPreview({ lines, size, sdkPreview, isLoadingPreview }: LabelPreviewProps) {
  const activeLines = [lines.line1, lines.line2, lines.line3, lines.line4].filter(Boolean);

  // Scale preview to roughly match label proportions
  const aspectRatio = size.width / size.height;
  const previewWidth = Math.min(280, aspectRatio * 80);

  // Show SDK-rendered preview if available
  if (sdkPreview) {
    return (
      <div className="flex flex-col items-center">
        <div
          className="bg-white border-2 border-solid border-border rounded overflow-hidden"
          style={{ width: `${previewWidth}px`, minWidth: '200px' }}
        >
          <img
            src={sdkPreview.imageData}
            alt="Label preview"
            className="w-full h-auto"
            style={{ imageRendering: 'crisp-edges' }}
          />
        </div>
        <span className="text-xs text-muted-foreground mt-2">
          {size.name} <span className="text-primary">(SDK Preview)</span>
        </span>
      </div>
    );
  }

  // Show loading state while rendering preview
  if (isLoadingPreview) {
    return (
      <div className="flex flex-col items-center">
        <div
          className="bg-white border-2 border-dashed border-border rounded px-3 py-2 min-h-[60px] flex flex-col items-center justify-center"
          style={{ width: `${previewWidth}px`, minWidth: '200px' }}
        >
          <Spinner size="sm" />
          <span className="text-xs text-muted-foreground mt-2">Rendering preview...</span>
        </div>
        <span className="text-xs text-muted-foreground mt-2">{size.name}</span>
      </div>
    );
  }

  // Fallback: Text-based preview
  return (
    <div className="flex flex-col items-center">
      <div
        className="bg-white border-2 border-dashed border-border rounded px-3 py-2 font-mono text-xs text-gray-800 min-h-[60px] flex flex-col justify-center"
        style={{
          width: `${previewWidth}px`,
          minWidth: '200px',
        }}
      >
        {activeLines.length > 0 ? (
          activeLines.map((line, i) => (
            <div key={i} className="truncate leading-relaxed">
              {line}
            </div>
          ))
        ) : (
          <div className="text-muted-foreground italic text-center">No label content</div>
        )}
      </div>
      <span className="text-xs text-muted-foreground mt-2">{size.name}</span>
    </div>
  );
}

export function PrintLabelModal({ isOpen, onClose, tubeId }: PrintLabelModalProps) {
  const [copies, setCopies] = useState(1);
  const [selectedSizeId, setSelectedSizeId] = useState(DEFAULT_LABEL_SIZE_ID);

  const { data: tube, isLoading: tubeLoading } = useTube(tubeId, { enabled: isOpen });
  const { data: researchers = [] } = useActiveResearchersQuery();

  const {
    availablePrinters,
    selectedPrinter,
    isDiscovering,
    isPrinting,
    isRenderingPreview,
    error,
    lastResult,
    preview,
    discoverPrinters,
    selectPrinter,
    printLabel,
    renderPreview,
    clearError,
    clearResult,
    clearPreview,
  } = usePrintLabels();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCopies(1);
      clearError();
      clearResult();
      clearPreview();
    }
  }, [isOpen, clearError, clearResult, clearPreview]);

  // Format label lines from tube data
  const labelLines = useMemo(() => {
    if (!tube) return {};
    const researcher = researchers.find(r => r.id === tube.researcherId);
    return formatTubeForLabel(tube, researcher);
  }, [tube, researchers]);

  const selectedSize =
    BUILT_IN_LABEL_SIZES.find(s => s.id === selectedSizeId) ?? BUILT_IN_LABEL_SIZES[1];

  // Determine modal state
  const modalState: ModalState = useMemo(() => {
    if (isDiscovering || tubeLoading) return 'discovering';
    if (lastResult?.success) return 'success';
    if (error && !isPrinting) return availablePrinters.length === 0 ? 'no-printers' : 'error';
    if (isPrinting) return 'printing';
    return 'ready';
  }, [isDiscovering, tubeLoading, isPrinting, error, lastResult, availablePrinters.length]);

  // Render SDK preview when ready and dependencies change
  useEffect(() => {
    if (modalState === 'ready' && selectedPrinter && Object.keys(labelLines).length > 0) {
      void renderPreview(labelLines, { labelSize: selectedSize });
    }
  }, [modalState, selectedPrinter, labelLines, selectedSize, renderPreview]);

  const handlePrint = async () => {
    const result = await printLabel(labelLines, {
      labelSize: selectedSize,
      copies,
    });

    if (result.success) {
      notifications.success(
        `${copies} label${copies > 1 ? 's' : ''} sent to ${selectedPrinter?.name ?? 'printer'}`
      );
      // Auto-close after short delay on success
      setTimeout(onClose, 1500);
    }
  };

  const handleRetry = () => {
    clearError();
    clearResult();
    void discoverPrinters();
  };

  const printerOptions = availablePrinters.map(p => ({
    value: p.name,
    label: `${p.name}${p.model ? ` (${p.model})` : ''}${!p.isConnected ? ' - Offline' : ''}`,
  }));

  const sizeOptions = BUILT_IN_LABEL_SIZES.map(s => ({
    value: s.id,
    label: s.name,
  }));

  return (
    <BaseModal
      isOpen={isOpen}
      title="Print Label"
      icon={<Printer size={24} />}
      onClose={onClose}
      size="sm"
    >
      <div className="space-y-4">
        {/* Discovering State */}
        {modalState === 'discovering' && (
          <div className="flex flex-col items-center justify-center py-8">
            <Spinner size="md" />
            <span className="mt-3 text-sm text-muted-foreground">Detecting printer...</span>
          </div>
        )}

        {/* No Printers State */}
        {modalState === 'no-printers' && (
          <div className="space-y-4">
            <AlertBanner variant="warning" title="No printer detected">
              <ul className="text-sm mt-2 space-y-1 list-disc list-inside">
                <li>Make sure Dymo Label Software is installed and running</li>
                <li>Check that the printer is connected via USB</li>
                <li>Try restarting the Dymo Web Service</li>
              </ul>
            </AlertBanner>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleRetry} leftIcon={<RefreshCw size={16} />}>
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Ready State */}
        {modalState === 'ready' && (
          <>
            {/* Label Preview */}
            <div className="bg-muted/30 rounded-lg p-4">
              <LabelPreview
                lines={labelLines}
                size={selectedSize}
                sdkPreview={preview}
                isLoadingPreview={isRenderingPreview}
              />
            </div>

            {/* Printer Selection */}
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Printer"
                options={printerOptions}
                value={selectedPrinter?.name ?? ''}
                onChange={value => {
                  const printer = availablePrinters.find(p => p.name === value);
                  selectPrinter(printer ?? null);
                }}
              />
              <Select
                label="Label Size"
                options={sizeOptions}
                value={selectedSizeId}
                onChange={value => {
                  if (typeof value === 'string') {
                    setSelectedSizeId(value);
                  }
                }}
              />
            </div>

            {/* Copies */}
            <div>
              <span className="block text-sm font-medium text-secondary-foreground mb-1">
                Copies
              </span>
              <NumberInput
                value={copies}
                onChange={setCopies}
                min={1}
                max={50}
                className="w-24"
                aria-label="Number of copies to print"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Print multiple identical labels (max 50)
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handlePrint}
                disabled={!selectedPrinter}
                leftIcon={<Printer size={16} />}
              >
                Print {copies > 1 ? `${copies} Labels` : 'Label'}
              </Button>
            </div>
          </>
        )}

        {/* Printing State */}
        {modalState === 'printing' && (
          <div className="flex flex-col items-center justify-center py-8">
            <Spinner size="md" />
            <span className="mt-3 text-sm text-muted-foreground">
              Sending {copies > 1 ? `${copies} labels` : 'label'} to printer...
            </span>
          </div>
        )}

        {/* Success State */}
        {modalState === 'success' && (
          <div className="space-y-4">
            <AlertBanner variant="success">
              {lastResult?.printedCount ?? copies} label
              {(lastResult?.printedCount ?? copies) > 1 ? 's' : ''} sent to printer
            </AlertBanner>
            <div className="flex justify-end">
              <Button variant="primary" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        )}

        {/* Error State (with printers available) */}
        {modalState === 'error' && availablePrinters.length > 0 && (
          <div className="space-y-4">
            <AlertBanner variant="error" title="Print failed">
              {error}
            </AlertBanner>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleRetry} leftIcon={<RefreshCw size={16} />}>
                Retry
              </Button>
            </div>
          </div>
        )}
      </div>
    </BaseModal>
  );
}
