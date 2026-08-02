/**
 * Supply Mutation Hooks
 *
 * Create, update, delete mutations for supply categories, locations, items,
 * documents, barcodes, stock operations, and bulk actions.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';

import { SupplyService } from '../services/SupplyService';

import type {
  CreateSupplyCategoryRequest,
  UpdateSupplyCategoryRequest,
  CreateSupplyItemRequest,
  UpdateSupplyItemRequest,
  CreateSupplyBarcodeRequest,
  UpdateSupplyBarcodeRequest,
  CreateSupplyDocumentRequest,
  UpdateSupplyDocumentRequest,
  RecordSupplyTransactionRequest,
  RecordSupplyStockCountRequest,
  SupplyBulkReceiveRequest,
  SupplyBulkIssueRequest,
  VoidSupplyTransactionRequest,
  SupplyBulkVoidRequest,
  SetAttributeValueRequest,
  CreateSupplyPackagingLevelRequest,
} from '@odysseus/shared-schemas';

// Categories

export function useCreateSupplyCategoryMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: (data: CreateSupplyCategoryRequest) => SupplyService.createCategory(data),
    meta: { invalidates: [queryKeys.supplies.categories(labId)] },
  });
}

export function useUpdateSupplyCategoryMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSupplyCategoryRequest }) =>
      SupplyService.updateCategory(id, data),
    meta: { invalidates: [queryKeys.supplies.categories(labId)] },
  });
}

export function useDeleteSupplyCategoryMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: (id: string) => SupplyService.deleteCategory(id),
    meta: { invalidates: [queryKeys.supplies.categories(labId)] },
  });
}

// Items

export function useCreateSupplyItemMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: (data: CreateSupplyItemRequest) => SupplyService.createItem(data),
    meta: { invalidates: [queryKeys.supplies.items(labId)] },
  });
}

export function useUpdateSupplyItemMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSupplyItemRequest }) =>
      SupplyService.updateItem(id, data),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.supplies.items(labId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.supplies.detail(labId, id) });
    },
  });
}

export function useArchiveSupplyItemMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: (id: string) => SupplyService.archiveItem(id),
    meta: { invalidates: [queryKeys.supplies.items(labId)] },
  });
}

export function useDeleteSupplyItemMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: (id: string) => SupplyService.deleteItem(id),
    meta: { invalidates: [queryKeys.supplies.items(labId)] },
  });
}

// Documents

export function useAddSupplyDocumentMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: CreateSupplyDocumentRequest }) =>
      SupplyService.addDocument(itemId, data),
    onSuccess: (_, { itemId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.supplies.detail(labId, itemId),
      });
    },
  });
}

export function useUpdateSupplyDocumentMutation() {
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
      data: UpdateSupplyDocumentRequest;
    }) => SupplyService.updateDocument(itemId, docId, data),
    onSuccess: (_, { itemId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.supplies.detail(labId, itemId),
      });
    },
  });
}

export function useRemoveSupplyDocumentMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, docId }: { itemId: string; docId: string }) =>
      SupplyService.removeDocument(itemId, docId),
    onSuccess: (_, { itemId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.supplies.detail(labId, itemId),
      });
    },
  });
}

// Barcodes

export function useAddSupplyBarcodeMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: CreateSupplyBarcodeRequest }) =>
      SupplyService.addBarcode(itemId, data),
    onSuccess: (_, { itemId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.supplies.detail(labId, itemId),
      });
    },
  });
}

export function useUpdateSupplyBarcodeMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      itemId,
      barcodeId,
      data,
    }: {
      itemId: string;
      barcodeId: string;
      data: UpdateSupplyBarcodeRequest;
    }) => SupplyService.updateBarcode(itemId, barcodeId, data),
    onSuccess: (_, { itemId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.supplies.detail(labId, itemId),
      });
    },
  });
}

export function useRemoveSupplyBarcodeMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, barcodeId }: { itemId: string; barcodeId: string }) =>
      SupplyService.removeBarcode(itemId, barcodeId),
    onSuccess: (_, { itemId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.supplies.detail(labId, itemId),
      });
    },
  });
}

export function useRegenerateInternalBarcodeMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => SupplyService.regenerateInternalBarcode(itemId),
    onSuccess: (_, itemId) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.supplies.detail(labId, itemId),
      });
    },
  });
}

// Packaging levels

export function useAddSupplyPackagingLevelMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: CreateSupplyPackagingLevelRequest }) =>
      SupplyService.addPackagingLevel(itemId, data),
    onSuccess: (_, { itemId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.supplies.detail(labId, itemId),
      });
    },
  });
}

export function useRemoveSupplyPackagingLevelMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, levelId }: { itemId: string; levelId: string }) =>
      SupplyService.removePackagingLevel(itemId, levelId),
    onSuccess: (_, { itemId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.supplies.detail(labId, itemId),
      });
    },
  });
}

// Stock operations

export function useRecordSupplyTransactionMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RecordSupplyTransactionRequest) => SupplyService.recordTransaction(data),
    onSuccess: (_, data) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.supplies.detail(labId, data.itemId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.supplies.items(labId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.supplies.transactions(labId, data.itemId),
      });
    },
  });
}

export function useRecordSupplyStockCountMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RecordSupplyStockCountRequest) => SupplyService.recordStockCount(data),
    onSuccess: (_, data) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.supplies.detail(labId, data.itemId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.supplies.items(labId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.supplies.transactions(labId, data.itemId),
      });
    },
  });
}

// Bulk operations

type SupplyBulkAction =
  | { type: 'reassign-category'; itemIds: string[]; categoryId: string }
  | { type: 'archive'; itemIds: string[] };

export function useSupplyBulkReceiveMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: (data: SupplyBulkReceiveRequest) => SupplyService.bulkReceive(data),
    meta: { invalidates: [queryKeys.supplies.all(labId)] },
  });
}

export function useSupplyBulkIssueMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: (data: SupplyBulkIssueRequest) => SupplyService.bulkIssue(data),
    meta: { invalidates: [queryKeys.supplies.all(labId)] },
  });
}

export function useSupplyBulkUpdateMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: (action: SupplyBulkAction) => {
      switch (action.type) {
        case 'reassign-category':
          return SupplyService.bulkReassignCategory(action.itemIds, action.categoryId);
        case 'archive':
          return SupplyService.bulkArchive(action.itemIds);
      }
    },
    meta: { invalidates: [queryKeys.supplies.all(labId)] },
  });
}

export function useVoidSupplyTransactionMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      transactionId,
      data,
    }: {
      transactionId: string;
      data: VoidSupplyTransactionRequest;
    }) => SupplyService.voidTransaction(transactionId, data),
    onSuccess: result => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.supplies.detail(labId, result.original.itemId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.supplies.items(labId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.supplies.transactions(labId, result.original.itemId),
      });
    },
  });
}

export function useSupplyBulkVoidMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: (data: SupplyBulkVoidRequest) => SupplyService.bulkVoidTransactions(data),
    meta: { invalidates: [queryKeys.supplies.all(labId)] },
  });
}

export function useSetSupplyAttributeValueMutation() {
  const queryClient = useQueryClient();
  const labId = useLabId();

  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: SetAttributeValueRequest }) =>
      SupplyService.setAttributeValue(itemId, data),
    // The list row carries an attribute summary for filtering, so both caches go stale.
    onSuccess: (_result, { itemId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.supplies.detail(labId, itemId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.supplies.items(labId) });
    },
  });
}
