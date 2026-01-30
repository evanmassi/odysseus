/**
 * Dymo Driver Tests
 */

import { describe, it, expect, vi } from 'vitest';

import { BUILT_IN_LABEL_SIZES, DEFAULT_PRINT_OPTIONS } from '../types';

import { DymoDriver, type DymoSdkProvider } from './DymoDriver';

import type { LabelLines, PrintOptions } from '../types';

const defaultLines: LabelLines = {
  line1: 'iPSC-Neuron',
  line2: 'INT-4521',
  line3: '2D-Diff',
  line4: '01/29/26',
};

const defaultOptions: PrintOptions = {
  ...DEFAULT_PRINT_OPTIONS,
  labelSize: BUILT_IN_LABEL_SIZES[1],
};

function createMockSdk(
  overrides: Partial<
    ReturnType<DymoSdkProvider['loadSdk']> extends Promise<infer T> ? T : never
  > = {}
) {
  return {
    init: vi.fn((cb: () => void) => cb()),
    checkEnvironment: vi.fn(() => ({
      isBrowserSupported: true,
      isFrameworkInstalled: true,
    })),
    getPrinters: vi.fn(() => [
      { name: 'DYMO LabelWriter 450', modelName: 'LabelWriter 450', isConnected: true },
    ]),
    getPrintersAsync: vi.fn(() =>
      Promise.resolve([
        { name: 'DYMO LabelWriter 450', modelName: 'LabelWriter 450', isConnected: true },
      ])
    ),
    openLabelXml: vi.fn(() => ({
      print: vi.fn(),
      isValidLabel: vi.fn(() => true),
      render: vi.fn(() => 'base64PngData'),
    })),
    ...overrides,
  };
}

function createMockProvider(sdk: ReturnType<typeof createMockSdk>): DymoSdkProvider {
  return {
    loadSdk: vi.fn(() => Promise.resolve(sdk)),
  };
}

