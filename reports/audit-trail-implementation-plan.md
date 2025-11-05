# Audit Trail Implementation Plan

**Project**: Odysseus Lab Management System
**Feature**: Unified Audit Trail System
**Priority**: High (Research Integrity & Compliance)
**Status**: Design Phase
**Date**: 2025-01-04

---

## Executive Summary

This document outlines the implementation plan for a unified audit trail system in Odysseus. The system will track all critical business operations with **tube operations as the highest priority**, providing accountability, research integrity, and compliance capabilities.

### Business Value
1. **Research Integrity**: Complete history of who created, modified, or deleted tube samples
2. **Accountability**: Track all user actions across the system
3. **Compliance**: Meet lab audit requirements for sample tracking
4. **Debugging**: Understand when and why data changed
5. **Security**: Monitor authentication events and suspicious activity

---

## Investigation Findings

### What Already EXISTS ✅
1. **Complete Audit Schema** - `AuditLogEntry` fully defined in shared-schemas
2. **Domain Events** - Comprehensive tube events defined but not published
3. **Event Bus Infrastructure** - Complete pub/sub system ready to use
4. **Frontend Service** - `AdminService.getAuditLog()` fully implemented
5. **Winston Logger** - Production-ready structured logging
6. **Configuration Versioning** - Pattern we can follow for audit implementation

### What's MISSING ❌
1. **Database Table** - No `audit_log` table exists
2. **Backend Repository** - No AuditRepository implementation
3. **Event Publishing** - Tube events defined but never emitted
4. **Audit Controller** - No `/api/admin/audit` endpoint
5. **Event Handlers** - No subscribers to process domain events
6. **Change Tracking** - No before/after field comparison

### Critical Insight
**Zero Duplication Risk**: The audit system will be a NEW subsystem that complements existing logging. Winston handles application logs (errors, debug info), while audit logs serve compliance and business event tracking.

---

## Architecture Design

### UI Location

**Admin Monitoring Tab**: The audit log will be implemented in the existing **Monitoring** tab (`MonitoringTab.tsx`) which was designed for this purpose but is currently a placeholder. The tab was originally planned to display:
- Login attempt tracking (audit log)
- Security event logs (audit log)
- System performance metrics
- Active user sessions

This makes it the natural home for the audit log viewer.

**System Tab**: Audit statistics will be added to the existing **System** tab alongside current system metrics (tubes, users, researchers, database size).

### Audit Log Data Model

```typescript
interface AuditLogEntry {
  id: string;                    // UUID
  userId: string;                // Who performed the action
  username: string;              // User's display name
  action: string;                // tube_created, tube_updated, login, etc.
  entityType: string;            // tube, user, config, auth
  entityId?: string;             // ID of affected entity
  details: string;               // JSON with action-specific data
  timestamp: Date;               // When it occurred
  ipAddress?: string;            // Request origin
  userAgent?: string;            // Browser/device info
}
```

### Database Schema

```sql
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  username TEXT NOT NULL,
  action TEXT NOT NULL,
  entityType TEXT NOT NULL,
  entityId TEXT,
  details TEXT NOT NULL,          -- JSON blob
  timestamp TEXT NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(userId);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_type ON audit_log(entityType);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_id ON audit_log(entityId);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_composite ON audit_log(entityType, entityId, timestamp DESC);
```

### Event-Driven Architecture

```
┌─────────────────┐
│ TubeController  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ TubeApplicationService  │
└────────┬────────────────┘
         │
         ▼
┌─────────────────┐         ┌──────────────────┐
│ Tube Entity     │────────▶│ Domain Events    │
│ (Business Logic)│         │ - TubeCreated    │
└─────────────────┘         │ - TubeUpdated    │
                            │ - TubeDeleted    │
                            └────────┬─────────┘
                                     │
                                     ▼
                            ┌──────────────────┐
                            │ Event Bus        │
                            └────────┬─────────┘
                                     │
                     ┌───────────────┼───────────────┐
                     ▼               ▼               ▼
            ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
            │ Audit       │ │ Notification│ │ Analytics   │
            │ Handler     │ │ Handler     │ │ Handler     │
            └─────────────┘ └─────────────┘ └─────────────┘
                     │
                     ▼
            ┌─────────────────┐
            │ AuditRepository │
            └─────────────────┘
                     │
                     ▼
            ┌─────────────────┐
            │ audit_log table │
            └─────────────────┘
```

