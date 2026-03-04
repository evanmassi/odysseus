/**
 * TubeEditorModal - Tube Creation & Editing Modal
 *
 * Handles CREATE, EDIT, and MIXED modes:
 * - CREATE: single/multiple empty positions
 * - EDIT: single tube by ID
 * - MIXED: create new + update existing positions
 */

import React, { useMemo, useState, useEffect } from 'react';

import {
  type CreateTubeFormInput,
  type UpdateTubeFormInput,
  type CreateTubeRequest,
  type UpdateTubeRequest,
  type TubeData,
  type Researcher,
  createTubeRequestSchema,
  updateTubeRequestSchema,
  formatConcentrationDisplay,
  formatResourceDisplayName,
} from '@odysseus/shared-schemas';
import { Edit, Plus, Save, Trash2 } from 'lucide-react';

import { useModalStore } from '@app/stores/modalStore';
import { useUserSettings } from '@domains/authentication';
import { useActiveResearchersQuery } from '@domains/researchers';
import { useStorageData, formatPositionRangesForBox, DEFAULT_GRID_CONFIG } from '@domains/storage';
import { useTubes, useTube } from '@domains/tubes';
import { useLookupValuesQuery } from '@domains/tubes/hooks/useLookupValuesQuery';
import { useCreateTubeForm, useEditTubeForm } from '@domains/tubes/hooks/useTubeForm';
import { useTubeModalFocusReturn } from '@domains/tubes/hooks/useTubeModalFocusReturn';
import {
  useUpdateTubeMutation,
  useDeleteTubeMutation,
  usePasteTubesMutation,
} from '@domains/tubes/hooks/useTubeMutations';
import { isOfflineError } from '@infra/api/httpClient';
import { logger } from '@shared/infrastructure/logger';
import { parsePositionKey, type PositionKey } from '@shared/types/GridSelection';
import { AlertBanner, Button, Checkbox } from '@shared/ui';
import { InfoDialog } from '@shared/ui/components/InfoDialog';
import { BaseModal } from '@shared/ui/components/modals';
import { notifications } from '@shared/utils';
import { formatDateForInput } from '@shared/utils/dateUtils';

import { LocationDisplay } from '../displays/LocationDisplay';
import { TubeForm } from '../forms/TubeForm';

import type { SelectOption } from '@shared/ui/primitives/select/types';
import type { Control, UseFormRegister, FieldErrors, UseFormTrigger } from 'react-hook-form';

/**
 * TubeEditorModal Props
 * - For CREATE: provide selectedPositions
 * - For EDIT: provide tubeId
 * - Cannot provide both
 */
export interface TubeEditorModalProps {
  /** Whether modal is open - controls visibility with exit animation */
  isOpen?: boolean;
  onClose: () => void;

  // Edit mode: Single tube ID
  tubeId?: string;

  // Create/Mixed mode: Multiple positions
  rackId?: string;
  boxId?: string;
  selectedPositions?: Set<PositionKey>;
}

/**
 * Tube Editor Modal Component - detects mode based on props
 */
export function TubeEditorModal(props: TubeEditorModalProps) {
  const { isOpen = true, tubeId, onClose } = props;

  // Mode detection
  const isEditMode = Boolean(tubeId);

  if (isEditMode) {
    return <EditModeContent isOpen={isOpen} tubeId={tubeId!} onClose={onClose} />;
  } else {
    return <CreateModeContent {...props} isOpen={isOpen} onClose={onClose} />;
  }
}

/**
 * Edit Mode Content
 * Fetches tube data and shows edit form with delete button
 */
interface EditModeContentProps {
  isOpen: boolean;
  tubeId: string;
  onClose: () => void;
}

