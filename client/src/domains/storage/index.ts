/**
 * Storage Domain
 *
 * Manages storage equipment (tanks, racks, boxes) and configuration.
 * Types from shared-schemas, data from React Query.
 */

export * from './hooks';

export { StorageService } from './services/StorageService';

export type { GridConfiguration } from '@odysseus/shared-schemas';

export { getGridTotalPositions, DEFAULT_GRID_CONFIG } from './utils/gridHelpers';

export { formatPositionRangesForBox } from './utils/positionDisplayUtils';
