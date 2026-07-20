/**
 * Storage Repository
 *
 * Data access for lab-scoped storage equipment configuration with versioning and optimistic locking.
 */

import { DEFAULT_SECURITY_CONFIG } from '@odysseus/shared-schemas';

import { Storage } from '@domain/entities/Storage';
import { ConflictError } from '@domain/errors/ConflictError';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { ValidationError } from '@domain/errors/ValidationError';
import type {
  StorageRepository as IStorageRepository,
  StorageHistory,
} from '@domain/repositories/StorageRepository';
import type { Box } from '@domain/value-objects/Equipment';
import type { Location } from '@domain/value-objects/Location';
import { parseCount, toDate } from '@infrastructure/database/PostgresContext';
import type { Queryable } from '@infrastructure/database/Queryable';
import { logger } from '@infrastructure/logging/logger';

import type { SecurityConfig, SystemMetrics } from '@odysseus/shared-schemas';
import type { PoolClient } from 'pg';

type ConfigurationJson = Parameters<typeof Storage.fromData>[0];

const MAX_SERIALIZATION_RETRIES = 3;

export class StorageRepository implements IStorageRepository {
  constructor(private context: Queryable) {}

  async getForLab(labId: string): Promise<Storage | null> {
    try {
      const row = await this.context.queryOne<{
        config_json: ConfigurationJson;
        version: number;
        updated_at: Date | string;
      }>(
        `
        SELECT config_json, version, updated_at
        FROM storage_current
        WHERE lab_id = $1
      `,
        [labId]
      );

      if (!row) {
        return null;
      }

      return Storage.fromData({ ...row.config_json, version: row.version });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to get configuration for lab:', { labId, message: errorMessage });
      throw new ValidationError('Unable to load the storage configuration. Please try again.');
    }
  }