---

## Implementation Phases

### Phase 1: Foundation (Audit Infrastructure)

**Priority**: High
**Estimated Effort**: 2-3 days
**Goal**: Build reusable audit logging infrastructure

#### Tasks

**1.1 Create Audit Database Schema**
- **File**: `server/src/infrastructure/database/SQLiteContext.ts`
- **Action**: Add `audit_log` table creation in `createTables()` method
- **Action**: Add indexes in `createIndexes()` method
- **Reference Line**: After line 179 (user_sessions table)

**Acceptance Criteria**:
- [ ] Table created with all required columns
- [ ] Foreign key to users table enforced
- [ ] All indexes created for query performance
- [ ] Migration tested with fresh database
- [ ] Migration tested with existing database

**1.2 Create Domain Interface**
- **File**: `server/src/domain/repositories/AuditRepository.ts` (new file)
- **Action**: Define repository interface
```typescript
export interface AuditRepository {
  save(entry: AuditLogEntry): Promise<void>;
  saveMany(entries: AuditLogEntry[]): Promise<void>;
  findByUserId(userId: string, options?: QueryOptions): Promise<AuditLogEntry[]>;
  findByEntityId(entityId: string, entityType: string): Promise<AuditLogEntry[]>;
  findByAction(action: string, options?: QueryOptions): Promise<AuditLogEntry[]>;
  findAll(filters: AuditLogFilters): Promise<PaginatedResult<AuditLogEntry>>;
  deleteOlderThan(date: Date): Promise<number>; // For retention policy
}
```

**Acceptance Criteria**:
- [ ] Interface follows repository pattern from existing code
- [ ] QueryOptions includes limit, offset, dateFrom, dateTo
- [ ] PaginatedResult follows existing pagination patterns
- [ ] All methods properly typed with Zod schemas

**1.3 Implement SQLite Repository**
- **File**: `server/src/infrastructure/repositories/SQLiteAuditRepository.ts` (new file)
- **Action**: Implement AuditRepository interface
- **Pattern**: Follow `SQLiteTubeRepository.ts` as reference

**Acceptance Criteria**:
- [ ] All interface methods implemented
- [ ] Prepared statements for SQL injection protection
- [ ] Transaction support for bulk operations
- [ ] Proper error handling with DatabaseError
- [ ] Query performance optimized with indexes

**1.4 Create Audit Service**
- **File**: `server/src/application/services/AuditService.ts` (new file)
- **Responsibilities**:
  - Log audit entries
  - Query audit history
  - Handle retention policy
  - Validate audit data

```typescript
export class AuditService {
  constructor(private auditRepo: AuditRepository) {}

  async logAction(params: {
    userId: string;
    username: string;
    action: string;
    entityType: string;
    entityId?: string;
    details: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void>;

  async getAuditLog(filters: AuditLogFilters): Promise<PaginatedResult<AuditLogEntry>>;
  async getEntityHistory(entityId: string, entityType: string): Promise<AuditLogEntry[]>;
  async getUserActivity(userId: string, options?: QueryOptions): Promise<AuditLogEntry[]>;
  async cleanOldEntries(retentionDays: number): Promise<number>;
}
```

**Acceptance Criteria**:
- [ ] Service properly orchestrates repository calls
- [ ] Validation using Zod schemas
- [ ] Error handling for all operations
- [ ] Logging for service-level operations
- [ ] Unit tests for all methods

**1.5 Create Audit Event Handlers**
- **File**: `server/src/application/eventHandlers/AuditEventHandler.ts` (new file)
- **Action**: Subscribe to domain events and persist audit logs

