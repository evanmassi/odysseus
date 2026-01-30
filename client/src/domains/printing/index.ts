/**
 * Printing Domain
 *
 * Label printing functionality with printer-agnostic abstraction.
 * Supports multiple printer types through a unified driver interface.
 */

// Types
export type {
  PrinterType,
  PrinterDriver,
  PrinterInfo,
  DriverAvailability,
  LabelSize,
  LabelLines,
  PrintOptions,
  PrintResult,
} from './types';

export { BUILT_IN_LABEL_SIZES, DEFAULT_LABEL_SIZE_ID, DEFAULT_PRINT_OPTIONS } from './types';

// Services
export { PrintService } from './services';

// Utilities
export {
  formatLabelDate,
  getResearcherInitials,
  buildLine,
  formatTubeForLabel,
  hasLabelContent,
  countLabelLines,
} from './utils';

// Initialization
export { initializePrintService } from './init';
