import { useMemo, useState, useEffect, useRef } from 'react';

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
import { useStorageData, formatPositionRangesForBox, DEFAULT_GRID_CONFIG } from '@domains/storage';
import { useTubesByLocation, useTube } from '@domains/tubes/hooks';
import { useCreateTubeForm, useEditTubeForm } from '@domains/tubes/hooks/useTubeForm';
import {
  useUpdateTubeMutation,
  useDeleteTubeMutation,
  usePasteTubesMutation,
} from '@domains/tubes/hooks/useTubeMutations';
import { parsePositionKey, type PositionKey } from '@domains/tubes/types/gridSelectionTypes';
import { buildRemoveTubeConfirmation } from '@domains/tubes/utils/removeTubeConfirmation';
import { useUserSettings } from '@domains/users';
import { isOfflineError } from '@infra/api';
import { logger } from '@infra/logger';
import { useDemoItemLock } from '@shared/hooks/useDemoItemLock';
import {
  AccentTick,
  AlertBanner,
  Button,
  Checkbox,
  DemoLockIndicator,
  LoadingSpinner,
} from '@shared/ui';
import { BaseModal } from '@shared/ui/components/overlays';
import { InfoDialog } from '@shared/ui/components/overlays/InfoDialog';
import { notifications } from '@shared/utils';
import { normalizeDateString } from '@shared/utils/dateFormatters';

import { TubeLocationDisplay } from '../info-panel/TubeLocationDisplay';

