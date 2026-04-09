/**
 * Supply Mutation Hooks
 *
 * Create, update, delete mutations for supply categories, locations, products,
 * documents, barcodes, stock operations, and bulk actions.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';

import { SupplyService } from '../services/SupplyService';

import type {
  CreateSupplyCategoryRequest,
  UpdateSupplyCategoryRequest,
  CreateSupplyLocationRequest,
  UpdateSupplyLocationRequest,
  CreateSupplyProductRequest,
  UpdateSupplyProductRequest,
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
  CreateSupplyPackagingLevelRequest,
} from '@odysseus/shared-schemas';

// Categories

export function useCreateSupplyCategoryMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSupplyCategoryRequest) => SupplyService.createCategory(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.supplies.categories(labId) });
    },
  });
}

export function useUpdateSupplyCategoryMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSupplyCategoryRequest }) =>
      SupplyService.updateCategory(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.supplies.categories(labId) });
    },
  });
}

export function useDeleteSupplyCategoryMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => SupplyService.deleteCategory(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.supplies.categories(labId) });
    },
  });
}

// Locations

export function useCreateSupplyLocationMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSupplyLocationRequest) => SupplyService.createLocation(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.supplies.locations(labId) });
    },
  });
}

export function useUpdateSupplyLocationMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSupplyLocationRequest }) =>
      SupplyService.updateLocation(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.supplies.locations(labId) });
    },
  });
}

export function useDeleteSupplyLocationMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => SupplyService.deleteLocation(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.supplies.locations(labId) });
    },
  });
}

// Products

export function useCreateSupplyProductMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSupplyProductRequest) => SupplyService.createProduct(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.supplies.products(labId) });
    },
  });
}

export function useUpdateSupplyProductMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSupplyProductRequest }) =>
      SupplyService.updateProduct(id, data),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.supplies.products(labId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.supplies.detail(labId, id) });
    },
  });
}

export function useArchiveSupplyProductMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => SupplyService.archiveProduct(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.supplies.products(labId) });
    },
  });
}

export function useDeleteSupplyProductMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => SupplyService.deleteProduct(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.supplies.products(labId) });
    },
  });
}

// Documents

export function useAddSupplyDocumentMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, data }: { productId: string; data: CreateSupplyDocumentRequest }) =>
      SupplyService.addDocument(productId, data),
    onSuccess: (_, { productId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.supplies.detail(labId, productId),
      });
    },
  });
}

export function useUpdateSupplyDocumentMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      docId,
      data,
    }: {
      productId: string;
      docId: string;
      data: UpdateSupplyDocumentRequest;
    }) => SupplyService.updateDocument(productId, docId, data),
    onSuccess: (_, { productId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.supplies.detail(labId, productId),
      });
    },
  });
}

export function useRemoveSupplyDocumentMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, docId }: { productId: string; docId: string }) =>
      SupplyService.removeDocument(productId, docId),
    onSuccess: (_, { productId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.supplies.detail(labId, productId),
      });
    },
  });
}

// Barcodes

export function useAddSupplyBarcodeMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, data }: { productId: string; data: CreateSupplyBarcodeRequest }) =>
      SupplyService.addBarcode(productId, data),
    onSuccess: (_, { productId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.supplies.detail(labId, productId),
      });
    },
  });
}

export function useUpdateSupplyBarcodeMutation() {
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
      data: UpdateSupplyBarcodeRequest;
    }) => SupplyService.updateBarcode(productId, barcodeId, data),
    onSuccess: (_, { productId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.supplies.detail(labId, productId),
      });
    },
  });
}

export function useRemoveSupplyBarcodeMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, barcodeId }: { productId: string; barcodeId: string }) =>
      SupplyService.removeBarcode(productId, barcodeId),
    onSuccess: (_, { productId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.supplies.detail(labId, productId),
      });
    },
  });
}

// Barcode regeneration

export function useRegenerateInternalBarcodeMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => SupplyService.regenerateInternalBarcode(productId),
    onSuccess: (_, productId) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.supplies.detail(labId, productId),
      });
    },
  });
}

// Packaging levels

export function useAddSupplyPackagingLevelMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      data,
    }: {
      productId: string;
      data: CreateSupplyPackagingLevelRequest;
    }) => SupplyService.addPackagingLevel(productId, data),
    onSuccess: (_, { productId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.supplies.detail(labId, productId),
      });
    },
  });
}

export function useUpdateSupplyPackagingLevelMutation() {
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
    }) => SupplyService.updatePackagingLevel(productId, levelId, quantity),
    onSuccess: (_, { productId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.supplies.detail(labId, productId),
      });
    },
  });
}

export function useRemoveSupplyPackagingLevelMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, levelId }: { productId: string; levelId: string }) =>
      SupplyService.removePackagingLevel(productId, levelId),
    onSuccess: (_, { productId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.supplies.detail(labId, productId),
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
        queryKey: queryKeys.supplies.detail(labId, data.productId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.supplies.products(labId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.supplies.reorderList(labId) });
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
        queryKey: queryKeys.supplies.detail(labId, data.productId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.supplies.products(labId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.supplies.reorderList(labId) });
    },
  });
}

// Bulk operations

export type SupplyBulkAction =
  | { type: 'receive'; data: SupplyBulkReceiveRequest }
  | { type: 'issue'; data: SupplyBulkIssueRequest }
  | { type: 'reassign-category'; productIds: string[]; categoryId: string }
  | { type: 'archive'; productIds: string[] };

export function useSupplyBulkReceiveMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SupplyBulkReceiveRequest) => SupplyService.bulkReceive(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.supplies.all(labId) });
    },
  });
}

export function useSupplyBulkIssueMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SupplyBulkIssueRequest) => SupplyService.bulkIssue(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.supplies.all(labId) });
    },
  });
}

export function useSupplyBulkUpdateMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (action: SupplyBulkAction) => {
      switch (action.type) {
        case 'receive':
          return SupplyService.bulkReceive(action.data);
        case 'issue':
          return SupplyService.bulkIssue(action.data);
        case 'reassign-category':
          return SupplyService.bulkReassignCategory(action.productIds, action.categoryId);
        case 'archive':
          return SupplyService.bulkArchive(action.productIds);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.supplies.all(labId) });
    },
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
        queryKey: queryKeys.supplies.detail(labId, result.original.productId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.supplies.products(labId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.supplies.reorderList(labId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.supplies.transactions(labId, result.original.productId),
      });
    },
  });
}

export function useSupplyBulkVoidMutation() {
  const labId = useLabId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SupplyBulkVoidRequest) => SupplyService.bulkVoidTransactions(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.supplies.all(labId) });
    },
  });
}
