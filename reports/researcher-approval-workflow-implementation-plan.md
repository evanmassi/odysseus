# Researcher Approval Workflow Implementation Plan

## Overview

This document outlines the implementation plan for linking researcher approval status to user approval status. The goal is to prevent researchers created during user registration from appearing in the system until the associated user account has been approved by an administrator.

**Problem Statement**: Currently, when a user registers and indicates they are a researcher, the researcher profile is created with `active=true` immediately. This means the researcher appears in active researcher lists even though the user account is still pending approval. This creates a spam vulnerability and data quality issue.

**Solution**: Implement event-driven approval synchronization using a new `approvalStatus` field on the Researcher entity, which automatically syncs with the linked user's approval status.

---

## Environment & Decisions

| Item | Decision |
|------|----------|
| **Database** | PostgreSQL (via Docker for local dev) |
| **Database Reset** | Safe to wipe - all dummy data for testing |
| **Rejected Records** | Auto-delete rejected users and their linked researchers |
| **`active` vs `approvalStatus`** | Option B: Admin can only toggle `active` on approved researchers |
| **Notifications** | Slack (no email service) |

---

## Business Rules: `active` vs `approvalStatus` Interaction

### Rule: `approvalStatus` gates initial visibility, `active` is secondary toggle

| `approvalStatus` | `active` | Visible in Dropdowns? | Admin Can Toggle `active`? |
|------------------|----------|----------------------|---------------------------|
| `pending` | true/false | NO | NO (button disabled) |
| `approved` | true | YES | YES |
| `approved` | false | NO | YES |
| `rejected` | true/false | NO | NO (record will be auto-deleted) |

### Visibility Formula
```typescript
// Researcher appears in user-facing lists only when:
approvalStatus === 'approved' && active === true
```

### UI Behavior
- Pending researchers: Show "Awaiting Approval" badge, deactivate button disabled
- Approved + Active researchers: Normal display, all actions available
- Approved + Inactive researchers: Show "Inactive" badge, can reactivate
- Rejected researchers: Auto-deleted, never shown

---

## Architecture Decision

### Why This Approach?

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| **Reuse `active` field** | No schema changes | Conflates two different concepts; "left the lab" vs "never vetted" are different meanings | Rejected |
| **Query-time filtering** | No schema changes | Performance hit on every query; complex join logic; doesn't work for unlinked researchers | Rejected |
| **New `approvalStatus` field + Events** | Explicit modeling; clean separation; follows existing patterns; scalable | Requires migration | **Selected** |

### Design Principles Applied

1. **Domain-Driven Design**: `approvalStatus` is a first-class domain concept
2. **Event-Driven Architecture**: Leverages existing `UserApprovedEvent` pattern
3. **Single Responsibility**: Each field has one clear meaning
4. **Backward Compatibility**: Existing researchers auto-grandfathered as approved

---

## Implementation Summary

### New Fields on Researcher Entity

| Field | Type | Purpose |
|-------|------|---------|
| `approvalStatus` | `'pending' \| 'approved' \| 'rejected'` | Tracks whether researcher has been vetted |
| `source` | `'registration' \| 'admin'` | Tracks how researcher was created |

### Key Behaviors

| Scenario | `approvalStatus` | `source` |
|----------|------------------|----------|
| User registers as researcher | `pending` | `registration` |
| First user (auto-approved) | `approved` | `registration` |
| Admin creates researcher directly | `approved` | `admin` |
| User gets approved by admin | `pending` → `approved` | unchanged |
| User gets rejected by admin | `pending` → `rejected` | unchanged |

---

## Detailed Implementation Steps

### Phase 1: Domain Layer Changes

#### 1.1 Update Researcher Entity

**File**: `server/src/domain/entities/Researcher.ts`

**Changes**:
- Add `_approvalStatus` private field with type `'pending' | 'approved' | 'rejected'`
- Add `_source` private field with type `'registration' | 'admin'`
- Update constructor to accept new fields
- Update `create()` factory to accept `isUserApproved` and `source` parameters
- Add business methods: `approve()`, `reject()`, `isPending()`, `isApproved()`
- Update `fromData()` and `toData()` for persistence
- Add getters for new fields

**New Factory Signature**:
```typescript
static create(
  personId: string,
  options?: {
    isUserApproved?: boolean;  // default false
    source?: 'registration' | 'admin';  // default 'admin'
  }
): Researcher
```

**Business Rules**:
- `source: 'admin'` → always created with `approvalStatus: 'approved'`
- `source: 'registration'` + `isUserApproved: true` → `approvalStatus: 'approved'`
- `source: 'registration'` + `isUserApproved: false` → `approvalStatus: 'pending'`

#### 1.2 Add New Domain Events

**File**: `server/src/domain/events/ResearcherEvents.ts`

**Add**:
```typescript
export class ResearcherApprovedEvent extends DomainEvent {
  constructor(
    public readonly researcherId: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly linkedUserId: string,
    public readonly approvedBy: string
  ) { super(1); }

  eventName(): string { return 'ResearcherApproved'; }
  getAggregateId(): string { return this.researcherId; }
}

export class ResearcherRejectedEvent extends DomainEvent {
  constructor(
    public readonly researcherId: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly linkedUserId: string,
    public readonly rejectedBy: string
  ) { super(1); }

  eventName(): string { return 'ResearcherRejected'; }
  getAggregateId(): string { return this.researcherId; }
}
```

