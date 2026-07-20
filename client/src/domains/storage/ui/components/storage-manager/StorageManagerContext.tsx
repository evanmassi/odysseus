/**
 * Storage Manager Context
 *
 * Shared state and callbacks for the storage manager modal's child components.
 */

import { createContext, useContext } from 'react';

import type { UserInfo } from '../../../hooks/useStorageOwnership';
import type { NavigatorOccupancy } from '../storage-navigator';
import type {
  BoxConfiguration,
  RackConfiguration,
  TankConfiguration,
  DemoLimits,
  UserDisplayInfo,
} from '@odysseus/shared-schemas';

interface StorageManagerContextValue {
  users: UserDisplayInfo[];
  currentUser: { id: string; role?: string } | null;
  isDemo: boolean;
  demoLimits: DemoLimits | undefined;
  hasSeededResources: boolean;
  /** Per-box/rack/tank tube fill against capacity, for the occupancy minimaps + bars. */
  occupancy: NavigatorOccupancy;

  getUserInfo: (userId: string) => UserInfo | null;
  isOwnedByCurrentUser: (
    resource: RackConfiguration | BoxConfiguration,
    parentRack?: RackConfiguration
  ) => boolean;
  canEditResource: (
    resource: RackConfiguration | BoxConfiguration,
    parentRack?: RackConfiguration
  ) => boolean;
  canManageStorage: boolean;
  isResourceLocked: (resource: TankConfiguration | RackConfiguration | BoxConfiguration) => boolean;

  onEditTank: (tank: TankConfiguration) => void;
  onDeleteTank: (tankId: string) => void;
  onAddRacks: (tankId: string, count: number, options?: { onSuccess?: () => void }) => void;

  onEditRack: (tankId: string, rack: RackConfiguration) => void;
  onDeleteRack: (tankId: string, rackId: string) => void;
  onAddBoxes: (
    tankId: string,
    rackId: string,
    count: number,
    options?: { onSuccess?: () => void }
  ) => void;
  onAssignRack: (tankId: string, rackId: string, userId: string | undefined) => void;
  onEditRackLabel: (tankId: string, rackId: string, currentLabel: string) => void;

  onEditBox: (tankId: string, rackId: string, box: BoxConfiguration) => void;
  onDeleteBox: (tankId: string, rackId: string, boxId: string) => void;
  onAssignBox: (
    tankId: string,
    rackId: string,
    boxId: string,
    userId: string | null | undefined
  ) => void;
  onEditBoxLabel: (tankId: string, rackId: string, boxId: string, currentLabel: string) => void;
}

export const StorageManagerContext = createContext<StorageManagerContextValue | null>(null);

export function useStorageManagerContext() {
  const context = useContext(StorageManagerContext);
  if (!context) {
    throw new Error('useStorageManagerContext must be used within StorageManagerContext.Provider');
  }
  return context;
}
