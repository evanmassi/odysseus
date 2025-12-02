import { useCallback } from 'react';

import { useStorageStore } from '@domains/storage';

interface UseResourceAssignmentResult {
  assignRack: (tankId: string, rackId: string, userId: string | undefined) => Promise<void>;
  assignBox: (
    tankId: string,
    rackId: string,
    boxId: string,
    userId: string | null | undefined
  ) => Promise<void>;
  updateCustomLabel: (
    type: 'rack' | 'box',
    tankId: string,
    rackId: string,
    boxId: string | undefined,
    label: string
  ) => Promise<void>;
}

/**
 * Hook for resource assignment operations
 * Handles assigning users to racks/boxes and updating custom labels
 * Updates store and syncs to server - parent handles notifications/error UI
 */
export function useResourceAssignment(
  labId: string,
  saveToServer: () => Promise<void>
): UseResourceAssignmentResult {
  const updateRack = useStorageStore(state => state.updateRack);
  const updateBox = useStorageStore(state => state.updateBox);

  const assignRack = useCallback(
    async (tankId: string, rackId: string, userId: string | undefined): Promise<void> => {
      // When unassigning rack, also reset all boxes to undefined (clean slate)
      if (userId === undefined) {
        const state = useStorageStore.getState();
        const tank = state.currentLab.equipment.tanks.find(t => t.id === tankId);
        const rack = tank?.racks.find(r => r.id === rackId);
        if (rack) {
          for (const box of rack.boxes) {
            // Reset each box to undefined (inherit) and clear labels
            updateBox(labId, tankId, rackId, box.id, {
              assignedUserId: undefined,
              customLabel: '',
            });
          }
        }
      }

      updateRack(labId, tankId, rackId, {
        assignedUserId: userId,
        customLabel: userId ? undefined : '', // Clear label when unassigning
      });

      await saveToServer();
    },
    [labId, updateRack, updateBox, saveToServer]
  );

  const assignBox = useCallback(
    async (
      tankId: string,
      rackId: string,
      boxId: string,
      userId: string | null | undefined
    ): Promise<void> => {
      updateBox(labId, tankId, rackId, boxId, {
        assignedUserId: userId,
        // Clear label when making common (null) or reverting to inherit (undefined)
        customLabel: typeof userId === 'string' ? undefined : '',
      });

      await saveToServer();
    },
    [labId, updateBox, saveToServer]
  );

  const updateCustomLabel = useCallback(
    async (
      type: 'rack' | 'box',
      tankId: string,
      rackId: string,
      boxId: string | undefined,
      label: string
    ): Promise<void> => {
      if (type === 'rack') {
        updateRack(labId, tankId, rackId, {
          customLabel: label.trim() || undefined,
        });
      } else if (boxId) {
        updateBox(labId, tankId, rackId, boxId, {
          customLabel: label.trim() || undefined,
        });
      }

      await saveToServer();
    },
    [labId, updateRack, updateBox, saveToServer]
  );

  return {
    assignRack,
    assignBox,
    updateCustomLabel,
  };
}