#### 1.3 Update DomainEventMap

**File**: `server/src/domain/events/DomainEventMap.ts`

**Add**:
```typescript
import { ResearcherApprovedEvent, ResearcherRejectedEvent } from './ResearcherEvents';

// Add to DomainEventMap interface:
'ResearcherApproved': ResearcherApprovedEvent;
'ResearcherRejected': ResearcherRejectedEvent;
```

---

### Phase 2: Infrastructure Layer Changes

#### 2.1 Database Schema Migration

**File**: `server/src/infrastructure/database/schema.sql`

**Add to researchers table**:
```sql
-- Add new columns to researchers table
ALTER TABLE researchers
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved'
    CHECK (approval_status IN ('pending', 'approved', 'rejected'));

ALTER TABLE researchers
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'admin'
    CHECK (source IN ('registration', 'admin'));

-- Add index for filtering by approval status
CREATE INDEX IF NOT EXISTS idx_researchers_approval_status ON researchers(approval_status);
CREATE INDEX IF NOT EXISTS idx_researchers_source ON researchers(source);
```

**Note**: Default values of `'approved'` and `'admin'` ensure existing researchers are grandfathered in as approved admin-created researchers.

#### 2.2 Update SQLite Repository

**File**: `server/src/infrastructure/repositories/ResearcherRepository.ts`

**Changes**:
- Update all SELECT queries to include `approval_status` and `source` columns
- Update INSERT to include new columns
- Update `rowToEntity()` helper to map new columns
- Add new query methods:
  - `findByApprovalStatus(status: string): Promise<Researcher[]>`
  - `findApprovedAndActive(): Promise<Researcher[]>` (combines both filters)
  - `updateApprovalStatus(id: string, status: string): Promise<boolean>`

**Example query update**:
```typescript
// Before
SELECT r.id, r.person_id, r.active, r.created_at FROM researchers r

// After
SELECT r.id, r.person_id, r.active, r.created_at, r.approval_status, r.source FROM researchers r
```

#### 2.3 Update PostgresContext (if using Postgres)

**File**: `server/src/infrastructure/database/PostgresContext.ts`

Apply same schema changes as SQLite.

---

### Phase 3: Application Layer Changes

#### 3.1 Create ResearcherApprovalEventHandler

**New File**: `server/src/application/eventHandlers/ResearcherApprovalEventHandler.ts`

**Purpose**: Listen for `UserApprovedEvent` and `UserRejectedEvent` and sync the linked researcher's approval status.

```typescript
import type { EventBus } from '@application/contracts/EventBus';
import type { ResearcherRepository } from '@domain/repositories/ResearcherRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';
import type { PersonRepository } from '@domain/repositories/PersonRepository';
import { ResearcherApprovedEvent, ResearcherRejectedEvent } from '@domain/events/ResearcherEvents';
import { UserApprovedEvent } from '@domain/events/UserEvents';
import { logger } from '@utils/logger';

export class ResearcherApprovalEventHandler {
  constructor(
    private readonly eventBus: EventBus,
    private readonly researcherRepository: ResearcherRepository,
    private readonly userRepository: UserRepository,
    private readonly personRepository: PersonRepository
  ) {
    this.registerHandlers();
  }

  private registerHandlers(): void {
    this.eventBus.subscribe('UserApproved', (e) => this.handleUserApproved(e));
    // Future: subscribe to UserRejected when that event exists
  }

  private async handleUserApproved(event: UserApprovedEvent): Promise<void> {
    try {
      const user = await this.userRepository.findById(event.userId);
      if (!user?.researcherId) {
        // User has no linked researcher - nothing to do
        return;
      }

      const researcher = await this.researcherRepository.findById(user.researcherId);
      if (!researcher) {
        logger.warn('Linked researcher not found during approval sync', {
          userId: event.userId,
          researcherId: user.researcherId
        });
        return;
      }

      // Only update if researcher was created via registration and is pending
      if (researcher.source === 'registration' && researcher.isPending()) {
        researcher.approve();
        await this.researcherRepository.save(researcher);

        // Get person for event data
        const person = await this.personRepository.findById(researcher.personId);

        await this.eventBus.publish(new ResearcherApprovedEvent(
          researcher.id,
          person?.firstName || 'Unknown',
          person?.lastName || 'Unknown',
          event.userId,
          event.approvedBy
        ));

        logger.info('Researcher approved via user approval cascade', {
          researcherId: researcher.id,
          userId: event.userId,
          approvedBy: event.approvedBy
        });
      }
    } catch (error) {
      logger.error('Failed to sync researcher approval status', {
        userId: event.userId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}
```

#### 3.2 Update UserApplicationService

**File**: `server/src/application/services/UserApplicationService.ts`

**Changes to `registerWithResearcher()` method** (around line 441):

