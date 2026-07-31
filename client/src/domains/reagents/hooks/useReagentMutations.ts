/**
 * Reagent Mutations
 *
 * Writes against the reagent catalog.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';

import { ReagentService } from '../services/ReagentService';

import type {
  CreateReagentCategoryRequest,
  UpdateReagentCategoryRequest,
  CreateReagentItemRequest,
  UpdateReagentItemRequest,
  CreateReagentDocumentRequest,
  UpdateReagentDocumentRequest,
  CreateReagentBarcodeRequest,
  UpdateReagentBarcodeRequest,
  CreateReagentPackagingLevelRequest,
  SetReagentAttributeValueRequest,
  UpdateReagentLotRequest,
  RecordReagentTransactionRequest,
  RecordReagentStockCountRequest,
  VoidReagentTransactionRequest,
  ReagentBulkVoidRequest,
} from '@odysseus/shared-schemas';

// Categories

export function useCreateReagentCategoryMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: (data: CreateReagentCategoryRequest) => ReagentService.createCategory(data),
    meta: { invalidates: [queryKeys.reagents.categories(labId)] },
  });
}

export function useUpdateReagentCategoryMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateReagentCategoryRequest }) =>
      ReagentService.updateCategory(id, data),
    meta: { invalidates: [queryKeys.reagents.categories(labId)] },
  });
}

export function useDeleteReagentCategoryMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: (id: string) => ReagentService.deleteCategory(id),
    meta: { invalidates: [queryKeys.reagents.categories(labId)] },
  });
}

// Items

export function useCreateReagentItemMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: (data: CreateReagentItemRequest) => ReagentService.createItem(data),
    meta: { invalidates: [queryKeys.reagents.items(labId)] },
  });
}

export function useUpdateReagentItemMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateReagentItemRequest }) =>
      ReagentService.updateItem(id, data),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reagents.items(labId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.reagents.detail(labId, id) });
    },
  });
}

export function useArchiveReagentItemMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: (id: string) => ReagentService.archiveItem(id),
    meta: { invalidates: [queryKeys.reagents.items(labId)] },
  });
}

export function useDeleteReagentItemMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: (id: string) => ReagentService.deleteItem(id),
    meta: { invalidates: [queryKeys.reagents.items(labId)] },
  });
}

// Documents

export function useAddReagentDocumentMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: CreateReagentDocumentRequest }) =>
      ReagentService.addDocument(itemId, data),
    onSuccess: (_, { itemId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reagents.detail(labId, itemId) });
    },
  });
}

export function useUpdateReagentDocumentMutation() {
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
      data: UpdateReagentDocumentRequest;
    }) => ReagentService.updateDocument(itemId, docId, data),
    onSuccess: (_, { itemId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reagents.detail(labId, itemId) });
    },
  });
}

export function useRemoveReagentDocumentMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, docId }: { itemId: string; docId: string }) =>
      ReagentService.removeDocument(itemId, docId),
    onSuccess: (_, { itemId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reagents.detail(labId, itemId) });
    },
  });
}

// Barcodes

export function useAddReagentBarcodeMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: CreateReagentBarcodeRequest }) =>
      ReagentService.addBarcode(itemId, data),
    onSuccess: (_, { itemId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reagents.detail(labId, itemId) });
    },
  });
}

export function useUpdateReagentBarcodeMutation() {
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
      data: UpdateReagentBarcodeRequest;
    }) => ReagentService.updateBarcode(itemId, barcodeId, data),
    onSuccess: (_, { itemId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reagents.detail(labId, itemId) });
    },
  });
}

export function useRemoveReagentBarcodeMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, barcodeId }: { itemId: string; barcodeId: string }) =>
      ReagentService.removeBarcode(itemId, barcodeId),
    onSuccess: (_, { itemId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reagents.detail(labId, itemId) });
    },
  });
}

export function useRegenerateReagentInternalBarcodeMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => ReagentService.regenerateInternalBarcode(itemId),
    onSuccess: (_, itemId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reagents.detail(labId, itemId) });
    },
  });
}

// Lots

export function useUpdateReagentLotMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      itemId,
      lotId,
      data,
    }: {
      itemId: string;
      lotId: string;
      data: UpdateReagentLotRequest;
    }) => ReagentService.updateLot(itemId, lotId, data),
    onSuccess: (_, { itemId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reagents.detail(labId, itemId) });
      // An expiry correction moves the item's soonest-expiry and expired-lot rollup.
      void queryClient.invalidateQueries({ queryKey: queryKeys.reagents.items(labId) });
    },
  });
}

// Stock operations

function useStockInvalidation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return (itemId: string) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.reagents.detail(labId, itemId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.reagents.items(labId) });
  };
}

export function useRecordReagentTransactionMutation() {
  const invalidateStock = useStockInvalidation();

  return useMutation({
    mutationFn: (data: RecordReagentTransactionRequest) => ReagentService.recordTransaction(data),
    onSuccess: (_, data) => invalidateStock(data.itemId),
  });
}

export function useRecordReagentStockCountMutation() {
  const invalidateStock = useStockInvalidation();

  return useMutation({
    mutationFn: (data: RecordReagentStockCountRequest) => ReagentService.recordStockCount(data),
    onSuccess: (_, data) => invalidateStock(data.itemId),
  });
}

export function useVoidReagentTransactionMutation() {
  const invalidateStock = useStockInvalidation();

  return useMutation({
    mutationFn: ({
      transactionId,
      data,
    }: {
      transactionId: string;
      data: VoidReagentTransactionRequest;
    }) => ReagentService.voidTransaction(transactionId, data),
    onSuccess: result => invalidateStock(result.original.itemId),
  });
}

export function useReagentBulkVoidMutation() {
  const invalidateStock = useStockInvalidation();

  return useMutation({
    // itemId isn't sent — it scopes the cache invalidation below.
    mutationFn: ({ data }: { itemId: string; data: ReagentBulkVoidRequest }) =>
      ReagentService.bulkVoidTransactions(data),
    onSuccess: (_, { itemId }) => invalidateStock(itemId),
  });
}

// Packaging levels

export function useAddReagentPackagingLevelMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: CreateReagentPackagingLevelRequest }) =>
      ReagentService.addPackagingLevel(itemId, data),
    onSuccess: (_, { itemId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reagents.detail(labId, itemId) });
    },
  });
}

export function useRemoveReagentPackagingLevelMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, levelId }: { itemId: string; levelId: string }) =>
      ReagentService.removePackagingLevel(itemId, levelId),
    onSuccess: (_, { itemId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reagents.detail(labId, itemId) });
    },
  });
}

// Attribute values

export function useSetReagentAttributeValueMutation() {
  const queryClient = useQueryClient();
  const labId = useLabId();

  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: SetReagentAttributeValueRequest }) =>
      ReagentService.setAttributeValue(itemId, data),
    // The list row carries an attribute summary for filtering, so both caches go stale.
    onSuccess: (_result, { itemId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reagents.detail(labId, itemId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.reagents.items(labId) });
    },
  });
}
