import React, { useState } from 'react';

import { NAMING_PATTERNS } from '@odysseus/shared-schemas';
import { Plus, Save, X } from 'lucide-react';

import { useModalStore } from '@app/stores/modalStore';
import { useUsersQuery } from '@domains/admin';
import { useAuthState } from '@domains/authentication/hooks/useAuth';
import {
  useStorageStore,
  useSaveStorageMutation,
  getGridTotalPositions,
  createTankFromDefaults,
  createRackFromDefaults,
  getNextTankNumber,
} from '@domains/storage';
import { useResourceAssignment } from '@domains/storage/hooks/useResourceAssignment';
import { useResourceOwnership } from '@domains/storage/hooks/useResourceOwnership';
import { useResourcePermissions } from '@domains/storage/hooks/useResourcePermissions';
import { logger } from '@shared/infrastructure/logger';
import { notifications } from '@shared/utils/notifications';

import { DeleteConfirmDialog } from '@domains/tubes/ui/components/modals/DeleteConfirmDialog';

import { BoxEditModal } from './BoxEditModal';
import { CustomLabelEditModal } from './CustomLabelEditModal';
import { RackEditModal } from './RackEditModal';
import { StorageManagementContext } from './StorageManagementContext';
import { TankEditModal } from './TankEditModal';
import { TankRow } from './TankRow';

import type {
  TankConfiguration,
  RackConfiguration,
  BoxConfiguration,
  GridConfiguration,
} from '@domains/storage';
import type { AdminUser } from '@odysseus/shared-schemas';

interface StorageManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StorageManagementModal({ isOpen, onClose }: StorageManagementModalProps) {
  // Use proper Zustand selectors for reactive updates
  const currentLab = useStorageStore(state => state.currentLab);

  const updateTank = useStorageStore(state => state.updateTank);
  const addTank = useStorageStore(state => state.addTank);
  const deleteTank = useStorageStore(state => state.deleteTank);
  const updateBox = useStorageStore(state => state.updateBox);
  const updateRack = useStorageStore(state => state.updateRack);
  const addRack = useStorageStore(state => state.addRack);
  const addBoxToRack = useStorageStore(state => state.addBoxToRack);
  const deleteBox = useStorageStore(state => state.deleteBox);
  const deleteRack = useStorageStore(state => state.deleteRack);
  const getAvailableGridTemplates = useStorageStore(state => state.getAvailableGridTemplates);
  // Auth store subscribed for reactive updates
  const modalService = useModalStore();

  // Resource assignment - fetch users and current user
  const { data: users = [] } = useUsersQuery();
  const { user: currentUser } = useAuthState();

  // React Query mutation for server sync
  const saveConfigurationMutation = useSaveStorageMutation();

  // Helper function to save configuration to server
  const saveToServerWithReactQuery = async () => {
    const state = useStorageStore.getState();
    const { systemConfig, currentLab } = state;

    // Explicitly type the mutation parameters
    await saveConfigurationMutation.mutateAsync({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Zustand store state type compatibility with mutation
      systemConfig: systemConfig as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Zustand store state type compatibility with mutation
      currentLab: currentLab as any,
    });
  };

  // Resource assignment hooks
  const { getUserInitials, isOwnedByCurrentUser } = useResourceOwnership(
    users,
    currentUser?.id
  );
  const { canEditResource } = useResourcePermissions(currentUser);
  const { assignRack, assignBox, updateCustomLabel } = useResourceAssignment(
    currentLab.id,
    saveToServerWithReactQuery
  );

  // Wrap assignment operations with notifications
  const handleAssignRack = async (
    tankId: string,
    rackId: string,
    userId: string | undefined
  ): Promise<void> => {
    try {
      await assignRack(tankId, rackId, userId);
      notifications.success(userId ? 'Rack assigned' : 'Rack unassigned');
    } catch (error) {
      logger.error('Failed to assign rack', { error });
      notifications.error('Failed to update assignment');
    }
  };

  const handleAssignBox = async (
    tankId: string,
    rackId: string,
    boxId: string,
    userId: string | undefined
  ): Promise<void> => {
    try {
      await assignBox(tankId, rackId, boxId, userId);
      notifications.success(userId ? 'Box assigned' : 'Box unassigned');
    } catch (error) {
      logger.error('Failed to assign box', { error });
      notifications.error('Failed to update assignment');
    }
  };

