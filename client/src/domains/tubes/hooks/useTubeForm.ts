/**
 * Tube Form Hooks
 *
 * Generic factory with public wrappers for create, edit, and bulk tube forms.
 */

import { useCallback } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  createTubeRequestSchema,
  updateTubeRequestSchema,
  type CreateTubeRequest,
  type UpdateTubeRequest,
  type CreateTubeFormInput,
  type UpdateTubeFormInput,
  type TubeData,
} from '@odysseus/shared-schemas';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';

import { queryKeys } from '@app/cache/queryKeys';
import { useLabId } from '@domains/authentication';
import { TubeService } from '@domains/tubes/services/TubeService';
import { logger } from '@infra/logger';

import { useCreateTubeMutation, useUpdateTubeMutation } from './useTubeMutations';

import type { UseFormReturn, FieldValues } from 'react-hook-form';
import type { ZodType } from 'zod';

/**
 * Submit context for providing non-editable external data (e.g., location from grid selection)
 */
export interface SubmitContext {
  location?: TubeData['location'];
}

export interface TubeFormSubmissionResult {
  success: boolean;
  data?: TubeData;
  error?: string;
}

function useTubeForm<
  TInput extends FieldValues,
  TOutput extends CreateTubeRequest | UpdateTubeRequest,
>(
  schema: ZodType<TOutput>,
  config: {
    mode: 'create' | 'edit';
    tubeId?: string;
    initialData?: Partial<TInput>;
    onSuccess?: (data: TubeData) => void;
    onError?: (error: Error) => void;
  }
): {
  form: UseFormReturn<TInput>;
  submitTube: (data: TInput, ctx?: SubmitContext) => Promise<TubeFormSubmissionResult>;
  isSubmitting: boolean;
  submitError: Error | null;
} {
  const { mode, tubeId, initialData, onSuccess, onError } = config;
  const queryClient = useQueryClient();
  const labId = useLabId();

  // Type assertion needed for generic factory pattern - safety enforced at public wrappers
  const form = useForm<TInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic Zod schema requires any for React Hook Form resolver compatibility
    resolver: zodResolver(schema as any),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic defaultValues require any for type compatibility across TInput instances
    defaultValues: initialData as any,
    mode: 'onChange',
  });

  const createTubeMutation = useCreateTubeMutation();
  const updateTubeMutation = useUpdateTubeMutation();

  const validateCompletePayload = useCallback(
    async (payload: TOutput): Promise<{ warnings: Record<string, string> }> => {
      const warnings: Record<string, string> = {};

      if ('location' in payload && payload.location) {
        const { tankId, rackId, boxId, position } = payload.location;
        if (!tankId || !rackId || !boxId || position === undefined) {
          return { warnings };
        }

        const boxTubes = await queryClient.fetchQuery({
          queryKey: queryKeys.tubes.location(labId, tankId, rackId, boxId),
          queryFn: () => TubeService.fetchTubesByLocation(tankId, rackId, boxId),
        });

        const candidates =
          mode === 'edit' && tubeId ? boxTubes.filter(tube => tube.id !== tubeId) : boxTubes;

        const duplicate = candidates.find(tube => tube.location.position === position);

        if (duplicate) {
          warnings['position'] =
            `Position ${position} in Tank ${tankId}, Rack ${rackId}, Box ${boxId} is already occupied`;
        }
      }

      return { warnings };
    },
    [queryClient, labId, mode, tubeId]
  );

  const submitTube = useCallback(
    async (data: TInput, ctx?: SubmitContext): Promise<TubeFormSubmissionResult> => {
      try {
        let result: TubeData;

        if (mode === 'create') {
          if (!ctx?.location) {
            throw new Error('Location is required for create mode');
          }

          const formInputWithLocation = {
            ...data,
            location: ctx.location,
          };

          const validatedPayload = schema.parse(formInputWithLocation) as TOutput;

          const { warnings } = await validateCompletePayload(validatedPayload);
          if (Object.keys(warnings).length > 0) {
            logger.warn('Tube creation warnings', { warnings });
          }

          // Type assertion: we know TOutput is CreateTubeRequest when mode === 'create'
          result = await createTubeMutation.mutateAsync(validatedPayload as CreateTubeRequest);
        } else {
          if (!tubeId) {
            throw new Error('Tube ID is required for edit mode');
          }

          const formInputWithContext = {
            ...data,
            ...(ctx?.location && { location: ctx.location }),
          };

          const validatedPayload = schema.parse(formInputWithContext) as TOutput;

          const { warnings } = await validateCompletePayload(validatedPayload);
          if (Object.keys(warnings).length > 0) {
            logger.warn('Tube update warnings', { warnings });
          }

          // Type assertion: we know TOutput is UpdateTubeRequest when mode === 'edit'
          result = await updateTubeMutation.mutateAsync({
            id: tubeId,
            updates: validatedPayload as UpdateTubeRequest,
          });
        }

        onSuccess?.(result);

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'An unexpected error occurred';
        onError?.(error instanceof Error ? error : new Error(errorMessage));

        return {
          success: false,
          error: errorMessage,
        };
      }
    },
    [
      mode,
      tubeId,
      createTubeMutation,
      updateTubeMutation,
      validateCompletePayload,
      schema,
      onSuccess,
      onError,
    ]
  );

  const isSubmitting = createTubeMutation.isPending || updateTubeMutation.isPending;

  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Cascading fallback chain, empty string should trigger next option
  const submitError = createTubeMutation.error || updateTubeMutation.error;

  return {
    form,
    submitTube,
    isSubmitting,
    submitError,
  };
}

