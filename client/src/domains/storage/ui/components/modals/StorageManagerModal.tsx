import React, { useState, useMemo } from 'react';

import { NAMING_PATTERNS, sortByName } from '@odysseus/shared-schemas';
import { Plus, ListTree, UsersRound, Loader2 } from 'lucide-react';

import { useModalStore } from '@app/stores/modalStore';
import { useAuthStore } from '@domains/authentication';
import {
  useStorageData,
  useUpdateResourceLabelMutation,
  getNextTankNumber,
  extractAssignedUserIds,
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
import { useResourceOwnership } from '@domains/storage/hooks/useResourceOwnership';
import { useResourcePermissions } from '@domains/storage/hooks/useResourcePermissions';
import { useActiveUsersQuery, useUserLookupQuery } from '@domains/users';
import { TankIcon } from '@shared/ui/components/icons';
import { BaseModal } from '@shared/ui/components/modals/BaseModal';
import { notifications } from '@shared/utils/notifications';

import { AssignmentsByUserView } from './AssignmentsByUserView';
import { BoxEditModal } from './BoxEditModal';
import { CustomLabelEditModal } from './CustomLabelEditModal';
import { RackEditModal } from './RackEditModal';
import { StorageManagerContext } from './StorageManagerContext';
import { TankEditModal } from './TankEditModal';
import { TankRow } from './TankRow';

import type {
  TankConfiguration,
  RackConfiguration,
  BoxConfiguration,
  GridConfiguration,
} from '@domains/storage';

interface StorageManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StorageManagerModal({ isOpen, onClose }: StorageManagerModalProps) {
  const { currentLab, getAvailableGridTemplates } = useStorageData();
  const modalService = useModalStore();
  const { user: currentUser } = useAuthStore();

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

  const { data: activeUsers = [] } = useActiveUsersQuery();

  // Includes deactivated users who still have assignments (for display purposes)
  const assignedUserIds = useMemo(() => extractAssignedUserIds(currentLab), [currentLab]);
  const { data: assignedUsers = [] } = useUserLookupQuery(assignedUserIds);

  const dropdownUsers = useMemo(() => sortByName(activeUsers), [activeUsers]);

  const displayUsers = useMemo(() => {
    const userMap = new Map(activeUsers.map(u => [u.id, u]));
    assignedUsers.forEach(u => {
      if (!userMap.has(u.id)) {
        userMap.set(u.id, u);
      }
    });
    return Array.from(userMap.values());
  }, [activeUsers, assignedUsers]);

  const [viewMode, setViewMode] = useState<'tree' | 'byUser'>('tree');

  const { getUserInfo, isOwnedByCurrentUser } = useResourceOwnership(displayUsers, currentUser?.id);
  const { canEditResource, canManageStorage } = useResourcePermissions(currentUser);

  // Modal state: separate data from visibility for exit animations
  // Data persists during close animation, isOpen controls visibility
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
  const [collapsedTanks, setCollapsedTanks] = useState<Set<string>>(new Set());
  const [collapsedRacks, setCollapsedRacks] = useState<Set<string>>(() => {
    // Default all racks to collapsed for cleaner initial view
    const allRackKeys = new Set<string>();
    currentLab?.equipment.tanks.forEach(tank => {
      tank.racks.forEach(rack => {
        allRackKeys.add(`${tank.id}-rack-${rack.id}`);
      });
    });
    return allRackKeys;
  });

  const [rackCountToAdd, setRackCountToAdd] = useState<Record<string, number>>({});
  const [boxCountToAdd, setBoxCountToAdd] = useState<Record<string, number>>({});

  const gridTemplates = getAvailableGridTemplates();

  const toggleTankCollapse = (tankId: string) => {
    setCollapsedTanks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tankId)) {
        newSet.delete(tankId);
      } else {
        newSet.add(tankId);
      }
      return newSet;
    });
  };

  const toggleRackCollapse = (rackKey: string) => {
    setCollapsedRacks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rackKey)) {
        newSet.delete(rackKey);
      } else {
        newSet.add(rackKey);
      }
      return newSet;
    });
  };

  const handleAssignRack = (tankId: string, rackId: string, userId: string | undefined) => {
    assignRackMutation.mutate({ tankId, rackId, assignedUserId: userId ?? null });
  };

  const handleAssignBox = (
    tankId: string,
    rackId: string,
    boxId: string,
    userId: string | null | undefined
  ) => {
    assignBoxMutation.mutate({ tankId, rackId, boxId, assignedUserId: userId ?? null });
  };

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

  const handleCreateRack = (tankId: string) => {
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
  };

  const handleAddBox = (tankId: string, rackId: string) => {
    const rackKey = `${tankId}-${rackId}`;
    const count = boxCountToAdd[rackKey] || 1;
    addBoxesMutation.mutate(
      { tankId, rackId, count },
      { onSuccess: () => setBoxCountToAdd(prev => ({ ...prev, [rackKey]: 1 })) }
    );
  };

  const handleRemoveBox = (tankId: string, rackId: string, boxId: string) => {
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
  };

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

  const handleDeleteRack = (tankId: string, rackId: string) => {
    if (!currentLab) return;

    const tank = currentLab.equipment.tanks.find(t => t.id === tankId);
    if (!tank || tank.racks.length <= 1) {
      notifications.error('Cannot delete the last rack in a tank');
      return;
    }

    modalService.showDeleteConfirm({
      title: 'Delete Rack',
      message: 'Are you sure you want to delete this rack? This action is blocked if tubes exist.',
      onConfirm: () => {
        deleteRackMutation.mutate(
          { tankId, rackId },
          { onSettled: () => modalService.hideDeleteConfirm() }
        );
      },
    });
  };

  const handleAddNewTank = () => {
    if (!currentLab) return;
    const newTankNumber = getNextTankNumber(currentLab.equipment.tanks);
    const tankName = NAMING_PATTERNS.TANK.DEFAULT_NAME(newTankNumber);

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

  const handleDeleteTank = (tankId: string) => {
    if (!currentLab) return;

    if (currentLab.equipment.tanks.length <= 1) {
      notifications.error('Cannot delete the last tank in the laboratory');
      return;
    }

    modalService.showDeleteConfirm({
      title: 'Delete Tank',
      message: 'Are you sure you want to delete this tank? This action is blocked if tubes exist.',
      onConfirm: () => {
        deleteTankMutation.mutate(
          { tankId },
          { onSettled: () => modalService.hideDeleteConfirm() }
        );
      },
    });
  };

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

    let rackCount = 0;
    let boxCount = 0;
    for (const tank of currentLab.equipment.tanks) {
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

    let rackCount = 0;
    let boxCount = 0;
    for (const tank of currentLab.equipment.tanks) {
      for (const rack of tank.racks) {
        if (rack.assignedUserId === fromUserId) rackCount++;
        for (const box of rack.boxes) {
          if (box.assignedUserId === fromUserId) {
            boxCount++;
          } else if (box.assignedUserId === undefined && rack.assignedUserId === fromUserId) {
            boxCount++;
          }
        }
      }
    }

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

  if (!currentLab) return null;

  const contextValue = {
    users: dropdownUsers,
    currentUser,
    getUserInfo,
    isOwnedByCurrentUser,
    canEditResource,
    canManageStorage,
    onEditTank: (tank: TankConfiguration) => {
      setTankModalData(tank);
      setIsTankModalOpen(true);
    },
    onDeleteTank: handleDeleteTank,
    onAddRack: handleCreateRack,
    onEditRack: (tankId: string, rack: RackConfiguration) => {
      setRackModalData({ tankId, rack });
      setIsRackModalOpen(true);
    },
    onDeleteRack: handleDeleteRack,
    onAddBox: handleAddBox,
    onAssignRack: handleAssignRack,
    onEditRackLabel: (tankId: string, rackId: string, currentLabel: string) => {
      setLabelModalData({ type: 'rack', tankId, rackId, currentLabel });
      setIsLabelModalOpen(true);
    },
    onEditBox: (tankId: string, rackId: string, box: BoxConfiguration) => {
      setBoxModalData({ tankId, rackId, box });
      setIsBoxModalOpen(true);
    },
    onDeleteBox: handleRemoveBox,
    onAssignBox: handleAssignBox,
    onEditBoxLabel: (tankId: string, rackId: string, boxId: string, currentLabel: string) => {
      setLabelModalData({ type: 'box', tankId, rackId, boxId, currentLabel });
      setIsLabelModalOpen(true);
    },
  };

  const tabs = (
    <div className="flex items-center gap-6 px-4">
      <button
        type="button"
        onClick={() => setViewMode('tree')}
        data-focus="none"
        className={`flex items-center gap-2 px-2 py-2.5 text-sm font-medium transition-colors rounded-t focus:outline-none focus:bg-accent border-b-2 -mb-px ${
          viewMode === 'tree'
            ? 'border-secondary-foreground text-card-foreground'
            : 'border-transparent text-muted-foreground hover:text-accent-foreground hover:border-border'
        }`}
      >
        <ListTree size={14} />
        By Location
      </button>
      <button
        type="button"
        onClick={() => setViewMode('byUser')}
        data-focus="none"
        className={`flex items-center gap-2 px-2 py-2.5 text-sm font-medium transition-colors rounded-t focus:outline-none focus:bg-accent border-b-2 -mb-px ${
          viewMode === 'byUser'
            ? 'border-secondary-foreground text-card-foreground'
            : 'border-transparent text-muted-foreground hover:text-accent-foreground hover:border-border'
        }`}
      >
        <UsersRound size={14} />
        By User
      </button>
    </div>
  );

  const footer = (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-shrink min-w-0">
        <div className="flex items-center gap-1">
          <div className="w-1 h-3 rounded-sm bg-ownership-user-badge flex-shrink-0" />
          <span>You</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1 h-3 rounded-sm bg-ownership-other-badge flex-shrink-0" />
          <span>Other</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1 h-3 rounded-sm bg-ownership-unassigned-badge flex-shrink-0" />
          <span>Unassigned/Common</span>
        </div>
      </div>

      <button
        onClick={onClose}
        disabled={isMutating}
        className="btn btn-secondary px-6 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isMutating && <Loader2 size={14} className="animate-spin" />}
        {isMutating ? 'Saving...' : 'Done'}
      </button>
    </div>
  );

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        icon={<TankIcon size={20} />}
        title="Storage Manager"
        subtitle="Storage Layout & Assignments"
        size="lg"
        fixedHeight
        animation="slide"
        tabs={tabs}
        tabOrientation="horizontal"
        footer={footer}
        contentClassName="p-3"
        className="!max-w-md max-h-[80vh]"
        onClose={onClose}
      >
        {viewMode === 'tree' ? (
          <div className="space-y-2">
            {canManageStorage && (
              <div className="flex justify-end">
                <button
                  onClick={handleAddNewTank}
                  disabled={addTankMutation.isPending}
                  className="btn btn-primary flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addTankMutation.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Plus size={16} />
                  )}
                  {addTankMutation.isPending ? 'Adding...' : 'Add Tank'}
                </button>
              </div>
            )}

            <StorageManagerContext.Provider value={contextValue}>
              <div className="space-y-1.5">
                {currentLab.equipment.tanks.map(tank => (
                  <TankRow
                    key={tank.id}
                    tank={tank}
                    collapsed={collapsedTanks.has(tank.id)}
                    rackCountToAdd={rackCountToAdd[tank.id] || 1}
                    boxCountToAdd={boxCountToAdd}
                    onToggleCollapse={() => toggleTankCollapse(tank.id)}
                    onToggleRackCollapse={toggleRackCollapse}
                    onRackCountChange={count =>
                      setRackCountToAdd(prev => ({ ...prev, [tank.id]: count }))
                    }
                    onBoxCountChange={(rackKey, count) =>
                      setBoxCountToAdd(prev => ({ ...prev, [rackKey]: count }))
                    }
                    collapsedRacks={collapsedRacks}
                    canDeleteTank={currentLab.equipment.tanks.length > 1}
                  />
                ))}
              </div>
            </StorageManagerContext.Provider>
          </div>
        ) : (
          <AssignmentsByUserView
            lab={currentLab}
            getUserInfo={getUserInfo}
            currentUserId={currentUser?.id}
            canManageStorage={canManageStorage}
            users={dropdownUsers}
            onBulkUnassign={handleBulkUnassign}
            onBulkReassign={handleBulkReassign}
          />
        )}
      </BaseModal>

      {/* Nested modals - always rendered when data exists, isOpen controls visibility */}
      {boxModalData && (
        <BoxEditModal
          isOpen={isBoxModalOpen}
          initialBox={boxModalData.box}
          tankId={boxModalData.tankId}
          rackId={boxModalData.rackId}
          gridTemplates={gridTemplates}
          onSave={handleUpdateBoxGrid}
          onClose={() => setIsBoxModalOpen(false)}
        />
      )}

      {rackModalData && (
        <RackEditModal
          isOpen={isRackModalOpen}
          initialRack={rackModalData.rack}
          tankId={rackModalData.tankId}
          onSave={handleUpdateRack}
          onClose={() => setIsRackModalOpen(false)}
        />
      )}

      {tankModalData && (
        <TankEditModal
          isOpen={isTankModalOpen}
          initialTank={tankModalData}
          onSave={handleUpdateTank}
          onClose={() => setIsTankModalOpen(false)}
        />
      )}

      {labelModalData && (
        <CustomLabelEditModal
          isOpen={isLabelModalOpen}
          resourceInfo={{
            type: labelModalData.type,
            tankId: labelModalData.tankId,
            rackId: labelModalData.rackId,
            boxId: labelModalData.boxId,
            initialLabel: labelModalData.currentLabel,
          }}
          currentLab={currentLab}
          onSave={handleUpdateCustomLabel}
          onClose={() => setIsLabelModalOpen(false)}
        />
      )}
    </>
  );
}
