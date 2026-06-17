/**
 * Tube Editor
 *
 * Modal for creating and editing tubes with create, edit, and mixed modes.
 */

import { useMemo, useState, useEffect } from 'react';

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
  formatStorageDisplayName,
} from '@odysseus/shared-schemas';
import { Edit, Plus, Save, Trash2 } from 'lucide-react';

import { useModalStore } from '@app/stores/modalStore';
import { useActiveResearchersQuery } from '@domains/researchers';
import { useStorageData, formatPositionRangesForBox, DEFAULT_GRID_CONFIG } from '@domains/storage';
import { useTubesByLocation, useTube } from '@domains/tubes';
import { useCreateTubeForm, useEditTubeForm } from '@domains/tubes/hooks/useTubeForm';
import {
  useUpdateTubeMutation,
  useDeleteTubeMutation,
  usePasteTubesMutation,
} from '@domains/tubes/hooks/useTubeMutations';
import { parsePositionKey, type PositionKey } from '@domains/tubes/types/gridSelectionTypes';
import { useUserSettings } from '@domains/users';
import { isOfflineError } from '@infra/api';
import { logger } from '@infra/logger';
import { useLookupValuesQuery } from '@shared/hooks/useLookupValuesQuery';
import { AlertBanner, Button, Checkbox } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/overlays';
import { InfoDialog } from '@shared/ui/components/overlays/InfoDialog';
import { notifications } from '@shared/utils';
import { formatDateForInput } from '@shared/utils/dateFormatters';

import { TubeLocationDisplay } from '../info-panel/TubeLocationDisplay';

import { countDirtyFields } from './countDirtyFields';
import { TubeForm } from './TubeForm';
import { useTubeModalFocusReturn } from './useTubeModalFocusReturn';

import type { SelectOption } from '@shared/ui/primitives/select/types';
import type {
  Control,
  UseFormRegister,
  UseFormSetValue,
  FieldErrors,
  UseFormTrigger,
} from 'react-hook-form';

export interface TubeEditorModalProps {
  isOpen?: boolean;
  onClose: () => void;
  tubeId?: string;
  rackId?: string;
  boxId?: string;
  selectedPositions?: Set<PositionKey>;
}

