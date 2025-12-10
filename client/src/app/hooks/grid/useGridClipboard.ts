/**
 * Grid Clipboard Hook
 * Handles copy/cut/paste operations with OS clipboard integration
 *
 * Authorization:
 * - Copy: Blocked in view-only spaces without shared access
 * - Cut: Blocked in view-only spaces without shared access (modifies source)
 * - Paste: Blocked in view-only spaces (creates new tubes)
 */

import { useCallback, useMemo } from 'react';

import { tubeDataToCreateRequest } from '@odysseus/shared-schemas';

import { useModalStore } from '@app/stores/modalStore';
import { useStorageData } from '@domains/storage';
import { useGridUiStore } from '@shared/stores/gridUiStore';
import { toPositionKey, parsePositionKey } from '@shared/types/grid';
import { writeClipboardOS, readClipboardOS } from '@shared/utils/gridClipboard';
import { notifications } from '@shared/utils/notifications';
import { validatePasteOperation } from '@shared/utils/pasteValidation';
import { canModifyAllTubes, getBlockedModificationMessage } from '@shared/utils/tubeAccessControl';

import type { TubeData } from '@odysseus/shared-schemas';
import type { ClipboardData } from '@shared/types/clipboard';
import type { PositionKey, PositionContext, TubeClipboardItem } from '@shared/types/grid';

export interface UseGridClipboardProps {
  ctx: PositionContext;
  tubes: TubeData[];
  selectedPositions: Set<PositionKey>;
  resolveTubeIdAtPosition: (position: number) => string | null;
  onDeleteTubes?: (tubeIds: string[], silent?: boolean) => Promise<void>;
  onPasteTubes?: (tubes: ReturnType<typeof tubeDataToCreateRequest>[]) => Promise<void>;
  onSelectionChange: (selection: Set<PositionKey>) => void;
  /** Current user ID for shared access checks */
  currentUserId?: string;
  /** When true, container is assigned to another user */
  isViewOnlySpace?: boolean;
}

export interface UseGridClipboardReturn {
  copy: () => Promise<void>;
  cut: () => Promise<void>;
  paste: (options?: { targetStart?: number }) => Promise<void>;
  clipboard: {
    hasData: boolean;
    count: number;
    cutPositions: Set<PositionKey>;
    copyPositions: Set<PositionKey>;
  };
  getCopyLabel: () => string;
  getCutLabel: () => string;
  getPasteLabel: () => string;
}

