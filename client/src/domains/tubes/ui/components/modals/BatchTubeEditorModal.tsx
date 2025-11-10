import { useState, useMemo , useEffect } from 'react';

import { type CreateTubeFormInput, formatConcentrationDisplay, EQUIPMENT_DEFAULTS } from '@odysseus/shared-schemas';
import { AlertCircle, XCircle, RefreshCw, MapPin, Edit, Save, Trash2 } from 'lucide-react';

import { useFieldResolverQuery } from '@app/hooks/useFieldResolverQuery';
import { TUBE_FIELD_PATHS } from '@app/hooks/useSimpleFieldResolver';
import { useModalStore } from '@app/stores/modalStore';
import { useUserSettings } from '@domains/authentication';
import { useActiveResearchersQuery } from '@domains/researchers';
import { useStorageStore, formatPositionRangesForBox } from '@domains/storage';
import { useCreateTubeForm } from '@domains/tubes/hooks/useTubeForm';
import { useBulkUpdateTubesMutation, useBulkDeleteTubesMutation } from '@domains/tubes/hooks/useTubeMutations';
import { useTubes } from '@domains/tubes/hooks/useTubeQueries';
import { useModalKeyboardNav } from '@shared/hooks/keyboard/useModalKeyboardNav';
import { notifications } from '@shared/utils';
import { formatDateForInput } from '@shared/utils/dateFormatter';

import { TubeForm } from '../forms/TubeForm';

import { BaseModal } from './BaseModal';
import { BulkProgressModal } from './BulkProgressModal';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';

import type { FieldConflictAnalysis } from '@app/hooks/useSimpleFieldResolver';
import type { BulkUpdateProgress, BulkUpdateResult } from '@shared/types/bulkOperations';
import type { TubeData } from '@shared/types/tubeTypes';



export interface BatchTubeEditorModalProps {
  tubeIds: string[];     // Accept IDs, fetch own data
  tubes?: TubeData[];     // Legacy support - will be removed
  onClose: () => void;
}

/**
 * Analysis object structure for all batch-editable fields
 *
 * Media fields use dot-notation string keys ('media.type')
 * and must be accessed with bracket notation: analysis['media.type']
 */
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

/**
 * Convert TubeData to CreateTubeFormInput for form initialization
 * Only converts editable fields (sample + researcherId, no location)
 * Returns form INPUT type (pre-transformation)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function convertTubeDataToFormData(tubeData: TubeData): Partial<CreateTubeFormInput> {
  return {
    sample: {
      cellType: tubeData.sample.cellType || '',
      donorInternalId: tubeData.sample.donorInternalId ?? '',
      donorSourceId: tubeData.sample.donorSourceId || '',
      concentration: formatConcentrationDisplay(tubeData.sample.concentration) || undefined,
      concentrationUnit: tubeData.sample.concentrationUnit,
      date: tubeData.sample.date || '',
      media: tubeData.sample.media || { type: '', supplements: '', selection: '' },
      cultureCondition: tubeData.sample.cultureCondition || '',
      lotNumber: tubeData.sample.lotNumber || '',
      notes: tubeData.sample.notes || ''
    },
    researcherId: tubeData.researcherId
  };
}

/**
 * Convert TubeFormData to UpdateTubeRequest for API updates
 * Uses the standard transformToUpdateRequest for consistent PATCH semantics
 * Note: This local function was removed - now using centralized transform
 */

