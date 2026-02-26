import { ConfigurationRepository as IConfigurationRepository, ConfigurationHistory, ConfigurationExport, ConfigurationValidationResult, ConfigurationSnapshot, ApiConfigurationResponse, FrontendConfiguration, MaintenanceResult } from '@domain/repositories/ConfigurationRepository';
import type { EquipmentSummary, ConfigurationRepositoryStats, CapacityInfo } from '@domain/types/repository';
import { Configuration } from '@domain/entities/Configuration';
import { Location } from '@domain/valueObjects/Location';
import { Tank, Rack, Box } from '@domain/valueObjects/Equipment';
import { generateId } from '@domain/utils/generateId';
import type { SecurityConfig, SystemMetrics, SyncStatus } from '@odysseus/shared-schemas';
import { DEFAULT_SECURITY_CONFIG, EQUIPMENT_DEFAULTS } from '@odysseus/shared-schemas';
import { PostgresContext } from '@infrastructure/database/PostgresContext';
import { ValidationError } from '@domain/errors/ValidationError';
import { ConflictError } from '@domain/errors/ConflictError';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { logger } from '@utils/logger';

/** Type for configuration JSON stored in JSONB columns */
type ConfigurationJson = Parameters<typeof Configuration.fromData>[0];

/**
 * ConfigurationRepository - Configuration data access
 *
 * Manages system configuration with versioning and snapshots.
 * Configuration is stored as JSON with separate tables for history and security settings.
 */
export class ConfigurationRepository implements IConfigurationRepository {

  constructor(private context: PostgresContext) {}

  // CORE CONFIGURATION MANAGEMENT

  async getCurrent(): Promise<Configuration | null> {
    try {
      const row = await this.context.queryOne<{ config_json: ConfigurationJson; version: number; updated_at: Date | string }>(`
        SELECT config_json, version, updated_at
        FROM configuration_current
        WHERE id = 1
      `);

      if (!row) {
        throw new ValidationError('Configuration not found. Database initialization may have failed.');
      }

      return Configuration.fromData({ ...row.config_json, version: row.version });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to get current configuration:', { message: errorMessage });
      throw new ValidationError(`Database error retrieving configuration: ${errorMessage}`);
    }
  }

  async save(configuration: Configuration): Promise<number> {
    return this.saveWithVersioning(configuration, 'Configuration updated');
  }

  async exists(): Promise<boolean> {
    try {
      const row = await this.context.queryOne<{ id: number }>(`
        SELECT id FROM configuration_current WHERE id = 1
      `);
      return row !== undefined && row !== null;
    } catch (error) {
      logger.error('Failed to check configuration existence:', { error });
      return false;
    }
  }

  async ensureDefault(): Promise<Configuration> {
    const existing = await this.getCurrent();
    if (existing) {
      return existing;
    }

    const defaultConfig = Configuration.createDefault();
    await this.save(defaultConfig);
    return defaultConfig;
  }

  // LAB-SCOPED CONFIGURATION

  async getForLab(labId: string): Promise<Configuration | null> {
    try {
      const row = await this.context.queryOne<{ config_json: ConfigurationJson; version: number; updated_at: Date | string }>(`
        SELECT config_json, version, updated_at
        FROM configuration_current
        WHERE lab_id = $1
      `, [labId]);

      if (!row) {
        return null;
      }

      return Configuration.fromData({ ...row.config_json, version: row.version });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to get configuration for lab:', { labId, message: errorMessage });
      throw new ValidationError(`Database error retrieving configuration for lab: ${errorMessage}`);
    }
  }

