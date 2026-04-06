export {
  useEquipmentCategoriesQuery,
  useEquipmentItemsQuery,
  useEquipmentItemDetailQuery,
} from './useEquipmentQueries';

export {
  useCreateEquipmentCategoryMutation,
  useUpdateEquipmentCategoryMutation,
  useDeleteEquipmentCategoryMutation,
  useCreateEquipmentItemMutation,
  useUpdateEquipmentItemMutation,
  useDecommissionEquipmentItemMutation,
  useDeleteEquipmentItemMutation,
  useAddEquipmentDocumentMutation,
  useRemoveEquipmentDocumentMutation,
  useAddEquipmentMaintenanceEntryMutation,
  useUpdateEquipmentMaintenanceEntryMutation,
  useDeleteEquipmentMaintenanceEntryMutation,
  useEquipmentBulkUpdateMutation,
  type EquipmentBulkAction,
} from './useEquipmentMutations';
