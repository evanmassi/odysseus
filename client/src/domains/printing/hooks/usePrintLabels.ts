/**
 * usePrintLabels Hook
 *
 * Manages printer discovery and print operations for the UI.
 */

import { useState, useCallback, useEffect } from 'react';

import { PrintService } from '../services/PrintService';
import { DEFAULT_PRINT_OPTIONS } from '../types';

import type { PrinterInfo, PrintOptions, PrintResult, LabelLines, PreviewResult } from '../types';

interface UsePrintLabelsState {
  availablePrinters: PrinterInfo[];
  selectedPrinter: PrinterInfo | null;
  isDiscovering: boolean;
  isPrinting: boolean;
  isRenderingPreview: boolean;
  error: string | null;
  lastResult: PrintResult | null;
  preview: PreviewResult | null;
}

interface UsePrintLabelsReturn extends UsePrintLabelsState {
  discoverPrinters: () => Promise<void>;
  selectPrinter: (printer: PrinterInfo | null) => void;
  printLabel: (label: LabelLines, options?: Partial<PrintOptions>) => Promise<PrintResult>;
  renderPreview: (
    label: LabelLines,
    options?: Partial<PrintOptions>
  ) => Promise<PreviewResult | null>;
  clearError: () => void;
  clearResult: () => void;
  clearPreview: () => void;
}

export function usePrintLabels(): UsePrintLabelsReturn {
  const [state, setState] = useState<UsePrintLabelsState>({
    availablePrinters: [],
    selectedPrinter: null,
    isDiscovering: false,
    isPrinting: false,
    isRenderingPreview: false,
    error: null,
    lastResult: null,
    preview: null,
  });

  const discoverPrinters = useCallback(async () => {
    setState(prev => ({ ...prev, isDiscovering: true, error: null }));

    try {
      const printers = await PrintService.discoverPrinters();

      setState(prev => {
        // Auto-select first connected printer if none selected
        const selectedPrinter =
          prev.selectedPrinter ??
          printers.find(p => p.isConnected) ??
          (printers.length > 0 ? printers[0] : null);

        return {
          ...prev,
          availablePrinters: printers,
          selectedPrinter,
          isDiscovering: false,
          error: printers.length === 0 ? 'No printers detected' : null,
        };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to discover printers';
      setState(prev => ({
        ...prev,
        isDiscovering: false,
        error: message,
      }));
    }
  }, []);

  const selectPrinter = useCallback((printer: PrinterInfo | null) => {
    setState(prev => ({ ...prev, selectedPrinter: printer, error: null }));
  }, []);

  const printLabel = useCallback(
    async (label: LabelLines, options?: Partial<PrintOptions>): Promise<PrintResult> => {
      if (!state.selectedPrinter) {
        const result: PrintResult = {
          success: false,
          printedCount: 0,
          failedCount: options?.copies ?? 1,
          error: 'No printer selected',
        };
        setState(prev => ({ ...prev, lastResult: result, error: result.error ?? null }));
        return result;
      }

      setState(prev => ({ ...prev, isPrinting: true, error: null, lastResult: null }));

      const printOptions: PrintOptions = {
        ...DEFAULT_PRINT_OPTIONS,
        ...options,
      };

      try {
        const result = await PrintService.print(label, state.selectedPrinter, printOptions);

        setState(prev => ({
          ...prev,
          isPrinting: false,
          lastResult: result,
          error: result.success ? null : (result.error ?? 'Print failed'),
        }));

        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Print failed';
        const result: PrintResult = {
          success: false,
          printedCount: 0,
          failedCount: printOptions.copies,
          error: message,
        };

        setState(prev => ({
          ...prev,
          isPrinting: false,
          lastResult: result,
          error: message,
        }));

        return result;
      }
    },
    [state.selectedPrinter]
  );

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const clearResult = useCallback(() => {
    setState(prev => ({ ...prev, lastResult: null }));
  }, []);

  const clearPreview = useCallback(() => {
    setState(prev => ({ ...prev, preview: null }));
  }, []);

  const renderPreview = useCallback(
    async (label: LabelLines, options?: Partial<PrintOptions>): Promise<PreviewResult | null> => {
      // Need a printer selected to know which driver to use
      if (!state.selectedPrinter) {
        return null;
      }

      setState(prev => ({ ...prev, isRenderingPreview: true }));

      const previewOptions: PrintOptions = {
        ...DEFAULT_PRINT_OPTIONS,
        ...options,
      };

      try {
        const preview = await PrintService.renderPreview(
          label,
          state.selectedPrinter.driverType,
          previewOptions
        );

        setState(prev => ({
          ...prev,
          isRenderingPreview: false,
          preview,
        }));

        return preview;
      } catch {
        setState(prev => ({
          ...prev,
          isRenderingPreview: false,
          preview: null,
        }));
        return null;
      }
    },
    [state.selectedPrinter]
  );

  // Auto-discover on mount
  useEffect(() => {
    void discoverPrinters();
  }, [discoverPrinters]);

  return {
    ...state,
    discoverPrinters,
    selectPrinter,
    printLabel,
    renderPreview,
    clearError,
    clearResult,
    clearPreview,
  };
}
