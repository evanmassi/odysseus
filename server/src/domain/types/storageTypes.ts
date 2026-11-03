export interface StorageImportData {
  tanks: Array<{
    id: string;
    name: string;
    location?: string;
    racks: Array<{
      id: number | string;
      name: string;
      boxes: Array<{
        name: string;
        gridConfig?: { rows: number; cols: number };
        maxPositions?: number;
        isActive?: boolean;
        assignedUserId?: string | null;
        customLabel?: string;
        sharedWithUserIds?: string[];
        isSeeded?: boolean;
      }>;
      maxBoxes?: number;
      capacity?: number;
      isActive?: boolean;
      assignedUserId?: string;
      customLabel?: string;
      sharedWithUserIds?: string[];
      isSeeded?: boolean;
    }>;
    maxRacks?: number;
    isActive?: boolean;
    isSeeded?: boolean;
  }>;
  systemSettings: {
    labName: string;
    defaultResearcher: string;
    autoSave: boolean;
    auditTrailEnabled: boolean;
    syncEnabled: boolean;
  };
  updatedAt?: string;
  version?: number;
}
