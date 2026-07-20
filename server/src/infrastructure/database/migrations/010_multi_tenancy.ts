/**
 * Migration 010 — Multi-Tenancy
 *
 * Adds `labs` table, `lab_id` columns to all tenant-scoped tables, backfills existing data,
 * converts singleton constraints to per-lab, and creates multi-tenancy indexes.
 * This is the first migration that actually runs on prod.
 */

import { generateId } from '@domain/utils/generateId';

import type { Migration } from './migrationRunner';
import type { Pool } from 'pg';

export const migration010: Migration = {
  id: 10,
  name: 'multi_tenancy',
  async up(pool: Pool): Promise<void> {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS labs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        is_demo BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'labs' AND column_name = 'is_demo'
        ) THEN
          ALTER TABLE labs ADD COLUMN is_demo BOOLEAN NOT NULL DEFAULT FALSE;
        END IF;
      END $$
    `);

    const existingLabs = await pool.query('SELECT id FROM labs LIMIT 1');
    if (existingLabs.rows.length === 0) {
      const defaultLabId = generateId('lab');
      await pool.query(`INSERT INTO labs (id, name, slug) VALUES ($1, 'Lab 1', 'lab-1')`, [
        defaultLabId,
      ]);
    }

    const firstLab = await pool.query('SELECT id FROM labs ORDER BY created_at LIMIT 1');
    const backfillLabId = firstLab.rows[0]?.id;

    // Add lab_id columns (nullable initially for backfill)
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'lab_id'
        ) THEN
          ALTER TABLE users ADD COLUMN lab_id TEXT REFERENCES labs(id);
        END IF;
      END $$
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'researchers' AND column_name = 'lab_id'
        ) THEN
          ALTER TABLE researchers ADD COLUMN lab_id TEXT REFERENCES labs(id);
        END IF;
      END $$
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tubes' AND column_name = 'lab_id'
        ) THEN
          ALTER TABLE tubes ADD COLUMN lab_id TEXT REFERENCES labs(id);
        END IF;
      END $$
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'lookup_values' AND column_name = 'lab_id'
        ) THEN
          ALTER TABLE lookup_values ADD COLUMN lab_id TEXT REFERENCES labs(id);
        END IF;
      END $$
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'audit_log' AND column_name = 'lab_id'
        ) THEN
          ALTER TABLE audit_log ADD COLUMN lab_id TEXT;
        END IF;
      END $$
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'audit_log_archive' AND column_name = 'lab_id'
        ) THEN
          ALTER TABLE audit_log_archive ADD COLUMN lab_id TEXT;
        END IF;
      END $$
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'storage_current' AND column_name = 'lab_id'
        ) THEN
          ALTER TABLE storage_current ADD COLUMN lab_id TEXT REFERENCES labs(id);
        END IF;
      END $$
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'storage_versions' AND column_name = 'lab_id'
        ) THEN
          ALTER TABLE storage_versions ADD COLUMN lab_id TEXT REFERENCES labs(id);
        END IF;
      END $$
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'storage_snapshots' AND column_name = 'lab_id'
        ) THEN
          ALTER TABLE storage_snapshots ADD COLUMN lab_id TEXT REFERENCES labs(id);
        END IF;
      END $$
    `);

    // Backfill lab_id on all tables
    if (backfillLabId) {
      await pool.query(
        `UPDATE users SET lab_id = $1 WHERE lab_id IS NULL AND role != 'system_admin'`,
        [backfillLabId]
      );
      await pool.query(`UPDATE researchers SET lab_id = $1 WHERE lab_id IS NULL`, [backfillLabId]);
      await pool.query(`UPDATE tubes SET lab_id = $1 WHERE lab_id IS NULL`, [backfillLabId]);
      await pool.query(`UPDATE lookup_values SET lab_id = $1 WHERE lab_id IS NULL`, [
        backfillLabId,
      ]);
      await pool.query(
        `UPDATE audit_log a SET lab_id = u.lab_id FROM users u WHERE a.user_id = u.id AND a.lab_id IS NULL AND u.lab_id IS NOT NULL`
      );
      await pool.query(
        `UPDATE audit_log_archive a SET lab_id = u.lab_id FROM users u WHERE a.user_id = u.id AND a.lab_id IS NULL AND u.lab_id IS NOT NULL`
      );
      await pool.query(`UPDATE storage_current SET lab_id = $1 WHERE lab_id IS NULL`, [
        backfillLabId,
      ]);
      await pool.query(`UPDATE storage_versions SET lab_id = $1 WHERE lab_id IS NULL`, [
        backfillLabId,
      ]);
      await pool.query(`UPDATE storage_snapshots SET lab_id = $1 WHERE lab_id IS NULL`, [
        backfillLabId,
      ]);
    }

    // storage_current: singleton → per-lab
    await pool.query(`
      DO $$
      DECLARE
        constraint_name TEXT;
      BEGIN
        SELECT con.conname INTO constraint_name
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'storage_current'
          AND con.contype = 'c'
          AND pg_get_constraintdef(con.oid) LIKE '%id = 1%';

        IF constraint_name IS NOT NULL THEN
          EXECUTE 'ALTER TABLE storage_current DROP CONSTRAINT ' || constraint_name;
        END IF;
      END $$
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint con
          JOIN pg_class rel ON rel.oid = con.conrelid
          WHERE rel.relname = 'storage_current'
            AND con.contype = 'u'
            AND pg_get_constraintdef(con.oid) LIKE '%lab_id%'
        ) THEN
          ALTER TABLE storage_current ADD CONSTRAINT storage_current_lab_id_unique UNIQUE (lab_id);
        END IF;
      END $$
    `);

    // storage_current.id: convert to auto-generated identity for multi-lab support
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'storage_current'
            AND column_name = 'id'
            AND identity_generation IS NOT NULL
        ) THEN
          ALTER TABLE storage_current
            ALTER COLUMN id DROP DEFAULT,
            ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY;
          PERFORM setval(pg_get_serial_sequence('storage_current', 'id'),
            COALESCE((SELECT MAX(id) FROM storage_current), 0) + 1, false);
        END IF;
      END $$
    `);

    // lookup_values: uniqueness now per-lab
    await pool.query(`
      DO $$
      DECLARE
        constraint_name TEXT;
      BEGIN
        SELECT con.conname INTO constraint_name
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'lookup_values'
          AND con.contype = 'u'
          AND pg_get_constraintdef(con.oid) LIKE '%category%'
          AND pg_get_constraintdef(con.oid) LIKE '%value%'
          AND pg_get_constraintdef(con.oid) NOT LIKE '%lab_id%';

        IF constraint_name IS NOT NULL THEN
          EXECUTE 'ALTER TABLE lookup_values DROP CONSTRAINT ' || constraint_name;
        END IF;
      END $$
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint con
          JOIN pg_class rel ON rel.oid = con.conrelid
          WHERE rel.relname = 'lookup_values'
            AND con.contype = 'u'
            AND pg_get_constraintdef(con.oid) LIKE '%lab_id%'
        ) THEN
          ALTER TABLE lookup_values ADD CONSTRAINT lookup_values_lab_category_value_unique UNIQUE (lab_id, category, value);
        END IF;
      END $$
    `);

    // Users role constraint: admin → lab_admin
    await pool.query(`
      DO $$
      DECLARE
        constraint_name TEXT;
      BEGIN
        SELECT con.conname INTO constraint_name
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'users'
          AND con.contype = 'c'
          AND pg_get_constraintdef(con.oid) LIKE '%role%'
          AND pg_get_constraintdef(con.oid) NOT LIKE '%system_admin%';

        IF constraint_name IS NOT NULL THEN
          EXECUTE 'ALTER TABLE users DROP CONSTRAINT ' || constraint_name;
        END IF;
      END $$
    `);

    await pool.query(`UPDATE users SET role = 'lab_admin' WHERE role = 'admin'`);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint con
          JOIN pg_class rel ON rel.oid = con.conrelid
          WHERE rel.relname = 'users'
            AND con.contype = 'c'
            AND pg_get_constraintdef(con.oid) LIKE '%system_admin%'
        ) THEN
          ALTER TABLE users ADD CONSTRAINT users_role_check
            CHECK (role IN ('system_admin', 'lab_admin', 'user'));
        END IF;
      END $$
    `);

    // Tighten lab_id to NOT NULL after backfill
    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'researchers' AND column_name = 'lab_id' AND is_nullable = 'YES'
        ) THEN
          ALTER TABLE researchers ALTER COLUMN lab_id SET NOT NULL;
        END IF;
      END $$
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tubes' AND column_name = 'lab_id' AND is_nullable = 'YES'
        ) THEN
          ALTER TABLE tubes ALTER COLUMN lab_id SET NOT NULL;
        END IF;
      END $$
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'lookup_values' AND column_name = 'lab_id' AND is_nullable = 'YES'
        ) THEN
          ALTER TABLE lookup_values ALTER COLUMN lab_id SET NOT NULL;
        END IF;
      END $$
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'storage_current' AND column_name = 'lab_id' AND is_nullable = 'YES'
        ) THEN
          ALTER TABLE storage_current ALTER COLUMN lab_id SET NOT NULL;
        END IF;
      END $$
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'storage_versions' AND column_name = 'lab_id' AND is_nullable = 'YES'
        ) THEN
          ALTER TABLE storage_versions ALTER COLUMN lab_id SET NOT NULL;
        END IF;
      END $$
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'storage_snapshots' AND column_name = 'lab_id' AND is_nullable = 'YES'
        ) THEN
          ALTER TABLE storage_snapshots ALTER COLUMN lab_id SET NOT NULL;
        END IF;
      END $$
    `);

    // Create invite_codes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invite_codes (
        id TEXT PRIMARY KEY,
        lab_id TEXT NOT NULL REFERENCES labs(id),
        code TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('lab_admin', 'user')),
        created_by TEXT NOT NULL REFERENCES users(id),
        max_uses INTEGER DEFAULT 1,
        use_count INTEGER NOT NULL DEFAULT 0,
        expires_at TIMESTAMPTZ,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Replace old position uniqueness constraint with lab-scoped version
    await pool.query(`
      ALTER TABLE tubes DROP CONSTRAINT IF EXISTS tubes_tank_id_rack_id_box_id_position_key
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint con
          JOIN pg_class rel ON rel.oid = con.conrelid
          WHERE rel.relname = 'tubes'
            AND con.conname = 'tubes_lab_location_unique'
        ) THEN
          ALTER TABLE tubes ADD CONSTRAINT tubes_lab_location_unique
            UNIQUE(lab_id, tank_id, rack_id, box_id, position);
        END IF;
      END $$
    `);

    // Add demo_limits column
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'labs' AND column_name = 'demo_limits'
        ) THEN
          ALTER TABLE labs ADD COLUMN demo_limits JSONB;
        END IF;
      END $$
    `);

    // Multi-tenancy indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_labs_slug ON labs(slug)',
      'CREATE INDEX IF NOT EXISTS idx_labs_is_active ON labs(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_users_lab_id ON users(lab_id)',
      'CREATE INDEX IF NOT EXISTS idx_researchers_lab_id ON researchers(lab_id)',
      'CREATE INDEX IF NOT EXISTS idx_tubes_lab_id ON tubes(lab_id)',
      'CREATE INDEX IF NOT EXISTS idx_tubes_lab_location ON tubes(lab_id, tank_id, rack_id, box_id)',
      'CREATE INDEX IF NOT EXISTS idx_lookup_values_lab_id ON lookup_values(lab_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_log_lab_id ON audit_log(lab_id)',
      'CREATE INDEX IF NOT EXISTS idx_invite_codes_lab_id ON invite_codes(lab_id)',
      'CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code)',
    ];

    for (const indexSql of indexes) {
      await pool.query(indexSql);
    }
  },
};