export function useCreateTubeForm(config?: {
  initialData?: Partial<CreateTubeFormInput>;
  onSuccess?: (data: TubeData) => void;
  onError?: (error: Error) => void;
}): {
  form: UseFormReturn<CreateTubeFormInput>;
  submitTube: (
    data: CreateTubeFormInput,
    location: TubeData['location']
  ) => Promise<TubeFormSubmissionResult>;
  isSubmitting: boolean;
  submitError: Error | null;
} {
  const base = useTubeForm<CreateTubeFormInput, CreateTubeRequest>(createTubeRequestSchema, {
    mode: 'create',
    ...config,
  });

  const submitTube = useCallback(
    (data: CreateTubeFormInput, location: TubeData['location']) =>
      base.submitTube(data, { location }),
    [base]
  );

  return {
    form: base.form,
    submitTube,
    isSubmitting: base.isSubmitting,
    submitError: base.submitError,
  };
}

export function useEditTubeForm(
  tubeId: string,
  config?: {
    initialData?: Partial<UpdateTubeFormInput>;
    onSuccess?: (data: TubeData) => void;
    onError?: (error: Error) => void;
  }
): {
  form: UseFormReturn<UpdateTubeFormInput>;
  submitTube: (data: UpdateTubeFormInput, ctx?: SubmitContext) => Promise<TubeFormSubmissionResult>;
  isSubmitting: boolean;
  submitError: Error | null;
} {
  return useTubeForm<UpdateTubeFormInput, UpdateTubeRequest>(updateTubeRequestSchema, {
    mode: 'edit',
    tubeId,
    ...config,
  });
}

export function useBulkEditTubeForm(config?: {
  initialData?: Partial<UpdateTubeFormInput>;
  onSuccess?: (data: TubeData) => void;
  onError?: (error: Error) => void;
}): {
  form: UseFormReturn<UpdateTubeFormInput>;
  isSubmitting: boolean;
  submitError: Error | null;
} {
  const base = useTubeForm<UpdateTubeFormInput, UpdateTubeRequest>(updateTubeRequestSchema, {
    mode: 'edit',
    // No tubeId - bulk operations handle tube IDs separately via mutations
    ...config,
  });

  return {
    form: base.form,
    isSubmitting: base.isSubmitting,
    submitError: base.submitError,
    // Note: submitTube not exposed - bulk editor uses bulk mutations directly
  };
}

export function useTubeFormTransform() {
  const transformToFormData = useCallback((tubeData: TubeData): Partial<CreateTubeFormInput> => {
    return {
      sample: {
        cellType: tubeData.sample.cellType,
        donorInternalId: tubeData.sample.donorInternalId ?? '',
        donorSourceId: tubeData.sample.donorSourceId ?? '',
        concentration: tubeData.sample.concentration,
        concentrationUnit: tubeData.sample.concentrationUnit,
        date: tubeData.sample.date ?? '',
        mediaType: tubeData.sample.mediaType ?? '',
        mediaSupplements: tubeData.sample.mediaSupplements ?? '',
        mediaSelection: tubeData.sample.mediaSelection ?? '',
        cultureCondition: tubeData.sample.cultureCondition ?? '',
        lotNumber: tubeData.sample.lotNumber ?? '',
        species: tubeData.sample.species ?? '',
        source: tubeData.sample.source ?? '',
        catalogNumber: tubeData.sample.catalogNumber ?? '',
        passageNumber: tubeData.sample.passageNumber ?? '',
        notes: tubeData.sample.notes ?? '',
      },
      researcherId: tubeData.researcherId,
    };
  }, []);

  return {
    transformToFormData,
  };
}