function EditModeContent({ isOpen, tubeId, onClose }: EditModeContentProps) {
  const { data: researchers = [] } = useActiveResearchersQuery();
  const { data: speciesValues = [] } = useLookupValuesQuery('species');
  const { data: sourceValues = [] } = useLookupValuesQuery('source');
  const { data: mediaValues = [] } = useLookupValuesQuery('media');
  const speciesOptions = useMemo(
    () => speciesValues.map(v => ({ value: v.value, label: v.value })),
    [speciesValues]
  );
  const sourceOptions = useMemo(
    () => sourceValues.map(v => ({ value: v.value, label: v.value })),
    [sourceValues]
  );
  const mediaOptions = useMemo(
    () => mediaValues.map(v => ({ value: v.value, label: v.value })),
    [mediaValues]
  );

  // Fetch tube data from React Query cache (always fresh)
  const { data: tube, isLoading: isFetchingTube, isError } = useTube(tubeId);

  // Focus return management - restore focus when modal unmounts
  useTubeModalFocusReturn();

  // Error state - tube was deleted or doesn't exist
  if (isError) {
    return (
      <InfoDialog
        isOpen={isOpen}
        variant="warning"
        title="Tube Not Found"
        message="This tube no longer exists. It may have been deleted or moved by another user."
        buttonText="Close"
        onClose={onClose}
      />
    );
  }

  // Loading state while fetching tube
  if (isFetchingTube || !tube) {
    return (
      <BaseModal
        isOpen={isOpen}
        title="Loading..."
        icon={<Edit className="w-5 h-5" />}
        onClose={onClose}
        size="md-lg"
        dataAttribute="data-tube-modal"
        mode="edit"
      >
        <div className="flex items-center justify-center py-12">
          <div className="spinner w-8 h-8"></div>
          <span className="ml-3 text-muted-foreground">Loading tube data...</span>
        </div>
      </BaseModal>
    );
  }

  return (
    <EditModeForm
      isOpen={isOpen}
      tube={tube}
      tubeId={tubeId}
      researchers={researchers}
      speciesOptions={speciesOptions}
      sourceOptions={sourceOptions}
      mediaOptions={mediaOptions}
      onClose={onClose}
    />
  );
}

/**
 * Edit Mode Form
 * Inner component that resets form state when tube data changes
 */
interface EditModeFormProps {
  isOpen: boolean;
  tube: TubeData;
  tubeId: string;
  researchers: Researcher[];
  speciesOptions: SelectOption[];
  sourceOptions: SelectOption[];
  mediaOptions: SelectOption[];
  onClose: () => void;
}

