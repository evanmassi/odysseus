/**
 * Donor Mutation Hooks
 *
 * Create, update, delete donors and manage collection history entries.
 */

import { useMutation } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';

import { DonorService } from '../services/DonorService';

import type {
  CreateDonorRequest,
  UpdateDonorRequest,
  CreateCollectionHistoryRequest,
  UpdateCollectionHistoryRequest,
} from '@odysseus/shared-schemas';

export function useCreateDonorMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: (data: CreateDonorRequest) => DonorService.create(data),
    meta: { invalidates: [queryKeys.donors.all(labId)] },
  });
}

export function useUpdateDonorMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDonorRequest }) =>
      DonorService.update(id, data),
    meta: { invalidates: [queryKeys.donors.all(labId)] },
  });
}

export function useDeleteDonorMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: (id: string) => DonorService.delete(id),
    meta: { invalidates: [queryKeys.donors.all(labId)] },
  });
}

export function useAddCollectionHistoryMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: ({ donorId, data }: { donorId: string; data: CreateCollectionHistoryRequest }) =>
      DonorService.addCollectionHistory(donorId, data),
    meta: { invalidates: [queryKeys.donors.all(labId)] },
  });
}

export function useUpdateCollectionHistoryMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: ({
      historyId,
      data,
    }: {
      historyId: string;
      data: UpdateCollectionHistoryRequest;
    }) => DonorService.updateCollectionHistory(historyId, data),
    meta: { invalidates: [queryKeys.donors.all(labId)] },
  });
}

export function useDeleteCollectionHistoryMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: (historyId: string) => DonorService.deleteCollectionHistory(historyId),
    meta: { invalidates: [queryKeys.donors.all(labId)] },
  });
}
