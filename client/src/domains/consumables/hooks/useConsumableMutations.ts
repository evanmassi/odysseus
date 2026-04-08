/**
 * Consumable Mutation Hooks
 *
 * Create, update, delete mutations for consumable categories, locations, products,
 * documents, barcodes, stock operations, and bulk actions.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';

import { ConsumableService } from '../services/ConsumableService';

import type {
  CreateConsumableCategoryRequest,
  UpdateConsumableCategoryRequest,
  CreateConsumableLocationRequest,
  UpdateConsumableLocationRequest,
  CreateConsumableProductRequest,
  UpdateConsumableProductRequest,
  CreateConsumableBarcodeRequest,
  UpdateConsumableBarcodeRequest,
  CreateConsumableDocumentRequest,
  RecordConsumableTransactionRequest,
  RecordConsumableStockCountRequest,
  ConsumableBulkReceiveRequest,
  ConsumableBulkConsumeRequest,
  CreateConsumablePackagingLevelRequest,
} from '@odysseus/shared-schemas';

// Categories

export function useCreateConsumableCategoryMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateConsumableCategoryRequest) => ConsumableService.createCategory(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.consumables.categories(labId) });
    },
  });
}

export function useUpdateConsumableCategoryMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateConsumableCategoryRequest }) =>
      ConsumableService.updateCategory(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.consumables.categories(labId) });
    },
  });
}

export function useDeleteConsumableCategoryMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ConsumableService.deleteCategory(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.consumables.categories(labId) });
    },
  });
}

// Locations

export function useCreateConsumableLocationMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateConsumableLocationRequest) => ConsumableService.createLocation(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.consumables.locations(labId) });
    },
  });
}

export function useUpdateConsumableLocationMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateConsumableLocationRequest }) =>
      ConsumableService.updateLocation(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.consumables.locations(labId) });
    },
  });
}

export function useDeleteConsumableLocationMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ConsumableService.deleteLocation(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.consumables.locations(labId) });
    },
  });
}

// Products

export function useCreateConsumableProductMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateConsumableProductRequest) => ConsumableService.createProduct(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.consumables.products(labId) });
    },
  });
}

export function useUpdateConsumableProductMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateConsumableProductRequest }) =>
      ConsumableService.updateProduct(id, data),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.consumables.products(labId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.consumables.detail(labId, id) });
    },
  });
}

export function useArchiveConsumableProductMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ConsumableService.archiveProduct(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.consumables.products(labId) });
    },
  });
}

export function useDeleteConsumableProductMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ConsumableService.deleteProduct(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.consumables.products(labId) });
    },
  });
}

// Documents

export function useAddConsumableDocumentMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      data,
    }: {
      productId: string;
      data: CreateConsumableDocumentRequest;
    }) => ConsumableService.addDocument(productId, data),
    onSuccess: (_, { productId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.consumables.detail(labId, productId),
      });
    },
  });
}

export function useRemoveConsumableDocumentMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, docId }: { productId: string; docId: string }) =>
      ConsumableService.removeDocument(productId, docId),
    onSuccess: (_, { productId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.consumables.detail(labId, productId),
      });
    },
  });
}

// Barcodes

export function useAddConsumableBarcodeMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      data,
    }: {
      productId: string;
      data: CreateConsumableBarcodeRequest;
    }) => ConsumableService.addBarcode(productId, data),
    onSuccess: (_, { productId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.consumables.detail(labId, productId),
      });
    },
  });
}

export function useUpdateConsumableBarcodeMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      barcodeId,
      data,
    }: {
      productId: string;
      barcodeId: string;
      data: UpdateConsumableBarcodeRequest;
    }) => ConsumableService.updateBarcode(productId, barcodeId, data),
    onSuccess: (_, { productId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.consumables.detail(labId, productId),
      });
    },
  });
}

export function useRemoveConsumableBarcodeMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, barcodeId }: { productId: string; barcodeId: string }) =>
      ConsumableService.removeBarcode(productId, barcodeId),
    onSuccess: (_, { productId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.consumables.detail(labId, productId),
      });
    },
  });
}

// Barcode regeneration

export function useRegenerateInternalBarcodeMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => ConsumableService.regenerateInternalBarcode(productId),
    onSuccess: (_, productId) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.consumables.detail(labId, productId),
      });
    },
  });
}

// Packaging levels

export function useAddConsumablePackagingLevelMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      data,
    }: {
      productId: string;
      data: CreateConsumablePackagingLevelRequest;
    }) => ConsumableService.addPackagingLevel(productId, data),
    onSuccess: (_, { productId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.consumables.detail(labId, productId),
      });
    },
  });
}

export function useUpdateConsumablePackagingLevelMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      levelId,
      quantity,
    }: {
      productId: string;
      levelId: string;
      quantity: number;
    }) => ConsumableService.updatePackagingLevel(productId, levelId, quantity),
    onSuccess: (_, { productId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.consumables.detail(labId, productId),
      });
    },
  });
}

export function useRemoveConsumablePackagingLevelMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, levelId }: { productId: string; levelId: string }) =>
      ConsumableService.removePackagingLevel(productId, levelId),
    onSuccess: (_, { productId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.consumables.detail(labId, productId),
      });
    },
  });
}

// Stock operations

export function useRecordConsumableTransactionMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RecordConsumableTransactionRequest) =>
      ConsumableService.recordTransaction(data),
    onSuccess: (_, data) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.consumables.detail(labId, data.productId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.consumables.products(labId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.consumables.reorderList(labId) });
    },
  });
}

export function useRecordConsumableStockCountMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RecordConsumableStockCountRequest) =>
      ConsumableService.recordStockCount(data),
    onSuccess: (_, data) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.consumables.detail(labId, data.productId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.consumables.products(labId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.consumables.reorderList(labId) });
    },
  });
}

// Bulk operations

export type ConsumableBulkAction =
  | { type: 'receive'; data: ConsumableBulkReceiveRequest }
  | { type: 'consume'; data: ConsumableBulkConsumeRequest }
  | { type: 'reassign-category'; productIds: string[]; categoryId: string }
  | { type: 'archive'; productIds: string[] };

export function useConsumableBulkReceiveMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ConsumableBulkReceiveRequest) => ConsumableService.bulkReceive(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.consumables.all(labId) });
    },
  });
}

export function useConsumableBulkConsumeMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ConsumableBulkConsumeRequest) => ConsumableService.bulkConsume(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.consumables.all(labId) });
    },
  });
}

export function useConsumableBulkUpdateMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (action: ConsumableBulkAction) => {
      switch (action.type) {
        case 'receive':
          return ConsumableService.bulkReceive(action.data);
        case 'consume':
          return ConsumableService.bulkConsume(action.data);
        case 'reassign-category':
          return ConsumableService.bulkReassignCategory(action.productIds, action.categoryId);
        case 'archive':
          return ConsumableService.bulkArchive(action.productIds);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.consumables.all(labId) });
    },
  });
}
