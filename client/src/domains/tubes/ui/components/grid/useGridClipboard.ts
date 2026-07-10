/**
 * Grid Clipboard Hook
 *
 * Copy/cut/paste operations with OS clipboard integration.
 */

import { useCallback, useMemo } from 'react';

import { tubeDataToCreateRequest } from '@odysseus/shared-schemas';

import { useModalStore } from '@app/stores/modalStore';
import { useStorageData } from '@domains/storage';
import { useGridClipboardStore } from '@domains/tubes/stores/gridClipboardStore';
import { useTubeStore } from '@domains/tubes/stores/tubeStore';
import { toPositionKey } from '@domains/tubes/types/gridSelectionTypes';
import { writeClipboardOS, readClipboardOS } from '@domains/tubes/utils/gridClipboard';
import { validatePasteOperation } from '@domains/tubes/utils/gridPasteValidation';
import {
  canModifyAllTubes,
  getBlockedModificationMessage,
} from '@domains/tubes/utils/tubeAccessControl';
import { notifications } from '@shared/utils/notifications';

import type { ClipboardData } from '@domains/tubes/types/clipboardTypes';
import type {
  PositionKey,
  PositionContext,
  TubeClipboardItem,
} from '@domains/tubes/types/gridSelectionTypes';
import type { TubeData, TubeLocation } from '@odysseus/shared-schemas';

export interface UseGridClipboardProps {
  ctx: PositionContext;
  tubes: TubeData[];
  selectedPositionsInThisBox: () => number[];
  resolveTubeIdAtPosition: (position: number) => string | null;
  onDeleteTubes?: (tubeIds: string[], silent?: boolean) => Promise<void>;
  onPasteTubes?: (tubes: ReturnType<typeof tubeDataToCreateRequest>[]) => Promise<void>;
  onMoveTubes?: (
    moves: Array<{ tubeId: string; version: number; destination: TubeLocation }>
  ) => Promise<void>;
  onSelectionChange: (selection: Set<PositionKey>) => void;
  currentUserId?: string;
  isViewOnlySpace?: boolean;
  isAdmin?: boolean;
  hasResearcherProfile?: boolean;
}

export interface UseGridClipboardReturn {
  copy: () => Promise<void>;
  cut: () => Promise<void>;
  paste: (options?: { targetStart?: number }) => Promise<void>;
  clipboard: {
    hasData: boolean;
    cutPositions: Set<PositionKey>;
    copyPositions: Set<PositionKey>;
  };
}

