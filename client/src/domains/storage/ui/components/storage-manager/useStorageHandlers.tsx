/**
 * Storage Handlers
 *
 * CRUD, assignment, and bulk operation handlers for the storage manager modal.
 */

import { useCallback } from 'react';

import { useModalStore } from '@app/stores/modalStore';
import {
  useAddTankMutation,
  useDeleteTankMutation,
  useAddRacksMutation,
  useDeleteRackMutation,
  useAssignRackMutation,
  useAddBoxesMutation,
  useDeleteBoxMutation,
  useAssignBoxMutation,
  useBulkUnassignMutation,
  useBulkReassignMutation,
} from '@domains/storage';
import { notifications } from '@shared/utils/notifications';

import type { LabConfiguration, TankConfiguration } from '@odysseus/shared-schemas';

function countAssignedResources(
  tanks: TankConfiguration[],
  userId: string
): { rackCount: number; boxCount: number } {
  let rackCount = 0;
  let boxCount = 0;
  for (const tank of tanks) {
    for (const rack of tank.racks) {
      if (rack.assignedUserId === userId) rackCount++;
      for (const box of rack.boxes) {
        if (box.assignedUserId === userId) {
          boxCount++;
        } else if (box.assignedUserId === undefined && rack.assignedUserId === userId) {
          boxCount++;
        }
      }
    }
  }
  return { rackCount, boxCount };
}

function getNextTankName(existingTanks: TankConfiguration[]): string {
  const existingNames = new Set(existingTanks.map(t => t.name));
  if (!existingNames.has('New Tank')) return 'New Tank';
  let n = 2;
  while (existingNames.has(`New Tank ${n}`)) n++;
  return `New Tank ${n}`;
}

