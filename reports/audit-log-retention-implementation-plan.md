# Audit Log Retention & Archival Implementation Plan

**Date:** 2025-01-22
**Status:** Planning Phase
**Estimated Effort:** 12-16 hours across 6 phases

---

## Executive Summary

This document outlines the implementation of an industry-standard audit log retention and archival system for Odysseus. The system will automatically archive old audit entries to separate storage after 90 days and delete entries older than 2 years, ensuring the active audit log table remains fast and performant while maintaining compliance-appropriate retention periods.

### Key Objectives

1. **Performance Protection:** Keep active audit log table small and fast (<100K rows)
2. **Compliance Alignment:** Retain audit data for 2 years (research/lab standard)
3. **Non-Breaking Implementation:** Zero impact on existing audit logging functionality
4. **Admin Control:** Configurable retention policies and manual archival triggers
5. **Transparent Access:** Users can optionally search archived logs with clear performance expectations

---

## Retention Policy (Industry Standards for Research Labs)

### Recommended Retention Periods

**Active Storage (Fast Queries):**
- **Duration:** 90 days
- **Purpose:** Recent audit investigations, daily operations
- **Performance:** Sub-second queries with full filtering
- **Storage:** Primary `audit_log` table with full indexes

**Warm Archive (Basic Search):**
- **Duration:** 90 days to 2 years
- **Purpose:** Quarterly reviews, compliance audits, incident investigations
- **Performance:** 2-5 second queries with limited filtering
- **Storage:** Separate `audit_log_archive` table with minimal indexes

**Deletion Policy:**
- **After:** 2 years
- **Rationale:** Research data integrity standards (FDA 21 CFR Part 11, Good Laboratory Practice)
- **Exception:** Legal hold prevents automatic deletion

### Industry Alignment

- **Healthcare/Research (HIPAA-adjacent):** 1-7 years
- **General SaaS:** 1-2 years
- **Financial (SOX):** 7+ years

**Odysseus Target:** 2 years total (90 days active + ~21 months archived)

---

## Architecture Overview

### Design Principles

Following AGENTS.md guidelines for Clean Architecture and Domain-Driven Design:

1. **Separation of Concerns:** Archival is a background data management task, separate from UI
2. **Non-Breaking Changes:** Existing audit queries continue working unchanged
3. **Backend-First:** Core logic in application/infrastructure layers
4. **Admin-Only Features:** Retention settings restricted to admin role
5. **Performance Isolation:** Archive queries are opt-in to protect main table performance

### System Components

**Backend (Primary Implementation):**
- `AuditRetentionService` - Business logic for archival/deletion
- `AuditArchiveRepository` - Data access for archived logs
- `AuditArchivalJob` - Scheduled/manual archival execution
- Migration for `audit_log_archive` table
- Controller endpoints for archive access and admin settings

**Frontend (Secondary - UI Enhancement):**
- `AuditLogViewer` - Add "Include archived logs" toggle
- `AuditRetentionSettings` - New admin settings component
- `AdminService` - Methods to call retention endpoints

**Configuration:**
- `auditConfig.ts` - Centralized retention policy settings
- Scheduled job (runs daily at 2 AM)

---

## Implementation Plan

### Phase 1: Database & Configuration

**Objective:** Set up archive table schema and retention configuration

#### 1.1 Create Migration

**File:** `server/src/infrastructure/database/migrations/00X_create_audit_archive.sql`

```sql
-- Audit log archive table (warm storage)
CREATE TABLE audit_log_archive (
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
  archivedAt TEXT NOT NULL,  -- Tracks when entry was archived
  FOREIGN KEY(userId) REFERENCES users(id)
);

-- Minimal indexes for archive (timestamp-focused queries only)
CREATE INDEX idx_audit_archive_timestamp ON audit_log_archive(timestamp DESC);
CREATE INDEX idx_audit_archive_userId ON audit_log_archive(userId);
CREATE INDEX idx_audit_archive_archivedAt ON audit_log_archive(archivedAt DESC);

-- Add index to active table for efficient archival queries
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC);
```

#### 1.2 Create Configuration File

