/**
 * Location Mutations
 *
 * Create, update and delete lab locations. Stock reads location names, so the catalogs are
 * invalidated alongside the tree.
 */

import { useMutation } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';

import { LocationService } from '../services/LocationService';

import type { CreateLocationRequest, UpdateLocationRequest } from '@odysseus/shared-schemas';

function locationInvalidates(labId: string | undefined) {
  return [
    queryKeys.locations.all(labId),
    queryKeys.supplies.all(labId),
    queryKeys.reagents.all(labId),
  ];
}

export function useCreateLocationMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: (data: CreateLocationRequest) => LocationService.create(data),
    meta: { invalidates: locationInvalidates(labId) },
  });
}

export function useUpdateLocationMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLocationRequest }) =>
      LocationService.update(id, data),
    meta: { invalidates: locationInvalidates(labId) },
  });
}

export function useDeleteLocationMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: (id: string) => LocationService.remove(id),
    meta: { invalidates: locationInvalidates(labId) },
  });
}
