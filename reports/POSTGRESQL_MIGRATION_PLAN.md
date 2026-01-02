# Odysseus: SQLite to PostgreSQL Migration Plan

**Document Version:** 7.1
**Created:** 2024-01-XX
**Last Updated:** Implementation started - Phases 1-2 complete
**Status:** IN PROGRESS
**Purpose:** Complete migration from SQLite to PostgreSQL for cloud deployment

---

## Progress Tracker

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Project Setup (branch, Docker, env file) | ✅ Complete |
| 2 | Database Context (PostgresContext.ts) | ✅ Complete |
| 3 | Repository Conversion (9 repositories) | 🔄 In Progress (8/9) |
| 4 | Full-Text Search | ⬜ Not started |
| 5 | Server Configuration | ⬜ Not started |
| 6 | Client Configuration | ⬜ Not started |
| 7 | Electron Updates | ⬜ Not started |
| 8 | Testing & Deployment | ⬜ Not started |

**Current Position:** Phase 3 - Repository Conversion

### Repository Conversion Status

| # | Repository | Queries | Status | Notes |
|---|------------|---------|--------|-------|
| 1 | PersonRepository | 7 | ✅ Complete | Mapper updated, factory updated |
| 2 | AuditArchiveRepository | 6 | ✅ Complete | Inline mapper, ServiceContainer updated |
| 3 | SessionRepository | 18 | ✅ Complete | Mapper updated, datetime→Date, julianday→EXTRACT |
| 4 | RefreshTokenRepository | 20 | ✅ Complete | Mapper updated, julianday→EXTRACT for lifespan |
| 5 | AuditRepository | 14 | ✅ Complete | Inline mapper, transaction for bulk insert |
| 6 | UserRepository | 38 | ✅ Complete | Mapper updated, ILIKE for search, activity via sessions |
| 7 | ResearcherRepository | 43 | ✅ Complete | Mapper updated, JOINs with persons, native boolean |
| 8 | ConfigurationRepository | 67 | ✅ Complete | JSON config storage, transaction for versioning, snake_case security_config |
| 9 | TubeRepository | 33 | ✅ Complete | Mapper updated, tsvector FTS with ts_rank, hybrid search with researcher name JOINs |

### Files Created/Modified
- `server/.env.development` - Local PostgreSQL connection
- `server/src/infrastructure/database/PostgresContext.ts` - Database context
- `server/src/infrastructure/repositories/PersonRepository.ts` - Converted
- `server/src/infrastructure/database/mappers/PersonMapper.ts` - Updated for snake_case
- `server/src/infrastructure/repositories/index.ts` - Dual-context factory
- `server/src/infrastructure/repositories/AuditArchiveRepository.ts` - Converted
- `server/src/infrastructure/di/ServiceContainer.ts` - Uses PostgresContext for AuditArchiveRepository
- `server/src/infrastructure/repositories/SessionRepository.ts` - Converted (was SQLiteSessionRepository)
- `server/src/infrastructure/database/mappers/UserSessionMapper.ts` - Updated for snake_case, native boolean
- `server/src/infrastructure/repositories/RefreshTokenRepository.ts` - Converted (was SQLiteRefreshTokenRepository)
- `server/src/infrastructure/database/mappers/RefreshTokenMapper.ts` - Updated for snake_case, native boolean
- `server/src/infrastructure/repositories/AuditRepository.ts` - Converted (was SQLiteAuditRepository)
- `server/src/infrastructure/repositories/UserRepository.ts` - Converted (was SQLiteUserRepository)
- `server/src/infrastructure/database/mappers/UserMapper.ts` - Updated for snake_case, native boolean
- `server/src/infrastructure/repositories/ResearcherRepository.ts` - Converted (was SQLiteResearcherRepository)
- `server/src/infrastructure/database/mappers/ResearcherMapper.ts` - Updated for snake_case, native boolean
- `server/src/infrastructure/repositories/ConfigurationRepository.ts` - Converted (was SQLiteConfigurationRepository)
- `server/src/infrastructure/repositories/TubeRepository.ts` - Converted (was SQLiteTubeRepository)
- `server/src/infrastructure/database/mappers/TubeMapper.ts` - Updated for snake_case, native boolean/Date, removed SqliteDateMapper

### Lessons Learned (From Conversions)

