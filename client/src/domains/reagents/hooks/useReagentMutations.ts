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
  CreateReagentDocumentRequest,
  UpdateReagentDocumentRequest,
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