**File:** `server/src/config/auditConfig.ts`

```typescript
/**
 * Audit Log Retention Configuration
 *
 * Centralized retention policy settings following research lab standards.
 */

export const AUDIT_RETENTION_CONFIG = {
  // Active table retention (fast queries)
  activeRetentionDays: 90,

  // Total retention period before deletion (warm archive + active)
  totalRetentionDays: 730,  // 2 years

  // Archive retention (total - active)
  archiveRetentionDays: 640,  // ~21 months

  // Scheduled archival job (cron format: "0 2 * * *" = 2 AM daily)
  archivalJobSchedule: '0 2 * * *',

  // Enable/disable automatic archival
  enableAutoArchival: true,

  // Performance warning threshold (alert if active table exceeds this)
  activeTableWarningThreshold: 50000,

  // Batch size for archival operations (prevents memory issues)
  archivalBatchSize: 1000,
} as const;

export type AuditRetentionConfig = typeof AUDIT_RETENTION_CONFIG;
```

**Compliance with AGENTS.md:**
- ✅ Constants use UPPER_CASE_WITH_UNDERSCORES + `as const`
- ✅ Configuration file in `server/src/config/` (matches existing patterns)
- ✅ Centralized single source of truth for retention settings

---

### Phase 2: Core Backend Services

**Objective:** Implement retention business logic and data access

#### 2.1 Create AuditArchiveRepository

**File:** `server/src/infrastructure/repositories/AuditArchiveRepository.ts`

**Purpose:** Data access layer for archived audit logs

**Key Methods:**
```typescript
class AuditArchiveRepository {
  // Save archived entries (bulk insert)
  async saveArchived(entries: AuditLogEntry[]): Promise<void>

  // Query archived logs (limited filters, slower performance)
  async findArchived(filters: AuditLogFilters): Promise<PaginatedResult<AuditLogEntry>>

  // Count archived entries
  async countArchived(): Promise<number>

  // Export archived logs to file (CSV/JSON)
  async exportToFile(dateRange: DateRange, format: 'csv' | 'json'): Promise<string>

  // Get oldest archived entry timestamp
  async getOldestArchivedTimestamp(): Promise<Date | null>
}
```

**Compliance with AGENTS.md:**
- ✅ Repository pattern (implements interface from domain layer)
- ✅ Located in `infrastructure/repositories/` (Clean Architecture layer)
- ✅ PascalCase with `Repository` suffix
- ✅ Async methods return typed results

#### 2.2 Update SQLiteAuditRepository

**File:** `server/src/infrastructure/repositories/SQLiteAuditRepository.ts` (existing)

**Changes:** Add archival-specific methods

**New Methods:**
```typescript
// Find entries older than specified date (for archival)
async findOlderThan(date: Date, limit?: number): Promise<AuditLogEntry[]>

// Delete archived entries from active table (called after saveArchived)
async deleteArchived(entryIds: string[]): Promise<number>

// Get active table statistics
async getActiveTableMetrics(): Promise<{
  count: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
  sizeBytes: number;
}>
```

**Compliance with AGENTS.md:**
- ✅ Extends existing repository (no breaking changes)
- ✅ Methods added to existing interface (domain layer contract)

#### 2.3 Create AuditRetentionService

**File:** `server/src/application/services/AuditRetentionService.ts`

**Purpose:** Application service orchestrating retention/archival use cases

**Key Methods:**
```typescript
class AuditRetentionService {
  constructor(
    private auditRepository: AuditRepository,
    private archiveRepository: AuditArchiveRepository
  ) {}

  /**
   * Archive audit entries older than specified days
   * Moves entries from active table to archive table
   */
  async archiveOldEntries(olderThanDays: number): Promise<ArchivalResult>

  /**
   * Delete archived entries past retention period
   * Permanently removes entries older than total retention
   */
  async deleteExpiredEntries(olderThanDays: number): Promise<number>

  /**
   * Get retention metrics for monitoring/admin dashboard
   */
  async getRetentionMetrics(): Promise<RetentionMetrics>

  /**
   * Get current retention policy settings
   */
  async getRetentionPolicy(): Promise<RetentionPolicy>

  /**
   * Update retention policy (admin only, validated)
   */
  async updateRetentionPolicy(policy: UpdateRetentionPolicy): Promise<void>

  /**
   * Query both active and archived logs (union query)
   */
  async queryAllLogs(filters: AuditLogFilters): Promise<PaginatedResult<AuditLogEntry>>
}
```

