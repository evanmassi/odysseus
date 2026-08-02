/**
 * Lab Location Mutations
 *
 * Create, update and delete lab locations. Stock reads location names, so the catalogs are
 * invalidated alongside the tree.
 */

import { useMutation } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';

import { LabLocationService } from '../services/LabLocationService';

import type { CreateLabLocationRequest, UpdateLabLocationRequest } from '@odysseus/shared-schemas';

function locationInvalidates(labId: string | undefined) {
  return [
    queryKeys.labLocations.all(labId),
    queryKeys.supplies.all(labId),
    queryKeys.reagents.all(labId),
  ];
}

export function useCreateLabLocationMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: (data: CreateLabLocationRequest) => LabLocationService.create(data),
    meta: { invalidates: locationInvalidates(labId) },
  });
}

export function useUpdateLabLocationMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLabLocationRequest }) =>
      LabLocationService.update(id, data),
    meta: { invalidates: locationInvalidates(labId) },
  });
}

export function useDeleteLabLocationMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: (id: string) => LabLocationService.remove(id),
    meta: { invalidates: locationInvalidates(labId) },
  });
}
