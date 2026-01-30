/**
 * Printing Domain Initialization
 *
 * Registers available printer drivers at app startup.
 */

import { DymoDriver } from './drivers';
import { PrintService } from './services/PrintService';

export function initializePrintService(): void {
  PrintService.registerDriver(new DymoDriver());
}
