import React, { useState, useMemo } from 'react';

import { NAMING_PATTERNS, sortByName } from '@odysseus/shared-schemas';
import { Plus, X, ListTree, UsersRound, Loader2 } from 'lucide-react';

import { useModalStore } from '@app/stores/modalStore';
import { useAuthState } from '@domains/authentication/hooks/useAuth';
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
import { useFocusTrap } from '@shared/hooks/useFocusTrap';
import { TankIcon } from '@shared/ui/components/icons';
import { ModalPortal } from '@shared/ui/components/ModalPortal';
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
  const { user: currentUser } = useAuthState();

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

  const trapRef = useFocusTrap({
    isOpen: isOpen && !!currentLab,
    restoreFocus: true,
    autoFocusFirstInput: false,
    initialFocusDelay: 100,
  });

  const handleClose = () => onClose();

  const { getUserInfo, isOwnedByCurrentUser } = useResourceOwnership(displayUsers, currentUser?.id);
  const { canEditResource, canManageStorage } = useResourcePermissions(currentUser);

  const [editingTank, setEditingTank] = useState<TankConfiguration | null>(null);
  const [editingBox, setEditingBox] = useState<{
    tankId: string;
    rackId: string;
    box: BoxConfiguration;
  } | null>(null);
  const [editingRack, setEditingRack] = useState<{
    tankId: string;
    rack: RackConfiguration;
  } | null>(null);
  const [editingLabel, setEditingLabel] = useState<{
    type: 'rack' | 'box';
    tankId: string;
    rackId: string;
    boxId?: string;
    currentLabel?: string;
  } | null>(null);
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
      { onSuccess: () => setEditingLabel(null) }
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
      { onSuccess: () => setEditingBox(null) }
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
      { onSuccess: () => setEditingRack(null) }
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
      { onSuccess: () => setEditingTank(null) }
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

    modalService.showDeleteConfirm({
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
          { onSettled: () => modalService.hideDeleteConfirm() }
        );
      },
    });
  };

  if (!isOpen || !currentLab) return null;

  const contextValue = {
    users: dropdownUsers,
    currentUser,
    getUserInfo,
    isOwnedByCurrentUser,
    canEditResource,
    canManageStorage,
    onEditTank: setEditingTank,
    onDeleteTank: handleDeleteTank,
    onAddRack: handleCreateRack,
    onEditRack: (tankId: string, rack: RackConfiguration) => setEditingRack({ tankId, rack }),
    onDeleteRack: handleDeleteRack,
    onAddBox: handleAddBox,
    onAssignRack: handleAssignRack,
    onEditRackLabel: (tankId: string, rackId: string, currentLabel: string) =>
      setEditingLabel({ type: 'rack', tankId, rackId, currentLabel }),
    onEditBox: (tankId: string, rackId: string, box: BoxConfiguration) =>
      setEditingBox({ tankId, rackId, box }),
    onDeleteBox: handleRemoveBox,
    onAssignBox: handleAssignBox,
    onEditBoxLabel: (tankId: string, rackId: string, boxId: string, currentLabel: string) =>
      setEditingLabel({ type: 'box', tankId, rackId, boxId, currentLabel }),
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-50 animate-in fade-in duration-[180ms]">
        <div
          ref={trapRef}
          className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-[60%] h-[85%] max-w-2xl max-h-[800px] flex flex-col overflow-hidden animate-slide-up-fade"
        >
          {/* Header */}
          <div className="bg-white px-6 py-3 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <TankIcon size={24} className="text-slate-600" />
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Storage Manager</h2>
                  <p className="text-slate-500 text-xs">Storage Layout & Assignments</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus-ring-default"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* View Mode Tabs */}
          <div className="flex items-center gap-6 px-4 border-b border-gray-200 bg-white">
            <button
              type="button"
              onClick={() => setViewMode('tree')}
              data-focus="none"
              className={`flex items-center gap-2 px-2 py-2.5 text-sm font-medium transition-colors rounded-t focus:outline-none focus:bg-slate-100 border-b-2 -mb-px ${
                viewMode === 'tree'
                  ? 'border-slate-600 text-slate-800'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <ListTree size={14} />
              By Location
            </button>
            <button
              type="button"
              onClick={() => setViewMode('byUser')}
              data-focus="none"
              className={`flex items-center gap-2 px-2 py-2.5 text-sm font-medium transition-colors rounded-t focus:outline-none focus:bg-slate-100 border-b-2 -mb-px ${
                viewMode === 'byUser'
                  ? 'border-slate-600 text-slate-800'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <UsersRound size={14} />
              By User
            </button>
          </div>

          <div className="flex-1 p-3 overflow-y-auto">
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
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-4 py-2.5 bg-white flex-shrink-0">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-shrink min-w-0">
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
                onClick={handleClose}
                disabled={isMutating}
                className="btn btn-primary px-6 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isMutating && <Loader2 size={14} className="animate-spin" />}
                {isMutating ? 'Saving...' : 'Done'}
              </button>
            </div>
          </div>

          {editingBox && (
            <BoxEditModal
              initialBox={editingBox.box}
              tankId={editingBox.tankId}
              rackId={editingBox.rackId}
              gridTemplates={gridTemplates}
              onSave={handleUpdateBoxGrid}
              onClose={() => setEditingBox(null)}
            />
          )}

          {editingRack && (
            <RackEditModal
              initialRack={editingRack.rack}
              tankId={editingRack.tankId}
              onSave={handleUpdateRack}
              onClose={() => setEditingRack(null)}
            />
          )}

          {editingTank && (
            <TankEditModal
              initialTank={editingTank}
              onSave={handleUpdateTank}
              onClose={() => setEditingTank(null)}
            />
          )}

          {editingLabel && (
            <CustomLabelEditModal
              resourceInfo={{
                type: editingLabel.type,
                tankId: editingLabel.tankId,
                rackId: editingLabel.rackId,
                boxId: editingLabel.boxId,
                initialLabel: editingLabel.currentLabel,
              }}
              currentLab={currentLab}
              onSave={handleUpdateCustomLabel}
              onClose={() => setEditingLabel(null)}
            />
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