**Return Types:**
```typescript
interface ArchivalResult {
  success: boolean;
  archivedCount: number;
  deletedCount: number;
  duration: number;
  errors: string[];
}

interface RetentionMetrics {
  activeEntries: number;
  archivedEntries: number;
  totalEntries: number;
  oldestActiveEntry: Date | null;
  oldestArchivedEntry: Date | null;
  activeTableSizeBytes: number;
  archiveTableSizeBytes: number;
  estimatedDaysUntilArchival: number;
}

interface RetentionPolicy {
  activeRetentionDays: number;
  totalRetentionDays: number;
  enableAutoArchival: boolean;
  lastArchivalRun: Date | null;
  nextScheduledArchival: Date | null;
}
```

**Compliance with AGENTS.md:**
- ✅ Application service (orchestrates domain logic)
- ✅ Located in `application/services/`
- ✅ Suffix `ApplicationService` considered but `RetentionService` more concise
- ✅ Constructor dependency injection (repositories)
- ✅ Async methods with typed return values

---

### Phase 3: Scheduled Job System

**Objective:** Implement automated daily archival

#### 3.1 Create AuditArchivalJob

**File:** `server/src/infrastructure/jobs/AuditArchivalJob.ts`

**Purpose:** Scheduled job executing archival process

**Implementation:**
```typescript
import cron from 'node-cron';
import { AuditRetentionService } from '@application/services/AuditRetentionService';
import { AUDIT_RETENTION_CONFIG } from '@config/auditConfig';
import { logger } from '@utils/logger';

export class AuditArchivalJob {
  private task: cron.ScheduledTask | null = null;

  constructor(private retentionService: AuditRetentionService) {}

  /**
   * Execute archival process (can be called manually or by scheduler)
   */
  async execute(): Promise<JobResult> {
    const startTime = Date.now();
    logger.info('Starting audit log archival job');

    try {
      // Archive old entries (move to archive table)
      const archivalResult = await this.retentionService.archiveOldEntries(
        AUDIT_RETENTION_CONFIG.activeRetentionDays
      );

      // Delete expired entries (past total retention)
      const deletedCount = await this.retentionService.deleteExpiredEntries(
        AUDIT_RETENTION_CONFIG.totalRetentionDays
      );

      const duration = Date.now() - startTime;

      logger.info('Audit log archival completed', {
        archived: archivalResult.archivedCount,
        deleted: deletedCount,
        duration
      });

      return {
        success: true,
        archived: archivalResult.archivedCount,
        deleted: deletedCount,
        duration,
        errors: archivalResult.errors
      };
    } catch (error) {
      logger.error('Audit archival job failed', { error });
      return {
        success: false,
        archived: 0,
        deleted: 0,
        duration: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Schedule daily archival job (called during server startup)
   */
  scheduleDaily(schedule: string = AUDIT_RETENTION_CONFIG.archivalJobSchedule): void {
    if (this.task) {
      logger.warn('Archival job already scheduled');
      return;
    }

    if (!AUDIT_RETENTION_CONFIG.enableAutoArchival) {
      logger.info('Auto-archival disabled in configuration');
      return;
    }

    this.task = cron.schedule(schedule, async () => {
      await this.execute();
    });

    logger.info('Audit archival job scheduled', { schedule });
  }

  /**
   * Stop scheduled job (cleanup)
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('Audit archival job stopped');
    }
  }
}

interface JobResult {
  success: boolean;
  archived: number;
  deleted: number;
  duration: number;
  errors: string[];
}
```

**Dependencies:** `npm install node-cron @types/node-cron`

