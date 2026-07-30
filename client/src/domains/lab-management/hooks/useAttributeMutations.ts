/**
 * Attribute Mutations
 *
 * Writes against the lab's attribute definitions and options. Reagent rows carry their
 * attribute values, so the catalog is invalidated alongside the vocabulary.
 */

import { useMutation } from '@tanstack/react-query';

import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';

import { AttributeService } from '../services/AttributeService';

import type {
  CreateAttributeDefinitionRequest,
  CreateAttributeOptionRequest,
  UpdateAttributeDefinitionRequest,
  UpdateAttributeOptionRequest,
} from '@odysseus/shared-schemas';

function attributeInvalidates(labId: string | undefined) {
  return [queryKeys.attributes.all(labId), queryKeys.reagents.all(labId)];
}

export function useCreateAttributeDefinitionMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: (data: CreateAttributeDefinitionRequest) => AttributeService.createDefinition(data),
    meta: { invalidates: attributeInvalidates(labId) },
  });
}

export function useUpdateAttributeDefinitionMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAttributeDefinitionRequest }) =>
      AttributeService.updateDefinition(id, data),
    meta: { invalidates: attributeInvalidates(labId) },
  });
}

export function useDeleteAttributeDefinitionMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: (id: string) => AttributeService.deleteDefinition(id),
    meta: { invalidates: attributeInvalidates(labId) },
  });
}

export function useCreateAttributeOptionMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: ({
      definitionId,
      data,
    }: {
      definitionId: string;
      data: CreateAttributeOptionRequest;
    }) => AttributeService.createOption(definitionId, data),
    meta: { invalidates: attributeInvalidates(labId) },
  });
}

export function useUpdateAttributeOptionMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAttributeOptionRequest }) =>
      AttributeService.updateOption(id, data),
    meta: { invalidates: attributeInvalidates(labId) },
  });
}

export function useDeleteAttributeOptionMutation() {
  const labId = useLabId();

  return useMutation({
    mutationFn: (id: string) => AttributeService.deleteOption(id),
    meta: { invalidates: attributeInvalidates(labId) },
  });
}
