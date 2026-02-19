-- Odysseus PostgreSQL Schema
-- Generated for PostgreSQL migration
-- All columns use snake_case naming convention

-- PERSONS TABLE
CREATE TABLE IF NOT EXISTS persons (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  position TEXT,
  department TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_persons_email ON persons(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_persons_last_name ON persons(last_name);
CREATE INDEX IF NOT EXISTS idx_persons_first_name ON persons(first_name);

-- RESEARCHERS TABLE
CREATE TABLE IF NOT EXISTS researchers (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approval_status TEXT NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved')),
  source TEXT NOT NULL DEFAULT 'admin' CHECK (source IN ('registration', 'admin'))
);

CREATE INDEX IF NOT EXISTS idx_researchers_active ON researchers(active);
CREATE INDEX IF NOT EXISTS idx_researchers_person_id ON researchers(person_id);
CREATE INDEX IF NOT EXISTS idx_researchers_approval_status ON researchers(approval_status);

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  api_key TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  password_hash TEXT,
  salt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  researcher_id TEXT REFERENCES researchers(id) ON DELETE SET NULL,
  person_id TEXT REFERENCES persons(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token TEXT,
  email_verification_expiry TIMESTAMPTZ,
  last_verification_email_sent TIMESTAMPTZ,
  password_reset_token TEXT,
  password_reset_expiry TIMESTAMPTZ,
  require_password_change BOOLEAN DEFAULT FALSE,
  last_password_change TIMESTAMPTZ,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  settings TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_researcher_id ON users(researcher_id);
CREATE INDEX IF NOT EXISTS idx_users_person_id ON users(person_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_is_demo ON users(is_demo);
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON users(email_verification_token);
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);

-- REFRESH TOKENS TABLE
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
  user_agent TEXT,
  ip_address TEXT
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_is_revoked ON refresh_tokens(is_revoked);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_created_at ON refresh_tokens(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_last_used ON refresh_tokens(last_used_at DESC);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_ip_address ON refresh_tokens(ip_address);

-- USER SESSIONS TABLE
CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token TEXT NOT NULL,
  device_info TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_token ON user_sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_used ON user_sessions(last_used_at DESC);

-- TUBES TABLE
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
  researcher_id TEXT REFERENCES researchers(id) ON DELETE SET NULL,
  created_by_name TEXT,
  media_type TEXT,
  media_supplements TEXT,
  media_selection TEXT,
  culture_condition TEXT,
  lot_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  is_locked BOOLEAN DEFAULT FALSE,
  locked_by TEXT,
  lock_note TEXT,
  locked_at TIMESTAMPTZ,
  shared_with_user_ids TEXT,
  search_vector TSVECTOR
);

-- Tubes indexes
CREATE INDEX IF NOT EXISTS idx_tubes_location ON tubes(tank_id, rack_id, box_id);
CREATE INDEX IF NOT EXISTS idx_tubes_position ON tubes(rack_id, box_id, position);
CREATE INDEX IF NOT EXISTS idx_tubes_researcher_id ON tubes(researcher_id);
CREATE INDEX IF NOT EXISTS idx_tubes_created_by_name ON tubes(created_by_name);
CREATE INDEX IF NOT EXISTS idx_tubes_cell_type ON tubes(cell_type);
CREATE INDEX IF NOT EXISTS idx_tubes_created_at ON tubes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tubes_updated_at ON tubes(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tubes_donor_internal ON tubes(donor_internal_id);
CREATE INDEX IF NOT EXISTS idx_tubes_donor_source ON tubes(donor_source_id);
CREATE INDEX IF NOT EXISTS idx_tubes_lot_number ON tubes(lot_number);
CREATE INDEX IF NOT EXISTS idx_tubes_culture_condition ON tubes(culture_condition);
CREATE INDEX IF NOT EXISTS idx_tubes_date ON tubes(date);
CREATE INDEX IF NOT EXISTS idx_tubes_is_locked ON tubes(is_locked);
CREATE INDEX IF NOT EXISTS idx_tubes_locked_by ON tubes(locked_by);
CREATE INDEX IF NOT EXISTS idx_tubes_search_vector ON tubes USING GIN(search_vector);

-- Trigger to auto-update search_vector on insert/update
CREATE OR REPLACE FUNCTION tubes_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.cell_type, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.species, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.donor_internal_id, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.donor_source_id, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.lot_number, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.source, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.media_type, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.notes, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.culture_condition, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.created_by_name, '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tubes_search_vector_trigger ON tubes;
CREATE TRIGGER tubes_search_vector_trigger
  BEFORE INSERT OR UPDATE ON tubes
  FOR EACH ROW EXECUTE FUNCTION tubes_search_vector_update();

-- LOOKUP VALUES TABLE (admin-managed dropdown options)
CREATE TABLE IF NOT EXISTS lookup_values (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('species', 'source', 'media')),
  value TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(category, value)
);

CREATE INDEX IF NOT EXISTS idx_lookup_values_category ON lookup_values(category);
CREATE INDEX IF NOT EXISTS idx_lookup_values_category_active ON lookup_values(category, is_active);

-- Add new tube metadata columns
ALTER TABLE tubes ADD COLUMN IF NOT EXISTS species TEXT;
ALTER TABLE tubes ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE tubes ADD COLUMN IF NOT EXISTS catalog_number TEXT;
ALTER TABLE tubes ADD COLUMN IF NOT EXISTS passage_number INTEGER
  CHECK (passage_number >= 0 AND passage_number <= 999);

CREATE INDEX IF NOT EXISTS idx_tubes_species ON tubes(species);
CREATE INDEX IF NOT EXISTS idx_tubes_source ON tubes(source);

-- AUDIT LOG TABLE
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_type ON audit_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_id ON audit_log(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_composite ON audit_log(entity_type, entity_id, timestamp DESC);

-- AUDIT LOG ARCHIVE TABLE
CREATE TABLE IF NOT EXISTS audit_log_archive (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_archive_timestamp ON audit_log_archive(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_archive_user_id ON audit_log_archive(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_archive_archived_at ON audit_log_archive(archived_at DESC);

-- CONFIGURATION TABLES

-- Current configuration (single row table)
CREATE TABLE IF NOT EXISTS configuration_current (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  config_json TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Configuration version history
CREATE TABLE IF NOT EXISTS configuration_versions (
  version SERIAL PRIMARY KEY,
  config_json TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  change_description TEXT,
  changed_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_configuration_versions_updated_at ON configuration_versions(updated_at DESC);

-- Configuration snapshots (named saves)
CREATE TABLE IF NOT EXISTS configuration_snapshots (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  config_json TEXT NOT NULL,
  version INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_configuration_snapshots_created_at ON configuration_snapshots(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_configuration_snapshots_version ON configuration_snapshots(version);

-- Security configuration (separate from main config for security)
CREATE TABLE IF NOT EXISTS security_config (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
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
);

-- INITIAL DATA

-- Insert default security config if not exists
INSERT INTO security_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Default configuration is created by PostgresContext.insertDefaultConfiguration()
-- using Configuration.createDefault() which generates proper default equipment

-- Reindex search vectors to pick up new trigger columns (species, source)
UPDATE tubes SET updated_at = updated_at;