**Compliance with AGENTS.md:**
- ✅ PascalCase with `Job` suffix
- ✅ Located in `infrastructure/jobs/` (new subdirectory)
- ✅ Uses existing logger utility
- ✅ Constructor dependency injection

#### 3.2 Register Job in Server Startup

**File:** `server/src/index.ts` (existing - modification)

**Change:** Initialize and schedule archival job during server startup

```typescript
// Add to server initialization (after service container setup)
const auditArchivalJob = new AuditArchivalJob(
  serviceContainer.getAuditRetentionService()
);

// Schedule daily archival (2 AM)
auditArchivalJob.scheduleDaily();

logger.info('Audit archival job registered');
```

---

### Phase 4: API Endpoints

**Objective:** Expose retention/archive functionality via REST API

#### 4.1 Update AuditController

**File:** `server/src/presentation/controllers/AuditController.ts` (existing)

**New Endpoints:**

```typescript
/**
 * Get archived audit logs (admin only)
 * GET /api/admin/audit/archived?limit=50&offset=0&...
 */
async getArchivedAuditLog(req: Request, res: Response): Promise<void>

/**
 * Get retention metrics (admin only)
 * GET /api/admin/audit/retention/metrics
 */
async getRetentionMetrics(req: Request, res: Response): Promise<void>

/**
 * Trigger manual archival (admin only)
 * POST /api/admin/audit/retention/archive-now
 */
async triggerArchival(req: Request, res: Response): Promise<void>

/**
 * Get current retention policy (admin only)
 * GET /api/admin/audit/retention/policy
 */
async getRetentionPolicy(req: Request, res: Response): Promise<void>

/**
 * Update retention policy (admin only)
 * PUT /api/admin/audit/retention/policy
 */
async updateRetentionPolicy(req: Request, res: Response): Promise<void>

/**
 * Export archived logs to file (admin only)
 * POST /api/admin/audit/export
 * Body: { dateFrom, dateTo, format: 'csv' | 'json' }
 */
async exportArchivedLogs(req: Request, res: Response): Promise<void>
```

**Compliance with AGENTS.md:**
- ✅ Admin-only endpoints (require role check middleware)
- ✅ RESTful naming conventions
- ✅ Proper HTTP methods (GET for queries, POST for actions, PUT for updates)

#### 4.2 Add Routes

**File:** Routes registration (existing route module)

```typescript
// Admin audit retention routes
router.get('/admin/audit/archived',
  requireAdmin,
  auditController.getArchivedAuditLog.bind(auditController)
);

router.get('/admin/audit/retention/metrics',
  requireAdmin,
  auditController.getRetentionMetrics.bind(auditController)
);

router.post('/admin/audit/retention/archive-now',
  requireAdmin,
  auditController.triggerArchival.bind(auditController)
);

router.get('/admin/audit/retention/policy',
  requireAdmin,
  auditController.getRetentionPolicy.bind(auditController)
);

router.put('/admin/audit/retention/policy',
  requireAdmin,
  validateBody(UpdateRetentionPolicySchema),
  auditController.updateRetentionPolicy.bind(auditController)
);

router.post('/admin/audit/export',
  requireAdmin,
  validateBody(ExportRequestSchema),
  auditController.exportArchivedLogs.bind(auditController)
);
```

---

### Phase 5: Frontend UI

**Objective:** Add user interface for archive access and admin settings

#### 5.1 Update AuditLogViewer

**File:** `client/src/domains/admin/ui/components/AuditLogViewer.tsx` (existing)

**Changes:**

1. Add state for archive toggle:
```typescript
const [includeArchived, setIncludeArchived] = useState(false);
```

2. Add toggle UI (before filter panel):
```tsx
<div className="flex items-center gap-2 mb-2">
  <input
    type="checkbox"
    id="include-archived"
    checked={includeArchived}
    onChange={(e) => setIncludeArchived(e.target.checked)}
    className="rounded border-gray-300"
  />
  <label htmlFor="include-archived" className="text-xs text-gray-600">
    Include archived logs (slower search)
  </label>
</div>
```

3. Conditionally call archived endpoint:
```typescript
const { data, loading, error } = includeArchived
  ? useArchivedAuditLogQuery(filters)
  : useAuditLogQuery(filters);
```

