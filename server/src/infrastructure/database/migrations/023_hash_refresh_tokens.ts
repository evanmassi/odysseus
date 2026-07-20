/**
 * Migration 023 — Hash Refresh Tokens
 *
 * Refresh tokens are now stored as SHA-256 hashes in both refresh_tokens.token and
 * user_sessions.refresh_token. Existing plaintext rows can no longer be matched by the
 * hashed lookups, so clear them (a one-time forced re-login) and leave no plaintext secrets
 * behind.
 */

import type { Migration } from './migrationRunner';
import type { Pool } from 'pg';

export const migration023: Migration = {
  id: 23,
  name: '023_hash_refresh_tokens',
  up: async (pool: Pool) => {
    await pool.query(`DELETE FROM refresh_tokens`);
    await pool.query(`DELETE FROM user_sessions`);
  },
};
