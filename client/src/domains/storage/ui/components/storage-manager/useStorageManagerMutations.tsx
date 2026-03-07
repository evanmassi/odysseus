/**
 * Storage Manager Mutations
 *
 * Mutation hooks, handlers, and edit-modal state for the storage manager modal.
 */

import { useState, useCallback } from 'react';

import { useModalStore } from '@app/stores/modalStore';
import {
  useUpdateResourceLabelMutation,
  useAddTankMutation,
  useUpdateTankMutation,
  useDeleteTankMutation,
  useAddRacksMutation,
  useUpdateRackMutation,
  useDeleteRackMutation,
  useAssignRackMutation,
  useAddBoxesMutation,
  useUpdateBoxMutation,
  useDeleteBoxMutation,
  useAssignBoxMutation,
  useBulkUnassignMutation,
  useBulkReassignMutation,
} from '@domains/storage';
import { notifications } from '@shared/utils/notifications';

import type {
  TankConfiguration,
  RackConfiguration,
  BoxConfiguration,
  GridConfiguration,
} from '@domains/storage';
import type { LabConfiguration } from '@odysseus/shared-schemas';

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

interface UseStorageManagerMutationsParams {
  currentLab: LabConfiguration | null;
  getUserInfo: (userId: string) => { initials: string; username: string } | null;
  setCollapsedRacks: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export function useStorageManagerMutations({
  currentLab,
  getUserInfo,
  setCollapsedRacks,
}: UseStorageManagerMutationsParams) {
  const modalService = useModalStore();

  const addTankMutation = useAddTankMutation();
  const updateTankMutation = useUpdateTankMutation();
  const deleteTankMutation = useDeleteTankMutation();
  const addRacksMutation = useAddRacksMutation();
  const updateRackMutation = useUpdateRackMutation();
  const deleteRackMutation = useDeleteRackMutation();
  const assignRackMutation = useAssignRackMutation();
  const addBoxesMutation = useAddBoxesMutation();
  const updateBoxMutation = useUpdateBoxMutation();
  const deleteBoxMutation = useDeleteBoxMutation();
  const assignBoxMutation = useAssignBoxMutation();
  const bulkUnassignMutation = useBulkUnassignMutation();
  const bulkReassignMutation = useBulkReassignMutation();
  const updateLabelMutation = useUpdateResourceLabelMutation();

  const isMutating =
    addTankMutation.isPending ||
    updateTankMutation.isPending ||
    deleteTankMutation.isPending ||
    addRacksMutation.isPending ||
    updateRackMutation.isPending ||
    deleteRackMutation.isPending ||
    assignRackMutation.isPending ||
    addBoxesMutation.isPending ||
    updateBoxMutation.isPending ||
    deleteBoxMutation.isPending ||
    assignBoxMutation.isPending ||
    bulkUnassignMutation.isPending ||
    bulkReassignMutation.isPending ||
    updateLabelMutation.isPending;

  // Count-to-add state (owned here because handlers reset on success)
  const [rackCountToAdd, setRackCountToAdd] = useState<Record<string, number>>({});
  const [boxCountToAdd, setBoxCountToAdd] = useState<Record<string, number>>({});

  // Edit-modal state: separate data from visibility for exit animations
  const [tankModalData, setTankModalData] = useState<TankConfiguration | null>(null);
  const [isTankModalOpen, setIsTankModalOpen] = useState(false);

  const [boxModalData, setBoxModalData] = useState<{
    tankId: string;
    rackId: string;
    box: BoxConfiguration;
  } | null>(null);
  const [isBoxModalOpen, setIsBoxModalOpen] = useState(false);

  const [rackModalData, setRackModalData] = useState<{
    tankId: string;
    rack: RackConfiguration;
  } | null>(null);
  const [isRackModalOpen, setIsRackModalOpen] = useState(false);

  const [labelModalData, setLabelModalData] = useState<{
    type: 'rack' | 'box';
    tankId: string;
    rackId: string;
    boxId?: string;
    currentLabel?: string;
  } | null>(null);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);

  // Modal openers
  const onEditTank = useCallback((tank: TankConfiguration) => {
    setTankModalData(tank);
    setIsTankModalOpen(true);
  }, []);

  const onEditRack = useCallback((tankId: string, rack: RackConfiguration) => {
    setRackModalData({ tankId, rack });
    setIsRackModalOpen(true);
  }, []);

