/**
 * Storage Domain
 *
 * Manages storage equipment (tanks, racks, boxes) and configuration.
 * Types from shared-schemas, data from React Query.
 */

export * from './hooks';

export { StorageService } from './services/StorageService';

export { getGridTotalPositions, DEFAULT_GRID_CONFIG } from './utils/gridHelpers';
export {
  formatPositionForBox,
  getAxisLabelsForBox,
  formatPositionRangesForBox,
} from './utils/positionDisplayUtils';

export {
  StorageNavigator,
  BoxOccupancyMatrix,
  buildStorageHierarchy,
} from './ui/components/storage-navigator';

export type { GridConfiguration } from '@odysseus/shared-schemas';
export type { StorageHierarchy, SelectedLocation } from './ui/components/storage-navigator';