```typescript
export class AuditEventHandler {
  constructor(
    private auditService: AuditService,
    private eventBus: EventBus
  ) {
    this.subscribeToEvents();
  }

  private subscribeToEvents(): void {
    // Subscribe to all relevant domain events
    this.eventBus.subscribe('TubeCreated', this.handleTubeCreated.bind(this));
    this.eventBus.subscribe('TubeUpdated', this.handleTubeUpdated.bind(this));
    this.eventBus.subscribe('TubeDeleted', this.handleTubeDeleted.bind(this));
    // ... more event subscriptions
  }

  private async handleTubeCreated(event: TubeCreatedEvent): Promise<void>;
  private async handleTubeUpdated(event: TubeUpdatedEvent): Promise<void>;
  private async handleTubeDeleted(event: TubeDeletedEvent): Promise<void>;
}
```

**Acceptance Criteria**:
- [ ] Handler subscribes to all tube events
- [ ] Extracts relevant data from events
- [ ] Calls AuditService.logAction() with proper parameters
- [ ] Error handling doesn't break event processing
- [ ] Handlers are non-blocking (async)

**1.6 Create Audit Controller & Routes**
- **File**: `server/src/presentation/controllers/AuditController.ts` (new file)
- **Endpoints**:
  - `GET /api/admin/audit` - Get audit log with filters
  - `GET /api/admin/audit/entity/:entityType/:entityId` - Get entity history
  - `GET /api/users/me/activity` - Get current user's activity

**File**: `server/src/presentation/routes/AdminRouteModule.ts`
- **Action**: Register audit routes (lines after current admin routes)

**Acceptance Criteria**:
- [ ] All endpoints implemented with proper HTTP verbs
- [ ] Query parameter validation
- [ ] Pagination support
- [ ] Admin-only authorization on /admin/audit routes
- [ ] User can access own activity on /users/me/activity
- [ ] Proper error responses with ErrorMapper

---

### Phase 2: Tube Audit Trail (HIGHEST PRIORITY)

**Priority**: CRITICAL
**Estimated Effort**: 2-3 days
**Goal**: Complete audit history for all tube operations

#### Tasks

**2.1 Wire Up Tube Domain Events**
- **File**: `server/src/application/services/TubeApplicationService.ts`
- **Current State**: Events defined in `TubeEvents.ts` but never published
- **Action**: Publish events after successful operations

**Locations to modify**:
```typescript
// createTube() - Line ~64
const event = new TubeCreatedEvent(tube.id, locationString, sampleData, username);
await this.eventBus.publish(event);

// updateTube() - Line ~223
const event = new TubeUpdatedEvent(tubeId, oldData, newData, username);
await this.eventBus.publish(event);

// deleteTube() - Line ~238
const event = new TubeDeletedEvent(tubeId, locationString, username);
await this.eventBus.publish(event);

// bulkUpdateTubes() - Line ~273
const event = new BulkTubesUpdatedEvent(successfulIds, username, summary);
await this.eventBus.publish(event);
```

**Acceptance Criteria**:
- [ ] All CRUD operations publish corresponding events
- [ ] Events include complete before/after data for updates
- [ ] Bulk operations publish single event with aggregated data
- [ ] Event publishing doesn't block main operation
- [ ] Failures to publish events don't fail the operation (logged as warnings)

**2.2 Implement Tube-Specific Audit Logic**
- **File**: `server/src/application/eventHandlers/AuditEventHandler.ts`
- **Action**: Add detailed tube audit handling

**Tube Created Audit**:
```typescript
{
  action: 'tube_created',
  entityType: 'tube',
  entityId: tube.id,
  details: JSON.stringify({
    location: 'Tank-1/Rack-A/Box-2/Pos-5',
    cellType: 'iPS',
    donorInternalId: 'D001',
    concentration: '1M',
    researcherId: 'researcher-uuid',
    researcherName: 'John Doe',
    media: 'DMEM',
    createdBy: username
  })
}
```

**Tube Updated Audit** (captures field changes):
```typescript
{
  action: 'tube_updated',
  entityType: 'tube',
  entityId: tube.id,
  details: JSON.stringify({
    changes: [
      { field: 'concentration', oldValue: '1M', newValue: '2M' },
      { field: 'notes', oldValue: null, newValue: 'Updated protocol' }
    ],
    location: 'Tank-1/Rack-A/Box-2/Pos-5',
    updatedBy: username
  })
}
```