interface UseStorageHandlersParams {
  currentLab: LabConfiguration | null;
  getUserInfo: (userId: string) => { initials: string; username: string } | null;
  setCollapsedRacks: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export function useStorageHandlers({
  currentLab,
  getUserInfo,
  setCollapsedRacks,
}: UseStorageHandlersParams) {
  const modalService = useModalStore();

  const addTankMutation = useAddTankMutation();
  const deleteTankMutation = useDeleteTankMutation();
  const addRacksMutation = useAddRacksMutation();
  const deleteRackMutation = useDeleteRackMutation();
  const assignRackMutation = useAssignRackMutation();
  const addBoxesMutation = useAddBoxesMutation();
  const deleteBoxMutation = useDeleteBoxMutation();
  const assignBoxMutation = useAssignBoxMutation();
  const bulkUnassignMutation = useBulkUnassignMutation();
  const bulkReassignMutation = useBulkReassignMutation();

  const isMutating =
    addTankMutation.isPending ||
    deleteTankMutation.isPending ||
    addRacksMutation.isPending ||
    deleteRackMutation.isPending ||
    assignRackMutation.isPending ||
    addBoxesMutation.isPending ||
    deleteBoxMutation.isPending ||
    assignBoxMutation.isPending ||
    bulkUnassignMutation.isPending ||
    bulkReassignMutation.isPending;

  const handleAssignRack = useCallback(
    (tankId: string, rackId: string, userId: string | undefined) => {
      assignRackMutation.mutate({ tankId, rackId, assignedUserId: userId ?? null });
    },
    [assignRackMutation]
  );

  const handleAssignBox = useCallback(
    (tankId: string, rackId: string, boxId: string, userId: string | null | undefined) => {
      assignBoxMutation.mutate({ tankId, rackId, boxId, assignedUserId: userId ?? null });
    },
    [assignBoxMutation]
  );

  const handleAddRacks = useCallback(
    (tankId: string, count: number, options?: { onSuccess?: () => void }) => {
      addRacksMutation.mutate(
        { tankId, count },
        {
          onSuccess: data => {
            const newRackKeys = data.rackIds.map(id => `${tankId}-rack-${id}`);
            setCollapsedRacks(prev => new Set([...prev, ...newRackKeys]));
            options?.onSuccess?.();
          },
        }
      );
    },
    [addRacksMutation, setCollapsedRacks]
  );

  const handleAddBoxes = useCallback(
    (tankId: string, rackId: string, count: number, options?: { onSuccess?: () => void }) => {
      addBoxesMutation.mutate(
        { tankId, rackId, count },
        options?.onSuccess ? { onSuccess: options.onSuccess } : undefined
      );
    },
    [addBoxesMutation]
  );

  const handleRemoveBox = useCallback(
    (tankId: string, rackId: string, boxId: string) => {
      modalService.showDeleteConfirm({
        title: 'Delete Box',
        message: 'Are you sure you want to delete this box? This action is blocked if tubes exist.',
        onConfirm: () => {
          deleteBoxMutation.mutate(
            { tankId, rackId, boxId },
            { onSettled: () => modalService.hideDeleteConfirm() }
          );
        },
      });
    },
    [modalService, deleteBoxMutation]
  );

  const handleDeleteRack = useCallback(
    (tankId: string, rackId: string) => {
      if (!currentLab) return;

      const tank = currentLab.equipment.tanks.find(t => t.id === tankId);
      if (!tank || tank.racks.length <= 1) {
        notifications.error('Cannot delete the last rack in a tank');
        return;
      }

      modalService.showDeleteConfirm({
        title: 'Delete Rack',
        message:
          'Are you sure you want to delete this rack? This action is blocked if tubes exist.',
        onConfirm: () => {
          deleteRackMutation.mutate(
            { tankId, rackId },
            { onSettled: () => modalService.hideDeleteConfirm() }
          );
        },
      });
    },
    [currentLab, modalService, deleteRackMutation]
  );

  const handleAddNewTank = () => {
    if (!currentLab) return;
    const tankName = getNextTankName(currentLab.equipment.tanks);

    addTankMutation.mutate(
      { name: tankName },
      {
        onSuccess: data => {
          addRacksMutation.mutate(
            { tankId: data.tankId, count: 1 },
            {
              onSuccess: rackData => {
                const newRackKeys = rackData.rackIds.map(id => `${data.tankId}-rack-${id}`);
                setCollapsedRacks(prev => new Set([...prev, ...newRackKeys]));
              },
            }
          );
        },
      }
    );
  };

  const handleDeleteTank = useCallback(
    (tankId: string) => {
      if (!currentLab) return;

      if (currentLab.equipment.tanks.length <= 1) {
        notifications.error('Cannot delete the last tank in the laboratory');
        return;
      }

      modalService.showDeleteConfirm({
        title: 'Delete Tank',
        message:
          'Are you sure you want to delete this tank? This action is blocked if tubes exist.',
        onConfirm: () => {
          deleteTankMutation.mutate(
            { tankId },
            { onSettled: () => modalService.hideDeleteConfirm() }
          );
        },
      });
    },
    [currentLab, modalService, deleteTankMutation]
  );

  const handleBulkUnassign = (userId: string) => {
    if (!currentLab) return;

    const { rackCount, boxCount } = countAssignedResources(currentLab.equipment.tanks, userId);
    const userInfo = getUserInfo(userId);
    const username = userInfo?.username ?? 'this user';

    modalService.showDeleteConfirm({
      title: 'Unassign All Resources',
      confirmText: 'Unassign All',
      message: (
        <>
          Are you sure you want to unassign{' '}
          <strong>
            {rackCount} rack{rackCount !== 1 ? 's' : ''}
          </strong>{' '}
          and{' '}
          <strong>
            {boxCount} box{boxCount !== 1 ? 'es' : ''}
          </strong>{' '}
          from <strong>{username}</strong>? They will become unassigned/common.
        </>
      ),
      onConfirm: () => {
        bulkUnassignMutation.mutate(
          { fromUserId: userId },
          { onSettled: () => modalService.hideDeleteConfirm() }
        );
      },
    });
  };

  const handleBulkReassign = (fromUserId: string, toUserId: string) => {
    if (!currentLab) return;

    const { rackCount, boxCount } = countAssignedResources(currentLab.equipment.tanks, fromUserId);
    const fromUserInfo = getUserInfo(fromUserId);
    const toUserInfo = getUserInfo(toUserId);
    const fromUsername = fromUserInfo?.username ?? 'this user';
    const toUsername = toUserInfo?.username ?? 'the selected user';

    modalService.showOverwriteConfirm({
      title: 'Reassign All Resources',
      confirmText: 'Reassign All',
      message: (
        <>
          Are you sure you want to reassign{' '}
          <strong>
            {rackCount} rack{rackCount !== 1 ? 's' : ''}
          </strong>{' '}
          and{' '}
          <strong>
            {boxCount} box{boxCount !== 1 ? 'es' : ''}
          </strong>{' '}
          from <strong>{fromUsername}</strong> to <strong>{toUsername}</strong>?
        </>
      ),
      onConfirm: () => {
        bulkReassignMutation.mutate(
          { fromUserId, toUserId },
          { onSettled: () => modalService.hideOverwriteConfirm() }
        );
      },
    });
  };

  return {
    isMutating,
    addTankMutation,

    handleAssignRack,
    handleAssignBox,
    handleAddRacks,
    handleAddBoxes,
    handleRemoveBox,
    handleDeleteRack,
    handleAddNewTank,
    handleDeleteTank,
    handleBulkUnassign,
    handleBulkReassign,
  };
}
