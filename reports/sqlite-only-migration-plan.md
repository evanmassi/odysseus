# SQLite-Only Migration Plan

## Executive Summary

This plan eliminates the hybrid database system completely, making SQLite the single source of truth for all data persistence in the Odysseus application. This will remove technical debt, simplify the architecture, and improve maintainability.

## Current Architecture Analysis

### Hybrid Components Identified
1. **HybridDatabaseService** - Main orchestrator managing both JSON and SQLite databases
2. **DatabaseService (JSON)** - JSON file-based persistence
3. **SQLiteDatabaseService** - SQLite database implementation
4. **MigrationService** - Handles data migration between systems
5. **Feature Flags** - USE_SQLITE flag controls database selection
6. **Configuration Files** - Multiple JSON files for feature flags, security configs

### Technical Debt Issues
- Dual-write complexity causing performance overhead
- Maintenance burden of two database implementations
- Feature flag complexity and conditional logic paths
- Risk of data inconsistency between systems
- Increased testing surface area

## Migration Strategy

### Phase 1: Pre-migration Setup
1. **Create migration utility** (`scripts/json2sqlite.ts`)
   - Extract MigrationService logic as standalone script
   - Add data verification and checksums
   - Support batch processing for large datasets
   - Generate detailed migration reports

2. **Data backup strategy**
   - Create comprehensive backup of current JSON data
   - Implement rollback procedures
   - Document data validation steps

### Phase 2: Code Refactoring

#### Remove Hybrid System
- **Delete files:**
  - `services/hybridDatabase.ts`
  - `services/jsonDatabase.ts`
  - Related test files

- **Update imports and dependencies:**
  - Replace `HybridDatabaseService` with `SQLiteDatabaseService` directly
  - Remove JSON database imports across the codebase
  - Update type imports and interfaces

#### Simplify Database Interface
- **IDatabaseProvider interface cleanup:**
  - Remove JSON-specific methods
  - Streamline to SQLite-only implementation
  - Maintain enterprise feature support

#### Update Application Startup
- **index.ts modifications:**
  - Remove USE_SQLITE feature flag checks
  - Eliminate conditional database initialization
  - Simplify database setup to SQLite-only

### Phase 3: Configuration and Feature Flag Cleanup

#### Remove JSON-related Feature Flags
- Delete `USE_SQLITE` flag from `featureFlags.json`
- Remove `ENABLE_JSON_BACKUP` if present
- Clean up conditional logic in codebase

#### Configuration Migration
- Move configuration data from JSON files to SQLite tables
- Create dedicated config tables for:
  - Feature flags
  - Security configuration
  - Application settings
  - User preferences

### Phase 4: API Surface Cleanup

#### Remove JSON-specific Endpoints
- Delete `/api/admin/backup/export-json`
- Remove `/api/admin/backup/restore-json`
- Eliminate `switchToSQLite`/`switchToJSON` admin routes

#### Implement SQLite-native Backup
- Create SQLite `VACUUM INTO` backup endpoints
- Implement file-based backup/restore
- Add backup scheduling capabilities

### Phase 5: Testing and Validation

#### Update Test Suite
- Convert tests to use in-memory SQLite (`:memory:`)
- Remove JSON test fixtures
- Update integration tests
- Add performance regression tests

#### Data Migration Testing
- Test migration with various data sizes
- Validate data integrity post-migration
- Performance benchmarking

### Phase 6: Documentation and Deployment

#### Update Documentation
- Revise README with SQLite-only instructions
- Update API documentation
- Create migration guide for existing users
- Update deployment documentation

#### Deployment Strategy
1. Stop application
2. Run migration utility on production data
3. Verify migration success
4. Deploy new SQLite-only version
5. Monitor for 24 hours

## File-by-File Changes

### Files to Delete
```
server/src/services/hybridDatabase.ts
server/src/services/jsonDatabase.ts
server/src/services/migrationService.ts (move to scripts/)
server/src/tests/hybridDatabase.test.ts
server/src/tests/jsonDatabase.test.ts
```

### Files to Modify

#### `server/src/index.ts`
- Remove lines 63-101 (database setup logic)
- Replace with direct SQLiteDatabaseService instantiation
- Remove feature flag conditionals
- Clean up JSON backup endpoints (lines 347-425)

#### `server/src/interfaces/IDatabaseProvider.ts`
- Remove JSON-specific method signatures
- Streamline interface to SQLite-only methods
- Maintain backward compatibility for existing API

#### `server/src/utils/featureFlags.ts`
- Remove `USE_SQLITE` flag definition
- Clean up related conditional exports

### Files to Create

#### `scripts/json2sqlite.ts`
- Standalone migration utility
- Data validation and verification
- Comprehensive error handling
- Progress reporting

#### `scripts/migrate.sh`
- Deployment migration script
- Backup procedures
- Rollback capabilities

## Risk Assessment and Mitigation

### High Risks
1. **Data Loss During Migration**
   - *Mitigation:* Comprehensive backup strategy, data verification, staged rollouts

2. **Application Downtime**
   - *Mitigation:* Blue-green deployment, quick rollback procedures

3. **Performance Regression**
   - *Mitigation:* Performance testing, monitoring, optimization

### Medium Risks
1. **Missed JSON References**
   - *Mitigation:* Comprehensive code scanning, automated tests

2. **Configuration Loss**
   - *Mitigation:* Configuration mapping, validation procedures

## Timeline

| Phase | Tasks | Duration | Dependencies |
|-------|-------|----------|--------------|
| 1 | Migration utility, backup strategy | 1 day | - |
| 2 | Code refactoring, remove hybrid system | 2 days | Phase 1 |
| 3 | Configuration cleanup | 1 day | Phase 2 |
| 4 | API cleanup, backup implementation | 1 day | Phase 3 |
| 5 | Testing, validation | 2 days | Phase 4 |
| 6 | Documentation, deployment | 1 day | Phase 5 |

**Total Estimated Duration: 8 days**

## Success Criteria

1. **Functional Parity**
   - All existing features work identically
   - API endpoints respond correctly
   - Data integrity maintained

2. **Performance Improvement**
   - Faster application startup
   - Reduced memory usage
   - Better response times

3. **Code Quality**
   - Reduced codebase complexity
   - Eliminated technical debt
   - Improved maintainability

4. **Operational Excellence**
   - Simplified deployment procedures
   - Better backup/restore capabilities
   - Cleaner configuration management

## Post-Migration Benefits

1. **Reduced Complexity**
   - Single database implementation
   - Simplified testing
   - Easier debugging

2. **Improved Performance**
   - No dual-write overhead
   - Better caching strategies
   - Optimized queries

3. **Better Maintainability**
   - Single source of truth
   - Consistent data handling
   - Simplified error handling

4. **Enhanced Reliability**
   - ACID compliance
   - Better transaction support
   - Improved data consistency

This migration will result in a cleaner, more maintainable, and performant application architecture while preserving all existing functionality.
