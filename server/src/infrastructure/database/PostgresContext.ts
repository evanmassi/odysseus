import { Pool, PoolClient, QueryResult } from 'pg';
import { logger } from '@utils/logger';

/**
 * PostgresContext - Pure Database Access Layer
 *
 * Handles all PostgreSQL database operations without business logic.
 * Clean separation between data access and domain concerns.
 *
 * Replaces SQLiteContext for cloud deployment.
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
      logger.info('PostgreSQL already initialized');
      return;
    }

    try {
      logger.info('Initializing PostgreSQL database...');

      // Test connection
      const client = await this.pool.connect();
      try {
        await client.query('SELECT NOW()');
        logger.info('PostgreSQL connection successful');
      } finally {
        client.release();
      }

      // Create schema
      await this.createTables();
      await this.createIndexes();
      await this.createFullTextSearch();
      await this.insertDefaultConfiguration();

      this.initialized = true;
      logger.info('PostgreSQL database initialized successfully');
    } catch (error) {
      logger.error('PostgreSQL database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create database tables
   */
  private async createTables(): Promise<void> {
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

    // Tubes table
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS tubes (
        id TEXT PRIMARY KEY,
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
        media TEXT,
        culture_condition TEXT,
        lot_number TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
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

    // Researchers table (create before users due to foreign key)
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS researchers (
        id TEXT PRIMARY KEY,
        person_id TEXT NOT NULL,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL,
        FOREIGN KEY (person_id) REFERENCES persons(id)
      )
    `);

    // Users table
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        api_key TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
        password_hash TEXT,
        salt TEXT,
        created_at TIMESTAMPTZ NOT NULL,
        researcher_id TEXT,
        person_id TEXT,
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
        details JSONB NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
        details JSONB NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        archived_at TIMESTAMPTZ NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    logger.info('PostgreSQL tables created');
  }

  /**
   * Create configuration tables
   */
  private async createConfigurationTables(): Promise<void> {
    // Configuration versions (append-only event log)
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS configuration_versions (
        version SERIAL PRIMARY KEY,
        updated_at TIMESTAMPTZ NOT NULL,
        change_description TEXT,
        changed_by TEXT,
        config_json JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Configuration current (single row for fast reads)
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS configuration_current (
        id INTEGER PRIMARY KEY CHECK (id = 1),
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

      // Configuration indexes
      'CREATE INDEX IF NOT EXISTS idx_configuration_versions_updated_at ON configuration_versions(updated_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_configuration_snapshots_created_at ON configuration_snapshots(created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_configuration_snapshots_version ON configuration_snapshots(version)',
    ];

    for (const indexSql of indexes) {
      await this.pool.query(indexSql);
    }

    logger.info('PostgreSQL indexes created');
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
          setweight(to_tsvector('english', COALESCE(NEW.lot_number, '')), 'B') ||
          setweight(to_tsvector('english', COALESCE(NEW.media, '')), 'B') ||
          setweight(to_tsvector('english', COALESCE(NEW.culture_condition, '')), 'B') ||
          setweight(to_tsvector('english', COALESCE(NEW.notes, '')), 'C') ||
          setweight(to_tsvector('english', COALESCE(NEW.concentration, '')), 'C');
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

    // Populate search_vector for existing data
    await this.pool.query(`
      UPDATE tubes SET search_vector =
        setweight(to_tsvector('english', COALESCE(cell_type, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(donor_internal_id, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(donor_source_id, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(lot_number, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(media, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(culture_condition, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(notes, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(concentration, '')), 'C')
      WHERE search_vector IS NULL
    `);

    logger.info('PostgreSQL full-text search configured');
  }

  /**
   * Insert default configuration if none exists
   */
  private async insertDefaultConfiguration(): Promise<void> {
    try {
      const result = await this.pool.query(
        'SELECT id FROM configuration_current WHERE id = 1'
      );

      if (result.rows.length === 0) {
        // Import Configuration entity for default creation
        const { Configuration } = await import('../../domain/entities/Configuration');

        const defaultConfig = Configuration.createDefault();
        const configJson = JSON.stringify(defaultConfig.toData());
        const now = new Date().toISOString();

        // Insert into versions table
        const versionResult = await this.pool.query(
          `INSERT INTO configuration_versions (updated_at, change_description, changed_by, config_json)
           VALUES ($1, $2, $3, $4)
           RETURNING version`,
          [now, 'Initial system configuration', 'system', configJson]
        );

        const version = versionResult.rows[0].version;

        // Insert into current table
        await this.pool.query(
          `INSERT INTO configuration_current (id, version, updated_at, config_json)
           VALUES (1, $1, $2, $3)`,
          [version, now, configJson]
        );

        logger.info('Default configuration initialized');
      }
    } catch (error) {
      logger.error('Failed to ensure default configuration:', error);
    }
  }

  /**
   * Query methods - type-safe and async
   */
  async query<T = unknown>(sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
    return this.pool.query<T>(sql, params);
  }

  async queryOne<T>(sql: string, params: unknown[] = []): Promise<T | null> {
    try {
      const result = await this.pool.query<T>(sql, params);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Query error:', error);
      throw error;
    }
  }

  async queryMany<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    try {
      const result = await this.pool.query<T>(sql, params);
      return result.rows;
    } catch (error) {
      logger.error('Query error:', error);
      throw error;
    }
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
    logger.info('PostgreSQL connection pool closed');
  }
}
