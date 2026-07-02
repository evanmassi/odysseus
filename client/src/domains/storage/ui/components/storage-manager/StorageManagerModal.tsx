/**
 * Storage Manager Modal
 *
 * Admin modal for managing storage layout (tanks, racks, boxes) and user assignments.
 */

import { useState, useMemo } from 'react';

import { sortByName } from '@odysseus/shared-schemas';
import { Plus, ListTree, UsersRound } from 'lucide-react';

import { useAuthStore } from '@domains/authentication';
import { useStorageData, extractAssignedUserIds, GRID_TEMPLATES } from '@domains/storage';
import { useStorageOwnership } from '@domains/storage/hooks/useStorageOwnership';
import { useStoragePermissions } from '@domains/storage/hooks/useStoragePermissions';
import { useLocationCounts } from '@domains/tubes/hooks';
import { useActiveUsersQuery, useUserLookupQuery } from '@domains/users';
import { AlertBanner, Button, Tabs, Tab } from '@shared/ui';
import { TankIcon } from '@shared/ui/components/icons';
import { BaseModal } from '@shared/ui/components/overlays/BaseModal';

import { buildStorageHierarchy, computeNavigatorOccupancy } from '../storage-navigator';
import { TreeLinesByLocation } from '../storage-navigator/TreeLinesByLocation';

import '../storage-navigator/storage-navigator.css';
import { BoxEditModal } from './edit-modals/BoxEditModal';
import { RackEditModal } from './edit-modals/RackEditModal';
import { StorageRenameModal } from './edit-modals/StorageRenameModal';
import { TankEditModal } from './edit-modals/TankEditModal';
import { StorageManagerContext } from './StorageManagerContext';
import { TankRow } from './tabs/by-location/TankRow';
import { ByUserTab } from './tabs/by-user/ByUserTab';
import { useEditModals } from './useEditModals';
import { useStorageHandlers } from './useStorageHandlers';

function toggleSetItem<T>(set: Set<T>, item: T): Set<T> {
  const next = new Set(set);
  if (next.has(item)) next.delete(item);
  else next.add(item);
  return next;
}

const OWNERSHIP_LEGEND = [
  { label: 'You', token: '--ownership-user-badge' },
  { label: 'Other', token: '--ownership-other-badge' },
  { label: 'Unassigned/Common', token: '--ownership-unassigned-badge' },
] as const;

interface StorageManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StorageManagerModal({ isOpen, onClose }: StorageManagerModalProps) {
  const { currentLab } = useStorageData();
  const { user: currentUser } = useAuthStore();

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

  const scope = useMemo(() => {
    let racks = 0;
    let boxes = 0;
    currentLab?.equipment.tanks.forEach(tank => {
      racks += tank.racks.length;
      tank.racks.forEach(rack => {
        boxes += rack.boxes.length;
      });
    });
    return { tanks: currentLab?.equipment.tanks.length ?? 0, racks, boxes };
  }, [currentLab]);

  const { data: locationCounts = [] } = useLocationCounts();
  const occupancy = useMemo(
    () =>
      computeNavigatorOccupancy(
        buildStorageHierarchy(currentLab?.equipment.tanks ?? []),
        locationCounts
      ),
    [currentLab, locationCounts]
  );

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

  const editModals = useEditModals();
  const handlers = useStorageHandlers({ currentLab, getUserInfo, setCollapsedRacks });

  const isMutating = editModals.isMutating || handlers.isMutating;

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

