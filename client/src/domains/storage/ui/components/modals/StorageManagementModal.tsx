import React, { useState, useEffect, useMemo } from 'react';

import { NAMING_PATTERNS, sortByName } from '@odysseus/shared-schemas';
import { Plus, X, Save, RefreshCw, ListTree, UsersRound } from 'lucide-react';

import { useModalStore } from '@app/stores/modalStore';
import { useAuthState } from '@domains/authentication/hooks/useAuth';
import {
  useStorageData,
  useSaveStorageMutation,
  useUpdateResourceLabelMutation,
  createTankFromDefaults,
  createRackFromDefaults,
  getNextTankNumber,
  extractAssignedUserIds,
  extractLabelChanges,
} from '@domains/storage';
import { useResourceOwnership } from '@domains/storage/hooks/useResourceOwnership';
import { useResourcePermissions } from '@domains/storage/hooks/useResourcePermissions';
import {
  addTankToLab,
  updateTankInLab,
  deleteTankFromLab,
  addRackToLab,
  updateRackInLab,
  deleteRackFromLab,
  addBoxToLab,
  updateBoxInLab,
  deleteBoxFromLab,
  assignRackInLab,
  assignBoxInLab,
  updateCustomLabelInLab,
} from '@domains/storage/utils/storageLocalUpdates';
import { useActiveUsersQuery, useUserLookupQuery } from '@domains/users';
import { useFocusTrap } from '@shared/hooks/useFocusTrap';
import { logger } from '@shared/infrastructure/logger';
import { TankIcon } from '@shared/ui/components/icons';
import { ModalPortal } from '@shared/ui/components/ModalPortal';
import { notifications } from '@shared/utils/notifications';

import { AssignmentsByUserView } from './AssignmentsByUserView';
import { BoxEditModal } from './BoxEditModal';
import { CustomLabelEditModal } from './CustomLabelEditModal';
import { RackEditModal } from './RackEditModal';
import { StorageManagementContext } from './StorageManagementContext';
import { TankEditModal } from './TankEditModal';
import { TankRow } from './TankRow';

import type {
  LabConfiguration,
  TankConfiguration,
  RackConfiguration,
  BoxConfiguration,
  GridConfiguration,
} from '@domains/storage';

interface StorageManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StorageManagementModal({ isOpen, onClose }: StorageManagementModalProps) {
  // Server state from React Query (via useStorageData)
  const { currentLab, systemConfig, getAvailableGridTemplates } = useStorageData();
  const modalService = useModalStore();
  const { user: currentUser } = useAuthState();

  // React Query mutations for server sync
  const saveConfigurationMutation = useSaveStorageMutation();
  const updateLabelMutation = useUpdateResourceLabelMutation();

  // ========== LOCAL STATE PATTERN ==========
  // Draft state for editing (not committed until Save)
  const [localLab, setLocalLab] = useState<LabConfiguration | null>(null);
  const [originalLab, setOriginalLab] = useState<LabConfiguration | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // All active users for dropdown (public endpoint, works for everyone)
  const isAdmin = currentUser?.role === 'admin';
  const { data: activeUsers = [] } = useActiveUsersQuery();

  // Assigned users for display - used to resolve names for users who may no longer be active
  const assignedUserIds = useMemo(() => extractAssignedUserIds(localLab), [localLab]);
  const { data: assignedUsers = [] } = useUserLookupQuery(assignedUserIds);

  // For dropdowns: use all active users, sorted by name
  const dropdownUsers = useMemo(() => sortByName(activeUsers), [activeUsers]);

  // Merge for display - active users plus any assigned users not in active list (e.g., deactivated)
  const displayUsers = useMemo(() => {
    const userMap = new Map(activeUsers.map(u => [u.id, u]));
    // Add any assigned users that aren't in the active list (e.g., deactivated users)
    assignedUsers.forEach(u => {
      if (!userMap.has(u.id)) {
        userMap.set(u.id, u);
      }
    });
    return Array.from(userMap.values());
  }, [activeUsers, assignedUsers]);

  // View mode: tree (default) or byUser (assignment summary)
  const [viewMode, setViewMode] = useState<'tree' | 'byUser'>('tree');

  // Clone configuration when modal opens
  useEffect(() => {
    if (isOpen && currentLab && !localLab) {
      const cloned = structuredClone(currentLab);
      setLocalLab(cloned);
      setOriginalLab(structuredClone(currentLab));
    } else if (!isOpen && localLab) {
      // Reset when modal closes
      setLocalLab(null);
      setOriginalLab(null);
    }
  }, [isOpen, currentLab, localLab]);

