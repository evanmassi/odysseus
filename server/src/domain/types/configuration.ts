/**
 * Configuration Import Types
 *
 * Shape accepted by Configuration.fromData() for importing lab configuration.
 */

import type { PositionDisplayConfig } from '@odysseus/shared-schemas';

export interface ConfigurationImportData {
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
        positionDisplay?: PositionDisplayConfig;
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
    defaultPositionDisplay?: PositionDisplayConfig;
  };
  updatedAt?: string;
  version?: number;
}