4. Add badge for archived entries:
```tsx
{entry.archivedAt && (
  <span className="badge badge-secondary text-[10px] ml-1">
    Archived
  </span>
)}
```

**Compliance with AGENTS.md:**
- ✅ Minimal changes to existing component
- ✅ Non-breaking (default behavior unchanged)
- ✅ Clear UX expectation ("slower search")

#### 5.2 Create AuditRetentionSettings Component

**File:** `client/src/domains/admin/ui/components/AuditRetentionSettings.tsx` (NEW)

**Purpose:** Admin panel for retention policy management

**Features:**
- Display current retention policy
- Show storage metrics (active vs archived row counts)
- "Archive Now" button (manual trigger)
- "Export Archived Logs" button (download CSV)
- Form to update retention periods (with validation)
- Warning if active table exceeds threshold

**Location in UI:** New tab in Admin panel (alongside Users, Researchers, Security)

**Compliance with AGENTS.md:**
- ✅ PascalCase component name
- ✅ Located in `domains/admin/ui/components/`
- ✅ Uses React Query hooks for data fetching
- ✅ Uses React Hot Toast for notifications

#### 5.3 Update AdminService

**File:** `client/src/domains/admin/services/AdminService.ts` (existing)

**New Methods:**

```typescript
/**
 * Get archived audit logs (union with active)
 */
async getArchivedAuditLog(options: AuditLogFilters): Promise<{
  success: boolean;
  entries: AuditLogEntry[];
  pagination: PaginationInfo;
}>

/**
 * Get retention metrics for admin dashboard
 */
async getRetentionMetrics(): Promise<{
  success: boolean;
  metrics: RetentionMetrics;
}>

/**
 * Trigger manual archival
 */
async triggerArchival(): Promise<{
  success: boolean;
  result: ArchivalResult;
}>

/**
 * Get current retention policy
 */
async getRetentionPolicy(): Promise<{
  success: boolean;
  policy: RetentionPolicy;
}>

/**
 * Update retention policy
 */
async updateRetentionPolicy(policy: UpdateRetentionPolicy): Promise<{
  success: boolean;
}>

/**
 * Export archived logs to file
 */
async exportArchivedLogs(request: ExportRequest): Promise<{
  success: boolean;
  downloadUrl: string;
}>
```

**Compliance with AGENTS.md:**
- ✅ Class-based service (matches existing pattern)
- ✅ Uses httpClient for all API calls
- ✅ Returns typed Promise results

---

### Phase 6: Testing & Monitoring

**Objective:** Validate implementation and add monitoring

#### 6.1 Manual Testing Checklist

- [ ] Migration creates archive table successfully
- [ ] Archival job moves entries older than 90 days
- [ ] Deletion removes entries older than 2 years
- [ ] Active table stays under 100K rows during archival
- [ ] Archive queries work with toggle enabled
- [ ] Manual "Archive Now" button works
- [ ] Admin settings UI displays metrics correctly
- [ ] Export generates valid CSV/JSON files
- [ ] Retention policy updates save correctly
- [ ] Performance remains fast on active table after archival

#### 6.2 Monitoring & Alerts

**Metrics to Track:**
- Active table row count (alert if >50K)
- Archive table row count
- Archival job success/failure
- Archival duration (alert if >5 minutes)
- Query performance on active vs archived tables

**Logging:**
- Log each archival job execution (success/failure, counts, duration)
- Log manual archival triggers
- Log retention policy changes

#### 6.3 Performance Validation

**Test Scenarios:**
1. Query active logs with 50K rows (should be <1 second)
2. Query archived logs with 500K rows (acceptable 2-5 seconds)
3. Run archival with 10K entries (should complete in <2 minutes)
4. Verify VACUUM reclaims space after deletion

---

## Data Flow Diagrams

### Normal Query (Active Logs Only - Default)
```
User → AuditLogViewer → AdminService.getAuditLog()
  → AuditController.getAuditLog()
  → AuditService.getAuditLog()
  → SQLiteAuditRepository.findAll()
  → audit_log table (fast, indexed)
```

