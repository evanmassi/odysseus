import { Configuration } from '@domain/entities/Configuration';
import { Location } from '@domain/valueObjects/Location';
import type { SecurityConfig, SystemMetrics } from '@odysseus/shared-schemas';
import type { EquipmentSummary, CapacityInfo, ConfigurationRepositoryStats } from '@domain/types/repository/stats';

/**
 * Configuration Repository Interface
 * Defines the contract for lab-scoped configuration data access operations.
 * All lab-specific methods require an explicit labId parameter.
 */
export interface ConfigurationRepository {

  // CONFIGURATION MANAGEMENT

  getForLab(labId: string): Promise<Configuration | null>;
  saveForLab(labId: string, configuration: Configuration): Promise<number>;
  ensureDefaultForLab(labId: string): Promise<Configuration>;

  // VERSIONING AND HISTORY

  getByVersion(labId: string, version: number): Promise<Configuration | null>;
  getHistory(labId: string, limit?: number): Promise<ConfigurationHistory[]>;
  saveWithVersioning(labId: string, configuration: Configuration, changeDescription?: string, changedBy?: string): Promise<number>;

  /**
   * Save with optimistic locking. @throws ConflictError if version mismatch.
   */
  saveWithOptimisticLock(
    labId: string,
    configuration: Configuration,
    expectedVersion: number,
    changeDescription?: string,
    changedBy?: string
  ): Promise<number>;

  // ATOMIC EQUIPMENT DELETION
  // These methods atomically verify no tubes exist before deleting equipment,
  // preventing TOCTOU race conditions where tubes could be orphaned.

  /**
   * Atomically delete tank if empty. Uses SERIALIZABLE isolation to prevent race conditions.
   * @throws ValidationError if tubes exist in the tank
   * @throws NotFoundError if tank doesn't exist
   */
  deleteEmptyTank(
    labId: string,
    tankId: string,
    changedBy: string
  ): Promise<{ tankName: string }>;

  /**
   * Atomically delete rack if empty. Uses SERIALIZABLE isolation to prevent race conditions.
   * @throws ValidationError if tubes exist in the rack
   * @throws NotFoundError if rack doesn't exist
   */
  deleteEmptyRack(
    labId: string,
    tankId: string,
    rackId: string,
    changedBy: string
  ): Promise<{ tankName: string; rackName: string }>;

  /**
   * Atomically delete box if empty. Uses SERIALIZABLE isolation to prevent race conditions.
   * @throws ValidationError if tubes exist in the box
   * @throws NotFoundError if box doesn't exist
   */
  deleteEmptyBox(
    labId: string,
    tankId: string,
    rackId: string,
    boxId: string,
    changedBy: string
  ): Promise<{ tankName: string; rackName: string; boxName: string }>;

  // EQUIPMENT VALIDATION

  isLocationValid(labId: string, location: Location): Promise<boolean>;
  tankExists(labId: string, tankId: string): Promise<boolean>;
  rackExists(labId: string, tankId: string, rackId: string): Promise<boolean>;
  boxExists(labId: string, tankId: string, rackId: string, boxId: string): Promise<boolean>;

  getAvailablePositions(
    labId: string,
    tankId: string,
    rackId: string,
    boxId: string,
    occupiedPositions: number[]
  ): Promise<number[]>;

  getMaxPosition(labId: string, tankId: string, rackId: string, boxId: string): Promise<number>;

  // EQUIPMENT QUERIES

  getAllTankIds(labId: string): Promise<string[]>;
  getRackIds(labId: string, tankId: string): Promise<string[]>;
  getBoxNames(labId: string, tankId: string, rackId: string): Promise<string[]>;
  getEquipmentSummary(labId: string): Promise<EquipmentSummary>;
  getCapacityInfo(labId: string): Promise<CapacityInfo>;

  // SYSTEM SETTINGS

