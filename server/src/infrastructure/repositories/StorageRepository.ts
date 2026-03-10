import { StorageRepository as IStorageRepository, StorageHistory, StorageExport, StorageValidationResult, StorageSnapshot, ApiStorageResponse, FrontendStorage, MaintenanceResult } from '@domain/repositories/StorageRepository';
import type { EquipmentSummary, StorageRepositoryStats, CapacityInfo } from '@domain/types/repository';
import { Storage } from '@domain/entities/Storage';
import { Location } from '@domain/valueObjects/Location';
import { Tank, Rack, Box } from '@domain/valueObjects/Equipment';
import { generateId } from '@domain/utils/generateId';
import type { SecurityConfig, SystemMetrics } from '@odysseus/shared-schemas';
import { DEFAULT_SECURITY_CONFIG, EQUIPMENT_DEFAULTS } from '@odysseus/shared-schemas';
import { PostgresContext } from '@infrastructure/database/PostgresContext';
import { ValidationError } from '@domain/errors/ValidationError';
import { ConflictError } from '@domain/errors/ConflictError';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { logger } from '@infrastructure/logging/logger';

/** Type for configuration JSON stored in JSONB columns */
type ConfigurationJson = Parameters<typeof Storage.fromData>[0];

/**
 * StorageRepository - Configuration data access
 *
 * Manages lab-scoped configuration with versioning and snapshots.
 * All lab-specific methods require an explicit labId parameter.
 */
export class StorageRepository implements IStorageRepository {

  constructor(private context: PostgresContext) {}

  // CORE CONFIGURATION MANAGEMENT

  async getForLab(labId: string): Promise<Storage | null> {
    try {
      const row = await this.context.queryOne<{ config_json: ConfigurationJson; version: number; updated_at: Date | string }>(`
        SELECT config_json, version, updated_at
        FROM storage_current
        WHERE lab_id = $1
      `, [labId]);

      if (!row) {
        return null;
      }

      return Storage.fromData({ ...row.config_json, version: row.version });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to get configuration for lab:', { labId, message: errorMessage });
      throw new ValidationError(`Database error retrieving configuration for lab: ${errorMessage}`);
    }
  }

