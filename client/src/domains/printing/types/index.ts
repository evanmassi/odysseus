/**
 * Printing Domain Types
 *
 * Printer-agnostic abstraction layer. All printer drivers implement PrinterDriver.
 */

export type PrinterType = 'dymo' | 'zebra' | 'brother' | 'browser';

export interface DriverAvailability {
  available: boolean;
  reason?: string;
}

export interface PrinterInfo {
  name: string;
  driverType: PrinterType;
  model?: string;
  isConnected: boolean;
}

export interface LabelSize {
  id: string;
  width: number;
  height: number;
  name: string;
  isCustom?: boolean;
}

// Diversified Biotech DTCR series label sizes
export const BUILT_IN_LABEL_SIZES: LabelSize[] = [
  { id: 'dtcr-1000', width: 1.05, height: 0.5, name: '1.05" × 0.50"' },
  { id: 'dtcr-2000', width: 1.5, height: 0.5, name: '1.50" × 0.50"' },
  { id: 'dtcr-3000', width: 1.5, height: 0.75, name: '1.50" × 0.75"' },
];

export const DEFAULT_LABEL_SIZE_ID = 'dtcr-2000';

export interface PrintOptions {
  labelSize: LabelSize;
  copies: number;
}

export const DEFAULT_PRINT_OPTIONS: PrintOptions = {
  labelSize: BUILT_IN_LABEL_SIZES.find(s => s.id === DEFAULT_LABEL_SIZE_ID)!,
  copies: 1,
};

/** Lines are omitted from printed label when undefined */
export interface LabelLines {
  line1?: string;
  line2?: string;
  line3?: string;
  line4?: string;
}

export interface PrintResult {
  success: boolean;
  printedCount: number;
  failedCount: number;
  error?: string;
}

export interface PreviewResult {
  /** Base64-encoded PNG image data (data URL format) */
  imageData: string;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
}

export interface PrinterDriver {
  readonly type: PrinterType;
  readonly displayName: string;

  /** Tests whether SDK is loaded and required services are running */
  checkAvailability(): Promise<DriverAvailability>;

  getPrinters(): Promise<PrinterInfo[]>;

  print(label: LabelLines, printerName: string, options: PrintOptions): Promise<PrintResult>;

  /**
   * Render a preview image of the label (optional).
   * Returns a base64-encoded PNG if supported, or null if not available.
   */
  renderPreview?(label: LabelLines, options: PrintOptions): Promise<PreviewResult | null>;
}