  getLabName(labId: string): Promise<string>;
  updateLabName(labId: string, labName: string): Promise<void>;
  getDefaultResearcher(labId: string): Promise<string>;
  updateDefaultResearcher(labId: string, researcher: string): Promise<void>;
  getAutoSave(labId: string): Promise<boolean>;
  updateAutoSave(labId: string, autoSave: boolean): Promise<void>;
  getAuditTrailEnabled(labId: string): Promise<boolean>;
  updateAuditTrailEnabled(labId: string, enabled: boolean): Promise<void>;
  getSyncEnabled(labId: string): Promise<boolean>;
  updateSyncEnabled(labId: string, enabled: boolean): Promise<void>;

  // BACKUP AND RESTORE

  exportConfiguration(labId: string): Promise<ConfigurationExport>;
  importConfiguration(labId: string, configExport: ConfigurationExport): Promise<Configuration>;
  createSnapshot(labId: string, description?: string): Promise<ConfigurationSnapshot>;
  restoreFromSnapshot(labId: string, snapshotId: string): Promise<Configuration>;
  listSnapshots(labId: string): Promise<ConfigurationSnapshot[]>;
  cleanupSnapshots(labId: string, keepCount: number): Promise<number>;

  // INTEGRATION SUPPORT

  getForApi(labId: string): Promise<ApiConfigurationResponse>;
  getForFrontend(labId: string): Promise<FrontendConfiguration>;
  validateConfiguration(labId: string, configuration: Configuration): Promise<ConfigurationValidationResult>;

  // MAINTENANCE OPERATIONS

  isHealthy(): Promise<boolean>;
  getStats(labId: string): Promise<ConfigurationRepositoryStats>;
  performMaintenance(labId: string): Promise<MaintenanceResult>;

  // SECURITY & ADMIN CONFIGURATION (system-wide, not lab-scoped)

  getSecurityConfig(): Promise<SecurityConfig>;
  updateSecurityConfig(updates: Partial<SecurityConfig>): Promise<SecurityConfig>;
  getSystemMetrics(labId: string): Promise<SystemMetrics>;
}

/**
 * Configuration history entry for audit trails
 */
export interface ConfigurationHistory {
  version: number;
  timestamp: Date;
  changeDescription?: string;
  changedBy?: string;
  configuration: Configuration;
}


/**
 * Configuration export format for backups
 */
export interface ConfigurationExport {
  version: string; // Export format version
  timestamp: Date;
  configuration: Configuration;
  metadata: {
    exportedBy?: string;
    description?: string;
    systemInfo: {
      appVersion: string;
      platform: string;
    };
  };
}

/**
 * Configuration snapshot for rollback
 */
export interface ConfigurationSnapshot {
  id: string;
  version: number;
  timestamp: Date;
  description?: string;
  createdBy?: string;
  sizeBytes: number;
}

/**
 * API-optimized configuration response
 * Uses nested structure: tanks contain racks, racks contain boxes
 */
export interface ApiConfigurationResponse {
  equipment: {
    tanks: Array<{
      id: string;
      name: string;
      maxRacks: number;
      isActive: boolean;
      racks: Array<{
        id: string;
        name: string;
        maxBoxes: number;
        capacity: number;
        isActive: boolean;
        boxes: Array<{
          name: string;
          gridConfig: { rows: number; cols: number };
          maxPositions: number;
          isActive: boolean;
        }>;
      }>;
    }>;
  };
  systemSettings: {
    labName: string;
    defaultResearcher: string;
    autoSave: boolean;
    auditTrailEnabled: boolean;
    syncEnabled: boolean;
  };
  metadata: {
    version: number;
    updatedAt: Date;
  };
}

/**
 * Frontend-optimized configuration
 */
export interface FrontendConfiguration {
  tanks: Array<{
    id: string;
    name: string;
    racks: Array<{
      id: string;
      boxes: Array<{
        name: string;
        maxPositions: number;
        gridSize: number; // For UI grid display
      }>;
    }>;
  }>;
  settings: {
    labName: string;
    defaultResearcher: string;
  };
  version: number;
}

/**
 * Configuration validation result
 */
export interface ConfigurationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations?: string[];
}

/**
 * Maintenance operation result
 */
export interface MaintenanceResult {
  success: boolean;
  tasksPerformed: string[];
  snapshotsDeleted: number;
  historyEntriesCleaned: number;
  errors: string[];
  duration: number;
}