**Tube Deleted Audit** (captures snapshot before deletion):
```typescript
{
  action: 'tube_deleted',
  entityType: 'tube',
  entityId: tube.id,
  details: JSON.stringify({
    location: 'Tank-1/Rack-A/Box-2/Pos-5',
    snapshot: { /* full tube data before deletion */ },
    deletedBy: username,
    deletedAt: timestamp
  })
}
```

**Acceptance Criteria**:
- [ ] All tube field changes tracked with before/after values
- [ ] Deletions capture complete snapshot for recovery
- [ ] Location changes specially marked
- [ ] Researcher name resolved and included
- [ ] Bulk operations show aggregated summary

**2.3 Add Tube History UI Component**
- **File**: `client/src/domains/tubes/ui/components/TubeHistoryModal.tsx` (new file)
- **Action**: Create modal to display tube's complete history
- **Pattern**: Similar to SessionListSection component

**Features**:
- Timeline view of all changes
- Show who made each change and when
- Highlight field-level changes (before → after)
- Filter by action type (created, updated, deleted)
- Export history to CSV

**Acceptance Criteria**:
- [ ] Displays complete tube lifecycle
- [ ] Relative timestamps (date-fns)
- [ ] User-friendly change descriptions
- [ ] Responsive design (mobile + desktop)
- [ ] Accessible (keyboard navigation, ARIA labels)

**2.4 Add "View History" Button**
- **File**: `client/src/domains/tubes/ui/components/TubeDetailView.tsx`
- **Action**: Add button to open TubeHistoryModal
- **Location**: In tube detail action buttons

**Acceptance Criteria**:
- [ ] Button visible in tube detail view
- [ ] Opens history modal on click
- [ ] Passes tubeId to modal
- [ ] Shows loading state while fetching
- [ ] Handles errors gracefully

**2.5 Create Tube History Hooks**
- **File**: `client/src/domains/tubes/hooks/useTubeHistory.ts` (new file)
- **Action**: React Query hook to fetch tube audit history

```typescript
export function useTubeHistory(tubeId: string) {
  return useQuery({
    queryKey: ['tubes', tubeId, 'history'],
    queryFn: () => tubeService.getTubeHistory(tubeId),
    staleTime: 30 * 1000,
    enabled: !!tubeId
  });
}
```

**Acceptance Criteria**:
- [ ] Hook fetches audit log filtered by tubeId
- [ ] Caching configured appropriately
- [ ] Loading and error states exposed
- [ ] Refetch function exposed for manual refresh

---

### Phase 3: Authentication & User Management Auditing

**Priority**: Medium
**Estimated Effort**: 1-2 days
**Goal**: Track security-critical events

#### Tasks

**3.1 Wire Up User Domain Events**
- **File**: `server/src/application/commands/UserCommands.ts`
- **Current State**: Events ARE being published for user operations
- **Action**: Verify events are comprehensive and add any missing

**Events to verify/add**:
- User registered
- User logged in
- User logged out
- Password changed
- Password reset requested
- User approved/rejected
- Role changed
- User deleted
- Researcher linked/unlinked

**Acceptance Criteria**:
- [ ] All security-critical events covered
- [ ] Events include IP address and user agent
- [ ] Failed login attempts tracked
- [ ] Suspicious activity flagged (multiple failed logins)

**3.2 Add Authentication Audit Handlers**
- **File**: `server/src/application/eventHandlers/AuditEventHandler.ts`
- **Action**: Add handlers for auth events

**Login Success Audit**:
```typescript
{
  action: 'login_success',
  entityType: 'auth',
  entityId: userId,
  details: JSON.stringify({
    username,
    ipAddress,
    userAgent,
    timestamp,
    sessionId
  })
}
```

**Login Failed Audit**:
```typescript
{
  action: 'login_failed',
  entityType: 'auth',
  entityId: attemptedUsername,
  details: JSON.stringify({
    username: attemptedUsername,
    reason: 'Invalid password',
    ipAddress,
    userAgent,
    timestamp
  })
}
```

**Acceptance Criteria**:
- [ ] All auth events logged
- [ ] Failed attempts don't expose sensitive data
- [ ] IP address and device info captured
- [ ] Session lifecycle tracked

