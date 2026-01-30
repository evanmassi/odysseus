/**
 * PrintService Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { BUILT_IN_LABEL_SIZES, DEFAULT_PRINT_OPTIONS } from '../types';

import { PrintService } from './PrintService';

import type { PrinterDriver, PrinterInfo, LabelLines, PrintOptions, PreviewResult } from '../types';

const defaultLines: LabelLines = {
  line1: 'Test Cell',
  line2: 'ID-001',
};

const defaultOptions: PrintOptions = {
  ...DEFAULT_PRINT_OPTIONS,
  labelSize: BUILT_IN_LABEL_SIZES[1],
};

function createMockDriver(overrides: Partial<PrinterDriver> = {}): PrinterDriver {
  return {
    type: 'dymo',
    displayName: 'Mock Dymo Driver',
    checkAvailability: vi.fn(() => Promise.resolve({ available: true })),
    getPrinters: vi.fn(() =>
      Promise.resolve([{ name: 'Mock Printer', driverType: 'dymo', isConnected: true }])
    ),
    print: vi.fn(() => Promise.resolve({ success: true, printedCount: 1, failedCount: 0 })),
    ...overrides,
  };
}

describe('PrintService', () => {
  beforeEach(() => {
    PrintService.clearDrivers();
  });

  describe('registerDriver', () => {
    it('should register a driver', () => {
      const driver = createMockDriver();
      PrintService.registerDriver(driver);

      expect(PrintService.getRegisteredDriverTypes()).toContain('dymo');
    });

    it('should replace existing driver of same type', () => {
      const driver1 = createMockDriver({ displayName: 'Driver 1' });
      const driver2 = createMockDriver({ displayName: 'Driver 2' });

      PrintService.registerDriver(driver1);
      PrintService.registerDriver(driver2);

      expect(PrintService.getRegisteredDriverTypes()).toHaveLength(1);
    });
  });

  describe('discoverPrinters', () => {
    it('should return printers from available drivers', async () => {
      const driver = createMockDriver();
      PrintService.registerDriver(driver);

      const printers = await PrintService.discoverPrinters();

      expect(printers).toHaveLength(1);
      expect(printers[0].name).toBe('Mock Printer');
    });

    it('should not return printers from unavailable drivers', async () => {
      const driver = createMockDriver({
        checkAvailability: vi.fn(() =>
          Promise.resolve({ available: false, reason: 'Not installed' })
        ),
      });
      PrintService.registerDriver(driver);

      const printers = await PrintService.discoverPrinters();

      expect(printers).toHaveLength(0);
    });

    it('should handle driver errors gracefully', async () => {
      const driver = createMockDriver({
        checkAvailability: vi.fn(() => Promise.reject(new Error('Driver crash'))),
      });
      PrintService.registerDriver(driver);

      const printers = await PrintService.discoverPrinters();

      expect(printers).toHaveLength(0);
    });

    it('should aggregate printers from multiple drivers', async () => {
      const dymoDriver = createMockDriver({
        type: 'dymo',
        getPrinters: vi.fn(() =>
          Promise.resolve([{ name: 'Dymo Printer', driverType: 'dymo', isConnected: true }])
        ),
      });
      const zebraDriver = createMockDriver({
        type: 'zebra',
        getPrinters: vi.fn(() =>
          Promise.resolve([{ name: 'Zebra Printer', driverType: 'zebra', isConnected: true }])
        ),
      });

      PrintService.registerDriver(dymoDriver);
      PrintService.registerDriver(zebraDriver);

      const printers = await PrintService.discoverPrinters();

      expect(printers).toHaveLength(2);
    });
  });

  describe('print', () => {
    it('should route print to correct driver', async () => {
      const mockPrint = vi.fn(() =>
        Promise.resolve({ success: true, printedCount: 1, failedCount: 0 })
      );
      const driver = createMockDriver({ print: mockPrint });
      PrintService.registerDriver(driver);

      const printer: PrinterInfo = { name: 'Test', driverType: 'dymo', isConnected: true };
      await PrintService.print(defaultLines, printer, defaultOptions);

      expect(mockPrint).toHaveBeenCalledWith(defaultLines, 'Test', defaultOptions);
    });

    it('should return error for unregistered driver type', async () => {
      const printer: PrinterInfo = { name: 'Test', driverType: 'zebra', isConnected: true };
      const result = await PrintService.print(defaultLines, printer, defaultOptions);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No driver registered');
    });

    it('should handle driver print errors', async () => {
      const driver = createMockDriver({
        print: vi.fn(() => Promise.reject(new Error('Print failed'))),
      });
      PrintService.registerDriver(driver);

      const printer: PrinterInfo = { name: 'Test', driverType: 'dymo', isConnected: true };
      const result = await PrintService.print(defaultLines, printer, defaultOptions);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Print failed');
    });
  });

  describe('renderPreview', () => {
    it('should return preview from driver that supports it', async () => {
      const mockPreview: PreviewResult = {
        imageData: 'data:image/png;base64,abc123',
        width: 300,
        height: 100,
      };
      const driver = createMockDriver({
        renderPreview: vi.fn(() => Promise.resolve(mockPreview)),
      });
      PrintService.registerDriver(driver);

      const result = await PrintService.renderPreview(defaultLines, 'dymo', defaultOptions);

      expect(result).toEqual(mockPreview);
    });

    it('should return null for driver without renderPreview', async () => {
      const driver = createMockDriver();
      // driver has no renderPreview method
      PrintService.registerDriver(driver);

      const result = await PrintService.renderPreview(defaultLines, 'dymo', defaultOptions);

      expect(result).toBeNull();
    });

    it('should return null for unregistered driver', async () => {
      const result = await PrintService.renderPreview(defaultLines, 'zebra', defaultOptions);

      expect(result).toBeNull();
    });

    it('should return null when renderPreview throws', async () => {
      const driver = createMockDriver({
        renderPreview: vi.fn(() => Promise.reject(new Error('Render failed'))),
      });
      PrintService.registerDriver(driver);

      const result = await PrintService.renderPreview(defaultLines, 'dymo', defaultOptions);

      expect(result).toBeNull();
    });

    it('should pass correct options to driver renderPreview', async () => {
      const mockRenderPreview = vi.fn(() =>
        Promise.resolve({ imageData: 'data:image/png;base64,x', width: 100, height: 50 })
      );
      const driver = createMockDriver({ renderPreview: mockRenderPreview });
      PrintService.registerDriver(driver);

      const customOptions: PrintOptions = {
        labelSize: BUILT_IN_LABEL_SIZES[0],
        copies: 5,
      };
      await PrintService.renderPreview(defaultLines, 'dymo', customOptions);

      expect(mockRenderPreview).toHaveBeenCalledWith(defaultLines, customOptions);
    });
  });

  describe('getDriverStatus', () => {
    it('should return availability from registered driver', async () => {
      const driver = createMockDriver({
        checkAvailability: vi.fn(() => Promise.resolve({ available: true })),
      });
      PrintService.registerDriver(driver);

      const status = await PrintService.getDriverStatus('dymo');

      expect(status.available).toBe(true);
    });

    it('should return unavailable for unregistered driver', async () => {
      const status = await PrintService.getDriverStatus('zebra');

      expect(status.available).toBe(false);
      expect(status.reason).toContain('not registered');
    });
  });

  describe('edge cases', () => {
    it('should handle empty label lines', async () => {
      const mockPrint = vi.fn(() =>
        Promise.resolve({ success: true, printedCount: 1, failedCount: 0 })
      );
      const driver = createMockDriver({ print: mockPrint });
      PrintService.registerDriver(driver);

      const emptyLines: LabelLines = {};
      const printer: PrinterInfo = { name: 'Test', driverType: 'dymo', isConnected: true };
      const result = await PrintService.print(emptyLines, printer, defaultOptions);

      expect(result.success).toBe(true);
      expect(mockPrint).toHaveBeenCalledWith(emptyLines, 'Test', defaultOptions);
    });

    it('should handle zero copies', async () => {
      const mockPrint = vi.fn(() =>
        Promise.resolve({ success: true, printedCount: 0, failedCount: 0 })
      );
      const driver = createMockDriver({ print: mockPrint });
      PrintService.registerDriver(driver);

      const printer: PrinterInfo = { name: 'Test', driverType: 'dymo', isConnected: true };
      const options: PrintOptions = { ...defaultOptions, copies: 0 };
      await PrintService.print(defaultLines, printer, options);

      expect(mockPrint).toHaveBeenCalled();
    });

    it('should handle max copies (50)', async () => {
      const mockPrint = vi.fn(() =>
        Promise.resolve({ success: true, printedCount: 50, failedCount: 0 })
      );
      const driver = createMockDriver({ print: mockPrint });
      PrintService.registerDriver(driver);

      const printer: PrinterInfo = { name: 'Test', driverType: 'dymo', isConnected: true };
      const options: PrintOptions = { ...defaultOptions, copies: 50 };
      const result = await PrintService.print(defaultLines, printer, options);

      expect(result.printedCount).toBe(50);
    });
  });
});
