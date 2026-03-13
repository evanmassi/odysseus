/**
 * Storage Hooks
 *
 * React Query hooks for storage equipment operations.
 */

// Data hooks
export { useStorageData, getStorageDataFromCache } from './useStorageData';

// Query hooks
export { useLoadStorageQuery } from './useStorageQueries';

// Sync hooks
export { useStorageSync } from './useStorageSync';

// Location hooks
export { useStorageLocationNames, type LocationDisplayNames } from './useStorageLocationNames';

// Permission & ownership hooks
export { useStoragePermissions } from './useStoragePermissions';
export { useStorageOwnership } from './useStorageOwnership';

// Equipment mutation hooks
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
  useInitializeConfigurationMutation,
  useUpdateResourceLabelMutation,
} from './useStorageMutations';
