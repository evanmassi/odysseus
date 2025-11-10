/**
 * TubeEditorModal - Unified Tube Creation & Editing Modal
 *
 * Consolidated modal handling CREATE, EDIT, and MIXED modes.
 * - Handles CREATE (single/multiple empty positions)
 * - Handles EDIT (single tube by ID)
 * - Handles MIXED (create new + update existing positions)
 * - Form data = API data (no transformation)
 * - Smart component pattern (fetches own data when editing)
 *
 * @example
 * // Create mode (single position)
 * <TubeEditorModal selectedPositions={set} onClose={...} />
 *
 * // Edit mode (single tube)
 * <TubeEditorModal tubeId="123" onClose={...} />
 *
 * // Mixed mode (create + update)
 * <TubeEditorModal selectedPositions={set} onClose={...} />
 */

import React, { useMemo, useState, useEffect } from 'react';

import {
  type CreateTubeFormInput,
  type UpdateTubeFormInput,
  formatConcentrationDisplay,
  EQUIPMENT_DEFAULTS
} from '@odysseus/shared-schemas';
import { MapPin, AlertTriangle, Edit, Plus, Save, Trash2 } from 'lucide-react';

import { useModalStore } from '@app/stores/modalStore';
import { useUserSettings } from '@domains/authentication';
import { useActiveResearchersQuery } from '@domains/researchers';
import { useStorageStore, formatPositionRangesForBox } from '@domains/storage';
import { useCreateTubeForm, useEditTubeForm } from '@domains/tubes/hooks/useTubeForm';
import { useUpdateTubeMutation, useDeleteTubeMutation } from '@domains/tubes/hooks/useTubeMutations';
import { useTubesQuery, useTubeQuery } from '@domains/tubes/hooks/useTubesQuery';
import { useModalKeyboardNav } from '@shared/hooks/keyboard/useModalKeyboardNav';
import { parsePositionKey, type PositionKey } from '@shared/types/grid';
import { notifications } from '@shared/utils';
import { formatDateForInput } from '@shared/utils/dateFormatter';

import { LocationDisplay } from '../displays/LocationDisplay';
import { TubeForm } from '../forms/TubeForm';

import { BaseModal } from './BaseModal';

/**
 * TubeEditorModal Props
 * - For CREATE: provide selectedPositions
 * - For EDIT: provide tubeId
 * - Cannot provide both
 */
export interface TubeEditorModalProps {
  onClose: () => void;

  // Edit mode: Single tube ID
  tubeId?: string;

  // Create/Mixed mode: Multiple positions
  rackId?: string;
  boxId?: string;
  selectedPositions?: Set<PositionKey>;
}

/**
 * Unified Tube Editor Modal Component
 * Automatically detects mode based on props
 */
export function TubeEditorModal(props: TubeEditorModalProps) {
  const { tubeId, onClose } = props;

  // Mode detection
  const isEditMode = Boolean(tubeId);

  if (isEditMode) {
    return <EditModeContent tubeId={tubeId!} onClose={onClose} />;
  } else {
    return <CreateModeContent {...props} onClose={onClose} />;
  }
}

/**
 * Edit Mode Content
 * Fetches tube data and shows edit form with delete button
 */
interface EditModeContentProps {
  tubeId: string;
  onClose: () => void;
}

function EditModeContent({ tubeId, onClose }: EditModeContentProps) {
  const { data: researchers = [] } = useActiveResearchersQuery();
  const modalService = useModalStore();

  // Fetch tube data from React Query cache (always fresh)
  const { data: tube, isLoading: isFetchingTube } = useTubeQuery(tubeId);

  // Focus return management - restore focus when modal unmounts
  useEffect(() => {
    return () => {
      const previousFocus = modalService.tubeEditorModal.previousFocusElement;
      if (previousFocus && typeof previousFocus.focus === 'function') {
        setTimeout(() => {
          previousFocus.focus();
        }, 0);
      }
    };
  }, [modalService.tubeEditorModal.previousFocusElement]);

  // Unified keyboard navigation: Escape = close
  // (Enter naturally submits form)
  useModalKeyboardNav({
    onEscape: onClose,
    enabled: true
  });

  // Loading state while fetching tube
  if (isFetchingTube || !tube) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-odysseus-surface rounded-2xl p-8 w-full max-w-4xl mx-4">
          <div className="flex items-center justify-center py-12">
            <div className="spinner w-8 h-8"></div>
            <span className="ml-3 text-odysseus-muted">Loading tube data...</span>
          </div>
        </div>
      </div>
    );
  }

  // Use updatedAt timestamp as unique key to force form remount when data changes
  const formKey = `edit-tube-${tube.id}-${tube.timestamps.updatedAt}`;

  return (
    <EditModeForm
      key={formKey}
      tube={tube}
      tubeId={tubeId}
      researchers={researchers}
      onClose={onClose}
      modalService={modalService}
    />
  );
}