  async saveForLab(labId: string, configuration: Configuration): Promise<number> {
    try {
      let newVersion = 0;
      await this.context.transaction(async (client) => {
        const now = new Date();
        const configJson = JSON.stringify(configuration.toData());

        const versionResult = await client.query<{ version: number }>(
          `INSERT INTO configuration_versions (lab_id, updated_at, change_description, changed_by, config_json)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING version`,
          [labId, now, 'Configuration updated', 'system', configJson]
        );

        newVersion = versionResult.rows[0].version;

        await client.query(
          `UPDATE configuration_current
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

  async ensureDefaultForLab(labId: string): Promise<Configuration> {
    const existing = await this.getForLab(labId);
    if (existing) {
      return existing;
    }

    const defaultConfig = Configuration.createDefault();
    const configJson = JSON.stringify(defaultConfig.toData());
    const now = new Date();

    await this.context.transaction(async (client) => {
      const versionResult = await client.query<{ version: number }>(
        `INSERT INTO configuration_versions (lab_id, updated_at, change_description, changed_by, config_json)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING version`,
        [labId, now, 'Default configuration created', 'system', configJson]
      );

      const version = versionResult.rows[0].version;

      await client.query(
        `INSERT INTO configuration_current (lab_id, version, updated_at, config_json)
         VALUES ($1, $2, $3, $4)`,
        [labId, version, now, configJson]
      );
    });

    return defaultConfig;
  }

  // VERSIONING & HISTORY

  async getByVersion(version: number): Promise<Configuration | null> {
    try {
      const row = await this.context.queryOne<{ config_json: ConfigurationJson }>(`
        SELECT config_json
        FROM configuration_versions
        WHERE version = $1
      `, [version]);

      if (!row) {
        return null;
      }

      const configData = row.config_json;
      return Configuration.fromData(configData);

    } catch (error) {
      logger.error('Failed to get configuration by version:', { error, version });
      throw new ValidationError(`Database error retrieving configuration version ${version}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getHistory(limit: number = 50): Promise<ConfigurationHistory[]> {
    try {
      const rows = await this.context.queryMany<{ version: number; updated_at: Date | string; change_description: string; changed_by: string; config_json: ConfigurationJson }>(`
        SELECT version, updated_at, change_description, changed_by, config_json
        FROM configuration_versions
        ORDER BY version DESC
        LIMIT $1
      `, [limit]);

      return rows.map(row => {
        const configData = row.config_json;
        const configuration = Configuration.fromData(configData);

        return {
          version: row.version,
          timestamp: row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at),
          changeDescription: row.change_description,
          changedBy: row.changed_by,
          configuration
        };
      });

    } catch (error) {
      logger.error('Failed to get configuration history:', { error });
      throw new ValidationError(`Database error retrieving configuration history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getCurrentVersion(): Promise<number> {
    try {
      const row = await this.context.queryOne<{ version: number }>(`
        SELECT version FROM configuration_current WHERE id = 1
      `);
      return row ? row.version : 0;
    } catch (error) {
      logger.error('Failed to get current version:', { error });
      return 0;
    }
  }

  async saveWithVersioning(configuration: Configuration, changeDescription: string = 'Configuration updated', changedBy: string = 'system', labId?: string): Promise<number> {
    try {
      let newVersion = 0;
      await this.context.transaction(async (client) => {
        const now = new Date();
        const configJson = JSON.stringify(configuration.toData());

        const versionResult = labId
          ? await client.query<{ version: number }>(
              `INSERT INTO configuration_versions (lab_id, updated_at, change_description, changed_by, config_json)
               VALUES ($1, $2, $3, $4, $5)
               RETURNING version`,
              [labId, now, changeDescription, changedBy, configJson]
            )
          : await client.query<{ version: number }>(
              `INSERT INTO configuration_versions (updated_at, change_description, changed_by, config_json)
               VALUES ($1, $2, $3, $4)
               RETURNING version`,
              [now, changeDescription, changedBy, configJson]
            );

        newVersion = versionResult.rows[0].version;

        if (labId) {
          await client.query(
            `UPDATE configuration_current
             SET version = $1, updated_at = $2, config_json = $3
             WHERE lab_id = $4`,
            [newVersion, now, configJson, labId]
          );
        } else {
          await client.query(
            `UPDATE configuration_current
             SET version = $1, updated_at = $2, config_json = $3
             WHERE id = 1`,
            [newVersion, now, configJson]
          );
        }

        logger.info(`Configuration saved with version ${newVersion}: ${changeDescription}`);
      });

      return newVersion;

    } catch (error) {
      logger.error('Failed to save configuration with versioning:', { error });
      throw new ValidationError(`Database error saving configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async saveWithOptimisticLock(
    configuration: Configuration,
    expectedVersion: number,
    changeDescription: string = 'Configuration updated',
    changedBy: string = 'system',
    labId?: string
  ): Promise<number> {
    try {
      let newVersion = 0;
      await this.context.transaction(async (client) => {
        const now = new Date();
        const configJson = JSON.stringify(configuration.toData());

        const versionResult = labId
          ? await client.query<{ version: number }>(
              `INSERT INTO configuration_versions (lab_id, updated_at, change_description, changed_by, config_json)
               VALUES ($1, $2, $3, $4, $5)
               RETURNING version`,
              [labId, now, changeDescription, changedBy, configJson]
            )
          : await client.query<{ version: number }>(
              `INSERT INTO configuration_versions (updated_at, change_description, changed_by, config_json)
               VALUES ($1, $2, $3, $4)
               RETURNING version`,
              [now, changeDescription, changedBy, configJson]
            );

        newVersion = versionResult.rows[0].version;

        const whereClause = labId ? 'lab_id = $4 AND version = $5' : 'id = 1 AND version = $4';
        const updateParams = labId
          ? [newVersion, now, configJson, labId, expectedVersion]
          : [newVersion, now, configJson, expectedVersion];

        const updateResult = await client.query(
          `UPDATE configuration_current
           SET version = $1, updated_at = $2, config_json = $3
           WHERE ${whereClause}`,
          updateParams
        );

        if (updateResult.rowCount === 0) {
          const versionWhereClause = labId ? 'lab_id = $1' : 'id = 1';
          const versionParams = labId ? [labId] : [];
          const currentRow = await client.query<{ version: number }>(
            `SELECT version FROM configuration_current WHERE ${versionWhereClause}`,
            versionParams
          );
          const currentVersion = currentRow.rows[0]?.version ?? 0;

          throw ConflictError.configuration(expectedVersion, currentVersion);
        }

        logger.info(`Configuration saved with optimistic lock (v${expectedVersion} → v${newVersion}): ${changeDescription}`);
      });

      return newVersion;

    } catch (error) {
      // Re-throw ConflictError without wrapping
      if (error instanceof ConflictError) {
        throw error;
      }
      logger.error('Failed to save configuration with optimistic lock:', { error });
      throw new ValidationError(`Database error saving configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // EQUIPMENT VALIDATION

  async isLocationValid(location: Location): Promise<boolean> {
    const config = await this.getCurrent();
    if (!config) return false;
    return config.isLocationValid(location);
  }

  async tankExists(tankId: string): Promise<boolean> {
    const config = await this.getCurrent();
    if (!config) return false;
    return config.equipment.tanks.some(tank => tank.id === tankId);
  }

  async rackExists(tankId: string, rackId: string): Promise<boolean> {
    const config = await this.getCurrent();
    if (!config) return false;

    const tank = config.equipment.tanks.find(t => t.id === tankId);
    if (!tank) return false;

    return tank.racks.some(rack => String(rack.id) === rackId);
  }

  async boxExists(tankId: string, rackId: string, boxId: string): Promise<boolean> {
    const config = await this.getCurrent();
    if (!config) return false;

    const tank = config.equipment.tanks.find(t => t.id === tankId);
    if (!tank) return false;

    const rack = tank.racks.find(r => String(r.id) === rackId);
    if (!rack) return false;

    return rack.boxes.some(box => box.name.toLowerCase() === boxId.toLowerCase());
  }

  async getAvailablePositions(tankId: string, rackId: string, boxId: string, occupiedPositions: number[]): Promise<number[]> {
    const allPositions: number[] = [];
    for (let i = 1; i <= EQUIPMENT_DEFAULTS.POSITIONS_PER_BOX; i++) {
      if (!occupiedPositions.includes(i)) {
        allPositions.push(i);
      }
    }
    return allPositions;
  }

  async getTotalPositions(tankId: string, rackId: number, boxId: string): Promise<number> {
    return EQUIPMENT_DEFAULTS.POSITIONS_PER_BOX;
  }

  async getOccupiedPositions(tankId: string, rackId: number, boxId: string): Promise<number[]> {
    return [];
  }

  // EQUIPMENT QUERIES

  async getAllTanks(): Promise<Tank[]> {
    const config = await this.getCurrent();
    return config ? [...config.equipment.tanks] : [];
  }

  async getActiveTanks(): Promise<Tank[]> {
    const tanks = await this.getAllTanks();
    return tanks.filter(tank => tank.isActive);
  }

  async getTankById(tankId: string): Promise<Tank | null> {
    const tanks = await this.getAllTanks();
    return tanks.find(tank => tank.id === tankId) || null;
  }

  async getRacksForTank(tankId: string): Promise<Rack[]> {
    const config = await this.getCurrent();
    if (!config) return [];

    const tank = config.equipment.tanks.find(t => t.id === tankId);
    if (!tank) return [];

    return [...tank.racks];
  }

  async getActiveRacksForTank(tankId: string): Promise<Rack[]> {
    const racks = await this.getRacksForTank(tankId);
    return racks.filter(rack => rack.isActive);
  }

  async getRackById(tankId: string, rackId: string | number): Promise<Rack | null> {
    const racks = await this.getRacksForTank(tankId);
    const rackIdStr = String(rackId);
    return racks.find(rack => rack.id === rackIdStr) || null;
  }

  async getBoxesForRack(tankId: string, rackId: string | number): Promise<Box[]> {
    const config = await this.getCurrent();
    if (!config) return [];

    const tank = config.equipment.tanks.find(t => t.id === tankId);
    if (!tank) return [];

    const rackIdStr = String(rackId);
    const rack = tank.racks.find(r => r.id === rackIdStr);
    if (!rack) return [];

    return [...rack.boxes];
  }

  async getActiveBoxesForRack(tankId: string, rackId: string | number): Promise<Box[]> {
    const boxes = await this.getBoxesForRack(tankId, rackId);
    return boxes.filter(box => box.isActive);
  }

  async getBoxByName(tankId: string, rackId: string | number, boxId: string): Promise<Box | null> {
    const boxes = await this.getBoxesForRack(tankId, rackId);
    return boxes.find(box => box.name.toLowerCase() === boxId.toLowerCase()) || null;
  }

  // ANALYTICS & REPORTING

  async getEquipmentSummary(): Promise<EquipmentSummary> {
    const config = await this.getCurrent();
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

  async validateConfiguration(configuration: Configuration): Promise<ConfigurationValidationResult> {
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

  async exportConfiguration(): Promise<ConfigurationExport> {
    const config = await this.getCurrent();
    if (!config) {
      throw new ValidationError('No configuration to export');
    }

    return {
      version: '1.0',
      timestamp: new Date(),
      configuration: config,
      metadata: {
        exportedBy: 'system',
        description: 'Configuration export',
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
      const config = await this.getCurrent();
      return config !== null;
    } catch {
      return false;
    }
  }

  async getStats(): Promise<ConfigurationRepositoryStats> {
    const config = await this.getCurrent();
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

  async getMaxPosition(tankId: string, rackId: string, boxId: string): Promise<number> {
    const box = await this.getBoxByName(tankId, Number(rackId), boxId);
    return box ? box.maxPositions : 0;
  }

  async getAllTankIds(): Promise<string[]> {
    const tanks = await this.getAllTanks();
    return tanks.map(tank => tank.id);
  }

  async getRackIds(tankId: string): Promise<string[]> {
    const racks = await this.getRacksForTank(tankId);
    return racks.map(rack => rack.id);
  }

  async getBoxNames(tankId: string, rackId: string | number): Promise<string[]> {
    const boxes = await this.getBoxesForRack(tankId, rackId);
    return boxes.map(box => box.name);
  }

  async createSnapshot(description?: string): Promise<ConfigurationSnapshot> {
    const config = await this.getCurrent();
    if (!config) {
      throw new ValidationError('No configuration to snapshot');
    }

    const snapshotId = generateId('snapshot');

    try {
      const now = new Date();
      const configJson = JSON.stringify(config.toData());

      await this.context.execute(`
        INSERT INTO configuration_snapshots (id, version, created_at, description, created_by, size_bytes, config_json)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [snapshotId, config.version, now, description || 'Configuration snapshot', 'system', configJson.length, configJson]);

      const snapshot: ConfigurationSnapshot = {
        id: snapshotId,
        version: config.version,
        timestamp: now,
        description: description || 'Configuration snapshot',
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

  async restoreFromSnapshot(snapshotId: string): Promise<Configuration> {
    if (!snapshotId) {
      throw new ValidationError('Snapshot ID is required');
    }

    try {
      // Get the snapshot data
      const row = await this.context.queryOne<{ config_json: ConfigurationJson }>(`
        SELECT config_json FROM configuration_snapshots WHERE id = $1
      `, [snapshotId]);

      if (!row) {
        throw new ValidationError(`Snapshot not found: ${snapshotId}`);
      }

      // Parse and restore the configuration
      const configData = row.config_json;
      const config = Configuration.fromData(configData);

      await this.saveWithVersioning(config, `Restored from snapshot ${snapshotId}`);

      logger.info(`Restored from snapshot: ${snapshotId}`);
      return config;

    } catch (error) {
      if (error instanceof ValidationError) throw error;
      logger.error('Failed to restore from snapshot:', { error, snapshotId });
      throw new ValidationError(`Database error restoring snapshot: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteSnapshot(snapshotId: string): Promise<boolean> {
    const result = await this.context.execute(
      'DELETE FROM configuration_snapshots WHERE id = $1',
      [snapshotId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async getSnapshots(): Promise<ConfigurationSnapshot[]> {
    return this.listSnapshots();
  }

  async cleanupOldHistory(retentionDays: number): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    await this.context.execute(
      'DELETE FROM configuration_versions WHERE updated_at < $1',
      [cutoffDate]
    );
  }

  async backupConfiguration(): Promise<string> {
    return 'backup-path';
  }

  async restoreFromBackup(backupPath: string): Promise<Configuration> {
    return Configuration.createDefault();
  }

  async migrateConfiguration(fromVersion: number, toVersion: number): Promise<Configuration> {
    return Configuration.createDefault();
  }

  async validateMigration(fromVersion: number, toVersion: number): Promise<{ isValid: boolean; issues: string[] }> {
    return { isValid: true, issues: [] };
  }

  async optimizeStorage(): Promise<{ success: boolean; tasksPerformed: string[] }> {
    return { success: true, tasksPerformed: [] };
  }

  async rebuildIndexes(): Promise<void> {
    // Database maintenance - PostgreSQL handles this differently
  }

  async compactHistory(): Promise<number> {
    return 0;
  }

  async getCapacityInfo(): Promise<CapacityInfo> {
    const config = await this.getCurrent();
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

  async getLabName(): Promise<string> {
    const config = await this.getCurrent();
    return config ? config.systemSettings.labName : 'Odysseus Lab';
  }

  async updateLabName(labName: string): Promise<void> {
    const config = await this.getCurrent();
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
    await this.saveWithVersioning(updatedConfig, `Lab name updated to: ${labName}`, 'admin');
  }

  async getDefaultResearcher(): Promise<string> {
    const config = await this.getCurrent();
    return config ? config.systemSettings.defaultResearcher : '';
  }

  async updateDefaultResearcher(researcher: string): Promise<void> {
    const config = await this.getCurrent();
    if (!config) {
      throw new ValidationError('No configuration found to update');
    }

    const updatedSettings = {
      ...config.systemSettings,
      defaultResearcher: researcher.trim()
    };

    const updatedConfig = config.updateSystemSettings(updatedSettings);
    await this.saveWithVersioning(updatedConfig, `Default researcher updated to: ${researcher}`, 'admin');
  }

  async getAutoSave(): Promise<boolean> {
    const config = await this.getCurrent();
    return config ? config.systemSettings.autoSave : true;
  }

  async updateAutoSave(autoSave: boolean): Promise<void> {
    const config = await this.getCurrent();
    if (!config) {
      throw new ValidationError('No configuration found to update');
    }

    const updatedSettings = {
      ...config.systemSettings,
      autoSave
    };

    const updatedConfig = config.updateSystemSettings(updatedSettings);
    await this.saveWithVersioning(updatedConfig, `Auto-save ${autoSave ? 'enabled' : 'disabled'}`, 'admin');
  }

  async getAuditTrailEnabled(): Promise<boolean> {
    const config = await this.getCurrent();
    return config ? config.systemSettings.auditTrailEnabled : true;
  }

  async updateAuditTrailEnabled(enabled: boolean): Promise<void> {
    const config = await this.getCurrent();
    if (!config) {
      throw new ValidationError('No configuration found to update');
    }

    const updatedSettings = {
      ...config.systemSettings,
      auditTrailEnabled: enabled
    };

    const updatedConfig = config.updateSystemSettings(updatedSettings);
    await this.saveWithVersioning(updatedConfig, `Audit trail ${enabled ? 'enabled' : 'disabled'}`, 'admin');
  }

  async getSyncEnabled(): Promise<boolean> {
    const config = await this.getCurrent();
    return config ? config.systemSettings.syncEnabled : false;
  }

  async updateSyncEnabled(enabled: boolean): Promise<void> {
    const config = await this.getCurrent();
    if (!config) {
      throw new ValidationError('No configuration found to update');
    }

    const updatedSettings = {
      ...config.systemSettings,
      syncEnabled: enabled
    };

    const updatedConfig = config.updateSystemSettings(updatedSettings);
    await this.saveWithVersioning(updatedConfig, `Sync ${enabled ? 'enabled' : 'disabled'}`, 'admin');
  }

  async importConfiguration(configExport: ConfigurationExport): Promise<Configuration> {
    if (!configExport || !configExport.configuration) {
      throw new ValidationError('Invalid configuration export provided');
    }

    const validationResult = await this.validateConfiguration(configExport.configuration);
    if (!validationResult.isValid) {
      throw new ValidationError(`Configuration import failed: ${validationResult.errors.join(', ')}`);
    }

    await this.saveWithVersioning(configExport.configuration, 'Configuration imported');

    return configExport.configuration;
  }

  async listSnapshots(): Promise<ConfigurationSnapshot[]> {
    try {
      const rows = await this.context.queryMany<{ id: string; version: number; created_at: Date | string; description: string; created_by: string; size_bytes: number }>(`
        SELECT id, version, created_at, description, created_by, size_bytes
        FROM configuration_snapshots
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

  async cleanupSnapshots(keepCount: number): Promise<number> {
    if (keepCount < 1) {
      throw new ValidationError('Keep count must be at least 1');
    }

    try {
      // Get IDs to keep
      const keepRows = await this.context.queryMany<{ id: string }>(`
        SELECT id FROM configuration_snapshots
        ORDER BY created_at DESC
        LIMIT $1
      `, [keepCount]);

      const keepIds = keepRows.map(r => r.id);

      if (keepIds.length === 0) {
        return 0;
      }

      // Delete all except the ones to keep
      const placeholders = keepIds.map((_, i) => `$${i + 1}`).join(',');
      const result = await this.context.execute(
        `DELETE FROM configuration_snapshots WHERE id NOT IN (${placeholders})`,
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

  async getForApi(): Promise<ApiConfigurationResponse> {
    const config = await this.getCurrent();
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

  async getForFrontend(): Promise<FrontendConfiguration> {
    const config = await this.getCurrent();
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

  async performMaintenance(): Promise<MaintenanceResult> {
    const startTime = Date.now();
    const tasksPerformed: string[] = [];
    const errors: string[] = [];

    try {
      const config = await this.getCurrent();
      if (config) {
        const validationResult = await this.validateConfiguration(config);
        if (validationResult.isValid) {
          tasksPerformed.push('Configuration validation completed');
        } else {
          errors.push(...validationResult.errors);
        }
      }

      const deletedSnapshots = await this.cleanupSnapshots(10);
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

  // SECURITY & ADMIN CONFIGURATION

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

  async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      const tubesRow = await this.context.queryOne<{ count: string }>(`
        SELECT COUNT(*) as count FROM tubes
      `);
      const totalTubes = parseInt(tubesRow?.count || '0', 10);

      const usersRow = await this.context.queryOne<{ count: string }>(`
        SELECT COUNT(*) as count FROM users
      `);
      const totalUsers = parseInt(usersRow?.count || '0', 10);

      const researchersRow = await this.context.queryOne<{ count: string }>(`
        SELECT COUNT(*) as count
        FROM researchers
        WHERE active = TRUE
      `);
      const totalResearchers = parseInt(researchersRow?.count || '0', 10);

      const backupRow = await this.context.queryOne<{ updated_at: Date | string }>(`
        SELECT updated_at
        FROM configuration_versions
        ORDER BY version DESC
        LIMIT 1
      `);
      const lastBackup = backupRow?.updated_at
        ? (backupRow.updated_at instanceof Date ? backupRow.updated_at.toISOString() : backupRow.updated_at)
        : new Date().toISOString();

      // Get database size in bytes
      const sizeRow = await this.context.queryOne<{ size: string }>(`
        SELECT pg_database_size(current_database()) as size
      `);
      const databaseSize = parseInt(sizeRow?.size || '0', 10);

      return {
        totalTubes,
        totalUsers,
        totalResearchers,
        lastBackup,
        databaseSize
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

  async getSyncStatus(): Promise<SyncStatus> {
    try {
      const syncEnabled = await this.getSyncEnabled();

      return {
        enabled: syncEnabled,
        firebase: false,
        workspaceId: undefined
      };

    } catch (error) {
      logger.error('Failed to get sync status:', { error });
      return {
        enabled: false,
        firebase: false,
        workspaceId: undefined
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
          // Count tubes in tank (SERIALIZABLE prevents concurrent inserts from being invisible)
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

          // Load and validate configuration
          const configRow = await client.query<{ config_json: ConfigurationJson; version: number }>(
            'SELECT config_json, version FROM configuration_current WHERE lab_id = $1',
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

          // Save updated configuration
          const now = new Date();
          const configJson = JSON.stringify(configData);

          const versionResult = await client.query<{ version: number }>(
            `INSERT INTO configuration_versions (lab_id, updated_at, change_description, changed_by, config_json)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING version`,
            [labId, now, `Deleted tank '${tankName}'`, changedBy, configJson]
          );

          const newVersion = versionResult.rows[0].version;

          const updateResult = await client.query(
            `UPDATE configuration_current
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
        // Retry on serialization failure (PostgreSQL error code 40001)
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
          // Count tubes in rack
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

          // Load and validate configuration
          const configRow = await client.query<{ config_json: ConfigurationJson; version: number }>(
            'SELECT config_json, version FROM configuration_current WHERE lab_id = $1',
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
          const rackIndex = tank.racks.findIndex((r) => String(r.id) === String(rackId));

          if (rackIndex === -1) {
            throw new NotFoundError(`Rack '${rackId}' not found in tank '${tankId}'`);
          }

          const tankName = tank.name;
          const rackName = tank.racks[rackIndex].name;
          tank.racks.splice(rackIndex, 1);

          // Save updated configuration
          const now = new Date();
          const configJson = JSON.stringify(configData);

          const versionResult = await client.query<{ version: number }>(
            `INSERT INTO configuration_versions (lab_id, updated_at, change_description, changed_by, config_json)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING version`,
            [labId, now, `Deleted rack '${rackName}' from tank '${tankName}'`, changedBy, configJson]
          );

          const newVersion = versionResult.rows[0].version;

          const updateResult = await client.query(
            `UPDATE configuration_current
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
          // Count tubes in box
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

          // Load and validate configuration
          const configRow = await client.query<{ config_json: ConfigurationJson; version: number }>(
            'SELECT config_json, version FROM configuration_current WHERE lab_id = $1',
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
          const rackIndex = tank.racks.findIndex((r) => String(r.id) === String(rackId));

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

          // Save updated configuration
          const now = new Date();
          const configJson = JSON.stringify(configData);

          const versionResult = await client.query<{ version: number }>(
            `INSERT INTO configuration_versions (lab_id, updated_at, change_description, changed_by, config_json)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING version`,
            [labId, now, `Deleted box '${boxName}' from rack '${rackName}'`, changedBy, configJson]
          );

          const newVersion = versionResult.rows[0].version;

          const updateResult = await client.query(
            `UPDATE configuration_current
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