```typescript
// Before
if (createResearcher) {
  researcher = Researcher.create(person.id);
  researcherId = researcher.id;
}

// After
if (createResearcher) {
  researcher = Researcher.create(person.id, {
    isUserApproved: isFirstUser,  // First user is auto-approved
    source: 'registration'
  });
  researcherId = researcher.id;
}
```

#### 3.3 Update ResearcherApplicationService

**File**: `server/src/application/services/ResearcherApplicationService.ts`

**Changes**:

1. **Update `createResearcher()` method** - When admin creates researcher directly:
```typescript
// Researchers created by admin are auto-approved
const researcher = Researcher.create(person.id, {
  isUserApproved: true,  // Admin-created = approved
  source: 'admin'
});
```

2. **Update `getResearchersWithMetadata()` method** - Add approval status to response:
```typescript
// Include approvalStatus in the returned metadata
{
  ...researcher,
  approvalStatus: researcher.approvalStatus,
  source: researcher.source,
  // existing fields...
}
```

3. **Add new method `getApprovedResearchers()`**:
```typescript
async getApprovedResearchers(): Promise<ResearcherDto[]> {
  const researchers = await this.researcherRepository.findApprovedAndActive();
  // ... transform and return
}
```

#### 3.4 Register New Event Handler

**File**: `server/src/infrastructure/di/ServiceContainer.ts`

**Add**:
```typescript
import { ResearcherApprovalEventHandler } from '@application/eventHandlers/ResearcherApprovalEventHandler';

// In initialization section:
private researcherApprovalEventHandler?: ResearcherApprovalEventHandler;

// In getEventBus() or appropriate initialization:
this.researcherApprovalEventHandler = new ResearcherApprovalEventHandler(
  this.eventBus,
  this.repositoryFactory.researcherRepository,
  this.repositoryFactory.userRepository,
  this.repositoryFactory.personRepository
);
```

---

### Phase 4: Repository Interface Changes

#### 4.1 Update ResearcherRepository Interface

**File**: `server/src/domain/repositories/ResearcherRepository.ts`

**Add new methods**:
```typescript
/**
 * Find researchers by approval status
 */
findByApprovalStatus(status: 'pending' | 'approved' | 'rejected'): Promise<Researcher[]>;

/**
 * Find researchers that are both approved AND active
 * This is the default for most user-facing queries
 */
findApprovedAndActive(): Promise<Researcher[]>;

/**
 * Update researcher approval status
 */
updateApprovalStatus(id: string, status: 'pending' | 'approved' | 'rejected'): Promise<boolean>;
```

---

### Phase 5: API/Controller Changes

#### 5.1 Update ResearcherController

**File**: `server/src/presentation/controllers/ResearcherController.ts`

**Changes**:
1. Update `getActiveResearchers()` to use `findApprovedAndActive()` instead of just `findActive()`
2. Add optional query parameter `?includeUnapproved=true` for admin-only access to see all researchers
3. Include `approvalStatus` in researcher responses

#### 5.2 Update API Response DTOs

**File**: `server/src/application/dto/ResearcherDto.ts`

**Add** to response interface:
```typescript
interface ResearcherResponse {
  // existing fields...
  approvalStatus: 'pending' | 'approved' | 'rejected';
  source: 'registration' | 'admin';
}
```

---

### Phase 6: Frontend Changes

#### 6.1 Update Researcher Types

**File**: `packages/shared-schemas/src/researchers/researcherSchemas.ts`

**Add**:
```typescript
export const researcherApprovalStatusSchema = z.enum(['pending', 'approved', 'rejected']);
export const researcherSourceSchema = z.enum(['registration', 'admin']);

// Update researcherSchema to include new fields:
export const researcherSchema = z.object({
  // existing fields...
  approvalStatus: researcherApprovalStatusSchema.default('approved'),
  source: researcherSourceSchema.default('admin'),
});
```

#### 6.2 Update Admin Researchers Tab

**File**: `client/src/domains/researchers/ui/components/ResearchersTab.tsx`

**Changes**:
1. Show approval status badge/indicator next to researchers
2. Filter controls to show/hide pending researchers
3. Visual distinction for pending vs approved researchers

**Example UI**:
```
John Smith          [Active] [Approved]    [Edit] [Deactivate]
Jane Doe            [Active] [Pending]     [Edit] [Deactivate]
                              ↑ Yellow badge indicating pending user approval
```

#### 6.3 Update Researcher Dropdowns

**File**: `client/src/domains/researchers/hooks/useResearchersQuery.ts` (or similar)

**Changes**:
- Default queries should only return `approvalStatus: 'approved'` researchers
- Admin views can opt-in to see all researchers

---

### Phase 7: Event Handler Updates

#### 7.1 Update SocketEventHandler

**File**: `server/src/application/eventHandlers/SocketEventHandler.ts`

**Add handlers** for new events:
```typescript
this.eventBus.subscribe('ResearcherApproved', (e) => this.handleResearcherApproved(e));
this.eventBus.subscribe('ResearcherRejected', (e) => this.handleResearcherRejected(e));

private async handleResearcherApproved(event: ResearcherApprovedEvent): Promise<void> {
  // Emit socket event for real-time UI updates
  this.io.emit('researcher_approved', {
    researcherId: event.researcherId,
    firstName: event.firstName,
    lastName: event.lastName,
    approvedBy: event.approvedBy
  });
}
```