export const useGridClipboard = ({
  ctx,
  tubes,
  selectedPositionsInThisBox,
  resolveTubeIdAtPosition,
  onDeleteTubes,
  onPasteTubes,
  onMoveTubes,
  onSelectionChange,
  currentUserId,
  isViewOnlySpace = false,
  isAdmin = false,
  hasResearcherProfile = true,
}: UseGridClipboardProps): UseGridClipboardReturn => {
  const clipboard = useGridClipboardStore(state => state.clipboard);
  const setClipboard = useGridClipboardStore(state => state.setClipboard);
  const modalService = useModalStore();
  const { getBox } = useStorageData();

  const copyOrCut = useCallback(
    async (operation: 'copy' | 'cut') => {
      if (!hasResearcherProfile) {
        notifications.warning(`Researcher profile required to ${operation} tubes.`);
        return;
      }

      const positions = selectedPositionsInThisBox();
      if (positions.length === 0) return;

      const items: TubeClipboardItem[] = positions
        .map(position => {
          const tubeId = resolveTubeIdAtPosition(position);
          return tubeId ? { tubeId, fromPosition: position } : null;
        })
        .filter((item): item is TubeClipboardItem => item !== null);

      if (items.length === 0) return;

      const selectedTubes = items
        .map(item => tubes.find(t => t.id === item.tubeId))
        .filter((tube): tube is TubeData => tube !== undefined);

      if (selectedTubes.length > 0) {
        const result = canModifyAllTubes(selectedTubes, currentUserId, isViewOnlySpace, isAdmin);
        if (!result.canModifyAll) {
          notifications.warning(getBlockedModificationMessage(result));
          return;
        }
      }

      const clipboardData: ClipboardData = {
        tubes: selectedTubes,
        operation,
        timestamp: new Date(),
        selectionMode: useTubeStore.getState().lastSelectionMethod,
        sourceLocation: ctx,
      };

      setClipboard(clipboardData);
      await writeClipboardOS(clipboardData);

      const label = operation === 'copy' ? 'Copied' : 'Cut';
      notifications.success(`${label} ${items.length} tube${items.length > 1 ? 's' : ''}`);

      if (operation === 'cut') {
        onSelectionChange(new Set());
      }
    },
    [
      selectedPositionsInThisBox,
      resolveTubeIdAtPosition,
      tubes,
      ctx,
      setClipboard,
      onSelectionChange,
      isViewOnlySpace,
      isAdmin,
      currentUserId,
      hasResearcherProfile,
    ]
  );

  const copy = useCallback(() => copyOrCut('copy'), [copyOrCut]);
  const cut = useCallback(() => copyOrCut('cut'), [copyOrCut]);

  const paste = useCallback(
    async (options?: { targetStart?: number }) => {
      if (!hasResearcherProfile) {
        notifications.warning('Researcher profile required to paste tubes.');
        return;
      }

      if (isViewOnlySpace) {
        notifications.warning('Cannot add tubes to a space assigned to another user.');
        return;
      }

      let clipData = clipboard;

      if (!clipData) {
        clipData = await readClipboardOS();
        if (clipData) setClipboard(clipData);
      }

      if (!clipData || clipData.tubes.length === 0) return;

      const currentSelectedPositions = selectedPositionsInThisBox();
      const shouldFillTargets = currentSelectedPositions.length > clipData.tubes.length;

      let tubesToPaste: ReturnType<typeof tubeDataToCreateRequest>[];
      let pastedSourceTubeIds: string[] = [];

      if (shouldFillTargets) {
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
        const anchorPosition =
          currentSelectedPositions.length > 0
            ? Math.min(...currentSelectedPositions)
            : options?.targetStart;

        if (anchorPosition === undefined) return;

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
            targetGridConfig,
            clipData.selectionMode
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

        // 9×9 = 81 is the default grid size when config is unavailable
        const DEFAULT_GRID_TOTAL = 81;
        const targetTotalPositions = targetGridConfig
          ? targetGridConfig.rows * targetGridConfig.cols
          : DEFAULT_GRID_TOTAL;

        pastedSourceTubeIds = [];

        if (clipData.selectionMode === 'drag') {
          const sourceCols = sourceGridConfig?.cols ?? 9;
          const targetCols = targetGridConfig?.cols ?? 5;
          const targetRows = targetGridConfig?.rows ?? 5;

          const posToRowCol = (pos: number, cols: number) => ({
            row: Math.floor((pos - 1) / cols),
            col: (pos - 1) % cols,
          });
          const rowColToPos = (row: number, col: number, cols: number) => row * cols + col + 1;

          const sourceCoords = clipData.tubes.map(tube => ({
            tube,
            ...posToRowCol(tube.location.position, sourceCols),
          }));

          const minSourceRow = Math.min(...sourceCoords.map(c => c.row));
          const minSourceCol = Math.min(...sourceCoords.map(c => c.col));
          const anchorCoords = posToRowCol(anchorPosition, targetCols);

          tubesToPaste = sourceCoords
            .map(({ tube, row, col }) => {
              const targetRow = anchorCoords.row + (row - minSourceRow);
              const targetCol = anchorCoords.col + (col - minSourceCol);

              if (
                targetRow < 0 ||
                targetRow >= targetRows ||
                targetCol < 0 ||
                targetCol >= targetCols
              ) {
                return null;
              }

              const newPosition = rowColToPos(targetRow, targetCol, targetCols);
              pastedSourceTubeIds.push(tube.id);

              return tubeDataToCreateRequest(tube, {
                tankId: ctx.tankId,
                rackId: ctx.rackId,
                boxId: ctx.boxId,
                position: newPosition,
              });
            })
            .filter((tube): tube is NonNullable<typeof tube> => tube !== null);
        } else {
          tubesToPaste = clipData.tubes
            .map((tube, index) => {
              const targetPosition = anchorPosition + index;

              if (targetPosition < 1 || targetPosition > targetTotalPositions) {
                return null;
              }

              pastedSourceTubeIds.push(tube.id);

              return tubeDataToCreateRequest(tube, {
                tankId: ctx.tankId,
                rackId: ctx.rackId,
                boxId: ctx.boxId,
                position: targetPosition,
              });
            })
            .filter((tube): tube is NonNullable<typeof tube> => tube !== null);
        }
      }

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

        const overwriteResult = canModifyAllTubes(
          conflictingTubes,
          currentUserId,
          isViewOnlySpace,
          isAdmin
        );
        if (!overwriteResult.canModifyAll) {
          notifications.warning(
            `Cannot paste here. ${getBlockedModificationMessage(overwriteResult).replace('Cannot modify selection. ', '')}`
          );
          return;
        }

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

      if (clipData.operation === 'cut' && onMoveTubes && tubesToPaste.length > 0) {
        // Atomic move: update locations in a single request instead of create+delete
        const uniqueMoves = new Map<
          string,
          { tubeId: string; version: number; destination: TubeLocation }
        >();
        for (let i = 0; i < tubesToPaste.length; i++) {
          const sourceId = pastedSourceTubeIds[i];
          if (!sourceId || uniqueMoves.has(sourceId)) continue;
          const sourceTube = clipData.tubes.find(t => t.id === sourceId);
          if (!sourceTube) continue;
          uniqueMoves.set(sourceId, {
            tubeId: sourceId,
            version: sourceTube.version,
            destination: tubesToPaste[i].location,
          });
        }
        await onMoveTubes([...uniqueMoves.values()]);
      } else if (onPasteTubes) {
        await onPasteTubes(tubesToPaste);
      }

      const skippedCount = clipData.tubes.length - tubesToPaste.length;
      const action = clipData.operation === 'cut' ? 'Moved' : 'Pasted';

      if (skippedCount > 0) {
        notifications.warning(
          `${action} ${tubesToPaste.length} tube${tubesToPaste.length !== 1 ? 's' : ''}. ` +
            `${skippedCount} skipped (outside grid bounds).`
        );
      } else {
        notifications.success(
          `${action} ${tubesToPaste.length} tube${tubesToPaste.length !== 1 ? 's' : ''}`
        );
      }

      setClipboard(null);
    },
    [
      clipboard,
      selectedPositionsInThisBox,
      setClipboard,
      onPasteTubes,
      onMoveTubes,
      onDeleteTubes,
      ctx,
      getBox,
      modalService,
      tubes,
      isViewOnlySpace,
      isAdmin,
      currentUserId,
      hasResearcherProfile,
    ]
  );

  const clipboardState = useMemo(
    () => ({
      hasData: Boolean(clipboard?.tubes?.length),
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

  return {
    copy,
    cut,
    paste,
    clipboard: clipboardState,
  };
};