import { countDirtyFields } from './countDirtyFields';
import { TubeForm } from './TubeForm';
import { useTubeFormOptions } from './useTubeFormOptions';
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
  const { researchers, speciesOptions, sourceOptions, mediaOptions } = useTubeFormOptions();

  const { data: tube, isLoading: isFetchingTube, isError } = useTube(tubeId);

  const lastTubeRef = useRef(tube);
  if (tube) {
    lastTubeRef.current = tube;
  }
  const displayTube = tube ?? lastTubeRef.current;

  useTubeModalFocusReturn();

  if (isOpen && isError) {
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

  if (isFetchingTube || !displayTube) {
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
          <LoadingSpinner size={32} className="text-primary" />
          <span className="ml-3 text-muted-foreground">Loading tube data...</span>
        </div>
      </BaseModal>
    );
  }

  return (
    <EditModeForm
      isOpen={isOpen}
      tube={displayTube}
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
  const isDemoLockedTube = useDemoItemLock();
  const isLocked = isDemoLockedTube(tube);
  const initialData: Partial<UpdateTubeFormInput> = useMemo(
    () => ({
      sample: {
        cellType: tube.sample.cellType ?? '',
        donorInternalId: tube.sample.donorInternalId ?? '',
        donorSourceId: tube.sample.donorSourceId ?? '',
        concentration: formatConcentrationDisplay(tube.sample.concentration) || undefined,
        concentrationUnit: tube.sample.concentrationUnit ?? undefined,
        date: tube.sample.date ? normalizeDateString(tube.sample.date) : '',
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

  const [openedWithVersion, setOpenedWithVersion] = useState(tube.version);
  const [staleWarningDismissed, setStaleWarningDismissed] = useState(false);
  const [isSavingLocal, setIsSavingLocal] = useState(false);

  // PITFALL: our own save bumps the version, so the stale warning is suppressed while saving.
  const isStale = tube.version > openedWithVersion;
  const showStaleWarning =
    isStale && form.formState.isDirty && !staleWarningDismissed && !isSavingLocal;

  const handleRefresh = () => {
    form.reset(initialData);
    setOpenedWithVersion(tube.version);
    setStaleWarningDismissed(false);
  };

  useEffect(() => {
    if (isOpen) {
      form.reset(initialData);
      setOpenedWithVersion(tube.version);
      setStaleWarningDismissed(false);
      setIsSavingLocal(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only reset when modal opens
  }, [isOpen]);

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

  const handleFormSubmit = async (validatedData: UpdateTubeFormInput) => {
    setIsSavingLocal(true);

    try {
      const result = await submitTube(validatedData, { location: tube.location });

      if (result.success) {
        notifications.success('Tube updated successfully');
        onClose();
      } else {
        setIsSavingLocal(false);
      }
    } catch (error) {
      setIsSavingLocal(false);
      // PITFALL: the global mutation error handler already toasted; this only logs.
      if (!isOfflineError(error)) {
        logger.error('Tube update failed', { tubeId, error });
      }
    }
  };

  const handleDelete = () => {
    modalService.hideDeleteConfirm();
    deleteMutation.mutate(tubeId, {
      onSuccess: () => {
        notifications.success('Tube removed successfully');
        onClose();
      },
    });
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
          tankId={tube.location.tankId}
          rackId={tube.location.rackId}
          boxId={tube.location.boxId}
          position={tube.location.position}
        />
      }
      footer={
        <div className="flex items-center justify-between gap-4">
          {dirtyFieldCount > 0 ? (
            <div className="flex items-center gap-2 type-label text-label-2xs tracking-label-wide text-muted-foreground whitespace-nowrap">
              <AccentTick tone="warning" />
              <span className="text-secondary-foreground">{dirtyFieldCount}</span>
              <span>unsaved {dirtyFieldCount === 1 ? 'change' : 'changes'}</span>
            </div>
          ) : (
            <span />
          )}
          <div className="flex items-center justify-end space-x-4">
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            {isLocked ? (
              <DemoLockIndicator />
            ) : (
              <Button
                variant="danger"
                disabled={isSubmitting}
                leftIcon={<Trash2 className="w-4 h-4" />}
                onClick={() => {
                  modalService.showDeleteConfirm({
                    ...buildRemoveTubeConfirmation(1),
                    onConfirm: handleDelete,
                  });
                }}
              >
                Remove Tube
              </Button>
            )}
            <Button
              type="submit"
              form="tube-edit-form"
              variant="primary"
              disabled={!canSubmit}
              isLoading={isSubmitting}
              loadingText="Saving..."
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save Changes
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
        {showStaleWarning && (
          <AlertBanner
            variant="warning"
            title="This tube was modified by another user"
            spacing="none"
            className="text-caption"
            actions={
              <div className="flex gap-2">
                <Button type="button" variant="warning" size="sm" onClick={handleRefresh}>
                  Refresh
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setStaleWarningDismissed(true)}
                >
                  Continue Editing
                </Button>
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
  const { researchers, speciesOptions, sourceOptions, mediaOptions } = useTubeFormOptions();
  // PITFALL: every selected position is in one box because tubeStore clears the selection on box change.
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

  const isSingleTube = parsedPositions.length === 1;
  const { form, submitTube, isSubmitting } = useCreateTubeForm({
    initialData: defaultValues,
    onSuccess: isSingleTube
      ? data => {
          notifications.success(`Successfully created tube at position ${data.location.position}`);
          onClose();
        }
      : undefined,
  });

  useEffect(() => {
    if (isOpen) {
      form.reset(defaultValues);
      setAllowOverwrite(false);
    }
  }, [isOpen, form, defaultValues]);

  const handleFormSubmit = async (formData: CreateTubeFormInput) => {
    try {
      if (parsedPositions.length === 0) {
        notifications.error('No valid positions selected');
        return;
      }

      if (parsedPositions.length === 1) {
        const result = await submitTube(formData, parsedPositions[0].location);

        if (result.success) {
          onClose();
        }
        return;
      }

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

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
          errorCount += positionAnalysis.emptyPositions.length;
          errors.push(error instanceof Error ? error.message : 'Unknown error');
        }
      }

      if (allowOverwrite) {
        for (const { location, tubeId } of positionAnalysis.occupiedPositions) {
          try {
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

      // PITFALL: without overwrite, occupied positions are skipped on purpose and must not count as failures.
      const createCount = positionAnalysis.emptyPositions.length;
      const updateCount = allowOverwrite ? positionAnalysis.occupiedPositions.length : 0;
      const skippedCount = allowOverwrite ? 0 : positionAnalysis.occupiedPositions.length;
      const attemptedCount = createCount + updateCount;
      const positionRange = bulkLocationDisplay?.positionRanges ?? '';

      if (attemptedCount === 0) {
        notifications.info(
          `All ${skippedCount} selected position${skippedCount !== 1 ? 's are' : ' is'} occupied. Enable overwrite to update.`
        );
      } else if (successCount === attemptedCount) {
        const skippedNote =
          skippedCount > 0
            ? ` (${skippedCount} occupied position${skippedCount !== 1 ? 's' : ''} skipped)`
            : '';

        if (createCount > 0 && updateCount > 0) {
          notifications.success(
            `Successfully filled ${successCount} positions (${createCount} new, ${updateCount} updated) at ${positionRange}${skippedNote}`
          );
        } else if (createCount > 0) {
          const message =
            successCount > 1
              ? `Successfully created ${successCount} tubes at positions ${positionRange}${skippedNote}`
              : `Successfully created tube at position ${positionRange}${skippedNote}`;
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
          `Processed ${successCount} of ${attemptedCount} positions. ${errorCount} failed.`
        );
        if (errors.length > 0) {
          logger.warn('Tube operation errors', { errors });
        }
      } else {
        if (!errors.some(e => e.includes('offline'))) {
          notifications.error('Failed to process any positions');
          if (errors.length > 0) {
            notifications.error(errors[0]);
          }
        }
      }
    } catch (error) {
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
        tankId={parsedPositions[0].location.tankId}
        rackId={parsedPositions[0].location.rackId}
        boxId={parsedPositions[0].location.boxId}
        position={parsedPositions[0].location.position}
      />
    ) : parsedPositions.length > 1 && bulkLocationDisplay ? (
      <TubeLocationDisplay
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
