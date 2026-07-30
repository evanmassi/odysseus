/**
 * Custom Unit Mutations
 *
 * Writes against the lab's custom units. A rename rewrites the unit string on every item
 * that holds it, so both catalogs are invalidated with the list.
 */

import { useMutation } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';

import { CustomUnitService } from '../services/CustomUnitService';

import type { CreateCustomUnitRequest, RenameCustomUnitRequest } from '@odysseus/shared-schemas';

function customUnitInvalidates(labId: string | undefined) {
  return [
    queryKeys.customUnits.all(labId),
    queryKeys.supplies.all(labId),
    queryKeys.reagents.all(labId),
  ];
}

export function useCreateCustomUnitMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: (data: CreateCustomUnitRequest) => CustomUnitService.create(data),
    meta: { invalidates: customUnitInvalidates(labId) },
  });
}

export function useRenameCustomUnitMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RenameCustomUnitRequest }) =>
      CustomUnitService.rename(id, data),
    meta: { invalidates: customUnitInvalidates(labId) },
  });
}

export function useDeleteCustomUnitMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: (id: string) => CustomUnitService.remove(id),
    meta: { invalidates: customUnitInvalidates(labId) },
  });
}
