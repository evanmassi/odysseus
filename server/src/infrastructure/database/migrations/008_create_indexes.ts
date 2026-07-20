/**
 * Migration 008 — Create Indexes
 *
 * All pre-multi-tenancy indexes. Multi-tenancy indexes are created in migration 010.
 */

import type { Migration } from './migrationRunner';
import type { Pool } from 'pg';

export const migration008: Migration = {
  id: 8,
  name: 'create_indexes',
  async up(pool: Pool): Promise<void> {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_persons_email ON persons(LOWER(email))',
      'CREATE INDEX IF NOT EXISTS idx_persons_last_name ON persons(last_name)',
      'CREATE INDEX IF NOT EXISTS idx_persons_first_name ON persons(first_name)',

      'CREATE INDEX IF NOT EXISTS idx_tubes_location ON tubes(tank_id, rack_id, box_id)',
      'CREATE INDEX IF NOT EXISTS idx_tubes_position ON tubes(rack_id, box_id, position)',
      'CREATE INDEX IF NOT EXISTS idx_tubes_researcher_id ON tubes(researcher_id)',
      'CREATE INDEX IF NOT EXISTS idx_tubes_created_by_name ON tubes(created_by_name)',
      'CREATE INDEX IF NOT EXISTS idx_tubes_cell_type ON tubes(cell_type)',
      'CREATE INDEX IF NOT EXISTS idx_tubes_created_at ON tubes(created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_tubes_updated_at ON tubes(updated_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_tubes_donor_internal ON tubes(donor_internal_id)',
      'CREATE INDEX IF NOT EXISTS idx_tubes_donor_source ON tubes(donor_source_id)',
      'CREATE INDEX IF NOT EXISTS idx_tubes_lot_number ON tubes(lot_number)',
      'CREATE INDEX IF NOT EXISTS idx_tubes_culture_condition ON tubes(culture_condition)',
      'CREATE INDEX IF NOT EXISTS idx_tubes_date ON tubes(date)',
      'CREATE INDEX IF NOT EXISTS idx_tubes_is_locked ON tubes(is_locked)',
      'CREATE INDEX IF NOT EXISTS idx_tubes_locked_by ON tubes(locked_by)',

      'CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key)',
      'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
      'CREATE INDEX IF NOT EXISTS idx_users_researcher_id ON users(researcher_id)',
      'CREATE INDEX IF NOT EXISTS idx_users_person_id ON users(person_id)',
      'CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)',
      'CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON users(email_verification_token)',
      'CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token)',

      'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at)',
      'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_is_revoked ON refresh_tokens(is_revoked)',
      'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_created_at ON refresh_tokens(created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_last_used ON refresh_tokens(last_used_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_ip_address ON refresh_tokens(ip_address)',

      'CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_token ON user_sessions(refresh_token)',
      'CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at)',
      'CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_user_sessions_last_used ON user_sessions(last_used_at DESC)',

      'CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action)',
      'CREATE INDEX IF NOT EXISTS idx_audit_log_entity_type ON audit_log(entity_type)',
      'CREATE INDEX IF NOT EXISTS idx_audit_log_entity_id ON audit_log(entity_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC)',
      'CREATE INDEX IF NOT EXISTS idx_audit_log_composite ON audit_log(entity_type, entity_id, timestamp DESC)',

      'CREATE INDEX IF NOT EXISTS idx_audit_archive_timestamp ON audit_log_archive(timestamp DESC)',
      'CREATE INDEX IF NOT EXISTS idx_audit_archive_user_id ON audit_log_archive(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_archive_archived_at ON audit_log_archive(archived_at DESC)',

      'CREATE INDEX IF NOT EXISTS idx_researchers_active ON researchers(active)',
      'CREATE INDEX IF NOT EXISTS idx_researchers_person_id ON researchers(person_id)',
      'CREATE INDEX IF NOT EXISTS idx_researchers_approval_status ON researchers(approval_status)',

      'CREATE INDEX IF NOT EXISTS idx_storage_versions_updated_at ON storage_versions(updated_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_storage_snapshots_created_at ON storage_snapshots(created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_storage_snapshots_version ON storage_snapshots(version)',

      'CREATE INDEX IF NOT EXISTS idx_lookup_values_category ON lookup_values(category)',
      'CREATE INDEX IF NOT EXISTS idx_lookup_values_category_active ON lookup_values(category, is_active)',

      'CREATE INDEX IF NOT EXISTS idx_tubes_species ON tubes(species)',
      'CREATE INDEX IF NOT EXISTS idx_tubes_source ON tubes(source)',
    ];

    for (const indexSql of indexes) {
      await pool.query(indexSql);
    }
  },
};
