/**
 * PrintService
 *
 * Manages registered printer drivers and routes print jobs to the appropriate driver.
 */

import type {
  PrinterDriver,
  PrinterType,
  PrinterInfo,
  DriverAvailability,
  LabelLines,
  PrintOptions,
  PrintResult,
} from '../types';

class PrintServiceImpl {
  private drivers: Map<PrinterType, PrinterDriver> = new Map();

  registerDriver(driver: PrinterDriver): void {
    if (this.drivers.has(driver.type)) {
      // eslint-disable-next-line no-console -- Dev warning for duplicate driver registration
      console.warn(`PrintService: Driver "${driver.type}" already registered, replacing.`);
    }
    this.drivers.set(driver.type, driver);
  }

  unregisterDriver(type: PrinterType): void {
    this.drivers.delete(type);
  }

  getRegisteredDriverTypes(): PrinterType[] {
    return Array.from(this.drivers.keys());
  }

  async getDriverStatus(type: PrinterType): Promise<DriverAvailability> {
    const driver = this.drivers.get(type);
    if (!driver) {
      return { available: false, reason: `Driver "${type}" not registered` };
    }
    return driver.checkAvailability();
  }

  async discoverPrinters(): Promise<PrinterInfo[]> {
    const allPrinters: PrinterInfo[] = [];

    const checkPromises = Array.from(this.drivers.entries()).map(async ([type, driver]) => {
      try {
        const availability = await driver.checkAvailability();
        if (availability.available) {
          const printers = await driver.getPrinters();
          return printers;
        }
      } catch (error) {
        // eslint-disable-next-line no-console -- Driver errors should be visible for debugging
        console.warn(`PrintService: Error checking driver "${type}":`, error);
      }
      return [];
    });

    const results = await Promise.all(checkPromises);
    for (const printers of results) {
      allPrinters.push(...printers);
    }

    return allPrinters;
  }

  async print(
    label: LabelLines,
    printer: PrinterInfo,
    options: PrintOptions
  ): Promise<PrintResult> {
    const driver = this.drivers.get(printer.driverType);

    if (!driver) {
      return {
        success: false,
        printedCount: 0,
        failedCount: options.copies,
        error: `No driver registered for printer type "${printer.driverType}"`,
      };
    }

    try {
      return await driver.print(label, printer.name, options);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown print error';
      return {
        success: false,
        printedCount: 0,
        failedCount: options.copies,
        error: errorMessage,
      };
    }
  }

  clearDrivers(): void {
    this.drivers.clear();
  }
}

export const PrintService = new PrintServiceImpl();
