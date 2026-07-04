/**
 * Storage Hooks
 *
 * React Query hooks for storage equipment operations.
 */

export { useStorageData } from './useStorageData';
export { useStorageSync } from './useStorageSync';
export { useStorageLocationNames } from './useStorageLocationNames';
export { useStoragePermissions } from './useStoragePermissions';
export { useStorageOwnership } from './useStorageOwnership';

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