  // Focus trap - only active when modal is fully ready (localLab populated)
  const trapRef = useFocusTrap({
    isOpen: isOpen && !!localLab,
    restoreFocus: true,
    autoFocusFirstInput: false,
    initialFocusDelay: 100,
  });

  // Check for unsaved changes
  const hasChanges =
    localLab && originalLab ? JSON.stringify(localLab) !== JSON.stringify(originalLab) : false;

  // ========== SAVE / CANCEL HANDLERS ==========
  const handleSave = async () => {
    if (!localLab || !systemConfig || !originalLab) return;

    setIsSaving(true);
    try {
      if (isAdmin) {
        // Admin: Full configuration save (can change structure, assignments, labels)
        const updatedAvailableLabs = systemConfig.availableLabs.map(lab =>
          lab.id === localLab.id ? localLab : lab
        );

        await saveConfigurationMutation.mutateAsync({
          systemConfig: { ...systemConfig, availableLabs: updatedAvailableLabs },
          currentLab: localLab,
        });
      } else {
        // Non-admin: Only save label changes via dedicated endpoint
        const labelChanges = extractLabelChanges(originalLab, localLab);

        if (labelChanges.length === 0) {
          notifications.info('No changes to save');
          onClose();
          return;
        }

        // Save each label change via the fine-grained endpoint
        for (const change of labelChanges) {
          await updateLabelMutation.mutateAsync({
            resourceType: change.type,
            tankId: change.tankId,
            rackId: change.rackId,
            boxId: change.boxId,
            customLabel: change.customLabel || undefined,
          });
        }
      }

      // Update original to reflect saved state
      setOriginalLab(structuredClone(localLab));
      notifications.success('Storage configuration saved successfully');
      onClose();
    } catch (error) {
      logger.error('Failed to save storage configuration', { error });
      notifications.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      modalService.showUnsavedConfirm({
        onConfirm: () => {
          modalService.hideUnsavedConfirm();
          onClose();
        },
      });
    } else {
      onClose();
    }
  };

  // ========== RESOURCE HOOKS ==========
  const { getUserInfo, isOwnedByCurrentUser } = useResourceOwnership(displayUsers, currentUser?.id);
  const { canEditResource, canManageStorage } = useResourcePermissions(currentUser);