  const onEditRackLabel = useCallback((tankId: string, rackId: string, currentLabel: string) => {
    setLabelModalData({ type: 'rack', tankId, rackId, currentLabel });
    setIsLabelModalOpen(true);
  }, []);

  const onEditBox = useCallback((tankId: string, rackId: string, box: BoxConfiguration) => {
    setBoxModalData({ tankId, rackId, box });
    setIsBoxModalOpen(true);
  }, []);

  const onEditBoxLabel = useCallback(
    (tankId: string, rackId: string, boxId: string, currentLabel: string) => {
      setLabelModalData({ type: 'box', tankId, rackId, boxId, currentLabel });
      setIsLabelModalOpen(true);
    },
    []
  );

  // CRUD handlers
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

  const handleUpdateCustomLabel = (
    type: 'rack' | 'box',
    tankId: string,
    rackId: string,
    boxId: string | undefined,
    label: string
  ) => {
    updateLabelMutation.mutate(
      { resourceType: type, tankId, rackId, boxId, customLabel: label || undefined },
      { onSuccess: () => setIsLabelModalOpen(false) }
    );
  };

  const handleCreateRack = useCallback(
    (tankId: string) => {
      const count = rackCountToAdd[tankId] || 1;
      addRacksMutation.mutate(
        { tankId, count },
        {
          onSuccess: data => {
            const newRackKeys = data.rackIds.map(id => `${tankId}-rack-${id}`);
            setCollapsedRacks(prev => new Set([...prev, ...newRackKeys]));
            setRackCountToAdd(prev => ({ ...prev, [tankId]: 1 }));
          },
        }
      );
    },
    [rackCountToAdd, addRacksMutation, setCollapsedRacks]
  );

  const handleAddBox = useCallback(
    (tankId: string, rackId: string) => {
      const rackKey = `${tankId}-${rackId}`;
      const count = boxCountToAdd[rackKey] || 1;
      addBoxesMutation.mutate(
        { tankId, rackId, count },
        { onSuccess: () => setBoxCountToAdd(prev => ({ ...prev, [rackKey]: 1 })) }
      );
    },
    [boxCountToAdd, addBoxesMutation]
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

  const handleUpdateBoxGrid = (
    tankId: string,
    rackId: string,
    boxId: string,
    gridConfig: GridConfiguration
  ) => {
    updateBoxMutation.mutate(
      { tankId, rackId, boxId, updates: { gridConfig } },
      { onSuccess: () => setIsBoxModalOpen(false) }
    );
  };

  const handleUpdateRack = (
    tankId: string,
    rackId: string,
    updates: Partial<RackConfiguration>
  ) => {
    updateRackMutation.mutate(
      {
        tankId,
        rackId,
        updates: {
          name: updates.name,
          capacity: updates.capacity,
          isActive: updates.isActive,
        },
      },
      { onSuccess: () => setIsRackModalOpen(false) }
    );
  };

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

    // Create tank, then add a default rack, then collapse it
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

  const handleUpdateTank = (tankId: string, updates: Partial<TankConfiguration>) => {
    updateTankMutation.mutate(
      {
        tankId,
        updates: {
          name: updates.name,
          location: updates.location,
          isActive: updates.isActive,
        },
      },
      { onSuccess: () => setIsTankModalOpen(false) }
    );
  };

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

    // Count-to-add state
    rackCountToAdd,
    boxCountToAdd,
    setRackCountToAdd,
    setBoxCountToAdd,

    // Edit-modal state
    tankModalData,
    isTankModalOpen,
    setIsTankModalOpen,
    boxModalData,
    isBoxModalOpen,
    setIsBoxModalOpen,
    rackModalData,
    isRackModalOpen,
    setIsRackModalOpen,
    labelModalData,
    isLabelModalOpen,
    setIsLabelModalOpen,

    // Modal openers (for context)
    onEditTank,
    onEditRack,
    onEditRackLabel,
    onEditBox,
    onEditBoxLabel,

    // CRUD handlers
    handleAssignRack,
    handleAssignBox,
    handleUpdateCustomLabel,
    handleCreateRack,
    handleAddBox,
    handleRemoveBox,
    handleUpdateBoxGrid,
    handleUpdateRack,
    handleDeleteRack,
    handleAddNewTank,
    handleDeleteTank,
    handleUpdateTank,
    handleBulkUnassign,
    handleBulkReassign,
  };
}
