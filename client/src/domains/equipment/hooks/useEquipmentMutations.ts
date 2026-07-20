/**
 * Equipment Mutation Hooks
 *
 * Create, update, delete mutations for equipment categories, items, documents, and maintenance logs.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';

import { EquipmentService } from '../services/EquipmentService';

import type {
  CreateEquipmentCategoryRequest,
  UpdateEquipmentCategoryRequest,
  CreateEquipmentItemRequest,
  UpdateEquipmentItemRequest,
  DecommissionEquipmentItemRequest,
  CreateEquipmentDocumentRequest,
  UpdateEquipmentDocumentRequest,
  CreateEquipmentMaintenanceLogRequest,
  UpdateEquipmentMaintenanceLogRequest,
  EquipmentBulkStatusRequest,
  EquipmentBulkRelocateRequest,
} from '@odysseus/shared-schemas';

// Categories

export function useCreateEquipmentCategoryMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: (data: CreateEquipmentCategoryRequest) => EquipmentService.createCategory(data),
    meta: { invalidates: [queryKeys.equipment.categories(labId)] },
  });
}

export function useUpdateEquipmentCategoryMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEquipmentCategoryRequest }) =>
      EquipmentService.updateCategory(id, data),
    meta: { invalidates: [queryKeys.equipment.categories(labId)] },
  });
}

export function useDeleteEquipmentCategoryMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: (id: string) => EquipmentService.deleteCategory(id),
    meta: { invalidates: [queryKeys.equipment.categories(labId)] },
  });
}

// Items

export function useCreateEquipmentItemMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: (data: CreateEquipmentItemRequest) => EquipmentService.create(data),
    meta: { invalidates: [queryKeys.equipment.items(labId)] },
  });
}

export function useUpdateEquipmentItemMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEquipmentItemRequest }) =>
      EquipmentService.update(id, data),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.equipment.detail(labId, id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.equipment.items(labId) });
    },
  });
}

export function useDecommissionEquipmentItemMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DecommissionEquipmentItemRequest }) =>
      EquipmentService.decommission(id, data),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.equipment.items(labId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.equipment.detail(labId, id) });
    },
  });
}

export function useDeleteEquipmentItemMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: (id: string) => EquipmentService.delete(id),
    meta: { invalidates: [queryKeys.equipment.items(labId)] },
  });
}

// Documents

export function useAddEquipmentDocumentMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: CreateEquipmentDocumentRequest }) =>
      EquipmentService.addDocument(itemId, data),
    onSuccess: (_, { itemId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.equipment.detail(labId, itemId) });
    },
  });
}

export function useUpdateEquipmentDocumentMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      itemId,
      docId,
      data,
    }: {
      itemId: string;
      docId: string;
      data: UpdateEquipmentDocumentRequest;
    }) => EquipmentService.updateDocument(itemId, docId, data),
    onSuccess: (_, { itemId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.equipment.detail(labId, itemId) });
    },
  });
}

export function useRemoveEquipmentDocumentMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, docId }: { itemId: string; docId: string }) =>
      EquipmentService.removeDocument(itemId, docId),
    onSuccess: (_, { itemId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.equipment.detail(labId, itemId) });
    },
  });
}

// Maintenance log

export function useAddEquipmentMaintenanceEntryMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      itemId,
      data,
    }: {
      itemId: string;
      data: CreateEquipmentMaintenanceLogRequest;
    }) => EquipmentService.addMaintenanceEntry(itemId, data),
    onSuccess: (_, { itemId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.equipment.detail(labId, itemId) });
      // Item's next_maintenance_date may have changed
      void queryClient.invalidateQueries({ queryKey: queryKeys.equipment.items(labId) });
    },
  });
}

export function useUpdateEquipmentMaintenanceEntryMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      itemId,
      entryId,
      data,
    }: {
      itemId: string;
      entryId: string;
      data: UpdateEquipmentMaintenanceLogRequest;
    }) => EquipmentService.updateMaintenanceEntry(itemId, entryId, data),
    onSuccess: (_, { itemId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.equipment.detail(labId, itemId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.equipment.items(labId) });
    },
  });
}

// Bulk operations

export type EquipmentBulkAction =
  | { type: 'maintenance'; itemIds: string[]; data: CreateEquipmentMaintenanceLogRequest }
  | {
      type: 'status';
      itemIds: string[];
      data: EquipmentBulkStatusRequest['data'];
    }
  | { type: 'relocate'; itemIds: string[]; data: EquipmentBulkRelocateRequest['data'] };

export function useEquipmentBulkUpdateMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: (action: EquipmentBulkAction) => {
      switch (action.type) {
        case 'maintenance':
          return EquipmentService.bulkLogMaintenance(action.itemIds, action.data);
        case 'status':
          return EquipmentService.bulkChangeStatus(action.itemIds, action.data);
        case 'relocate':
          return EquipmentService.bulkRelocate(action.itemIds, action.data);
      }
    },
    meta: { invalidates: [queryKeys.equipment.all(labId)] },
  });
}

export function useDeleteEquipmentMaintenanceEntryMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, entryId }: { itemId: string; entryId: string }) =>
      EquipmentService.deleteMaintenanceEntry(itemId, entryId),
    onSuccess: (_, { itemId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.equipment.detail(labId, itemId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.equipment.items(labId) });
    },
  });
}