  const handleUpdateCustomLabel = async (
    type: 'rack' | 'box',
    tankId: string,
    rackId: string,
    boxId: string | undefined,
    label: string
  ): Promise<void> => {
    try {
      await updateCustomLabel(type, tankId, rackId, boxId, label);
      notifications.success('Custom label updated');
    } catch (error) {
      logger.error('Failed to update custom label', { error });
      notifications.error('Failed to update label');
    }
  };

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
  const [selectedGridTemplate, setSelectedGridTemplate] = useState<GridConfiguration | null>(null);
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
    currentLab.equipment.tanks.forEach(tank => {
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

  if (!isOpen) return null;

  const handleCreateRack = async (tankId: string) => {
    const tank = currentLab.equipment.tanks.find(t => t.id === tankId);
    if (!tank) return;

    // Get count from state (default 1 if not set)
    const count = rackCountToAdd[tankId] || 1;
    const highestRackId = Math.max(0, ...tank.racks.map(r => Number(r.id) || 0));

    const newRackKeys: string[] = [];

    // Create N racks
    for (let i = 0; i < count; i++) {
      const newRackNumber = highestRackId + 1 + i;

      // Create rack from creator - ensures fresh defaults from EQUIPMENT_DEFAULTS
      const newRack = createRackFromDefaults(
        tankId,
        newRackNumber,
        currentLab.equipment.defaultGridConfig
      );

      addRack(currentLab.id, tankId, newRack);

      // Track for bulk collapse
      newRackKeys.push(`${tankId}-rack-${newRack.id}`);
    }

    // Collapse all newly created racks (better UX when adding many racks)
    setCollapsedRacks(prev => new Set([...prev, ...newRackKeys]));

    // Reset count to 1 for next operation
    setRackCountToAdd(prev => ({ ...prev, [tankId]: 1 }));

    // Save to server (SessionManager handles authentication automatically)
    await saveToServerWithReactQuery();
  };

  const handleAddBox = async (tankId: string, rackId: string) => {
    const tank = currentLab.equipment.tanks.find(t => t.id === tankId);
    const rack = tank?.racks.find(r => r.id === rackId);
    if (!rack) return;

    // Get count from state (default 1 if not set)
    const rackKey = `${tankId}-${rackId}`;
    const count = boxCountToAdd[rackKey] || 1;

    // Create N boxes
    for (let i = 0; i < count; i++) {
      const boxIndex = rack.boxes.length + i;
      const nextBoxLetter = NAMING_PATTERNS.BOX.LETTER_NAME(boxIndex);
      const newBox: BoxConfiguration = {
        id: nextBoxLetter,
        name: NAMING_PATTERNS.BOX.DEFAULT_NAME(boxIndex),
        gridConfig: currentLab.equipment.defaultGridConfig,
        position: boxIndex + 1, // Add position property (1-indexed)
      };

      addBoxToRack(currentLab.id, tankId, rackId, newBox);
    }

    // Reset count to 1 for next operation
    setBoxCountToAdd(prev => ({ ...prev, [rackKey]: 1 }));

    // Save to server (SessionManager handles authentication automatically)
    await saveToServerWithReactQuery();
  };

  const handleRemoveBox = async (tankId: string, rackId: string, boxId: string) => {
    modalService.showDeleteConfirm({
      title: 'Delete Box',
      message: `Are you sure you want to delete this box? This will remove all tubes in this box.`,
      onConfirm: async () => {
        try {
          deleteBox(currentLab.id, tankId, rackId, boxId);
          // Save to server (SessionManager handles authentication automatically)
          await saveToServerWithReactQuery();
        } finally {
          // Always close modal after mutation completes (success or error)
          modalService.hideDeleteConfirm();
        }
      },
    });
  };

  const handleUpdateBoxGrid = async (
    tankId: string,
    rackId: string,
    boxId: string,
    gridConfig: GridConfiguration
  ) => {
    updateBox(currentLab.id, tankId, rackId, boxId, { gridConfig });
    setEditingBox(null);

    // Save to server (SessionManager handles authentication automatically)
    await saveToServerWithReactQuery();
  };

  const handleUpdateRack = async (
    tankId: string,
    rackId: string,
    updates: Partial<RackConfiguration>
  ) => {
    updateRack(currentLab.id, tankId, rackId, updates);
    setEditingRack(null);

    // Save to server (SessionManager handles authentication automatically)
    await saveToServerWithReactQuery();
  };

  const handleDeleteRack = async (tankId: string, rackId: string) => {
    const tank = currentLab.equipment.tanks.find(t => t.id === tankId);
    if (!tank || tank.racks.length <= 1) {
      alert('Cannot delete the last rack in a tank');
      return;
    }

    modalService.showDeleteConfirm({
      title: 'Delete Rack',
      message: `Are you sure you want to delete this rack? This will remove all tubes in the rack.`,
      onConfirm: async () => {
        try {
          deleteRack(currentLab.id, tankId, rackId);
          // Save to server (SessionManager handles authentication automatically)
          await saveToServerWithReactQuery();
        } finally {
          // Always close modal after mutation completes (success or error)
          modalService.hideDeleteConfirm();
        }
      },
    });
  };

  const handleAddNewTank = async () => {
    // Get next available tank number
    const newTankNumber = getNextTankNumber(currentLab.equipment.tanks);

    // Create tank from factory - ensures fresh defaults from EQUIPMENT_DEFAULTS
    // No cloning old configuration - prevents data drift
    const newTank = createTankFromDefaults(
      newTankNumber,
      currentLab.equipment.defaultGridConfig,
      1 // Start with 1 rack (user can add more)
    );

    addTank(currentLab.id, newTank);

    // Collapse the new tank's rack by default (cleaner UI)
    const newRackKey = `${newTank.id}-rack-${newTank.racks[0].id}`;
    setCollapsedRacks(prev => new Set([...prev, newRackKey]));

    // Save to server (SessionManager handles authentication automatically)
    await saveToServerWithReactQuery();
  };

  const handleDeleteTank = async (tankId: string) => {
    if (currentLab.equipment.tanks.length <= 1) {
      alert('Cannot delete the last tank in the laboratory');
      return;
    }

    modalService.showDeleteConfirm({
      title: 'Delete Tank',
      message: `Are you sure you want to delete this tank? This will remove all racks, boxes, and tubes in this tank.`,
      onConfirm: async () => {
        try {
          // Update configuration state (remove tank)
          void deleteTank(currentLab.id, tankId);

          // Save to server via configuration update (Clean Architecture)
          await saveToServerWithReactQuery();

          notifications.success('Tank deleted successfully');
        } catch (error) {
          logger.error('Failed to delete tank', { error });
          notifications.error('Failed to delete tank. Please try again.');
        } finally {
          modalService.hideDeleteConfirm();
        }
      },
    });
  };

  const handleUpdateTank = async (tankId: string, updates: Partial<TankConfiguration>) => {
    updateTank(currentLab.id, tankId, updates);
    setEditingTank(null);

    // Save to server (SessionManager handles authentication automatically)
    await saveToServerWithReactQuery();
  };

  // Context value - provides all handlers and data to row components
  const contextValue = {
    users,
    currentUser,
    isOwnedByCurrentUser,
    canEditResource,
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-50 animate-in fade-in duration-[180ms]">
      <div className="bg-white rounded-xl shadow-2xl w-[60%] h-[85%] max-w-2xl max-h-[800px] flex flex-col animate-slide-up-fade">
        <div className="sticky top-0 bg-gradient-to-r from-slate-600 via-slate-400 to-slate-600 px-6 py-4 text-white rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Manage Storage</h2>
              <p className="text-sm text-white/90 mt-0.5">
                Configure liquid nitrogen storage tanks, racks, and boxes
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 p-3 overflow-y-auto">
          <div className="space-y-2">
            {/* Add New Tank Button */}
            <div className="flex justify-end">
              <button
                onClick={() => handleAddNewTank()}
                className="flex items-center gap-2 bg-slate-600 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 font-medium text-sm"
              >
                <Plus size={16} />
                Add New Tank
              </button>
            </div>

            {/* Tanks List */}
            <StorageManagementContext.Provider value={contextValue}>
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
            </StorageManagementContext.Provider>
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

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmDialog
          isOpen={modalService.deleteConfirm.isOpen}
          title={modalService.deleteConfirm.title}
          message={modalService.deleteConfirm.message}
          onConfirm={modalService.deleteConfirm.onConfirm}
          onCancel={modalService.deleteConfirm.onCancel}
        />
      </div>
    </div>
  );
}
