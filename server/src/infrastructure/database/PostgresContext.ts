import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { logger } from '@utils/logger';
import { generateId } from '@domain/utils/generateId';

/**
 * PostgresContext - Database Access Layer
 *
 * Handles all database operations without business logic.
 * Clean separation between data access and domain concerns.
 */
export class PostgresContext {
  private pool: Pool;
  private initialized: boolean = false;

  constructor() {
    // Connection pool configuration
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
      max: 20,                      // Maximum connections in pool
      idleTimeoutMillis: 30000,     // Close idle connections after 30s
      connectionTimeoutMillis: 2000, // Fail fast if can't connect in 2s
    });

    // Log pool errors
    this.pool.on('error', (err) => {
      logger.error('Unexpected PostgreSQL pool error:', err);
    });
  }

  /**
   * Initialize database with production-ready schema
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Test connection
      const client = await this.pool.connect();
      try {
        await client.query('SELECT NOW()');
      } finally {
        client.release();
      }

      // Create schema
      await this.createTables();
      await this.runSchemaMigrations();
      await this.createIndexes();
      await this.createFullTextSearch();
      await this.insertDefaultConfiguration();

      this.initialized = true;
      logger.info('Database initialized');
    } catch (error) {
      logger.error('Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create database tables
   */
  private async createTables(): Promise<void> {
    // Labs table (root tenant — must be created before all FK references)
    await this.pool.query(`
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

    // Configuration tables
    await this.createConfigurationTables();

    // Persons table
    await this.pool.query(`
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

    // Researchers table (must be before tubes and users due to foreign keys)
    await this.pool.query(`
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

    // Users table
    await this.pool.query(`
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
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
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

    // Tubes table (after researchers and users due to foreign keys)
    await this.pool.query(`
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
        UNIQUE(tank_id, rack_id, box_id, position),
        FOREIGN KEY (researcher_id) REFERENCES researchers(id),
        FOREIGN KEY (locked_by) REFERENCES users(id)
      )
    `);

    // Refresh tokens table
    await this.pool.query(`
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

    // User sessions table
    await this.pool.query(`
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

    // Audit log table
    await this.pool.query(`
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

    // Lookup values table (admin-managed dropdown options for species, source, etc.)
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS lookup_values (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL CHECK (category IN ('species', 'source', 'media')),
        lab_id TEXT REFERENCES labs(id),
        value TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(lab_id, category, value)
      )
    `);

    // Audit log archive table
    await this.pool.query(`
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

    // Invite codes table (registration invite codes)
    await this.pool.query(`
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

  }

  /**
   * Create configuration tables
   */
  private async createConfigurationTables(): Promise<void> {
    // Configuration versions (append-only event log)
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS configuration_versions (
        version SERIAL PRIMARY KEY,
        lab_id TEXT NOT NULL REFERENCES labs(id),
        updated_at TIMESTAMPTZ NOT NULL,
        change_description TEXT,
        changed_by TEXT,
        config_json JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Configuration current (one row per lab for fast reads)
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS configuration_current (
        id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        lab_id TEXT NOT NULL REFERENCES labs(id) UNIQUE,
        version INTEGER NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        config_json JSONB NOT NULL,
        FOREIGN KEY (version) REFERENCES configuration_versions(version)
      )
    `);

    // Configuration snapshots
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS configuration_snapshots (
        id TEXT PRIMARY KEY,
        lab_id TEXT NOT NULL REFERENCES labs(id),
        version INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        description TEXT,
        created_by TEXT,
        size_bytes INTEGER NOT NULL,
        config_json JSONB NOT NULL,
        FOREIGN KEY (version) REFERENCES configuration_versions(version)
      )
    `);

    // Security configuration
    await this.pool.query(`
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

  }

  /**
   * Run schema migrations for existing databases.
   * Called after createTables() so all tables exist before ALTER TABLE runs.
   */
  private async runSchemaMigrations(): Promise<void> {
    // Drop is_demo from users — demo status now derived from lab
    await this.pool.query(`
      ALTER TABLE users DROP COLUMN IF EXISTS is_demo
    `);
    await this.pool.query(`
      DROP INDEX IF EXISTS idx_users_is_demo
    `);

    // Rename vendor → source (column rename for existing databases)
    await this.pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tubes' AND column_name = 'vendor'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tubes' AND column_name = 'source'
        ) THEN
          ALTER TABLE tubes RENAME COLUMN vendor TO source;
        ELSIF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tubes' AND column_name = 'vendor'
        ) AND EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tubes' AND column_name = 'source'
        ) THEN
          UPDATE tubes SET source = vendor WHERE vendor IS NOT NULL AND source IS NULL;
          ALTER TABLE tubes DROP COLUMN vendor;
        END IF;
      END $$
    `);

    // Rename vendor index → source index
    await this.pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tubes_vendor'
        ) THEN
          ALTER INDEX idx_tubes_vendor RENAME TO idx_tubes_source;
        END IF;
      END $$
    `);

    // Rename vendor → source in lookup_values (drop old constraint, update data, add new)
    await this.pool.query(`
      DO $$
      DECLARE
        constraint_name TEXT;
      BEGIN
        SELECT con.conname INTO constraint_name
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'lookup_values'
          AND con.contype = 'c'
          AND pg_get_constraintdef(con.oid) LIKE '%vendor%';

        IF constraint_name IS NOT NULL THEN
          EXECUTE 'ALTER TABLE lookup_values DROP CONSTRAINT ' || constraint_name;
          UPDATE lookup_values SET category = 'source' WHERE category = 'vendor';
          ALTER TABLE lookup_values ADD CONSTRAINT lookup_values_category_check
            CHECK (category IN ('species', 'source', 'media'));
        END IF;
      END $$
    `);

    // Add species, source, catalog_number, passage_number columns to tubes
    await this.pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tubes' AND column_name = 'species'
        ) THEN
          ALTER TABLE tubes ADD COLUMN species TEXT;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tubes' AND column_name = 'source'
        ) THEN
          ALTER TABLE tubes ADD COLUMN source TEXT;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tubes' AND column_name = 'catalog_number'
        ) THEN
          ALTER TABLE tubes ADD COLUMN catalog_number TEXT;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tubes' AND column_name = 'passage_number'
        ) THEN
          ALTER TABLE tubes ADD COLUMN passage_number INTEGER CHECK (passage_number >= 0 AND passage_number <= 999);
        END IF;
      END $$
    `);

    // Flatten media JSON column into media_type, media_supplements, media_selection
    await this.pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tubes' AND column_name = 'media'
        ) THEN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'tubes' AND column_name = 'media_type'
          ) THEN
            ALTER TABLE tubes ADD COLUMN media_type TEXT;
            ALTER TABLE tubes ADD COLUMN media_supplements TEXT;
            ALTER TABLE tubes ADD COLUMN media_selection TEXT;
          END IF;

          UPDATE tubes SET
            media_type = media::jsonb->>'type',
            media_supplements = media::jsonb->>'supplements',
            media_selection = media::jsonb->>'selection'
          WHERE media IS NOT NULL AND media_type IS NULL;

          ALTER TABLE tubes DROP COLUMN media;
        ELSE
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'tubes' AND column_name = 'media_type'
          ) THEN
            ALTER TABLE tubes ADD COLUMN media_type TEXT;
            ALTER TABLE tubes ADD COLUMN media_supplements TEXT;
            ALTER TABLE tubes ADD COLUMN media_selection TEXT;
          END IF;
        END IF;
      END $$
    `);

    // Update lookup_values category CHECK constraint to include 'media'
    await this.pool.query(`
      DO $$
      DECLARE
        constraint_name TEXT;
      BEGIN
        SELECT con.conname INTO constraint_name
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'lookup_values'
          AND con.contype = 'c'
          AND pg_get_constraintdef(con.oid) LIKE '%category%'
          AND pg_get_constraintdef(con.oid) NOT LIKE '%media%';

        IF constraint_name IS NOT NULL THEN
          EXECUTE 'ALTER TABLE lookup_values DROP CONSTRAINT ' || constraint_name;
          ALTER TABLE lookup_values ADD CONSTRAINT lookup_values_category_check
            CHECK (category IN ('species', 'source', 'media'));
        END IF;
      END $$
    `);

    await this.migrateMultiTenancy();
  }

  private async migrateMultiTenancy(): Promise<void> {
    await this.pool.query(`
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

    // Add is_demo column to labs table for demo-as-lab migration
    await this.pool.query(`
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

    const existingLabs = await this.pool.query('SELECT id FROM labs LIMIT 1');
    if (existingLabs.rows.length === 0) {
      const defaultLabId = generateId('lab');
      await this.pool.query(
        `INSERT INTO labs (id, name, slug) VALUES ($1, 'Lab 1', 'lab-1')`,
        [defaultLabId]
      );
    }

    const firstLab = await this.pool.query('SELECT id FROM labs ORDER BY created_at LIMIT 1');
    const backfillLabId = firstLab.rows[0]?.id;

    // Add lab_id columns (nullable initially for backfill)
    await this.pool.query(`
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

    await this.pool.query(`
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

    await this.pool.query(`
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

    await this.pool.query(`
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

    await this.pool.query(`
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

    await this.pool.query(`
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

    await this.pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'configuration_current' AND column_name = 'lab_id'
        ) THEN
          ALTER TABLE configuration_current ADD COLUMN lab_id TEXT REFERENCES labs(id);
        END IF;
      END $$
    `);

    await this.pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'configuration_versions' AND column_name = 'lab_id'
        ) THEN
          ALTER TABLE configuration_versions ADD COLUMN lab_id TEXT REFERENCES labs(id);
        END IF;
      END $$
    `);

    await this.pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'configuration_snapshots' AND column_name = 'lab_id'
        ) THEN
          ALTER TABLE configuration_snapshots ADD COLUMN lab_id TEXT REFERENCES labs(id);
        END IF;
      END $$
    `);

    // Backfill existing rows with default lab
    if (backfillLabId) {
      await this.pool.query(`UPDATE users SET lab_id = $1 WHERE lab_id IS NULL AND role != 'system_admin'`, [backfillLabId]);
      await this.pool.query(`UPDATE researchers SET lab_id = $1 WHERE lab_id IS NULL`, [backfillLabId]);
      await this.pool.query(`UPDATE tubes SET lab_id = $1 WHERE lab_id IS NULL`, [backfillLabId]);
      await this.pool.query(`UPDATE lookup_values SET lab_id = $1 WHERE lab_id IS NULL`, [backfillLabId]);
      await this.pool.query(`UPDATE audit_log SET lab_id = $1 WHERE lab_id IS NULL`, [backfillLabId]);
      await this.pool.query(`UPDATE audit_log_archive SET lab_id = $1 WHERE lab_id IS NULL`, [backfillLabId]);
      await this.pool.query(`UPDATE configuration_current SET lab_id = $1 WHERE lab_id IS NULL`, [backfillLabId]);
      await this.pool.query(`UPDATE configuration_versions SET lab_id = $1 WHERE lab_id IS NULL`, [backfillLabId]);
      await this.pool.query(`UPDATE configuration_snapshots SET lab_id = $1 WHERE lab_id IS NULL`, [backfillLabId]);
    }

    // configuration_current: singleton → per-lab
    await this.pool.query(`
      DO $$
      DECLARE
        constraint_name TEXT;
      BEGIN
        SELECT con.conname INTO constraint_name
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'configuration_current'
          AND con.contype = 'c'
          AND pg_get_constraintdef(con.oid) LIKE '%id = 1%';

        IF constraint_name IS NOT NULL THEN
          EXECUTE 'ALTER TABLE configuration_current DROP CONSTRAINT ' || constraint_name;
        END IF;
      END $$
    `);

    await this.pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint con
          JOIN pg_class rel ON rel.oid = con.conrelid
          WHERE rel.relname = 'configuration_current'
            AND con.contype = 'u'
            AND pg_get_constraintdef(con.oid) LIKE '%lab_id%'
        ) THEN
          ALTER TABLE configuration_current ADD CONSTRAINT configuration_current_lab_id_unique UNIQUE (lab_id);
        END IF;
      END $$
    `);

    // configuration_current.id: convert to auto-generated identity for multi-lab support
    await this.pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'configuration_current'
            AND column_name = 'id'
            AND identity_generation IS NOT NULL
        ) THEN
          ALTER TABLE configuration_current
            ALTER COLUMN id DROP DEFAULT,
            ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY;
          PERFORM setval(pg_get_serial_sequence('configuration_current', 'id'),
            COALESCE((SELECT MAX(id) FROM configuration_current), 0) + 1, false);
        END IF;
      END $$
    `);

    // lookup_values: uniqueness now per-lab
    await this.pool.query(`
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

    await this.pool.query(`
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

    // Migrate role values and constraint
    // Drop old constraint FIRST so the UPDATE doesn't violate it
    await this.pool.query(`
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

    await this.pool.query(`UPDATE users SET role = 'lab_admin' WHERE role = 'admin'`);

    await this.pool.query(`
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

    // Tighten NOT NULL after backfill
    await this.pool.query(`
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

    await this.pool.query(`
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

    await this.pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'configuration_current' AND column_name = 'lab_id' AND is_nullable = 'YES'
        ) THEN
          ALTER TABLE configuration_current ALTER COLUMN lab_id SET NOT NULL;
        END IF;
      END $$
    `);

    await this.pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'configuration_versions' AND column_name = 'lab_id' AND is_nullable = 'YES'
        ) THEN
          ALTER TABLE configuration_versions ALTER COLUMN lab_id SET NOT NULL;
        END IF;
      END $$
    `);

    await this.pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'configuration_snapshots' AND column_name = 'lab_id' AND is_nullable = 'YES'
        ) THEN
          ALTER TABLE configuration_snapshots ALTER COLUMN lab_id SET NOT NULL;
        END IF;
      END $$
    `);

    await this.pool.query(`
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
    await this.pool.query(`
      ALTER TABLE tubes DROP CONSTRAINT IF EXISTS tubes_tank_id_rack_id_box_id_position_key
    `);

    await this.pool.query(`
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

    await this.migrateEquipmentIds();
    await this.normalizeLabIds();
    await this.ensureSystemAdminPerson();
  }

  private async normalizeLabIds(): Promise<void> {
    const result = await this.pool.query(`SELECT id, slug FROM labs WHERE id = 'lab_default'`);
    if (result.rows.length === 0) return;

    const originalSlug = result.rows[0].slug as string;
    const newId = generateId('lab');
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Temporarily change the old row's slug so the new row can use it
      await client.query(
        `UPDATE labs SET slug = $1 WHERE id = 'lab_default'`,
        [`__migrating_${originalSlug}`]
      );

      await client.query(
        `INSERT INTO labs (id, name, slug, is_active, created_at, updated_at)
         SELECT $1, name, $2, is_active, created_at, updated_at FROM labs WHERE id = 'lab_default'`,
        [newId, originalSlug]
      );

      const childTables = [
        'users', 'researchers', 'tubes', 'lookup_values',
        'configuration_current', 'configuration_versions', 'configuration_snapshots',
        'audit_log', 'audit_log_archive', 'invite_codes',
      ];
      for (const table of childTables) {
        await client.query(`UPDATE ${table} SET lab_id = $1 WHERE lab_id = 'lab_default'`, [newId]);
      }

      await client.query(`DELETE FROM labs WHERE id = 'lab_default'`);

      await client.query('COMMIT');
      logger.info(`Normalized lab_default to ${newId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async ensureSystemAdminPerson(): Promise<void> {
    const result = await this.pool.query(
      `SELECT u.id, u.username FROM users u WHERE u.role = 'system_admin' AND u.person_id IS NULL`
    );
    if (result.rows.length === 0) return;

    for (const row of result.rows) {
      const personId = generateId('person');
      const now = new Date().toISOString();

      await this.pool.query(
        `INSERT INTO persons (id, first_name, last_name, email, created_at, updated_at)
         VALUES ($1, $2, 'Admin', $3, $4, $4)`,
        [personId, row.username, `${row.username}@system.local`, now]
      );
      await this.pool.query(
        `UPDATE users SET person_id = $1 WHERE id = $2`,
        [personId, row.id]
      );
      logger.info(`Created Person record for system admin ${row.username}`);
    }
  }

  private async migrateEquipmentIds(): Promise<void> {
    const labs = await this.pool.query('SELECT id FROM labs ORDER BY created_at');

    for (const lab of labs.rows) {
      const labId = lab.id as string;

      const configRow = await this.pool.query(
        'SELECT config_json FROM configuration_current WHERE lab_id = $1',
        [labId]
      );
      if (configRow.rows.length === 0) continue;

      const configJson = configRow.rows[0].config_json;
      if (!configJson?.tanks || configJson.tanks.length === 0) continue;

      const alreadyMigrated = configJson.tanks.every(
        (t: { id: string }) => t.id.startsWith('tank_')
      );
      if (alreadyMigrated) continue;

      const client = await this.pool.connect();
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

        await client.query(
          'UPDATE configuration_current SET config_json = $1 WHERE lab_id = $2',
          [JSON.stringify(updatedConfig), labId]
        );

        const versions = await client.query(
          'SELECT version, config_json FROM configuration_versions WHERE lab_id = $1',
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
          await client.query(
            'UPDATE configuration_versions SET config_json = $1 WHERE version = $2',
            [JSON.stringify(verConfig), ver.version]
          );
        }

        const snapshots = await client.query(
          'SELECT id, config_json FROM configuration_snapshots WHERE lab_id = $1',
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
          await client.query(
            'UPDATE configuration_snapshots SET config_json = $1 WHERE id = $2',
            [JSON.stringify(snapConfig), snap.id]
          );
        }

        await client.query('COMMIT');
        logger.info(`Migrated equipment IDs for lab ${labId}: ${tankIdMap.size} tanks, ${[...rackIdMap.values()].reduce((sum, m) => sum + m.size, 0)} racks`);
      } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`Failed to migrate equipment IDs for lab ${labId}:`, error);
        throw error;
      } finally {
        client.release();
      }
    }
  }

  /**
   * Create database indexes
   */
  private async createIndexes(): Promise<void> {
    const indexes = [
      // Person indexes
      'CREATE INDEX IF NOT EXISTS idx_persons_email ON persons(LOWER(email))',
      'CREATE INDEX IF NOT EXISTS idx_persons_last_name ON persons(last_name)',
      'CREATE INDEX IF NOT EXISTS idx_persons_first_name ON persons(first_name)',

      // Tube location indexes
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

      // User indexes
      'CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key)',
      'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
      'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
      'CREATE INDEX IF NOT EXISTS idx_users_researcher_id ON users(researcher_id)',
      'CREATE INDEX IF NOT EXISTS idx_users_person_id ON users(person_id)',
      'CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)',
      'CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON users(email_verification_token)',
      'CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token)',

      // Refresh token indexes
      'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token)',
      'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at)',
      'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_is_revoked ON refresh_tokens(is_revoked)',
      'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_created_at ON refresh_tokens(created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_last_used ON refresh_tokens(last_used_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_ip_address ON refresh_tokens(ip_address)',

      // User sessions indexes
      'CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_token ON user_sessions(refresh_token)',
      'CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at)',
      'CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_user_sessions_last_used ON user_sessions(last_used_at DESC)',

      // Audit log indexes
      'CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action)',
      'CREATE INDEX IF NOT EXISTS idx_audit_log_entity_type ON audit_log(entity_type)',
      'CREATE INDEX IF NOT EXISTS idx_audit_log_entity_id ON audit_log(entity_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC)',
      'CREATE INDEX IF NOT EXISTS idx_audit_log_composite ON audit_log(entity_type, entity_id, timestamp DESC)',

      // Audit archive indexes
      'CREATE INDEX IF NOT EXISTS idx_audit_archive_timestamp ON audit_log_archive(timestamp DESC)',
      'CREATE INDEX IF NOT EXISTS idx_audit_archive_user_id ON audit_log_archive(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_archive_archived_at ON audit_log_archive(archived_at DESC)',

      // Researcher indexes
      'CREATE INDEX IF NOT EXISTS idx_researchers_active ON researchers(active)',
      'CREATE INDEX IF NOT EXISTS idx_researchers_person_id ON researchers(person_id)',
      'CREATE INDEX IF NOT EXISTS idx_researchers_approval_status ON researchers(approval_status)',

      // Configuration indexes
      'CREATE INDEX IF NOT EXISTS idx_configuration_versions_updated_at ON configuration_versions(updated_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_configuration_snapshots_created_at ON configuration_snapshots(created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_configuration_snapshots_version ON configuration_snapshots(version)',

      // Lookup value indexes
      'CREATE INDEX IF NOT EXISTS idx_lookup_values_category ON lookup_values(category)',
      'CREATE INDEX IF NOT EXISTS idx_lookup_values_category_active ON lookup_values(category, is_active)',

      // Tube species/source indexes
      'CREATE INDEX IF NOT EXISTS idx_tubes_species ON tubes(species)',
      'CREATE INDEX IF NOT EXISTS idx_tubes_source ON tubes(source)',

      // Multi-tenancy indexes
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
      await this.pool.query(indexSql);
    }
  }

  /**
   * Create full-text search infrastructure
   */
  private async createFullTextSearch(): Promise<void> {
    // Install pg_trgm extension for partial matching
    await this.pool.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');

    // Add search_vector column to tubes if it doesn't exist
    await this.pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tubes' AND column_name = 'search_vector'
        ) THEN
          ALTER TABLE tubes ADD COLUMN search_vector tsvector;
        END IF;
      END $$
    `);

    // Add version column for optimistic locking (existing tubes get version 1)
    await this.pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tubes' AND column_name = 'version'
        ) THEN
          ALTER TABLE tubes ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
        END IF;
      END $$
    `);

    // Create GIN index for full-text search
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tubes_search_vector
      ON tubes USING GIN(search_vector)
    `);

    // Create trigram indexes for partial matching
    await this.pool.query('CREATE INDEX IF NOT EXISTS idx_tubes_cell_type_trgm ON tubes USING GIN(cell_type gin_trgm_ops)');
    await this.pool.query('CREATE INDEX IF NOT EXISTS idx_tubes_donor_internal_trgm ON tubes USING GIN(donor_internal_id gin_trgm_ops)');
    await this.pool.query('CREATE INDEX IF NOT EXISTS idx_tubes_donor_source_trgm ON tubes USING GIN(donor_source_id gin_trgm_ops)');
    await this.pool.query('CREATE INDEX IF NOT EXISTS idx_tubes_lot_number_trgm ON tubes USING GIN(lot_number gin_trgm_ops)');
    await this.pool.query('CREATE INDEX IF NOT EXISTS idx_tubes_notes_trgm ON tubes USING GIN(notes gin_trgm_ops)');

    // Create function to update search_vector
    await this.pool.query(`
      CREATE OR REPLACE FUNCTION tubes_search_vector_update() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('english', COALESCE(NEW.cell_type, '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(NEW.donor_internal_id, '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(NEW.donor_source_id, '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(NEW.species, '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(NEW.lot_number, '')), 'B') ||
          setweight(to_tsvector('english', COALESCE(NEW.media_type, '')), 'B') ||
          setweight(to_tsvector('english', COALESCE(NEW.catalog_number, '')), 'B') ||
          setweight(to_tsvector('english', COALESCE(NEW.culture_condition, '')), 'B') ||
          setweight(to_tsvector('english', COALESCE(NEW.source, '')), 'B') ||
          setweight(to_tsvector('english', COALESCE(NEW.notes, '')), 'C') ||
          setweight(to_tsvector('english', COALESCE(NEW.concentration, '')), 'C') ||
          setweight(to_tsvector('english', COALESCE(NEW.created_by_name, '')), 'C') ||
          setweight(to_tsvector('english', COALESCE(NEW.media_supplements, '')), 'C') ||
          setweight(to_tsvector('english', COALESCE(NEW.media_selection, '')), 'C') ||
          setweight(to_tsvector('english', COALESCE(NEW.passage_number::TEXT, '')), 'C');
        RETURN NEW;
      END
      $$ LANGUAGE plpgsql
    `);

    // Create trigger to automatically update search_vector
    await this.pool.query(`
      DROP TRIGGER IF EXISTS tubes_search_vector_trigger ON tubes
    `);
    await this.pool.query(`
      CREATE TRIGGER tubes_search_vector_trigger
      BEFORE INSERT OR UPDATE ON tubes
      FOR EACH ROW EXECUTE FUNCTION tubes_search_vector_update()
    `);

    // Populate/rebuild search_vector for all data (trigger definition may have changed)
    await this.pool.query(`
      UPDATE tubes SET search_vector =
        setweight(to_tsvector('english', COALESCE(cell_type, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(donor_internal_id, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(donor_source_id, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(species, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(lot_number, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(media_type, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(catalog_number, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(culture_condition, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(source, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(notes, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(concentration, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(created_by_name, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(media_supplements, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(media_selection, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(passage_number::TEXT, '')), 'C')
    `);
  }

  /**
   * Insert default configuration if none exists
   */
  private async insertDefaultConfiguration(): Promise<void> {
    try {
      const firstLab = await this.pool.query('SELECT id FROM labs ORDER BY created_at LIMIT 1');
      const labId = firstLab.rows[0]?.id;
      if (!labId) return;

      const existing = await this.pool.query(
        'SELECT lab_id FROM configuration_current WHERE lab_id = $1',
        [labId]
      );

      if (existing.rows.length === 0) {
        const { Configuration } = await import('../../domain/entities/Configuration');

        const defaultConfig = Configuration.createDefault();
        const configJson = JSON.stringify(defaultConfig.toData());
        const now = new Date().toISOString();

        const versionResult = await this.pool.query(
          `INSERT INTO configuration_versions (lab_id, updated_at, change_description, changed_by, config_json)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING version`,
          [labId, now, 'Initial system configuration', 'system', configJson]
        );

        const version = versionResult.rows[0].version;

        await this.pool.query(
          `INSERT INTO configuration_current (lab_id, version, updated_at, config_json)
           VALUES ($1, $2, $3, $4)`,
          [labId, version, now, configJson]
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Failed to initialize default configuration:', { message: errorMessage, stack: errorStack });
    }
  }

  /**
   * Query methods - type-safe and async
   */
  async query<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
    return this.pool.query<T>(sql, params);
  }

  async queryOne<T extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<T | null> {
    try {
      const result = await this.pool.query<T>(sql, params);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Query error:', error);
      throw error;
    }
  }

  async queryMany<T extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
    try {
      const result = await this.pool.query<T>(sql, params);
      return result.rows;
    } catch (error) {
      logger.error('Query error:', error);
      throw error;
    }
  }

  /**
   * Query rows by ID list with auto-generated IN clause placeholders.
   * Returns empty array for empty ID lists (no query executed).
   */
  async queryByIds<T extends QueryResultRow>(
    table: string,
    columns: string,
    ids: string[]
  ): Promise<T[]> {
    if (ids.length === 0) return [];
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    return this.queryMany<T>(
      `SELECT ${columns} FROM ${table} WHERE id IN (${placeholders})`,
      ids
    );
  }

  async execute(sql: string, params: unknown[] = []): Promise<QueryResult> {
    try {
      return await this.pool.query(sql, params);
    } catch (error) {
      logger.error('Execute error:', error);
      throw error;
    }
  }

  /**
   * Transaction support
   */
  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Transaction with SERIALIZABLE isolation level.
   * Prevents read/write anomalies but may fail with serialization errors on conflict.
   * Caller should handle retry logic for '40001' (serialization_failure) errors.
   */
  async transactionSerializable<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get a client for manual transaction control
   */
  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  /**
   * Check database health
   */
  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.pool.query('SELECT 1 as test');
      return result.rows[0]?.test === 1;
    } catch {
      return false;
    }
  }

  /**
   * Get pool statistics
   */
  getPoolStats(): { total: number; idle: number; waiting: number } {
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
    };
  }

  /**
   * Close database connection pool (graceful shutdown)
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}
