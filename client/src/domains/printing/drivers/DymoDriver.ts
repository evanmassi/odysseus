/**
 * Dymo Label Printer Driver
 *
 * Implements PrinterDriver for Dymo LabelWriter printers using the Dymo Connect Framework SDK.
 * SDK is lazy-loaded on first use to avoid loading overhead for users who don't print.
 */

import { generateLabelXml } from '../templates/dymo';

import type {
  PrinterDriver,
  DriverAvailability,
  PrinterInfo,
  LabelLines,
  PrintOptions,
  PrintResult,
  PreviewResult,
} from '../types';

const SDK_URL = 'https://labelwriter.com/software/dls/sdk/js/dymo.connect.framework.js';

/** Subset of Dymo SDK types we use */
interface DymoPrinter {
  name: string;
  modelName?: string;
  printerType?: string;
  isConnected?: boolean;
  isLocal?: boolean;
}

interface DymoLabel {
  print(printerName: string): void;
  isValidLabel(): boolean;
  /**
   * Render a PNG preview of the label.
   * @param renderParamsXml - Optional XML for render parameters (resolution, etc.)
   * @param printerName - Optional printer name for accurate preview
   * @returns Base64-encoded PNG string
   */
  render(renderParamsXml?: string, printerName?: string): string;
}

interface DymoFramework {
  init(callback: () => void): void;
  checkEnvironment(): { isBrowserSupported: boolean; isFrameworkInstalled: boolean };
  getPrinters(): DymoPrinter[];
  getPrintersAsync(): Promise<DymoPrinter[]>;
  openLabelXml(xml: string): DymoLabel;
}

declare global {
  interface Window {
    dymo?: {
      label: {
        framework: DymoFramework;
      };
    };
  }
}

/** For dependency injection in tests */
export interface DymoSdkProvider {
  loadSdk(): Promise<DymoFramework>;
}

class DymoDriverImpl implements PrinterDriver {
  readonly type = 'dymo' as const;
  readonly displayName = 'Dymo LabelWriter';

  private sdk: DymoFramework | null = null;
  private sdkLoadPromise: Promise<void> | null = null;
  private sdkProvider: DymoSdkProvider | null = null;

  constructor(sdkProvider?: DymoSdkProvider) {
    this.sdkProvider = sdkProvider ?? null;
  }