/**
 * Edit Mode Form
 * Inner component that remounts when tube data changes
 */
interface EditModeFormProps {
  tube: any;
  tubeId: string;
  researchers: any[];
  onClose: () => void;
  modalService: any;
}

function EditModeForm({ tube, tubeId, researchers, onClose, modalService }: EditModeFormProps) {
  // Build initialData from tube - uses FORM INPUT type (pre-transformation)
  // concentration as string, date as string
  const initialData: Partial<UpdateTubeFormInput> = {
    sample: {
      cellType: tube.sample.cellType || '',
      donorInternalId: tube.sample.donorInternalId ?? '',
      donorSourceId: tube.sample.donorSourceId ?? '',
      concentration: formatConcentrationDisplay(tube.sample.concentration) || undefined,
      concentrationUnit: tube.sample.concentrationUnit || undefined,
      date: tube.sample.date ? formatDateForInput(tube.sample.date) : '',
      media: {
        type: tube.sample.media?.type || '',
        supplements: tube.sample.media?.supplements || '',
        selection: tube.sample.media?.selection || ''
      },
      cultureCondition: tube.sample.cultureCondition || '',
      lotNumber: tube.sample.lotNumber ?? '',
      notes: tube.sample.notes || ''
    },
    researcherId: tube.researcherId ?? ''
  };

  // Use edit mode hook - fully type-safe wrapper
  const { form, submitTube, isSubmitting: formSubmitting } = useEditTubeForm(tubeId, {
    initialData
  });

  const deleteMutation = useDeleteTubeMutation();
  const isSubmitting = formSubmitting || deleteMutation.isPending;

  // Form submission handler
  // Receives form INPUT type, Zod transforms to OUTPUT type
  const handleFormSubmit = async (validatedData: UpdateTubeFormInput) => {
    try {
      // Send all form data (simplicity > micro-optimization)
      // submitTube handles Zod transformation: INPUT → OUTPUT
      const result = await submitTube(validatedData, { location: tube.location });

      if (result.success) {
        notifications.update('Tube updated successfully'); // Minty Frost
        onClose();
      } else {
        notifications.error(result.error ?? 'Failed to update tube');
      }
    } catch (error) {
      notifications.error('Failed to update tube');
    }
  };

  // Delete handler
  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(tubeId);
      notifications.delete('Tube deleted successfully');
      onClose();
    } catch (error) {
      notifications.error('Failed to delete tube');
    }
  };

  // Use React Hook Form's built-in validation state (more efficient)
  const isFormValid = form.formState.isValid;

  return (
    <BaseModal
      title="Edit Tube"
      icon={<Edit className="w-5 h-5 text-white" />}
      onClose={onClose}
      dataAttribute="data-tube-modal"
      mode="edit"
    >
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
          <LocationDisplay
            tankId={tube.location.tankId}
            rackId={tube.location.rackId}
            boxId={tube.location.boxId}
            position={tube.location.position}
          />

          <TubeForm
            control={form.control as any}
            register={form.register as any}
            errors={form.formState.errors as any}
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
              onClick={() => {
                modalService.showDeleteConfirm({
                  title: 'Delete Tube',
                  message: `Are you sure you want to delete this tube from Rack ${tube.location.rackId}, Box ${tube.location.boxId}, Position ${tube.location.position}? This action cannot be undone.`,
                  onConfirm: handleDelete
                });
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Tube
            </button>
            <button
              type="submit"
              className={`btn px-8 ${isFormValid ? 'btn-primary' : 'btn-secondary'}`}
              disabled={isSubmitting || !isFormValid}
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="spinner w-4 h-4"></div>
                  <span>Updating...</span>
                </div>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Update Tube
                </>
              )}
            </button>
          </div>
        </form>
    </BaseModal>
  );
}

/**
 * Create Mode Content
 * Handles single/multiple position creation and mixed create+update
 */