  // ========== UI STATE ==========
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
    // Start with all racks collapsed
    const allRackKeys = new Set<string>();
    currentLab?.equipment.tanks.forEach(tank => {
      tank.racks.forEach(rack => {
        allRackKeys.add(`${tank.id}-rack-${rack.id}`);
      });
    });
    return allRackKeys;
  });

  // Bulk add counts (per tank/rack)
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

  // ========== LOCAL STATE HANDLERS ==========
  // All handlers now update localLab instead of store + auto-save

  const handleAssignRack = (tankId: string, rackId: string, userId: string | undefined) => {
    if (!localLab) return;
    setLocalLab(assignRackInLab(localLab, tankId, rackId, userId));
  };

  const handleAssignBox = (
    tankId: string,
    rackId: string,
    boxId: string,
    userId: string | null | undefined
  ) => {
    if (!localLab) return;
    setLocalLab(assignBoxInLab(localLab, tankId, rackId, boxId, userId));
  };

  const handleUpdateCustomLabel = (
    type: 'rack' | 'box',
    tankId: string,
    rackId: string,
    boxId: string | undefined,
    label: string
  ) => {
    if (!localLab) return;

    // Update local draft state - saves with everything else when user clicks Save
    const updatedLab = updateCustomLabelInLab(localLab, type, tankId, rackId, boxId, label);
    setLocalLab(updatedLab);
    setEditingLabel(null);
  };

  const handleCreateRack = (tankId: string) => {
    if (!localLab) return;

    const tank = localLab.equipment.tanks.find(t => t.id === tankId);
    if (!tank) return;

    // Get count from state (default 1 if not set)
    const count = rackCountToAdd[tankId] || 1;
    const highestRackId = Math.max(0, ...tank.racks.map(r => Number(r.id) || 0));

    const newRackKeys: string[] = [];
    let updatedLab = localLab;

    // Create N racks
    for (let i = 0; i < count; i++) {
      const newRackNumber = highestRackId + 1 + i;

      const newRack = createRackFromDefaults(
        tankId,
        newRackNumber,
        localLab.equipment.defaultGridConfig
      );

      updatedLab = addRackToLab(updatedLab, tankId, newRack);
      newRackKeys.push(`${tankId}-rack-${newRack.id}`);
    }

    setLocalLab(updatedLab);

    // Collapse all newly created racks
    setCollapsedRacks(prev => new Set([...prev, ...newRackKeys]));

    // Reset count to 1
    setRackCountToAdd(prev => ({ ...prev, [tankId]: 1 }));
  };

  const handleAddBox = (tankId: string, rackId: string) => {
    if (!localLab) return;

    const tank = localLab.equipment.tanks.find(t => t.id === tankId);
    const rack = tank?.racks.find(r => r.id === rackId);
    if (!rack) return;

    const rackKey = `${tankId}-${rackId}`;
    const count = boxCountToAdd[rackKey] || 1;

    let updatedLab = localLab;

    for (let i = 0; i < count; i++) {
      const boxIndex = rack.boxes.length + i;
      const nextBoxLetter = NAMING_PATTERNS.BOX.LETTER_NAME(boxIndex);
      const newBox: BoxConfiguration = {
        id: nextBoxLetter,
        name: NAMING_PATTERNS.BOX.DEFAULT_NAME(boxIndex),
        gridConfig: localLab.equipment.defaultGridConfig,
        position: boxIndex + 1,
      };

      updatedLab = addBoxToLab(updatedLab, tankId, rackId, newBox);
    }

    setLocalLab(updatedLab);
    setBoxCountToAdd(prev => ({ ...prev, [rackKey]: 1 }));
  };

  const handleRemoveBox = (tankId: string, rackId: string, boxId: string) => {
    modalService.showDeleteConfirm({
      title: 'Delete Box',
      message: `Are you sure you want to delete this box? This will remove all tubes in this box.`,
      onConfirm: () => {
        if (!localLab) return;
        setLocalLab(deleteBoxFromLab(localLab, tankId, rackId, boxId));
        modalService.hideDeleteConfirm();
      },
    });
  };

  const handleUpdateBoxGrid = (
    tankId: string,
    rackId: string,
    boxId: string,
    gridConfig: GridConfiguration
  ) => {
    if (!localLab) return;
    setLocalLab(updateBoxInLab(localLab, tankId, rackId, boxId, { gridConfig }));
    setEditingBox(null);
  };

  const handleUpdateRack = (
    tankId: string,
    rackId: string,
    updates: Partial<RackConfiguration>
  ) => {
    if (!localLab) return;
    setLocalLab(updateRackInLab(localLab, tankId, rackId, updates));
    setEditingRack(null);
  };

  const handleDeleteRack = (tankId: string, rackId: string) => {
    if (!localLab) return;

    const tank = localLab.equipment.tanks.find(t => t.id === tankId);
    if (!tank || tank.racks.length <= 1) {
      alert('Cannot delete the last rack in a tank');
      return;
    }

    modalService.showDeleteConfirm({
      title: 'Delete Rack',
      message: `Are you sure you want to delete this rack? This will remove all tubes in the rack.`,
      onConfirm: () => {
        if (!localLab) return;
        setLocalLab(deleteRackFromLab(localLab, tankId, rackId));
        modalService.hideDeleteConfirm();
      },
    });
  };

  const handleAddNewTank = () => {
    if (!localLab) return;

    const newTankNumber = getNextTankNumber(localLab.equipment.tanks);

    const newTank = createTankFromDefaults(newTankNumber, localLab.equipment.defaultGridConfig, 1);

    setLocalLab(addTankToLab(localLab, newTank));

    // Collapse the new tank's rack by default
    const newRackKey = `${newTank.id}-rack-${newTank.racks[0].id}`;
    setCollapsedRacks(prev => new Set([...prev, newRackKey]));
  };

  const handleDeleteTank = (tankId: string) => {
    if (!localLab) return;

    if (localLab.equipment.tanks.length <= 1) {
      alert('Cannot delete the last tank in the laboratory');
      return;
    }

    modalService.showDeleteConfirm({
      title: 'Delete Tank',
      message: `Are you sure you want to delete this tank? This will remove all racks, boxes, and tubes in this tank.`,
      onConfirm: () => {
        if (!localLab) return;
        setLocalLab(deleteTankFromLab(localLab, tankId));
        modalService.hideDeleteConfirm();
      },
    });
  };

  const handleUpdateTank = (tankId: string, updates: Partial<TankConfiguration>) => {
    if (!localLab) return;
    setLocalLab(updateTankInLab(localLab, tankId, updates));
    setEditingTank(null);
  };

  // ========== BULK ASSIGNMENT HANDLERS ==========
  const handleBulkUnassign = (userId: string) => {
    if (!localLab) return;

    // Count resources to show in confirmation
    let rackCount = 0;
    let boxCount = 0;
    for (const tank of localLab.equipment.tanks) {
      for (const rack of tank.racks) {
        if (rack.assignedUserId === userId) rackCount++;
        for (const box of rack.boxes) {
          // Count explicitly assigned boxes and inherited boxes
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
        if (!localLab) return;

        let updatedLab = localLab;

        for (const tank of localLab.equipment.tanks) {
          for (const rack of tank.racks) {
            // Unassign rack if owned by this user
            if (rack.assignedUserId === userId) {
              updatedLab = assignRackInLab(updatedLab, tank.id, rack.id, undefined);
            }
            // Unassign boxes explicitly assigned to this user
            for (const box of rack.boxes) {
              if (box.assignedUserId === userId) {
                updatedLab = assignBoxInLab(updatedLab, tank.id, rack.id, box.id, null);
              }
            }
          }
        }

        setLocalLab(updatedLab);
        modalService.hideDeleteConfirm();
      },
    });
  };

  const handleBulkReassign = (fromUserId: string, toUserId: string) => {
    if (!localLab) return;

    // Count resources to show in confirmation
    let rackCount = 0;
    let boxCount = 0;
    for (const tank of localLab.equipment.tanks) {
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
        if (!localLab) return;

        let updatedLab = localLab;

        for (const tank of localLab.equipment.tanks) {
          for (const rack of tank.racks) {
            // Reassign rack if owned by fromUser
            if (rack.assignedUserId === fromUserId) {
              updatedLab = assignRackInLab(updatedLab, tank.id, rack.id, toUserId);
            }
            // Reassign boxes explicitly assigned to fromUser
            for (const box of rack.boxes) {
              if (box.assignedUserId === fromUserId) {
                updatedLab = assignBoxInLab(updatedLab, tank.id, rack.id, box.id, toUserId);
              }
            }
          }
        }

        setLocalLab(updatedLab);
        modalService.hideDeleteConfirm();
      },
    });
  };

  // ========== RENDER ==========
  if (!isOpen || !localLab) return null;

  // Context value - provides all handlers and data to row components
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
                  <h2 className="text-lg font-bold text-slate-800">Manage Storage</h2>
                  <p className="text-slate-500 text-xs">Storage Layout & Assignments</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={isSaving}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50 focus-ring-default"
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
                {/* Add New Tank Button (Admin Only) */}
                {canManageStorage && (
                  <div className="flex justify-end">
                    <button
                      onClick={handleAddNewTank}
                      className="flex items-center gap-2 bg-slate-600 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 font-medium text-sm focus-ring-default"
                    >
                      <Plus size={16} />
                      Add New Tank
                    </button>
                  </div>
                )}

                {/* Tanks List */}
                <StorageManagementContext.Provider value={contextValue}>
                  <div className="space-y-1.5">
                    {localLab.equipment.tanks.map(tank => (
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
                        canDeleteTank={localLab.equipment.tanks.length > 1}
                      />
                    ))}
                  </div>
                </StorageManagementContext.Provider>
              </div>
            ) : (
              <AssignmentsByUserView
                lab={localLab}
                getUserInfo={getUserInfo}
                currentUserId={currentUser?.id}
                canManageStorage={canManageStorage}
                users={dropdownUsers}
                onBulkUnassign={handleBulkUnassign}
                onBulkReassign={handleBulkReassign}
              />
            )}
          </div>

          {/* Footer with Legend and Save/Cancel */}
          <div className="border-t border-gray-200 px-4 py-2.5 bg-white flex-shrink-0">
            <div className="flex items-center justify-between gap-4">
              {/* Ownership Legend - matches left border accent style */}
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

              {/* Save/Cancel Buttons */}
              <div className="flex items-center space-x-2 flex-shrink-0">
                <button
                  onClick={handleClose}
                  className="btn btn-secondary px-6"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !hasChanges}
                  className="btn btn-primary flex items-center space-x-2 text-sm px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                  {hasChanges && !isSaving && (
                    <span className="w-2 h-2 rounded-full bg-amber-500" title="Unsaved changes" />
                  )}
                </button>
              </div>
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
              currentLab={localLab}
              onSave={handleUpdateCustomLabel}
              onClose={() => setEditingLabel(null)}
            />
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
