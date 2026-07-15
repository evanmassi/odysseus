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
  type ZodType,
} from '@odysseus/shared-schemas';
import { useForm } from 'react-hook-form';

import { useCreateTubeMutation, useUpdateTubeMutation } from './useTubeMutations';

import type { UseFormReturn, FieldValues } from 'react-hook-form';

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
    [mode, tubeId, createTubeMutation, updateTubeMutation, schema, onSuccess, onError]
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