function EditModeForm({
  isOpen,
  tube,
  tubeId,
  researchers,
  speciesOptions,
  sourceOptions,
  mediaOptions,
  onClose,
}: EditModeFormProps) {
  const modalService = useModalStore();
  // Build initialData from tube - uses FORM INPUT type (pre-transformation)
  // concentration as string, date as string
  // Memoized to prevent unnecessary re-renders and useEffect triggers
  const initialData: Partial<UpdateTubeFormInput> = useMemo(
    () => ({
      sample: {
        cellType: tube.sample.cellType ?? '',
        donorInternalId: tube.sample.donorInternalId ?? '',
        donorSourceId: tube.sample.donorSourceId ?? '',
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Convert empty string to undefined for form
        concentration: formatConcentrationDisplay(tube.sample.concentration) || undefined,
        concentrationUnit: tube.sample.concentrationUnit ?? undefined,
        date: tube.sample.date ? formatDateForInput(tube.sample.date) : '',
        mediaType: tube.sample.mediaType ?? '',
        mediaSupplements: tube.sample.mediaSupplements ?? '',
        mediaSelection: tube.sample.mediaSelection ?? '',
        cultureCondition: tube.sample.cultureCondition ?? '',
        lotNumber: tube.sample.lotNumber ?? '',
        species: tube.sample.species ?? '',
        source: tube.sample.source ?? '',
        catalogNumber: tube.sample.catalogNumber ?? '',
        passageNumber: tube.sample.passageNumber ?? '',
        notes: tube.sample.notes ?? '',
      },
      researcherId: tube.researcherId ?? '',
    }),
    [tube]
  );

  // Use edit mode hook - fully type-safe wrapper
  const {
    form,
    submitTube,
    isSubmitting: formSubmitting,
  } = useEditTubeForm(tubeId, {
    initialData,
  });

  // Stale form detection - track version when modal opened
  const [openedWithVersion, setOpenedWithVersion] = useState(tube.version);
  const [staleWarningDismissed, setStaleWarningDismissed] = useState(false);
  const [isSavingLocal, setIsSavingLocal] = useState(false);

  // Detect if tube was modified externally (version increased)
  // Suppress warning while we're saving (our own save triggers version bump)
  const isStale = tube.version > openedWithVersion;
  const showStaleWarning =
    isStale && form.formState.isDirty && !staleWarningDismissed && !isSavingLocal;

  // Handle refresh - accept new data and update tracked version
  const handleRefresh = () => {
    form.reset(initialData);
    setOpenedWithVersion(tube.version);
    setStaleWarningDismissed(false);
  };

  // Reset all state when modal opens (component stays mounted, only isOpen changes)
  useEffect(() => {
    if (isOpen) {
      form.reset(initialData);
      setOpenedWithVersion(tube.version);
      setStaleWarningDismissed(false);
      setIsSavingLocal(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only reset when modal opens
  }, [isOpen]);

  // Auto-update form when tube data changes externally and user hasn't made edits
  useEffect(() => {
    if (!form.formState.isDirty) {
      form.reset(initialData);
      setOpenedWithVersion(tube.version);
      setStaleWarningDismissed(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only update when initialData changes
  }, [initialData]);

  const deleteMutation = useDeleteTubeMutation();
  const isSubmitting = formSubmitting || deleteMutation.isPending;

  // Form submission handler
  // Receives form INPUT type, Zod transforms to OUTPUT type
  const handleFormSubmit = async (validatedData: UpdateTubeFormInput) => {
    // Mark as saving to suppress stale warning (our save triggers version bump)
    setIsSavingLocal(true);

    try {
      // Send all form data (simplicity > micro-optimization)
      // submitTube handles Zod transformation: INPUT → OUTPUT
      const result = await submitTube(validatedData, { location: tube.location });

      if (result.success) {
        notifications.success('Tube updated successfully');
        onClose();
      } else {
        setIsSavingLocal(false);
        notifications.error(result.error ?? 'Failed to update tube');
      }
    } catch (error) {
      setIsSavingLocal(false);
      // Global mutation error handler in queryClient.ts shows the toast
      // Only log here for debugging
      if (!isOfflineError(error)) {
        logger.error('Tube update failed', { tubeId, error });
      }
    }
  };

  // Delete handler
  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(tubeId);
      notifications.success('Tube removed successfully');
      onClose();
    } catch (error) {
      // Skip notification for offline errors - global handler already shows it
      if (!isOfflineError(error)) {
        notifications.error('Failed to remove tube');
      }
    }
  };

  // Use React Hook Form's built-in validation and dirty state
  const { isValid: isFormValid, isDirty } = form.formState;

  // Button should be disabled if form is invalid OR no changes have been made
  const canSubmit = isFormValid && isDirty;

  return (
    <BaseModal
      isOpen={isOpen}
      title="Edit Tube"
      icon={<Edit className="w-5 h-5" />}
      onClose={onClose}
      size="md-lg"
      dataAttribute="data-tube-modal"
      mode="edit"
      contentClassName="p-5"
      footer={
        <div className="flex justify-end space-x-4">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={isSubmitting}
            leftIcon={<Trash2 className="w-4 h-4" />}
            onClick={() => {
              modalService.showDeleteConfirm({
                title: 'Remove Tube',
                message: `Are you sure you want to remove this tube from Rack ${tube.location.rackId}, Box ${tube.location.boxId}, Position ${tube.location.position}? This action cannot be undone.`,
                confirmText: 'Remove',
                onConfirm: handleDelete,
              });
            }}
          >
            Remove Tube
          </Button>
          <Button
            type="submit"
            form="tube-edit-form"
            variant="primary"
            disabled={!canSubmit}
            isLoading={isSubmitting}
            loadingText="Updating..."
            leftIcon={<Save className="w-4 h-4" />}
          >
            Update Tube
          </Button>
        </div>
      }
    >
      <form
        id="tube-edit-form"
        onSubmit={form.handleSubmit(handleFormSubmit)}
        className="space-y-3"
      >
        <LocationDisplay
          tankId={tube.location.tankId}
          rackId={tube.location.rackId}
          boxId={tube.location.boxId}
          position={tube.location.position}
        />

        {/* Stale Form Warning Banner */}
        {showStaleWarning && (
          <AlertBanner
            variant="warning"
            title="This tube was modified by another user"
            spacing="none"
            className="text-xs"
            actions={
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="text-xs font-medium px-2 py-1 rounded bg-warning-bg text-warning-btnText hover:bg-warning-hover transition-colors"
                >
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => setStaleWarningDismissed(true)}
                  className="text-xs font-medium px-2 py-1 rounded bg-warning-light-hover text-warning-text hover:bg-warning-border transition-colors"
                >
                  Continue Editing
                </button>
              </div>
            }
          >
            Refresh to load their changes (your edits will be lost), or continue editing and save
            your version (their changes will be overwritten).
          </AlertBanner>
        )}

        <fieldset>
          <TubeForm
            control={form.control as Control<CreateTubeRequest | UpdateTubeRequest>}
            register={form.register as UseFormRegister<CreateTubeRequest | UpdateTubeRequest>}
            errors={form.formState.errors as FieldErrors<CreateTubeRequest | UpdateTubeRequest>}
            trigger={form.trigger as UseFormTrigger<CreateTubeRequest | UpdateTubeRequest>}
            researchers={researchers}
            speciesOptions={speciesOptions}
            sourceOptions={sourceOptions}
            mediaOptions={mediaOptions}
            isLoading={isSubmitting}
          />
        </fieldset>
      </form>
    </BaseModal>
  );
}

/**
 * Create Mode Content
 * Handles single/multiple position creation and mixed create+update
 */
function CreateModeContent({
  isOpen = true,
  onClose,
  rackId: _rackId,
  boxId: _boxId,
  selectedPositions,
}: TubeEditorModalProps) {
  const { data: researchers = [] } = useActiveResearchersQuery();
  const { data: speciesValues = [] } = useLookupValuesQuery('species');
  const { data: sourceValues = [] } = useLookupValuesQuery('source');
  const { data: mediaValues = [] } = useLookupValuesQuery('media');
  const { data: allTubes = [] } = useTubes();
  const updateTubeMutation = useUpdateTubeMutation();
  const pasteTubesMutation = usePasteTubesMutation();

  const speciesOptions = useMemo(
    () => speciesValues.map(v => ({ value: v.value, label: v.value })),
    [speciesValues]
  );
  const sourceOptions = useMemo(
    () => sourceValues.map(v => ({ value: v.value, label: v.value })),
    [sourceValues]
  );
  const mediaOptions = useMemo(
    () => mediaValues.map(v => ({ value: v.value, label: v.value })),
    [mediaValues]
  );
  const { currentLab, getBox } = useStorageData();
  const { settings: userSettings } = useUserSettings();

  // State for overwrite confirmation
  const [allowOverwrite, setAllowOverwrite] = useState(false);

  // Defer conditional banners so they mount after the modal entrance animation (400ms)
  const [mountReady, setMountReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMountReady(true), 400);
    return () => clearTimeout(timer);
  }, []);

  // Focus return management - restore focus when modal unmounts
  useTubeModalFocusReturn();

  // Parse selected positions from string format
  const parsedPositions = useMemo(() => {
    if (!selectedPositions) return [];
    return Array.from(selectedPositions).map(positionKey => {
      const { tankId, rackId, boxId, position } = parsePositionKey(positionKey);

      return {
        location: {
          tankId,
          rackId,
          boxId,
          position,
        },
      };
    });
  }, [selectedPositions]);

  // Analyze which positions are occupied vs empty
  const positionAnalysis = useMemo(() => {
    const emptyPositions = [];
    const occupiedPositions = [];

    for (const parsed of parsedPositions) {
      const { tankId, rackId, boxId, position } = parsed.location;
      const existingTube = allTubes.find(
        t =>
          t.location.tankId === tankId &&
          t.location.rackId === rackId &&
          t.location.boxId === boxId &&
          t.location.position === position
      );

      if (existingTube) {
        occupiedPositions.push({ ...parsed, tubeId: existingTube.id });
      } else {
        emptyPositions.push(parsed);
      }
    }

    return {
      emptyPositions,
      occupiedPositions,
      hasEmpty: emptyPositions.length > 0,
      hasOccupied: occupiedPositions.length > 0,
      isMixed: emptyPositions.length > 0 && occupiedPositions.length > 0,
    };
  }, [parsedPositions, allTubes]);

  // Get location display names for batch operations (includes customLabels)
  const batchLocationDisplay = useMemo(() => {
    if (parsedPositions.length === 0) return null;

    const firstLocation = parsedPositions[0].location;
    const tanks = currentLab?.equipment?.tanks ?? [];
    const tank = tanks.find(t => t.id === firstLocation.tankId);
    const tankName = tank?.name ?? `Tank ${firstLocation.tankId}`;

    const rack = tank?.racks?.find(r => r.id === firstLocation.rackId);
    const rackGenericName = rack?.name ?? `Rack ${firstLocation.rackId}`;
    const rackName = formatResourceDisplayName(rackGenericName, rack?.customLabel);

    const box = rack?.boxes?.find(b => b.id === firstLocation.boxId);
    const boxGenericName = box?.name ?? `Box ${firstLocation.boxId}`;
    const boxName = formatResourceDisplayName(boxGenericName, box?.customLabel);

    // Get box config for flexible position formatting
    const boxObj = getBox(firstLocation.tankId, firstLocation.rackId, firstLocation.boxId);
    const gridConfig = boxObj?.gridConfig ?? DEFAULT_GRID_CONFIG;

    const positions = parsedPositions.map(p => p.location.position);
    const positionRanges = formatPositionRangesForBox(
      positions,
      firstLocation.tankId,
      firstLocation.rackId,
      firstLocation.boxId,
      gridConfig,
      currentLab,
      userSettings
    );

    return { tankName, rackName, boxName, positionRanges };
  }, [parsedPositions, currentLab, getBox, userSettings]);

  // Default values use FORM INPUT type (pre-transformation)
  const defaultValues = useMemo(
    (): Partial<CreateTubeFormInput> => ({
      location: parsedPositions[0]?.location,
      sample: {
        cellType: '',
        donorInternalId: '',
        donorSourceId: '',
        concentration: undefined,
        concentrationUnit: undefined,
        date: '',
        mediaType: '',
        mediaSupplements: '',
        mediaSelection: '',
        cultureCondition: '',
        lotNumber: '',
        species: '',
        source: '',
        catalogNumber: '',
        passageNumber: '',
        notes: '',
      },
      researcherId: '',
    }),
    [parsedPositions]
  );

  // Use create mode hook
  // Only show individual notifications for single tube creation, not batch operations
  const isSingleTube = parsedPositions.length === 1;
  const { form, submitTube, isSubmitting } = useCreateTubeForm({
    initialData: defaultValues,
    onSuccess: isSingleTube
      ? data => {
          notifications.success(`Successfully created tube at position ${data.location.position}`);
          onClose();
        }
      : undefined, // Batch mode: notification handled after all tubes are created
    onError: isSingleTube
      ? error => {
          // Skip notification for offline errors - global handler already shows it
          if (!isOfflineError(error)) {
            notifications.error(`Failed to create tube: ${error.message}`);
          }
        }
      : undefined, // Batch mode: errors handled in handleFormSubmit
  });

  // Reset form when modal opens to clear any stale data
  useEffect(() => {
    if (isOpen) {
      form.reset(defaultValues);
      setAllowOverwrite(false);
    }
  }, [isOpen, form, defaultValues]);

  /**
   * Handle form submission for multiple positions
   * Supports create, update, and mixed operations
   * Receives form INPUT type, Zod transforms to OUTPUT type
   */
  const handleFormSubmit = async (formData: CreateTubeFormInput) => {
    try {
      if (parsedPositions.length === 0) {
        notifications.error('No valid positions selected');
        return;
      }

      if (parsedPositions.length === 1) {
        // Single position - pass location as context
        const result = await submitTube(formData, parsedPositions[0].location);

        if (result.success) {
          onClose();
        }
        return;
      }

      // Multiple positions - handle creates AND updates
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Batch create all empty positions in a single request
      if (positionAnalysis.emptyPositions.length > 0) {
        try {
          const createRequests: CreateTubeRequest[] = positionAnalysis.emptyPositions.map(
            ({ location }) => createTubeRequestSchema.parse({ ...formData, location })
          );

          const result = await pasteTubesMutation.mutateAsync({ tubes: createRequests });
          successCount += result.created.length;

          for (const failure of result.failed) {
            errorCount++;
            errors.push(
              `Position ${createRequests[failure.index].location.position}: ${failure.error}`
            );
          }
        } catch (error) {
          if (isOfflineError(error)) {
            return;
          }
          // Total failure — count all creates as failed
          errorCount += positionAnalysis.emptyPositions.length;
          errors.push(error instanceof Error ? error.message : 'Unknown error');
        }
      }

      // Process occupied positions (updates) - only if user explicitly allowed overwrite
      if (allowOverwrite) {
        for (const { location, tubeId } of positionAnalysis.occupiedPositions) {
          try {
            // Validate and transform raw form data through Zod schema
            const validatedUpdates = updateTubeRequestSchema.parse({
              sample: formData.sample,
              researcherId: formData.researcherId,
            });

            await updateTubeMutation.mutateAsync({
              id: tubeId,
              updates: validatedUpdates,
            });
            successCount++;
          } catch (error) {
            // If offline, stop processing - global handler shows notification
            if (isOfflineError(error)) {
              return;
            }
            errorCount++;
            errors.push(
              `Position ${location.position}: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          }
        }
      }

      // Provide comprehensive user feedback
      if (successCount === parsedPositions.length) {
        const createCount = positionAnalysis.emptyPositions.length;
        const updateCount = positionAnalysis.occupiedPositions.length;

        // Build position range display for notification
        const positionRange = batchLocationDisplay?.positionRanges ?? '';

        if (createCount > 0 && updateCount > 0) {
          notifications.success(
            `Successfully filled ${successCount} positions (${createCount} new, ${updateCount} updated) at ${positionRange}`
          );
        } else if (createCount > 0) {
          const message =
            successCount > 1
              ? `Successfully created ${successCount} tubes at positions ${positionRange}`
              : `Successfully created tube at position ${positionRange}`;
          notifications.success(message);
        } else {
          const message =
            successCount > 1
              ? `Successfully updated ${successCount} tubes at positions ${positionRange}`
              : `Successfully updated tube at position ${positionRange}`;
          notifications.success(message);
        }
        onClose();
      } else if (successCount > 0) {
        notifications.warning(
          `Processed ${successCount} of ${parsedPositions.length} positions. ${errorCount} failed.`
        );
        if (errors.length > 0) {
          logger.warn('Tube operation errors', { errors });
        }
      } else {
        // Skip error notification if it was an offline error - global handler shows it
        if (!errors.some(e => e.includes('offline'))) {
          notifications.error('Failed to process any positions');
          if (errors.length > 0) {
            notifications.error(errors[0]);
          }
        }
      }
    } catch (error) {
      // Skip notification for offline errors - global handler already shows it
      if (!isOfflineError(error)) {
        logger.error('Tube creation error', { error });
        notifications.error('An unexpected error occurred during tube creation');
      }
    }
  };

  // Use React Hook Form's built-in validation state (more efficient)
  const isFormValid = form.formState.isValid;

  return (
    <BaseModal
      isOpen={isOpen}
      title={`Add ${parsedPositions.length > 1 ? parsedPositions.length : ''} Tube${parsedPositions.length > 1 ? 's' : ''}`}
      icon={<Plus className="w-5 h-5" />}
      onClose={onClose}
      size="md-lg"
      dataAttribute="data-tube-modal"
      mode="create"
      contentClassName="p-5"
      footer={
        <div className="flex justify-end space-x-4">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="tube-create-form"
            variant="primary"
            disabled={!isFormValid}
            isLoading={isSubmitting}
            loadingText="Adding..."
            leftIcon={<Plus className="w-4 h-4" />}
          >
            {parsedPositions.length === 1 ? 'Add Tube' : `Add ${parsedPositions.length} Tubes`}
          </Button>
        </div>
      }
    >
      <form
        id="tube-create-form"
        onSubmit={form.handleSubmit(handleFormSubmit)}
        className="space-y-3"
      >
        <div className="space-y-3">
          {parsedPositions.length === 1 && parsedPositions[0] && (
            <LocationDisplay
              tankId={parsedPositions[0].location.tankId}
              rackId={parsedPositions[0].location.rackId}
              boxId={parsedPositions[0].location.boxId}
              position={parsedPositions[0].location.position}
            />
          )}
          {parsedPositions.length > 1 && batchLocationDisplay && (
            <LocationDisplay
              tankName={batchLocationDisplay.tankName}
              rackName={batchLocationDisplay.rackName}
              boxName={batchLocationDisplay.boxName}
              positionLabel={batchLocationDisplay.positionRanges}
            />
          )}

          {mountReady && positionAnalysis.isMixed && (
            <AlertBanner variant="warning" spacing="none">
              <label className="flex items-center gap-2 cursor-pointer">
                <span>
                  Overwrite {positionAnalysis.occupiedPositions.length} occupied position
                  {positionAnalysis.occupiedPositions.length > 1 ? 's' : ''}?
                </span>
                <Checkbox checked={allowOverwrite} onChange={setAllowOverwrite} />
              </label>
            </AlertBanner>
          )}
        </div>

        <TubeForm
          control={form.control as Control<CreateTubeRequest | UpdateTubeRequest>}
          register={form.register as UseFormRegister<CreateTubeRequest | UpdateTubeRequest>}
          errors={form.formState.errors as FieldErrors<CreateTubeRequest | UpdateTubeRequest>}
          trigger={form.trigger as UseFormTrigger<CreateTubeRequest | UpdateTubeRequest>}
          researchers={researchers}
          speciesOptions={speciesOptions}
          sourceOptions={sourceOptions}
          mediaOptions={mediaOptions}
          isLoading={isSubmitting}
        />
      </form>
    </BaseModal>
  );
}
