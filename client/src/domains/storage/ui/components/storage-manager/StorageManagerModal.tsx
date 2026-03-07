/**
 * Storage Manager Modal
 *
 * Admin modal for managing storage layout (tanks, racks, boxes) and user assignments.
 */

import { useState, useMemo, useCallback } from 'react';

import { sortByName } from '@odysseus/shared-schemas';
import { Plus, ListTree, UsersRound } from 'lucide-react';

import { useModalStore } from '@app/stores/modalStore';
import { useAuthStore } from '@domains/authentication';
import {
  useStorageData,
  useUpdateResourceLabelMutation,
  extractAssignedUserIds,
  GRID_TEMPLATES,
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
import { useStorageOwnership } from '@domains/storage/hooks/useStorageOwnership';
import { useStoragePermissions } from '@domains/storage/hooks/useStoragePermissions';
import { useActiveUsersQuery, useUserLookupQuery } from '@domains/users';
import { AlertBanner, Button, Tabs, Tab } from '@shared/ui';
import { TankIcon } from '@shared/ui/components/icons';
import { BaseModal } from '@shared/ui/components/modals/BaseModal';
import { notifications } from '@shared/utils/notifications';

import { TreeLinesByLocation } from '../storage-navigator/TreeLinesByLocation';

import '../storage-navigator/storage-navigator.css';
import { AssignmentByUserView } from './assignments/AssignmentByUserView';
import { BoxEditModal } from './edit-modals/BoxEditModal';
import { CustomLabelEditModal } from './edit-modals/CustomLabelEditModal';
import { RackEditModal } from './edit-modals/RackEditModal';
import { TankEditModal } from './edit-modals/TankEditModal';
import { TankRow } from './rows/TankRow';
import { StorageManagerContext } from './StorageManagerContext';

import type {
  TankConfiguration,
  RackConfiguration,
  BoxConfiguration,
  GridConfiguration,
} from '@domains/storage';

function toggleSetItem<T>(set: Set<T>, item: T): Set<T> {
  const next = new Set(set);
  if (next.has(item)) next.delete(item);
  else next.add(item);
  return next;
}

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

interface StorageManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StorageManagerModal({ isOpen, onClose }: StorageManagerModalProps) {
  const { currentLab } = useStorageData();
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

  const dropdownUsers = useMemo(
    () => sortByName(activeUsers.filter(u => u.hasResearcher)),
    [activeUsers]
  );

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

  const { getUserInfo, isOwnedByCurrentUser } = useStorageOwnership(displayUsers, currentUser?.id);
  const isDemo = currentUser?.isDemo ?? false;
  const { canEditResource, canManageStorage, isResourceLocked } = useStoragePermissions(
    currentUser,
    isDemo
  );
  const demoLimits = currentLab?.demoLimits;
  const hasSeededResources =
    currentLab?.equipment.tanks.some(
      t => t.isSeeded ?? t.racks.some(r => r.isSeeded ?? r.boxes.some(b => b.isSeeded))
    ) ?? false;
  const demoLimitsActive = isDemo && demoLimits && hasSeededResources;
  const nonSeededTankCount = currentLab?.equipment.tanks.filter(t => !t.isSeeded).length ?? 0;
  const tankLimitReached = demoLimitsActive && nonSeededTankCount >= demoLimits.maxTanks;

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

  const expandedTanks = useMemo(() => {
    if (!currentLab) return new Set<string>();
    const all = new Set(currentLab.equipment.tanks.map(t => t.id));
    collapsedTanks.forEach(id => all.delete(id));
    return all;
  }, [currentLab, collapsedTanks]);

  const expandedRacks = useMemo(() => {
    if (!currentLab) return new Set<string>();
    // Convert from `${tankId}-rack-${rackId}` to `${tankId}-${rackId}` format
    const expanded = new Set<string>();
    currentLab.equipment.tanks.forEach(tank => {
      tank.racks.forEach(rack => {
        const modalKey = `${tank.id}-rack-${rack.id}`;
        if (!collapsedRacks.has(modalKey)) {
          expanded.add(`${tank.id}-${rack.id}`);
        }
      });
    });
    return expanded;
  }, [currentLab, collapsedRacks]);

  const toggleTankCollapse = (tankId: string) => {
    setCollapsedTanks(prev => toggleSetItem(prev, tankId));
  };

  const toggleRackCollapse = (rackKey: string) => {
    setCollapsedRacks(prev => toggleSetItem(prev, rackKey));
  };

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
    [rackCountToAdd, addRacksMutation]
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

  const contextValue = useMemo(
    () => ({
      users: dropdownUsers,
      currentUser,
      isDemo,
      demoLimits,
      hasSeededResources,
      getUserInfo,
      isOwnedByCurrentUser,
      canEditResource,
      canManageStorage,
      isResourceLocked,
      onEditTank,
      onDeleteTank: handleDeleteTank,
      onAddRack: handleCreateRack,
      onEditRack,
      onDeleteRack: handleDeleteRack,
      onAddBox: handleAddBox,
      onAssignRack: handleAssignRack,
      onEditRackLabel,
      onEditBox,
      onDeleteBox: handleRemoveBox,
      onAssignBox: handleAssignBox,
      onEditBoxLabel,
    }),
    [
      dropdownUsers,
      currentUser,
      isDemo,
      demoLimits,
      hasSeededResources,
      getUserInfo,
      isOwnedByCurrentUser,
      canEditResource,
      canManageStorage,
      isResourceLocked,
      onEditTank,
      handleDeleteTank,
      handleCreateRack,
      onEditRack,
      handleDeleteRack,
      handleAddBox,
      handleAssignRack,
      onEditRackLabel,
      onEditBox,
      handleRemoveBox,
      handleAssignBox,
      onEditBoxLabel,
    ]
  );

  if (!currentLab) return null;

  const tabs = (
    <Tabs value={viewMode} onChange={v => setViewMode(v as 'tree' | 'byUser')}>
      <Tab id="tree" icon={<ListTree size={14} />}>
        By Location
      </Tab>
      <Tab id="byUser" icon={<UsersRound size={14} />}>
        By User
      </Tab>
    </Tabs>
  );

  const footer = (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink min-w-0">
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

      <Button variant="secondary" onClick={onClose} isLoading={isMutating} loadingText="Saving...">
        Done
      </Button>
    </div>
  );

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        icon={<TankIcon size={24} />}
        title="Storage Manager"
        subtitle="Storage Layout & Assignments"
        size="lg"
        fixedHeight
        animation="slide"
        tabs={tabs}
        tabOrientation="horizontal"
        footer={footer}
        contentClassName="p-3"
        className="!max-w-lg max-h-[80vh]"
        onClose={onClose}
      >
        {viewMode === 'tree' ? (
          <div className="space-y-2">
            {isDemo && hasSeededResources && (
              <AlertBanner variant="demo" spacing="none">
                Demo mode — locked resources cannot be edited or deleted.
              </AlertBanner>
            )}
            {canManageStorage && (
              <div className="flex items-center justify-end gap-2">
                {demoLimitsActive && (
                  <span className="text-xs text-muted-foreground">
                    {nonSeededTankCount}/{demoLimits.maxTanks} tanks
                  </span>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAddNewTank}
                  isLoading={addTankMutation.isPending}
                  loadingText="Adding..."
                  leftIcon={<Plus size={16} />}
                  disabled={!!tankLimitReached}
                >
                  Add Tank
                </Button>
              </div>
            )}

            <StorageManagerContext.Provider value={contextValue}>
              <div className="relative" role="tree" data-tree-id="modal">
                <TreeLinesByLocation
                  expandedTanks={expandedTanks}
                  expandedRacks={expandedRacks}
                  treeId="modal"
                />
                <div className="space-y-1">
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
              </div>
            </StorageManagerContext.Provider>
          </div>
        ) : (
          <AssignmentByUserView
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

      {boxModalData && (
        <BoxEditModal
          isOpen={isBoxModalOpen}
          initialBox={boxModalData.box}
          tankId={boxModalData.tankId}
          rackId={boxModalData.rackId}
          gridTemplates={GRID_TEMPLATES}
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