#### 7.2 Update AuditEventHandler

**File**: `server/src/application/eventHandlers/AuditEventHandler.ts`

**Add audit logging** for new events:
```typescript
this.eventBus.subscribe('ResearcherApproved', (e) => this.handleResearcherApproved(e));
this.eventBus.subscribe('ResearcherRejected', (e) => this.handleResearcherRejected(e));

private async handleResearcherApproved(event: ResearcherApprovedEvent): Promise<void> {
  await this.auditService.logAction({
    userId: event.approvedBy,
    username: 'system',
    action: 'RESEARCHER_APPROVED',
    entityType: 'researcher',
    entityId: event.researcherId,
    details: JSON.stringify({
      firstName: event.firstName,
      lastName: event.lastName,
      linkedUserId: event.linkedUserId,
      trigger: 'user_approval_cascade'
    })
  });
}
```

---

## Testing Strategy

### Unit Tests

1. **Researcher Entity Tests**
   - Test `create()` with different `source` and `isUserApproved` combinations
   - Test `approve()` and `reject()` business methods
   - Test state query methods (`isPending()`, `isApproved()`, etc.)

2. **ResearcherApprovalEventHandler Tests**
   - Test handler processes `UserApprovedEvent` correctly
   - Test handler ignores users without linked researchers
   - Test handler ignores admin-created researchers
   - Test error handling when researcher not found

### Integration Tests

1. **Registration Flow**
   - Register user as researcher → verify researcher has `pending` status
   - Approve user → verify researcher status changes to `approved`
   - Verify researcher appears in active lists only after approval

2. **Admin Direct Create Flow**
   - Admin creates researcher → verify `approved` status immediately
   - Verify researcher appears in active lists immediately

### Manual QA Checklist

- [ ] Register new user as researcher - researcher should NOT appear in dropdowns
- [ ] Approve user - researcher should NOW appear in dropdowns
- [ ] Admin creates researcher directly - should appear in dropdowns immediately
- [ ] Reject user - researcher should NOT appear in dropdowns
- [ ] Existing researchers still work (migration backward compatibility)

---

## Migration Strategy

### Database Migration Order

1. Add columns with DEFAULT values (non-breaking)
2. Deploy application code
3. No data migration needed - defaults handle existing data

### Rollback Plan