### Query with Archives (Opt-In)
```
User → AuditLogViewer (toggle ON) → AdminService.getArchivedAuditLog()
  → AuditController.getArchivedAuditLog()
  → AuditRetentionService.queryAllLogs()
  → SQLiteAuditRepository.findAll() + AuditArchiveRepository.findArchived()
  → UNION results from audit_log + audit_log_archive
  → (slower, limited indexes)
```

### Scheduled Archival (Daily at 2 AM)
```
Cron Scheduler (2 AM)
  → AuditArchivalJob.execute()
  → AuditRetentionService.archiveOldEntries(90 days)
  → SQLiteAuditRepository.findOlderThan(90 days)
  → Batch loop (1000 rows at a time):
    → AuditArchiveRepository.saveArchived(batch)
    → SQLiteAuditRepository.deleteArchived(batch IDs)
  → AuditRetentionService.deleteExpiredEntries(730 days)
  → SQLiteAuditRepository.deleteOlderThan(730 days)
  → VACUUM database (reclaim space)
  → Log results
```

### Manual Archival (Admin Triggered)
```
Admin → AuditRetentionSettings → "Archive Now" button
  → AdminService.triggerArchival()
  → POST /admin/audit/retention/archive-now
  → AuditController.triggerArchival()
  → AuditArchivalJob.execute()
  → (same flow as scheduled archival)
  → Return result to UI
  → Display toast notification with counts
```

---

## Database Schema Changes

### New Tables

**audit_log_archive:**
- Same schema as audit_log (plus archivedAt timestamp)
- Minimal indexes (timestamp, userId only)
- No entityType/action indexes (reduce storage, accept slower complex queries)

### Modified Tables

**audit_log (existing):**
- Add index on timestamp DESC (if not already present)
- No schema changes required

---

## Performance Considerations

### Active Table Optimization

**Target:** Keep under 100K rows at all times

**Estimated Growth:**
- Small lab: 50 actions/day = 4,500 rows/90 days
- Medium lab: 500 actions/day = 45,000 rows/90 days
- Large lab: 5,000 actions/day = 450,000 rows/90 days → **Needs optimization**

**Solution:** For high-volume labs, reduce active retention to 30 days

### Archive Query Performance

**Expected Performance:**
- Active logs: <1 second (full indexes)
- Archived logs: 2-5 seconds (timestamp index only)
- Union queries: 3-7 seconds (sequential scan both tables)

**User Expectation:** "Include archived" toggle warns users of slower search

### Archival Job Performance

**Batch Processing:**
- Process 1,000 entries at a time
- Prevents memory issues with large archival runs
- Commit after each batch

**Estimated Duration:**
- 10K entries: ~1 minute
- 100K entries: ~10 minutes
- 1M entries: ~1.5 hours

**Scheduled Time:** 2 AM (off-hours, minimal user impact)

---

## Security & Access Control

### Admin-Only Features

All retention/archive features require `admin` role:
- View archived logs
- Trigger manual archival
- View retention metrics
- Update retention policy
- Export archived logs

### Regular User Access

Regular users continue using existing audit viewer (active logs only) with no changes.

### Audit of Archival Operations

Archival job execution should itself be logged as an audit entry:
- Action: `audit_archival_executed`
- Details: Archived count, deleted count, duration
- User: System (or admin if manually triggered)

---

## Migration Strategy

### Backward Compatibility

- Existing audit log queries work unchanged
- No breaking changes to current audit logging
- Archive functionality is additive only

### Rollback Plan

If issues arise:
1. Disable auto-archival in config (`enableAutoArchival: false`)
2. Stop scheduled job
3. Move archived entries back to active table (SQL script)
4. Drop archive table
5. Remove retention endpoints (frontend remains functional without them)

---

## Future Enhancements (Out of Scope)

**Phase 7 (Future):**
- Compression for archived logs (SQLite BLOB with gzip)
- Export to external storage (S3, Azure Blob)
- Advanced analytics on archived logs
- Audit log anomaly detection
- Custom retention policies per entity type

