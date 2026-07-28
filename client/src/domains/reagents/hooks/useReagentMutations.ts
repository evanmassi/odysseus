/**
 * Reagent Mutations
 *
 * Writes against the reagent catalog.
 */

import { useMutation } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';

import { ReagentService } from '../services/ReagentService';

import type {
  CreateReagentCategoryRequest,
  UpdateReagentCategoryRequest,
} from '@odysseus/shared-schemas';

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