If issues arise:
1. Application code can be rolled back independently
2. New columns can remain (won't break old code)
3. Column removal can be done later if needed

---

## Files Changed Summary

| Layer | File | Change Type |
|-------|------|-------------|
| Domain | `entities/Researcher.ts` | Modified |
| Domain | `events/ResearcherEvents.ts` | Modified (add 2 events) |
| Domain | `events/DomainEventMap.ts` | Modified |
| Domain | `repositories/ResearcherRepository.ts` | Modified (add methods) |
| Infrastructure | `database/schema.sql` | Modified (add columns) |
| Infrastructure | `repositories/ResearcherRepository.ts` | Modified |
| Infrastructure | `di/ServiceContainer.ts` | Modified |
| Application | `eventHandlers/ResearcherApprovalEventHandler.ts` | **New file** |
| Application | `services/UserApplicationService.ts` | Modified |
| Application | `services/ResearcherApplicationService.ts` | Modified |
| Application | `dto/ResearcherDto.ts` | Modified |
| Application | `eventHandlers/SocketEventHandler.ts` | Modified |
| Application | `eventHandlers/AuditEventHandler.ts` | Modified |
| Presentation | `controllers/ResearcherController.ts` | Modified |
| Shared | `shared-schemas/.../researcherSchemas.ts` | Modified |
| Client | `domains/researchers/...` | Multiple files modified |

---

## Estimated Complexity

| Phase | Complexity | Risk |
|-------|------------|------|
| Phase 1: Domain Layer | Medium | Low - isolated changes |
| Phase 2: Infrastructure | Low | Low - additive schema change |
| Phase 3: Application Layer | Medium | Medium - new event handler |
| Phase 4: Repository Interface | Low | Low - additive methods |
| Phase 5: API/Controller | Low | Low - minor changes |
| Phase 6: Frontend | Medium | Low - UI changes only |
| Phase 7: Event Handlers | Low | Low - follows existing patterns |

**Total Estimated Effort**: Medium complexity, well-contained scope

---

## Success Criteria

1. **Functional**
   - Researchers created via registration are NOT visible until user approved
   - Researchers created by admin ARE visible immediately
   - Approval sync happens automatically via domain events
   - Existing researchers continue to work (backward compatible)

2. **Non-Functional**
   - No performance regression on researcher queries
   - Audit trail captures approval changes
   - Real-time UI updates when approval status changes

3. **Quality**
   - All existing tests pass
   - New unit tests for approval logic
   - No TypeScript errors
   - Build and package succeed

---

## Decisions Made

1. **User Rejection Flow**: Yes - implement `UserRejectedEvent` to prevent orphaned researchers. When a user is rejected, their linked researcher should also be marked as `rejected`.

2. **Pending Users Table Enhancement**: Yes - show in the admin "Pending Users" table that a user has a linked researcher profile that will be approved/rejected together with them.

3. **Email Notifications**: Not applicable - no email delivery service is set up. Notifications are handled via Slack integration.

---

## Additional Implementation: User Rejection Flow

### Phase 8: User Rejection Event

#### 8.1 Add UserRejectedEvent

**File**: `server/src/domain/events/UserEvents.ts`

**Add**:
```typescript
export class UserRejectedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly username: string,
    public readonly rejectedBy: string
  ) {
    super(1);
  }

  eventName(): string { return 'UserRejected'; }
  getAggregateId(): string { return this.userId; }

  protected getEventData(): Record<string, any> {
    return {
      userId: this.userId,
      username: this.username,
      rejectedBy: this.rejectedBy
    };
  }
}
```

#### 8.2 Update DomainEventMap

**File**: `server/src/domain/events/DomainEventMap.ts`

**Add**:
```typescript
'UserRejected': UserRejectedEvent;
```

#### 8.3 Publish Event on User Rejection

**File**: `server/src/application/services/UserApplicationService.ts`

**Update `rejectUser()` method** (around line 598):
```typescript
async rejectUser(userId: string, adminApiKey: string): Promise<void> {
  const admin = await this.getUserByApiKey(adminApiKey);
  this.accessControlService.requireCanManageUsers(admin);

  const user = await this.userRepository.findById(userId);
  if (!user) {
    throw new NotFoundError(`User not found: ${userId}`, { userId });
  }

  user.reject(admin);
  await this.userRepository.save(user);

  // NEW: Publish event for researcher sync
  if (this.eventBus) {
    await this.eventBus.publish(new UserRejectedEvent(
      user.id,
      user.username,
      admin.username
    ));
  }
}
```

#### 8.4 Handle Rejection in ResearcherApprovalEventHandler

**File**: `server/src/application/eventHandlers/ResearcherApprovalEventHandler.ts`

**Add to `registerHandlers()`**:
```typescript
this.eventBus.subscribe('UserRejected', (e) => this.handleUserRejected(e));
```

**Add handler method**:
```typescript
private async handleUserRejected(event: UserRejectedEvent): Promise<void> {
  try {
    const user = await this.userRepository.findById(event.userId);
    if (!user?.researcherId) {
      return; // No linked researcher
    }

    const researcher = await this.researcherRepository.findById(user.researcherId);
    if (!researcher) {
      logger.warn('Linked researcher not found during rejection sync', {
        userId: event.userId,
        researcherId: user.researcherId
      });
      return;
    }

    // Only reject if researcher was created via registration
    if (researcher.source === 'registration' && researcher.isPending()) {
      researcher.reject();
      await this.researcherRepository.save(researcher);

      const person = await this.personRepository.findById(researcher.personId);

      await this.eventBus.publish(new ResearcherRejectedEvent(
        researcher.id,
        person?.firstName || 'Unknown',
        person?.lastName || 'Unknown',
        event.userId,
        event.rejectedBy
      ));

      logger.info('Researcher rejected via user rejection cascade', {
        researcherId: researcher.id,
        userId: event.userId,
        rejectedBy: event.rejectedBy
      });
    }
  } catch (error) {
    logger.error('Failed to sync researcher rejection status', {
      userId: event.userId,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
```

---

## Additional Implementation: Pending Users Table Enhancement

### Phase 9: Admin UI - Linked Researcher Indicator

#### 9.1 Update getPendingUsers API Response

**File**: `server/src/application/services/UserApplicationService.ts`

**Update `getPendingUsers()` method** to include researcher info:
```typescript
async getPendingUsers(adminApiKey: string): Promise<PendingUserResponse[]> {
  const admin = await this.getUserByApiKey(adminApiKey);
  this.accessControlService.requireCanManageUsers(admin);

  const pendingUsers = await this.userRepository.findByStatus('pending');

  // Enrich with researcher info
  const enrichedUsers = await Promise.all(pendingUsers.map(async (user) => {
    const baseResponse = UserDto.toResponse(user);

    if (user.researcherId && this.researcherRepository) {
      const researcher = await this.researcherRepository.findById(user.researcherId);
      const person = researcher ? await this.personRepository?.findById(researcher.personId) : null;

      return {
        ...baseResponse,
        linkedResearcher: researcher ? {
          id: researcher.id,
          name: person ? `${person.firstName} ${person.lastName}` : 'Unknown',
          approvalStatus: researcher.approvalStatus
        } : null
      };
    }

    return { ...baseResponse, linkedResearcher: null };
  }));

  return enrichedUsers;
}
```

#### 9.2 Update Frontend Pending Users Table

**File**: `client/src/domains/authentication/ui/components/UsersTab.tsx` (or similar)

**Add column/indicator** showing linked researcher:

```tsx
// In the pending users table row
{user.linkedResearcher && (
  <div className="flex items-center gap-1 text-sm text-amber-600">
    <UserIcon className="w-4 h-4" />
    <span>
      Will also approve researcher: {user.linkedResearcher.name}
    </span>
  </div>
)}
```

**Tooltip/Info for admins**:
> "Approving this user will also approve their linked researcher profile, making them visible in the researcher dropdown lists."

> "Rejecting this user will also reject their linked researcher profile."

---

## Phase 10: Auto-Delete Rejected Users/Researchers

When a user is rejected, both the user and their linked researcher (if created via registration) should be automatically deleted to prevent database pollution.

### 10.1 Update Rejection Handler to Delete Records

**File**: `server/src/application/eventHandlers/ResearcherApprovalEventHandler.ts`

**CRITICAL: Deletion Order Matters!**

Due to foreign key constraints:
- `users.researcher_id` → references `researchers.id` (ON DELETE SET NULL)
- `researchers.person_id` → references `persons.id` (ON DELETE CASCADE)

**Safe deletion order**:
1. Capture all IDs first (before any deletes)
2. Delete user (FK becomes NULL, breaks no constraints)
3. Delete researcher (CASCADE deletes nothing since person still exists)
4. Delete person last

**Update `handleUserRejected()` with explicit order and error handling**:
```typescript
private async handleUserRejected(event: UserRejectedEvent): Promise<void> {
  // Track what we're about to delete for logging/recovery
  const deletionContext = {
    userId: event.userId,
    username: event.username,
    researcherId: null as string | null,
    personId: null as string | null,
    rejectedBy: event.rejectedBy
  };

  try {
    // STEP 1: Capture all IDs BEFORE any deletions
    const user = await this.userRepository.findById(event.userId);
    if (!user) {
      logger.warn('User already deleted or not found during rejection', { userId: event.userId });
      return;
    }

    let researcher: Researcher | null = null;
    let person: Person | null = null;

    if (user.researcherId) {
      researcher = await this.researcherRepository.findById(user.researcherId);

      if (researcher && researcher.source === 'registration') {
        deletionContext.researcherId = researcher.id;
        deletionContext.personId = researcher.personId;
        person = await this.personRepository.findById(researcher.personId);
      }
    }

    // Log what we're about to delete (audit trail before deletion)
    logger.info('Starting rejection cleanup', deletionContext);

    // STEP 2: Delete user first (FK to researcher becomes NULL)
    try {
      await this.userRepository.delete(event.userId);
      logger.debug('Deleted rejected user', { userId: event.userId });
    } catch (userDeleteError) {
      logger.error('Failed to delete rejected user', {
        userId: event.userId,
        error: userDeleteError instanceof Error ? userDeleteError.message : String(userDeleteError)
      });
      throw userDeleteError; // Can't continue if user delete fails
    }

    // STEP 3: Delete researcher (if exists and was from registration)
    if (researcher && researcher.source === 'registration') {
      try {
        await this.researcherRepository.delete(researcher.id);
        logger.debug('Deleted linked researcher', { researcherId: researcher.id });
      } catch (researcherDeleteError) {
        // Log but continue - user is already deleted
        logger.error('Failed to delete linked researcher (user already deleted)', {
          researcherId: researcher.id,
          error: researcherDeleteError instanceof Error ? researcherDeleteError.message : String(researcherDeleteError)
        });
      }

      // STEP 4: Delete person last
      if (person) {
        try {
          await this.personRepository.delete(person.id);
          logger.debug('Deleted linked person', { personId: person.id });
        } catch (personDeleteError) {
          // Log but continue - user and researcher already deleted
          logger.error('Failed to delete linked person (user/researcher already deleted)', {
            personId: person.id,
            error: personDeleteError instanceof Error ? personDeleteError.message : String(personDeleteError)
          });
        }
      }
    }

    logger.info('Rejection cleanup completed', deletionContext);

  } catch (error) {
    logger.error('Rejection cleanup failed', {
      ...deletionContext,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    // Don't rethrow - event handlers should not crash the system
  }
}
```

### 10.2 Why Not Transactions?

The event handler receives individual repositories, not direct database context access. To maintain clean architecture:
- **Option A**: Add `PostgresContext` to event handler (breaks architecture)
- **Option B**: Create `UserCleanupService` with transaction support (more complex)
- **Option C**: Sequential deletes with proper error handling (pragmatic)

We chose **Option C** because:
1. Deletion order is safe (user deleted first, breaks FK chain)
2. Partial failures are logged for manual cleanup
3. Maintains clean architecture boundaries
4. Risk is low (worst case: orphaned researcher/person records)

### 10.3 Simplify Researcher Entity (No Rejected Status Needed)

Since rejected researchers are auto-deleted, the `approvalStatus` only needs two values:
- `pending` - awaiting user approval
- `approved` - user approved, researcher visible

**Updated type**:
```typescript
type ResearcherApprovalStatus = 'pending' | 'approved';
// 'rejected' not needed - record is deleted
```

### 10.4 Remove ResearcherRejectedEvent (Not Needed)

Since rejected researchers are deleted, we don't need to track rejection events. The audit trail is captured by:
- `UserRejectedEvent` → audit log entry for user rejection
- Deletion events for researcher/person cleanup

---

## Phase 10.5: Server-Side Validation for Business Rules

**CRITICAL**: UI-only validation can be bypassed via direct API calls. We must enforce business rules server-side.

### 10.5.1 Prevent Deactivation of Pending Researchers

**File**: `server/src/application/services/ResearcherApplicationService.ts`

**Update `deactivateResearcher()` method**:
```typescript
async deactivateResearcher(researcherId: string, userApiKey: string): Promise<ResearcherResponse> {
  const user = await this.getUserByApiKey(userApiKey);
  await this.accessControlService.requireCanManageResearchers(user);

  const researcher = await this.researcherRepository.findById(researcherId);
  if (!researcher) {
    throw new NotFoundError(`Researcher not found: ${researcherId}`);
  }

  // NEW: Enforce business rule - cannot deactivate pending researchers
  if (researcher.isPending()) {
    throw new ValidationError(
      'Cannot deactivate a researcher that is pending approval. ' +
      'The researcher will become active once their linked user account is approved.'
    );
  }

  researcher.deactivate();
  await this.researcherRepository.save(researcher);

  // ... rest of method
}
```

### 10.5.2 Prevent Activation of Pending Researchers

**File**: `server/src/application/services/ResearcherApplicationService.ts`

**Update `activateResearcher()` method**:
```typescript
async activateResearcher(researcherId: string, userApiKey: string): Promise<ResearcherResponse> {
  const user = await this.getUserByApiKey(userApiKey);
  await this.accessControlService.requireCanManageResearchers(user);

  const researcher = await this.researcherRepository.findById(researcherId);
  if (!researcher) {
    throw new NotFoundError(`Researcher not found: ${researcherId}`);
  }

  // NEW: Enforce business rule - cannot manually activate pending researchers
  if (researcher.isPending()) {
    throw new ValidationError(
      'Cannot manually activate a researcher that is pending approval. ' +
      'The researcher will be activated automatically when their linked user account is approved.'
    );
  }

  researcher.activate();
  await this.researcherRepository.save(researcher);

  // ... rest of method
}
```

### 10.5.3 Prevent Toggling Active via Update Endpoint

**File**: `server/src/application/services/ResearcherApplicationService.ts`

**Update `updateResearcher()` method**:
```typescript
async updateResearcher(
  researcherId: string,
  updates: UpdateResearcherRequest,
  userApiKey: string
): Promise<ResearcherResponse> {
  // ... existing validation ...

  const researcher = await this.researcherRepository.findById(researcherId);
  if (!researcher) {
    throw new NotFoundError(`Researcher not found: ${researcherId}`);
  }

  // NEW: If trying to change active status, enforce approval rule
  if (updates.active !== undefined && researcher.isPending()) {
    throw new ValidationError(
      'Cannot change active status of a researcher that is pending approval.'
    );
  }

  // ... rest of method
}
```

### 10.5.4 Add `isPending()` Method to Researcher Entity

**File**: `server/src/domain/entities/Researcher.ts`

```typescript
/**
 * Check if researcher is pending approval
 */
isPending(): boolean {
  return this._approvalStatus === 'pending';
}

/**
 * Check if researcher is approved
 */
isApproved(): boolean {
  return this._approvalStatus === 'approved';
}
```

---

## Phase 11: Shared Schemas Rebuild

**CRITICAL**: After modifying `packages/shared-schemas`, rebuild before client/server can use new types.

### 11.1 Build Command

```bash
cd packages/shared-schemas && npm run build
```

### 11.2 Verify Build

```bash
# Check that dist/ contains updated types
dir packages\shared-schemas\dist
```

### 11.3 Restart Dev Servers

After rebuild, restart both client and server to pick up new types:
```bash
# In root directory
npm run dev
```

---

## Phase 12: API Method Updates

### 12.1 Key API Change: `getAllResearchers()` Now Filters

**File**: `server/src/application/services/ResearcherApplicationService.ts`

**Before** (returns ALL researchers):
```typescript
async getAllResearchers(userApiKey?: string): Promise<ResearcherResponse[]> {
  const researchers = await this.researcherRepository.findAll();
  // ...returns all
}
```

**After** (returns only approved + active):
```typescript
async getAllResearchers(userApiKey?: string): Promise<ResearcherResponse[]> {
  // User-facing: only approved AND active researchers
  const researchers = await this.researcherRepository.findApprovedAndActive();
  // ...returns filtered
}
```

### 12.2 Admin Endpoint Unchanged

`getResearchersWithMetadata()` still returns ALL researchers for management UI:
```typescript
async getResearchersWithMetadata(userApiKey: string): Promise<AdminResearcherResponse[]> {
  // Admin: see all researchers regardless of status
  const researchers = await this.researcherRepository.findAll();
  // ...includes approvalStatus in response for UI badges
}
```

### 12.3 Frontend Query Impact

**File**: `client/src/domains/researchers/hooks/useResearchersQuery.ts`

The `useActiveResearchersQuery` hook currently does client-side filtering:
```typescript
select: researchers => researchers.filter(r => r.active !== false)
```

**After server-side filtering**, this becomes redundant but harmless. We can simplify:
```typescript
// Server already returns only approved+active, no client filter needed
select: researchers => researchers
```

Or keep as defense-in-depth.

---

## Updated Files Summary

| Layer | File | Change Type |
|-------|------|-------------|
| Domain | `entities/Researcher.ts` | Modified (add fields + isPending/isApproved methods) |
| Domain | `events/ResearcherEvents.ts` | Modified (add ResearcherApprovedEvent only) |
| Domain | `events/UserEvents.ts` | Modified (add UserRejectedEvent) |
| Domain | `events/DomainEventMap.ts` | Modified (add 2 events) |
| Domain | `repositories/ResearcherRepository.ts` | Modified (add methods) |
| Infrastructure | `database/schema.sql` | Modified (add columns) |
| Infrastructure | `repositories/ResearcherRepository.ts` | Modified |
| Infrastructure | `di/ServiceContainer.ts` | Modified |
| Application | `eventHandlers/ResearcherApprovalEventHandler.ts` | **New file** |
| Application | `services/UserApplicationService.ts` | Modified (rejection event + enriched pending users) |
| Application | `services/ResearcherApplicationService.ts` | Modified (filtered queries + validation) |
| Application | `dto/ResearcherDto.ts` | Modified |
| Application | `eventHandlers/SocketEventHandler.ts` | Modified |
| Application | `eventHandlers/AuditEventHandler.ts` | Modified |
| Presentation | `controllers/ResearcherController.ts` | Modified |
| Shared | `shared-schemas/.../researcherSchemas.ts` | Modified + **rebuild required** |
| Client | `domains/authentication/ui/components/UsersTab.tsx` | Modified (linked researcher indicator) |
| Client | `domains/researchers/hooks/useResearchersQuery.ts` | Modified (optional) |
| Client | `domains/researchers/...` | Multiple files modified |

---

## Updated Testing Checklist

### Manual QA Checklist

- [ ] Register new user as researcher - researcher should NOT appear in dropdowns
- [ ] Approve user - researcher should NOW appear in dropdowns
- [ ] Reject user - user AND researcher AND person records should be DELETED
- [ ] Verify rejected records don't exist in database after rejection
- [ ] Admin creates researcher directly - should appear in dropdowns immediately
- [ ] Existing researchers still work (migration backward compatibility)
- [ ] Pending users table shows "Will also approve researcher: [Name]" indicator
- [ ] Try to deactivate a pending researcher via UI - button should be disabled
- [ ] Deactivate an approved researcher - should work normally
- [ ] Shared-schemas builds successfully after changes
- [ ] Server and client start without type errors

### API Bypass Protection Tests (Server-Side Validation)

Test these via curl/Postman to ensure server-side validation works:

```bash
# Test 1: Try to deactivate a pending researcher via API
# Should return 400 ValidationError
curl -X PUT http://localhost:3001/api/researchers/{pending-researcher-id} \
  -H "Authorization: Bearer {admin-token}" \
  -H "Content-Type: application/json" \
  -d '{"active": false}'

# Expected: 400 - "Cannot deactivate a researcher that is pending approval"

# Test 2: Try to activate a pending researcher via API
curl -X PUT http://localhost:3001/api/researchers/{pending-researcher-id} \
  -H "Authorization: Bearer {admin-token}" \
  -H "Content-Type: application/json" \
  -d '{"active": true}'

# Expected: 400 - "Cannot change active status of a researcher that is pending approval"
```

### Database Verification (After Testing)

```sql
-- Check no rejected records remain
SELECT * FROM users WHERE status = 'rejected';  -- Should be empty
SELECT * FROM researchers WHERE approval_status = 'rejected';  -- Should be empty

-- Check pending researchers exist for pending users
SELECT u.username, r.approval_status
FROM users u
LEFT JOIN researchers r ON u.researcher_id = r.id
WHERE u.status = 'pending';

-- Check approved flow
SELECT u.username, r.approval_status, r.active
FROM users u
LEFT JOIN researchers r ON u.researcher_id = r.id
WHERE u.status = 'approved' AND r.source = 'registration';
```

---

## Implementation Order

Recommended order to minimize breaking changes:

1. **Phase 1**: Domain entity changes (Researcher.ts) - foundation
2. **Phase 2**: Database schema (add columns) - can be done independently
3. **Phase 8**: Add UserRejectedEvent - no dependencies
4. **Phase 3**: Create ResearcherApprovalEventHandler - depends on Phase 1
5. **Phase 10**: Auto-delete logic - extends Phase 3
6. **Phase 10.5**: Server-side validation (deactivation rules) - depends on Phase 1
7. **Phase 4**: Repository interface + implementation - depends on Phase 1
8. **Phase 6**: Shared-schemas update
9. **Phase 11**: Rebuild shared-schemas
10. **Phase 12**: Update ResearcherApplicationService queries
11. **Phase 5**: Controller changes
12. **Phase 7**: Socket/Audit event handlers
13. **Phase 9**: Frontend UI changes - depends on schema types

---

*Document created: 2026-01-14*
*Updated: 2026-01-14*
- Added rejection flow with auto-delete
- Added pending users UI enhancement
- Removed email notification (using Slack)
- Clarified active vs approvalStatus business rules
- Added shared-schemas rebuild step
- Added API method update details
- Confirmed PostgreSQL environment
- **Added explicit deletion order with FK-safe sequence**
- **Added server-side validation for deactivation business rules**
- **Added API bypass protection tests**
- **Documented transaction decision (sequential with error handling)**

*Status: Ready for implementation*
