import { useState, useMemo, useEffect, useRef } from 'react';

import {
  type CreateTubeRequest,
  type UpdateTubeRequest,
  updateTubeRequestSchema,
  formatConcentrationDisplay,
  EQUIPMENT_DEFAULTS,
} from '@odysseus/shared-schemas';
import { XCircle, RefreshCw, MapPin, Edit, Save, Trash2 } from 'lucide-react';

import { useFieldResolverQuery } from '@app/hooks/useFieldResolverQuery';
import { TUBE_FIELD_PATHS } from '@app/hooks/useSimpleFieldResolver';
import { useUserSettings } from '@domains/authentication';
import { useActiveResearchersQuery } from '@domains/researchers';
import {
  useStorageData,
  useLocationDisplayNames,
  formatPositionRangesForBox,
} from '@domains/storage';
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

/** Media fields use dot-notation keys and require bracket notation: analysis['media.type'] */
interface BatchEditConflictAnalysis {
  cellType: FieldConflictAnalysis<string>;
  donorInternalId: FieldConflictAnalysis<string>;
  donorSourceId: FieldConflictAnalysis<string>;
  concentration: FieldConflictAnalysis<number>;
  concentrationUnit: FieldConflictAnalysis<string>;
  date: FieldConflictAnalysis<string>;
  'media.type': FieldConflictAnalysis<string>;
  'media.supplements': FieldConflictAnalysis<string>;
  'media.selection': FieldConflictAnalysis<string>;
  cultureCondition: FieldConflictAnalysis<string>;
  lotNumber: FieldConflictAnalysis<string>;
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

export default function BatchTubeEditorModal({
  isOpen = true,
  tubeIds,
  onClose,
}: BatchTubeEditorModalProps) {
  const { data: researchers = [] } = useActiveResearchersQuery();
  const { analyzeFieldConflicts } = useFieldResolverQuery();

  // Fetch specific tubes by ID - ensures fresh data regardless of cache state
  const { data: tubes = [] } = useBulkTubes(tubeIds);

  useTubeModalFocusReturn();

  const conflictAnalysis = useMemo(() => {
    const analysis = {
      cellType: analyzeFieldConflicts(tubes, TUBE_FIELD_PATHS.cellType),
      donorInternalId: analyzeFieldConflicts(tubes, TUBE_FIELD_PATHS.donorInternalId),
      donorSourceId: analyzeFieldConflicts(tubes, TUBE_FIELD_PATHS.donorSourceId),
      concentration: analyzeFieldConflicts(tubes, TUBE_FIELD_PATHS.concentration),
      concentrationUnit: analyzeFieldConflicts(tubes, TUBE_FIELD_PATHS.concentrationUnit),
      date: analyzeFieldConflicts(tubes, TUBE_FIELD_PATHS.date),
      'media.type': analyzeFieldConflicts(tubes, 'sample.media.type'),
      'media.supplements': analyzeFieldConflicts(tubes, 'sample.media.supplements'),
      'media.selection': analyzeFieldConflicts(tubes, 'sample.media.selection'),
      cultureCondition: analyzeFieldConflicts(tubes, TUBE_FIELD_PATHS.cultureCondition),
      lotNumber: analyzeFieldConflicts(tubes, TUBE_FIELD_PATHS.lotNumber),
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
              : undefined
            : undefined,
        concentrationUnit:
          analysis.concentrationUnit.state !== 'conflict'
            ? analysis.concentrationUnit.commonValue
            : undefined,
        date:
          analysis.date.state !== 'conflict'
            ? analysis.date.commonValue
              ? formatDateForInput(analysis.date.commonValue)
              : ''
            : '',
        media: {
          type:
            analysis['media.type'].state !== 'conflict'
              ? (analysis['media.type'].commonValue ?? '')
              : '',
          supplements:
            analysis['media.supplements'].state !== 'conflict'
              ? (analysis['media.supplements'].commonValue ?? '')
              : '',
          selection:
            analysis['media.selection'].state !== 'conflict'
              ? (analysis['media.selection'].commonValue ?? '')
              : '',
        },
        cultureCondition:
          analysis.cultureCondition.state !== 'conflict'
            ? (analysis.cultureCondition.commonValue ?? '')
            : '',
        lotNumber:
          analysis.lotNumber.state !== 'conflict' ? (analysis.lotNumber.commonValue ?? '') : '',
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

  const { form, isSubmitting: formSubmitting } = useBatchEditTubeForm({
    initialData: resolvedData,
  });

  // Destructure in render phase so React Hook Form's proxy triggers re-renders
  const { errors, dirtyFields, isValid, isDirty } = form.formState;

  const canSubmit = isValid && isDirty;

  // Prevents socket updates from overwriting user changes mid-edit
  const userHasEdited = useRef(false);
  const prevTubeIdsRef = useRef<string[]>([]);
  const initialResetDone = useRef(false);

  // Reset form only when tubeIds change (user selected different tubes)
  useEffect(() => {
    const key = tubeIds.join(',');
    if (key !== prevTubeIdsRef.current.join(',')) {
      userHasEdited.current = false;
      initialResetDone.current = false;
      prevTubeIdsRef.current = tubeIds;
    }
  }, [tubeIds]);

  // Sync form with server data only once per tube selection, after data is loaded
  useEffect(() => {
    if (!userHasEdited.current && !initialResetDone.current && tubes.length > 0) {
      form.reset(resolvedData);
      initialResetDone.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedData, tubes.length]);

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
  const RELATED_FIELDS: Record<string, string[]> = {
    concentration: ['concentrationUnit'],
    concentrationUnit: ['concentration'],
  };

  const isRelatedFieldDirty = (
    fieldKey: string,
    parentDirtyNode: Record<string, unknown> | null | undefined
  ): boolean => {
    if (!parentDirtyNode) return false;
    const relatedFields = RELATED_FIELDS[fieldKey] || [];
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
  const gridConfig = boxObj?.gridConfig ?? {
    rows: EQUIPMENT_DEFAULTS.GRID_ROWS,
    cols: EQUIPMENT_DEFAULTS.GRID_COLS,
    template: 'standard' as const,
  };
  const positionRanges = formatPositionRangesForBox(
    tubes.map(t => t.location.position),
    tankId,
    rackId,
    boxId,
    gridConfig,
    currentLab,
    userSettings
  );

  // Handle case where all selected tubes were deleted/moved
  if (tubes.length === 0) {
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
        dataAttribute="data-batch-edit-modal"
      >
        {conflicts.length > 0 && (
          <AlertBanner variant="warning" spacing="sm">
            {conflicts.length} field{conflicts.length > 1 ? 's' : ''} with conflicting values{' '}
            {conflicts.length > 1 ? 'have' : 'has'} been cleared
          </AlertBanner>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2 px-3 py-2 bg-muted border-l-4 border-l-muted-foreground rounded-lg shadow-sm">
            <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div className="flex items-center gap-2 text-sm font-medium text-secondary-foreground">
              <span className="font-semibold">{tankName}</span>
              <span className="text-muted-foreground">•</span>
              <span>{rackName}</span>
              <span className="text-muted-foreground">•</span>
              <span>{boxName}</span>
              <span className="text-muted-foreground">•</span>
              <span className="font-semibold">Positions {positionRanges}</span>
            </div>
          </div>

          <TubeForm
            control={form.control as Control<CreateTubeRequest | UpdateTubeRequest>}
            register={form.register as UseFormRegister<CreateTubeRequest | UpdateTubeRequest>}
            errors={filteredErrors as FieldErrors<CreateTubeRequest | UpdateTubeRequest>}
            trigger={form.trigger as UseFormTrigger<CreateTubeRequest | UpdateTubeRequest>}
            researchers={researchers}
            isLoading={isSubmitting}
            conflictingFields={conflicts}
          />

          <div className="flex justify-end space-x-4 pt-4 border-t border-border">
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
              variant="primary"
              disabled={!canSubmit}
              isLoading={isSubmitting}
              loadingText="Updating..."
              leftIcon={<Save className="w-4 h-4" />}
            >
              Update {tubes.length} Tubes
            </Button>
          </div>
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

export { BatchTubeEditorModal };
