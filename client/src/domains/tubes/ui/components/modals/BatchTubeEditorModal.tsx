import { useState, useMemo, useEffect, useRef } from 'react';

import {
  type CreateTubeRequest,
  type UpdateTubeRequest,
  updateTubeRequestSchema,
  formatConcentrationDisplay,
} from '@odysseus/shared-schemas';
import { XCircle, RefreshCw, Edit, Save, Trash2 } from 'lucide-react';

import { useFieldResolverQuery } from '@app/hooks/useFieldResolverQuery';
import { TUBE_FIELD_PATHS } from '@app/hooks/useSimpleFieldResolver';
import { useUserSettings } from '@domains/authentication';
import { useActiveResearchersQuery } from '@domains/researchers';
import {
  useStorageData,
  useLocationDisplayNames,
  formatPositionRangesForBox,
  DEFAULT_GRID_CONFIG,
} from '@domains/storage';
import { useLookupValuesQuery } from '@domains/tubes/hooks/useLookupValuesQuery';
import { useBatchEditTubeForm } from '@domains/tubes/hooks/useTubeForm';
import { useTubeModalFocusReturn } from '@domains/tubes/hooks/useTubeModalFocusReturn';
import {
  useBulkUpdateTubesMutation,
  useBulkDeleteTubesMutation,
} from '@domains/tubes/hooks/useTubeMutations';
import { useBulkTubes } from '@domains/tubes/hooks/useTubeQueries';
import { logger } from '@shared/infrastructure/logger';
import { AlertBanner, Button } from '@shared/ui';
import { InfoDialog } from '@shared/ui/components/InfoDialog';
import { BaseModal } from '@shared/ui/components/modals';
import { notifications } from '@shared/utils';
import { formatDateForInput } from '@shared/utils/dateUtils';

import { LocationDisplay } from '../displays/LocationDisplay';
import { TubeForm } from '../forms/TubeForm';

import { BulkProgressModal } from './BulkProgressModal';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';

import type { FieldConflictAnalysis } from '@app/hooks/useSimpleFieldResolver';
import type { BulkUpdateProgress, BulkUpdateResult } from '@domains/tubes/types';
import type { Control, UseFormRegister, FieldErrors, UseFormTrigger } from 'react-hook-form';

export interface BatchTubeEditorModalProps {
  isOpen?: boolean;
  tubeIds: string[];
  onClose: () => void;
}

interface BatchEditConflictAnalysis {
  cellType: FieldConflictAnalysis<string>;
  donorInternalId: FieldConflictAnalysis<string>;
  donorSourceId: FieldConflictAnalysis<string>;
  concentration: FieldConflictAnalysis<number>;
  concentrationUnit: FieldConflictAnalysis<string>;
  date: FieldConflictAnalysis<string>;
  mediaType: FieldConflictAnalysis<string>;
  mediaSupplements: FieldConflictAnalysis<string>;
  mediaSelection: FieldConflictAnalysis<string>;
  cultureCondition: FieldConflictAnalysis<string>;
  lotNumber: FieldConflictAnalysis<string>;
  species: FieldConflictAnalysis<string>;
  source: FieldConflictAnalysis<string>;
  catalogNumber: FieldConflictAnalysis<string>;
  passageNumber: FieldConflictAnalysis<number>;
  notes: FieldConflictAnalysis<string>;
  researcherId: FieldConflictAnalysis<string>;
}

const COUPLED_FIELDS: Record<string, string[]> = {
  concentration: ['concentrationUnit'],
  concentrationUnit: ['concentration'],
};

/** Extracts only user-modified fields to avoid clearing server data. Coupled fields always sent together for cross-field validation. */
function pickDirtyFields(
  data: Record<string, unknown>,
  dirty: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(dirty)) {
    const dirtyValue = dirty[key];
    const dataValue = data[key];

    if (dirtyValue === true) {
      result[key] = dataValue;
    } else if (
      typeof dirtyValue === 'object' &&
      dirtyValue !== null &&
      !Array.isArray(dirtyValue)
    ) {
      const nested = pickDirtyFields(
        (dataValue as Record<string, unknown>) ?? {},
        dirtyValue as Record<string, unknown>
      );
      if (Object.keys(nested).length > 0) {
        result[key] = nested;
      }
    }
  }

  // Pull in coupled siblings required by cross-field validation
  for (const key of Object.keys(result)) {
    const siblings = COUPLED_FIELDS[key];
    if (!siblings) continue;
    for (const sibling of siblings) {
      if (!(sibling in result) && data[sibling] !== undefined) {
        result[sibling] = data[sibling];
      }
    }
  }

  return result;
}