---

## File Creation Checklist

### Backend Files (NEW)
- [ ] `server/src/config/auditConfig.ts`
- [ ] `server/src/application/services/AuditRetentionService.ts`
- [ ] `server/src/infrastructure/repositories/AuditArchiveRepository.ts`
- [ ] `server/src/infrastructure/jobs/AuditArchivalJob.ts`
- [ ] `server/src/infrastructure/database/migrations/00X_create_audit_archive.sql`

### Backend Files (MODIFY)
- [ ] `server/src/infrastructure/repositories/SQLiteAuditRepository.ts` (add methods)
- [ ] `server/src/presentation/controllers/AuditController.ts` (add endpoints)
- [ ] `server/src/presentation/routes/*.ts` (register routes)
- [ ] `server/src/index.ts` (initialize archival job)

### Frontend Files (NEW)
- [ ] `client/src/domains/admin/ui/components/AuditRetentionSettings.tsx`

### Frontend Files (MODIFY)
- [ ] `client/src/domains/admin/ui/components/AuditLogViewer.tsx` (add toggle)
- [ ] `client/src/domains/admin/services/AdminService.ts` (add methods)

### Shared Schemas (MODIFY)
- [ ] `packages/shared-schemas/src/admin/auditSchemas.ts` (add retention types)

---

## Compliance with AGENTS.md Guidelines

### Clean Architecture ✅
- **Domain Layer:** Retention policy configuration, business rules
- **Application Layer:** AuditRetentionService (use case orchestration)
- **Infrastructure Layer:** Repositories, scheduled jobs
- **Presentation Layer:** Controller endpoints

### Naming Conventions ✅
- **Services:** PascalCase with `Service` suffix
- **Repositories:** PascalCase with `Repository` suffix
- **Jobs:** PascalCase with `Job` suffix
- **Config:** camelCase file, UPPER_CASE constants
- **Components:** PascalCase, in `ui/components/`
- **No "I" prefix:** Modern TypeScript interfaces

### File Organization ✅
- Services in `application/services/` and `infrastructure/`
- Repositories in `infrastructure/repositories/`
- Jobs in `infrastructure/jobs/` (new subdirectory)
- Config in `server/src/config/`
- Migrations in `infrastructure/database/migrations/`

### Code Quality ✅
- No bandaid solutions (proper architecture)
- Long-term maintainable
- No zombie code
- Follows existing patterns
- Named exports only

### Comment Standards ✅
- Business logic rationale explained
- No self-promotional language
- No redundant markers (✅ checkmarks)
- Technical language with clarity
- Phase references removed from code

---

## Implementation Timeline

**Estimated Total:** 12-16 hours

- **Phase 1 (Database & Config):** 1-2 hours
- **Phase 2 (Backend Services):** 3-4 hours
- **Phase 3 (Scheduled Job):** 2-3 hours
- **Phase 4 (API Endpoints):** 2-3 hours
- **Phase 5 (Frontend UI):** 2-3 hours
- **Phase 6 (Testing & Monitoring):** 2-3 hours

**Recommended Approach:** Sequential implementation (each phase builds on previous)

---

## Success Criteria

1. ✅ Active audit log table stays under 100K rows
2. ✅ Queries on active logs remain <1 second
3. ✅ Automated archival runs daily without issues
4. ✅ Admin can manually trigger archival
5. ✅ Users can optionally search archived logs
6. ✅ Retention policy is configurable
7. ✅ No performance degradation on existing audit features
8. ✅ All existing audit queries work unchanged
9. ✅ Proper logging and monitoring in place
10. ✅ Zero data loss during archival process

---

## Questions to Resolve Before Implementation

1. **Migration numbering:** What is the next migration number (00X)?
2. **Dependency approval:** OK to add `node-cron` package?
3. **UI placement:** Where should AuditRetentionSettings appear in Admin panel?
4. **Export format:** CSV only, or also JSON/Excel?
5. **Initial backfill:** Should we archive existing old entries on first run?

---

**Status:** Ready for implementation approval
**Next Step:** Review plan, answer questions, begin Phase 1
