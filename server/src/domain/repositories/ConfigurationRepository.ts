import { Configuration } from '@domain/entities/Configuration';
import { Location } from '@domain/valueObjects/Location';
import type { SecurityConfig, SystemMetrics, SyncStatus } from '@odysseus/shared-schemas';
import type { EquipmentSummary, CapacityInfo, ConfigurationRepositoryStats } from '@domain/types/repository/Stats';

/**
 * Configuration Repository Interface
 * Defines the contract for configuration data access operations
 * Infrastructure layer will implement this interface
 */
export interface ConfigurationRepository {
  
  // CONFIGURATION MANAGEMENT

  getCurrent(): Promise<Configuration | null>;
  getForLab(labId: string): Promise<Configuration | null>;
  save(configuration: Configuration): Promise<number>;
  saveForLab(labId: string, configuration: Configuration): Promise<number>;
  ensureDefaultForLab(labId: string): Promise<Configuration>;
  
  // VERSIONING AND HISTORY

  /**
   * Get configuration by version number
   */
  getByVersion(version: number): Promise<Configuration | null>;
  
  /**
   * Get configuration history (for audit/rollback)
   */
  getHistory(limit?: number): Promise<ConfigurationHistory[]>;
  
  /**
   * Get current version number
   */
  saveWithVersioning(configuration: Configuration, changeDescription?: string, changedBy?: string, labId?: string): Promise<number>;

  /**
   * Save with optimistic locking. @throws ConflictError if version mismatch.
   */
  saveWithOptimisticLock(
    configuration: Configuration,
    expectedVersion: number,
    changeDescription?: string,
    changedBy?: string,
    labId?: string
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

  /**
   * Validate if a location exists in current configuration
   */
  isLocationValid(location: Location): Promise<boolean>;
  
  /**
   * Check if tank exists
   */
  tankExists(tankId: string): Promise<boolean>;
  
  /**
   * Check if rack exists in tank
   */
  rackExists(tankId: string, rackId: string): Promise<boolean>;
  
  /**
   * Check if box exists in rack
   */
  boxExists(tankId: string, rackId: string, boxId: string): Promise<boolean>;
  
  /**
   * Get available positions in a box
   */
  getAvailablePositions(
    tankId: string, 
    rackId: string, 
    boxId: string, 
    occupiedPositions: number[]
  ): Promise<number[]>;
  
  /**
   * Get maximum position number for a box
   */
  getMaxPosition(tankId: string, rackId: string, boxId: string): Promise<number>;
  
  // EQUIPMENT QUERIES

  /**
   * Get all tank IDs
   */
  getAllTankIds(): Promise<string[]>;
  
  /**
   * Get all rack IDs for a tank
   */
  getRackIds(tankId: string): Promise<string[]>;

  /**
   * Get all box names for a rack
   */
  getBoxNames(tankId: string, rackId: string): Promise<string[]>;
  
  /**
   * Get equipment hierarchy summary
   */
  getEquipmentSummary(): Promise<EquipmentSummary>;
  
  /**
   * Get capacity information
   */
  getCapacityInfo(): Promise<CapacityInfo>;
  
  // SYSTEM SETTINGS

  /**
   * Get lab name from configuration
   */
  getLabName(): Promise<string>;
  
  /**
   * Update lab name
   */
  updateLabName(labName: string): Promise<void>;
  
  /**
   * Get default researcher
   */
  getDefaultResearcher(): Promise<string>;
  
  /**
   * Update default researcher
   */
  updateDefaultResearcher(researcher: string): Promise<void>;
  
  /**
   * Get auto-save setting
   */
  getAutoSave(): Promise<boolean>;
  
  /**
   * Update auto-save setting
   */
  updateAutoSave(autoSave: boolean): Promise<void>;
  
  /**
   * Get audit trail enabled setting
   */
  getAuditTrailEnabled(): Promise<boolean>;
  
  /**
   * Update audit trail setting
   */
  updateAuditTrailEnabled(enabled: boolean): Promise<void>;
  
  /**
   * Get sync enabled setting
   */
  getSyncEnabled(): Promise<boolean>;
  
  /**
   * Update sync enabled setting
   */
  updateSyncEnabled(enabled: boolean): Promise<void>;
  
  // BACKUP AND RESTORE

  /**
   * Export configuration for backup
   */
  exportConfiguration(): Promise<ConfigurationExport>;
  
  /**
   * Import configuration from backup
   */
  importConfiguration(configExport: ConfigurationExport): Promise<Configuration>;
  
  /**
   * Create configuration snapshot
   */
  createSnapshot(description?: string): Promise<ConfigurationSnapshot>;
  
  /**
   * Restore from snapshot
   */
  restoreFromSnapshot(snapshotId: string): Promise<Configuration>;
  
  /**
   * List available snapshots
   */
  listSnapshots(): Promise<ConfigurationSnapshot[]>;
  
  /**
   * Delete old snapshots
   */
  cleanupSnapshots(keepCount: number): Promise<number>; // Returns count of deleted snapshots
  
  // INTEGRATION SUPPORT

  /**
   * Get configuration optimized for API responses
   */
  getForApi(): Promise<ApiConfigurationResponse>;
  
  /**
   * Get configuration optimized for frontend
   */
  getForFrontend(): Promise<FrontendConfiguration>;
  
  /**
   * Validate configuration against business rules
   */
  validateConfiguration(configuration: Configuration): Promise<ConfigurationValidationResult>;
  
  // MAINTENANCE OPERATIONS

  /**
   * Check repository health/connectivity
   */
  isHealthy(): Promise<boolean>;
  
  /**
   * Get repository statistics
   */
  getStats(): Promise<ConfigurationRepositoryStats>;
  
  /**
   * Perform maintenance tasks (cleanup, optimization)
   */
  performMaintenance(): Promise<MaintenanceResult>;

  // SECURITY & ADMIN CONFIGURATION

  /**
   * Get security configuration
   * Returns default configuration if none exists
   */
  getSecurityConfig(): Promise<SecurityConfig>;

  /**
   * Update security configuration with partial updates
   * @param updates - Partial security configuration to update
   * @returns Updated SecurityConfig
   */
  updateSecurityConfig(updates: Partial<SecurityConfig>): Promise<SecurityConfig>;

  /**
   * Get system metrics for admin dashboard
   */
  getSystemMetrics(labId: string): Promise<SystemMetrics>;

  /**
   * Get synchronization status
   */
  getSyncStatus(): Promise<SyncStatus>;
}

/**
 * Configuration history entry for audit trails
 */
export interface ConfigurationHistory {
  version: number;
  timestamp: Date;
  changeDescription?: string;
  changedBy?: string; // User ID who made the change
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
  duration: number; // Milliseconds
}