**3.3 Create User Activity View**
- **File**: `client/src/domains/authentication/ui/components/tabs/ActivityTab.tsx` (new file)
- **Action**: Add new tab to User Settings Modal
- **Content**: Show user's own activity (tubes created, tubes updated, login history)

**Acceptance Criteria**:
- [ ] Integrated into UserSettingsModal
- [ ] Shows user's recent activity (last 30 days)
- [ ] Filterable by action type
- [ ] Exportable to CSV

---

### Phase 4: Admin Monitoring Dashboard

**Priority**: Low
**Estimated Effort**: 1-2 days
**Goal**: Comprehensive audit viewing and system monitoring for admins

#### Tasks

**4.1 Implement Monitoring Tab (Replace Placeholder)**
- **File**: `client/src/domains/admin/ui/components/tabs/MonitoringTab.tsx`
- **Current State**: Placeholder component (lines 1-81) designed for this purpose
- **Action**: Replace placeholder with full implementation

**Three Sections**:

**Section 1 - Security Overview (Top)**
- Failed login attempts (last 24h)
- Recent critical security events (last 10)
- Active sessions count
- Suspicious activity alerts (multiple failed logins, unusual access patterns)

**Section 2 - Audit Log Viewer (Main)**
- Full filterable audit table
- Filter by user, action, entity type, date range
- Pagination (50 entries per page)
- Export to CSV
- Search functionality
- Expandable rows for detailed event inspection

**Section 3 - System Performance (Bottom)**
- Real-time system metrics
- Database size and growth rate
- Response time metrics
- Last backup timestamp

**Acceptance Criteria**:
- [ ] All three sections implemented
- [ ] Filters functional and performant
- [ ] Pagination works correctly
- [ ] Performance optimized (virtualization for large audit lists)
- [ ] Export includes all filtered results
- [ ] Accessible and responsive
- [ ] Refresh button updates all sections
- [ ] Links between sections (e.g., click failed login count → filter audit log)

**4.2 Add Audit Statistics to System Tab**
- **File**: `client/src/domains/admin/ui/components/tabs/SystemConfigTab.tsx`
- **Current State**: Already has system metrics display
- **Action**: Add audit-related statistics to existing metrics

**New Metrics to Add**:
- Total audit entries
- Entries created today/this week
- Most active users (top 5)
- Most common actions
- Storage used by audit log

**Acceptance Criteria**:
- [ ] Statistics integrate seamlessly with existing metrics
- [ ] Real-time updates on refresh
- [ ] Clear visualizations
- [ ] Click metric → navigate to Monitoring tab with pre-filtered view

---

## Technical Specifications

### Performance Considerations

**Database Indexes**:
- Composite index on (entityType, entityId, timestamp) for entity history queries
- Index on userId for user activity queries
- Index on action for action-type filtering
- Index on timestamp for date range queries

**Query Optimization**:
- Use prepared statements for all queries
- Implement pagination for large result sets
- Add query result caching (5-minute TTL)
- Consider archive strategy for old audit logs (> 1 year)

**Event Processing**:
- Audit event handlers run async (non-blocking)
- Failed audit logging should NOT fail main operation
- Batch insert audit entries for bulk operations

### Data Retention Policy

**Recommended Strategy**:
- Keep all audit logs for 90 days (hot storage)
- Archive 90+ day logs to compressed JSON files
- Keep critical events (deletions, role changes) indefinitely
- Implement automated cleanup job

**Configuration**:
```typescript
// server/src/config/auditConfig.ts
export const AUDIT_CONFIG = {
  retentionDays: 90,
  archiveEnabled: true,
  archivePath: './data/audit-archives',
  criticalActions: ['tube_deleted', 'user_deleted', 'role_changed'],
  cleanupSchedule: '0 2 * * *', // 2 AM daily
};
```

### Security Considerations

**Access Control**:
- Admin-only access to full audit log (`GET /api/admin/audit`)
- Users can view their own activity (`GET /api/users/me/activity`)
- Users can view tube history for tubes they have access to
- No ability to delete or modify audit entries

**Data Protection**:
- Don't log passwords (even hashed)
- Don't log tokens or sensitive credentials
- Sanitize user input in details field
- Rate limit audit log queries to prevent DoS

