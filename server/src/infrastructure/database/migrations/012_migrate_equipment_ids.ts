/**
 * Migration 012 — Migrate Equipment IDs
 *
 * Replaces numeric tank/rack IDs with generated string IDs across tubes and storage config.
 * Runs per-lab in independent transactions. Idempotent: skips labs whose IDs already start with `tank_`.
 */

import { generateId } from '@domain/utils/generateId';
import { logger } from '@infrastructure/logging/logger';

import type { Migration } from './migrationRunner';
import type { Pool } from 'pg';

export const migration012: Migration = {
  id: 12,
  name: 'migrate_equipment_ids',
  async up(pool: Pool): Promise<void> {
    const labs = await pool.query('SELECT id FROM labs ORDER BY created_at');

    for (const lab of labs.rows) {
      const labId = lab.id as string;

      const configRow = await pool.query(
        'SELECT config_json FROM storage_current WHERE lab_id = $1',
        [labId]
      );
      if (configRow.rows.length === 0) continue;

      const configJson = configRow.rows[0].config_json;
      if (!configJson?.tanks || configJson.tanks.length === 0) continue;

      const alreadyMigrated = configJson.tanks.every((t: { id: string }) =>
        t.id.startsWith('tank_')
      );
      if (alreadyMigrated) continue;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const tankIdMap = new Map<string, string>();
        const rackIdMap = new Map<string, Map<string, string>>();

        for (const tank of configJson.tanks) {
          const oldTankId = tank.id as string;
          const newTankId = generateId('tank');
          tankIdMap.set(oldTankId, newTankId);

          const rackMap = new Map<string, string>();
          rackIdMap.set(oldTankId, rackMap);

          for (const rack of tank.racks || []) {
            const oldRackId = String(rack.id);
            const newRackId = generateId('rack');
            rackMap.set(oldRackId, newRackId);
          }
        }

        for (const [oldTankId, newTankId] of tankIdMap) {
          const rackMap = rackIdMap.get(oldTankId)!;
          for (const [oldRackId, newRackId] of rackMap) {
            await client.query(
              'UPDATE tubes SET tank_id = $1, rack_id = $2 WHERE lab_id = $3 AND tank_id = $4 AND rack_id = $5',
              [newTankId, newRackId, labId, oldTankId, oldRackId]
            );
          }
        }

        const updatedConfig = JSON.parse(JSON.stringify(configJson));
        for (const tank of updatedConfig.tanks) {
          const rackMap = rackIdMap.get(tank.id);
          if (rackMap) {
            for (const rack of tank.racks || []) {
              const newRackId = rackMap.get(String(rack.id));
              if (newRackId) rack.id = newRackId;
            }
          }
          const newTankId = tankIdMap.get(tank.id);
          if (newTankId) tank.id = newTankId;
        }

        await client.query('UPDATE storage_current SET config_json = $1 WHERE lab_id = $2', [
          JSON.stringify(updatedConfig),
          labId,
        ]);

        const versions = await client.query(
          'SELECT version, config_json FROM storage_versions WHERE lab_id = $1',
          [labId]
        );
        for (const ver of versions.rows) {
          const verConfig = ver.config_json;
          if (!verConfig?.tanks) continue;
          for (const tank of verConfig.tanks) {
            const rackMap = rackIdMap.get(tank.id);
            if (rackMap) {
              for (const rack of tank.racks || []) {
                const newRackId = rackMap.get(String(rack.id));
                if (newRackId) rack.id = newRackId;
              }
            }
            const newTankId = tankIdMap.get(tank.id);
            if (newTankId) tank.id = newTankId;
          }
          await client.query('UPDATE storage_versions SET config_json = $1 WHERE version = $2', [
            JSON.stringify(verConfig),
            ver.version,
          ]);
        }

        const snapshots = await client.query(
          'SELECT id, config_json FROM storage_snapshots WHERE lab_id = $1',
          [labId]
        );
        for (const snap of snapshots.rows) {
          const snapConfig = snap.config_json;
          if (!snapConfig?.tanks) continue;
          for (const tank of snapConfig.tanks) {
            const rackMap = rackIdMap.get(tank.id);
            if (rackMap) {
              for (const rack of tank.racks || []) {
                const newRackId = rackMap.get(String(rack.id));
                if (newRackId) rack.id = newRackId;
              }
            }
            const newTankId = tankIdMap.get(tank.id);
            if (newTankId) tank.id = newTankId;
          }
          await client.query('UPDATE storage_snapshots SET config_json = $1 WHERE id = $2', [
            JSON.stringify(snapConfig),
            snap.id,
          ]);
        }

        await client.query('COMMIT');
        logger.info(
          `Migrated equipment IDs for lab ${labId}: ${tankIdMap.size} tanks, ${[...rackIdMap.values()].reduce((sum, m) => sum + m.size, 0)} racks`
        );
      } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`Failed to migrate equipment IDs for lab ${labId}:`, error);
        throw error;
      } finally {
        client.release();
      }
    }
  },
};
