/**
 * Storage Hooks
 *
 * React Query hooks for storage equipment operations.
 */

export { useStorageData } from './useStorageData';
export { useStorageSync } from './useStorageSync';
export { useStorageLocationNames } from './useStorageLocationNames';
export { useStorageOwnership } from './useStorageOwnership';
export { useHasSeededStorage, useDemoTaxonomyLock } from './useSeededStorage';

export {
  useAddTankMutation,
  useUpdateTankMutation,
  useDeleteTankMutation,
  useAddRacksMutation,
  useUpdateRackMutation,
  useDeleteRackMutation,
  useAssignRackMutation,
  useAddBoxesMutation,
  useUpdateBoxMutation,
  useDeleteBoxMutation,
  useAssignBoxMutation,
  useBulkUnassignMutation,
  useBulkReassignMutation,
  useUpdateResourceLabelMutation,
} from './useStorageMutations';