**Audit Integrity**:
- Audit entries are immutable (no UPDATE operations)
- Use database constraints to enforce data integrity
- Consider cryptographic signatures for critical events (future)

### Error Handling

**Event Publishing Failures**:
```typescript
try {
  await this.eventBus.publish(event);
} catch (error) {
  logger.warn('Failed to publish audit event', {
    eventType: event.eventName(),
    error: error.message
  });
  // Don't throw - main operation should succeed
}
```

**Audit Query Failures**:
- Return empty result set with error flag
- Log error to Winston
- Show user-friendly message in UI

**Database Connection Issues**:
- Implement retry logic (3 attempts)
- Fall back to Winston logging if database unavailable
- Queue audit entries in memory for later persistence

---

## Testing Strategy

### Unit Tests

**Repository Tests**:
- Test all CRUD operations
- Test query filters and pagination
- Test transaction rollback
- Mock database for isolation

**Service Tests**:
- Test audit logging with various input
- Test validation logic
- Test error handling
- Mock repository

**Event Handler Tests**:
- Test event subscription
- Test audit entry creation from events
- Test error handling doesn't break event bus
- Mock AuditService

### Integration Tests

**End-to-End Audit Flow**:
1. Create tube → verify TubeCreatedEvent published
2. Verify audit log entry created in database
3. Query audit log via API → verify entry returned
4. Verify entry shows in admin UI

**Event Bus Integration**:
- Test multiple event handlers running in parallel
- Test event order preservation
- Test failure isolation (one handler fails, others continue)

### Manual Testing Checklist

**Phase 2 - Tube Auditing**:
- [ ] Create tube → history shows creation
- [ ] Update tube fields → history shows changes with before/after
- [ ] Delete tube → history shows deletion with snapshot
- [ ] Bulk update → history shows aggregated changes
- [ ] View tube history in UI → all events displayed correctly
- [ ] Timeline shows correct chronological order

**Phase 3 - Auth Auditing**:
- [ ] Login → history shows successful login
- [ ] Failed login → history shows failure (no password exposed)
- [ ] Logout → history shows logout
- [ ] Password change → history shows change (no passwords exposed)
- [ ] View own activity → only own events shown

**Phase 4 - Admin Dashboard**:
- [ ] Filter by user → correct events shown
- [ ] Filter by action → correct events shown
- [ ] Filter by date range → correct events shown
- [ ] Pagination works correctly
- [ ] Export to CSV → all filtered events exported
- [ ] Statistics accurate and real-time

---

## Migration Strategy

### Database Migration

**Step 1: Add audit_log table**
- Execute in SQLiteContext.initialize()
- Safe for existing databases (IF NOT EXISTS)

**Step 2: Add indexes**
- Execute in SQLiteContext.createIndexes()
- Safe for existing databases (IF NOT EXISTS)

**Step 3: Backfill historical data (optional)**
- Use existing timestamps (createdAt, updatedAt) to create synthetic audit entries
- Mark as 'system_backfill' action type
- Run as one-time script

### Gradual Rollout

**Phase 1 (Week 1)**:
- Deploy foundation infrastructure
- Enable audit logging for tube operations only
- Monitor performance and storage impact
- Fix any issues before expanding

**Phase 2 (Week 2)**:
- Enable auth event auditing
- Enable user management auditing
- Add admin UI

**Phase 3 (Week 3)**:
- Add user-facing activity views
- Enable data retention policy
- Performance optimization

### Rollback Plan