| Issue | Solution |
|-------|----------|
| Factory needs both contexts during migration | Added `postgresContext` field, initialize both, close both |
| Interface naming collision | Alias the *implementation*: `PersonRepository as PersonRepositoryImpl` (not the interface) |
| Mapper used SqliteDateMapper | Remove dependency - PostgreSQL returns native Date objects |
| PostgreSQL COUNT(*) returns string | Use `parseInt(result?.count \|\| '0', 10)` |
| SQLite `result.changes` doesn't exist | Use `result.rowCount ?? 0` for affected row count |
| QueryResultRow type constraint | Generic methods need `<T extends QueryResultRow>` |
| Some repos in ServiceContainer, not factory | Check both files when updating context usage |
| Dynamic WHERE clause with $1, $2, $3 | Track `paramIndex` variable, increment with `$${paramIndex++}` |
| Inline mappers (rowToEntry methods) | Update column names directly in the method |
| SQLite datetime() comparisons | PostgreSQL compares Date objects natively, remove datetime() wrapper |
| SQLite julianday() for duration | Use `EXTRACT(EPOCH FROM (col2 - col1)) / 60` for minutes |
| SQLite isActive = 1/0 | PostgreSQL uses native BOOLEAN (TRUE/FALSE) |
| Batch IN clause with ? placeholders | Generate `$1, $2, $3` with `sessionIds.map((_, i) => \`$\${i + 1}\`).join(',')` |
| **Comments mentioning "PostgreSQL"** | **Don't** - per AGENTS.md, code shows the database; comments explain "why" not "what" |
| SQLite `LIKE` for case-insensitive | PostgreSQL uses `ILIKE` for case-insensitive pattern matching |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current vs Target Architecture](#2-current-vs-target-architecture)
3. [Files Requiring Changes](#3-files-requiring-changes)
4. [Database Schema Conversion](#4-database-schema-conversion)
5. [Query Syntax Conversion Guide](#5-query-syntax-conversion-guide)
6. [Full-Text Search Migration](#6-full-text-search-migration)
7. [Client Configuration Changes](#7-client-configuration-changes)
8. [Server Configuration Changes](#8-server-configuration-changes)
9. [Environment Variables](#9-environment-variables)
10. [Electron App Changes](#10-electron-app-changes)
11. [Dependencies Update](#11-dependencies-update)
12. [Migration Phases](#12-migration-phases)
13. [Testing Strategy](#13-testing-strategy)
14. [Rollback Plan](#14-rollback-plan)
15. [Deployment Checklist](#15-deployment-checklist)
16. [Data Mapper Changes](#16-data-mapper-changes)
17. [Transaction Pattern Changes](#17-transaction-pattern-changes)
18. [Error Handling Updates](#18-error-handling-updates)
19. [Secret Management](#19-secret-management)
20. [Firebase Code Decision](#20-firebase-code-decision)
21. [Index Recreation (42 Indexes)](#21-index-recreation-42-indexes)
22. [Column Naming Convention Decision](#22-column-naming-convention-decision)
23. [Build Script Updates](#23-build-script-updates)
24. [Sync Endpoints Removal](#24-sync-endpoints-removal)
25. [Backup Strategy Changes](#25-backup-strategy-changes)
26. [Data Migration Strategy](#26-data-migration-strategy)
27. [Railway Setup Guide](#27-railway-setup-guide)
28. [SSL/TLS Configuration](#28-ssltls-configuration)
29. [Transition Period Strategy](#29-transition-period-strategy)
30. [Scheduled Jobs Review](#30-scheduled-jobs-review)
31. [Electron Offline Caching Strategy](#31-electron-offline-caching-strategy)
32. [Local Development Setup](#32-local-development-setup)
33. [Repository Naming Convention](#33-repository-naming-convention)
34. [Conversion Methodology](#34-conversion-methodology)

---

## 1. Executive Summary

### What We're Doing
Converting Odysseus from a local SQLite database to a cloud-hosted PostgreSQL database, enabling multi-user real-time collaboration.

### Why
- SQLite is designed for single-user/embedded use
- PostgreSQL handles multiple simultaneous users properly
- Enables cloud deployment for team-wide access
- Future-proof and industry-standard

### Scope
| Category | Count | Effort |
|----------|-------|--------|
| Repository files to refactor | 9 | Medium |
| SQL queries to convert | ~268 | Medium (mostly mechanical) |
| Full-text search rewrite | 1 module | High |
| Data mapper updates (snake_case + booleans) | 6 files | Easy |
| Database indexes to recreate | 42 | Easy (copy/paste) |
| Client config files | 2 | Easy |
| Server config files | 3 | Medium |
| New files to create | 1 (PostgresContext) | Medium |
| Files to delete | 3 (Firebase services) | Easy |
| Sync endpoints to remove | 4 routes | Easy |

### Key Principle
**REFACTOR, NOT REWRITE** - We are updating existing files to use PostgreSQL syntax. The architecture, business logic, and API contracts remain unchanged.

### Clean Architecture Compliance (AGENTS.md)

This migration strictly follows Clean Architecture principles from AGENTS.md:

| Layer | What Changes | What Stays Same |
|-------|--------------|-----------------|
| **Domain** | Nothing | Entities, Value Objects, Repository Interfaces, Domain Services |
| **Application** | Nothing | Application Services, DTOs, Use Cases |
| **Infrastructure** | SQLite → PostgreSQL implementations | Mapper patterns, Repository structure |
| **Presentation** | Nothing | Controllers, Routes, Middleware |

**Critical Rule Preserved:** Domain layer has ZERO dependencies on infrastructure. Repository interfaces stay in `domain/repositories/`, implementations move from SQLite to PostgreSQL in `infrastructure/repositories/`.

---

## 2. Current vs Target Architecture

### Current Architecture (Local SQLite)
```
┌─────────────────────────────────────────────────────────┐
│                    Electron App                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  React UI    │→ │Express Server│→ │   SQLite     │  │
│  │  (Renderer)  │  │  (Embedded)  │  │  (Local DB)  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Target Architecture (Cloud PostgreSQL)
```
User Computers:                          Cloud (Railway/etc):

┌──────────────────┐                    ┌─────────────────────────┐
│  Electron App    │───── HTTPS ───────▶│   Express Server        │
│  (React UI only) │                    │        ↓                │
│  + Local Cache   │◀──── WSS ─────────▶│   PostgreSQL DB         │
└──────────────────┘   (Socket.IO)      │  (Single Source)        │
                                        └─────────────────────────┘
┌──────────────────┐                              ▲
│  Electron App    │──────────────────────────────┤
└──────────────────┘                              │
        ⋮                                         │
┌──────────────────┐                              │
│  Electron App    │──────────────────────────────┘
└──────────────────┘
```

### What Changes
| Component | Before | After |
|-----------|--------|-------|
| Database | SQLite file | PostgreSQL server |
| Server location | Inside Electron | Cloud (Railway) |
| Electron app | Full stack | Client only |
| Data access | File system | Network (TCP) |
| Concurrency | Single writer | Multiple writers |

### What Stays the Same (Per AGENTS.md Guidelines)
- **All API endpoints** (routes, controllers, middleware)
- **Business logic** (domain layer, services) - Domain has ZERO dependencies
- **Frontend** (React components, hooks, Zustand stores, React Query patterns)
- **Authentication** (JWT, bcrypt password hashing, rate limiting, helmet.js security headers)
- **Real-time updates** (Socket.IO event handlers, query bridge pattern)
- **Validation schemas** (`@odysseus/shared-schemas` - Single Source of Truth)
- **Repository interfaces** (only implementations change, not contracts)
- **Naming conventions** (PascalCase services, camelCase hooks, etc.)
- **Clean Architecture layers** (presentation → application → domain ← infrastructure)

---

## 3. Files Requiring Changes

### 3.1 Database Layer (HIGH PRIORITY)

#### File: `server/src/infrastructure/database/SQLiteContext.ts`
**Action:** Refactor to `PostgresContext.ts`

| Current | Target |
|---------|--------|
| `better-sqlite3` driver | `pg` (node-postgres) driver |
| Synchronous queries | Async queries (already async interface) |
| File path configuration | Connection string configuration |
| WAL pragma settings | PostgreSQL connection pool settings |
| FTS5 virtual tables | PostgreSQL tsvector/tsquery |

**Key Changes:**
```typescript
// BEFORE (SQLite)
import Database from 'better-sqlite3';
this.db = new Database(this.dbPath);
this.db.pragma('journal_mode = WAL');

// AFTER (PostgreSQL)
import { Pool } from 'pg';
this.pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
  // Connection pool settings (recommended for ~10 concurrent users)
  max: 20,                    // Maximum connections in pool
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Fail fast if can't connect in 2s
});
```

**Lines affected:** ~594 lines (complete refactor of this file)

**Naming Convention (per AGENTS.md):**
- New file: `PostgresContext.ts` (PascalCase - infrastructure class)
- Export: `export class PostgresContext` (named export, no default)
- Location: `server/src/infrastructure/database/`

---

### 3.2 Repository Files (MEDIUM PRIORITY)

All repositories need query syntax updates. The interface contracts remain unchanged.

> **IMPORTANT: Repository Renaming** - All repository files will be renamed to remove the `SQLite` prefix. This follows industry best practices - implementation details (database technology) should not leak into filenames. See Section 33 for full rationale.

#### File: `SQLiteTubeRepository.ts` → `TubeRepository.ts`
**Lines:** ~751
**Queries:** ~60

**Changes Required:**
- **Rename file** from `SQLiteTubeRepository.ts` to `TubeRepository.ts`
- Parameter syntax: `?` → `$1, $2, $3...`
- Date functions: `date("now")` → `NOW()`
- Boolean handling: `INTEGER 0/1` → `BOOLEAN`
- FTS5 search → PostgreSQL full-text search
- `INSERT OR REPLACE` → `INSERT ... ON CONFLICT DO UPDATE`

---

#### File: `SQLiteResearcherRepository.ts` → `ResearcherRepository.ts`
**Lines:** ~759
**Queries:** ~40

**Changes Required:**
- **Rename file** from `SQLiteResearcherRepository.ts` to `ResearcherRepository.ts`
- Parameter syntax updates
- `COLLATE NOCASE` → `ILIKE` for case-insensitive search
- Boolean field handling

---

#### File: `SQLiteUserRepository.ts` → `UserRepository.ts`
**Lines:** ~509
**Queries:** ~35

**Changes Required:**
- **Rename file** from `SQLiteUserRepository.ts` to `UserRepository.ts`
- Parameter syntax updates
- Boolean fields: `emailVerified`, `requirePasswordChange`
- `COLLATE NOCASE` on username/email

---

#### File: `SQLiteConfigurationRepository.ts` → `ConfigurationRepository.ts`
**Lines:** ~1,150
**Queries:** ~50

**Changes Required:**
- **Rename file** from `SQLiteConfigurationRepository.ts` to `ConfigurationRepository.ts`
- Parameter syntax updates
- `AUTOINCREMENT` → `SERIAL` or `GENERATED ALWAYS AS IDENTITY`
- `datetime('now')` → `NOW()`
- Boolean fields in security_config

---

#### File: `SQLiteAuditRepository.ts` → `AuditRepository.ts`
**Lines:** ~330
**Queries:** ~25

**Changes Required:**
- **Rename file** from `SQLiteAuditRepository.ts` to `AuditRepository.ts`
- Parameter syntax updates
- Date filtering syntax
- Timestamp comparisons

---

#### File: `AuditArchiveRepository.ts` (name unchanged)
**Lines:** ~214
**Queries:** ~12

**Changes Required:**
- Parameter syntax updates
- Date arithmetic for archival queries

---

#### File: `SQLiteRefreshTokenRepository.ts` → `RefreshTokenRepository.ts`
**Lines:** ~265
**Queries:** ~20

**Changes Required:**
- **Rename file** from `SQLiteRefreshTokenRepository.ts` to `RefreshTokenRepository.ts`
- Parameter syntax updates
- Boolean field: `isRevoked`
- Expiration date comparisons

---

#### File: `SQLiteSessionRepository.ts` → `SessionRepository.ts`
**Lines:** ~261
**Queries:** ~18

**Changes Required:**
- **Rename file** from `SQLiteSessionRepository.ts` to `SessionRepository.ts`
- Parameter syntax updates
- Boolean field: `isActive`
- Session expiration logic

---

#### File: `SQLitePersonRepository.ts` → `PersonRepository.ts`
**Lines:** ~78
**Queries:** ~8

**Changes Required:**
- **Rename file** from `SQLitePersonRepository.ts` to `PersonRepository.ts`
- Parameter syntax updates
- `COLLATE NOCASE` on email

---

### 3.3 Repository Factory

#### File: `server/src/infrastructure/repositories/index.ts`
**Lines:** ~203

**Changes Required:**
- Import PostgresContext instead of SQLiteContext
- Update initialization to use connection string
- Rename factory methods (optional, for clarity)

---

### 3.4 Client Configuration (EASY)

#### File: `client/src/infrastructure/api/client.ts`
**Line 228:** Hardcoded `http://localhost:3001/api`

**Change:**
```typescript
// BEFORE
export const apiClient = new ApiClient({
  baseURL: 'http://localhost:3001/api',
  timeout: 30000,
});

// AFTER
export const apiClient = new ApiClient({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 30000,
});
```

---

#### File: `client/src/infrastructure/socket/SocketService.ts`
**Lines 21-32:** Hardcoded `http://localhost:3001`

**Change:**
```typescript
// BEFORE
const SOCKET_CONFIG = {
  url: 'http://localhost:3001',
  // ...
};

// AFTER
const SOCKET_CONFIG = {
  url: import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001',
  // ...
};
```

---

### 3.5 Server Entry Point

#### File: `server/src/index.ts`
**Lines 77-104:** Database path logic

**Changes Required:**
- Remove SQLite file path logic
- Add PostgreSQL connection string from environment
- Update initialization call

```typescript
// BEFORE
let sqliteDbPath: string;
if (isElectron && process.env.ODYSSEUS_DATA_DIR) {
  sqliteDbPath = path.join(process.env.ODYSSEUS_DATA_DIR, 'odysseus-data.sqlite');
} else {
  sqliteDbPath = path.join(dataDir, 'odysseus.sqlite');
}
this.repositoryFactory = initializeRepositories(sqliteDbPath);

// AFTER
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}
this.repositoryFactory = initializeRepositories(databaseUrl);
```

---

### 3.6 Electron Main Process

#### File: `electron/main.js`
**Lines 84-108:** Server embedding and environment setup

**Changes Required:**
- Remove embedded server startup (server runs in cloud)
- Add API URL configuration
- Keep JWT secret for local token validation (if needed)

**Decision Point:** The Electron app becomes a "thin client" that only contains the React UI. The Express server is deployed separately to the cloud.

---

## 4. Database Schema Conversion

### 4.1 Data Type Mappings

| SQLite | PostgreSQL | Notes |
|--------|------------|-------|
| `TEXT` | `TEXT` or `VARCHAR` | Same |
| `INTEGER` | `INTEGER` or `BIGINT` | Same |
| `REAL` | `REAL` or `DOUBLE PRECISION` | Same |
| `INTEGER (0/1)` for boolean | `BOOLEAN` | **Requires query updates** |
| `TEXT` for timestamps | `TIMESTAMPTZ` | Recommended for timezone handling |
| `INTEGER PRIMARY KEY AUTOINCREMENT` | `SERIAL PRIMARY KEY` or `BIGSERIAL` | PostgreSQL auto-increment |

### 4.2 Schema Conversion: `tubes` Table

```sql
-- SQLite (Current)
CREATE TABLE tubes (
  id TEXT PRIMARY KEY,
  tankId TEXT NOT NULL,
  rackId TEXT NOT NULL,
  boxId TEXT NOT NULL,
  position INTEGER NOT NULL,
  cellType TEXT,
  isLocked INTEGER DEFAULT 0,  -- Boolean as INTEGER
  createdAt TEXT NOT NULL,     -- Timestamp as TEXT
  updatedAt TEXT NOT NULL,
  -- ...
);

-- PostgreSQL (Target) - Note: ALL columns use snake_case
CREATE TABLE tubes (
  id TEXT PRIMARY KEY,
  tank_id TEXT NOT NULL,
  rack_id TEXT NOT NULL,
  box_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  cell_type TEXT,
  is_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  -- ...
);
```

### 4.3 Schema Conversion: `users` Table

```sql
-- SQLite (Current)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  emailVerified INTEGER NOT NULL DEFAULT 0 CHECK (emailVerified IN (0, 1)),
  requirePasswordChange INTEGER NOT NULL DEFAULT 0,
  -- ...
);

-- PostgreSQL (Target)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  require_password_change BOOLEAN NOT NULL DEFAULT FALSE,
  -- ...
);
```

### 4.4 Schema Conversion: `configuration_versions` Table

```sql
-- SQLite (Current)
CREATE TABLE configuration_versions (
  version INTEGER PRIMARY KEY AUTOINCREMENT,
  updated_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- PostgreSQL (Target)
CREATE TABLE configuration_versions (
  version SERIAL PRIMARY KEY,
  updated_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4.5 Complete Schema File

A complete PostgreSQL schema file will be generated as:
`server/src/infrastructure/database/schema.sql`

---

## 5. Query Syntax Conversion Guide

### 5.1 Parameter Placeholders

```sql
-- SQLite (camelCase columns)
SELECT * FROM tubes WHERE id = ?
SELECT * FROM tubes WHERE tankId = ? AND rackId = ?

-- PostgreSQL (snake_case columns + numbered params)
SELECT * FROM tubes WHERE id = $1
SELECT * FROM tubes WHERE tank_id = $1 AND rack_id = $2
```

**Conversion Rules:**
1. Replace each `?` with `$n` where n is the 1-based parameter position
2. Convert column names from camelCase to snake_case (see Section 22.5 for full mapping)

### 5.2 UPSERT (Insert or Update)

```sql
-- SQLite
INSERT OR REPLACE INTO tubes (id, tankId, ...) VALUES (?, ?, ...)

-- PostgreSQL (snake_case columns)
INSERT INTO tubes (id, tank_id, rack_id, ...)
VALUES ($1, $2, $3, ...)
ON CONFLICT (id) DO UPDATE SET
  tank_id = EXCLUDED.tank_id,
  rack_id = EXCLUDED.rack_id,
  -- ... other fields
```

### 5.3 Date/Time Functions

```sql
-- SQLite
SELECT * FROM tubes WHERE date < date("now", "-30 days")
datetime('now')

-- PostgreSQL
SELECT * FROM tubes WHERE date < NOW() - INTERVAL '30 days'
NOW()
```

### 5.4 Case-Insensitive Comparison

```sql
-- SQLite
WHERE email COLLATE NOCASE = ?
CREATE INDEX idx ON table(column COLLATE NOCASE)

-- PostgreSQL
WHERE LOWER(email) = LOWER($1)
-- OR use ILIKE for pattern matching
WHERE email ILIKE $1
CREATE INDEX idx ON table(LOWER(column))
```

### 5.5 Boolean Values

```typescript
// SQLite (in code) - integers 0/1, camelCase columns
const isLocked = row.isLocked === 1;
await execute('UPDATE tubes SET isLocked = ?', [locked ? 1 : 0]);

// PostgreSQL (in code) - native booleans, snake_case columns
const isLocked = row.is_locked; // Already boolean from PostgreSQL
await execute('UPDATE tubes SET is_locked = $1', [locked]); // Pass boolean directly
```

### 5.6 LIKE with Wildcards

```sql
-- SQLite
WHERE name LIKE '%' || ? || '%'

-- PostgreSQL (same, or use ILIKE for case-insensitive)
WHERE name LIKE '%' || $1 || '%'
WHERE name ILIKE '%' || $1 || '%'
```

### 5.7 Returning Inserted/Updated Rows

```sql
-- SQLite (requires separate query)
INSERT INTO tubes (...) VALUES (...)
-- Then: SELECT * FROM tubes WHERE id = ?

-- PostgreSQL (single query)
INSERT INTO tubes (...) VALUES (...)
RETURNING *
```

### 5.8 Dynamic IN Clauses

```typescript
// SQLite
const placeholders = ids.map(() => '?').join(',');
const sql = `SELECT * FROM tubes WHERE id IN (${placeholders})`;
await query(sql, ids);

// PostgreSQL
const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
const sql = `SELECT * FROM tubes WHERE id IN (${placeholders})`;
await query(sql, ids);

// OR use ANY() for simpler syntax
const sql = `SELECT * FROM tubes WHERE id = ANY($1)`;
await query(sql, [ids]); // Pass array directly
```

---

## 6. Full-Text Search Migration

> **CRITICAL REQUIREMENT:** Search must work identically to the current implementation. Users should notice no difference in search behavior. This section details how to achieve feature parity.

### 6.1 Current Implementation (SQLite FTS5)

**Location:** `SQLiteContext.ts` lines 311-414, `TubeRepository.ts` lines 462-550

**Current Features:**
- FTS5 virtual table with porter stemming
- BM25 relevance ranking
- Automatic sync via triggers
- Searches: cellType, donorInternalId, donorSourceId, lotNumber, media, cultureCondition, notes, date, concentration
- **Prefix matching:** User types "HEK" and finds "HEK293"
- **Partial matching:** User types "293" and finds "HEK293"
- **Flexible search:** Users can search practically anything in any form

### 6.2 Target Implementation (PostgreSQL tsvector)

**Option A: Built-in PostgreSQL Full-Text Search (Recommended)**

```sql
-- Add tsvector column to tubes table
ALTER TABLE tubes ADD COLUMN search_vector tsvector;

-- Create GIN index for fast searching
CREATE INDEX idx_tubes_search ON tubes USING GIN(search_vector);

-- Create function to update search vector
CREATE OR REPLACE FUNCTION tubes_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.cell_type, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.donor_internal_id, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.donor_source_id, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.lot_number, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.notes, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER tubes_search_update
  BEFORE INSERT OR UPDATE ON tubes
  FOR EACH ROW EXECUTE FUNCTION tubes_search_trigger();
```

**Search Query:**
```sql
-- SQLite FTS5 (Current)
SELECT *, bm25(tubes_fts) as rank
FROM tubes_fts
INNER JOIN tubes ON tubes.id = tubes_fts.tubeId
WHERE tubes_fts MATCH '"term"*'

-- PostgreSQL tsvector (Target)
SELECT *, ts_rank(search_vector, query) as rank
FROM tubes, plainto_tsquery('english', $1) query
WHERE search_vector @@ query
ORDER BY rank DESC
```

### 6.3 Repository Changes for Full-Text Search

**File:** `TubeRepository.ts` → Refactor `comprehensiveSearch()` method

```typescript
// BEFORE (SQLite FTS5)
private async comprehensiveSearch(criteria: TubeSearchCriteria): Promise<Tube[]> {
  const ftsQuery = terms.map(term => `"${term}"*`).join(' AND ');
  const sql = `
    SELECT ${this.TUBE_COLUMNS}, bm25(tubes_fts) as rank
    FROM tubes_fts
    INNER JOIN tubes ON tubes.id = tubes_fts.tubeId
    WHERE tubes_fts MATCH ?
  `;
  // ...
}

// AFTER (PostgreSQL tsvector)
private async comprehensiveSearch(criteria: TubeSearchCriteria): Promise<Tube[]> {
  const searchTerms = criteria.query!.trim();
  const sql = `
    SELECT ${this.TUBE_COLUMNS}, ts_rank(search_vector, plainto_tsquery('english', $1)) as rank
    FROM tubes
    WHERE search_vector @@ plainto_tsquery('english', $1)
    ORDER BY rank DESC
  `;
  // ...
}
```

### 6.4 Hybrid Search Strategy (Required for Feature Parity)

PostgreSQL's built-in `tsvector` does not support partial matching the same way SQLite FTS5 does. To maintain identical search behavior, implement a **hybrid search strategy**.

#### Install pg_trgm Extension

```sql
-- Run once on Railway PostgreSQL
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

This extension enables trigram-based fuzzy matching for partial strings.

#### Create Trigram Indexes

```sql
-- For partial matching on key fields
CREATE INDEX idx_tubes_cell_type_trgm ON tubes USING GIN(cell_type gin_trgm_ops);
CREATE INDEX idx_tubes_donor_internal_trgm ON tubes USING GIN(donor_internal_id gin_trgm_ops);
CREATE INDEX idx_tubes_donor_source_trgm ON tubes USING GIN(donor_source_id gin_trgm_ops);
CREATE INDEX idx_tubes_lot_number_trgm ON tubes USING GIN(lot_number gin_trgm_ops);
CREATE INDEX idx_tubes_notes_trgm ON tubes USING GIN(notes gin_trgm_ops);
```

#### Hybrid Search Implementation

```typescript
// Hybrid search: tsvector for full words + ILIKE/trigram for partial matches
private async comprehensiveSearch(criteria: TubeSearchCriteria): Promise<Tube[]> {
  const searchTerms = criteria.query!.trim();

  // Strategy: Try full-text search first, fall back to ILIKE for partial matches
  const sql = `
    SELECT ${this.TUBE_COLUMNS},
           COALESCE(ts_rank(search_vector, plainto_tsquery('english', $1)), 0) as rank
    FROM tubes
    WHERE
      -- Full-text search (for complete words)
      search_vector @@ plainto_tsquery('english', $1)
      OR
      -- Prefix search (user types "HEK" to find "HEK293")
      search_vector @@ to_tsquery('english', $1 || ':*')
      OR
      -- Partial/fuzzy search (user types "293" to find "HEK293")
      cell_type ILIKE '%' || $1 || '%'
      OR donor_internal_id ILIKE '%' || $1 || '%'
      OR donor_source_id ILIKE '%' || $1 || '%'
      OR lot_number ILIKE '%' || $1 || '%'
      OR notes ILIKE '%' || $1 || '%'
    ORDER BY rank DESC, updated_at DESC
  `;
  // ...
}
```

### 6.5 Search Behavior Comparison

| Search Type | SQLite FTS5 | PostgreSQL Implementation |
|-------------|-------------|---------------------------|
| Full word ("HEK293") | `MATCH '"HEK293"'` | `@@ plainto_tsquery('HEK293')` |
| Prefix ("HEK") | `MATCH '"HEK"*'` | `@@ to_tsquery('HEK:*')` |
| Partial ("293") | `MATCH '"293"*'` | `ILIKE '%293%'` with trigram index |
| Multi-term ("HEK donor1") | `MATCH '"HEK"* AND "donor1"*'` | Combined `@@` and `ILIKE` |

### 6.6 Search Testing Requirements

Before deploying, test these search patterns with real data:

- [ ] Single word exact match: "HEK293" → finds tubes with "HEK293"
- [ ] Prefix match: "HEK" → finds "HEK293", "HEK293T", etc.
- [ ] Partial match: "293" → finds "HEK293"
- [ ] Multi-word: "HEK donor" → finds tubes matching both terms
- [ ] Case insensitive: "hek293" → finds "HEK293"
- [ ] Notes search: Search term in notes field
- [ ] Lot number search: Partial lot numbers
- [ ] Relevance ranking: Most relevant results appear first

**Goal:** Users should not notice any difference in search behavior after migration.

---

## 7. Client Configuration Changes

### 7.1 Environment Variables for Client

**Create file:** `client/.env.production`

```env
VITE_API_URL=https://your-app.railway.app/api
VITE_SOCKET_URL=https://your-app.railway.app
```

**Create file:** `client/.env.development`

```env
VITE_API_URL=http://localhost:3001/api
VITE_SOCKET_URL=http://localhost:3001
```

### 7.2 Update Vite Config (if needed)

**File:** `client/vite.config.ts`

Ensure environment variables are exposed:
```typescript
export default defineConfig({
  // ...
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL),
    'import.meta.env.VITE_SOCKET_URL': JSON.stringify(process.env.VITE_SOCKET_URL),
  }
});
```

### 7.3 Update API Client

**File:** `client/src/infrastructure/api/client.ts`

```typescript
// Line 227-230
export const apiClient = new ApiClient({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 30000,
});
```

### 7.4 Update Socket Service

**File:** `client/src/infrastructure/socket/SocketService.ts`

```typescript
// Lines 21-32
const SOCKET_CONFIG = {
  url: import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001',
  options: {
    // ... keep existing options
  },
} as const;
```

---

## 8. Server Configuration Changes

### 8.1 Database Connection

**File:** `server/src/index.ts`

```typescript
// Replace setupDatabase() method
private setupDatabase(): void {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    logger.error('DATABASE_URL environment variable is required');
    throw new Error('DATABASE_URL environment variable is required');
  }

  logger.info('Connecting to PostgreSQL database...');
  this.repositoryFactory = initializeRepositories(databaseUrl);
  logger.info('PostgreSQL database connected successfully');
}
```

### 8.2 CORS Configuration

**File:** `server/src/index.ts`

Update CORS for production:
```typescript
private setupMiddleware(): void {
  // ...
  this.app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:5173'
    ],
    credentials: true
  }));
}
```

### 8.3 Remove Electron-Specific Logic

**File:** `server/src/index.ts`

Remove or conditionally skip:
- `ELECTRON_APP` environment check
- `ODYSSEUS_DATA_DIR` logic
- Local file path construction

### 8.4 Graceful Shutdown

**File:** `server/src/index.ts`

Add graceful shutdown to properly close database connections:

```typescript
// PostgresContext should expose a close method
async close(): Promise<void> {
  await this.pool.end();
}

// In server shutdown handler
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await postgresContext.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await postgresContext.close();
  process.exit(0);
});
```

### 8.5 Update Health Check Endpoint

**File:** `server/src/presentation/routes/PublicRouteModule.ts`

Update health check to verify PostgreSQL connection:

```typescript
// BEFORE (static response)
router.get('/health', async (req, res) => {
  res.json({
    success: true,
    data: { status: 'OK', timestamp: new Date().toISOString() }
  });
});

// AFTER (verify database connection)
router.get('/health', async (req, res) => {
  try {
    // Quick query to verify database is responsive
    await this.postgresContext.query('SELECT 1');
    res.json({
      success: true,
      data: {
        status: 'OK',
        database: 'connected',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      data: {
        status: 'ERROR',
        database: 'disconnected',
        timestamp: new Date().toISOString()
      }
    });
  }
});
```

---

## 9. Environment Variables

### 9.1 Server Environment Variables (Railway)

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/odysseus

# Server
PORT=3001
NODE_ENV=production

# Security
JWT_SECRET=your-secure-secret-here

# CORS
ALLOWED_ORIGINS=https://your-electron-app-domain.com
```

> **Note:** Firebase is NOT needed. PostgreSQL on Railway replaces all Firebase sync functionality. See Section 20 for Firebase removal details.

### 9.2 Security Compliance (Per AGENTS.md)

The following security measures from AGENTS.md remain unchanged:

| Security Feature | Status | Notes |
|-----------------|--------|-------|
| JWT authentication | ✅ Unchanged | OAuth 2.0 tokens |
| bcrypt password hashing | ✅ Unchanged | Cost factor: 10 |
| helmet.js security headers | ✅ Unchanged | Already configured |
| Rate limiting | ✅ Unchanged | On auth endpoints |
| CSRF protection | ✅ Unchanged | For state-changing ops |
| Parameterized queries | ✅ Unchanged | Repository pattern (prevents SQL injection) |
| Input validation | ✅ Unchanged | Zod schemas server-side |

**New Security Consideration:** JWT_SECRET must come from Railway environment variables, not file-based SecretManager. See Section 19.

### 9.3 Client Environment Variables (Build Time)

```env
# Production build
VITE_API_URL=https://your-railway-app.railway.app/api
VITE_SOCKET_URL=https://your-railway-app.railway.app
```

### 9.3 Development Environment Variables

**File:** `server/.env.development`
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/odysseus_dev
PORT=3001
NODE_ENV=development
JWT_SECRET=dev-secret-not-for-production
```

---

## 10. Electron App Changes

### 10.1 Current Electron Architecture

The Electron app currently:
1. Starts the Express server as part of the main process
2. Loads the React app in a BrowserWindow
3. Points to `localhost:3001` for API calls
4. Uses local SQLite database directly

### 10.2 Target Electron Architecture

The Electron app will:
1. **NOT** start any Express server (server runs in cloud on Railway)
2. Load the React app (pointing to cloud API)
3. **Maintain a local SQLite cache** for offline read-only browsing
4. Detect connection state and switch between online/offline modes

```
┌─────────────────────────────────────────────────────────────┐
│                    User's Computer (Electron)                │
│  ┌─────────────┐      ┌─────────────────────────────────┐   │
│  │ React App   │ ───▶ │ Local SQLite (read-only cache)  │   │
│  └──────┬──────┘      └─────────────────────────────────┘   │
│         │                        ▲                           │
│         │ (when online)          │ (sync on connect)         │
└─────────┼────────────────────────┼───────────────────────────┘
          │                        │
          ▼                        │
┌─────────────────────────────────────────────────────────────┐
│                  Cloud (Railway)                             │
│         ┌─────────────────────────────┐                     │
│         │   PostgreSQL (main database) │                     │
│         │   - All writes go here       │                     │
│         │   - Source of truth          │                     │
│         └─────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

### 10.3 Online vs Offline Behavior

| State | Read Operations | Write Operations | User Experience |
|-------|-----------------|------------------|-----------------|
| **Online** | From PostgreSQL (live) | To PostgreSQL (live) | Full functionality |
| **Offline** | From local SQLite cache | **Disabled** | View-only mode, banner shown |

### 10.4 Changes to `electron/main.js`

```javascript
// BEFORE: Start embedded server
async function startBackendServer() {
  process.env.ELECTRON_APP = 'true';
  // ... server startup code
  require('../server/dist/index.js');
}

// AFTER: No server startup, but initialize local cache
async function createWindow() {
  // Initialize local SQLite cache in userData directory
  const cachePath = path.join(app.getPath('userData'), 'odysseus-cache.sqlite');
  initializeLocalCache(cachePath);

  // Create window and load the app
  // App connects to cloud server automatically
  // Falls back to local cache when offline
}
```

### 10.5 API URL Configuration for Electron

**Option A:** Build-time configuration (simpler)
- Build Electron app with production API URL baked in

**Option B:** Runtime configuration (more flexible)
- Read API URL from a config file in userData directory
- Allows changing server without rebuilding

Recommended: **Option A** for simplicity, with Option B as future enhancement.

### 10.6 Local Cache Implementation

See **Section 31** for detailed offline caching strategy and implementation.

---

## 11. Dependencies Update

### 11.1 Server Dependencies

**Remove from `server/package.json`:**
```json
{
  "better-sqlite3": "^11.8.1"
}
```

**Add to `server/package.json`:**
```json
{
  "pg": "^8.11.3",
  "@types/pg": "^8.10.9"
}
```

### 11.2 Root Package Dependencies (Electron)

> **IMPORTANT:** `better-sqlite3` stays in the **root** `package.json` for Electron's local cache functionality. Only remove it from the server.

**Keep in root `package.json`:**
```json
{
  "better-sqlite3": "^12.2.0"
}
```

**Also keep in root `package.json` (required for native module):**
```json
{
  "devDependencies": {
    "@electron/rebuild": "^4.0.1"
  }
}
```

### 11.3 Summary: What Goes Where

| Package | Root package.json | Server package.json | Purpose |
|---------|-------------------|---------------------|---------|
| `better-sqlite3` | ✅ **Keep** | ❌ **Remove** | Electron local cache |
| `@electron/rebuild` | ✅ **Keep** | N/A | Native module rebuild |
| `pg` | ❌ N/A | ✅ **Add** | PostgreSQL driver |
| `@types/pg` | ❌ N/A | ✅ **Add** (dev) | TypeScript types |

### 11.4 Installation Commands

```bash
# Server: Switch from SQLite to PostgreSQL
cd server
npm uninstall better-sqlite3
npm install pg
npm install --save-dev @types/pg

# Root: Keep better-sqlite3 for Electron cache (no changes needed)
cd ..
# better-sqlite3 already in root package.json - verify it's still there
```

### 11.5 Client Dependencies

No changes required. Client doesn't directly access any database.

### 11.6 Shared Schemas Package (`@odysseus/shared-schemas`)

**NO CHANGES REQUIRED.** Per AGENTS.md, this package is the Single Source of Truth for:
- Validation schemas (Zod)
- Type definitions
- Formatters and utilities
- Constants

The shared-schemas package is database-agnostic and works with both SQLite and PostgreSQL.

---

## 12. Migration Phases (High-Level Overview)

> **Note:** This section provides a high-level overview. For the detailed step-by-step checklist with all tasks, see **Appendix B: Complete Migration Checklist** (17 phases).

### Phase 1: Preparation
- [ ] Set up Railway account
- [ ] Create PostgreSQL database on Railway
- [ ] Generate complete PostgreSQL schema file
- [ ] Set up environment variables in Railway

### Phase 2: Database Context (2-3 sessions)
- [ ] Create `PostgresContext.ts` based on `SQLiteContext.ts`
- [ ] Implement connection pooling
- [ ] Implement async query methods
- [ ] Implement transaction support
- [ ] Add PostgreSQL full-text search setup
- [ ] Test basic connectivity

### Phase 3: Repository Conversion (4-6 sessions)
> **Note:** Rename files as you convert (remove SQLite prefix). Follow order from Section 34.3.
- [ ] Rename + Convert `PersonRepository.ts` (~8 queries) - warmup
- [ ] Rename + Convert `AuditArchiveRepository.ts` (~12 queries)
- [ ] Rename + Convert `SessionRepository.ts` (~18 queries)
- [ ] Rename + Convert `RefreshTokenRepository.ts` (~20 queries)
- [ ] Rename + Convert `AuditRepository.ts` (~25 queries)
- [ ] Rename + Convert `UserRepository.ts` (~35 queries)
- [ ] Rename + Convert `ResearcherRepository.ts` (~40 queries)
- [ ] Rename + Convert `ConfigurationRepository.ts` (~50 queries)
- [ ] Rename + Convert `TubeRepository.ts` (~60 queries) - most complex, do last
- [ ] Update repository factory/index imports

### Phase 4: Full-Text Search (2-3 sessions)
> **Critical:** Must maintain current search behavior. See Section 6 for hybrid search strategy.
- [ ] Install `pg_trgm` extension on PostgreSQL
- [ ] Implement PostgreSQL tsvector columns
- [ ] Create GIN search indexes
- [ ] Create trigram indexes for partial matching
- [ ] Create update triggers
- [ ] Implement hybrid search in `TubeRepository.ts` (Section 6.4)
- [ ] Test all search patterns from Section 6.6 checklist

### Phase 5: Server Configuration (1-2 sessions)
- [ ] Update `server/src/index.ts` for PostgreSQL
- [ ] Remove Electron-specific database logic
- [ ] Update CORS for production domains
- [ ] Add health check endpoint
- [ ] Test server startup with PostgreSQL

### Phase 6: Client Configuration (1 session)
- [ ] Add environment variable support to API client
- [ ] Add environment variable support to Socket service
- [ ] Create `.env.production` and `.env.development` files
- [ ] Test client with remote server

### Phase 7: Electron Updates (1-2 sessions)
- [ ] Remove embedded server from Electron
- [ ] Configure production API URL
- [ ] Test Electron app with cloud server
- [ ] Build and package updated Electron app

### Phase 8: Testing & Deployment (2-3 sessions)
- [ ] Deploy server to Railway
- [ ] Run full integration tests
- [ ] Test with multiple users simultaneously
- [ ] Test real-time updates (Socket.IO)
- [ ] Performance testing
- [ ] Build final Electron app for distribution

---

## 13. Testing Strategy (Per AGENTS.md)

> **AGENTS.md Testing Requirements:**
> - Build must complete without errors
> - Package must create working .exe
> - All functionality must work in packaged app
> - Socket.IO must connect in production
> - Data must persist across restarts

### 13.1 Unit Tests
- Test each converted repository method
- Mock PostgreSQL connection for isolation
- Verify query syntax is correct
- Use factory functions for test data generation (per AGENTS.md)

### 13.2 Integration Tests
- Test against real PostgreSQL database (use Docker locally)
- Verify all CRUD operations work
- Test transaction rollback
- Test concurrent access
- Test repository implementations with test databases (per AGENTS.md)

### 13.3 Full-Text Search Tests
- Verify search returns correct results
- Test relevance ranking
- Test partial matches
- Test multi-term searches

### 13.4 Real-Time Tests (Socket.IO)
- Test Socket.IO connections to cloud server
- Verify events propagate to all clients
- Test reconnection after disconnect
- Mock Socket.IO in tests (per AGENTS.md)

### 13.5 Multi-User Tests
- Two users editing same tube
- Concurrent writes to same location
- Conflict detection and handling

### 13.6 Performance Tests
- Search performance with 10,000+ tubes
- Bulk insert performance
- Query latency from Electron to cloud

### 13.7 Build & Package Verification
- [ ] `npm run build` completes without errors
- [ ] `npm run package:win` creates working .exe
- [ ] Packaged app connects to Railway server
- [ ] Data persists across app restarts
- [ ] Socket.IO connects and stays connected

---

## 14. Rollback Plan

### If Migration Fails

1. **Keep SQLite code in separate branch** until PostgreSQL is proven stable
2. **Database backup** before any production deployment
3. **Feature flag** to switch between SQLite and PostgreSQL (if needed)

### Rollback Steps

1. Revert to SQLite branch
2. Rebuild Electron app with embedded server
3. Restore SQLite database from backup
4. Distribute rollback version to users

---

## 15. Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] PostgreSQL schema deployed to Railway
- [ ] Environment variables configured in Railway
- [ ] CORS configured for production domains
- [ ] SSL/HTTPS enabled on Railway

### Deployment
- [ ] Deploy server to Railway
- [ ] Verify server health check
- [ ] Test API endpoints from browser
- [ ] Test Socket.IO connection

### Post-Deployment
- [ ] Build Electron app with production URLs
- [ ] Test Electron app against production server
- [ ] Distribute to test users
- [ ] Monitor for errors
- [ ] Full team rollout

---

## 16. Data Mapper Changes

### 16.1 Overview

All data mappers handle boolean conversion between JavaScript and SQLite (0/1). PostgreSQL uses native booleans, so these conversions must be removed.

### 16.2 Files Requiring Boolean Conversion Updates

#### `TubeMapper.ts`
**Location:** `server/src/infrastructure/database/mappers/TubeMapper.ts`

```typescript
// BEFORE (SQLite)
interface TubeRow {
  isLocked?: number; // SQLite uses 0/1 for boolean
}

// toRow()
isLocked: tube.isLocked ? 1 : 0,

// fromRow()
isLocked: row.isLocked === 1,

// AFTER (PostgreSQL)
interface TubeRow {
  is_locked?: boolean; // Native PostgreSQL boolean
}

// toRow()
is_locked: tube.isLocked,

// fromRow()
isLocked: row.is_locked ?? false,
```

---

#### `UserMapper.ts`
**Location:** `server/src/infrastructure/database/mappers/UserMapper.ts`

**Boolean fields to update:**
- `emailVerified` (line 56, 92)
- `requirePasswordChange` (line 68, 98)

```typescript
// BEFORE
emailVerified: user.emailVerified ? 1 : 0,
requirePasswordChange: user.requirePasswordChange ? 1 : 0,

// AFTER
email_verified: user.emailVerified,
require_password_change: user.requirePasswordChange,
```

---

#### `RefreshTokenMapper.ts`
**Location:** `server/src/infrastructure/database/mappers/RefreshTokenMapper.ts`

**Boolean field:** `isRevoked`

```typescript
// BEFORE (4 locations: lines 14, 38, 55, 105)
isRevoked: number; // Interface
isRevoked: refreshToken.isRevoked ? 1 : 0, // toRow
isRevoked: row.isRevoked === 1, // fromRow
isRevoked: refreshToken.isRevoked ? 1 : 0 // toRevocationUpdateRow

// AFTER
is_revoked: boolean;
is_revoked: refreshToken.isRevoked,
isRevoked: row.is_revoked,
is_revoked: refreshToken.isRevoked
```

---

#### `UserSessionMapper.ts`
**Location:** `server/src/infrastructure/database/mappers/UserSessionMapper.ts`

**Boolean field:** `isActive`

```typescript
// BEFORE (4 locations: lines 17, 42, 57, 94)
isActive: number;
isActive: session.isActive ? 1 : 0,
isActive: row.isActive === 1,
isActive: session.isActive ? 1 : 0

// AFTER
is_active: boolean;
is_active: session.isActive,
isActive: row.is_active,
is_active: session.isActive
```

---

#### `ResearcherMapper.ts`
**Location:** `server/src/infrastructure/database/mappers/ResearcherMapper.ts`

**Boolean field:** `active`

```typescript
// BEFORE (3 locations: lines 10, 29, 41)
active: number; // SQLite stores boolean as 0/1
active: researcher.active ? 1 : 0,
active: Boolean(row.active),

// AFTER
active: boolean;
active: researcher.active,
active: row.active,
```

---

### 16.3 SqliteDateMapper Rename

**File:** `server/src/infrastructure/database/SqliteDateMapper.ts`

**Action:** Rename to `DateMapper.ts`

The logic inside is actually database-agnostic (works with ISO strings). Only the name suggests SQLite-specificity.

```typescript
// BEFORE
import { SqliteDateMapper } from '@infrastructure/database/SqliteDateMapper';

// AFTER
import { DateMapper } from '@infrastructure/database/DateMapper';
```

**Files importing SqliteDateMapper (need import updates):**
- `TubeMapper.ts`
- `UserMapper.ts`
- `RefreshTokenMapper.ts`
- `UserSessionMapper.ts`
- `ResearcherMapper.ts`
- `PersonMapper.ts`

---

## 17. Transaction Pattern Changes

### 17.1 Current Pattern (SQLite - Synchronous)

**Location:** Multiple repository files

```typescript
// better-sqlite3 synchronous transaction pattern
const db = this.context.getDatabase();
const insert = db.prepare('INSERT INTO ...');

const transaction = db.transaction((entries) => {
  for (const entry of entries) {
    insert.run(entry.id, entry.value);
  }
});

transaction(entries); // Synchronous execution
```

**Files using this pattern:**
- `SQLiteAuditRepository.ts` (line 68)
- `AuditArchiveRepository.ts` (line 48)
- `SQLiteTubeRepository.ts` (line 638)
- `SQLiteContext.ts` (line 561)

### 17.2 Target Pattern (PostgreSQL - Asynchronous)

```typescript
// pg async transaction pattern
const client = await this.pool.connect();
try {
  await client.query('BEGIN');

  for (const entry of entries) {
    await client.query(
      'INSERT INTO audit_log (id, value) VALUES ($1, $2)',
      [entry.id, entry.value]
    );
  }

  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

### 17.3 PostgresContext Transaction Method

```typescript
// New transaction wrapper for PostgresContext
// Per AGENTS.md: Always use proper TypeScript types, never 'any'
import type { PoolClient, QueryResult } from 'pg';

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

// Type-safe query method
async query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
  return this.pool.query<T>(sql, params);
}
```

### 17.4 Note on Application Services

**File:** `server/src/application/services/UserApplicationService.ts` (line 486)

Contains a comment explaining why transactions weren't used:
> "Using sequential saves instead of transaction because better-sqlite3 requires synchronous transaction callbacks, but our repository layer uses async/await"

**Good news:** PostgreSQL with `pg` driver fully supports async transactions, so this limitation is removed. We can properly wrap related operations in transactions.

---

## 18. Error Handling Updates

### 18.1 DatabaseErrors.ts

**Location:** `server/src/infrastructure/database/DatabaseErrors.ts`

**Current Code (SQLite-specific):**
```typescript
export function isDatabaseConstraintError(error: any): boolean {
  // Check error code
  if (error.code && typeof error.code === 'string') {
    if (error.code.includes('SQLITE_CONSTRAINT')) {  // SQLite-specific
      return true;
    }
  }
  // ... message fallback
}
```

### 18.2 PostgreSQL Error Codes

PostgreSQL uses different error codes:

| Error Type | SQLite Code | PostgreSQL Code |
|------------|-------------|-----------------|
| Unique violation | `SQLITE_CONSTRAINT_UNIQUE` | `23505` |
| Foreign key violation | `SQLITE_CONSTRAINT_FOREIGNKEY` | `23503` |
| Not null violation | `SQLITE_CONSTRAINT_NOTNULL` | `23502` |
| Check violation | `SQLITE_CONSTRAINT_CHECK` | `23514` |

### 18.3 Updated Error Detection

```typescript
// AFTER (PostgreSQL)
export function isDatabaseConstraintError(error: any): boolean {
  if (!error) return false;

  // PostgreSQL error codes (Class 23 - Integrity Constraint Violation)
  if (error.code && typeof error.code === 'string') {
    if (error.code.startsWith('23')) {
      return true;
    }
  }

  // Fallback: check error message
  if (error.message && typeof error.message === 'string') {
    const message = error.message.toLowerCase();
    if (
      message.includes('unique constraint') ||
      message.includes('violates') ||
      message.includes('duplicate key')
    ) {
      return true;
    }
  }

  return false;
}

export function isUniqueConstraintError(error: any): boolean {
  return error?.code === '23505';
}

export function isForeignKeyError(error: any): boolean {
  return error?.code === '23503';
}
```

---

## 19. Secret Management

### 19.1 Current Implementation

**File:** `electron/SecretManager.js`

```javascript
// Current: File-based storage in Electron userData
getSecretFilePath() {
  return path.join(this.app.getPath('userData'), this.secretFileName);
}
```

**Problem:** Cloud server doesn't have access to Electron's `app.getPath('userData')`.

### 19.2 Cloud Solution

For Railway deployment, JWT secret comes from environment variables:

```typescript
// Server startup (server/src/index.ts)
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('JWT_SECRET environment variable is required');
}
```

### 19.3 Migration Path

| Environment | Secret Source |
|-------------|---------------|
| Development (local) | `.env` file or SecretManager |
| Production (Railway) | Railway environment variables |
| Electron (distributed) | SecretManager (file-based) - but connects to cloud server |

**Key insight:** When Electron apps connect to cloud server, they don't need local JWT secrets. The server handles all authentication.

---

## 20. Firebase Code Decision

### 20.1 Current State

**Files:**
- `server/src/infrastructure/services/FirebaseSyncService.ts`
- `server/src/infrastructure/services/SyncEngine.ts`
- `server/src/infrastructure/services/WorkspaceService.ts`

**Status:** Scaffolded but disabled. `initialize()` returns early without connecting.

### 20.2 Recommendation: REMOVE

**Reasons:**
1. PostgreSQL + Railway replaces Firebase's purpose (cloud sync)
2. Unused code is technical debt
3. Hardcoded API keys in source are a security risk
4. Simplifies codebase

### 20.3 Files to Remove

```
server/src/infrastructure/services/FirebaseSyncService.ts
server/src/infrastructure/services/SyncEngine.ts
server/src/infrastructure/services/WorkspaceService.ts
```

### 20.4 References to Update

**File:** `server/src/index.ts`

```typescript
// REMOVE these imports
import { firebaseService } from '@infrastructure/services/FirebaseSyncService';
import { syncEngine } from '@infrastructure/services/SyncEngine';
import { workspaceService } from '@infrastructure/services/WorkspaceService';

// REMOVE this initialization
firebaseService.initialize().catch(error =>
  logger.warn('Firebase initialization failed - running in local-only mode:', error)
);

// UPDATE status logging
logger.info(`🔥 Firebase: ${firebaseService.isConnected() ? 'Connected' : 'Local-only mode'}`);
// becomes
logger.info(`☁️ Database: PostgreSQL (Railway)`);
```

### 20.5 Dependencies to Remove

```json
// package.json - REMOVE
{
  "firebase": "^12.2.1",
  "firebase-admin": "^12.7.0"
}
```

---

## 21. Index Recreation (42 Indexes)

### 21.1 Current SQLite Indexes

The application has **42 indexes** that must be recreated in PostgreSQL. Here's the complete list:

#### Persons Table (3 indexes)
```sql
CREATE INDEX idx_persons_email ON persons(LOWER(email));
CREATE INDEX idx_persons_last_name ON persons(last_name);
CREATE INDEX idx_persons_first_name ON persons(first_name);
```

#### Tubes Table (14 indexes)
```sql
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
```

#### Users Table (8 indexes)
```sql
CREATE INDEX idx_users_api_key ON users(api_key);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_researcher_id ON users(researcher_id);
CREATE INDEX idx_users_person_id ON users(person_id);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_email_verification_token ON users(email_verification_token);
CREATE INDEX idx_users_password_reset_token ON users(password_reset_token);
```

#### Refresh Tokens Table (7 indexes)
```sql
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_refresh_tokens_is_revoked ON refresh_tokens(is_revoked);
CREATE INDEX idx_refresh_tokens_created_at ON refresh_tokens(created_at DESC);
CREATE INDEX idx_refresh_tokens_last_used ON refresh_tokens(last_used_at DESC);
CREATE INDEX idx_refresh_tokens_ip_address ON refresh_tokens(ip_address);
```

#### User Sessions Table (5 indexes)
```sql
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_refresh_token ON user_sessions(refresh_token);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_is_active ON user_sessions(is_active);
CREATE INDEX idx_user_sessions_last_used ON user_sessions(last_used_at DESC);
```

#### Audit Log Tables (9 indexes)
```sql
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_entity_type ON audit_log(entity_type);
CREATE INDEX idx_audit_log_entity_id ON audit_log(entity_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_log_composite ON audit_log(entity_type, entity_id, timestamp DESC);
CREATE INDEX idx_audit_archive_timestamp ON audit_log_archive(timestamp DESC);
CREATE INDEX idx_audit_archive_user_id ON audit_log_archive(user_id);
CREATE INDEX idx_audit_archive_archived_at ON audit_log_archive(archived_at DESC);
```

#### Researchers Table (2 indexes)
```sql
CREATE INDEX idx_researchers_active ON researchers(active);
CREATE INDEX idx_researchers_person_id ON researchers(person_id);
```

#### Configuration Tables (3 indexes)
```sql
CREATE INDEX idx_configuration_versions_updated_at ON configuration_versions(updated_at DESC);
CREATE INDEX idx_configuration_snapshots_created_at ON configuration_snapshots(created_at DESC);
CREATE INDEX idx_configuration_snapshots_version ON configuration_snapshots(version);
```

### 21.2 SQLite-Specific Index Syntax to Update

| SQLite | PostgreSQL |
|--------|------------|
| `COLLATE NOCASE` | Use `LOWER(column)` or `citext` type |
| `IF NOT EXISTS` | Same syntax works |

---

## 22. Column Naming Convention Decision

### 22.1 Current State: MIXED

The SQLite schema uses inconsistent naming:

| Table | Naming Style | Examples |
|-------|--------------|----------|
| tubes, users, researchers | camelCase | `tankId`, `rackId`, `firstName`, `createdAt` |
| configuration_* | snake_case | `updated_at`, `changed_by`, `config_json` |

### 22.2 Decision: Convert to snake_case (PostgreSQL Convention)

**Rationale:**
- Industry standard for PostgreSQL databases
- No quoting needed in SQL queries (cleaner, less error-prone)
- Mappers already handle translation between database rows and domain objects
- Only 6 mapper files need updates - rest of codebase unchanged

### 22.3 What Changes vs What Stays the Same

| Layer | Naming | Changes? |
|-------|--------|----------|
| React components | camelCase | **No** |
| Hooks & services | camelCase | **No** |
| Domain entities | camelCase | **No** |
| Controllers/routes | camelCase | **No** |
| **Mappers** | translate both | **Yes** (6 files) |
| **Database columns** | snake_case | **Yes** (new schema) |

### 22.4 Mapper Translation Example

```typescript
// Domain code stays camelCase (unchanged)
const tube = {
  location: { tankId: "T1", rackId: "R1" },
  isLocked: true
};

// Mapper handles translation (only these files change)
static toRow(tube: Tube): TubeRow {
  return {
    tank_id: tube.location.tankId,      // camelCase → snake_case
    rack_id: tube.location.rackId,
    is_locked: tube.isLocked
  };
}

static fromRow(row: TubeRow): Tube {
  return {
    location: {
      tankId: row.tank_id,              // snake_case → camelCase
      rackId: row.rack_id
    },
    isLocked: row.is_locked
  };
}
```

### 22.5 Column Name Mapping Reference

| Domain (camelCase) | Database (snake_case) |
|--------------------|-----------------------|
| `tankId` | `tank_id` |
| `rackId` | `rack_id` |
| `boxId` | `box_id` |
| `cellType` | `cell_type` |
| `donorInternalId` | `donor_internal_id` |
| `donorSourceId` | `donor_source_id` |
| `concentrationUnit` | `concentration_unit` |
| `researcherId` | `researcher_id` |
| `createdByName` | `created_by_name` |
| `cultureCondition` | `culture_condition` |
| `lotNumber` | `lot_number` |
| `createdAt` | `created_at` |
| `updatedAt` | `updated_at` |
| `isLocked` | `is_locked` |
| `lockedBy` | `locked_by` |
| `lockNote` | `lock_note` |
| `lockedAt` | `locked_at` |
| `firstName` | `first_name` |
| `lastName` | `last_name` |
| `emailVerified` | `email_verified` |
| `requirePasswordChange` | `require_password_change` |
| `isRevoked` | `is_revoked` |
| `isActive` | `is_active` |
| `expiresAt` | `expires_at` |
| `lastUsedAt` | `last_used_at` |
| `ipAddress` | `ip_address` |

---

## 23. Build Script Updates

### 23.1 Current Build Configuration

**File:** `package.json`

```json
{
  "scripts": {
    "postinstall": "electron-rebuild -f -w better-sqlite3 || echo 'Rebuild failed'"
  },
  "build": {
    "asarUnpack": ["**/*.node"]
  }
}
```

### 23.2 Required Changes

> **NOTE:** Because we're keeping `better-sqlite3` for Electron's local cache (see Section 11.2), the build scripts remain largely unchanged.

```json
{
  "scripts": {
    // KEEP - still needed for Electron's local SQLite cache
    "postinstall": "electron-rebuild -f -w better-sqlite3 || echo 'Rebuild failed'"
  },
  "build": {
    // KEEP - still needed for native SQLite module in Electron
    "asarUnpack": ["**/*.node"]
  }
}
```

### 23.3 Dependencies Summary

**Root package.json - KEEP these:**
```json
{
  "dependencies": {
    "better-sqlite3": "^12.2.0"   // KEEP - for Electron local cache
  },
  "devDependencies": {
    "@electron/rebuild": "^4.0.1" // KEEP - for native module
  }
}
```

**Root package.json - REMOVE these:**
```json
{
  "dependencies": {
    "firebase": "^12.2.1",         // REMOVE
    "firebase-admin": "^12.7.0"    // REMOVE
  }
}
```

**Server package.json - Changes:**
```json
{
  "dependencies": {
    // REMOVE: "better-sqlite3": "..."
    // ADD:
    "pg": "^8.11.3"
  },
  "devDependencies": {
    // ADD:
    "@types/pg": "^8.10.9"
  }
}
```

---

## 24. Sync Endpoints Removal

### 24.1 Firebase-Related Code in index.ts

**Lines to remove/update:**

```typescript
// Line 14-16: REMOVE imports
import { firebaseService } from '@infrastructure/services/FirebaseSyncService';
import { syncEngine } from '@infrastructure/services/SyncEngine';
import { workspaceService } from '@infrastructure/services/WorkspaceService';

// Lines 357-427: REMOVE sync endpoints
private async getSyncStatus(...)      // Uses syncEngine, firebaseService
private async createWorkspaceInvite(...) // Uses syncEngine
private async syncAllTubes(...)       // Uses syncEngine

// Line 611-612: REMOVE Firebase initialization
firebaseService.initialize().catch(...)

// Line 620: UPDATE logging
logger.info(`🔥 Firebase: ${firebaseService.isConnected()...`)
// Replace with:
logger.info(`☁️ Database: PostgreSQL`);
```

### 24.2 Routes to Remove

**File:** Routes referencing sync functionality

| Route | File | Action |
|-------|------|--------|
| `GET /api/sync/status` | `index.ts` | Remove |
| `POST /api/sync/invite` | `index.ts` | Remove |
| `POST /api/sync/all` | `index.ts` | Remove |
| `GET /api/admin/sync-status` | `AdminRouteModule.ts` | Update or Remove |

### 24.3 getSyncStatus in ConfigurationRepository

**File:** `SQLiteConfigurationRepository.ts` (line 1127)

```typescript
// Current: Returns Firebase status
async getSyncStatus(): Promise<SyncStatus> {
  return {
    enabled: syncEnabled,
    firebase: false,  // Always false since Firebase disabled
    workspaceId: undefined
  };
}

// After: Update to return meaningful cloud status
async getSyncStatus(): Promise<SyncStatus> {
  return {
    enabled: true,  // Always enabled with cloud PostgreSQL
    connected: await this.isHealthy(),
    type: 'postgresql'
  };
}
```

---

## 25. Backup Strategy Changes

### 25.1 Current SQLite Backup

**Location:** `server/src/index.ts` (lines 525-582)

```typescript
// Current: SQLite file copy
const backupPath = path.join(backupDir, `odysseus-backup-${timestamp}.sqlite`);
// Copy the .sqlite file
```

### 25.2 PostgreSQL Backup Options

#### Option A: Railway Automatic Backups (Recommended)
- Railway provides automatic daily backups for PostgreSQL
- Point-in-time recovery available
- No code changes needed
- Managed through Railway dashboard

#### Option B: Manual pg_dump
```typescript
// If manual backups needed
import { exec } from 'child_process';

async function createBackup(): Promise<string> {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const backupPath = `./backups/odysseus-${timestamp}.sql`;

  return new Promise((resolve, reject) => {
    exec(
      `pg_dump ${process.env.DATABASE_URL} > ${backupPath}`,
      (error) => {
        if (error) reject(error);
        else resolve(backupPath);
      }
    );
  });
}
```

### 25.3 Update getDatabaseStatus

**Current:**
```typescript
res.json({
  status: {
    type: 'SQLite',
    // ...
  }
});
```

**After:**
```typescript
res.json({
  status: {
    type: 'PostgreSQL',
    host: 'Railway',
    backupStrategy: 'Automatic daily backups via Railway',
    // ...
  }
});
```

---

## 26. Data Migration Strategy

> **NOTE:** Current data is dummy/test data, so migration is not critical for initial deployment. However, this section documents the approach for when real data exists.

### 26.1 Migration Approaches

#### Option A: Fresh Start (Current Recommendation)
- Deploy PostgreSQL with empty schema
- Start fresh with new data entry
- No migration scripts needed
- **Best for:** Initial deployment with dummy data

#### Option B: Data Export/Import (Future Use)
When real data needs to be migrated:

```bash
# Step 1: Export from SQLite to CSV
sqlite3 odysseus.sqlite <<EOF
.mode csv
.headers on
.output tubes.csv
SELECT * FROM tubes;
.output researchers.csv
SELECT * FROM researchers;
.output users.csv
SELECT * FROM users;
EOF

# Step 2: Transform column names (camelCase → snake_case)
# Use a script or tool to rename headers

# Step 3: Import to PostgreSQL
psql $DATABASE_URL <<EOF
\copy tubes FROM 'tubes_transformed.csv' WITH CSV HEADER;
\copy researchers FROM 'researchers_transformed.csv' WITH CSV HEADER;
EOF
```

### 26.2 Data Transformation Considerations

| SQLite | PostgreSQL | Transformation |
|--------|------------|----------------|
| `INTEGER` booleans (0/1) | `BOOLEAN` | `0 → false`, `1 → true` |
| `TEXT` timestamps | `TIMESTAMPTZ` | Parse ISO string |
| camelCase columns | snake_case columns | Rename in CSV headers |

### 26.3 Migration Script (For Future Reference)

```typescript
// scripts/migrate-data.ts (create when needed)
import Database from 'better-sqlite3';
import { Pool } from 'pg';

async function migrateData() {
  const sqlite = new Database('./odysseus.sqlite');
  const pg = new Pool({ connectionString: process.env.DATABASE_URL });

  // Migrate researchers first (foreign key dependency)
  const researchers = sqlite.prepare('SELECT * FROM researchers').all();
  for (const r of researchers) {
    await pg.query(
      `INSERT INTO researchers (id, first_name, last_name, email, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [r.id, r.firstName, r.lastName, r.email, r.active === 1, r.createdAt, r.updatedAt]
    );
  }

  // Then migrate tubes
  const tubes = sqlite.prepare('SELECT * FROM tubes').all();
  // ... similar pattern

  await pg.end();
  sqlite.close();
}
```

---

## 27. Railway Setup Guide

### 27.1 Create Railway Account & Project

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub (recommended for deployment integration)
3. Create new project → "Empty Project"
4. Name it: `odysseus-production`

### 27.2 Add PostgreSQL Database

1. In your project, click "Add Service"
2. Select "Database" → "PostgreSQL"
3. Railway will provision the database automatically
4. Click on the PostgreSQL service to view connection details

### 27.3 Get Connection String

1. Click on PostgreSQL service
2. Go to "Variables" tab
3. Copy `DATABASE_URL` - it looks like:
   ```
   postgresql://postgres:password@host.railway.internal:5432/railway
   ```

### 27.4 Configure Environment Variables

In Railway project settings, add:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | (auto-created) | PostgreSQL connection string |
| `JWT_SECRET` | (generate secure random) | `openssl rand -base64 32` |
| `NODE_ENV` | `production` | |
| `PORT` | `3001` | Or let Railway assign |
| `ALLOWED_ORIGINS` | `https://your-domain.com` | For CORS |

### 27.5 Deploy Server

**Option A: GitHub Integration (Recommended)**
1. Connect Railway to your GitHub repo
2. Set root directory to `server/`
3. Railway auto-deploys on push to main

**Option B: Railway CLI**
```bash
npm install -g @railway/cli
railway login
railway link  # Link to your project
railway up    # Deploy
```

### 27.6 Verify Deployment

```bash
# Check health endpoint
curl https://your-app.railway.app/api/public/health

# Expected response:
# {"success":true,"data":{"status":"OK","service":"odysseus-api"}}
```

---

## 28. SSL/TLS Configuration

### 28.1 Railway Requires SSL

Railway PostgreSQL connections require SSL. The connection must include SSL configuration.

### 28.2 PostgresContext SSL Configuration

```typescript
// PostgresContext.ts
import { Pool } from 'pg';

export class PostgresContext {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }  // Railway requires this
        : false  // No SSL for local development
    });
  }
}
```

### 28.3 Environment-Based SSL

```typescript
// Cleaner approach with environment detection
const sslConfig = () => {
  if (process.env.NODE_ENV === 'production') {
    return { rejectUnauthorized: false };
  }
  if (process.env.DATABASE_SSL === 'true') {
    return { rejectUnauthorized: false };
  }
  return false;
};

this.pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig()
});
```

### 28.4 Local Development

For local PostgreSQL development (optional):
```bash
# No SSL needed for localhost
DATABASE_URL=postgresql://postgres:password@localhost:5432/odysseus_dev
DATABASE_SSL=false
```

---

## 29. Transition Period Strategy

### 29.1 Development Approach: Separate Branch

```
main branch     → SQLite (current production)
postgres branch → PostgreSQL (migration work)
```

**Workflow:**
1. Create `feature/postgresql-migration` branch
2. Do all migration work on this branch
3. Test thoroughly with Railway PostgreSQL
4. Merge to main only when fully tested

### 29.2 Testing Stages

| Stage | Database | Environment | Purpose |
|-------|----------|-------------|---------|
| 1. Local Dev | Local PostgreSQL | Development | Code changes work |
| 2. Railway Test | Railway PostgreSQL | Staging | Cloud connection works |
| 3. Integration | Railway PostgreSQL | Staging | Full app flow works |
| 4. Production | Railway PostgreSQL | Production | Go live |

### 29.3 Local PostgreSQL for Development (Optional)

```bash
# Using Docker
docker run --name odysseus-postgres \
  -e POSTGRES_PASSWORD=devpassword \
  -e POSTGRES_DB=odysseus_dev \
  -p 5432:5432 \
  -d postgres:15

# Connection string
DATABASE_URL=postgresql://postgres:devpassword@localhost:5432/odysseus_dev
```

### 29.4 Rollback Strategy

If issues arise after deploying PostgreSQL:

1. **Quick rollback:** Revert to SQLite branch, redistribute Electron app
2. **Data preserved:** Railway PostgreSQL data remains intact
3. **Fix forward:** Address issues on postgres branch, redeploy

---

## 30. Scheduled Jobs Review

### 30.1 Current Scheduled Jobs

Check `server/src/index.ts` for any `node-cron` or `setInterval` jobs:

```typescript
// Example patterns to look for:
import cron from 'node-cron';

// Token cleanup job
cron.schedule('0 * * * *', async () => {
  await refreshTokenRepository.deleteExpired();
});

// Session cleanup job
cron.schedule('*/15 * * * *', async () => {
  await sessionRepository.cleanupInactiveSessions();
});
```

### 30.2 Jobs That May Need Updates

| Job | Current | PostgreSQL Change Needed? |
|-----|---------|---------------------------|
| Token cleanup | `deleteExpired()` | Query syntax only (already in repository) |
| Session cleanup | `cleanupInactive()` | Query syntax only (already in repository) |
| Audit archival | `archiveOldRecords()` | Query syntax only (already in repository) |
| Backup job | SQLite file copy | **Yes** - Use Railway backups instead |

### 30.3 Repository Methods Handle It

Good news: If cleanup jobs call repository methods, they'll automatically use the updated PostgreSQL queries after migration. No additional changes needed beyond the repository conversion.

### 30.4 Backup Job Update

The only job that needs explicit changes:

```typescript
// BEFORE (SQLite)
cron.schedule('0 0 * * *', async () => {
  const backupPath = `./backups/odysseus-${Date.now()}.sqlite`;
  fs.copyFileSync(dbPath, backupPath);
});

// AFTER (PostgreSQL)
// Remove this job - Railway handles backups automatically
// Or replace with pg_dump if manual backups needed
```

---

## 31. Electron Offline Caching Strategy

### 31.1 Overview

The Electron app maintains a local SQLite database as a read-only cache. This enables users to browse inventory data when disconnected from the internet, while all write operations require an active connection to the cloud PostgreSQL database.

### 31.2 Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Electron App                                 │
│                                                                      │
│  ┌──────────────────┐    ┌────────────────────────────────────────┐ │
│  │   React App      │───▶│  Connection Manager                    │ │
│  │                  │    │  - Detects online/offline state        │ │
│  │  ┌────────────┐  │    │  - Routes reads to appropriate source  │ │
│  │  │ UI State   │  │    │  - Blocks writes when offline          │ │
│  │  │ (Zustand)  │  │    └─────────────┬──────────────────────────┘ │
│  │  └────────────┘  │                  │                            │
│  └──────────────────┘                  │                            │
│                                        ▼                            │
│           ┌────────────────────────────┴─────────────────────────┐  │
│           │                                                      │  │
│   ┌───────▼───────┐                              ┌───────────────▼┐ │
│   │ Local SQLite  │◀─────── Sync Service ───────▶│ Cloud API      │ │
│   │ (Cache)       │         (when online)        │ (PostgreSQL)   │ │
│   │               │                              │                │ │
│   │ Read-only     │                              │ Read + Write   │ │
│   └───────────────┘                              └────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### 31.3 Cache Database Schema

The local cache uses a simplified schema - just enough to display data:

```sql
-- Local cache database: odysseus-cache.sqlite
-- Location: Electron userData directory

CREATE TABLE cached_tubes (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,           -- JSON blob of full tube data
  cached_at TEXT NOT NULL       -- When this record was cached
);

CREATE TABLE cached_researchers (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  cached_at TEXT NOT NULL
);

CREATE TABLE cache_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Track last successful sync
INSERT INTO cache_metadata (key, value) VALUES ('last_sync', '');
```

### 31.4 Sync Strategy

**When to sync:**
1. On app startup (if online)
2. When connection is restored after being offline
3. Periodically while online (every 5 minutes)
4. After any successful write operation

**Sync process:**
```typescript
async function syncCache(): Promise<void> {
  try {
    // Fetch all data from cloud
    const [tubes, researchers] = await Promise.all([
      api.getTubes(),
      api.getResearchers()
    ]);

    // Update local cache
    await localDb.transaction(async (tx) => {
      await tx.run('DELETE FROM cached_tubes');
      await tx.run('DELETE FROM cached_researchers');

      for (const tube of tubes) {
        await tx.run(
          'INSERT INTO cached_tubes (id, data, cached_at) VALUES (?, ?, ?)',
          [tube.id, JSON.stringify(tube), new Date().toISOString()]
        );
      }

      for (const researcher of researchers) {
        await tx.run(
          'INSERT INTO cached_researchers (id, data, cached_at) VALUES (?, ?, ?)',
          [researcher.id, JSON.stringify(researcher), new Date().toISOString()]
        );
      }

      await tx.run(
        'UPDATE cache_metadata SET value = ? WHERE key = ?',
        [new Date().toISOString(), 'last_sync']
      );
    });

    console.log('Cache sync completed');
  } catch (error) {
    console.error('Cache sync failed:', error);
  }
}
```

### 31.5 Connection State Management

```typescript
// ConnectionManager.ts
class ConnectionManager {
  private isOnline: boolean = navigator.onLine;
  private listeners: Set<(online: boolean) => void> = new Set();

  constructor() {
    window.addEventListener('online', () => this.setOnline(true));
    window.addEventListener('offline', () => this.setOnline(false));

    // Also ping server periodically to detect actual connectivity
    setInterval(() => this.checkConnection(), 30000);
  }

  private async checkConnection(): Promise<void> {
    try {
      await fetch(`${API_URL}/api/public/health`, { method: 'HEAD' });
      this.setOnline(true);
    } catch {
      this.setOnline(false);
    }
  }

  private setOnline(online: boolean): void {
    if (this.isOnline !== online) {
      this.isOnline = online;
      this.listeners.forEach(listener => listener(online));

      if (online) {
        // Trigger cache sync when coming back online
        syncCache();
      }
    }
  }

  getStatus(): boolean {
    return this.isOnline;
  }

  subscribe(listener: (online: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
```

### 31.6 UI Indicators

When offline, the app should clearly indicate limited functionality:

```typescript
// OfflineBanner.tsx
export const OfflineBanner: React.FC = () => {
  const isOnline = useConnectionStatus();

  if (isOnline) return null;

  return (
    <div className="bg-amber-500 text-white px-4 py-2 text-center">
      <span className="font-medium">Offline Mode</span>
      <span className="ml-2">— You can browse cached data, but editing is disabled</span>
    </div>
  );
};
```

**Disable write operations when offline:**
```typescript
// In mutation hooks
const createTubeMutation = useMutation({
  mutationFn: async (data) => {
    if (!connectionManager.getStatus()) {
      throw new Error('Cannot create tubes while offline');
    }
    return api.createTube(data);
  }
});

// In UI components
<Button
  disabled={!isOnline}
  title={!isOnline ? 'Editing disabled while offline' : undefined}
>
  Add Tube
</Button>
```

### 31.7 Cache Limitations

| Feature | Online | Offline |
|---------|--------|---------|
| View tubes | ✅ Live data | ✅ Cached data |
| Search tubes | ✅ Full search | ⚠️ Basic local search |
| View researchers | ✅ Live data | ✅ Cached data |
| Create tube | ✅ | ❌ Disabled |
| Edit tube | ✅ | ❌ Disabled |
| Delete tube | ✅ | ❌ Disabled |
| Manage researchers | ✅ | ❌ Disabled |
| Real-time updates | ✅ Socket.IO | ❌ No updates |

---

## 32. Local Development Setup

### 32.1 Overview

You can develop and test the entire PostgreSQL migration locally without needing a Railway account. This section covers setting up a local PostgreSQL database using Docker.

### 32.2 Prerequisites

- **Docker Desktop** installed and running ([download](https://www.docker.com/products/docker-desktop/))
- Node.js 18+ already installed

### 32.3 Start Local PostgreSQL

```bash
# Start PostgreSQL in Docker
docker run --name odysseus-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=devpassword \
  -e POSTGRES_DB=odysseus_dev \
  -p 5432:5432 \
  -d postgres:15

# Verify it's running
docker ps
```

### 32.4 Configure Environment

Create `server/.env.development`:

```env
DATABASE_URL=postgresql://postgres:devpassword@localhost:5432/odysseus_dev
PORT=3001
NODE_ENV=development
JWT_SECRET=dev-secret-not-for-production
```

### 32.5 Initialize Database Schema

```bash
# Connect to PostgreSQL and run schema
docker exec -i odysseus-postgres psql -U postgres -d odysseus_dev < server/src/infrastructure/database/schema.sql
```

Or connect with a GUI tool like **pgAdmin** or **DBeaver** and run the schema manually.

### 32.6 Development Workflow

```bash
# Terminal 1: Start the server (now using local PostgreSQL)
cd server
npm run dev

# Terminal 2: Start the client
cd client
npm run dev

# Terminal 3: (Optional) Start Electron
npm run dev:electron
```

### 32.7 Useful Docker Commands

```bash
# Stop PostgreSQL
docker stop odysseus-postgres

# Start PostgreSQL (after stopping)
docker start odysseus-postgres

# View PostgreSQL logs
docker logs odysseus-postgres

# Connect to PostgreSQL CLI
docker exec -it odysseus-postgres psql -U postgres -d odysseus_dev

# Remove PostgreSQL container (deletes all data)
docker rm -f odysseus-postgres
```

### 32.8 Switching Between Local and Railway

The only difference between local development and Railway production is the `DATABASE_URL`:

| Environment | DATABASE_URL |
|-------------|--------------|
| Local Dev | `postgresql://postgres:devpassword@localhost:5432/odysseus_dev` |
| Railway | `postgresql://user:password@host.railway.internal:5432/railway` |

Your code is identical. Just change the environment variable.

---

## 33. Repository Naming Convention

### 33.1 Decision: Remove Database Technology from Names

All repository files will be renamed to remove the `SQLite` prefix:

| Current Name | New Name |
|--------------|----------|
| `SQLiteTubeRepository.ts` | `TubeRepository.ts` |
| `SQLiteResearcherRepository.ts` | `ResearcherRepository.ts` |
| `SQLiteUserRepository.ts` | `UserRepository.ts` |
| `SQLiteConfigurationRepository.ts` | `ConfigurationRepository.ts` |
| `SQLiteAuditRepository.ts` | `AuditRepository.ts` |
| `SQLiteRefreshTokenRepository.ts` | `RefreshTokenRepository.ts` |
| `SQLiteSessionRepository.ts` | `SessionRepository.ts` |
| `SQLitePersonRepository.ts` | `PersonRepository.ts` |

### 33.2 Rationale

**Industry standard practice:** Implementation details should not leak into filenames.

1. **Clean Architecture principle:** The repository interface (in domain layer) defines the contract. The implementation (in infrastructure layer) fulfills that contract. The filename shouldn't reveal which database is used.

2. **Future-proof:** If you ever switch databases again, you just change the implementation - not the filename, not the imports, not the references.

3. **Real-world examples:**
   - NestJS projects: `UserRepository` (not `TypeOrmUserRepository`)
   - Spring Boot: `UserRepository` (not `JpaUserRepository`)
   - Clean Architecture books: Always use technology-agnostic names

4. **Folder structure already provides context:** The file is in `infrastructure/repositories/` - that's the implementation layer. No need to repeat it in the filename.

### 33.3 What About the Interface?

The interface in the domain layer is already named correctly:

```
domain/repositories/TubeRepository.ts       ← Interface (contract)
infrastructure/repositories/TubeRepository.ts ← Implementation (PostgreSQL)
```

The domain interface defines **what** the repository does.
The infrastructure implementation defines **how** it's done.

### 33.4 Update Imports

After renaming, update all imports:

```typescript
// BEFORE
import { SQLiteTubeRepository } from '@infrastructure/repositories/SQLiteTubeRepository';

// AFTER
import { TubeRepository } from '@infrastructure/repositories/TubeRepository';
```

---

## 34. Conversion Methodology

### 34.1 Approach: Manual, Methodical, One Repository at a Time

Converting 268 queries across 9 repositories is a significant task. This section outlines the recommended approach to minimize errors and ensure quality.

### 34.2 Why Manual Conversion?

Automated scripts would need to:
- Parse SQL and understand context
- Handle `?` → `$n` with correct numbering
- Convert column names (camelCase → snake_case)
- Transform boolean logic (`= 1` → `= TRUE`)
- Handle function differences (`datetime('now')` → `NOW()`)
- Recognize structural patterns (`INSERT OR REPLACE` → `ON CONFLICT`)

This level of context-awareness is error-prone to automate. Manual conversion with a systematic approach is safer and allows judgment calls.

### 34.3 Conversion Order (Recommended)

Start with smaller repositories to build confidence, then tackle larger ones:

| Order | Repository | Queries | Complexity | Notes |
|-------|------------|---------|------------|-------|
| 1 | `PersonRepository` | ~8 | Low | Simple CRUD, good warmup |
| 2 | `AuditArchiveRepository` | ~12 | Low | Straightforward queries |
| 3 | `SessionRepository` | ~18 | Low | Boolean field practice |
| 4 | `RefreshTokenRepository` | ~20 | Low | Date comparisons |
| 5 | `AuditRepository` | ~25 | Medium | Transactions |
| 6 | `UserRepository` | ~35 | Medium | Multiple boolean fields |
| 7 | `ResearcherRepository` | ~40 | Medium | Case-insensitive search |
| 8 | `ConfigurationRepository` | ~50 | Medium | Complex queries |
| 9 | `TubeRepository` | ~60 | High | Full-text search, most complex |

### 34.4 Per-Repository Process

For each repository:

1. **Create a working branch:**
   ```bash
   git checkout -b postgres/person-repository
   ```

2. **Rename the file:**
   ```bash
   git mv SQLitePersonRepository.ts PersonRepository.ts
   ```

3. **Update the class name and imports**

4. **Convert queries one method at a time:**
   - Use Section 5 (Query Syntax Conversion Guide) as reference
   - Use Section 22.5 (Column Name Mapping) as checklist
   - Test each method after converting

5. **Run repository tests** (if available)

6. **Manual testing:**
   - Start server with local PostgreSQL
   - Exercise the endpoints that use this repository
   - Verify data is correct

7. **Commit and move to next repository:**
   ```bash
   git add .
   git commit -m "Convert PersonRepository to PostgreSQL"
   ```

### 34.5 Query Conversion Checklist

For each query, verify:

- [ ] `?` placeholders → `$1, $2, $3...` (numbered correctly)
- [ ] Column names → snake_case (refer to Section 22.5)
- [ ] Boolean values → `TRUE/FALSE` instead of `1/0`
- [ ] Date functions → `NOW()` instead of `datetime('now')`
- [ ] `INSERT OR REPLACE` → `INSERT ... ON CONFLICT DO UPDATE`
- [ ] `COLLATE NOCASE` → `ILIKE` or `LOWER()`
- [ ] Return clauses → Add `RETURNING *` where beneficial

### 34.6 Common Mistakes to Avoid

1. **Wrong parameter numbering:**
   ```sql
   -- WRONG: Reused $1
   WHERE id = $1 AND name = $1

   -- CORRECT: Unique numbers
   WHERE id = $1 AND name = $2
   ```

2. **Forgetting column name conversion:**
   ```sql
   -- WRONG: Still using camelCase
   SELECT tankId, rackId FROM tubes

   -- CORRECT: Using snake_case
   SELECT tank_id, rack_id FROM tubes
   ```

3. **Boolean comparison issues:**
   ```typescript
   // WRONG: Still checking for 1
   const isLocked = row.is_locked === 1;

   // CORRECT: Native boolean
   const isLocked = row.is_locked;
   ```

4. **Forgetting mapper updates:**
   - Repository queries use snake_case columns
   - Mappers translate to/from camelCase domain objects
   - Both must be updated together

### 34.7 Testing Strategy Per Repository

After converting each repository:

1. **Unit test:** Each method in isolation
2. **Integration test:** Against local PostgreSQL
3. **API test:** Call endpoints that use the repository
4. **Manual verification:** Check data in database

Only move to the next repository after the current one is fully tested.

---

## Appendix A: Complete File Inventory

### A.1 Database Layer (HIGH Priority)

| File | Action | Lines | Notes |
|------|--------|-------|-------|
| `server/src/infrastructure/database/SQLiteContext.ts` | Refactor → `PostgresContext.ts` | ~594 | Full rewrite with pg driver |
| `server/src/infrastructure/database/SqliteDateMapper.ts` | Rename → `DateMapper.ts` | ~104 | Logic stays same, just rename |
| `server/src/infrastructure/database/DatabaseErrors.ts` | Update error codes | ~64 | SQLite codes → PostgreSQL codes |

### A.2 Repository Files (HIGH Priority)

> **Note:** All files renamed to remove `SQLite` prefix. See Section 33 for rationale.

| Current File | New File | Queries | Boolean Fields |
|--------------|----------|---------|----------------|
| `SQLiteTubeRepository.ts` | `TubeRepository.ts` | ~60 | `isLocked` |
| `SQLiteConfigurationRepository.ts` | `ConfigurationRepository.ts` | ~50 | None |
| `SQLiteResearcherRepository.ts` | `ResearcherRepository.ts` | ~40 | `active` |
| `SQLiteUserRepository.ts` | `UserRepository.ts` | ~35 | `emailVerified`, `requirePasswordChange` |
| `SQLiteAuditRepository.ts` | `AuditRepository.ts` | ~25 | None |
| `SQLiteRefreshTokenRepository.ts` | `RefreshTokenRepository.ts` | ~20 | `isRevoked` |
| `SQLiteSessionRepository.ts` | `SessionRepository.ts` | ~18 | `isActive` |
| `AuditArchiveRepository.ts` | (unchanged) | ~12 | None |
| `SQLitePersonRepository.ts` | `PersonRepository.ts` | ~8 | None |
| `index.ts` (repositories) | (unchanged) | ~203 | Factory changes + import updates |

### A.3 Data Mapper Files (MEDIUM Priority)

| File | Action | Boolean Conversions |
|------|--------|---------------------|
| `TubeMapper.ts` | Remove 0/1 conversion | `isLocked` (lines 39, 90, 169) |
| `UserMapper.ts` | Remove 0/1 conversion | `emailVerified`, `requirePasswordChange` |
| `RefreshTokenMapper.ts` | Remove 0/1 conversion | `isRevoked` (4 locations) |
| `UserSessionMapper.ts` | Remove 0/1 conversion | `isActive` (4 locations) |
| `ResearcherMapper.ts` | Remove 0/1 conversion | `active` (3 locations) |
| `PersonMapper.ts` | Update import only | None |

### A.4 Server Configuration (MEDIUM Priority)

| File | Action | Changes |
|------|--------|---------|
| `server/src/index.ts` | Update DB init, remove Firebase, update status | ~100 lines |
| `server/package.json` | Remove better-sqlite3 (server only); Add pg, @types/pg | Dependencies |
| Root `package.json` | Keep better-sqlite3 (for Electron cache); Remove firebase deps | See Section 11.2 |

### A.5 Client Configuration (EASY Priority)

| File | Action | Lines |
|------|--------|-------|
| `client/src/infrastructure/api/client.ts` | Add env var for URL | ~5 |
| `client/src/infrastructure/socket/SocketService.ts` | Add env var for URL | ~5 |
| `client/.env.production` | Create | New file |
| `client/.env.development` | Create | New file |

### A.6 Electron Changes (MEDIUM Priority)

| File | Action | Notes |
|------|--------|-------|
| `electron/main.js` | Remove server startup, add cache init | Server runs in cloud |
| `electron/SecretManager.js` | Keep for local dev | Not used in production |

### A.6.1 Files to CREATE for Offline Caching (Phase 18)

| File | Purpose |
|------|---------|
| `client/src/services/ConnectionManager.ts` | Detect online/offline state |
| `client/src/services/CacheSyncService.ts` | Sync data from cloud to local cache |
| `client/src/components/OfflineBanner.tsx` | Display offline mode indicator |
| `electron/cache-schema.sql` | Schema for local SQLite cache |

### A.7 Files to DELETE

| File | Reason |
|------|--------|
| `server/src/infrastructure/services/FirebaseSyncService.ts` | Replaced by PostgreSQL |
| `server/src/infrastructure/services/SyncEngine.ts` | Replaced by PostgreSQL |
| `server/src/infrastructure/services/WorkspaceService.ts` | Replaced by PostgreSQL |

### A.8 Files to CREATE

| File | Purpose |
|------|---------|
| `server/src/infrastructure/database/PostgresContext.ts` | PostgreSQL connection/query layer |
| `server/src/infrastructure/database/schema.sql` | Complete PostgreSQL schema |
| `server/.env.example` | Document required env vars |
| `client/.env.example` | Document client env vars |

---

## Appendix B: Complete Migration Checklist

### Phase 1: Setup & Infrastructure
- [ ] Create Railway account
- [ ] Create PostgreSQL database in Railway
- [ ] Note connection string (DATABASE_URL)
- [ ] Generate JWT_SECRET for production
- [ ] Configure environment variables in Railway

### Phase 2: Database Context
- [ ] Create `PostgresContext.ts` with connection pooling
- [ ] Implement async query methods (`queryOne`, `queryMany`, `execute`)
- [ ] Implement async transaction wrapper
- [ ] Add connection health check
- [ ] Test basic connectivity

### Phase 3: Schema & Migrations
- [ ] Create complete `schema.sql` for PostgreSQL
- [ ] Convert all data types (TEXT timestamps → TIMESTAMPTZ, INTEGER bools → BOOLEAN)
- [ ] Create all 42 indexes (see Section 21 for complete list)
- [ ] Create PostgreSQL full-text search columns and triggers
- [ ] Deploy schema to Railway PostgreSQL
- [ ] Verify all tables created correctly

### Phase 4: Data Mappers
- [ ] Update `TubeMapper.ts` - add camelCase↔snake_case translation + remove boolean conversion
- [ ] Update `UserMapper.ts` - add camelCase↔snake_case translation + remove boolean conversions
- [ ] Update `RefreshTokenMapper.ts` - add camelCase↔snake_case translation + remove boolean conversion
- [ ] Update `UserSessionMapper.ts` - add camelCase↔snake_case translation + remove boolean conversion
- [ ] Update `ResearcherMapper.ts` - add camelCase↔snake_case translation + remove boolean conversion
- [ ] Update `PersonMapper.ts` - add camelCase↔snake_case translation
- [ ] Rename `SqliteDateMapper.ts` → `DateMapper.ts`
- [ ] Update all imports for DateMapper
- [ ] Reference Section 22.5 for complete column name mapping

### Phase 5: Repository Conversion
> **Note:** Follow conversion order from Section 34.3. Rename files as you convert (see Section 33).
- [ ] Rename + Convert `PersonRepository.ts` (8 queries) - warmup
- [ ] Rename + Convert `AuditArchiveRepository.ts` (12 queries)
- [ ] Rename + Convert `SessionRepository.ts` (18 queries)
- [ ] Rename + Convert `RefreshTokenRepository.ts` (20 queries)
- [ ] Rename + Convert `AuditRepository.ts` (25 queries + transactions)
- [ ] Rename + Convert `UserRepository.ts` (35 queries)
- [ ] Rename + Convert `ResearcherRepository.ts` (40 queries)
- [ ] Rename + Convert `ConfigurationRepository.ts` (50 queries)
- [ ] Rename + Convert `TubeRepository.ts` (60 queries) - most complex, do last
- [ ] Update repository factory `index.ts` with new imports

### Phase 6: Full-Text Search (Feature Parity)
> **Critical:** Search must work identically to current SQLite FTS5. See Section 6.
- [ ] Install `pg_trgm` extension on PostgreSQL
- [ ] Create `search_vector` column on tubes table
- [ ] Create GIN index for full-text search
- [ ] Create trigram indexes for partial matching (see Section 6.4)
- [ ] Create trigger function for automatic indexing
- [ ] Implement hybrid search in `TubeRepository.ts` (see Section 6.4)
- [ ] Test all search patterns from Section 6.6 checklist

### Phase 7: Error Handling
- [ ] Update `DatabaseErrors.ts` with PostgreSQL error codes
- [ ] Test constraint violation detection
- [ ] Test unique constraint errors

### Phase 8: Server Configuration
- [ ] Update `server/src/index.ts` database initialization
- [ ] Remove Electron-specific path logic
- [ ] Remove Firebase imports and initialization
- [ ] Update CORS for production domains
- [ ] Update `getDatabaseStatus()` response
- [ ] Update health check endpoint
- [ ] Add database connection health check

### Phase 9: Client Configuration
- [ ] Create `client/.env.development`
- [ ] Create `client/.env.production`
- [ ] Update `client.ts` to use env vars
- [ ] Update `SocketService.ts` to use env vars
- [ ] Test client with remote server

### Phase 10: Firebase & Sync Cleanup
- [ ] Delete `FirebaseSyncService.ts`
- [ ] Delete `SyncEngine.ts`
- [ ] Delete `WorkspaceService.ts`
- [ ] Remove Firebase references from `index.ts`
- [ ] Remove sync endpoints: `/api/sync/status`, `/api/sync/invite`, `/api/sync/all`
- [ ] Update or remove `/api/admin/sync-status` route
- [ ] Update `getSyncStatus()` in ConfigurationRepository
- [ ] Remove Firebase dependencies from `package.json`

### Phase 11: Dependencies & Build Scripts
> **Important:** Keep `better-sqlite3` in root for Electron cache. See Section 11.2.
- [ ] Remove `better-sqlite3` from **server/package.json** only
- [ ] Keep `better-sqlite3` in **root package.json** (for Electron cache)
- [ ] Keep `@electron/rebuild` in root (still needed for Electron)
- [ ] Remove `firebase` and `firebase-admin` from root package.json
- [ ] Add `pg` driver to server/package.json
- [ ] Add `@types/pg` for TypeScript (server devDependencies)
- [ ] Keep `postinstall` script (still rebuilds better-sqlite3 for Electron)
- [ ] Keep `build.asarUnpack` config (still needed for Electron)
- [ ] Run `npm install` in both root and server
- [ ] Verify server starts with PostgreSQL
- [ ] Verify Electron builds with local SQLite cache

### Phase 12: Electron Updates
- [ ] Update `electron/main.js` to not start server
- [ ] Configure production API URL
- [ ] Test Electron app with cloud server
- [ ] Build production Electron app

### Phase 13: Testing
- [ ] Unit test each repository method
- [ ] Integration test with PostgreSQL
- [ ] Test all CRUD operations
- [ ] Test full-text search
- [ ] Test real-time updates (Socket.IO)
- [ ] Test with 2+ simultaneous users
- [ ] Performance test with sample data

### Phase 14: Railway Setup
- [ ] Create Railway account
- [ ] Create new project `odysseus-production`
- [ ] Add PostgreSQL database service
- [ ] Copy DATABASE_URL connection string
- [ ] Generate JWT_SECRET (`openssl rand -base64 32`)
- [ ] Configure all environment variables (see Section 27.4)

### Phase 15: SSL & Connection Testing
- [ ] Add SSL configuration to PostgresContext (see Section 28)
- [ ] Test connection to Railway PostgreSQL locally
- [ ] Verify queries work with SSL enabled

### Phase 16: Deployment
- [ ] Deploy server to Railway (GitHub integration or CLI)
- [ ] Verify health check endpoint
- [ ] Test API from browser
- [ ] Test Socket.IO connection
- [ ] Build Electron app with production URL
- [ ] Test Electron app with production server
- [ ] Distribute to test user
- [ ] Get feedback, fix issues
- [ ] Full team rollout

### Phase 17: Data Migration (When Needed)
> **Note:** Skip for initial deployment with dummy data
- [ ] Export SQLite data to CSV
- [ ] Transform column names (camelCase → snake_case)
- [ ] Transform boolean values (0/1 → true/false)
- [ ] Import to PostgreSQL
- [ ] Verify data integrity

### Phase 18: Electron Offline Caching
> **Note:** Implement after core migration is stable. See Section 31.
- [ ] Create cache database schema (`odysseus-cache.sqlite`)
- [ ] Implement `ConnectionManager` for online/offline detection
- [ ] Implement `CacheSyncService` for syncing data from cloud
- [ ] Add `OfflineBanner` component to show offline status
- [ ] Disable write operations when offline
- [ ] Test offline browsing with cached data
- [ ] Test cache sync when coming back online
- [ ] Test UI indicators and disabled buttons

---

## Appendix C: Query Count Summary

> **Note:** Repository names shown are the NEW names after renaming (see Section 33).

| Repository (New Name) | Total Queries | Transactions | Complexity |
|-----------------------|---------------|--------------|------------|
| TubeRepository | ~60 | 1 | HIGH (FTS + hybrid search) |
| ConfigurationRepository | ~50 | 0 | MEDIUM |
| ResearcherRepository | ~40 | 0 | MEDIUM |
| UserRepository | ~35 | 0 | MEDIUM |
| AuditRepository | ~25 | 1 | MEDIUM |
| RefreshTokenRepository | ~20 | 0 | LOW |
| SessionRepository | ~18 | 0 | LOW |
| AuditArchiveRepository | ~12 | 1 | LOW |
| PersonRepository | ~8 | 0 | LOW |
| **TOTAL** | **~268** | **3** | |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Initial | Basic migration plan |
| 2.0 | Deep Investigation | Added: Mapper changes, transaction patterns, error handling, secret management, Firebase decision, backup strategy, complete file inventory |
| 3.0 | Comprehensive Review | Fixed: Section numbering, TOC alignment, subsection numbering. Added: 42 index details, build script updates, sync endpoints removal |
| 4.0 | Operations & Deployment | Added: Data migration strategy (Section 26), Railway setup guide (Section 27), SSL/TLS configuration (Section 28), Transition period strategy (Section 29), Scheduled jobs review (Section 30). Updated: Column naming to snake_case (Section 22), Appendix B expanded to 17 phases |
| 5.0 | Consistency Audit | Fixed: All SQL examples now use snake_case columns. Fixed: All 42 index definitions use snake_case. Removed: Firebase mention from Section 9. Added: Connection pool config, Health check with DB verification |
| 6.0 | AGENTS.md Compliance | Added: Clean Architecture compliance table (Section 1), Security compliance table (Section 9.2), Graceful shutdown (Section 8.4), Type-safe query methods (Section 17.3), Enhanced testing strategy (Section 13), Shared-schemas preservation note (Section 11.4). Verified: All naming conventions, layer boundaries, testing requirements per AGENTS.md |
| 7.0 | Complete & Bulletproof | Added: Offline caching strategy (Section 31), Local development setup (Section 32), Repository naming convention (Section 33), Conversion methodology (Section 34). Updated: Repository names throughout (removed SQLite prefix), Dependencies clarified (keep better-sqlite3 for Electron), Search preservation with pg_trgm hybrid approach, Phase 18 for offline caching. Expanded Appendix B to 18 phases. |

---

## AGENTS.md Compliance Summary

This migration plan has been verified against all relevant AGENTS.md guidelines:

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Clean Architecture layers | ✅ | Section 1 - Domain layer unchanged |
| Repository pattern | ✅ | Interfaces preserved, implementations renamed without tech prefix (Section 33) |
| Named exports only | ✅ | PostgresContext, all repositories use named exports |
| PascalCase for services | ✅ | PostgresContext.ts, TubeRepository.ts naming |
| TypeScript type safety | ✅ | Type-safe query methods in Section 17.3 |
| Security (JWT, bcrypt, helmet) | ✅ | Section 9.2 security table |
| Socket.IO preserved | ✅ | Section 2 "What Stays the Same" |
| @odysseus/shared-schemas | ✅ | Section 11.6 - unchanged |
| Testing requirements | ✅ | Section 13 - build, package, Socket.IO |
| Future-proof naming | ✅ | Section 33 - technology-agnostic repository names |
| No dead code | ✅ | Sections 20, 24 - Firebase removal |
| Graceful shutdown | ✅ | Section 8.4 |

---

**END OF DOCUMENT**

*This plan will be reviewed and refined before implementation begins.*
