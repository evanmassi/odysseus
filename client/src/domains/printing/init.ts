/**
 * Printing Domain Initialization
 *
 * Registers available printer drivers at app startup.
 */

import { PrintService } from './services/PrintService';

export function initializePrintService(): void {
  // import { DymoDriver } from './drivers/DymoDriver';
  // PrintService.registerDriver(new DymoDriver());
  void PrintService;
}