  const contextValue = useMemo(
    () => ({
      users: dropdownUsers,
      currentUser,
      isDemo,
      demoLimits,
      hasSeededResources,
      occupancy,
      getUserInfo,
      isOwnedByCurrentUser,
      canEditResource,
      canManageStorage,
      isResourceLocked,
      onEditTank: editModals.onEditTank,
      onDeleteTank: handlers.handleDeleteTank,
      onAddRacks: handlers.handleAddRacks,
      onEditRack: editModals.onEditRack,
      onDeleteRack: handlers.handleDeleteRack,
      onAddBoxes: handlers.handleAddBoxes,
      onAssignRack: handlers.handleAssignRack,
      onEditRackLabel: editModals.onEditRackLabel,
      onEditBox: editModals.onEditBox,
      onDeleteBox: handlers.handleRemoveBox,
      onAssignBox: handlers.handleAssignBox,
      onEditBoxLabel: editModals.onEditBoxLabel,
    }),
    [
      dropdownUsers,
      currentUser,
      isDemo,
      demoLimits,
      hasSeededResources,
      occupancy,
      getUserInfo,
      isOwnedByCurrentUser,
      canEditResource,
      canManageStorage,
      isResourceLocked,
      editModals.onEditTank,
      editModals.onEditRack,
      editModals.onEditRackLabel,
      editModals.onEditBox,
      editModals.onEditBoxLabel,
      handlers.handleDeleteTank,
      handlers.handleAddRacks,
      handlers.handleDeleteRack,
      handlers.handleAddBoxes,
      handlers.handleRemoveBox,
      handlers.handleAssignRack,
      handlers.handleAssignBox,
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

  const locator = (
    <div className="flex min-h-[2rem] items-center gap-3">
      <span
        aria-hidden
        className="h-2.5 w-0.5 flex-shrink-0 bg-warning-bg/80 dark:shadow-[0_0_6px_hsl(var(--color-warning-bg)/0.55)]"
      />
      <span className="flex items-center gap-1.5 font-mono text-data-sm tracking-[0.04em] text-foreground/75">
        <span className="text-foreground">{scope.tanks}</span> tanks
        <span className="text-foreground/25">·</span>
        <span className="text-foreground">{scope.racks}</span> racks
        <span className="text-foreground/25">·</span>
        <span className="text-foreground">{scope.boxes}</span> boxes
      </span>
      <span className="flex-1" />
      <span className="flex flex-shrink-0 items-center gap-2" title="Facility occupancy">
        <span className="relative h-1 w-16 bg-foreground/[0.07]">
          <span
            className="absolute inset-y-0 left-0 bg-primary dark:shadow-[0_0_6px_hsl(var(--primary)/0.6)]"
            style={{
              width: `${occupancy.facility.capacity > 0 ? (occupancy.facility.filled / occupancy.facility.capacity) * 100 : 0}%`,
            }}
          />
        </span>
        <span className="font-mono text-data-sm tracking-[0.06em] text-foreground/60">
          {occupancy.facility.filled}
          <span className="text-foreground/35">/{occupancy.facility.capacity}</span>
        </span>
      </span>
      {canManageStorage && viewMode === 'tree' && (
        <div className="flex items-center gap-2">
          {demoLimitsActive && (
            <span className="text-caption text-muted-foreground">
              {nonSeededTankCount}/{demoLimits.maxTanks} tanks
            </span>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={handlers.handleAddNewTank}
            isLoading={handlers.addTankMutation.isPending}
            loadingText="Adding..."
            leftIcon={<Plus size={16} />}
            disabled={!!tankLimitReached}
          >
            Add Tank
          </Button>
        </div>
      )}
    </div>
  );

  const footer = (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-4 text-caption text-muted-foreground flex-shrink min-w-0">
        {OWNERSHIP_LEGEND.map(({ label, token }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-2 w-2 flex-shrink-0"
              style={{
                backgroundColor: `hsl(var(${token}))`,
                boxShadow: `0 0 6px 1px hsl(var(${token}) / 0.7)`,
              }}
            />
            <span>{label}</span>
          </div>
        ))}
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
        size="md-lg"
        fixedHeight
        locator={locator}
        tabs={tabs}
        tabOrientation="horizontal"
        footer={footer}
        contentClassName="p-3"
        className="max-h-[80vh]"
        onClose={onClose}
      >
        <div className={viewMode === 'tree' ? '' : 'hidden'}>
          <div className="space-y-2">
            {isDemo && hasSeededResources && (
              <AlertBanner variant="demo" spacing="none">
                Demo mode — locked resources cannot be edited or deleted.
              </AlertBanner>
            )}

            <StorageManagerContext.Provider value={contextValue}>
              <div className="relative" role="tree" data-tree-id="modal">
                <TreeLinesByLocation
                  expandedTanks={expandedTanks}
                  expandedRacks={expandedRacks}
                  treeId="modal"
                  initialDelay={420}
                  lineOffset={2}
                />
                <div className="space-y-1">
                  {currentLab.equipment.tanks.map(tank => (
                    <TankRow
                      key={tank.id}
                      tank={tank}
                      collapsed={collapsedTanks.has(tank.id)}
                      onToggleCollapse={() => toggleTankCollapse(tank.id)}
                      onToggleRackCollapse={toggleRackCollapse}
                      collapsedRacks={collapsedRacks}
                      canDeleteTank={currentLab.equipment.tanks.length > 1}
                    />
                  ))}
                </div>
              </div>
            </StorageManagerContext.Provider>
          </div>
        </div>
        <div className={viewMode === 'byUser' ? '' : 'hidden'}>
          <ByUserTab
            lab={currentLab}
            getUserInfo={getUserInfo}
            currentUserId={currentUser?.id}
            canManageStorage={canManageStorage}
            users={dropdownUsers}
            onBulkUnassign={handlers.handleBulkUnassign}
            onBulkReassign={handlers.handleBulkReassign}
          />
        </div>
      </BaseModal>

      {editModals.boxModalData && (
        <BoxEditModal
          isOpen={editModals.isBoxModalOpen}
          initialBox={editModals.boxModalData.box}
          tankId={editModals.boxModalData.tankId}
          rackId={editModals.boxModalData.rackId}
          gridTemplates={GRID_TEMPLATES}
          onSave={editModals.handleUpdateBoxGrid}
          onClose={() => editModals.setIsBoxModalOpen(false)}
        />
      )}

      {editModals.rackModalData && (
        <RackEditModal
          isOpen={editModals.isRackModalOpen}
          initialRack={editModals.rackModalData.rack}
          tankId={editModals.rackModalData.tankId}
          onSave={editModals.handleUpdateRack}
          onClose={() => editModals.setIsRackModalOpen(false)}
        />
      )}

      {editModals.tankModalData && (
        <TankEditModal
          isOpen={editModals.isTankModalOpen}
          initialTank={editModals.tankModalData}
          onSave={editModals.handleUpdateTank}
          onClose={() => editModals.setIsTankModalOpen(false)}
        />
      )}

      {editModals.labelModalData && (
        <StorageRenameModal
          isOpen={editModals.isLabelModalOpen}
          resourceInfo={{
            type: editModals.labelModalData.type,
            tankId: editModals.labelModalData.tankId,
            rackId: editModals.labelModalData.rackId,
            boxId: editModals.labelModalData.boxId,
            initialLabel: editModals.labelModalData.currentLabel,
          }}
          currentLab={currentLab}
          onSave={editModals.handleUpdateCustomLabel}
          onClose={() => editModals.setIsLabelModalOpen(false)}
        />
      )}
    </>
  );
}