export default function BatchTubeEditorModal({ tubeIds, tubes: legacyTubes, onClose }: BatchTubeEditorModalProps) {
  const { data: researchers = [] } = useActiveResearchersQuery();
  const { analyzeFieldConflicts } = useFieldResolverQuery();
  const modalService = useModalStore();

  // Fetch tubes by IDs, with legacy support during transition
  const { data: allTubes = [] } = useTubes();
  const tubes = legacyTubes || allTubes.filter(tube => tubeIds.includes(tube.id));

  // Focus return management - restore focus when modal unmounts
  // Skip restoration for batch operations to preserve multi-selection
  // IMPORTANT: Capture preserveSelection flag on mount to avoid race condition with hideTubeEditorModal
  const [shouldPreserveSelection] = useState(modalService.tubeEditorModal.preserveSelection);

  useEffect(() => {
    return () => {
      // Don't restore focus if preserveSelection is enabled (batch operations)
      // This prevents focus from returning to a specific position and clearing selection
      if (shouldPreserveSelection) {
        return;
      }

      const previousFocus = modalService.tubeEditorModal.previousFocusElement;
      if (previousFocus && typeof previousFocus.focus === 'function') {
        setTimeout(() => previousFocus.focus(), 0);
      }
    };
  }, [shouldPreserveSelection, modalService.tubeEditorModal.previousFocusElement]);

  // Unified keyboard navigation: Escape = close
  // (Enter naturally submits form)
  useModalKeyboardNav({
    onEscape: onClose,
    enabled: true
  });

  // Analyze all editable fields for conflicts across selected tubes
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
      researcherId: analyzeFieldConflicts(tubes, TUBE_FIELD_PATHS.researcherId)
    } satisfies BatchEditConflictAnalysis;

    // Extract conflicting fields
    const conflictingFields = Object.entries(analysis)
      .filter(([_, value]) => value.state === 'conflict')
      .map(([key, _]) => key);

    return { analysis, conflictingFields };
  }, [tubes, analyzeFieldConflicts]);

  // Build initial form data: use common/mixed values, clear only conflicting fields
  const resolvedData = useMemo(() => {
    const { analysis } = conflictAnalysis;

    return {
      sample: {
        cellType: analysis.cellType.state !== 'conflict' ? analysis.cellType.commonValue || '' : '',
        donorInternalId: analysis.donorInternalId.state !== 'conflict' ? analysis.donorInternalId.commonValue || '' : '',
        donorSourceId: analysis.donorSourceId.state !== 'conflict' ? analysis.donorSourceId.commonValue || '' : '',
        concentration: analysis.concentration.state !== 'conflict'
          ? (analysis.concentration.commonValue ? formatConcentrationDisplay(analysis.concentration.commonValue) : undefined)
          : undefined,
        concentrationUnit: analysis.concentrationUnit.state !== 'conflict' ? analysis.concentrationUnit.commonValue : undefined,
        date: analysis.date.state !== 'conflict'
          ? (analysis.date.commonValue ? formatDateForInput(analysis.date.commonValue) : '')
          : '',
        media: {
          type: analysis['media.type'].state !== 'conflict' ? analysis['media.type'].commonValue || '' : '',
          supplements: analysis['media.supplements'].state !== 'conflict' ? analysis['media.supplements'].commonValue || '' : '',
          selection: analysis['media.selection'].state !== 'conflict' ? analysis['media.selection'].commonValue || '' : ''
        },
        cultureCondition: analysis.cultureCondition.state !== 'conflict' ? analysis.cultureCondition.commonValue || '' : '',
        lotNumber: analysis.lotNumber.state !== 'conflict' ? analysis.lotNumber.commonValue || '' : '',
        notes: analysis.notes.state !== 'conflict' ? analysis.notes.commonValue || '' : ''
      },
      researcherId: analysis.researcherId.state !== 'conflict' ? analysis.researcherId.commonValue || '' : ''
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
    errors: []
  });
  const [result, setResult] = useState<BulkUpdateResult | null>(null);
  
  // Only using form for field editing UI, not the submit handler
  // Actual submission uses bulk mutations
  const { form, isSubmitting: formSubmitting } = useCreateTubeForm({
    initialData: resolvedData
  });

  // CRITICAL: Subscribe to formState by destructuring in render phase (React Hook Form v7 Proxy pattern)
  // Without this, component won't re-render when errors/dirtyFields change
  const { errors, dirtyFields } = form.formState;

  // Reset form when resolved data changes to update dirty tracking baseline
  // This ensures defaultValues stay in sync with current tube selection
  // IMPORTANT: Do NOT include `form` in deps - it changes every render and causes infinite reset loop
  useEffect(() => {
    form.reset(resolvedData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedData]);

  // Bulk operations
  const bulkUpdateMutation = useBulkUpdateTubesMutation();
  const bulkDeleteMutation = useBulkDeleteTubesMutation();
  const isSubmitting = formSubmitting || bulkUpdateMutation.isPending || bulkDeleteMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowProgress(true);
    setResult(null);

    try {
      // Get form data
      const formData = form.getValues();

      // Send all form data (simplicity > micro-optimization)
      const bulkResult = await bulkUpdateMutation.mutateAsync({
        tubeIds,
        // Type assertion safe here: form data validated by Zod, backend re-validates with same schemas
        // TODO: Align mutation types with CreateTubeFormInput to remove type assertion
        updates: formData as any,
        onProgress: (progress) => {
          setProgress({
            current: progress.completed,
            total: progress.total,
            completed: progress.completed,
            currentTubeId: progress.currentId,
            phase: 'updating',
            errors: []
          });
        }
      });

      setResult(bulkResult);

      // Show final result
      if (bulkResult.success) {
        notifications.update(`Updated ${tubeIds.length} tubes successfully`); // Minty Frost
        setShowProgress(false);
        onClose();
      } else {
        notifications.error('Some tubes failed to update');
      }
    } catch (error) {
      console.error('Batch update error:', error);
      notifications.error('Failed to update tubes');
      setShowProgress(false);
    }
  };

  const handleProgressClose = () => {
    setShowProgress(false);
    // Errors are already shown in the UI via result.errors
  };

  const handleRetryFailures = async () => {
    if (!result || result.success) return;

    const failedTubeIds = result.errors
      .map(error => error.itemId); // Note: retryable logic needs to be implemented if needed

    if (failedTubeIds.length === 0) {
      notifications.info('No retryable failures found');
      return;
    }

    // Retry only the failed tubes
    setShowProgress(true);
    setResult(null);

    try {
      // Get form data for retry
      const formData = form.getValues();

      // Send all form data (simplicity > micro-optimization)
      const retryResult = await bulkUpdateMutation.mutateAsync({
        tubeIds: failedTubeIds,
        // Type assertion safe here: form data validated by Zod, backend re-validates with same schemas
        // TODO: Align mutation types with CreateTubeFormInput to remove type assertion
        updates: formData as any,
        onProgress: (progress) => {
          setProgress({
            current: progress.completed,
            total: progress.total,
            completed: progress.completed,
            currentTubeId: progress.currentId,
            phase: 'updating',
            errors: []
          });
        }
      });
      setResult(retryResult);

      if (retryResult.success) {
        notifications.update(`Retry successful: Updated ${retryResult.successCount} tubes`); // Minty Frost
        setShowProgress(false);
        onClose();
      } else {
        notifications.warning(`⚠️ Retry completed: ${retryResult.successCount}/${retryResult.totalProcessed} successful`);
      }
    } catch (error) {
      console.error('Retry error:', error);
      notifications.error('Retry failed');
      setShowProgress(false);
    }
  };

  const handleBatchDelete = async () => {
    try {
      const deleteResult = await bulkDeleteMutation.mutateAsync({
        tubeIds,
        onProgress: (progress) => {
          setProgress({
            current: progress.completed,
            total: progress.total,
            completed: progress.completed,
            currentTubeId: progress.currentId,
            phase: 'updating',
            errors: []
          });
        }
      });

      if (deleteResult.success) {
        notifications.delete(`Deleted ${deleteResult.successCount} tubes successfully`);
        onClose();
      } else {
        notifications.error(`Deleted ${deleteResult.successCount} of ${deleteResult.totalProcessed} tubes`);
      }
    } catch (error) {
      console.error('Batch delete error:', error);
      notifications.error('Failed to delete tubes');
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const tankId = tubes[0]?.location.tankId || "";
  const rackId = tubes[0]?.location.rackId || "";
  const boxId = tubes[0]?.location.boxId || "";

  // Filter errors to only show errors for dirty fields
  // Special handling for cross-field validation (e.g., concentration + unit refinement)
  // NOTE: No useMemo - recalculates on every render, but this is fine (cheap object traversal)
  // This ensures filtered errors update immediately when validation runs
  const RELATED_FIELDS: Record<string, string[]> = {
    'concentration': ['concentrationUnit'],
    'concentrationUnit': ['concentration']
  };

  const isRelatedFieldDirty = (fieldKey: string, parentDirtyNode: any): boolean => {
    const relatedFields = RELATED_FIELDS[fieldKey] || [];
    return relatedFields.some(relatedKey => parentDirtyNode?.[relatedKey] === true);
  };

  const filterNode = (errorNode: any, dirtyNode: any, path = ''): any => {
    if (!errorNode || typeof errorNode !== 'object') return undefined;

    const filtered: any = {};
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
        const nestedFiltered = filterNode(errorValue, dirtyValue, currentPath);
        if (nestedFiltered && Object.keys(nestedFiltered).length > 0) {
          filtered[key] = nestedFiltered;
          hasAnyErrors = true;
        }
      }
    }

    return hasAnyErrors ? filtered : undefined;
  };

  const filteredErrors = filterNode(errors, dirtyFields) || {};

  // Check if there are any relevant errors (for button state)
  const hasRelevantErrors = Object.keys(filteredErrors).length > 0;

  // Get user-friendly location names
  const getCurrentTanks = useStorageStore(state => state.getCurrentTanks);
  const getBox = useStorageStore(state => state.getBox);
  const tanks = getCurrentTanks();
  const currentTankObj = tanks.find(tank => tank.id === tankId);
  const currentRackObj = currentTankObj?.racks?.find(rack => rack.id === rackId);
  const tankName = currentTankObj?.name ?? 'Unknown Tank';
  const rackName = currentRackObj?.name || 'Unknown Rack';

  // Get user settings for position display preferences
  const { settings: userSettings } = useUserSettings();

  // Format position ranges for display with flexible formatting
  const boxObj = getBox(tankId, rackId, boxId);
  const gridConfig = boxObj?.gridConfig || {
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
    userSettings
  );

  return (
    <>
    <BaseModal
      title={`Edit ${tubes.length} Tubes`}
      icon={<Edit className="w-5 h-5 text-white" />}
      onClose={onClose}
      dataAttribute="data-batch-edit-modal"
    >

        {conflicts.length > 0 && (
          <div className="alert-warning mb-3">
            <div className="flex items-center space-x-2 alert-warning-heading">
              <AlertCircle size={18} />
              <span>Conflicting Information Detected</span>
            </div>
            <p className="alert-warning-text mt-1">
              These fields differ across tubes and have been cleared.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {conflicts.map(field => {
                // Format field names for display
                const displayName = field
                  .replace('media.', 'Media ')
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/^./, str => str.toUpperCase())
                  .replace(/ Id/g, ' ID')
                  .trim();

                return (
                  <span key={field} className="alert-warning-accent">
                    {displayName}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Position display - matches other modals */}
          <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-br from-teal-50 to-cyan-50 border-2 border-teal-500 rounded-lg shadow-md">
            <MapPin className="w-4 h-4 text-teal-500 flex-shrink-0" />
            <div className="flex items-center gap-2 text-sm font-medium text-odysseus-dark">
              <span className="font-semibold">{tankName}</span>
              <span className="text-odysseus-muted">•</span>
              <span>{rackName}</span>
              <span className="text-odysseus-muted">•</span>
              <span>Box {boxId}</span>
              <span className="text-odysseus-muted">•</span>
              <span className="font-semibold">Positions {positionRanges}</span>
            </div>
          </div>

          <TubeForm
            control={form.control as any}
            register={form.register as any}
            errors={filteredErrors as any}
            trigger={form.trigger as any}
            researchers={researchers}
            isLoading={isSubmitting}
          />

          <div className="flex justify-end space-x-4 pt-4 border-t border-odysseus-border">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary px-6"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger px-6"
              disabled={isSubmitting}
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete {tubes.length} Tubes
            </button>
            <button
              type="submit"
              className={`btn px-8 ${!hasRelevantErrors ? 'btn-primary' : 'btn-secondary'}`}
              disabled={isSubmitting || hasRelevantErrors}
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="spinner w-4 h-4"></div>
                  <span>Updating...</span>
                </div>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Update {tubes.length} Tubes
                </>
              )}
            </button>
          </div>
        </form>

        {/* Results Summary */}
        {result && !result.success && result.errors.length > 0 && !showProgress && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <XCircle size={20} className="text-red-500" />
                <span className="font-semibold text-red-800">
                  Update Issues ({result.errors.length})
                </span>
              </div>
              {result.errors.length > 0 && (
                <button
                  onClick={handleRetryFailures}
                  className="btn btn-sm btn-secondary flex items-center space-x-1"
                  disabled={isSubmitting}
                >
                  <RefreshCw size={14} />
                  <span>Retry</span>
                </button>
              )}
            </div>
            
            <div className="max-h-32 overflow-y-auto space-y-2">
              {result.errors.slice(0, 5).map((error, index) => (
                <div key={index} className="text-sm text-red-700 flex items-start space-x-2">
                  <div className="font-mono text-xs bg-red-100 px-2 py-1 rounded">
                    {error.itemId}
                  </div>
                  <div className="flex-1">
                    {error.error}
                    {error.field && (
                      <span className="ml-2 text-xs text-red-600">({error.field})</span>
                    )}
                  </div>
                </div>
              ))}
              {result.errors.length > 5 && (
                <div className="text-sm text-red-600 italic">
                  +{result.errors.length - 5} more errors...
                </div>
              )}
            </div>

            {result.duration && (
              <div className="mt-2 text-xs text-gray-600">
                Completed in {(result.duration / 1000).toFixed(1)}s
              </div>
            )}
          </div>
        )}
    </BaseModal>

    {/* Progress Modal */}
    <BulkProgressModal
      isOpen={showProgress}
      progress={progress}
      onClose={handleProgressClose}
      canClose={!isSubmitting && result !== null}
    />

    <DeleteConfirmDialog
      isOpen={showDeleteConfirm}
      title="Delete All Tubes"
      message={`Are you sure you want to delete all ${tubes.length} tubes? This action cannot be undone and will permanently remove all selected tubes from your inventory.`}
      confirmText={`Delete All ${tubes.length}`}
      onConfirm={handleBatchDelete}
      onCancel={() => setShowDeleteConfirm(false)}
      isLoading={isSubmitting}
    />
    </>
  );
}

// Named export for backward compatibility
export { BatchTubeEditorModal };
