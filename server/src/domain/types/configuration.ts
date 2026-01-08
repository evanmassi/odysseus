/**
 * Configuration Update Types
 *
 * Type definitions for laboratory configuration updates.
 */

import type { TankConfiguration, RackConfiguration, BoxConfiguration, PositionDisplayConfig } from '@odysseus/shared-schemas';

/**
 * Data structure for importing configuration (matches Configuration.fromData() parameter)
 */
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
      }>;
      maxBoxes?: number;
      capacity?: number;
      isActive?: boolean;
      assignedUserId?: string;
      customLabel?: string;
    }>;
    maxRacks?: number;
    isActive?: boolean;
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

/**
 * Configuration update data
 */
export interface ConfigurationUpdateData {
  tanks?: TankConfiguration[];
  equipment?: {
    tanks?: TankConfiguration[];
    racks?: RackConfiguration[];
    boxes?: BoxConfiguration[];
  };
}
