/**
 * Migration 001 — Initial Schema
 *
 * Creates all tables in their final-state schema. On existing databases this
 * migration is marked as applied without running (see detectExistingState in migrationRunner).
 */

import type { Migration } from './migrationRunner';
import type { Pool } from 'pg';

export const migration001: Migration = {
  id: 1,
  name: 'initial_schema',
  async up(pool: Pool): Promise<void> {
    // Labs (root tenant — must exist before all FK references)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS labs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        is_demo BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        demo_limits JSONB
      )
    `);

    // Storage tables (must come before users/tubes due to FK ordering)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS storage_versions (
        version SERIAL PRIMARY KEY,
        lab_id TEXT NOT NULL REFERENCES labs(id),
        updated_at TIMESTAMPTZ NOT NULL,
        change_description TEXT,
        changed_by TEXT,
        config_json JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS storage_current (
        id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        lab_id TEXT NOT NULL REFERENCES labs(id) UNIQUE,
        version INTEGER NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        config_json JSONB NOT NULL,
        FOREIGN KEY (version) REFERENCES storage_versions(version)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS storage_snapshots (
        id TEXT PRIMARY KEY,
        lab_id TEXT NOT NULL REFERENCES labs(id),
        version INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        description TEXT,
        created_by TEXT,
        size_bytes INTEGER NOT NULL,
        config_json JSONB NOT NULL,
        FOREIGN KEY (version) REFERENCES storage_versions(version)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS security_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        use_enhanced_auth BOOLEAN NOT NULL DEFAULT FALSE,
        require_strong_passwords BOOLEAN NOT NULL DEFAULT FALSE,
        password_min_length INTEGER NOT NULL DEFAULT 8,
        password_require_special_chars BOOLEAN NOT NULL DEFAULT FALSE,
        access_token_expiry_minutes INTEGER NOT NULL DEFAULT 15,
        session_timeout_minutes INTEGER NOT NULL DEFAULT 480,
        idle_warning_minutes INTEGER NOT NULL DEFAULT 5,
        absolute_session_timeout_hours INTEGER NOT NULL DEFAULT 168,
        max_concurrent_sessions INTEGER NOT NULL DEFAULT 3,
        enable_rate_limiting BOOLEAN NOT NULL DEFAULT TRUE,
        login_attempts_per_minute INTEGER NOT NULL DEFAULT 10,
        lockout_duration_minutes INTEGER NOT NULL DEFAULT 15,
        enable_admin_controls BOOLEAN NOT NULL DEFAULT TRUE,
        enable_detailed_logging BOOLEAN NOT NULL DEFAULT TRUE,
        log_failed_attempts BOOLEAN NOT NULL DEFAULT TRUE,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS persons (
        id TEXT PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        position TEXT,
        department TEXT,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS researchers (
        id TEXT PRIMARY KEY,
        person_id TEXT NOT NULL,
        lab_id TEXT NOT NULL REFERENCES labs(id),
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL,
        approval_status TEXT NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved')),
        source TEXT NOT NULL DEFAULT 'admin' CHECK (source IN ('registration', 'admin')),
        FOREIGN KEY (person_id) REFERENCES persons(id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        api_key TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('system_admin', 'lab_admin', 'user')),
        password_hash TEXT,
        salt TEXT,
        created_at TIMESTAMPTZ NOT NULL,
        researcher_id TEXT,
        person_id TEXT,
        lab_id TEXT REFERENCES labs(id),
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'deactivated', 'suspended')),
        email_verified BOOLEAN NOT NULL DEFAULT FALSE,
        email_verification_token TEXT,
        email_verification_expiry TIMESTAMPTZ,
        last_verification_email_sent TIMESTAMPTZ,
        password_reset_token TEXT,
        password_reset_expiry TIMESTAMPTZ,
        require_password_change BOOLEAN NOT NULL DEFAULT FALSE,
        last_password_change TIMESTAMPTZ,
        settings JSONB DEFAULT '{}',
        FOREIGN KEY (researcher_id) REFERENCES researchers(id) ON DELETE CASCADE,
        FOREIGN KEY (person_id) REFERENCES persons(id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tubes (
        id TEXT PRIMARY KEY,
        lab_id TEXT NOT NULL REFERENCES labs(id),
        tank_id TEXT NOT NULL,
        rack_id TEXT NOT NULL,
        box_id TEXT NOT NULL,
        position INTEGER NOT NULL,
        cell_type TEXT,
        donor_internal_id TEXT,
        donor_source_id TEXT,
        concentration TEXT,
        concentration_unit TEXT CHECK (concentration_unit IN ('c/v', 'c/mL')),
        date TEXT,
        researcher_id TEXT,
        created_by_name TEXT,
        media_type TEXT,
        media_supplements TEXT,
        media_selection TEXT,
        culture_condition TEXT,
        lot_number TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        is_locked BOOLEAN DEFAULT FALSE,
        locked_by TEXT,
        lock_note TEXT,
        locked_at TIMESTAMPTZ,
        shared_with_user_ids TEXT,
        CONSTRAINT tubes_lab_location_unique UNIQUE(lab_id, tank_id, rack_id, box_id, position),
        FOREIGN KEY (researcher_id) REFERENCES researchers(id),
        FOREIGN KEY (locked_by) REFERENCES users(id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        last_used_at TIMESTAMPTZ,
        is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
        user_agent TEXT,
        ip_address TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        refresh_token TEXT NOT NULL UNIQUE,
        device_info TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMPTZ NOT NULL,
        last_used_at TIMESTAMPTZ NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        username TEXT NOT NULL,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        lab_id TEXT,
        details JSONB NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS lookup_values (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL CHECK (category IN ('species', 'source', 'media')),
        lab_id TEXT NOT NULL REFERENCES labs(id),
        value TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(lab_id, category, value)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_log_archive (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        username TEXT NOT NULL,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        lab_id TEXT,
        details JSONB NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        archived_at TIMESTAMPTZ NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

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
  },
};
