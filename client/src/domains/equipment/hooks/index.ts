export {
  useEquipmentCategoriesQuery,
  useEquipmentItemsQuery,
  useEquipmentItemDetailQuery,
  useEquipmentMaintenanceLogQuery,
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