  async getForLabs(labIds: string[]): Promise<Map<string, Storage>> {
    if (labIds.length === 0) return new Map();
    try {
      const placeholders = labIds.map((_, i) => `$${i + 1}`).join(', ');
      const rows = await this.context.queryMany<{
        lab_id: string;
        config_json: ConfigurationJson;
        version: number;
      }>(
        `
        SELECT lab_id, config_json, version
        FROM storage_current
        WHERE lab_id IN (${placeholders})
      `,
        labIds
      );
      return new Map(
        rows.map(r => [r.lab_id, Storage.fromData({ ...r.config_json, version: r.version })])
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to get configurations for labs:', { labIds, message: errorMessage });
      throw new ValidationError('Unable to load storage configurations. Please try again.');
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

    await this.context.transaction(async client => {
      const version = await this.insertStorageVersion(
        client,
        labId,
        now,
        'Default configuration created',
        'system',
        configJson
      );

      await client.query(
        `INSERT INTO storage_current (lab_id, version, updated_at, config_json)
         VALUES ($1, $2, $3, $4)`,
        [labId, version, now, configJson]
      );
    });

    return defaultConfig;
  }

  async getByVersion(labId: string, version: number): Promise<Storage | null> {
    try {
      const row = await this.context.queryOne<{ config_json: ConfigurationJson }>(
        `
        SELECT config_json
        FROM storage_versions
        WHERE lab_id = $1 AND version = $2
      `,
        [labId, version]
      );

      if (!row) {
        return null;
      }

      return Storage.fromData(row.config_json);
    } catch (error) {
      logger.error('Failed to get configuration by version:', { error, labId, version });
      throw new ValidationError('Unable to load that configuration version. Please try again.');
    }
  }

  async getHistory(labId: string, limit: number = 50): Promise<StorageHistory[]> {
    try {
      const rows = await this.context.queryMany<{
        version: number;
        updated_at: Date | string;
        change_description: string;
        changed_by: string;
        config_json: ConfigurationJson;
      }>(
        `
        SELECT version, updated_at, change_description, changed_by, config_json
        FROM storage_versions
        WHERE lab_id = $1
        ORDER BY version DESC
        LIMIT $2
      `,
        [labId, limit]
      );

      return rows.map(row => ({
        version: row.version,
        timestamp: toDate(row.updated_at),
        changeDescription: row.change_description,
        changedBy: row.changed_by,
        storage: Storage.fromData(row.config_json),
      }));
    } catch (error) {
      logger.error('Failed to get configuration history:', { error, labId });
      throw new ValidationError('Unable to load configuration history. Please try again.');
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
      await this.context.transaction(async client => {
        const now = new Date();
        const configJson = JSON.stringify(configuration.toData());

        newVersion = await this.insertStorageVersion(
          client,
          labId,
          now,
          changeDescription,
          changedBy,
          configJson
        );

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

        logger.info(
          `Storage configuration saved with optimistic lock (v${expectedVersion} → v${newVersion}): ${changeDescription}`
        );
      });

      return newVersion;
    } catch (error) {
      if (error instanceof ConflictError) {
        throw error;
      }
      logger.error('Failed to save configuration with optimistic lock:', { error, labId });
      throw new ValidationError('Unable to save the configuration. Please try again.');
    }
  }

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

  async getMaxPosition(
    labId: string,
    tankId: string,
    rackId: string,
    boxId: string
  ): Promise<number> {
    const box = await this.getBoxByName(labId, tankId, rackId, boxId);
    return box ? box.maxPositions : 0;
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.context.queryOne<{ result: number }>('SELECT 1 as result');
      return true;
    } catch {
      return false;
    }
  }

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
          enable_admin_controls as enableadmincontrols
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
        accessTokenExpiryMinutes:
          row.accesstokenexpiryminutes ?? DEFAULT_SECURITY_CONFIG.accessTokenExpiryMinutes,
        sessionTimeoutMinutes: row.sessiontimeoutminutes,
        idleWarningMinutes: row.idlewarningminutes ?? DEFAULT_SECURITY_CONFIG.idleWarningMinutes,
        absoluteSessionTimeoutHours:
          row.absolutesessiontimeouthours ?? DEFAULT_SECURITY_CONFIG.absoluteSessionTimeoutHours,
        maxConcurrentSessions: row.maxconcurrentsessions,
        enableRateLimiting: row.enableratelimiting,
        loginAttemptsPerMinute: row.loginattemptsperminute,
        lockoutDurationMinutes: row.lockoutdurationminutes,
        enableAdminControls: row.enableadmincontrols,
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

      await this.context.execute(
        `
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
          updated_at
        ) VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
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
          updated_at = NOW()
      `,
        [
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
        ]
      );

      logger.info('Security configuration updated successfully');
      return updatedConfig;
    } catch (error) {
      logger.error('Failed to update security configuration:', { error });
      throw new ValidationError('Unable to update security settings. Please try again.');
    }
  }

  async getSystemMetrics(labId: string): Promise<SystemMetrics> {
    try {
      const tubesRow = await this.context.queryOne<{ count: string }>(
        `
        SELECT COUNT(*) as count FROM tubes WHERE lab_id = $1
      `,
        [labId]
      );
      const totalTubes = parseCount(tubesRow);

      const usersRow = await this.context.queryOne<{ count: string }>(
        `
        SELECT COUNT(*) as count FROM users WHERE lab_id = $1
      `,
        [labId]
      );
      const totalUsers = parseCount(usersRow);

      const researchersRow = await this.context.queryOne<{ count: string }>(
        `
        SELECT COUNT(*) as count
        FROM researchers
        WHERE active = TRUE AND lab_id = $1
      `,
        [labId]
      );
      const totalResearchers = parseCount(researchersRow);

      const backupRow = await this.context.queryOne<{ updated_at: Date | string }>(
        `
        SELECT cc.updated_at
        FROM storage_current cc
        WHERE cc.lab_id = $1
      `,
        [labId]
      );
      const lastBackup = backupRow?.updated_at ? new Date(backupRow.updated_at) : new Date();

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
        lastBackup: new Date(),
      };
    }
  }

  async deleteEmptyTank(
    labId: string,
    tankId: string,
    changedBy: string
  ): Promise<{ tankName: string }> {
    return this.deleteEquipmentAtomically(
      'SELECT COUNT(*) as count FROM tubes WHERE tank_id = $1',
      [tankId],
      labId,
      changedBy,
      configData => {
        const tankIndex = configData.tanks.findIndex((t: { id: string }) => t.id === tankId);
        if (tankIndex === -1) throw new NotFoundError('The selected tank could not be found.');
        const tankName = configData.tanks[tankIndex].name;
        configData.tanks.splice(tankIndex, 1);
        return { description: `Deleted tank '${tankName}'`, result: { tankName } };
      }
    );
  }

  async deleteEmptyRack(
    labId: string,
    tankId: string,
    rackId: string,
    changedBy: string
  ): Promise<{ tankName: string; rackName: string }> {
    return this.deleteEquipmentAtomically(
      'SELECT COUNT(*) as count FROM tubes WHERE tank_id = $1 AND rack_id = $2',
      [tankId, rackId],
      labId,
      changedBy,
      configData => {
        const tankIndex = configData.tanks.findIndex((t: { id: string }) => t.id === tankId);
        if (tankIndex === -1) throw new NotFoundError('The selected tank could not be found.');

        const tank = configData.tanks[tankIndex];
        const rackIndex = tank.racks.findIndex(r => r.id === rackId);
        if (rackIndex === -1)
          throw new NotFoundError('That rack could not be found in the selected tank.');

        const tankName = tank.name;
        const rackName = tank.racks[rackIndex].name;
        tank.racks.splice(rackIndex, 1);
        return {
          description: `Deleted rack '${rackName}' from tank '${tankName}'`,
          result: { tankName, rackName },
        };
      }
    );
  }

  async deleteEmptyBox(
    labId: string,
    tankId: string,
    rackId: string,
    boxId: string,
    changedBy: string
  ): Promise<{ tankName: string; rackName: string; boxName: string }> {
    const boxIdUpper = boxId.toUpperCase();

    return this.deleteEquipmentAtomically(
      'SELECT COUNT(*) as count FROM tubes WHERE tank_id = $1 AND rack_id = $2 AND box_id = $3',
      [tankId, rackId, boxIdUpper],
      labId,
      changedBy,
      configData => {
        const tankIndex = configData.tanks.findIndex((t: { id: string }) => t.id === tankId);
        if (tankIndex === -1) throw new NotFoundError('The selected tank could not be found.');

        const tank = configData.tanks[tankIndex];
        const rackIndex = tank.racks.findIndex(r => r.id === rackId);
        if (rackIndex === -1)
          throw new NotFoundError('That rack could not be found in the selected tank.');

        const rack = tank.racks[rackIndex];
        const boxIndex = rack.boxes.findIndex(b => b.name === boxIdUpper);
        if (boxIndex === -1)
          throw new NotFoundError('That box could not be found in the selected rack.');

        const tankName = tank.name;
        const rackName = rack.name;
        const boxName = rack.boxes[boxIndex].name;
        rack.boxes.splice(boxIndex, 1);
        return {
          description: `Deleted box '${boxName}' from rack '${rackName}'`,
          result: { tankName, rackName, boxName },
        };
      }
    );
  }

  // Shared serializable transaction for atomic equipment deletion with retry on serialization failure
  private async deleteEquipmentAtomically<T>(
    tubeCountQuery: string,
    tubeCountParams: string[],
    labId: string,
    changedBy: string,
    spliceEquipment: (configData: ConfigurationJson) => { description: string; result: T }
  ): Promise<T> {
    for (let attempt = 1; attempt <= MAX_SERIALIZATION_RETRIES; attempt++) {
      try {
        return await this.context.transactionSerializable(async client => {
          const countResult = await client.query<{ count: string }>(
            tubeCountQuery,
            tubeCountParams
          );
          const tubeCount = parseCount(countResult.rows[0]);

          if (tubeCount > 0) {
            throw new ValidationError(
              `Cannot delete equipment: ${tubeCount} tube(s) are stored in this location. ` +
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
          const { description, result } = spliceEquipment(configData);

          const now = new Date();
          const configJson = JSON.stringify(configData);

          const newVersion = await this.insertStorageVersion(
            client,
            labId,
            now,
            description,
            changedBy,
            configJson
          );

          const updateResult = await client.query(
            `UPDATE storage_current
             SET version = $1, updated_at = $2, config_json = $3
             WHERE lab_id = $4 AND version = $5`,
            [newVersion, now, configJson, labId, currentVersion]
          );

          if (updateResult.rowCount === 0) {
            throw ConflictError.configuration(currentVersion, newVersion);
          }

          logger.info(`${description} atomically`);
          return result;
        });
      } catch (error) {
        const isSerializationFailure =
          error instanceof Error && 'code' in error && (error as { code: string }).code === '40001';

        if (isSerializationFailure && attempt < MAX_SERIALIZATION_RETRIES) {
          logger.warn(`Serialization failure on equipment deletion, retrying (attempt ${attempt})`);
          continue;
        }
        throw error;
      }
    }

    throw new ValidationError(
      'Could not delete this item because it is being changed by someone else. Please refresh and try again.'
    );
  }

  /** Appends a new immutable row to storage_versions and returns its generated version number. */
  private async insertStorageVersion(
    client: PoolClient,
    labId: string,
    timestamp: Date,
    changeDescription: string,
    changedBy: string,
    configJson: string
  ): Promise<number> {
    const versionResult = await client.query<{ version: number }>(
      `INSERT INTO storage_versions (lab_id, updated_at, change_description, changed_by, config_json)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING version`,
      [labId, timestamp, changeDescription, changedBy, configJson]
    );
    return versionResult.rows[0].version;
  }

  private async getBoxByName(
    labId: string,
    tankId: string,
    rackId: string,
    boxId: string
  ): Promise<Box | null> {
    const config = await this.getForLab(labId);
    if (!config) return null;

    const tank = config.equipment.tanks.find(t => t.id === tankId);
    if (!tank) return null;

    const rack = tank.racks.find(r => r.id === rackId);
    if (!rack) return null;

    return rack.boxes.find(box => box.name.toLowerCase() === boxId.toLowerCase()) ?? null;
  }
}