function CreateModeContent({
  onClose,
  _rackId,
  _boxId,
  selectedPositions
}: TubeEditorModalProps) {
  const { data: researchers = [] } = useActiveResearchersQuery();
  const { data: allTubes = [] } = useTubesQuery();
  const updateTubeMutation = useUpdateTubeMutation();
  const currentLab = useStorageStore(state => state.currentLab);
  const getBox = useStorageStore(state => state.getBox);
  const { settings: userSettings } = useUserSettings();
  const modalService = useModalStore();

  // State for overwrite confirmation
  const [allowOverwrite, setAllowOverwrite] = useState(false);

  // Focus return management - restore focus when modal unmounts
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
        setTimeout(() => {
          previousFocus.focus();
        }, 0);
      }
    };
  }, [shouldPreserveSelection, modalService.tubeEditorModal.previousFocusElement]);

  // Unified keyboard navigation: Escape = close
  // (Enter naturally submits form)
  useModalKeyboardNav({
    onEscape: onClose,
    enabled: true
  });

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
          position
        }
      };
    });
  }, [selectedPositions]);

  // Analyze which positions are occupied vs empty
  const positionAnalysis = useMemo(() => {
    const emptyPositions = [];
    const occupiedPositions = [];

    for (const parsed of parsedPositions) {
      const { tankId, rackId, boxId, position } = parsed.location;
      const existingTube = allTubes.find(t =>
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
      isMixed: emptyPositions.length > 0 && occupiedPositions.length > 0
    };
  }, [parsedPositions, allTubes]);

  // Get location display names for batch operations
  const batchLocationDisplay = useMemo(() => {
    if (parsedPositions.length === 0) return null;

    const firstLocation = parsedPositions[0].location;
    const tanks = currentLab.equipment?.tanks || [];
    const tank = tanks.find(t => t.id === firstLocation.tankId);
    const tankName = tank?.name ?? `Tank ${firstLocation.tankId}`;

    const rack = tank?.racks?.find(r => r.id === firstLocation.rackId);
    const rackName = rack?.name ?? `Rack ${firstLocation.rackId}`;

    const box = rack?.boxes?.find(b => b.id === firstLocation.boxId);
    const boxName = box?.name ?? `Box ${firstLocation.boxId}`;

    // Get box config for flexible position formatting
    const boxObj = getBox(firstLocation.tankId, firstLocation.rackId, firstLocation.boxId);
    const gridConfig = boxObj?.gridConfig || {
      rows: EQUIPMENT_DEFAULTS.GRID_ROWS,
      cols: EQUIPMENT_DEFAULTS.GRID_COLS,
      template: 'standard' as const,
    };

    const positions = parsedPositions.map(p => p.location.position);
    const positionRanges = formatPositionRangesForBox(
      positions,
      firstLocation.tankId,
      firstLocation.rackId,
      firstLocation.boxId,
      gridConfig,
      userSettings
    );

    return { tankName, rackName, boxName, positionRanges };
  }, [parsedPositions, currentLab, getBox, userSettings]);

  // Default values use FORM INPUT type (pre-transformation)
  const defaultValues = useMemo((): Partial<CreateTubeFormInput> => ({
    location: parsedPositions[0]?.location,
    sample: {
      cellType: '',
      donorInternalId: '',
      donorSourceId: '',
      concentration: undefined,
      concentrationUnit: undefined,
      date: '',
      media: {
        type: '',
        supplements: '',
        selection: ''
      },
      cultureCondition: '',
      lotNumber: '',
      notes: ''
    },
    researcherId: ''
  }), [parsedPositions]);

  // Use create mode hook
  // Only show individual notifications for single tube creation, not batch operations
  const isSingleTube = parsedPositions.length === 1;
  const { form, submitTube, isSubmitting } = useCreateTubeForm({
    initialData: defaultValues,
    onSuccess: isSingleTube ? (data) => {
      notifications.create(`Successfully created tube at position ${data.location.position}`); // Minty Frost
      onClose();
    } : undefined, // Batch mode: notification handled after all tubes are created
    onError: isSingleTube ? (error) => {
      notifications.error(`Failed to create tube: ${error.message}`);
    } : undefined // Batch mode: errors handled in handleFormSubmit
  });

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

      // Process empty positions (creates)
      for (const { location } of positionAnalysis.emptyPositions) {
        try {
          const tubeDataWithLocation = { ...formData, location };
          const result = await submitTube(tubeDataWithLocation, location);

          if (result.success) {
            successCount++;
          } else {
            errorCount++;
            errors.push(`Position ${location.position}: ${result.error ?? 'Unknown error'}`);
          }
        } catch (error) {
          errorCount++;
          errors.push(`Position ${location.position}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Process occupied positions (updates) - only if user explicitly allowed overwrite
      if (allowOverwrite) {
        for (const { location, tubeId } of positionAnalysis.occupiedPositions) {
          try {
            await updateTubeMutation.mutateAsync({
              id: tubeId,
              updates: {
                sample: formData.sample as any,
                researcherId: formData.researcherId as any
              }
            });
            successCount++;
          } catch (error) {
            errorCount++;
            errors.push(`Position ${location.position}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
          notifications.create(`Successfully filled ${successCount} positions (${createCount} new, ${updateCount} updated) at ${positionRange}`); // Minty Frost
        } else if (createCount > 0) {
          const message = successCount > 1
            ? `Successfully created ${successCount} tubes at positions ${positionRange}`
            : `Successfully created tube at position ${positionRange}`;
          notifications.create(message); // Minty Frost
        } else {
          const message = successCount > 1
            ? `Successfully updated ${successCount} tubes at positions ${positionRange}`
            : `Successfully updated tube at position ${positionRange}`;
          notifications.update(message); // Minty Frost
        }
        onClose();
      } else if (successCount > 0) {
        notifications.warning(
          `Processed ${successCount} of ${parsedPositions.length} positions. ${errorCount} failed.`
        );
        if (errors.length > 0) {
          console.warn('Tube operation errors:', errors);
        }
      } else {
        notifications.error('Failed to process any positions');
        if (errors.length > 0) {
          notifications.error(errors[0]);
        }
      }

    } catch (error) {
      console.error('Tube creation error:', error);
      notifications.error('An unexpected error occurred during tube creation');
    }
  };

  // Use React Hook Form's built-in validation state (more efficient)
  const isFormValid = form.formState.isValid;

  return (
    <BaseModal
      title={`Add ${parsedPositions.length > 1 ? parsedPositions.length : ''} Tube${parsedPositions.length > 1 ? 's' : ''}`}
      icon={<Plus className="w-5 h-5 text-white" />}
      onClose={onClose}
      dataAttribute="data-tube-modal"
      mode="create"
    >
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            {/* Location Display */}
            {parsedPositions.length === 1 && parsedPositions[0] && (
              <LocationDisplay
                tankId={parsedPositions[0].location.tankId}
                rackId={parsedPositions[0].location.rackId}
                boxId={parsedPositions[0].location.boxId}
                position={parsedPositions[0].location.position}
              />
            )}
            {parsedPositions.length > 1 && batchLocationDisplay && (
              <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-br from-teal-50 to-cyan-50 border-2 border-teal-500 rounded-lg shadow-md">
                <MapPin className="w-4 h-4 text-teal-500 flex-shrink-0" />
                <div className="flex items-center gap-2 text-sm font-medium text-odysseus-dark">
                  <span className="font-semibold">{batchLocationDisplay.tankName}</span>
                  <span className="text-odysseus-muted">•</span>
                  <span>{batchLocationDisplay.rackName}</span>
                  <span className="text-odysseus-muted">•</span>
                  <span>{batchLocationDisplay.boxName}</span>
                  <span className="text-odysseus-muted">•</span>
                  <span className="font-semibold">Positions {batchLocationDisplay.positionRanges}</span>
                </div>
              </div>
            )}

            {/* Mixed Selection Warning */}
            {positionAnalysis.isMixed && (
              <div className="alert-warning">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 alert-warning-icon flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="alert-warning-heading mb-1">
                      Mixed Selection Detected
                    </h3>
                    <p className="alert-warning-text mb-3">
                      You&apos;ve selected {positionAnalysis.emptyPositions.length} empty and {positionAnalysis.occupiedPositions.length} occupied position{positionAnalysis.occupiedPositions.length > 1 ? 's' : ''}.
                      By default, only empty positions will be filled.
                    </p>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowOverwrite}
                        onChange={(e) => setAllowOverwrite(e.target.checked)}
                        className="w-4 h-4 text-warning-text border-warning-border rounded focus:ring-warning-bg"
                      />
                      <span className="text-sm font-medium alert-warning-heading">
                        Overwrite occupied positions (this will replace existing tube data)
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            <TubeForm
              control={form.control as any}
              register={form.register as any}
              errors={form.formState.errors as any}
              trigger={form.trigger as any}
              researchers={researchers}
              isLoading={isSubmitting}
            />

            {/* Form Actions */}
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
                type="submit"
                className={`btn px-8 ${isFormValid ? 'btn-primary' : 'btn-secondary'}`}
                disabled={isSubmitting || !isFormValid}
              >
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <div className="spinner w-4 h-4"></div>
                    <span>Adding...</span>
                  </div>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    {parsedPositions.length === 1 ? 'Add Tube' : `Add ${parsedPositions.length} Tubes`}
                  </>
                )}
              </button>
            </div>
          </form>
    </BaseModal>
  );
}
