import type { Migration } from './migrationRunner';
import type { Pool } from 'pg';

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
      await client.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key');
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
