/**
 * Storage Navigator
 *
 * Barrel exports for the tree-based storage location picker.
 */

export type { StorageHierarchy, SelectedLocation } from './storageNavigatorTypes';

export { StorageNavigator } from './StorageNavigator';
export { BoxOccupancyMatrix } from './BoxOccupancyMatrix';
export { buildStorageHierarchy } from './buildStorageHierarchy';
export { computeNavigatorOccupancy, boxOccupancyKey } from './storageNavigatorOccupancy';
export type { NavigatorOccupancy } from './storageNavigatorOccupancy';
