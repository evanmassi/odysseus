# SQLite-Only Architecture - Enterprise Implementation

## Overview

Odysseus now uses a **pure SQLite architecture** as the single source of truth for all data persistence. This document describes the final, production-ready implementation.

## Architecture Principles

### Single Source of Truth
- **Database**: SQLite only (`odysseus.sqlite`)
- **No hybrid systems**: Eliminated dual-write complexity
- **No JSON storage**: All configuration and data in SQLite
- **Enterprise-grade**: ACID compliance, transactions, integrity checking

### Core Components

#### Database Layer
- **`SQLiteDatabaseService`** - Single database implementation
- **`IDatabaseProvider`** - Clean interface (SQLite-specific methods only)
- **Tables**: `tubes`, `researchers`, `users`, `sessions`, `audit_trail`, `security_config`, `feature_flags`
- **Backup**: Enterprise VACUUM INTO with integrity verification

#### Configuration Management
- **Feature Flags**: Stored in `feature_flags` table with rollout percentages
- **Security Config**: Stored in `security_config` table with audit trail
- **No JSON files**: All configuration persisted in SQLite

#### Enterprise Features
- **Audit Trail**: Complete operation tracking in SQLite
- **Performance Monitoring**: Query metrics and optimization
- **Backup & Recovery**: Atomic backups with verification
- **Transaction Support**: ACID compliance for data integrity

## Database Schema

### Core Tables

```sql
-- Primary data storage
tubes (id, tankId, rackId, boxName, position, cellType, ...)
researchers (id, name, active, createdAt, metadata)
users (id, username, apiKey, role, lastActivity, createdAt)

-- Enterprise features
audit_trail (id, entityType, entityId, operation, oldValues, newValues, userId, timestamp)
feature_flags (name, enabled, description, rolloutPercentage, enabledAt, disabledAt)
security_config (id, config, updatedAt, updatedBy)
sessions (id, userId, apiKey, expiresAt, createdAt, lastActivity)
```

### Performance Optimizations
- **Strategic indexes** for location-based queries
- **Prepared statements** for all operations
- **Query caching** with configurable TTL
- **WAL mode** for concurrent read/write access

## API Architecture

### Clean Endpoints
```
GET    /api/tubes              # Get all tubes (paginated)
POST   /api/tubes              # Create tube
PUT    /api/tubes/:id          # Update tube
DELETE /api/tubes/:id          # Delete tube

GET    /api/researchers        # Get researchers
POST   /api/researchers        # Add researcher

POST   /api/admin/backup/create    # Enterprise backup
POST   /api/admin/backup/restore   # Verified restore
GET    /api/admin/database/status  # SQLite status
```

### Removed Endpoints
- ❌ `/api/admin/switch-database` - No longer relevant
- ❌ `/api/admin/backup/export-json` - JSON export removed
- ❌ `/api/configuration` - Use security config instead

## Backup Strategy

### Enterprise Backup Process
1. **VACUUM INTO**: Atomic backup creation
2. **Integrity Check**: PRAGMA integrity_check on backup
3. **Schema Verification**: Confirm all tables exist
4. **Record Count Validation**: Verify data completeness
5. **Checksum Generation**: File integrity verification

### Backup Files
- **Format**: `odysseus-backup-YYYY-MM-DDTHH-MM-SS.sqlite`
- **Location**: User data directory or specified path
- **Verification**: Full integrity check before acceptance

## Feature Flags Architecture

### SQLite-Based Configuration
```sql
CREATE TABLE feature_flags (
  name TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  rolloutPercentage INTEGER DEFAULT 100,
  enabledAt TEXT,
  disabledAt TEXT,
  updatedBy TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);
```

### Available Features
- `ENABLE_AUDIT_TRAIL` - Enterprise compliance tracking
- `ENABLE_QUERY_CACHING` - Performance optimization
- `ENABLE_PERFORMANCE_MONITORING` - System monitoring
- `ENABLE_ADVANCED_SEARCH` - Full-text search capabilities
- `ENABLE_ANALYTICS_DASHBOARD` - Real-time analytics
- `ENABLE_BULK_OPERATIONS` - Bulk editing and import/export
- `CLOUD_SYNC` - Future cloud synchronization

## Development Workflow

### Build Process
```bash
npm run build                 # Build server + client
npm run package:win          # Package for Windows
npm test                     # Run SQLite-only tests
```

### Database Operations
```bash
# Development database
server/data/odysseus.sqlite

# Production database  
%APPDATA%/Odysseus/odysseus-data.sqlite
```

### Testing Strategy
- **Unit Tests**: In-memory SQLite (`:memory:`)
- **Integration Tests**: Temporary SQLite files
- **E2E Tests**: Full application with test database
- **Performance Tests**: Large dataset operations

## Security Architecture

### Data Protection
- **Encrypted at rest**: Optional file-system level encryption
- **Access control**: API key-based authentication
- **Session management**: Secure session handling in SQLite
- **Audit compliance**: Complete operation tracking

### Configuration Security
- **Database storage**: No plaintext config files
- **Change tracking**: Audit trail for all config changes
- **Role-based access**: Admin-only configuration endpoints
- **Backup encryption**: Encrypted backup support

## Performance Characteristics

### Optimizations
- **WAL Mode**: Concurrent read access
- **Prepared Statements**: Query optimization
- **Strategic Indexes**: Location and search optimization
- **Connection Pooling**: Single persistent connection
- **Query Metrics**: Performance monitoring and tuning

### Scalability
- **Single-user optimized**: Desktop application focus
- **Large datasets**: Handles 100K+ tubes efficiently
- **Memory efficient**: Minimal memory footprint
- **Fast startup**: Direct SQLite initialization

## Deployment Architecture

### Production Deployment
1. **Clean build**: All source compiled to dist/
2. **Electron packaging**: Single .exe with embedded SQLite
3. **Data isolation**: User data in AppData directory
4. **Auto-migration**: Seamless updates with data preservation

### File Structure
```
Odysseus.exe                 # Single executable
└── resources/
    ├── app.asar             # Application code
    └── server/              # Server resources
        ├── services/        # Business logic
        └── utils/           # Utilities
```

## Migration Notes

### From Hybrid System
✅ **Complete elimination** of JSON-based persistence  
✅ **Zero technical debt** from dual-write systems  
✅ **Clean codebase** with single database implementation  
✅ **Enterprise features** preserved and enhanced  

### Data Migration
- **Fresh start**: No legacy data preserved (by design)
- **Clean initialization**: Default feature flags and config
- **Production ready**: Immediate deployment capability

## Maintenance

### Regular Operations
- **Backup scheduling**: Automated enterprise backups
- **Performance monitoring**: Query optimization tracking
- **Feature flag management**: Dynamic feature control
- **Security updates**: Configuration change tracking

### Troubleshooting
- **Database integrity**: Built-in SQLite integrity checks
- **Performance analysis**: Query metrics and slow query detection
- **Audit trails**: Complete operation history
- **Log aggregation**: Centralized logging with structured data

This architecture provides a robust, maintainable, and scalable foundation for the Odysseus application with enterprise-grade reliability and performance.
