/**
 * Tube Form Hook - Generic Factory Pattern
 *
 * Generic factory pattern for tube forms:
 * - Private generic implementation contains all logic (DRY)
 * - Public type-safe wrappers provide domain-specific APIs
 * - Full type safety with Zod input/output types
 *
 * Type Flow:
 * 1. User interacts with form → TInput (CreateTubeFormInput: concentration as string)
 * 2. Form submits → Zod validates and transforms → TOutput (CreateTubeRequest: concentration as number)
 * 3. API receives proper output type
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
  type TubeData
} from '@odysseus/shared-schemas';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';

import { queryKeys } from '@app/queryKeys';

import {
  useCreateTubeMutation,
  useUpdateTubeMutation
} from './useTubeMutations';

import type { UseFormReturn, FieldValues } from 'react-hook-form';
import type { ZodType } from 'zod';

/**
 * Submit context for providing non-editable external data (e.g., location from grid selection)
 */
export interface SubmitContext {
  location?: TubeData['location'];
}

/**
 * Form submission result
 */
export interface TubeFormSubmissionResult {
  success: boolean;
  data?: TubeData;
  error?: string;
}

// PRIVATE GENERIC IMPLEMENTATION

/**
 * Generic tube form hook - private implementation
 *
 * Contains all form logic. Not exported directly.
 * Public wrappers (useCreateTubeForm, useEditTubeForm) provide type-safe APIs.
 *
 * @template TInput - Form input type (pre-Zod transformation, must be valid form values)
 * @template TOutput - API output type (post-Zod transformation)
 */
