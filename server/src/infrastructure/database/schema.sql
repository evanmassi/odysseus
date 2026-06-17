-- Odysseus PostgreSQL Schema (Reference Only)
--
-- This file documents the final-state schema after all migrations have run.
-- It is NOT executed at runtime — migrations handle all DDL.
-- Last regenerated: 2026-03-12

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- LABS TABLE (root tenant — created before all FK references)

CREATE TABLE labs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  demo_limits JSONB
);

CREATE INDEX idx_labs_slug ON labs(slug);
CREATE INDEX idx_labs_is_active ON labs(is_active);

-- STORAGE TABLES (must come before users/tubes due to FK ordering)

CREATE TABLE storage_versions (
  version SERIAL PRIMARY KEY,
  lab_id TEXT NOT NULL REFERENCES labs(id),
  updated_at TIMESTAMPTZ NOT NULL,
  change_description TEXT,
  changed_by TEXT,
  config_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_storage_versions_updated_at ON storage_versions(updated_at DESC);

CREATE TABLE storage_current (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  lab_id TEXT NOT NULL REFERENCES labs(id) UNIQUE,
  version INTEGER NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  config_json JSONB NOT NULL,
  FOREIGN KEY (version) REFERENCES storage_versions(version)
);

CREATE TABLE storage_snapshots (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL REFERENCES labs(id),
  version INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  description TEXT,
  created_by TEXT,
  size_bytes INTEGER NOT NULL,
  config_json JSONB NOT NULL,
  FOREIGN KEY (version) REFERENCES storage_versions(version)
);

CREATE INDEX idx_storage_snapshots_created_at ON storage_snapshots(created_at DESC);
CREATE INDEX idx_storage_snapshots_version ON storage_snapshots(version);

CREATE TABLE security_config (
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
);

-- PERSONS TABLE

CREATE TABLE persons (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  position TEXT,
  department TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_persons_email ON persons(LOWER(email));
CREATE INDEX idx_persons_last_name ON persons(last_name);
CREATE INDEX idx_persons_first_name ON persons(first_name);

-- RESEARCHERS TABLE

CREATE TABLE researchers (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL,
  lab_id TEXT NOT NULL REFERENCES labs(id),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL,
  approval_status TEXT NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved')),
  source TEXT NOT NULL DEFAULT 'admin' CHECK (source IN ('registration', 'admin')),
  FOREIGN KEY (person_id) REFERENCES persons(id)
);

CREATE INDEX idx_researchers_active ON researchers(active);
CREATE INDEX idx_researchers_person_id ON researchers(person_id);
CREATE INDEX idx_researchers_approval_status ON researchers(approval_status);
CREATE INDEX idx_researchers_lab_id ON researchers(lab_id);

-- USERS TABLE

CREATE TABLE users (
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
);

CREATE INDEX idx_users_api_key ON users(api_key);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_researcher_id ON users(researcher_id);
CREATE INDEX idx_users_person_id ON users(person_id);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_email_verification_token ON users(email_verification_token);
CREATE INDEX idx_users_password_reset_token ON users(password_reset_token);
CREATE INDEX idx_users_lab_id ON users(lab_id);

-- TUBES TABLE

CREATE TABLE tubes (
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
  search_vector TSVECTOR,
  CONSTRAINT tubes_lab_location_unique UNIQUE(lab_id, tank_id, rack_id, box_id, position),
  FOREIGN KEY (researcher_id) REFERENCES researchers(id),
  FOREIGN KEY (locked_by) REFERENCES users(id)
);

CREATE INDEX idx_tubes_location ON tubes(tank_id, rack_id, box_id);
CREATE INDEX idx_tubes_position ON tubes(rack_id, box_id, position);
CREATE INDEX idx_tubes_researcher_id ON tubes(researcher_id);
CREATE INDEX idx_tubes_created_by_name ON tubes(created_by_name);
CREATE INDEX idx_tubes_cell_type ON tubes(cell_type);
CREATE INDEX idx_tubes_created_at ON tubes(created_at DESC);
CREATE INDEX idx_tubes_updated_at ON tubes(updated_at DESC);
CREATE INDEX idx_tubes_donor_internal ON tubes(donor_internal_id);
CREATE INDEX idx_tubes_donor_source ON tubes(donor_source_id);
CREATE INDEX idx_tubes_lot_number ON tubes(lot_number);
CREATE INDEX idx_tubes_culture_condition ON tubes(culture_condition);
CREATE INDEX idx_tubes_date ON tubes(date);
CREATE INDEX idx_tubes_is_locked ON tubes(is_locked);
CREATE INDEX idx_tubes_locked_by ON tubes(locked_by);
CREATE INDEX idx_tubes_species ON tubes(species);
CREATE INDEX idx_tubes_source ON tubes(source);
CREATE INDEX idx_tubes_lab_id ON tubes(lab_id);
CREATE INDEX idx_tubes_lab_location ON tubes(lab_id, tank_id, rack_id, box_id);
CREATE INDEX idx_tubes_search_vector ON tubes USING GIN(search_vector);
CREATE INDEX idx_tubes_cell_type_trgm ON tubes USING GIN(cell_type gin_trgm_ops);
CREATE INDEX idx_tubes_donor_internal_trgm ON tubes USING GIN(donor_internal_id gin_trgm_ops);
CREATE INDEX idx_tubes_donor_source_trgm ON tubes USING GIN(donor_source_id gin_trgm_ops);
CREATE INDEX idx_tubes_lot_number_trgm ON tubes USING GIN(lot_number gin_trgm_ops);
CREATE INDEX idx_tubes_notes_trgm ON tubes USING GIN(notes gin_trgm_ops);

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
$$ LANGUAGE plpgsql;

CREATE TRIGGER tubes_search_vector_trigger
  BEFORE INSERT OR UPDATE ON tubes
  FOR EACH ROW EXECUTE FUNCTION tubes_search_vector_update();

-- REFRESH TOKENS TABLE

CREATE TABLE refresh_tokens (
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
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_refresh_tokens_is_revoked ON refresh_tokens(is_revoked);
CREATE INDEX idx_refresh_tokens_created_at ON refresh_tokens(created_at DESC);
CREATE INDEX idx_refresh_tokens_last_used ON refresh_tokens(last_used_at DESC);
CREATE INDEX idx_refresh_tokens_ip_address ON refresh_tokens(ip_address);

-- USER SESSIONS TABLE

CREATE TABLE user_sessions (
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
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_refresh_token ON user_sessions(refresh_token);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_is_active ON user_sessions(is_active);
CREATE INDEX idx_user_sessions_last_used ON user_sessions(last_used_at DESC);

-- AUDIT LOG TABLE

CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT,
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
);

CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_entity_type ON audit_log(entity_type);
CREATE INDEX idx_audit_log_entity_id ON audit_log(entity_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_log_composite ON audit_log(entity_type, entity_id, timestamp DESC);
CREATE INDEX idx_audit_log_lab_id ON audit_log(lab_id);

-- LOOKUP VALUES TABLE

CREATE TABLE lookup_values (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('species', 'source', 'media', 'specimen_type')),
  lab_id TEXT NOT NULL REFERENCES labs(id),
  value TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lab_id, category, value)
);

CREATE INDEX idx_lookup_values_category ON lookup_values(category);
CREATE INDEX idx_lookup_values_category_active ON lookup_values(category, is_active);
CREATE INDEX idx_lookup_values_lab_id ON lookup_values(lab_id);

-- AUDIT LOG ARCHIVE TABLE

CREATE TABLE audit_log_archive (
  id TEXT PRIMARY KEY,
  user_id TEXT,
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
);

CREATE INDEX idx_audit_archive_timestamp ON audit_log_archive(timestamp DESC);
CREATE INDEX idx_audit_archive_user_id ON audit_log_archive(user_id);
CREATE INDEX idx_audit_archive_archived_at ON audit_log_archive(archived_at DESC);

-- INVITE CODES TABLE

CREATE TABLE invite_codes (
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
);

CREATE INDEX idx_invite_codes_lab_id ON invite_codes(lab_id);
CREATE INDEX idx_invite_codes_code ON invite_codes(code);

-- DONORS TABLE

CREATE TABLE donors (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL REFERENCES labs(id),
  donor_source_id TEXT,
  donor_internal_id TEXT,
  species TEXT,
  age TEXT,
  sex TEXT,
  ethnicity TEXT,
  clinical_status TEXT,
  diagnosis TEXT,
  disease_stage TEXT,
  notes TEXT,
  is_curated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT donors_has_at_least_one_id
    CHECK (donor_source_id IS NOT NULL OR donor_internal_id IS NOT NULL)
);

CREATE INDEX idx_donors_lab_id ON donors(lab_id);
CREATE INDEX idx_donors_source_id ON donors(lab_id, donor_source_id) WHERE donor_source_id IS NOT NULL;
CREATE INDEX idx_donors_internal_id ON donors(lab_id, donor_internal_id) WHERE donor_internal_id IS NOT NULL;
CREATE INDEX idx_donors_uncurated ON donors(lab_id, is_curated) WHERE is_curated = FALSE;
CREATE INDEX idx_donors_source_id_trgm ON donors USING gin (donor_source_id gin_trgm_ops) WHERE donor_source_id IS NOT NULL;
CREATE INDEX idx_donors_internal_id_trgm ON donors USING gin (donor_internal_id gin_trgm_ops) WHERE donor_internal_id IS NOT NULL;

-- DONOR COLLECTION HISTORY TABLE

CREATE TABLE donor_collection_history (
  id TEXT PRIMARY KEY,
  donor_id TEXT NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
  collection_date DATE,
  specimen_type TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_donor_collection_history_donor_id ON donor_collection_history(donor_id);

-- MIGRATION TRACKING TABLE (managed by migrationRunner.ts)

CREATE TABLE schema_migrations (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