export function BatchTubeEditorModal({
  isOpen = true,
  tubeIds,
  onClose,
}: BatchTubeEditorModalProps) {
  const { data: researchers = [] } = useActiveResearchersQuery();
  const { data: speciesValues = [] } = useLookupValuesQuery('species');
  const { data: sourceValues = [] } = useLookupValuesQuery('source');
  const { data: mediaValues = [] } = useLookupValuesQuery('media');
  const { analyzeFieldConflicts } = useFieldResolverQuery();

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

  // Fetch specific tubes by ID - ensures fresh data regardless of cache state
  const { data: tubes = [], isLoading: isTubesLoading } = useBulkTubes(tubeIds);

  useTubeModalFocusReturn();

  const conflictAnalysis = useMemo(() => {
    const analysis = {
      cellType: analyzeFieldConflicts(tubes, TUBE_FIELD_PATHS.cellType),
      donorInternalId: analyzeFieldConflicts(tubes, TUBE_FIELD_PATHS.donorInternalId),
      donorSourceId: analyzeFieldConflicts(tubes, TUBE_FIELD_PATHS.donorSourceId),
      concentration: analyzeFieldConflicts(tubes, TUBE_FIELD_PATHS.concentration),
      concentrationUnit: analyzeFieldConflicts(tubes, TUBE_FIELD_PATHS.concentrationUnit),
      date: analyzeFieldConflicts(tubes, TUBE_FIELD_PATHS.date),
      mediaType: analyzeFieldConflicts(tubes, TUBE_FIELD_PATHS.mediaType),
      mediaSupplements: analyzeFieldConflicts(tubes, TUBE_FIELD_PATHS.mediaSupplements),
      mediaSelection: analyzeFieldConflicts(tubes, TUBE_FIELD_PATHS.mediaSelection),
      cultureCondition: analyzeFieldConflicts(tubes, TUBE_FIELD_PATHS.cultureCondition),
      lotNumber: analyzeFieldConflicts(tubes, TUBE_FIELD_PATHS.lotNumber),
      species: analyzeFieldConflicts(tubes, TUBE_FIELD_PATHS.species),
      source: analyzeFieldConflicts(tubes, TUBE_FIELD_PATHS.source),
      catalogNumber: analyzeFieldConflicts(tubes, TUBE_FIELD_PATHS.catalogNumber),
      passageNumber: analyzeFieldConflicts(tubes, TUBE_FIELD_PATHS.passageNumber),
      notes: analyzeFieldConflicts(tubes, TUBE_FIELD_PATHS.notes),
      researcherId: analyzeFieldConflicts(tubes, TUBE_FIELD_PATHS.researcherId),
    } satisfies BatchEditConflictAnalysis;

    // Partial updates to concentration/unit pair corrupt data — treat as joint conflict
    if (
      analysis.concentration.state === 'conflict' ||
      analysis.concentrationUnit.state === 'conflict'
    ) {
      analysis.concentration = {
        ...analysis.concentration,
        state: 'conflict',
        commonValue: undefined,
      };
      analysis.concentrationUnit = {
        ...analysis.concentrationUnit,
        state: 'conflict',
        commonValue: undefined,
      };
    }

    const conflictingFields = Object.entries(analysis)
      .filter(([_, value]) => value.state === 'conflict')
      .map(([key, _]) => key);

    return { analysis, conflictingFields };
  }, [tubes, analyzeFieldConflicts]);

  const resolvedData = useMemo(() => {
    const { analysis } = conflictAnalysis;

    return {
      sample: {
        cellType:
          analysis.cellType.state !== 'conflict' ? (analysis.cellType.commonValue ?? '') : '',
        donorInternalId:
          analysis.donorInternalId.state !== 'conflict'
            ? (analysis.donorInternalId.commonValue ?? '')
            : '',
        donorSourceId:
          analysis.donorSourceId.state !== 'conflict'
            ? (analysis.donorSourceId.commonValue ?? '')
            : '',
        concentration:
          analysis.concentration.state !== 'conflict'
            ? analysis.concentration.commonValue != null
              ? formatConcentrationDisplay(analysis.concentration.commonValue)
              : ''
            : '',
        concentrationUnit:
          analysis.concentrationUnit.state !== 'conflict'
            ? (analysis.concentrationUnit.commonValue ?? '')
            : '',
        date:
          analysis.date.state !== 'conflict'
            ? analysis.date.commonValue
              ? formatDateForInput(analysis.date.commonValue)
              : ''
            : '',
        mediaType:
          analysis.mediaType.state !== 'conflict' ? (analysis.mediaType.commonValue ?? '') : '',
        mediaSupplements:
          analysis.mediaSupplements.state !== 'conflict'
            ? (analysis.mediaSupplements.commonValue ?? '')
            : '',
        mediaSelection:
          analysis.mediaSelection.state !== 'conflict'
            ? (analysis.mediaSelection.commonValue ?? '')
            : '',
        cultureCondition:
          analysis.cultureCondition.state !== 'conflict'
            ? (analysis.cultureCondition.commonValue ?? '')
            : '',
        lotNumber:
          analysis.lotNumber.state !== 'conflict' ? (analysis.lotNumber.commonValue ?? '') : '',
        species: analysis.species.state !== 'conflict' ? (analysis.species.commonValue ?? '') : '',
        source: analysis.source.state !== 'conflict' ? (analysis.source.commonValue ?? '') : '',
        catalogNumber:
          analysis.catalogNumber.state !== 'conflict'
            ? (analysis.catalogNumber.commonValue ?? '')
            : '',
        passageNumber:
          analysis.passageNumber.state !== 'conflict'
            ? (analysis.passageNumber.commonValue ?? '')
            : '',
        notes: analysis.notes.state !== 'conflict' ? (analysis.notes.commonValue ?? '') : '',
      },
      researcherId:
        analysis.researcherId.state !== 'conflict' ? (analysis.researcherId.commonValue ?? '') : '',
    };
  }, [conflictAnalysis]);

  const conflicts = conflictAnalysis.conflictingFields;

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState<BulkUpdateProgress>({
    current: 0,
    total: 0,
    completed: 0,
    phase: 'preparing',
    errors: [],
  });
  const [result, setResult] = useState<BulkUpdateResult | null>(null);
  const [dataReady, setDataReady] = useState(false);

  const { form, isSubmitting: formSubmitting } = useBatchEditTubeForm({
    initialData: resolvedData,
  });

  // Destructure in render phase so React Hook Form's proxy triggers re-renders
  const { errors, dirtyFields, isValid, isDirty } = form.formState;

  const canSubmit = isValid && isDirty && dataReady;

  const userHasEdited = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      userHasEdited.current = false;
      setDataReady(false);
      return;
    }

    if (tubes.length === 0) {
      setDataReady(false);
      return;
    }

    if (!userHasEdited.current) {
      form.reset(resolvedData);
      setDataReady(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, resolvedData, tubes.length]);

  useEffect(() => {
    if (isDirty) userHasEdited.current = true;
  }, [isDirty]);

  const bulkUpdateMutation = useBulkUpdateTubesMutation();
  const bulkDeleteMutation = useBulkDeleteTubesMutation();
  const isSubmitting =
    formSubmitting || bulkUpdateMutation.isPending || bulkDeleteMutation.isPending;

  /** Builds a validated payload from only the fields the user modified */
  const buildDirtyPayload = (): UpdateTubeRequest | undefined => {
    const rawFormData = form.getValues();
    const dirty = form.formState.dirtyFields;
    const dirtyPayload = pickDirtyFields(rawFormData, dirty);

    if (Object.keys(dirtyPayload).length === 0) return undefined;

    return updateTubeRequestSchema.parse(dirtyPayload);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowProgress(true);
    setResult(null);

    try {
      const validatedUpdates = buildDirtyPayload();

      if (!validatedUpdates) {
        notifications.info('No changes to save');
        setShowProgress(false);
        return;
      }

      const bulkResult = await bulkUpdateMutation.mutateAsync({
        tubeIds,
        updates: validatedUpdates,
        onProgress: progress => {
          setProgress({
            current: progress.completed,
            total: progress.total,
            completed: progress.completed,
            currentTubeId: progress.currentId,
            phase: 'updating',
            errors: [],
          });
        },
      });

      setResult(bulkResult);

      if (bulkResult.success) {
        notifications.success(`Updated ${tubeIds.length} tubes successfully`);
        setShowProgress(false);
        onClose();
      } else {
        notifications.error('Some tubes failed to update');
      }
    } catch (error) {
      logger.error('Batch update error', { error });
      notifications.error('Failed to update tubes');
      setShowProgress(false);
    }
  };

  const handleProgressClose = () => {
    setShowProgress(false);
  };

  const handleRetryFailures = async () => {
    if (!result || result.success) return;

    const failedTubeIds = result.errors.map(error => error.itemId);

    if (failedTubeIds.length === 0) {
      notifications.info('No retryable failures found');
      return;
    }

    // Retry only the failed tubes
    setShowProgress(true);
    setResult(null);

    try {
      const validatedUpdates = buildDirtyPayload();

      if (!validatedUpdates) {
        notifications.info('No changes to retry');
        setShowProgress(false);
        return;
      }

      const retryResult = await bulkUpdateMutation.mutateAsync({
        tubeIds: failedTubeIds,
        updates: validatedUpdates,
        onProgress: progress => {
          setProgress({
            current: progress.completed,
            total: progress.total,
            completed: progress.completed,
            currentTubeId: progress.currentId,
            phase: 'updating',
            errors: [],
          });
        },
      });
      setResult(retryResult);

      if (retryResult.success) {
        notifications.success(`Retry successful: Updated ${retryResult.successCount} tubes`);
        setShowProgress(false);
        onClose();
      } else {
        notifications.warning(
          `⚠️ Retry completed: ${retryResult.successCount}/${retryResult.totalProcessed} successful`
        );
      }
    } catch (error) {
      logger.error('Retry error', { error });
      notifications.error('Retry failed');
      setShowProgress(false);
    }
  };

  const handleBatchDelete = async () => {
    try {
      const deleteResult = await bulkDeleteMutation.mutateAsync({
        tubeIds,
        onProgress: progress => {
          setProgress({
            current: progress.completed,
            total: progress.total,
            completed: progress.completed,
            currentTubeId: progress.currentId,
            phase: 'updating',
            errors: [],
          });
        },
      });

      if (deleteResult.success) {
        notifications.success(`Removed ${deleteResult.successCount} tubes successfully`);
        onClose();
      } else {
        notifications.error(
          `Removed ${deleteResult.successCount} of ${deleteResult.totalProcessed} tubes`
        );
      }
    } catch (error) {
      logger.error('Batch delete error', { error });
      notifications.error('Failed to remove tubes');
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const tankId = tubes[0]?.location.tankId || '';
  const rackId = tubes[0]?.location.rackId || '';
  const boxId = tubes[0]?.location.boxId || '';

  // Only show validation errors for fields the user has touched
  const isRelatedFieldDirty = (
    fieldKey: string,
    parentDirtyNode: Record<string, unknown> | null | undefined
  ): boolean => {
    if (!parentDirtyNode) return false;
    const relatedFields = COUPLED_FIELDS[fieldKey] || [];
    return relatedFields.some(relatedKey => parentDirtyNode?.[relatedKey] === true);
  };

  const filterNode = (
    errorNode: Record<string, unknown> | null | undefined,
    dirtyNode: Record<string, unknown> | null | undefined,
    path = ''
  ): Record<string, unknown> | undefined => {
    if (!errorNode || typeof errorNode !== 'object') return undefined;

    const filtered: Record<string, unknown> = {};
    let hasAnyErrors = false;

    for (const key in errorNode) {
      const errorValue = errorNode[key];
      const dirtyValue = dirtyNode?.[key];
      const currentPath = path ? `${path}.${key}` : key;

      // If this is an error leaf (has 'message' property)
      if (errorValue && typeof errorValue === 'object' && 'message' in errorValue) {
        // Include if field is dirty OR a related field is dirty
        const isRelated = isRelatedFieldDirty(key, dirtyNode);
        if (dirtyValue === true || isRelated) {
          filtered[key] = errorValue;
          hasAnyErrors = true;
        }
      }
      // If this is a nested object, recurse
      else if (typeof errorValue === 'object') {
        const nestedFiltered = filterNode(
          errorValue as Record<string, unknown>,
          dirtyValue as Record<string, unknown>,
          currentPath
        );
        if (nestedFiltered && Object.keys(nestedFiltered).length > 0) {
          filtered[key] = nestedFiltered;
          hasAnyErrors = true;
        }
      }
    }

    return hasAnyErrors ? filtered : undefined;
  };

  const filteredErrors = filterNode(errors, dirtyFields) ?? {};

  const {
    tankName,
    rackName,
    boxName,
    box: boxObj,
  } = useLocationDisplayNames(tankId, rackId, boxId);
  const { currentLab } = useStorageData();

  // Get user settings for position display preferences
  const { settings: userSettings } = useUserSettings();

  // Format position ranges for display with flexible formatting
  const gridConfig = boxObj?.gridConfig ?? DEFAULT_GRID_CONFIG;
  const positionRanges = formatPositionRangesForBox(
    tubes.map(t => t.location.position),
    tankId,
    rackId,
    boxId,
    gridConfig,
    currentLab,
    userSettings
  );

  // Handle case where all selected tubes were deleted/moved (only after loading completes)
  if (!isTubesLoading && tubes.length === 0) {
    return (
      <InfoDialog
        isOpen={isOpen}
        variant="warning"
        title="Tubes Not Found"
        message="The selected tubes no longer exist. They may have been deleted or moved by another user."
        buttonText="Close"
        onClose={onClose}
      />
    );
  }

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        title={`Edit ${tubes.length} Tubes`}
        icon={<Edit className="w-5 h-5" />}
        onClose={onClose}
        size="md-lg"
        dataAttribute="data-batch-edit-modal"
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
              onClick={() => setShowDeleteConfirm(true)}
            >
              Remove {tubes.length} Tubes
            </Button>
            <Button
              type="submit"
              form="tube-batch-edit-form"
              variant="primary"
              disabled={!canSubmit}
              isLoading={isSubmitting}
              loadingText="Updating..."
              leftIcon={<Save className="w-4 h-4" />}
            >
              Update {tubes.length} Tubes
            </Button>
          </div>
        }
      >
        <form id="tube-batch-edit-form" onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-3">
            <LocationDisplay
              tankName={tankName}
              rackName={rackName}
              boxName={boxName}
              positionLabel={positionRanges}
            />
            {dataReady && conflicts.length > 0 && (
              <AlertBanner variant="warning" spacing="none">
                {conflicts.length} field{conflicts.length > 1 ? 's' : ''} with conflicting values{' '}
                {conflicts.length > 1 ? 'have' : 'has'} been cleared
              </AlertBanner>
            )}
          </div>

          <TubeForm
            control={form.control as Control<CreateTubeRequest | UpdateTubeRequest>}
            register={form.register as UseFormRegister<CreateTubeRequest | UpdateTubeRequest>}
            errors={filteredErrors as FieldErrors<CreateTubeRequest | UpdateTubeRequest>}
            trigger={form.trigger as UseFormTrigger<CreateTubeRequest | UpdateTubeRequest>}
            researchers={researchers}
            speciesOptions={speciesOptions}
            sourceOptions={sourceOptions}
            mediaOptions={mediaOptions}
            isLoading={isSubmitting}
            conflictingFields={conflicts}
          />
        </form>

        {result && !result.success && result.errors.length > 0 && !showProgress && (
          <div className="mt-6 p-4 bg-muted border border-danger-border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <XCircle size={20} className="text-danger-text" />
                <span className="font-semibold text-danger-text">
                  Update Issues ({result.errors.length})
                </span>
              </div>
              {result.errors.length > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRetryFailures}
                  disabled={isSubmitting}
                  leftIcon={<RefreshCw size={14} />}
                >
                  Retry
                </Button>
              )}
            </div>

            <div className="max-h-32 overflow-y-auto space-y-2">
              {result.errors.slice(0, 5).map((error, index) => (
                <div key={index} className="text-sm text-danger-text flex items-start space-x-2">
                  <div className="font-mono text-xs bg-muted px-2 py-1 rounded">{error.itemId}</div>
                  <div className="flex-1">
                    {error.error}
                    {error.field && (
                      <span className="ml-2 text-xs text-danger-text">({error.field})</span>
                    )}
                  </div>
                </div>
              ))}
              {result.errors.length > 5 && (
                <div className="text-sm text-danger-text italic">
                  +{result.errors.length - 5} more errors...
                </div>
              )}
            </div>

            {result.duration && (
              <div className="mt-2 text-xs text-secondary-foreground">
                Completed in {(result.duration / 1000).toFixed(1)}s
              </div>
            )}
          </div>
        )}
      </BaseModal>

      <BulkProgressModal
        isOpen={showProgress}
        progress={progress}
        onClose={handleProgressClose}
        canClose={!isSubmitting && result !== null}
      />

      <DeleteConfirmDialog
        isOpen={showDeleteConfirm}
        title="Remove All Tubes"
        message={`Are you sure you want to remove all ${tubes.length} tubes? This action cannot be undone and will permanently remove all selected tubes from your inventory.`}
        confirmText={`Remove All ${tubes.length}`}
        onConfirm={handleBatchDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        isLoading={isSubmitting}
      />
    </>
  );
}