function useTubeForm<TInput extends FieldValues, TOutput extends CreateTubeRequest | UpdateTubeRequest>(
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

  // React Hook Form with Zod validation
  // Type assertion needed for generic factory pattern - type safety enforced at public wrappers
  const form = useForm<TInput>({
    resolver: zodResolver(schema as any),
    defaultValues: initialData as any,
    mode: 'onChange' // Real-time validation for immediate feedback
  });

  // React Query mutations
  const createTubeMutation = useCreateTubeMutation();
  const updateTubeMutation = useUpdateTubeMutation();

  /**
   * Validate complete payload with business rules (duplicate position, warnings)
   *
   * @param payload - Validated payload (post-transformation)
   */
  const validateCompletePayload = useCallback((payload: TOutput): { warnings: Record<string, string> } => {
    const warnings: Record<string, string> = {};

    // Warning: Duplicate position check (only if we have location)
    if ('location' in payload && payload.location) {
      // Get existing tubes for duplicate validation (fresh on every validation)
      const existingTubes = queryClient.getQueryData<TubeData[]>(queryKeys.tubes.all) ?? [];

      const filteredTubes = mode === 'edit' && tubeId
        ? existingTubes.filter(tube => tube.id !== tubeId)
        : existingTubes;

      const duplicate = filteredTubes.find(tube =>
        tube.location.tankId === payload.location!.tankId &&
        tube.location.rackId === payload.location!.rackId &&
        tube.location.boxId === payload.location!.boxId &&
        tube.location.position === payload.location!.position
      );

      if (duplicate) {
        warnings['position'] = `Position ${payload.location!.position} in Tank ${payload.location!.tankId}, Rack ${payload.location!.rackId}, Box ${payload.location!.boxId} is already occupied`;
      }
    }

    return { warnings };
  }, [queryClient, mode, tubeId]);

  /**
   * Form submission handler with context support
   *
   * Proper type transformation:
   * - Form data is INPUT type (pre-transformation: concentration is string)
   * - Zod validates and transforms: INPUT → OUTPUT type
   * - Mutation receives OUTPUT type (post-transformation: concentration is number)
   */
  const submitTube = useCallback(async (data: TInput, ctx?: SubmitContext): Promise<TubeFormSubmissionResult> => {
    try {
      let result: TubeData;

      if (mode === 'create') {
        if (!ctx?.location) {
          throw new Error('Location is required for create mode');
        }

        // Merge form data with context location
        const formInputWithLocation = {
          ...data,
          location: ctx.location
        };

        // Zod validates and transforms INPUT → OUTPUT
        // Input: concentration as string ("1.5e6")
        // Output: concentration as number (1500000)
        const validatedPayload = schema.parse(formInputWithLocation) as TOutput;

        // Validate complete payload and show warnings (non-blocking)
        const { warnings } = validateCompletePayload(validatedPayload);
        if (Object.keys(warnings).length > 0) {
          console.warn('Tube creation warnings:', warnings);
        }

        // Type assertion: we know TOutput is CreateTubeRequest when mode === 'create'
        result = await createTubeMutation.mutateAsync(validatedPayload as CreateTubeRequest);

      } else {
        if (!tubeId) {
          throw new Error('Tube ID is required for edit mode');
        }

        // Merge form data with optional context location
        const formInputWithContext = {
          ...data,
          ...(ctx?.location && { location: ctx.location })
        };

        // Zod validates and transforms INPUT → OUTPUT
        const validatedPayload = schema.parse(formInputWithContext) as TOutput;

        // Validate complete payload and show warnings (non-blocking)
        const { warnings } = validateCompletePayload(validatedPayload);
        if (Object.keys(warnings).length > 0) {
          console.warn('Tube update warnings:', warnings);
        }

        // Type assertion: we know TOutput is UpdateTubeRequest when mode === 'edit'
        result = await updateTubeMutation.mutateAsync({
          id: tubeId,
          updates: validatedPayload as UpdateTubeRequest
        });
      }

      // Call success callback
      onSuccess?.(result);

      return {
        success: true,
        data: result
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      onError?.(error instanceof Error ? error : new Error(errorMessage));

      return {
        success: false,
        error: errorMessage
      };
    }
  }, [
    mode,
    tubeId,
    createTubeMutation,
    updateTubeMutation,
    validateCompletePayload,
    schema,
    onSuccess,
    onError
  ]);

  // Loading state
  const isSubmitting = createTubeMutation.isPending || updateTubeMutation.isPending;

  // Error state
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Cascading fallback chain, empty string should trigger next option
  const submitError = createTubeMutation.error || updateTubeMutation.error;

  return {
    form,          // Pure React Hook Form instance
    submitTube,    // Custom async submission logic
    isSubmitting,  // Combined loading state
    submitError    // Combined error state
  };
}

// PUBLIC TYPE-SAFE WRAPPERS

/**
 * Hook for tube creation
 *
 * Type-safe wrapper around generic implementation:
 * - Form uses CreateTubeFormInput (pre-transformation)
 * - Enforces location requirement at submit time
 */
export function useCreateTubeForm(config?: {
  initialData?: Partial<CreateTubeFormInput>;
  onSuccess?: (data: TubeData) => void;
  onError?: (error: Error) => void;
}): {
  form: UseFormReturn<CreateTubeFormInput>;
  submitTube: (data: CreateTubeFormInput, location: TubeData['location']) => Promise<TubeFormSubmissionResult>;
  isSubmitting: boolean;
  submitError: Error | null;
} {
  const base = useTubeForm<CreateTubeFormInput, CreateTubeRequest>(
    createTubeRequestSchema,
    {
      mode: 'create',
      ...config
    }
  );

  // Wrapper: location is required parameter
  const submitTube = useCallback(
    (data: CreateTubeFormInput, location: TubeData['location']) =>
      base.submitTube(data, { location }),
    [base]
  );

  return {
    form: base.form,
    submitTube,
    isSubmitting: base.isSubmitting,
    submitError: base.submitError
  };
}

/**
 * Hook for tube editing
 *
 * Type-safe wrapper around generic implementation:
 * - Form uses UpdateTubeFormInput (pre-transformation)
 * - Location optional (preserves existing if not provided)
 */
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
  return useTubeForm<UpdateTubeFormInput, UpdateTubeRequest>(
    updateTubeRequestSchema,
    {
      mode: 'edit',
      tubeId,
      ...config
    }
  );
}

// UTILITY HOOKS

/**
 * Hook for transforming TubeData to form format (for edit mode)
 * Converts domain data to form-ready structure
 *
 * Returns FORM INPUT type (pre-transformation)
 */
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
        media: {
          type: tubeData.sample.media?.type ?? '',
          supplements: tubeData.sample.media?.supplements ?? '',
          selection: tubeData.sample.media?.selection ?? ''
        },
        cultureCondition: tubeData.sample.cultureCondition ?? '',
        lotNumber: tubeData.sample.lotNumber ?? '',
        notes: tubeData.sample.notes ?? ''
      },
      researcherId: tubeData.researcherId
    };
  }, []);

  return {
    transformToFormData
  };
}
