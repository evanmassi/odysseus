import type { Migration } from './migrationRunner';
import type { Pool } from 'pg';

const GLOBAL_USERNAME_UNIQUENESS = `
  SELECT index_class.relname AS index_name, owning_constraint.conname AS constraint_name
  FROM pg_index unique_index
  JOIN pg_class index_class ON index_class.oid = unique_index.indexrelid
  JOIN pg_attribute indexed_column
    ON indexed_column.attrelid = unique_index.indrelid
   AND indexed_column.attnum = unique_index.indkey[0]
  LEFT JOIN pg_constraint owning_constraint ON owning_constraint.conindid = unique_index.indexrelid
  WHERE unique_index.indrelid = 'users'::regclass
    AND unique_index.indisunique
    AND unique_index.indnatts = 1
    AND unique_index.indpred IS NULL
    AND indexed_column.attname = 'username'
`;

export const migration038: Migration = {
  id: 38,
  name: 'usernames_unique_among_active_labs',
  async up(pool: Pool): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS lab_is_active BOOLEAN NOT NULL DEFAULT TRUE'
      );
      await client.query(
        'UPDATE users u SET lab_is_active = l.is_active FROM labs l WHERE u.lab_id = l.id'
      );

      // PITFALL: the legacy production schema predates migrations, so the old rule is found by shape, not by its default name.
      const globalRules = await client.query<{
        index_name: string;
        constraint_name: string | null;
      }>(GLOBAL_USERNAME_UNIQUENESS);
      for (const rule of globalRules.rows) {
        await client.query(
          rule.constraint_name
            ? `ALTER TABLE users DROP CONSTRAINT "${rule.constraint_name}"`
            : `DROP INDEX "${rule.index_name}"`
        );
      }

      await client.query(
        'CREATE UNIQUE INDEX IF NOT EXISTS users_username_active_lab_key ON users (username) WHERE lab_is_active'
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
};