  async checkAvailability(): Promise<DriverAvailability> {
    try {
      await this.ensureSdkLoaded();

      if (!this.sdk) {
        return { available: false, reason: 'SDK failed to load' };
      }

      const env = this.sdk.checkEnvironment();

      if (!env.isBrowserSupported) {
        return { available: false, reason: 'Browser not supported by Dymo SDK' };
      }

      if (!env.isFrameworkInstalled) {
        return {
          available: false,
          reason: 'Dymo Label Software not installed or service not running',
        };
      }

      // Check if any printers are available
      const printers = await this.getPrintersInternal();
      if (printers.length === 0) {
        return { available: false, reason: 'No Dymo printers detected' };
      }

      return { available: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { available: false, reason: `SDK error: ${message}` };
    }
  }

  async getPrinters(): Promise<PrinterInfo[]> {
    await this.ensureSdkLoaded();
    return this.getPrintersInternal();
  }

  async print(label: LabelLines, printerName: string, options: PrintOptions): Promise<PrintResult> {
    try {
      await this.ensureSdkLoaded();

      if (!this.sdk) {
        return {
          success: false,
          printedCount: 0,
          failedCount: options.copies,
          error: 'SDK not available',
        };
      }

      const labelXml = generateLabelXml(label, options.labelSize);
      const dymoLabel = this.sdk.openLabelXml(labelXml);

      if (!dymoLabel.isValidLabel()) {
        return {
          success: false,
          printedCount: 0,
          failedCount: options.copies,
          error: 'Generated label XML is invalid',
        };
      }

      // Print requested number of copies
      let printedCount = 0;
      let lastError: string | undefined;

      for (let i = 0; i < options.copies; i++) {
        try {
          dymoLabel.print(printerName);
          printedCount++;
        } catch (error) {
          lastError = error instanceof Error ? error.message : 'Print failed';
          // Continue trying remaining copies
        }
      }

      const failedCount = options.copies - printedCount;

      if (failedCount === 0) {
        return { success: true, printedCount, failedCount: 0 };
      }

      if (printedCount === 0) {
        return {
          success: false,
          printedCount: 0,
          failedCount: options.copies,
          error: lastError ?? 'All prints failed',
        };
      }

      // Partial success
      return {
        success: false,
        printedCount,
        failedCount,
        error: `${printedCount} of ${options.copies} labels sent. ${lastError}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown print error';
      return {
        success: false,
        printedCount: 0,
        failedCount: options.copies,
        error: message,
      };
    }
  }

  async renderPreview(label: LabelLines, options: PrintOptions): Promise<PreviewResult | null> {
    try {
      await this.ensureSdkLoaded();

      if (!this.sdk) {
        return null;
      }

      const labelXml = generateLabelXml(label, options.labelSize);
      const dymoLabel = this.sdk.openLabelXml(labelXml);

      if (!dymoLabel.isValidLabel()) {
        return null;
      }

      // Render at high resolution for crisp preview
      // Scale factor: render at ~300 DPI equivalent for the label size
      const dpi = 300;
      const targetWidth = Math.round(options.labelSize.width * dpi);
      const targetHeight = Math.round(options.labelSize.height * dpi);

      // Dymo render() returns base64 PNG string
      const base64Png = dymoLabel.render();

      if (!base64Png) {
        return null;
      }

      return {
        imageData: `data:image/png;base64,${base64Png}`,
        width: targetWidth,
        height: targetHeight,
      };
    } catch {
      // Preview rendering is non-critical, return null on failure
      return null;
    }
  }

  private async ensureSdkLoaded(): Promise<void> {
    if (this.sdk) return;

    if (!this.sdkLoadPromise) {
      this.sdkLoadPromise = this.loadSdk();
    }

    await this.sdkLoadPromise;
  }

  private async loadSdk(): Promise<void> {
    // Use injected provider for testing
    if (this.sdkProvider) {
      this.sdk = await this.sdkProvider.loadSdk();
      return;
    }

    // Check if SDK is already loaded (e.g., via script tag)
    if (window.dymo?.label?.framework) {
      await this.initializeSdk(window.dymo.label.framework);
      return;
    }

    // Dynamically load the SDK script
    await this.loadSdkScript();

    if (!window.dymo?.label?.framework) {
      throw new Error('Dymo SDK failed to initialize after script load');
    }

    await this.initializeSdk(window.dymo.label.framework);
  }

  private loadSdkScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if script is already being loaded or loaded
      const existingScript = document.querySelector(`script[src="${SDK_URL}"]`);
      if (existingScript) {
        // Wait for existing script to load
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', () =>
          reject(new Error('Failed to load Dymo SDK'))
        );
        return;
      }

      const script = document.createElement('script');
      script.src = SDK_URL;
      script.async = true;

      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Dymo SDK from CDN'));

      document.head.appendChild(script);
    });
  }

  private initializeSdk(framework: DymoFramework): Promise<void> {
    return new Promise(resolve => {
      framework.init(() => {
        this.sdk = framework;
        resolve();
      });
    });
  }

  private async getPrintersInternal(): Promise<PrinterInfo[]> {
    if (!this.sdk) return [];

    try {
      // Try async method first (newer SDK)
      const printers = await this.sdk.getPrintersAsync();
      return printers.map(this.mapPrinter);
    } catch {
      // Fall back to sync method
      try {
        const printers = this.sdk.getPrinters();
        return printers.map(this.mapPrinter);
      } catch {
        return [];
      }
    }
  }

  private mapPrinter = (printer: DymoPrinter): PrinterInfo => ({
    name: printer.name,
    driverType: 'dymo',
    model: printer.modelName,
    isConnected: printer.isConnected ?? printer.isLocal ?? true,
  });
}

export { DymoDriverImpl as DymoDriver };
