import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { logger } from '@utils/logger';

/**
 * SQLiteContext - Pure Database Access Layer
 * 
 * Handles all SQLite database operations without business logic.
 * Clean separation between data access and domain concerns.
 */
export class SQLiteContext {
  private db!: Database.Database;
  private readonly dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  /**
   * Initialize fresh database with production-ready schema
   */
  async initialize(): Promise<void> {
    try {
      logger.info(`Initializing SQLite database: ${this.dbPath}`);
      
      // Ensure data directory exists
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Initialize database with optimized settings
      this.db = new Database(this.dbPath);
      this.configureDatabase();
      this.createTables();
      this.createIndexes();
      this.createFTS5Tables();
      this.insertDefaultConfiguration();

      logger.info('SQLite database initialized successfully');
    } catch (error) {
      logger.error('SQLite database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Configure database for optimized performance
   */
  private configureDatabase(): void {
    this.db.pragma('journal_mode = WAL');     // Write-Ahead Logging for concurrent access
    this.db.pragma('synchronous = NORMAL');   // Balance safety and performance
    this.db.pragma('cache_size = 10000');     // 10MB cache
    this.db.pragma('temp_store = MEMORY');    // In-memory temporary storage
    this.db.pragma('foreign_keys = ON');      // Enforce referential integrity
  }

  /**
   * Create fresh database schema
   */
  private createTables(): void {
    // Configuration tables - normalized schema
    this.createConfigurationTables();

    // Persons table - single source of truth for human identity
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS persons (
        id TEXT PRIMARY KEY,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        position TEXT,
        department TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);

    // Tubes table with flexible identifiers
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tubes (
        id TEXT PRIMARY KEY,
        tankId TEXT NOT NULL,
        rackId TEXT NOT NULL,
        boxId TEXT NOT NULL,
        position INTEGER NOT NULL,
        cellType TEXT,
        donorInternalId TEXT,
        donorSourceId TEXT,
        concentration TEXT,
        concentrationUnit TEXT CHECK (concentrationUnit IN ('c/v', 'c/mL')),
        date TEXT,
        researcherId TEXT,
        createdByName TEXT,
        media TEXT,
        cultureCondition TEXT,
        lotNumber TEXT,
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        UNIQUE(tankId, rackId, boxId, position),
        FOREIGN KEY (researcherId) REFERENCES researchers(id)
      )
    `);

    // Users table - OAuth 2.0 authentication with approval workflow
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        apiKey TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
        passwordHash TEXT,
        salt TEXT,
        createdAt TEXT NOT NULL,
        researcherId TEXT,
        personId TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        emailVerified INTEGER NOT NULL DEFAULT 0 CHECK (emailVerified IN (0, 1)),
        emailVerificationToken TEXT,
        emailVerificationExpiry TEXT,
        lastVerificationEmailSent TEXT,
        passwordResetToken TEXT,
        passwordResetExpiry TEXT,
        requirePasswordChange INTEGER NOT NULL DEFAULT 0 CHECK (requirePasswordChange IN (0, 1)),
        lastPasswordChange TEXT,
        settings TEXT DEFAULT '{}',
        FOREIGN KEY (researcherId) REFERENCES researchers(id) ON DELETE CASCADE,
        FOREIGN KEY (personId) REFERENCES persons(id)
      )
    `);

    // Researchers table - links Person to research activities
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS researchers (
        id TEXT PRIMARY KEY,
        personId TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
        createdAt TEXT NOT NULL,
        FOREIGN KEY (personId) REFERENCES persons(id)
      )
    `);

    // OAuth 2.0 Note: Legacy sessions table removed
    // Session management now handled via refresh_tokens table

    // Refresh tokens table - OAuth 2.0 security
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expiresAt TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        lastUsedAt TEXT,
        isRevoked INTEGER NOT NULL DEFAULT 0 CHECK (isRevoked IN (0, 1)),
        userAgent TEXT,
        ipAddress TEXT,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // User sessions table - tracks active user sessions for concurrent session limits
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        refreshToken TEXT NOT NULL UNIQUE,
        deviceInfo TEXT,
        ipAddress TEXT,
        userAgent TEXT,
        createdAt TEXT NOT NULL,
        lastUsedAt TEXT NOT NULL,
        expiresAt TEXT NOT NULL,
        isActive INTEGER NOT NULL DEFAULT 1 CHECK (isActive IN (0, 1)),
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Audit log table - comprehensive activity tracking for compliance and debugging
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        username TEXT NOT NULL,
        action TEXT NOT NULL,
        entityType TEXT NOT NULL,
        entityId TEXT,
        details TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        ipAddress TEXT,
        userAgent TEXT,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Audit log archive table - warm storage for logs older than 90 days
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_log_archive (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        username TEXT NOT NULL,
        action TEXT NOT NULL,
        entityType TEXT NOT NULL,
        entityId TEXT,
        details TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        ipAddress TEXT,
        userAgent TEXT,
        archivedAt TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
  }

  /**
   * Create database indexes
   */
  private createIndexes(): void {
    // Person indexes
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_persons_email ON persons(email COLLATE NOCASE)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_persons_last_name ON persons(lastName)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_persons_first_name ON persons(firstName)');

    // Tube location indexes
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_tubes_location ON tubes(tankId, rackId, boxId)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_tubes_position ON tubes(rackId, boxId, position)');

    this.db.exec('CREATE INDEX IF NOT EXISTS idx_tubes_researcher_id ON tubes(researcherId)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_tubes_created_by_name ON tubes(createdByName)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_tubes_cell_type ON tubes(cellType)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_tubes_created_at ON tubes(createdAt DESC)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_tubes_updated_at ON tubes(updatedAt DESC)');
    
    // Search optimization indexes
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_tubes_donor_internal ON tubes(donorInternalId)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_tubes_donor_source ON tubes(donorSourceId)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_tubes_lot_number ON tubes(lotNumber)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_tubes_culture_condition ON tubes(cultureCondition)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_tubes_date ON tubes(date)');
    
    // User authentication indexes
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(apiKey)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_users_researcherId ON users(researcherId)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_users_personId ON users(personId)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON users(emailVerificationToken)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(passwordResetToken)');
    
    // OAuth 2.0 refresh token indexes
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(userId)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expiresAt)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_is_revoked ON refresh_tokens(isRevoked)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_created_at ON refresh_tokens(createdAt DESC)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_last_used ON refresh_tokens(lastUsedAt DESC)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_ip_address ON refresh_tokens(ipAddress)');

    // User sessions indexes
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(userId)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_token ON user_sessions(refreshToken)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expiresAt)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(isActive)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_user_sessions_last_used ON user_sessions(lastUsedAt DESC)');

    // Audit log indexes for optimal query performance
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(userId)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_audit_log_entity_type ON audit_log(entityType)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_audit_log_entity_id ON audit_log(entityId)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_audit_log_composite ON audit_log(entityType, entityId, timestamp DESC)');

    // Audit log archive indexes (minimal for performance)
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_audit_archive_timestamp ON audit_log_archive(timestamp DESC)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_audit_archive_userId ON audit_log_archive(userId)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_audit_archive_archivedAt ON audit_log_archive(archivedAt DESC)');

    // Researcher indexes
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_researchers_active ON researchers(active)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_researchers_personId ON researchers(personId)');
    
    // Configuration indexes for optimized performance
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_configuration_versions_updated_at ON configuration_versions(updated_at DESC)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_configuration_snapshots_created_at ON configuration_snapshots(created_at DESC)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_configuration_snapshots_version ON configuration_snapshots(version)');
  }

  /**
   * Create FTS5 virtual tables for full-text search
   *
   * FTS5 provides:
   * - Lightning-fast full-text search (optimized for LIKE %query% patterns)
   * - Relevance ranking with BM25 algorithm
   * - Substring matching without index penalties
   * - Scales to millions of records
   */
  private createFTS5Tables(): void {
    // Drop existing FTS5 tables and triggers to rebuild with clean schema
    // This removes corrupted researcherName data
    this.db.exec(`DROP TABLE IF EXISTS tubes_fts`);
    this.db.exec(`DROP TRIGGER IF EXISTS tubes_fts_insert`);
    this.db.exec(`DROP TRIGGER IF EXISTS tubes_fts_update`);
    this.db.exec(`DROP TRIGGER IF EXISTS tubes_fts_delete`);
    this.db.exec(`DROP TRIGGER IF EXISTS researchers_fts_update`);

    // Create FTS5 virtual table for tubes with tube-specific searchable fields
    // Researcher names are searched via JOIN (normalized approach)
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS tubes_fts USING fts5(
        tubeId UNINDEXED,
        cellType,
        donorInternalId,
        donorSourceId,
        lotNumber,
        media,
        cultureCondition,
        notes,
        date,
        concentration,
        tokenize = 'porter unicode61'
      )
    `);

    // Triggers to keep FTS table in sync with tubes table

    // INSERT: Add new tube to FTS
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS tubes_fts_insert
      AFTER INSERT ON tubes
      BEGIN
        INSERT INTO tubes_fts (
          tubeId, cellType, donorInternalId, donorSourceId,
          lotNumber, media, cultureCondition, notes, date, concentration
        )
        VALUES (
          NEW.id,
          COALESCE(NEW.cellType, ''),
          COALESCE(NEW.donorInternalId, ''),
          COALESCE(NEW.donorSourceId, ''),
          COALESCE(NEW.lotNumber, ''),
          COALESCE(NEW.media, ''),
          COALESCE(NEW.cultureCondition, ''),
          COALESCE(NEW.notes, ''),
          COALESCE(NEW.date, ''),
          COALESCE(NEW.concentration, '')
        );
      END
    `);

    // UPDATE: Update FTS when tube changes
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS tubes_fts_update
      AFTER UPDATE ON tubes
      BEGIN
        UPDATE tubes_fts
        SET
          cellType = COALESCE(NEW.cellType, ''),
          donorInternalId = COALESCE(NEW.donorInternalId, ''),
          donorSourceId = COALESCE(NEW.donorSourceId, ''),
          lotNumber = COALESCE(NEW.lotNumber, ''),
          media = COALESCE(NEW.media, ''),
          cultureCondition = COALESCE(NEW.cultureCondition, ''),
          notes = COALESCE(NEW.notes, ''),
          date = COALESCE(NEW.date, ''),
          concentration = COALESCE(NEW.concentration, '')
        WHERE tubeId = NEW.id;
      END
    `);

    // DELETE: Remove from FTS when tube is deleted
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS tubes_fts_delete
      AFTER DELETE ON tubes
      BEGIN
        DELETE FROM tubes_fts WHERE tubeId = OLD.id;
      END
    `);

    // Initial population: sync existing tubes into FTS table
    this.db.exec(`
      INSERT OR REPLACE INTO tubes_fts (
        tubeId, cellType, donorInternalId, donorSourceId,
        lotNumber, media, cultureCondition, notes, date, concentration
      )
      SELECT
        id,
        COALESCE(cellType, ''),
        COALESCE(donorInternalId, ''),
        COALESCE(donorSourceId, ''),
        COALESCE(lotNumber, ''),
        COALESCE(media, ''),
        COALESCE(cultureCondition, ''),
        COALESCE(notes, ''),
        COALESCE(date, ''),
        COALESCE(concentration, '')
      FROM tubes
    `);

    logger.info('FTS5 virtual tables created and populated');
  }

  /**
   * Create configuration tables following Oracle's normalized design
   */
  private createConfigurationTables(): void {
    // Table 1: Configuration Versions (append-only event log)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS configuration_versions (
        version INTEGER PRIMARY KEY AUTOINCREMENT,
        updated_at TEXT NOT NULL,
        change_description TEXT,
        changed_by TEXT,
        config_json TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Table 2: Configuration Current (single row for fast reads)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS configuration_current (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        version INTEGER NOT NULL,
        updated_at TEXT NOT NULL,
        config_json TEXT NOT NULL,
        FOREIGN KEY (version) REFERENCES configuration_versions(version)
      )
    `);