**If Issues Occur**:
1. Disable event handlers (don't subscribe to events)
2. Audit log queries fail gracefully (return empty results)
3. Drop audit_log table if needed (doesn't affect other tables)
4. No data loss for main entities (tubes, users, etc.)

---

## Success Metrics

### Functional Metrics
- [ ] 100% of tube CRUD operations audited
- [ ] 100% of auth events audited
- [ ] All audit queries return results < 100ms (p95)
- [ ] Zero main operation failures due to audit logging

### User Adoption Metrics
- [ ] Admin views audit log weekly
- [ ] Users check tube history when investigating issues
- [ ] Audit log used in at least 3 debugging sessions per month

### Technical Metrics
- [ ] Audit table size < 100MB per 10,000 operations
- [ ] Event processing latency < 10ms (p95)
- [ ] Zero event handler failures
- [ ] Database query performance not degraded

---

## Maintenance Plan

### Regular Tasks
- **Daily**: Monitor audit log size and performance
- **Weekly**: Review suspicious activity (failed logins, unusual patterns)
- **Monthly**: Archive old audit logs (> 90 days)
- **Quarterly**: Audit log integrity check

### Monitoring
- **Alert**: Audit log table size > 1GB
- **Alert**: Audit query latency > 500ms
- **Alert**: Event handler failure rate > 1%
- **Dashboard**: Audit events per day, storage growth rate

---

## Open Questions

1. **Retention Policy**: Should critical events (deletions) be kept indefinitely?
   - *Recommendation*: Yes, deletions and role changes should be permanent

2. **Archive Format**: JSON files or compressed SQLite database?
   - *Recommendation*: Compressed SQLite for queryability

3. **Real-time Updates**: Should admin audit log auto-refresh?
   - *Recommendation*: No, manual refresh sufficient (reduces server load)

4. **Cryptographic Signatures**: Should critical events be signed for integrity?
   - *Recommendation*: Future enhancement, not MVP

5. **User Notifications**: Should users be notified of suspicious activity on their account?
   - *Recommendation*: Phase 5 feature (email alerts for unusual logins)

---

## Appendix A: Action Type Taxonomy

### Tube Actions
- `tube_created`
- `tube_updated`
- `tube_deleted`
- `tube_moved` (location change)
- `tube_bulk_created`
- `tube_bulk_updated`
- `tube_bulk_deleted`

### Authentication Actions
- `login_success`
- `login_failed`
- `logout`
- `session_created`
- `session_revoked`
- `session_expired`

### User Management Actions
- `user_created`
- `user_approved`
- `user_rejected`
- `user_role_changed`
- `user_deleted`
- `password_changed`
- `password_reset_requested`
- `password_reset_completed`

### Researcher Actions
- `researcher_created`
- `researcher_linked`
- `researcher_unlinked`
- `researcher_deleted`

### Configuration Actions
- `security_config_updated`
- `system_config_updated`

### System Actions
- `backup_created`
- `system_started`
- `system_shutdown`
- `audit_archived`

---

## Appendix B: Implementation Checklist

### Phase 1: Foundation
- [ ] 1.1 Database schema created
- [ ] 1.2 Domain interface defined
- [ ] 1.3 SQLite repository implemented
- [ ] 1.4 Audit service created
- [ ] 1.5 Event handlers created
- [ ] 1.6 Controller and routes added
- [ ] Unit tests written
- [ ] Integration tests written
- [ ] Code review completed
- [ ] Deployed to staging

### Phase 2: Tube Auditing
- [ ] 2.1 Tube events wired up
- [ ] 2.2 Tube-specific audit logic implemented
- [ ] 2.3 Tube history UI component created
- [ ] 2.4 "View History" button added
- [ ] 2.5 Tube history hooks created
- [ ] Manual testing completed
- [ ] Code review completed
- [ ] Deployed to staging
- [ ] User acceptance testing
- [ ] Deployed to production

### Phase 3: Auth Auditing
- [ ] 3.1 User events verified/wired
- [ ] 3.2 Auth audit handlers added
- [ ] 3.3 User activity view created
- [ ] Manual testing completed
- [ ] Code review completed
- [ ] Deployed to production

### Phase 4: Admin Monitoring Dashboard
- [ ] 4.1 Monitoring tab fully implemented (replaced placeholder)
- [ ] 4.1.1 Security overview section added
- [ ] 4.1.2 Audit log viewer section added
- [ ] 4.1.3 System performance section added
- [ ] 4.2 Audit statistics added to System tab
- [ ] Manual testing completed
- [ ] Code review completed
- [ ] Deployed to production

### Post-Launch
- [ ] Monitoring configured
- [ ] Data retention policy implemented
- [ ] Documentation updated
- [ ] User training completed

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-04 | Claude | Initial design document |
| 1.1 | 2025-01-04 | Claude | Updated Phase 4: Audit log now in Monitoring tab (not new tab), aligned with original tab design intent |

---

**End of Document**
