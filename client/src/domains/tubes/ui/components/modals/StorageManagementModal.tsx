import React, { useState } from 'react';

import { NAMING_PATTERNS, formatResourceDisplayName } from '@odysseus/shared-schemas';
import {
  Plus,
  Edit3,
  Trash2,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  Tag,
  UsersRound,
} from 'lucide-react';
import Select from 'react-select';

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
import { logger } from '@shared/infrastructure/logger';
import { TankIcon, RackIcon, BoxIcon } from '@shared/ui/components/icons';
import { notifications } from '@shared/utils/notifications';

import { DeleteConfirmDialog } from './DeleteConfirmDialog';

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

  // Resource assignment helper functions
  const getUserInitials = (userId: string): string => {
    const user = users.find((u: AdminUser) => u.id === userId);
    if (!user) return '?';

    const first = user.username.charAt(0);
    const last = user.username.charAt(1) || '';
    return (first + last).toUpperCase();
  };

  const canEditResource = (
    resource: RackConfiguration | BoxConfiguration,
    parentRack?: RackConfiguration
  ): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    if (resource.assignedUserId === currentUser.id) return true;

    // Cascade: rack owner can edit unassigned boxes
    if (parentRack && !resource.assignedUserId && parentRack.assignedUserId === currentUser.id) {
      return true;
    }

    return false;
  };

  const handleAssignRack = async (
    tankId: string,
    rackId: string,
    userId: string | undefined
  ): Promise<void> => {
    try {
      updateRack(currentLab.id, tankId, rackId, {
        assignedUserId: userId,
        customLabel: userId ? undefined : '', // Clear label when unassigning
      });

      await saveToServerWithReactQuery();
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
      updateBox(currentLab.id, tankId, rackId, boxId, {
        assignedUserId: userId,
        customLabel: userId ? undefined : '', // Clear label when unassigning
      });

      await saveToServerWithReactQuery();
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
      if (type === 'rack') {
        updateRack(currentLab.id, tankId, rackId, {
          customLabel: label.trim() || undefined,
        });
      } else if (boxId) {
        updateBox(currentLab.id, tankId, rackId, boxId, {
          customLabel: label.trim() || undefined,
        });
      }

      await saveToServerWithReactQuery();
      notifications.success('Custom label updated');
    } catch (error) {
      logger.error('Failed to update custom label', { error });
      notifications.error('Failed to update label');
    }
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
            <div className="space-y-1.5">
              {currentLab.equipment.tanks.map(tank => (
                <div key={tank.id} className="border border-gray-300 rounded-lg bg-white">
                  {/* Tank Header - Compact horizontal spacing */}
                  <div className="bg-slate-600 px-2 py-1.5 border-b border-slate-700 rounded-t-lg">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleTankCollapse(tank.id)}
                        className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer hover:bg-slate-700 -mx-1 px-1 py-1 rounded text-left"
                        aria-expanded={!collapsedTanks.has(tank.id)}
                        aria-controls={`tank-content-${tank.id}`}
                        aria-label={`${collapsedTanks.has(tank.id) ? 'Expand' : 'Collapse'} tank ${tank.name}`}
                      >
                        <div className="text-slate-200 flex-shrink-0" aria-hidden="true">
                          {collapsedTanks.has(tank.id) ? (
                            <ChevronRight size={16} />
                          ) : (
                            <ChevronDown size={16} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 flex items-center gap-1.5">
                          <TankIcon
                            className="text-white flex-shrink-0"
                            size={24}
                            aria-hidden="true"
                          />
                          <h3 className="text-base font-semibold text-white truncate min-w-[80px]">
                            {tank.name}
                          </h3>
                          <span className="text-xs px-2 py-1 bg-slate-700 rounded text-white flex items-center gap-1.5">
                            <span>{tank.location}</span>
                            <span>•</span>
                            <span>
                              {tank.racks.length} {tank.racks.length === 1 ? 'rack' : 'racks'}
                            </span>
                          </span>
                        </div>
                      </button>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button
                          onClick={() => setEditingTank(tank)}
                          className="text-slate-200 hover:bg-slate-700 p-1 rounded"
                          title="Edit tank"
                        >
                          <Edit3 size={16} />
                        </button>
                        {currentLab.equipment.tanks.length > 1 && (
                          <button
                            onClick={() => handleDeleteTank(tank.id)}
                            className="text-red-300 hover:bg-red-900 p-1 rounded"
                            title="Delete tank"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tank content - collapsible */}
                  {!collapsedTanks.has(tank.id) && (
                    <div id={`tank-content-${tank.id}`} className="p-2">
                      <div className="space-y-1.5">
                        {tank.racks.map((rack, rackIndex) => {
                          const rackKey = `${tank.id}-rack-${rack.id}`;
                          const isOwnedByCurrentUser =
                            currentUser && rack.assignedUserId === currentUser.id;
                          const isUnassigned = !rack.assignedUserId;
                          const bgClass = isOwnedByCurrentUser
                            ? 'bg-blue-100'
                            : isUnassigned
                              ? 'bg-yellow-50'
                              : 'bg-slate-400';

                          return (
                            <div key={rack.id} className="ml-2">
                              {/* Rack Row - with ownership indication */}
                              <div
                                className={`flex items-center gap-1.5 py-1 px-1.5 ${bgClass} rounded border border-slate-500`}
                              >
                                <span className="text-slate-600 font-mono text-sm flex-shrink-0">
                                  {rackIndex === tank.racks.length - 1 ? '└' : '├'}
                                </span>

                                {/* Ownership Badge */}
                                <div
                                  className="flex-shrink-0"
                                  title={
                                    rack.assignedUserId
                                      ? `Owned by ${users.find((u: AdminUser) => u.id === rack.assignedUserId)?.username ?? 'Unknown'}`
                                      : 'Unassigned'
                                  }
                                >
                                  {rack.assignedUserId ? (
                                    <div
                                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isOwnedByCurrentUser ? 'bg-blue-500 text-white' : 'bg-gray-400 text-white'}`}
                                    >
                                      {getUserInitials(rack.assignedUserId)}
                                    </div>
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center">
                                      <UsersRound size={14} className="text-yellow-800" />
                                    </div>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => toggleRackCollapse(rackKey)}
                                  className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer hover:bg-slate-500 -mx-1 px-1 py-0.5 rounded text-left"
                                  aria-expanded={!collapsedRacks.has(rackKey)}
                                  aria-controls={`rack-content-${rackKey}`}
                                  aria-label={`${collapsedRacks.has(rackKey) ? 'Expand' : 'Collapse'} ${rack.name}`}
                                >
                                  <div className="text-slate-700 flex-shrink-0" aria-hidden="true">
                                    {collapsedRacks.has(rackKey) ? (
                                      <ChevronRight size={12} />
                                    ) : (
                                      <ChevronDown size={12} />
                                    )}
                                  </div>
                                  <RackIcon
                                    className="text-slate-700 flex-shrink-0"
                                    size={18}
                                    aria-hidden="true"
                                  />
                                  <span className="font-medium text-slate-800 text-sm inline-block min-w-[60px]">
                                    {formatResourceDisplayName(rack.name, rack.customLabel)}
                                  </span>
                                  <span className="text-xs px-2 py-0.5 bg-slate-500 rounded text-white">
                                    {rack.boxes.length} {rack.boxes.length === 1 ? 'box' : 'boxes'}
                                  </span>
                                </button>

                                {/* Assignment Dropdown (admin only) */}
                                {currentUser?.role === 'admin' && (
                                  <div className="w-40 flex-shrink-0">
                                    <Select
                                      value={
                                        rack.assignedUserId
                                          ? {
                                              value: rack.assignedUserId,
                                              label:
                                                users.find(
                                                  (u: AdminUser) => u.id === rack.assignedUserId
                                                )?.username ?? 'Unknown',
                                            }
                                          : null
                                      }
                                      onChange={option =>
                                        void handleAssignRack(tank.id, rack.id, option?.value)
                                      }
                                      options={users
                                        .filter((u: AdminUser) => u.isActive)
                                        .map((u: AdminUser) => ({
                                          value: u.id,
                                          label: u.username,
                                        }))}
                                      isClearable
                                      placeholder="Assign..."
                                      className="text-xs"
                                      styles={{
                                        control: base => ({
                                          ...base,
                                          minHeight: '28px',
                                          fontSize: '12px',
                                        }),
                                        menu: base => ({ ...base, fontSize: '12px' }),
                                      }}
                                    />
                                  </div>
                                )}

                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {/* Custom Label Button */}
                                  {canEditResource(rack) && (
                                    <button
                                      onClick={() =>
                                        setEditingLabel({
                                          type: 'rack',
                                          tankId: tank.id,
                                          rackId: rack.id,
                                          currentLabel: rack.customLabel ?? '',
                                        })
                                      }
                                      className="text-slate-700 hover:bg-slate-500 p-1 rounded"
                                      title="Edit custom label"
                                    >
                                      <Tag size={14} />
                                    </button>
                                  )}

                                  <button
                                    onClick={() => setEditingRack({ tankId: tank.id, rack })}
                                    className="text-slate-700 hover:bg-slate-500 p-1 rounded"
                                    title="Edit rack"
                                  >
                                    <Edit3 size={14} />
                                  </button>
                                  {tank.racks.length > 1 && (
                                    <button
                                      onClick={() => handleDeleteRack(tank.id, rack.id)}
                                      className="text-red-700 hover:bg-red-900 p-1 rounded"
                                      title="Delete rack"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Boxes under this rack - collapsible */}
                              {!collapsedRacks.has(rackKey) && (
                                <div
                                  id={`rack-content-${rackKey}`}
                                  className="ml-5 mt-0.5 space-y-0.5"
                                >
                                  {rack.boxes.map((box, boxIndex) => {
                                    // Ownership cascade: box owner or rack owner (if box unassigned)
                                    const effectiveOwnerId =
                                      box.assignedUserId ?? rack.assignedUserId;
                                    const isOwnedByCurrentUser =
                                      currentUser && effectiveOwnerId === currentUser.id;
                                    const isUnassigned = !effectiveOwnerId;
                                    const boxBgClass = isOwnedByCurrentUser
                                      ? 'bg-blue-50'
                                      : isUnassigned
                                        ? 'bg-yellow-50'
                                        : 'bg-slate-200';

                                    return (
                                      <div
                                        key={box.id}
                                        className={`flex items-center gap-1.5 py-0.5 px-1.5 ${boxBgClass} rounded border border-slate-300`}
                                      >
                                        <span className="text-slate-400 font-mono text-xs flex-shrink-0">
                                          {boxIndex === rack.boxes.length - 1 ? '└' : '├'}
                                        </span>

                                        {/* Ownership Badge */}
                                        <div
                                          className="flex-shrink-0"
                                          title={
                                            effectiveOwnerId
                                              ? `Owned by ${users.find((u: AdminUser) => u.id === effectiveOwnerId)?.username ?? 'Unknown'}`
                                              : 'Unassigned'
                                          }
                                        >
                                          {effectiveOwnerId ? (
                                            <div
                                              className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${isOwnedByCurrentUser ? 'bg-blue-500 text-white' : 'bg-gray-400 text-white'}`}
                                            >
                                              {getUserInitials(effectiveOwnerId)}
                                            </div>
                                          ) : (
                                            <div className="w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center">
                                              <UsersRound size={12} className="text-yellow-800" />
                                            </div>
                                          )}
                                        </div>

                                        <BoxIcon
                                          className="text-slate-700 flex-shrink-0"
                                          size={16}
                                        />
                                        <span className="font-medium text-slate-800 text-xs inline-block min-w-[60px]">
                                          {formatResourceDisplayName(box.name, box.customLabel)}
                                        </span>
                                        <span className="text-xs px-2 py-1 bg-slate-300 rounded text-slate-700">
                                          {box.gridConfig.rows}×{box.gridConfig.cols}
                                        </span>

                                        {/* Assignment Dropdown (admin only) */}
                                        {currentUser?.role === 'admin' && (
                                          <div className="w-32 flex-shrink-0">
                                            <Select
                                              value={
                                                box.assignedUserId
                                                  ? {
                                                      value: box.assignedUserId,
                                                      label:
                                                        users.find(
                                                          (u: AdminUser) =>
                                                            u.id === box.assignedUserId
                                                        )?.username ?? 'Unknown',
                                                    }
                                                  : null
                                              }
                                              onChange={option =>
                                                void handleAssignBox(
                                                  tank.id,
                                                  rack.id,
                                                  box.id,
                                                  option?.value
                                                )
                                              }
                                              options={users
                                                .filter((u: AdminUser) => u.isActive)
                                                .map((u: AdminUser) => ({
                                                  value: u.id,
                                                  label: u.username,
                                                }))}
                                              isClearable
                                              placeholder="Assign..."
                                              className="text-xs"
                                              styles={{
                                                control: base => ({
                                                  ...base,
                                                  minHeight: '24px',
                                                  fontSize: '11px',
                                                }),
                                                menu: base => ({ ...base, fontSize: '11px' }),
                                              }}
                                            />
                                          </div>
                                        )}

                                        <div className="flex-1"></div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                          {/* Custom Label Button */}
                                          {canEditResource(box, rack) && (
                                            <button
                                              onClick={() =>
                                                setEditingLabel({
                                                  type: 'box',
                                                  tankId: tank.id,
                                                  rackId: rack.id,
                                                  boxId: box.id,
                                                  currentLabel: box.customLabel ?? '',
                                                })
                                              }
                                              className="text-slate-700 hover:bg-slate-300 p-1 rounded"
                                              title="Edit custom label"
                                            >
                                              <Tag size={12} />
                                            </button>
                                          )}

                                          <button
                                            onClick={() =>
                                              setEditingBox({
                                                tankId: tank.id,
                                                rackId: rack.id,
                                                box,
                                              })
                                            }
                                            className="text-slate-700 hover:bg-slate-300 p-1 rounded"
                                            title="Change grid size"
                                          >
                                            <Edit3 size={12} />
                                          </button>
                                          {rack.boxes.length > 1 && (
                                            <button
                                              onClick={() =>
                                                handleRemoveBox(tank.id, rack.id, box.id)
                                              }
                                              className="text-red-700 hover:bg-red-200 p-1 rounded"
                                              title="Remove this box"
                                            >
                                              <Trash2 size={12} />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {/* Add Box Button with Bulk Input */}
                                  <div className="flex items-center gap-1.5 py-0.5 px-1.5">
                                    <span className="text-slate-400 font-mono text-xs">└</span>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="number"
                                        min="1"
                                        max="26"
                                        value={boxCountToAdd[`${tank.id}-${rack.id}`] || 1}
                                        onChange={e =>
                                          setBoxCountToAdd(prev => ({
                                            ...prev,
                                            [`${tank.id}-${rack.id}`]: Math.max(
                                              1,
                                              Math.min(26, parseInt(e.target.value) || 1)
                                            ),
                                          }))
                                        }
                                        className="input-number-sm w-14 px-2 py-0.5"
                                        title="Number of boxes to add"
                                      />
                                      <button
                                        onClick={() => handleAddBox(tank.id, rack.id)}
                                        className="flex items-center gap-1 bg-slate-200 text-slate-800 px-2 py-1 rounded hover:bg-slate-300 text-xs"
                                      >
                                        <Plus size={12} />
                                        Add{' '}
                                        {(boxCountToAdd[`${tank.id}-${rack.id}`] || 1) > 1
                                          ? 'Boxes'
                                          : 'Box'}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Add Rack Button with Bulk Input */}
                        <div className="ml-2 mt-1">
                          <div className="flex items-center gap-1.5 py-1 px-1.5">
                            <span className="text-gray-400 font-mono text-xs">└</span>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="1"
                                max="50"
                                value={rackCountToAdd[tank.id] || 1}
                                onChange={e =>
                                  setRackCountToAdd(prev => ({
                                    ...prev,
                                    [tank.id]: Math.max(
                                      1,
                                      Math.min(50, parseInt(e.target.value) || 1)
                                    ),
                                  }))
                                }
                                className="input-number-sm w-14 px-2 py-1 text-sm"
                                title="Number of racks to add"
                              />
                              <button
                                onClick={() => handleCreateRack(tank.id)}
                                className="flex items-center gap-1 bg-slate-400 text-white px-2 py-1 rounded hover:bg-slate-500 text-sm"
                              >
                                <Plus size={12} />
                                Add {(rackCountToAdd[tank.id] || 1) > 1 ? 'Racks' : 'Rack'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {editingBox && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-60"
            role="presentation"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const template = selectedGridTemplate ?? editingBox.box.gridConfig;
                void (async () => {
                  try {
                    await handleUpdateBoxGrid(
                      editingBox.tankId,
                      editingBox.rackId,
                      editingBox.box.id,
                      template
                    );
                  } catch (error) {
                    logger.error('Failed to update box grid', { error });
                    notifications.error('Failed to save changes. Please try again.');
                  }
                })();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setEditingBox(null);
              }
            }}
          >
            <div
              className="bg-white rounded-lg p-6 max-w-md w-full m-4"
              role="dialog"
              aria-labelledby="box-edit-title"
              aria-modal="true"
            >
              <h3 id="box-edit-title" className="text-lg font-semibold mb-4">
                Configure {editingBox.box.name} Grid Size
              </h3>

              <div className="space-y-4">
                <div>
                  <label htmlFor="box-grid-template" className="block text-sm font-medium mb-2">
                    Select Grid Template
                  </label>
                  <select
                    id="box-grid-template"
                    className="w-full border rounded-lg px-3 py-2"
                    value={`${editingBox.box.gridConfig.rows}x${editingBox.box.gridConfig.cols}`}
                    onChange={e => {
                      const [rows, cols] = e.target.value.split('x').map(Number);
                      const template = gridTemplates.find(t => t.rows === rows && t.cols === cols);
                      if (template) setSelectedGridTemplate(template);
                    }}
                    aria-label="Select grid template for box"
                  >
                    {gridTemplates.map(template => (
                      <option
                        key={`${template.rows}x${template.cols}`}
                        value={`${template.rows}x${template.cols}`}
                      >
                        {template.rows}×{template.cols} Grid
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-3">
                  <button onClick={() => setEditingBox(null)} className="btn-cancel">
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const template = selectedGridTemplate ?? editingBox.box.gridConfig;
                      void (async () => {
                        try {
                          await handleUpdateBoxGrid(
                            editingBox.tankId,
                            editingBox.rackId,
                            editingBox.box.id,
                            template
                          );
                        } catch (error) {
                          logger.error('Failed to update box grid', { error });
                          notifications.error('Failed to save changes. Please try again.');
                        }
                      })();
                    }}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Save size={16} />
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rack Editing Modal */}
        {editingRack && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-60"
            role="presentation"
            onKeyDown={e => {
              if (e.key === 'Enter' && editingRack.rack.name.trim()) {
                e.preventDefault();
                void (async () => {
                  try {
                    await handleUpdateRack(editingRack.tankId, editingRack.rack.id, {
                      name: editingRack.rack.name,
                      location: editingRack.rack.location,
                      description: editingRack.rack.description,
                      isActive: editingRack.rack.isActive,
                    });
                  } catch (error) {
                    logger.error('Failed to update rack', { error });
                    notifications.error('Failed to save changes. Please try again.');
                  }
                })();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setEditingRack(null);
              }
            }}
          >
            <div
              className="bg-white rounded-lg p-6 w-96 shadow-xl"
              role="dialog"
              aria-labelledby="rack-edit-title"
              aria-modal="true"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 id="rack-edit-title" className="text-lg font-bold">
                  Edit Rack
                </h3>
                <button
                  onClick={() => setEditingRack(null)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="rack-name" className="block text-sm font-medium mb-2">
                    Rack Name
                  </label>
                  <input
                    id="rack-name"
                    type="text"
                    className="input w-full"
                    value={editingRack.rack.name}
                    onChange={e =>
                      setEditingRack({
                        ...editingRack,
                        rack: { ...editingRack.rack, name: e.target.value },
                      })
                    }
                    placeholder="Rack 1"
                    required
                    aria-required="true"
                  />
                </div>

                <div>
                  <label htmlFor="rack-description" className="block text-sm font-medium mb-2">
                    Description
                  </label>
                  <textarea
                    id="rack-description"
                    className="input w-full resize-none"
                    rows={3}
                    value={editingRack.rack.description ?? ''}
                    onChange={e =>
                      setEditingRack({
                        ...editingRack,
                        rack: { ...editingRack.rack, description: e.target.value },
                      })
                    }
                    placeholder="Optional description"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="rackActive"
                    checked={editingRack.rack.isActive}
                    onChange={e =>
                      setEditingRack({
                        ...editingRack,
                        rack: { ...editingRack.rack, isActive: e.target.checked },
                      })
                    }
                  />
                  <label htmlFor="rackActive" className="text-sm font-medium">
                    Active (visible in rack selector)
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setEditingRack(null)} className="btn-cancel">
                  Cancel
                </button>
                <button
                  onClick={() =>
                    handleUpdateRack(editingRack.tankId, editingRack.rack.id, {
                      name: editingRack.rack.name,
                      location: editingRack.rack.location,
                      description: editingRack.rack.description,
                      isActive: editingRack.rack.isActive,
                    })
                  }
                  className="btn-primary flex items-center gap-2"
                >
                  <Save size={16} />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tank Editing Modal - Enhanced */}
        {editingTank && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-60"
            role="presentation"
            onKeyDown={e => {
              if (e.key === 'Enter' && editingTank.name.trim()) {
                e.preventDefault();
                void (async () => {
                  try {
                    await handleUpdateTank(editingTank.id, {
                      name: editingTank.name.trim(),
                      location: editingTank.location?.trim() || '',
                      isActive: editingTank.isActive,
                    });
                  } catch (error) {
                    logger.error('Failed to update tank', { error });
                    notifications.error('Failed to save changes. Please try again.');
                  }
                })();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setEditingTank(null);
              }
            }}
          >
            <div
              className="bg-white rounded-lg p-6 w-[480px] shadow-xl"
              role="dialog"
              aria-labelledby="tank-edit-title"
              aria-modal="true"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <TankIcon className="text-odysseus-blue" size={22} />
                  <h3 id="tank-edit-title" className="text-lg font-bold">
                    Edit Tank Configuration
                  </h3>
                </div>
                <button
                  onClick={() => setEditingTank(null)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label
                    htmlFor="tank-name"
                    className="block text-sm font-semibold mb-2 text-gray-700"
                  >
                    Tank Name *
                  </label>
                  <input
                    id="tank-name"
                    type="text"
                    className="input w-full text-lg font-medium"
                    value={editingTank.name}
                    onChange={e => setEditingTank({ ...editingTank, name: e.target.value })}
                    placeholder="Main Cryogenic Storage"
                    required
                    aria-required="true"
                    aria-invalid={!editingTank.name.trim()}
                  />
                  {!editingTank.name.trim() && (
                    <p id="tank-name-error" className="text-red-500 text-xs mt-1" role="alert">
                      Tank name is required
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="tank-location"
                    className="block text-sm font-semibold mb-2 text-gray-700"
                  >
                    Physical Location
                  </label>
                  <input
                    id="tank-location"
                    type="text"
                    className="input w-full"
                    value={editingTank.location || ''}
                    onChange={e => setEditingTank({ ...editingTank, location: e.target.value })}
                    placeholder="Lab Room 101, Building A"
                  />
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-700 mb-2">Tank Status</h4>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="tankActive"
                      checked={editingTank.isActive}
                      onChange={e => setEditingTank({ ...editingTank, isActive: e.target.checked })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <label htmlFor="tankActive" className="text-sm font-medium">
                      Active (tank is available for storage)
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Inactive tanks are hidden from selectors but data is preserved
                  </p>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-700 mb-1">Tank Statistics</h4>
                  <div className="text-sm text-blue-600 space-y-1">
                    <p>• {editingTank.racks.length} racks configured</p>
                    <p>
                      • {editingTank.racks.reduce((total, rack) => total + rack.boxes.length, 0)}{' '}
                      storage boxes
                    </p>
                    <p>
                      •{' '}
                      {editingTank.racks.reduce(
                        (total, rack) =>
                          total +
                          rack.boxes.reduce(
                            (rackTotal, box) => rackTotal + getGridTotalPositions(box.gridConfig),
                            0
                          ),
                        0
                      )}{' '}
                      total positions
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
                <button onClick={() => setEditingTank(null)} className="btn-cancel">
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (editingTank.name.trim()) {
                      void (async () => {
                        try {
                          await handleUpdateTank(editingTank.id, {
                            name: editingTank.name.trim(),
                            location: editingTank.location?.trim() || '',
                            isActive: editingTank.isActive,
                          });
                        } catch (error) {
                          logger.error('Failed to update tank', { error });
                          notifications.error('Failed to save changes. Please try again.');
                        }
                      })();
                    }
                  }}
                  disabled={!editingTank.name.trim()}
                  className="btn-primary flex items-center gap-2"
                >
                  <Save size={16} />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Label Editing Modal */}
        {editingLabel && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-60"
            role="presentation"
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter' && editingLabel.currentLabel !== undefined) {
                e.preventDefault();
                void (async () => {
                  try {
                    await handleUpdateCustomLabel(
                      editingLabel.type,
                      editingLabel.tankId,
                      editingLabel.rackId,
                      editingLabel.boxId,
                      editingLabel.currentLabel ?? ''
                    );
                    setEditingLabel(null);
                  } catch (error) {
                    logger.error('Failed to update custom label', { error });
                    notifications.error('Failed to save label');
                  }
                })();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setEditingLabel(null);
              }
            }}
          >
            <div
              className="bg-white rounded-lg p-6 w-96 shadow-xl"
              role="dialog"
              aria-labelledby="label-edit-title"
              aria-modal="true"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 id="label-edit-title" className="text-lg font-bold">
                  Edit Custom Label
                </h3>
                <button
                  onClick={() => setEditingLabel(null)}
                  className="p-1 hover:bg-gray-100 rounded"
                  aria-label="Close modal"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Generic Name (Read-only) */}
                <div>
                  <div className="block text-sm font-medium mb-2 text-gray-700">
                    Generic Name (System)
                  </div>
                  <div className="px-3 py-2 bg-gray-100 rounded text-gray-700 font-medium">
                    {(() => {
                      const tank = currentLab.equipment.tanks.find(
                        t => t.id === editingLabel.tankId
                      );
                      const rack = tank?.racks.find(r => r.id === editingLabel.rackId);
                      if (editingLabel.type === 'rack') {
                        return rack?.name ?? '';
                      } else {
                        const box = rack?.boxes.find(b => b.id === editingLabel.boxId);
                        return box?.name ?? '';
                      }
                    })()}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Generic name is visible to all users and cannot be changed here
                  </p>
                </div>

                {/* Custom Label Input */}
                <div>
                  <label
                    htmlFor="custom-label-input"
                    className="block text-sm font-medium mb-2 text-gray-700"
                  >
                    Your Custom Label (Optional)
                  </label>
                  <input
                    id="custom-label-input"
                    type="text"
                    className="input w-full"
                    value={editingLabel.currentLabel ?? ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditingLabel({
                        ...editingLabel,
                        currentLabel: e.target.value,
                      })
                    }
                    placeholder="e.g., My Lab Samples"
                    maxLength={50}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {editingLabel.currentLabel?.length ?? 0}/50 characters · Leave blank to remove
                    custom label
                  </p>
                </div>

                {/* Preview */}
                <div className="bg-blue-50 p-3 rounded">
                  <div className="block text-sm font-medium mb-1 text-blue-700">Preview</div>
                  <div className="text-sm font-medium text-blue-900">
                    {(() => {
                      const tank = currentLab.equipment.tanks.find(
                        t => t.id === editingLabel.tankId
                      );
                      const rack = tank?.racks.find(r => r.id === editingLabel.rackId);
                      if (editingLabel.type === 'rack') {
                        return formatResourceDisplayName(
                          rack?.name ?? '',
                          editingLabel.currentLabel
                        );
                      } else {
                        const box = rack?.boxes.find(b => b.id === editingLabel.boxId);
                        return formatResourceDisplayName(
                          box?.name ?? '',
                          editingLabel.currentLabel
                        );
                      }
                    })()}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setEditingLabel(null)} className="btn-cancel">
                  Cancel
                </button>
                <button
                  onClick={() => {
                    void (async () => {
                      try {
                        await handleUpdateCustomLabel(
                          editingLabel.type,
                          editingLabel.tankId,
                          editingLabel.rackId,
                          editingLabel.boxId,
                          editingLabel.currentLabel ?? ''
                        );
                        setEditingLabel(null);
                      } catch (error) {
                        logger.error('Failed to update custom label', { error });
                        notifications.error('Failed to save label');
                      }
                    })();
                  }}
                  className="btn-primary flex items-center gap-2"
                >
                  <Save size={16} />
                  Save Label
                </button>
              </div>
            </div>
          </div>
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