export function TubeEditorModal(props: TubeEditorModalProps) {
  const { isOpen = true, tubeId, onClose } = props;
  const isEditMode = Boolean(tubeId);

  if (isEditMode) {
    return <EditModeContent isOpen={isOpen} tubeId={tubeId!} onClose={onClose} />;
  } else {
    return <CreateModeContent {...props} isOpen={isOpen} onClose={onClose} />;
  }
}

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

  const { data: tube, isLoading: isFetchingTube, isError } = useTube(tubeId);

  useTubeModalFocusReturn();

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
  // Uses FORM INPUT type (pre-transformation): concentration as string, date as string
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

  // Receives form INPUT type, Zod transforms to OUTPUT type
  const handleFormSubmit = async (validatedData: UpdateTubeFormInput) => {
    // Mark as saving to suppress stale warning (our save triggers version bump)
    setIsSavingLocal(true);

    try {
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

  const { isValid: isFormValid, isDirty } = form.formState;
  const canSubmit = isFormValid && isDirty;

  const dirtyFieldCount = countDirtyFields(form.formState.dirtyFields);

  return (
    <BaseModal
      isOpen={isOpen}
      title="Edit Tube"
      icon={<Edit className="w-5 h-5" />}
      onClose={onClose}
      size="md-lg"
      dataAttribute="data-tube-modal"
      mode="edit"
      chassis="lit"
      contentClassName="p-5"
      locator={
        <TubeLocationDisplay
          variant="strip"
          tankId={tube.location.tankId}
          rackId={tube.location.rackId}
          boxId={tube.location.boxId}
          position={tube.location.position}
        />
      }
      footer={
        <div className="flex items-center justify-between gap-4">
          {dirtyFieldCount > 0 ? (
            <div className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.22em] text-muted-foreground whitespace-nowrap">
              <span
                aria-hidden
                className="h-2.5 w-0.5 bg-warning-bg/80 shadow-[0_0_6px_hsl(var(--color-warning-bg)/0.55)]"
              />
              <span className="text-secondary-foreground">{dirtyFieldCount}</span>
              <span>unsaved {dirtyFieldCount === 1 ? 'change' : 'changes'}</span>
            </div>
          ) : (
            <span />
          )}
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
        </div>
      }
    >
      <form
        id="tube-edit-form"
        onSubmit={form.handleSubmit(handleFormSubmit)}
        className="space-y-3"
      >
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
            setValue={form.setValue as UseFormSetValue<CreateTubeRequest | UpdateTubeRequest>}
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

function CreateModeContent({ isOpen = true, onClose, selectedPositions }: TubeEditorModalProps) {
  const { data: researchers = [] } = useActiveResearchersQuery();
  const { data: speciesValues = [] } = useLookupValuesQuery('species');
  const { data: sourceValues = [] } = useLookupValuesQuery('source');
  const { data: mediaValues = [] } = useLookupValuesQuery('media');
  // All selected positions are within a single box (tubeStore clears selection on box change).
  const firstPositionLocation = useMemo(() => {
    if (!selectedPositions || selectedPositions.size === 0) return undefined;
    const first = selectedPositions.values().next().value;
    if (!first) return undefined;
    const { tankId, rackId, boxId } = parsePositionKey(first);
    return { tankId, rackId, boxId };
  }, [selectedPositions]);

  const { data: boxTubes = [] } = useTubesByLocation(
    firstPositionLocation?.tankId ?? '',
    firstPositionLocation?.rackId ?? '',
    firstPositionLocation?.boxId ?? '',
    { enabled: !!firstPositionLocation }
  );
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

  const [allowOverwrite, setAllowOverwrite] = useState(false);

  useTubeModalFocusReturn();

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

  const positionAnalysis = useMemo(() => {
    const emptyPositions = [];
    const occupiedPositions = [];

    for (const parsed of parsedPositions) {
      const { position } = parsed.location;
      const existingTube = boxTubes.find(t => t.location.position === position);

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
  }, [parsedPositions, boxTubes]);

  const bulkLocationDisplay = useMemo(() => {
    if (parsedPositions.length === 0) return null;

    const firstLocation = parsedPositions[0].location;
    const tanks = currentLab?.equipment?.tanks ?? [];
    const tank = tanks.find(t => t.id === firstLocation.tankId);
    const tankName = tank?.name ?? `Tank ${firstLocation.tankId}`;

    const rack = tank?.racks?.find(r => r.id === firstLocation.rackId);
    const rackGenericName = rack?.name ?? `Rack ${firstLocation.rackId}`;
    const rackName = formatStorageDisplayName(rackGenericName, rack?.customLabel);

    const box = rack?.boxes?.find(b => b.id === firstLocation.boxId);
    const boxGenericName = box?.name ?? `Box ${firstLocation.boxId}`;
    const boxName = formatStorageDisplayName(boxGenericName, box?.customLabel);

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

  // FORM INPUT type (pre-transformation): concentration as string, date as string
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

  // Only show individual notifications for single tube creation, not bulk operations
  const isSingleTube = parsedPositions.length === 1;
  const { form, submitTube, isSubmitting } = useCreateTubeForm({
    initialData: defaultValues,
    onSuccess: isSingleTube
      ? data => {
          notifications.success(`Successfully created tube at position ${data.location.position}`);
          onClose();
        }
      : undefined, // Bulk mode: notification handled after all tubes are created
    onError: isSingleTube
      ? error => {
          // Skip notification for offline errors - global handler already shows it
          if (!isOfflineError(error)) {
            notifications.error(`Failed to create tube: ${error.message}`);
          }
        }
      : undefined, // Bulk mode: errors handled in handleFormSubmit
  });

  // Reset form when modal opens to clear any stale data
  useEffect(() => {
    if (isOpen) {
      form.reset(defaultValues);
      setAllowOverwrite(false);
    }
  }, [isOpen, form, defaultValues]);

  // Receives form INPUT type, Zod transforms to OUTPUT type
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

      // Bulk create all empty positions in a single request
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

      if (successCount === parsedPositions.length) {
        const createCount = positionAnalysis.emptyPositions.length;
        const updateCount = positionAnalysis.occupiedPositions.length;

        // Build position range display for notification
        const positionRange = bulkLocationDisplay?.positionRanges ?? '';

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

  const isFormValid = form.formState.isValid;

  const locatorNode =
    parsedPositions.length === 1 && parsedPositions[0] ? (
      <TubeLocationDisplay
        variant="strip"
        tankId={parsedPositions[0].location.tankId}
        rackId={parsedPositions[0].location.rackId}
        boxId={parsedPositions[0].location.boxId}
        position={parsedPositions[0].location.position}
      />
    ) : parsedPositions.length > 1 && bulkLocationDisplay ? (
      <TubeLocationDisplay
        variant="strip"
        tankName={bulkLocationDisplay.tankName}
        rackName={bulkLocationDisplay.rackName}
        boxName={bulkLocationDisplay.boxName}
        positionLabel={bulkLocationDisplay.positionRanges}
      />
    ) : null;

  return (
    <BaseModal
      isOpen={isOpen}
      title={`Add ${parsedPositions.length > 1 ? parsedPositions.length : ''} Tube${parsedPositions.length > 1 ? 's' : ''}`}
      icon={<Plus className="w-5 h-5" />}
      onClose={onClose}
      size="md-lg"
      dataAttribute="data-tube-modal"
      mode="create"
      chassis="lit"
      contentClassName="p-5"
      locator={locatorNode}
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
          {positionAnalysis.isMixed && (
            <AlertBanner variant="warning" spacing="none" animate={false}>
              <label className="flex items-center gap-3 cursor-pointer">
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
          setValue={form.setValue as UseFormSetValue<CreateTubeRequest | UpdateTubeRequest>}
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