    // Table 3: Configuration Snapshots (point-in-time backups)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS configuration_snapshots (
        id TEXT PRIMARY KEY,
        version INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        description TEXT,
        created_by TEXT,
        size_bytes INTEGER NOT NULL,
        config_json TEXT NOT NULL,
        FOREIGN KEY (version) REFERENCES configuration_versions(version)
      )
    `);

    // Table 4: Security Configuration (admin settings for authentication and authorization)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS security_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        useEnhancedAuth INTEGER NOT NULL DEFAULT 0 CHECK (useEnhancedAuth IN (0, 1)),
        requireStrongPasswords INTEGER NOT NULL DEFAULT 0 CHECK (requireStrongPasswords IN (0, 1)),
        passwordMinLength INTEGER NOT NULL DEFAULT 8,
        passwordRequireSpecialChars INTEGER NOT NULL DEFAULT 0 CHECK (passwordRequireSpecialChars IN (0, 1)),
        sessionTimeoutMinutes INTEGER NOT NULL DEFAULT 480,
        maxConcurrentSessions INTEGER NOT NULL DEFAULT 3,
        enableRateLimiting INTEGER NOT NULL DEFAULT 1 CHECK (enableRateLimiting IN (0, 1)),
        loginAttemptsPerMinute INTEGER NOT NULL DEFAULT 10,
        lockoutDurationMinutes INTEGER NOT NULL DEFAULT 15,
        enableAdminControls INTEGER NOT NULL DEFAULT 1 CHECK (enableAdminControls IN (0, 1)),
        enableDetailedLogging INTEGER NOT NULL DEFAULT 1 CHECK (enableDetailedLogging IN (0, 1)),
        logFailedAttempts INTEGER NOT NULL DEFAULT 1 CHECK (logFailedAttempts IN (0, 1)),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  /**
   * Insert default default configuration
   */
  private insertDefaultConfiguration(): void {
    // Insert default configuration data if none exists
    this.ensureDefaultConfiguration();
  }

  private ensureDefaultConfiguration(): void {
    try {
      // Check if current configuration exists
      const current = this.db.prepare('SELECT id FROM configuration_current WHERE id = 1').get();
      
      if (!current) {
        // Import Configuration entity for default creation
        const { Configuration } = require('../../domain/entities/Configuration');
        
        // Create default configuration
        const defaultConfig = Configuration.createDefault();
        const configJson = JSON.stringify(defaultConfig.toData());
        const now = new Date().toISOString();
        
        // Insert into versions table first
        const insertVersion = this.db.prepare(`
          INSERT INTO configuration_versions (updated_at, change_description, changed_by, config_json)
          VALUES (?, ?, ?, ?)
        `);
        const result = insertVersion.run(now, 'Initial system configuration', 'system', configJson);
        
        const version = result.lastInsertRowid;
        
        // Insert into current table
        const insertCurrent = this.db.prepare(`
          INSERT INTO configuration_current (id, version, updated_at, config_json)
          VALUES (1, ?, ?, ?)
        `);
        insertCurrent.run(version, now, configJson);
        
        console.log('🔧 [CONFIG] Default configuration initialized');
      }
    } catch (error) {
      console.error('Failed to ensure default configuration:', error);
    }
  }

  /**
   * Generic query methods - no business logic
   */
  async queryOne<T>(sql: string, params: any[] = []): Promise<T | null> {
    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.get(...params) as T | undefined;
      return result || null;
    } catch (error) {
      logger.error('Query error:', error);
      throw error;
    }
  }

  async queryMany<T>(sql: string, params: any[] = []): Promise<T[]> {
    try {
      const stmt = this.db.prepare(sql);
      return stmt.all(...params) as T[];
    } catch (error) {
      logger.error('Query error:', error);
      throw error;
    }
  }

  async execute(sql: string, params: any[] = []): Promise<Database.RunResult> {
    try {
      const stmt = this.db.prepare(sql);
      return stmt.run(...params);
    } catch (error) {
      logger.error('Execute error:', error);
      throw error;
    }
  }

  async transaction<T>(fn: () => T): Promise<T> {
    const transaction = this.db.transaction(fn);
    return transaction();
  }

  /**
   * Get raw database instance for advanced operations (transactions, bulk operations)
   */
  getDatabase(): Database.Database {
    return this.db;
  }

  /**
   * Check database health
   */
  isHealthy(): boolean {
    try {
      const result = this.db.prepare('SELECT 1 as test').get() as { test: number };
      return result.test === 1;
    } catch {
      return false;
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      logger.info('SQLite database connection closed');
    }
  }
}
