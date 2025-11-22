import { createContext, useContext } from 'react';

import type { BoxConfiguration, RackConfiguration, TankConfiguration } from '@domains/storage';
import type { AdminUser } from '@odysseus/shared-schemas';

interface StorageManagementContextValue {
  // Data
  users: AdminUser[];
  currentUser: { id: string; role?: string } | null;

  // Business logic functions
  isOwnedByCurrentUser: (
    resource: RackConfiguration | BoxConfiguration,
    parentRack?: RackConfiguration
  ) => boolean;
  canEditResource: (
    resource: RackConfiguration | BoxConfiguration,
    parentRack?: RackConfiguration
  ) => boolean;

  // Tank handlers
  onEditTank: (tank: TankConfiguration) => void;
  onDeleteTank: (tankId: string) => void;
  onAddRack: (tankId: string) => void;

  // Rack handlers
  onEditRack: (tankId: string, rack: RackConfiguration) => void;
  onDeleteRack: (tankId: string, rackId: string) => void;
  onAddBox: (tankId: string, rackId: string) => void;
  onAssignRack: (tankId: string, rackId: string, userId: string | undefined) => void;
  onEditRackLabel: (tankId: string, rackId: string, currentLabel: string) => void;

  // Box handlers
  onEditBox: (tankId: string, rackId: string, box: BoxConfiguration) => void;
  onDeleteBox: (tankId: string, rackId: string, boxId: string) => void;
  onAssignBox: (
    tankId: string,
    rackId: string,
    boxId: string,
    userId: string | undefined
  ) => void;
  onEditBoxLabel: (tankId: string, rackId: string, boxId: string, currentLabel: string) => void;
}

export const StorageManagementContext = createContext<StorageManagementContextValue | null>(null);

export function useStorageManagementContext() {
  const context = useContext(StorageManagementContext);
  if (!context) {
    throw new Error(
      'useStorageManagementContext must be used within StorageManagementContext.Provider'
    );
  }
  return context;
}