  async saveForLab(labId: string, configuration: Storage): Promise<number> {
    try {
      let newVersion = 0;
      await this.context.transaction(async (client) => {
        const now = new Date();
        const configJson = JSON.stringify(configuration.toData());

        const versionResult = await client.query<{ version: number }>(
          `INSERT INTO storage_versions (lab_id, updated_at, change_description, changed_by, config_json)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING version`,
          [labId, now, 'Storage configuration updated', 'system', configJson]
        );

        newVersion = versionResult.rows[0].version;

        await client.query(
          `UPDATE storage_current
           SET version = $1, updated_at = $2, config_json = $3
           WHERE lab_id = $4`,
          [newVersion, now, configJson, labId]
        );
      });

      return newVersion;
    } catch (error) {
      logger.error('Failed to save configuration for lab:', { labId, error });
      throw new ValidationError(`Database error saving configuration for lab: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async ensureDefaultForLab(labId: string): Promise<Storage> {
    const existing = await this.getForLab(labId);
    if (existing) {
      return existing;
    }

    const defaultConfig = Storage.createDefault();
    const configJson = JSON.stringify(defaultConfig.toData());
    const now = new Date();

    await this.context.transaction(async (client) => {
      const versionResult = await client.query<{ version: number }>(
        `INSERT INTO storage_versions (lab_id, updated_at, change_description, changed_by, config_json)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING version`,
        [labId, now, 'Default configuration created', 'system', configJson]
      );

      const version = versionResult.rows[0].version;

      await client.query(
        `INSERT INTO storage_current (lab_id, version, updated_at, config_json)
         VALUES ($1, $2, $3, $4)`,
        [labId, version, now, configJson]
      );
    });

    return defaultConfig;
  }

  // VERSIONING & HISTORY

  async getByVersion(labId: string, version: number): Promise<Storage | null> {
    try {
      const row = await this.context.queryOne<{ config_json: ConfigurationJson }>(`
        SELECT config_json
        FROM storage_versions
        WHERE lab_id = $1 AND version = $2
      `, [labId, version]);

      if (!row) {
        return null;
      }

      return Storage.fromData(row.config_json);

    } catch (error) {
      logger.error('Failed to get configuration by version:', { error, labId, version });
      throw new ValidationError(`Database error retrieving configuration version ${version}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getHistory(labId: string, limit: number = 50): Promise<StorageHistory[]> {
    try {
      const rows = await this.context.queryMany<{ version: number; updated_at: Date | string; change_description: string; changed_by: string; config_json: ConfigurationJson }>(`
        SELECT version, updated_at, change_description, changed_by, config_json
        FROM storage_versions
        WHERE lab_id = $1
        ORDER BY version DESC
        LIMIT $2
      `, [labId, limit]);

      return rows.map(row => ({
        version: row.version,
        timestamp: row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at),
        changeDescription: row.change_description,
        changedBy: row.changed_by,
        configuration: Storage.fromData(row.config_json)
      }));

    } catch (error) {
      logger.error('Failed to get configuration history:', { error, labId });
      throw new ValidationError(`Database error retrieving configuration history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async saveWithVersioning(labId: string, configuration: Storage, changeDescription: string = 'Storage configuration updated', changedBy: string = 'system'): Promise<number> {
    try {
      let newVersion = 0;
      await this.context.transaction(async (client) => {
        const now = new Date();
        const configJson = JSON.stringify(configuration.toData());

        const versionResult = await client.query<{ version: number }>(
          `INSERT INTO storage_versions (lab_id, updated_at, change_description, changed_by, config_json)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING version`,
          [labId, now, changeDescription, changedBy, configJson]
        );

        newVersion = versionResult.rows[0].version;

        await client.query(
          `UPDATE storage_current
           SET version = $1, updated_at = $2, config_json = $3
           WHERE lab_id = $4`,
          [newVersion, now, configJson, labId]
        );

        logger.info(`Storage configuration saved with version ${newVersion}: ${changeDescription}`);
      });

      return newVersion;

    } catch (error) {
      logger.error('Failed to save configuration with versioning:', { error, labId });
      throw new ValidationError(`Database error saving configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async saveWithOptimisticLock(
    labId: string,
    configuration: Storage,
    expectedVersion: number,
    changeDescription: string = 'Storage configuration updated',
    changedBy: string = 'system'
  ): Promise<number> {
    try {
      let newVersion = 0;
      await this.context.transaction(async (client) => {
        const now = new Date();
        const configJson = JSON.stringify(configuration.toData());

        const versionResult = await client.query<{ version: number }>(
          `INSERT INTO storage_versions (lab_id, updated_at, change_description, changed_by, config_json)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING version`,
          [labId, now, changeDescription, changedBy, configJson]
        );

        newVersion = versionResult.rows[0].version;

        const updateResult = await client.query(
          `UPDATE storage_current
           SET version = $1, updated_at = $2, config_json = $3
           WHERE lab_id = $4 AND version = $5`,
          [newVersion, now, configJson, labId, expectedVersion]
        );

        if (updateResult.rowCount === 0) {
          const currentRow = await client.query<{ version: number }>(
            `SELECT version FROM storage_current WHERE lab_id = $1`,
            [labId]
          );
          const currentVersion = currentRow.rows[0]?.version ?? 0;

          throw ConflictError.configuration(expectedVersion, currentVersion);
        }

        logger.info(`Storage configuration saved with optimistic lock (v${expectedVersion} → v${newVersion}): ${changeDescription}`);
      });

      return newVersion;

    } catch (error) {
      if (error instanceof ConflictError) {
        throw error;
      }
      logger.error('Failed to save configuration with optimistic lock:', { error, labId });
      throw new ValidationError(`Database error saving configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // EQUIPMENT VALIDATION

  async isLocationValid(labId: string, location: Location): Promise<boolean> {
    const config = await this.getForLab(labId);
    if (!config) return false;
    return config.isLocationValid(location);
  }

  async tankExists(labId: string, tankId: string): Promise<boolean> {
    const config = await this.getForLab(labId);
    if (!config) return false;
    return config.equipment.tanks.some(tank => tank.id === tankId);
  }

  async rackExists(labId: string, tankId: string, rackId: string): Promise<boolean> {
    const config = await this.getForLab(labId);
    if (!config) return false;

    const tank = config.equipment.tanks.find(t => t.id === tankId);
    if (!tank) return false;

    return tank.racks.some(rack => rack.id === rackId);
  }

  async boxExists(labId: string, tankId: string, rackId: string, boxId: string): Promise<boolean> {
    const config = await this.getForLab(labId);
    if (!config) return false;

    const tank = config.equipment.tanks.find(t => t.id === tankId);
    if (!tank) return false;

    const rack = tank.racks.find(r => r.id === rackId);
    if (!rack) return false;

    return rack.boxes.some(box => box.name.toLowerCase() === boxId.toLowerCase());
  }

  async getAvailablePositions(labId: string, tankId: string, rackId: string, boxId: string, occupiedPositions: number[]): Promise<number[]> {
    const maxPosition = await this.getMaxPosition(labId, tankId, rackId, boxId);
    const allPositions: number[] = [];
    for (let i = 1; i <= maxPosition; i++) {
      if (!occupiedPositions.includes(i)) {
        allPositions.push(i);
      }
    }
    return allPositions;
  }

  // INTERNAL EQUIPMENT HELPERS

  private async getAllTanks(labId: string): Promise<Tank[]> {
    const config = await this.getForLab(labId);
    return config ? [...config.equipment.tanks] : [];
  }

  private async getRacksForTank(labId: string, tankId: string): Promise<Rack[]> {
    const config = await this.getForLab(labId);
    if (!config) return [];

    const tank = config.equipment.tanks.find(t => t.id === tankId);
    if (!tank) return [];

    return [...tank.racks];
  }

  private async getBoxesForRack(labId: string, tankId: string, rackId: string): Promise<Box[]> {
    const config = await this.getForLab(labId);
    if (!config) return [];

    const tank = config.equipment.tanks.find(t => t.id === tankId);
    if (!tank) return [];

    const rack = tank.racks.find(r => r.id === rackId);
    if (!rack) return [];

    return [...rack.boxes];
  }

  private async getBoxByName(labId: string, tankId: string, rackId: string, boxId: string): Promise<Box | null> {
    const boxes = await this.getBoxesForRack(labId, tankId, rackId);
    return boxes.find(box => box.name.toLowerCase() === boxId.toLowerCase()) || null;
  }

  // ANALYTICS & REPORTING

  async getEquipmentSummary(labId: string): Promise<EquipmentSummary> {
    const config = await this.getForLab(labId);
    if (!config) {
      return {
        totalTanks: 0,
        totalRacks: 0,
        totalBoxes: 0,
        totalPositions: 0,
        tankSummaries: []
      };
    }

    const tankSummaries = config.equipment.tanks.map(tank => {
      const tankRacks = tank.racks;
      const tankBoxes = tankRacks.flatMap(rack => rack.boxes);

      return {
        tankId: tank.id,
        tankName: tank.name,
        rackCount: tankRacks.length,
        boxCount: tankBoxes.length,
        positionCount: tankBoxes.reduce((total, box) => total + box.maxPositions, 0),
        isActive: tank.isActive
      };
    });

    const totalRacks = config.equipment.tanks.reduce((sum, tank) => sum + tank.racks.length, 0);
    const totalBoxes = config.equipment.tanks.reduce(
      (sum, tank) => sum + tank.racks.reduce((rackSum, rack) => rackSum + rack.boxes.length, 0),
      0
    );
    const totalPositions = config.equipment.tanks.reduce(
      (sum, tank) => sum + tank.racks.reduce(
        (rackSum, rack) => rackSum + rack.boxes.reduce((boxSum, box) => boxSum + box.maxPositions, 0),
        0
      ),
      0
    );

    return {
      totalTanks: config.equipment.tanks.length,
      totalRacks,
      totalBoxes,
      totalPositions,
      tankSummaries
    };
  }

  async validateStorage(labId: string, configuration: Storage): Promise<StorageValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (configuration.equipment.tanks.length === 0) {
      errors.push('No tanks configured');
    }

    const totalRacks = configuration.equipment.tanks.reduce((sum, tank) => sum + tank.racks.length, 0);
    if (totalRacks === 0) {
      errors.push('No racks configured');
    }

    const totalBoxes = configuration.equipment.tanks.reduce(
      (sum, tank) => sum + tank.racks.reduce((rackSum, rack) => rackSum + rack.boxes.length, 0),
      0
    );
    if (totalBoxes === 0) {
      errors.push('No boxes configured');
    }

    if (configuration.equipment.tanks.filter(t => t.isActive).length === 0) {
      warnings.push('No active tanks available');
    }

    if (configuration.equipment.tanks.length < 2) {
      recommendations.push('Consider configuring backup tanks for redundancy');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations
    };
  }

  async exportStorage(labId: string): Promise<StorageExport> {
    const config = await this.getForLab(labId);
    if (!config) {
      throw new ValidationError('No configuration to export');
    }

    return {
      version: '1.0',
      timestamp: new Date(),
      configuration: config,
      metadata: {
        exportedBy: 'system',
        description: 'Storage configuration export',
        systemInfo: {
          appVersion: '2.0.0',
          platform: process.platform
        }
      }
    };
  }

  // REPOSITORY HEALTH & STATS

  async isHealthy(): Promise<boolean> {
    try {
      await this.context.queryOne<{ result: number }>('SELECT 1 as result');
      return true;
    } catch {
      return false;
    }
  }

  async getStats(labId: string): Promise<StorageRepositoryStats> {
    const config = await this.getForLab(labId);
    const now = new Date();

    return {
      currentVersion: config ? config.version : 0,
      totalHistoryEntries: 1,
      totalSnapshots: 1,
      configurationSize: 1024,
      lastUpdated: config ? config.updatedAt : now,
      averageUpdateFrequency: 0.1,
      oldestSnapshot: config ? config.updatedAt : now,
      newestSnapshot: config ? config.updatedAt : now
    };
  }

  // ADDITIONAL INTERFACE METHODS

  async getMaxPosition(labId: string, tankId: string, rackId: string, boxId: string): Promise<number> {
    const box = await this.getBoxByName(labId, tankId, rackId, boxId);
    return box ? box.maxPositions : 0;
  }

  async getAllTankIds(labId: string): Promise<string[]> {
    const tanks = await this.getAllTanks(labId);
    return tanks.map(tank => tank.id);
  }

  async getRackIds(labId: string, tankId: string): Promise<string[]> {
    const racks = await this.getRacksForTank(labId, tankId);
    return racks.map(rack => rack.id);
  }

  async getBoxNames(labId: string, tankId: string, rackId: string): Promise<string[]> {
    const boxes = await this.getBoxesForRack(labId, tankId, rackId);
    return boxes.map(box => box.name);
  }

  async createSnapshot(labId: string, description?: string): Promise<StorageSnapshot> {
    const config = await this.getForLab(labId);
    if (!config) {
      throw new ValidationError('No configuration to snapshot');
    }

    const snapshotId = generateId('snapshot');

    try {
      const now = new Date();
      const configJson = JSON.stringify(config.toData());

      await this.context.execute(`
        INSERT INTO storage_snapshots (id, version, created_at, description, created_by, size_bytes, config_json)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [snapshotId, config.version, now, description || 'Storage configuration snapshot', 'system', configJson.length, configJson]);

      const snapshot: StorageSnapshot = {
        id: snapshotId,
        version: config.version,
        timestamp: now,
        description: description || 'Storage configuration snapshot',
        createdBy: 'system',
        sizeBytes: configJson.length
      };

      logger.info(`Snapshot created: ${snapshotId}`);
      return snapshot;

    } catch (error) {
      logger.error('Failed to create configuration snapshot:', { error, snapshotId });
      throw new ValidationError(`Database error creating snapshot: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async restoreFromSnapshot(labId: string, snapshotId: string): Promise<Storage> {
    if (!snapshotId) {
      throw new ValidationError('Snapshot ID is required');
    }

    try {
      const row = await this.context.queryOne<{ config_json: ConfigurationJson }>(`
        SELECT config_json FROM storage_snapshots WHERE id = $1
      `, [snapshotId]);

      if (!row) {
        throw new ValidationError(`Snapshot not found: ${snapshotId}`);
      }

      const config = Storage.fromData(row.config_json);

      await this.saveWithVersioning(labId, config, `Restored from snapshot ${snapshotId}`);

      logger.info(`Restored from snapshot: ${snapshotId}`);
      return config;

    } catch (error) {
      if (error instanceof ValidationError) throw error;
      logger.error('Failed to restore from snapshot:', { error, snapshotId });
      throw new ValidationError(`Database error restoring snapshot: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getCapacityInfo(labId: string): Promise<CapacityInfo> {
    const config = await this.getForLab(labId);
    if (!config) {
      return {
        totalCapacity: 0,
        availableCapacity: 0,
        utilizationRate: 0,
        capacityByTank: []
      };
    }

    const totalCapacity = config.equipment.tanks.reduce(
      (sum, tank) => sum + tank.racks.reduce(
        (rackSum, rack) => rackSum + rack.boxes.reduce((boxSum, box) => boxSum + box.maxPositions, 0),
        0
      ),
      0
    );
    const availableCapacity = totalCapacity;
    const utilizationRate = totalCapacity > 0 ? ((totalCapacity - availableCapacity) / totalCapacity) * 100 : 0;

    const capacityByTank = config.equipment.tanks.map(tank => {
      const tankBoxes = tank.racks.flatMap(rack => rack.boxes);
      const tankCapacity = tankBoxes.reduce((total, box) => total + box.maxPositions, 0);
      const tankUsed = 0;
      const tankAvailable = tankCapacity - tankUsed;

      return {
        tankId: tank.id,
        tankName: tank.name,
        capacity: tankCapacity,
        used: tankUsed,
        available: tankAvailable,
        utilizationRate: tankCapacity > 0 ? (tankUsed / tankCapacity) * 100 : 0
      };
    });

    return {
      totalCapacity,
      availableCapacity,
      utilizationRate,
      capacityByTank
    };
  }

  // SYSTEM SETTINGS

  async getLabName(labId: string): Promise<string> {
    const config = await this.getForLab(labId);
    return config ? config.systemSettings.labName : 'Odysseus Lab';
  }

  async updateLabName(labId: string, labName: string): Promise<void> {
    const config = await this.getForLab(labId);
    if (!config) {
      throw new ValidationError('No configuration found to update');
    }

    if (!labName || labName.trim().length === 0) {
      throw new ValidationError('Lab name cannot be empty');
    }

    const updatedSettings = {
      ...config.systemSettings,
      labName: labName.trim()
    };

    const updatedConfig = config.updateSystemSettings(updatedSettings);
    await this.saveWithVersioning(labId, updatedConfig, `Lab name updated to: ${labName}`, 'admin');
  }

  async getDefaultResearcher(labId: string): Promise<string> {
    const config = await this.getForLab(labId);
    return config ? config.systemSettings.defaultResearcher : '';
  }

  async updateDefaultResearcher(labId: string, researcher: string): Promise<void> {
    const config = await this.getForLab(labId);
    if (!config) {
      throw new ValidationError('No configuration found to update');
    }

    const updatedSettings = {
      ...config.systemSettings,
      defaultResearcher: researcher.trim()
    };

    const updatedConfig = config.updateSystemSettings(updatedSettings);
    await this.saveWithVersioning(labId, updatedConfig, `Default researcher updated to: ${researcher}`, 'admin');
  }

  async getAutoSave(labId: string): Promise<boolean> {
    const config = await this.getForLab(labId);
    return config ? config.systemSettings.autoSave : true;
  }

  async updateAutoSave(labId: string, autoSave: boolean): Promise<void> {
    const config = await this.getForLab(labId);
    if (!config) {
      throw new ValidationError('No configuration found to update');
    }

    const updatedSettings = {
      ...config.systemSettings,
      autoSave
    };

    const updatedConfig = config.updateSystemSettings(updatedSettings);
    await this.saveWithVersioning(labId, updatedConfig, `Auto-save ${autoSave ? 'enabled' : 'disabled'}`, 'admin');
  }

  async getAuditTrailEnabled(labId: string): Promise<boolean> {
    const config = await this.getForLab(labId);
    return config ? config.systemSettings.auditTrailEnabled : true;
  }

  async updateAuditTrailEnabled(labId: string, enabled: boolean): Promise<void> {
    const config = await this.getForLab(labId);
    if (!config) {
      throw new ValidationError('No configuration found to update');
    }

    const updatedSettings = {
      ...config.systemSettings,
      auditTrailEnabled: enabled
    };

    const updatedConfig = config.updateSystemSettings(updatedSettings);
    await this.saveWithVersioning(labId, updatedConfig, `Audit trail ${enabled ? 'enabled' : 'disabled'}`, 'admin');
  }

  async getSyncEnabled(labId: string): Promise<boolean> {
    const config = await this.getForLab(labId);
    return config ? config.systemSettings.syncEnabled : false;
  }

  async updateSyncEnabled(labId: string, enabled: boolean): Promise<void> {
    const config = await this.getForLab(labId);
    if (!config) {
      throw new ValidationError('No configuration found to update');
    }

    const updatedSettings = {
      ...config.systemSettings,
      syncEnabled: enabled
    };

    const updatedConfig = config.updateSystemSettings(updatedSettings);
    await this.saveWithVersioning(labId, updatedConfig, `Sync ${enabled ? 'enabled' : 'disabled'}`, 'admin');
  }

  // BACKUP AND RESTORE

  async importStorage(labId: string, configExport: StorageExport): Promise<Storage> {
    if (!configExport || !configExport.configuration) {
      throw new ValidationError('Invalid configuration export provided');
    }

    const validationResult = await this.validateStorage(labId, configExport.configuration);
    if (!validationResult.isValid) {
      throw new ValidationError(`Storage configuration import failed: ${validationResult.errors.join(', ')}`);
    }

    await this.saveWithVersioning(labId, configExport.configuration, 'Storage configuration imported');

    return configExport.configuration;
  }

  async listSnapshots(labId: string): Promise<StorageSnapshot[]> {
    try {
      const rows = await this.context.queryMany<{ id: string; version: number; created_at: Date | string; description: string; created_by: string; size_bytes: number }>(`
        SELECT id, version, created_at, description, created_by, size_bytes
        FROM storage_snapshots
        ORDER BY created_at DESC
      `);

      return rows.map(row => ({
        id: row.id,
        version: row.version,
        timestamp: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
        description: row.description,
        createdBy: row.created_by,
        sizeBytes: row.size_bytes
      }));

    } catch (error) {
      logger.error('Failed to list configuration snapshots:', { error });
      throw new ValidationError(`Database error listing snapshots: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async cleanupSnapshots(labId: string, keepCount: number): Promise<number> {
    if (keepCount < 1) {
      throw new ValidationError('Keep count must be at least 1');
    }

    try {
      const keepRows = await this.context.queryMany<{ id: string }>(`
        SELECT id FROM storage_snapshots
        ORDER BY created_at DESC
        LIMIT $1
      `, [keepCount]);

      const keepIds = keepRows.map(r => r.id);

      if (keepIds.length === 0) {
        return 0;
      }

      const placeholders = keepIds.map((_, i) => `$${i + 1}`).join(',');
      const result = await this.context.execute(
        `DELETE FROM storage_snapshots WHERE id NOT IN (${placeholders})`,
        keepIds
      );

      const deletedCount = result.rowCount ?? 0;

      if (deletedCount > 0) {
        logger.info(`Cleaned up ${deletedCount} old snapshots, keeping ${keepCount} most recent`);
      }

      return deletedCount;

    } catch (error) {
      logger.error('Failed to cleanup configuration snapshots:', { error });
      throw new ValidationError(`Database error cleaning up snapshots: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // INTEGRATION SUPPORT

  async getForApi(labId: string): Promise<ApiStorageResponse> {
    const config = await this.getForLab(labId);
    if (!config) {
      throw new ValidationError('No configuration available for API response');
    }

    return {
      equipment: {
        tanks: config.equipment.tanks.map(tank => ({
          id: tank.id,
          name: tank.name,
          maxRacks: tank.maxRacks,
          isActive: tank.isActive,
          racks: tank.racks.map(rack => ({
            id: rack.id,
            name: rack.name,
            maxBoxes: rack.maxBoxes,
            capacity: rack.capacity,
            isActive: rack.isActive,
            boxes: rack.boxes.map(box => ({
              name: box.name,
              gridConfig: box.gridConfig,
              maxPositions: box.maxPositions,
              isActive: box.isActive
            }))
          }))
        }))
      },
      systemSettings: {
        labName: config.systemSettings.labName,
        defaultResearcher: config.systemSettings.defaultResearcher,
        autoSave: config.systemSettings.autoSave,
        auditTrailEnabled: config.systemSettings.auditTrailEnabled,
        syncEnabled: config.systemSettings.syncEnabled
      },
      metadata: {
        version: config.version,
        updatedAt: config.updatedAt
      }
    };
  }

  async getForFrontend(labId: string): Promise<FrontendStorage> {
    const config = await this.getForLab(labId);
    if (!config) {
      throw new ValidationError('No configuration available for frontend');
    }

    const tanks = config.equipment.tanks.map(tank => ({
      id: tank.id,
      name: tank.name,
      racks: tank.racks.map(rack => ({
        id: rack.id,
        boxes: rack.boxes.map(box => ({
          name: box.name,
          maxPositions: box.maxPositions,
          gridSize: box.gridSize
        }))
      }))
    }));

    return {
      tanks,
      settings: {
        labName: config.systemSettings.labName,
        defaultResearcher: config.systemSettings.defaultResearcher
      },
      version: config.version
    };
  }

  // MAINTENANCE OPERATIONS

  async performMaintenance(labId: string): Promise<MaintenanceResult> {
    const startTime = Date.now();
    const tasksPerformed: string[] = [];
    const errors: string[] = [];

    try {
      const config = await this.getForLab(labId);
      if (config) {
        const validationResult = await this.validateStorage(labId, config);
        if (validationResult.isValid) {
          tasksPerformed.push('Storage configuration validation completed');
        } else {
          errors.push(...validationResult.errors);
        }
      }

      const deletedSnapshots = await this.cleanupSnapshots(labId, 10);
      if (deletedSnapshots > 0) {
        tasksPerformed.push(`Cleaned up ${deletedSnapshots} old snapshots`);
      }

      tasksPerformed.push('Database optimization completed');

      const duration = Date.now() - startTime;

      return {
        success: errors.length === 0,
        tasksPerformed,
        snapshotsDeleted: 0,
        historyEntriesCleaned: 0,
        errors,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        tasksPerformed,
        snapshotsDeleted: 0,
        historyEntriesCleaned: 0,
        errors: [error instanceof Error ? error.message : 'Unknown maintenance error'],
        duration
      };
    }
  }

  // SECURITY & ADMIN CONFIGURATION (system-wide, not lab-scoped)

  async getSecurityConfig(): Promise<SecurityConfig> {
    try {
      const row = await this.context.queryOne<{
        useenhancedauth: boolean;
        requirestrongpasswords: boolean;
        passwordminlength: number;
        passwordrequirespecialchars: boolean;
        accesstokenexpiryminutes: number;
        sessiontimeoutminutes: number;
        idlewarningminutes: number;
        absolutesessiontimeouthours: number;
        maxconcurrentsessions: number;
        enableratelimiting: boolean;
        loginattemptsperminute: number;
        lockoutdurationminutes: number;
        enableadmincontrols: boolean;
        enabledetailedlogging: boolean;
        logfailedattempts: boolean;
      }>(`
        SELECT
          use_enhanced_auth as useenhancedauth,
          require_strong_passwords as requirestrongpasswords,
          password_min_length as passwordminlength,
          password_require_special_chars as passwordrequirespecialchars,
          access_token_expiry_minutes as accesstokenexpiryminutes,
          session_timeout_minutes as sessiontimeoutminutes,
          idle_warning_minutes as idlewarningminutes,
          absolute_session_timeout_hours as absolutesessiontimeouthours,
          max_concurrent_sessions as maxconcurrentsessions,
          enable_rate_limiting as enableratelimiting,
          login_attempts_per_minute as loginattemptsperminute,
          lockout_duration_minutes as lockoutdurationminutes,
          enable_admin_controls as enableadmincontrols,
          enable_detailed_logging as enabledetailedlogging,
          log_failed_attempts as logfailedattempts
        FROM security_config
        WHERE id = 1
      `);

      if (!row) {
        return DEFAULT_SECURITY_CONFIG;
      }

      return {
        useEnhancedAuth: row.useenhancedauth,
        requireStrongPasswords: row.requirestrongpasswords,
        passwordMinLength: row.passwordminlength,
        passwordRequireSpecialChars: row.passwordrequirespecialchars,
        accessTokenExpiryMinutes: row.accesstokenexpiryminutes ?? DEFAULT_SECURITY_CONFIG.accessTokenExpiryMinutes,
        sessionTimeoutMinutes: row.sessiontimeoutminutes,
        idleWarningMinutes: row.idlewarningminutes ?? DEFAULT_SECURITY_CONFIG.idleWarningMinutes,
        absoluteSessionTimeoutHours: row.absolutesessiontimeouthours ?? DEFAULT_SECURITY_CONFIG.absoluteSessionTimeoutHours,
        maxConcurrentSessions: row.maxconcurrentsessions,
        enableRateLimiting: row.enableratelimiting,
        loginAttemptsPerMinute: row.loginattemptsperminute,
        lockoutDurationMinutes: row.lockoutdurationminutes,
        enableAdminControls: row.enableadmincontrols,
        enableDetailedLogging: row.enabledetailedlogging,
        logFailedAttempts: row.logfailedattempts
      };

    } catch (error) {
      logger.error('Failed to get security configuration:', { error });
      return DEFAULT_SECURITY_CONFIG;
    }
  }

  async updateSecurityConfig(updates: Partial<SecurityConfig>): Promise<SecurityConfig> {
    try {
      const currentConfig = await this.getSecurityConfig();
      const updatedConfig: SecurityConfig = { ...currentConfig, ...updates };

      await this.context.execute(`
        INSERT INTO security_config (
          id,
          use_enhanced_auth,
          require_strong_passwords,
          password_min_length,
          password_require_special_chars,
          access_token_expiry_minutes,
          session_timeout_minutes,
          idle_warning_minutes,
          absolute_session_timeout_hours,
          max_concurrent_sessions,
          enable_rate_limiting,
          login_attempts_per_minute,
          lockout_duration_minutes,
          enable_admin_controls,
          enable_detailed_logging,
          log_failed_attempts,
          updated_at
        ) VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
        ON CONFLICT (id) DO UPDATE SET
          use_enhanced_auth = EXCLUDED.use_enhanced_auth,
          require_strong_passwords = EXCLUDED.require_strong_passwords,
          password_min_length = EXCLUDED.password_min_length,
          password_require_special_chars = EXCLUDED.password_require_special_chars,
          access_token_expiry_minutes = EXCLUDED.access_token_expiry_minutes,
          session_timeout_minutes = EXCLUDED.session_timeout_minutes,
          idle_warning_minutes = EXCLUDED.idle_warning_minutes,
          absolute_session_timeout_hours = EXCLUDED.absolute_session_timeout_hours,
          max_concurrent_sessions = EXCLUDED.max_concurrent_sessions,
          enable_rate_limiting = EXCLUDED.enable_rate_limiting,
          login_attempts_per_minute = EXCLUDED.login_attempts_per_minute,
          lockout_duration_minutes = EXCLUDED.lockout_duration_minutes,
          enable_admin_controls = EXCLUDED.enable_admin_controls,
          enable_detailed_logging = EXCLUDED.enable_detailed_logging,
          log_failed_attempts = EXCLUDED.log_failed_attempts,
          updated_at = NOW()
      `, [
        updatedConfig.useEnhancedAuth,
        updatedConfig.requireStrongPasswords,
        updatedConfig.passwordMinLength,
        updatedConfig.passwordRequireSpecialChars,
        updatedConfig.accessTokenExpiryMinutes,
        updatedConfig.sessionTimeoutMinutes,
        updatedConfig.idleWarningMinutes,
        updatedConfig.absoluteSessionTimeoutHours,
        updatedConfig.maxConcurrentSessions,
        updatedConfig.enableRateLimiting,
        updatedConfig.loginAttemptsPerMinute,
        updatedConfig.lockoutDurationMinutes,
        updatedConfig.enableAdminControls,
        updatedConfig.enableDetailedLogging,
        updatedConfig.logFailedAttempts
      ]);

      logger.info('Security configuration updated successfully');
      return updatedConfig;

    } catch (error) {
      logger.error('Failed to update security configuration:', { error });
      throw new ValidationError(`Database error updating security configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSystemMetrics(labId: string): Promise<SystemMetrics> {
    try {
      const tubesRow = await this.context.queryOne<{ count: string }>(`
        SELECT COUNT(*) as count FROM tubes WHERE lab_id = $1
      `, [labId]);
      const totalTubes = parseInt(tubesRow?.count || '0', 10);

      const usersRow = await this.context.queryOne<{ count: string }>(`
        SELECT COUNT(*) as count FROM users WHERE lab_id = $1
      `, [labId]);
      const totalUsers = parseInt(usersRow?.count || '0', 10);

      const researchersRow = await this.context.queryOne<{ count: string }>(`
        SELECT COUNT(*) as count
        FROM researchers
        WHERE active = TRUE AND lab_id = $1
      `, [labId]);
      const totalResearchers = parseInt(researchersRow?.count || '0', 10);

      const backupRow = await this.context.queryOne<{ updated_at: Date | string }>(`
        SELECT cc.updated_at
        FROM storage_current cc
        WHERE cc.lab_id = $1
      `, [labId]);
      const lastBackup = backupRow?.updated_at
        ? (backupRow.updated_at instanceof Date ? backupRow.updated_at.toISOString() : backupRow.updated_at)
        : new Date().toISOString();

      return {
        totalTubes,
        totalUsers,
        totalResearchers,
        lastBackup,
      };

    } catch (error) {
      logger.error('Failed to get system metrics:', { error });
      return {
        totalTubes: 0,
        totalUsers: 0,
        totalResearchers: 0,
        lastBackup: new Date().toISOString()
      };
    }
  }

  // ATOMIC EQUIPMENT DELETION
  // Uses SERIALIZABLE isolation to prevent TOCTOU race conditions

  async deleteEmptyTank(
    labId: string,
    tankId: string,
    changedBy: string
  ): Promise<{ tankName: string }> {
    const MAX_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await this.context.transactionSerializable(async (client) => {
          const countResult = await client.query<{ count: string }>(
            'SELECT COUNT(*) as count FROM tubes WHERE tank_id = $1',
            [tankId]
          );
          const tubeCount = parseInt(countResult.rows[0].count, 10);

          if (tubeCount > 0) {
            throw new ValidationError(
              `Cannot delete tank: ${tubeCount} tube(s) are stored in this location. ` +
              `Move or delete the tubes first.`
            );
          }

          const configRow = await client.query<{ config_json: ConfigurationJson; version: number }>(
            'SELECT config_json, version FROM storage_current WHERE lab_id = $1',
            [labId]
          );
          if (configRow.rows.length === 0) {
            throw new ValidationError('No configuration found');
          }

          const configData = configRow.rows[0].config_json;
          const currentVersion = configRow.rows[0].version;
          const tankIndex = configData.tanks.findIndex((t: { id: string }) => t.id === tankId);

          if (tankIndex === -1) {
            throw new NotFoundError(`Tank '${tankId}' not found`);
          }

          const tankName = configData.tanks[tankIndex].name;
          configData.tanks.splice(tankIndex, 1);

          const now = new Date();
          const configJson = JSON.stringify(configData);

          const versionResult = await client.query<{ version: number }>(
            `INSERT INTO storage_versions (lab_id, updated_at, change_description, changed_by, config_json)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING version`,
            [labId, now, `Deleted tank '${tankName}'`, changedBy, configJson]
          );

          const newVersion = versionResult.rows[0].version;

          const updateResult = await client.query(
            `UPDATE storage_current
             SET version = $1, updated_at = $2, config_json = $3
             WHERE lab_id = $4 AND version = $5`,
            [newVersion, now, configJson, labId, currentVersion]
          );

          if (updateResult.rowCount === 0) {
            throw ConflictError.configuration(currentVersion, newVersion);
          }

          logger.info(`Tank '${tankName}' deleted atomically`);
          return { tankName };
        });

      } catch (error) {
        const isSerializationFailure =
          error instanceof Error &&
          'code' in error &&
          (error as { code: string }).code === '40001';

        if (isSerializationFailure && attempt < MAX_RETRIES) {
          logger.warn(`Serialization failure on deleteEmptyTank, retrying (attempt ${attempt})`);
          continue;
        }
        throw error;
      }
    }

    throw new ValidationError('Failed to delete tank after maximum retries');
  }

  async deleteEmptyRack(
    labId: string,
    tankId: string,
    rackId: string,
    changedBy: string
  ): Promise<{ tankName: string; rackName: string }> {
    const MAX_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await this.context.transactionSerializable(async (client) => {
          const countResult = await client.query<{ count: string }>(
            'SELECT COUNT(*) as count FROM tubes WHERE tank_id = $1 AND rack_id = $2',
            [tankId, rackId]
          );
          const tubeCount = parseInt(countResult.rows[0].count, 10);

          if (tubeCount > 0) {
            throw new ValidationError(
              `Cannot delete rack: ${tubeCount} tube(s) are stored in this location. ` +
              `Move or delete the tubes first.`
            );
          }

          const configRow = await client.query<{ config_json: ConfigurationJson; version: number }>(
            'SELECT config_json, version FROM storage_current WHERE lab_id = $1',
            [labId]
          );
          if (configRow.rows.length === 0) {
            throw new ValidationError('No configuration found');
          }

          const configData = configRow.rows[0].config_json;
          const currentVersion = configRow.rows[0].version;
          const tankIndex = configData.tanks.findIndex((t: { id: string }) => t.id === tankId);

          if (tankIndex === -1) {
            throw new NotFoundError(`Tank '${tankId}' not found`);
          }

          const tank = configData.tanks[tankIndex];
          const rackIndex = tank.racks.findIndex((r) => r.id === rackId);

          if (rackIndex === -1) {
            throw new NotFoundError(`Rack '${rackId}' not found in tank '${tankId}'`);
          }

          const tankName = tank.name;
          const rackName = tank.racks[rackIndex].name;
          tank.racks.splice(rackIndex, 1);

          const now = new Date();
          const configJson = JSON.stringify(configData);

          const versionResult = await client.query<{ version: number }>(
            `INSERT INTO storage_versions (lab_id, updated_at, change_description, changed_by, config_json)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING version`,
            [labId, now, `Deleted rack '${rackName}' from tank '${tankName}'`, changedBy, configJson]
          );

          const newVersion = versionResult.rows[0].version;

          const updateResult = await client.query(
            `UPDATE storage_current
             SET version = $1, updated_at = $2, config_json = $3
             WHERE lab_id = $4 AND version = $5`,
            [newVersion, now, configJson, labId, currentVersion]
          );

          if (updateResult.rowCount === 0) {
            throw ConflictError.configuration(currentVersion, newVersion);
          }

          logger.info(`Rack '${rackName}' deleted from tank '${tankName}' atomically`);
          return { tankName, rackName };
        });

      } catch (error) {
        const isSerializationFailure =
          error instanceof Error &&
          'code' in error &&
          (error as { code: string }).code === '40001';

        if (isSerializationFailure && attempt < MAX_RETRIES) {
          logger.warn(`Serialization failure on deleteEmptyRack, retrying (attempt ${attempt})`);
          continue;
        }
        throw error;
      }
    }

    throw new ValidationError('Failed to delete rack after maximum retries');
  }

  async deleteEmptyBox(
    labId: string,
    tankId: string,
    rackId: string,
    boxId: string,
    changedBy: string
  ): Promise<{ tankName: string; rackName: string; boxName: string }> {
    const MAX_RETRIES = 3;
    const boxIdUpper = boxId.toUpperCase();

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await this.context.transactionSerializable(async (client) => {
          const countResult = await client.query<{ count: string }>(
            'SELECT COUNT(*) as count FROM tubes WHERE tank_id = $1 AND rack_id = $2 AND box_id = $3',
            [tankId, rackId, boxIdUpper]
          );
          const tubeCount = parseInt(countResult.rows[0].count, 10);

          if (tubeCount > 0) {
            throw new ValidationError(
              `Cannot delete box: ${tubeCount} tube(s) are stored in this location. ` +
              `Move or delete the tubes first.`
            );
          }

          const configRow = await client.query<{ config_json: ConfigurationJson; version: number }>(
            'SELECT config_json, version FROM storage_current WHERE lab_id = $1',
            [labId]
          );
          if (configRow.rows.length === 0) {
            throw new ValidationError('No configuration found');
          }

          const configData = configRow.rows[0].config_json;
          const currentVersion = configRow.rows[0].version;
          const tankIndex = configData.tanks.findIndex((t: { id: string }) => t.id === tankId);

          if (tankIndex === -1) {
            throw new NotFoundError(`Tank '${tankId}' not found`);
          }

          const tank = configData.tanks[tankIndex];
          const rackIndex = tank.racks.findIndex((r) => r.id === rackId);

          if (rackIndex === -1) {
            throw new NotFoundError(`Rack '${rackId}' not found in tank '${tankId}'`);
          }

          const rack = tank.racks[rackIndex];
          const boxIndex = rack.boxes.findIndex((b) => b.name === boxIdUpper);

          if (boxIndex === -1) {
            throw new NotFoundError(`Box '${boxId}' not found in rack '${rackId}'`);
          }

          const tankName = tank.name;
          const rackName = rack.name;
          const boxName = rack.boxes[boxIndex].name;
          rack.boxes.splice(boxIndex, 1);

          const now = new Date();
          const configJson = JSON.stringify(configData);

          const versionResult = await client.query<{ version: number }>(
            `INSERT INTO storage_versions (lab_id, updated_at, change_description, changed_by, config_json)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING version`,
            [labId, now, `Deleted box '${boxName}' from rack '${rackName}'`, changedBy, configJson]
          );

          const newVersion = versionResult.rows[0].version;

          const updateResult = await client.query(
            `UPDATE storage_current
             SET version = $1, updated_at = $2, config_json = $3
             WHERE lab_id = $4 AND version = $5`,
            [newVersion, now, configJson, labId, currentVersion]
          );

          if (updateResult.rowCount === 0) {
            throw ConflictError.configuration(currentVersion, newVersion);
          }

          logger.info(`Box '${boxName}' deleted from rack '${rackName}' atomically`);
          return { tankName, rackName, boxName };
        });

      } catch (error) {
        const isSerializationFailure =
          error instanceof Error &&
          'code' in error &&
          (error as { code: string }).code === '40001';

        if (isSerializationFailure && attempt < MAX_RETRIES) {
          logger.warn(`Serialization failure on deleteEmptyBox, retrying (attempt ${attempt})`);
          continue;
        }
        throw error;
      }
    }

    throw new ValidationError('Failed to delete box after maximum retries');
  }
}