export const useGridClipboard = ({
  ctx,
  tubes,
  selectedPositions,
  resolveTubeIdAtPosition,
  onDeleteTubes,
  onPasteTubes,
  onSelectionChange,
  currentUserId,
  isViewOnlySpace = false,
}: UseGridClipboardProps): UseGridClipboardReturn => {
  const clipboard = useGridUiStore(state => state.clipboard);
  const setClipboard = useGridUiStore(state => state.setClipboard);
  const modalService = useModalStore();
  const { getBox } = useStorageData();

  // Helper: Get selected positions in current box
  const selectedPositionsInThisBox = useCallback((): number[] => {
    const positions: number[] = [];
    selectedPositions.forEach(key => {
      const { tankId: t, rackId: r, boxId: b, position } = parsePositionKey(key);
      if (t === ctx.tankId && r === ctx.rackId && b === ctx.boxId) {
        positions.push(position);
      }
    });
    return positions.sort((a, b) => a - b);
  }, [selectedPositions, ctx.tankId, ctx.rackId, ctx.boxId]);

  // Copy operation
  const copy = useCallback(async () => {
    const positions = selectedPositionsInThisBox();
    if (positions.length === 0) return;

    const items: TubeClipboardItem[] = positions
      .map(position => {
        const tubeId = resolveTubeIdAtPosition(position);
        return tubeId ? { tubeId, fromPosition: position } : null;
      })
      .filter((item): item is TubeClipboardItem => item !== null);

    if (items.length === 0) return;

    // Get selected tubes for access check
    const selectedTubes = items
      .map(item => tubes.find(t => t.id === item.tubeId))
      .filter((tube): tube is TubeData => tube !== undefined);

    // Check modification access in view-only spaces
    if (isViewOnlySpace && selectedTubes.length > 0) {
      const result = canModifyAllTubes(selectedTubes, currentUserId, isViewOnlySpace);
      if (!result.canModifyAll) {
        notifications.warning(getBlockedModificationMessage(result.blockedCount));
        return;
      }
    }

    const clipboardData: ClipboardData = {
      tubes: selectedTubes,
      operation: 'copy',
      timestamp: new Date(),
      sourceLocation: ctx,
    };

    setClipboard(clipboardData);
    await writeClipboardOS(clipboardData);

    notifications.copy(`Copied ${items.length} tube${items.length > 1 ? 's' : ''}`);
  }, [
    selectedPositionsInThisBox,
    resolveTubeIdAtPosition,
    tubes,
    ctx,
    setClipboard,
    isViewOnlySpace,
    currentUserId,
  ]);

  // Cut operation
  const cut = useCallback(async () => {
    const positions = selectedPositionsInThisBox();
    if (positions.length === 0) return;

    const items: TubeClipboardItem[] = positions
      .map(position => {
        const tubeId = resolveTubeIdAtPosition(position);
        return tubeId ? { tubeId, fromPosition: position } : null;
      })
      .filter((item): item is TubeClipboardItem => item !== null);

    if (items.length === 0) return;

    // Get selected tubes for access check
    const selectedTubes = items
      .map(item => tubes.find(t => t.id === item.tubeId))
      .filter((tube): tube is TubeData => tube !== undefined);

    // Check modification access in view-only spaces
    // Cut requires modify access since it will delete the source tubes
    if (isViewOnlySpace && selectedTubes.length > 0) {
      const result = canModifyAllTubes(selectedTubes, currentUserId, isViewOnlySpace);
      if (!result.canModifyAll) {
        notifications.warning(getBlockedModificationMessage(result.blockedCount));
        return;
      }
    }

    const clipboardData: ClipboardData = {
      tubes: selectedTubes,
      operation: 'cut',
      timestamp: new Date(),
      sourceLocation: ctx,
    };

    setClipboard(clipboardData);
    await writeClipboardOS(clipboardData);

    notifications.cut(`Cut ${items.length} tube${items.length > 1 ? 's' : ''}`);

    // Clear selection after cut
    onSelectionChange(new Set());
  }, [
    selectedPositionsInThisBox,
    resolveTubeIdAtPosition,
    tubes,
    ctx,
    setClipboard,
    onSelectionChange,
    isViewOnlySpace,
    currentUserId,
  ]);

  // Paste operation
  const paste = useCallback(
    async (options?: { targetStart?: number }) => {
      // Block paste in view-only spaces (creates new tubes)
      if (isViewOnlySpace) {
        notifications.warning('Cannot add tubes to a space assigned to another user.');
        return;
      }

      let clipData = clipboard;

      // Try OS clipboard if no in-app clipboard
      if (!clipData) {
        clipData = await readClipboardOS();
        if (clipData) setClipboard(clipData);
      }

      if (!clipData || clipData.tubes.length === 0) return;

      const currentSelectedPositions = selectedPositionsInThisBox();
      const shouldFillTargets = currentSelectedPositions.length > clipData.tubes.length;

      let tubesToPaste: ReturnType<typeof tubeDataToCreateRequest>[];

      if (shouldFillTargets) {
        // Fill Mode: Repeat clipboard pattern across all selected positions
        tubesToPaste = currentSelectedPositions.map((targetPos, i) => {
          const sourceTube = clipData.tubes[i % clipData.tubes.length];
          return tubeDataToCreateRequest(sourceTube, {
            tankId: ctx.tankId,
            rackId: ctx.rackId,
            boxId: ctx.boxId,
            position: targetPos,
          });
        });
      } else {
        // Spatial Pattern Mode: Preserve relative positioning
        const anchorPosition =
          currentSelectedPositions.length > 0
            ? Math.min(...currentSelectedPositions)
            : options?.targetStart;

        if (anchorPosition === undefined) return;

        // Validate paste operation across different grid configurations
        const sourceGridConfig = getBox(
          (clipData.sourceLocation ?? ctx).tankId,
          (clipData.sourceLocation ?? ctx).rackId,
          (clipData.sourceLocation ?? ctx).boxId
        )?.gridConfig;

        const targetGridConfig = getBox(ctx.tankId, ctx.rackId, ctx.boxId)?.gridConfig;

        if (sourceGridConfig && targetGridConfig) {
          const sourcePositions = clipData.tubes.map(tube => tube.location.position);
          const validation = validatePasteOperation(
            sourcePositions,
            anchorPosition,
            sourceGridConfig,
            targetGridConfig
          );

          if (!validation.isValid) {
            const userConfirmed = await new Promise<boolean>(resolve => {
              modalService.showOverwriteConfirm({
                title: 'Paste Warning',
                message: validation.warnings.join('\n\n') + '\n\nDo you want to continue?',
                confirmText: 'Paste Anyway',
                onConfirm: () => {
                  modalService.hideOverwriteConfirm();
                  resolve(true);
                },
                onCancel: () => {
                  modalService.hideOverwriteConfirm();
                  resolve(false);
                },
              });
            });

            if (!userConfirmed) return;
          }
        }

        const sourcePositions = clipData.tubes.map(tube => tube.location.position);
        const minSourcePosition = Math.min(...sourcePositions);

        tubesToPaste = clipData.tubes.map(sourceTube => {
          const relativePosition = sourceTube.location.position - minSourcePosition;
          const newPosition = anchorPosition + relativePosition;

          return tubeDataToCreateRequest(sourceTube, {
            tankId: ctx.tankId,
            rackId: ctx.rackId,
            boxId: ctx.boxId,
            position: newPosition,
          });
        });
      }

      // Detect position conflicts
      const conflictingPositions = tubesToPaste.filter(tubeData => {
        const existingTube = tubes.find(
          t =>
            t.location.tankId === tubeData.location.tankId &&
            t.location.rackId === tubeData.location.rackId &&
            t.location.boxId === tubeData.location.boxId &&
            t.location.position === tubeData.location.position
        );
        return existingTube !== undefined;
      });

      if (conflictingPositions.length > 0) {
        const conflictingTubes = conflictingPositions.map(tubeData => {
          return tubes.find(
            t =>
              t.location.tankId === tubeData.location.tankId &&
              t.location.rackId === tubeData.location.rackId &&
              t.location.boxId === tubeData.location.boxId &&
              t.location.position === tubeData.location.position
          )!;
        });

        const userConfirmed = await new Promise<boolean>(resolve => {
          modalService.showOverwriteConfirm({
            title: 'Overwrite Confirmation',
            message: `${conflictingPositions.length} position${conflictingPositions.length > 1 ? 's are' : ' is'} already occupied. Do you want to overwrite ${conflictingPositions.length > 1 ? 'these tubes' : 'this tube'}?`,
            confirmText: 'Overwrite',
            onConfirm: () => {
              modalService.hideOverwriteConfirm();
              resolve(true);
            },
            onCancel: () => {
              modalService.hideOverwriteConfirm();
              resolve(false);
            },
          });
        });

        if (!userConfirmed) return;

        const conflictingTubeIds = conflictingTubes.map(t => t.id);
        if (onDeleteTubes && conflictingTubeIds.length > 0) {
          await onDeleteTubes(conflictingTubeIds, true);
        }
      }

      if (onPasteTubes) {
        await onPasteTubes(tubesToPaste);
      }

      // Delete source tubes after successful paste (cut operation only)
      if (clipData.operation === 'cut') {
        const tubeIds = clipData.tubes.map(tube => tube.id).filter(Boolean);
        if (onDeleteTubes && tubeIds.length > 0) {
          await onDeleteTubes(tubeIds, true);
        }
        notifications.move(
          `Moved ${tubesToPaste.length} tube${tubesToPaste.length > 1 ? 's' : ''}`
        );
      } else {
        notifications.paste(
          `Pasted ${tubesToPaste.length} tube${tubesToPaste.length > 1 ? 's' : ''}`
        );
      }

      setClipboard(null);
    },
    [
      clipboard,
      selectedPositionsInThisBox,
      setClipboard,
      onPasteTubes,
      onDeleteTubes,
      ctx,
      getBox,
      modalService,
      tubes,
      isViewOnlySpace,
    ]
  );

  // Clipboard state for UI
  const clipboardState = useMemo(
    () => ({
      hasData: Boolean(clipboard?.tubes?.length),
      count: clipboard?.tubes?.length ?? 0,
      cutPositions:
        clipboard?.operation === 'cut'
          ? new Set(
              clipboard.tubes.map(tube =>
                toPositionKey(clipboard.sourceLocation ?? ctx, tube.location.position)
              )
            )
          : new Set<PositionKey>(),
      copyPositions:
        clipboard?.operation === 'copy'
          ? new Set(
              clipboard.tubes.map(tube =>
                toPositionKey(clipboard.sourceLocation ?? ctx, tube.location.position)
              )
            )
          : new Set<PositionKey>(),
    }),
    [clipboard, ctx]
  );

  // Label methods
  const getCopyLabel = useCallback(() => {
    const count = selectedPositionsInThisBox().length;
    if (count === 0) return 'Copy';
    if (count === 1) return 'Copy Tube';
    return `Copy ${count} Tubes`;
  }, [selectedPositionsInThisBox]);

  const getCutLabel = useCallback(() => {
    const count = selectedPositionsInThisBox().length;
    if (count === 0) return 'Cut';
    if (count === 1) return 'Cut Tube';
    return `Cut ${count} Tubes`;
  }, [selectedPositionsInThisBox]);

  const getPasteLabel = useCallback(() => {
    const count = clipboard?.tubes?.length ?? 0;
    if (count === 0) return 'Paste';
    if (count === 1) return 'Paste Tube';
    return `Paste ${count} Tubes`;
  }, [clipboard]);

  return {
    copy,
    cut,
    paste,
    clipboard: clipboardState,
    getCopyLabel,
    getCutLabel,
    getPasteLabel,
  };
};