describe('DymoDriver', () => {
  describe('type and displayName', () => {
    it('should have correct type', () => {
      const driver = new DymoDriver();
      expect(driver.type).toBe('dymo');
    });

    it('should have correct displayName', () => {
      const driver = new DymoDriver();
      expect(driver.displayName).toBe('Dymo LabelWriter');
    });
  });

  describe('checkAvailability', () => {
    it('should return available when SDK loads and printers exist', async () => {
      const sdk = createMockSdk();
      const provider = createMockProvider(sdk);
      const driver = new DymoDriver(provider);

      const result = await driver.checkAvailability();

      expect(result.available).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should return unavailable when browser not supported', async () => {
      const sdk = createMockSdk({
        checkEnvironment: vi.fn(() => ({
          isBrowserSupported: false,
          isFrameworkInstalled: true,
        })),
      });
      const provider = createMockProvider(sdk);
      const driver = new DymoDriver(provider);

      const result = await driver.checkAvailability();

      expect(result.available).toBe(false);
      expect(result.reason).toContain('Browser not supported');
    });

    it('should return unavailable when framework not installed', async () => {
      const sdk = createMockSdk({
        checkEnvironment: vi.fn(() => ({
          isBrowserSupported: true,
          isFrameworkInstalled: false,
        })),
      });
      const provider = createMockProvider(sdk);
      const driver = new DymoDriver(provider);

      const result = await driver.checkAvailability();

      expect(result.available).toBe(false);
      expect(result.reason).toContain('Dymo Label Software not installed');
    });

    it('should return unavailable when no printers detected', async () => {
      const sdk = createMockSdk({
        getPrintersAsync: vi.fn(() => Promise.resolve([])),
        getPrinters: vi.fn(() => []),
      });
      const provider = createMockProvider(sdk);
      const driver = new DymoDriver(provider);

      const result = await driver.checkAvailability();

      expect(result.available).toBe(false);
      expect(result.reason).toContain('No Dymo printers detected');
    });

    it('should return unavailable when SDK fails to load', async () => {
      const provider: DymoSdkProvider = {
        loadSdk: vi.fn(() => Promise.reject(new Error('Network error'))),
      };
      const driver = new DymoDriver(provider);

      const result = await driver.checkAvailability();

      expect(result.available).toBe(false);
      expect(result.reason).toContain('Network error');
    });
  });

  describe('getPrinters', () => {
    it('should return mapped printer info', async () => {
      const sdk = createMockSdk({
        getPrintersAsync: vi.fn(() =>
          Promise.resolve([
            { name: 'Printer 1', modelName: 'Model A', isConnected: true },
            { name: 'Printer 2', modelName: 'Model B', isConnected: false },
          ])
        ),
      });
      const provider = createMockProvider(sdk);
      const driver = new DymoDriver(provider);

      const printers = await driver.getPrinters();

      expect(printers).toHaveLength(2);
      expect(printers[0]).toEqual({
        name: 'Printer 1',
        driverType: 'dymo',
        model: 'Model A',
        isConnected: true,
      });
      expect(printers[1]).toEqual({
        name: 'Printer 2',
        driverType: 'dymo',
        model: 'Model B',
        isConnected: false,
      });
    });

    it('should fall back to sync getPrinters if async fails', async () => {
      const sdk = createMockSdk({
        getPrintersAsync: vi.fn(() => Promise.reject(new Error('Async not supported'))),
        getPrinters: vi.fn(() => [
          { name: 'Sync Printer', modelName: 'Sync Model', isConnected: true },
        ]),
      });
      const provider = createMockProvider(sdk);
      const driver = new DymoDriver(provider);

      const printers = await driver.getPrinters();

      expect(printers).toHaveLength(1);
      expect(printers[0].name).toBe('Sync Printer');
    });

    it('should return empty array if both methods fail', async () => {
      const sdk = createMockSdk({
        getPrintersAsync: vi.fn(() => Promise.reject(new Error('Async failed'))),
        getPrinters: vi.fn(() => {
          throw new Error('Sync failed');
        }),
      });
      const provider = createMockProvider(sdk);
      const driver = new DymoDriver(provider);

      const printers = await driver.getPrinters();

      expect(printers).toEqual([]);
    });
  });

  describe('print', () => {
    it('should print label successfully', async () => {
      const mockPrint = vi.fn();
      const sdk = createMockSdk({
        openLabelXml: vi.fn(() => ({
          print: mockPrint,
          isValidLabel: vi.fn(() => true),
          render: vi.fn(() => 'base64PngData'),
        })),
      });
      const provider = createMockProvider(sdk);
      const driver = new DymoDriver(provider);

      const result = await driver.print(defaultLines, 'DYMO LabelWriter 450', defaultOptions);

      expect(result.success).toBe(true);
      expect(result.printedCount).toBe(1);
      expect(result.failedCount).toBe(0);
      expect(mockPrint).toHaveBeenCalledWith('DYMO LabelWriter 450');
    });

    it('should print multiple copies', async () => {
      const mockPrint = vi.fn();
      const sdk = createMockSdk({
        openLabelXml: vi.fn(() => ({
          print: mockPrint,
          isValidLabel: vi.fn(() => true),
          render: vi.fn(() => 'base64PngData'),
        })),
      });
      const provider = createMockProvider(sdk);
      const driver = new DymoDriver(provider);

      const options: PrintOptions = { ...defaultOptions, copies: 5 };
      const result = await driver.print(defaultLines, 'DYMO LabelWriter 450', options);

      expect(result.success).toBe(true);
      expect(result.printedCount).toBe(5);
      expect(result.failedCount).toBe(0);
      expect(mockPrint).toHaveBeenCalledTimes(5);
    });

    it('should return error if label is invalid', async () => {
      const sdk = createMockSdk({
        openLabelXml: vi.fn(() => ({
          print: vi.fn(),
          isValidLabel: vi.fn(() => false),
          render: vi.fn(() => 'base64PngData'),
        })),
      });
      const provider = createMockProvider(sdk);
      const driver = new DymoDriver(provider);

      const result = await driver.print(defaultLines, 'DYMO LabelWriter 450', defaultOptions);

      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid');
    });

    it('should handle partial failure gracefully', async () => {
      let callCount = 0;
      const mockPrint = vi.fn(() => {
        callCount++;
        if (callCount >= 3) {
          throw new Error('Print failed');
        }
      });
      const sdk = createMockSdk({
        openLabelXml: vi.fn(() => ({
          print: mockPrint,
          isValidLabel: vi.fn(() => true),
          render: vi.fn(() => 'base64PngData'),
        })),
      });
      const provider = createMockProvider(sdk);
      const driver = new DymoDriver(provider);

      const options: PrintOptions = { ...defaultOptions, copies: 5 };
      const result = await driver.print(defaultLines, 'DYMO LabelWriter 450', options);

      expect(result.success).toBe(false);
      expect(result.printedCount).toBe(2);
      expect(result.failedCount).toBe(3);
      expect(result.error).toContain('2 of 5');
    });

    it('should return error if SDK not available', async () => {
      const provider: DymoSdkProvider = {
        loadSdk: vi.fn(() => Promise.reject(new Error('SDK load failed'))),
      };
      const driver = new DymoDriver(provider);

      const result = await driver.print(defaultLines, 'DYMO LabelWriter 450', defaultOptions);

      expect(result.success).toBe(false);
      expect(result.failedCount).toBe(1);
      expect(result.error).toContain('SDK load failed');
    });
  });

  describe('SDK lazy loading', () => {
    it('should only load SDK once for multiple operations', async () => {
      const sdk = createMockSdk();
      const loadSdk = vi.fn(() => Promise.resolve(sdk));
      const provider: DymoSdkProvider = { loadSdk };
      const driver = new DymoDriver(provider);

      await driver.checkAvailability();
      await driver.getPrinters();
      await driver.print(defaultLines, 'DYMO LabelWriter 450', defaultOptions);

      expect(loadSdk).toHaveBeenCalledTimes(1);
    });
  });

  describe('renderPreview', () => {
    it('should return preview result when SDK renders successfully', async () => {
      const mockRender = vi.fn(() => 'mockBase64PngData');
      const sdk = createMockSdk({
        openLabelXml: vi.fn(() => ({
          print: vi.fn(),
          isValidLabel: vi.fn(() => true),
          render: mockRender,
        })),
      });
      const provider = createMockProvider(sdk);
      const driver = new DymoDriver(provider);

      const result = await driver.renderPreview(defaultLines, defaultOptions);

      expect(result).not.toBeNull();
      expect(result?.imageData).toBe('data:image/png;base64,mockBase64PngData');
      expect(result?.width).toBeGreaterThan(0);
      expect(result?.height).toBeGreaterThan(0);
      expect(mockRender).toHaveBeenCalled();
    });

    it('should return null when label is invalid', async () => {
      const sdk = createMockSdk({
        openLabelXml: vi.fn(() => ({
          print: vi.fn(),
          isValidLabel: vi.fn(() => false),
          render: vi.fn(() => 'mockBase64PngData'),
        })),
      });
      const provider = createMockProvider(sdk);
      const driver = new DymoDriver(provider);

      const result = await driver.renderPreview(defaultLines, defaultOptions);

      expect(result).toBeNull();
    });

    it('should return null when render returns empty string', async () => {
      const sdk = createMockSdk({
        openLabelXml: vi.fn(() => ({
          print: vi.fn(),
          isValidLabel: vi.fn(() => true),
          render: vi.fn(() => ''),
        })),
      });
      const provider = createMockProvider(sdk);
      const driver = new DymoDriver(provider);

      const result = await driver.renderPreview(defaultLines, defaultOptions);

      expect(result).toBeNull();
    });

    it('should return null when render throws', async () => {
      const sdk = createMockSdk({
        openLabelXml: vi.fn(() => ({
          print: vi.fn(),
          isValidLabel: vi.fn(() => true),
          render: vi.fn(() => {
            throw new Error('Render failed');
          }),
        })),
      });
      const provider = createMockProvider(sdk);
      const driver = new DymoDriver(provider);

      const result = await driver.renderPreview(defaultLines, defaultOptions);

      expect(result).toBeNull();
    });

    it('should return null when SDK fails to load', async () => {
      const provider: DymoSdkProvider = {
        loadSdk: vi.fn(() => Promise.reject(new Error('SDK load failed'))),
      };
      const driver = new DymoDriver(provider);

      const result = await driver.renderPreview(defaultLines, defaultOptions);

      expect(result).toBeNull();
    });

    it('should calculate dimensions based on label size', async () => {
      const sdk = createMockSdk();
      const provider = createMockProvider(sdk);
      const driver = new DymoDriver(provider);

      // Use DTCR-3000 which is 1.5" x 0.75"
      const largerSize = BUILT_IN_LABEL_SIZES[2]; // 1.50" × 0.75"
      const options: PrintOptions = { ...defaultOptions, labelSize: largerSize };

      const result = await driver.renderPreview(defaultLines, options);

      expect(result).not.toBeNull();
      // At 300 DPI: 1.5" * 300 = 450, 0.75" * 300 = 225
      expect(result?.width).toBe(450);
      expect(result?.height).toBe(225);
    });
  });
});
