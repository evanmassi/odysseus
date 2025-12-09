# Resource Locking System - Final Implementation Plan

**Date:** 2025-01-XX
**Status:** Ready for Implementation
**Complexity:** Medium (3-5 days)
**Priority:** High
**Prerequisite:** Resource Assignment System (completed)
**Investigation Status:** COMPLETE - Full codebase analysis performed

---

## Executive Summary

This document outlines the **verified and specific** implementation plan for a tube-level locking system. All file paths, patterns, and integration points have been verified against the actual codebase.

### Core Principle

**Assignment protects the container. Locking protects the contents.**

---

## Investigation Summary

### Existing Patterns We Will Leverage

| Pattern | Location | How We'll Use It |
|---------|----------|------------------|
| Container Lookup | `Configuration.getBox()` | Get box/rack info for permission checks |
| User Lookup | `useUserLookupQuery`, `UserDisplayInfo` | Resolve userId to display name for lock owner |
| Resource Permissions | `useResourcePermissions.ts` | Pattern for client-side access checks |
| Audit Trail | `AuditService.ts`, `AuditEventHandler.ts` | Already complete - add new action handlers |
| Socket.IO Events | `SocketEventHandler.ts`, `queryBridge.ts` | Pattern for real-time sync |
| Domain Events | `TubeEvents.ts` | Add new lock events following same pattern |
| Access Control | `AccessControlService.ts` | Extend with lock check methods |
| Context Menu | `ContextMenu.tsx` | Add Lock/Unlock/Share actions |
| Keyboard Shortcuts | `useGridKeyboardNavigation.ts` | Add Shift+L (no conflicts found) |
| Mutation Hooks | `useTubeMutations.ts` | Pattern for new lock mutations |
| Modal System | `modalStore.ts`, `BaseModal.tsx` | Pattern for LockTubesModal |
| Notifications | `notifications.ts` | Use existing `notifications.update()` for lock/unlock messages |
| Change Detection | `ConfigurationChangeDetector.ts` | Extend to detect `sharedWithUserIds` changes |

### Database Approach

**Fresh Start:** User will delete the existing SQLite database. No migration needed - lock columns will be part of the tubes table from initial creation.

---

## Complete File Change List

### Phase 1: Schema & Database

#### Files to CREATE

| File | Purpose |
|------|---------|
| `packages/shared-schemas/src/tubes/tubeLockSchemas.ts` | Lock request/response schemas |

#### Files to EDIT

| File | Changes |
|------|---------|
| `packages/shared-schemas/src/tubes/tubeSchemas.ts` | Add `isLocked`, `lockedBy`, `lockNote`, `lockedAt`, `sharedWithUserIds` to `tubeDataSchema` |
| `packages/shared-schemas/src/storage/configurationSchemas.ts` | Add `sharedWithUserIds` to `BoxConfigurationSchema` and `RackConfigurationSchema` |
| `packages/shared-schemas/src/index.ts` | Export new lock schemas |
| `server/src/infrastructure/database/SQLiteContext.ts` | Add lock columns to tubes table creation SQL |

---

### Phase 2: Domain Layer (Server)

#### Files to CREATE

| File | Purpose |
|------|---------|
| `server/src/domain/events/TubeLockEvents.ts` | `TubeLockChangedEvent`, `TubeAccessSharedEvent`, `TubeAccessRevokedEvent` |

#### Files to EDIT

| File | Changes |
|------|---------|
| `server/src/domain/entities/Tube.ts` | Add lock fields, `lock()`, `unlock()`, `shareWith()`, `revokeAccess()`, `canBeAccessedBy()` methods |
| `server/src/domain/services/AccessControlService.ts` | Add `canLockTube()`, `canUnlockTube()` methods, update `canEditTube()` to check lock |
| `server/src/domain/types/services/AccessControl.ts` | Add `BatchLockResult`, `BatchUnlockResult` interfaces |
| `server/src/domain/events/index.ts` | Export new lock events |
| `server/src/domain/services/ConfigurationChangeDetector.ts` | Add detection for `sharedWithUserIds` changes on racks/boxes |

---

### Phase 3: Infrastructure Layer (Server)

#### Files to EDIT

| File | Changes |
|------|---------|
| `server/src/infrastructure/database/mappers/TubeMapper.ts` | Handle `isLocked`, `lockedBy`, `lockNote`, `lockedAt`, `sharedWithUserIds` (JSON array) |
| `server/src/infrastructure/repositories/SQLiteTubeRepository.ts` | Map lock fields in queries/inserts |
| `server/src/infrastructure/di/ServiceContainer.ts` | Register `TubeLockController` and wire dependencies |

---

### Phase 4: Application Layer (Server)

#### Files to CREATE

| File | Purpose |
|------|---------|
| `server/src/application/dto/TubeLockDto.ts` | `BatchLockResult`, `BatchUnlockResult` types |

#### Files to EDIT

| File | Changes |
|------|---------|
| `server/src/application/services/TubeApplicationService.ts` | Add `lockTubes()`, `unlockTubes()`, `shareTubeAccess()`, `revokeTubeAccess()`. Update `updateTube()`, `deleteTube()` with lock checks. Use existing `Configuration.getBox()` for container lookup. |
| `server/src/application/eventHandlers/SocketEventHandler.ts` | Subscribe to `TubeLockChanged`, `TubeAccessShared`, `TubeAccessRevoked` events and emit Socket.IO messages |
| `server/src/application/eventHandlers/AuditEventHandler.ts` | Add handlers for lock audit actions |

---

### Phase 5: Presentation Layer (Server)

#### Files to CREATE

| File | Purpose |
|------|---------|
| `server/src/presentation/controllers/TubeLockController.ts` | Handle lock/unlock/share/revoke HTTP requests |

#### Files to EDIT

| File | Changes |
|------|---------|
| `server/src/presentation/routes/ResourceRouteModule.ts` | Add lock routes, inject TubeLockController |
| `server/src/middleware/Validation.ts` | Add validation schemas for lock requests |

---

### Phase 6: Frontend - Services & Hooks

#### Files to CREATE

| File | Purpose |
|------|---------|
| `client/src/domains/tubes/hooks/useTubeLockMutations.ts` | `useLockTubesMutation`, `useUnlockTubesMutation`, `useShareTubeAccessMutation`, `useRevokeTubeAccessMutation` |
| `client/src/domains/tubes/hooks/useTubeAccessControl.ts` | `canLockTube()`, `canUnlockTube()`, `isLockedOutFrom()` utility hook |

#### Files to EDIT

| File | Changes |
|------|---------|
| `client/src/domains/tubes/services/TubeService.ts` | Add `lockTubes()`, `unlockTubes()`, `shareTubeAccess()`, `revokeTubeAccess()` static methods |
| `client/src/domains/tubes/hooks/index.ts` | Export new hooks |
| `client/src/infrastructure/socket/queryBridge.ts` | Add `tube_lock_changed`, `tube_access_shared`, `tube_access_revoked` event handlers |

---

### Phase 7: Frontend - UI Components

#### Files to CREATE

| File | Purpose |
|------|---------|
| `client/src/domains/tubes/ui/components/LockIndicator.tsx` | Red lock icon for locked-out tubes |
| `client/src/domains/tubes/ui/components/modals/LockTubesModal.tsx` | Modal for adding lock notes |
| `client/src/shared/ui/components/ShareAccessModal.tsx` | Universal share modal for tubes and containers |

#### Files to EDIT

| File | Changes |
|------|---------|
| `client/src/shared/ui/primitives/shared/ContextMenu.tsx` | Add Lock/Unlock/Share Access actions |
| `client/src/app/hooks/grid/useGridKeyboardNavigation.ts` | Add `Shift+L` (lock all selected), `Shift+S` (share access) |
| `client/src/app/hooks/grid/useGridController.ts` | Add `lockAll()`, `unlockOwned()`, `shareAccess()` to controller.actions |
| `client/src/domains/tubes/ui/components/grid/TubeGrid.tsx` | Pass lock actions to ContextMenu |
| `client/src/domains/tubes/ui/components/grid/GridPosition.tsx` | Render `LockIndicator`, apply dimming for locked-out tubes |
| `client/src/domains/tubes/ui/components/TubeInfoPanel.tsx` | Show lock details section |
| `client/src/domains/tubes/ui/components/modals/TubeEditorModal.tsx` | Show read-only warning for locked-out tubes |
| `client/src/domains/storage/ui/components/modals/BoxRow.tsx` | Add Share button for assigned boxes |
| `client/src/domains/storage/ui/components/modals/RackRow.tsx` | Add Share button for assigned racks |
| `client/src/app/stores/modalStore.ts` | Add `lockTubesModal` and `shareAccessModal` state |
| `client/src/app/components/layout/Dashboard.tsx` | Render `LockTubesModal` and `ShareAccessModal` |
| `client/src/shared/utils/notifications.ts` | Add `lock()` notification method (uses existing color scheme) |

---

## Detailed Implementation Specifications

### Schema Changes (packages/shared-schemas)

#### tubeSchemas.ts - Add Fields

```typescript
// Add to tubeDataSchema:
isLocked: z.boolean().default(false),
lockedBy: z.string().optional(),           // userId who locked it
lockNote: z.string().max(100).optional(),  // "Project X - Donor 123"
lockedAt: z.string().datetime().optional(), // ISO timestamp
sharedWithUserIds: z.array(z.string()).optional().default([]),
```

#### tubeLockSchemas.ts - NEW FILE

```typescript
import { z } from 'zod';

export const lockTubesRequestSchema = z.object({
  tubeIds: z.array(z.string()).min(1).max(100),
  lockNote: z.string().max(100).optional(),
});

export const unlockTubesRequestSchema = z.object({
  tubeIds: z.array(z.string()).min(1).max(100),
});

export const shareTubeAccessRequestSchema = z.object({
  tubeIds: z.array(z.string()).min(1),
  userIds: z.array(z.string()).min(1),
});

export const revokeTubeAccessRequestSchema = z.object({
  tubeIds: z.array(z.string()).min(1),
  userIds: z.array(z.string()).min(1),
});

// Response types
export const batchLockResultSchema = z.object({
  locked: z.array(z.string()),  // tubeIds that were locked
  skipped: z.array(z.object({
    tubeId: z.string(),
    reason: z.string(),
  })),
});

export const batchUnlockResultSchema = z.object({
  unlocked: z.array(z.string()),  // tubeIds that were unlocked
  skipped: z.array(z.object({
    tubeId: z.string(),
    reason: z.string(),
  })),
});

export type LockTubesRequest = z.infer<typeof lockTubesRequestSchema>;
export type UnlockTubesRequest = z.infer<typeof unlockTubesRequestSchema>;
export type ShareTubeAccessRequest = z.infer<typeof shareTubeAccessRequestSchema>;
export type RevokeTubeAccessRequest = z.infer<typeof revokeTubeAccessRequestSchema>;
export type BatchLockResult = z.infer<typeof batchLockResultSchema>;
export type BatchUnlockResult = z.infer<typeof batchUnlockResultSchema>;
```

#### configurationSchemas.ts - Add sharedWithUserIds

```typescript
// Add to BoxConfigurationSchema and RackConfigurationSchema:
sharedWithUserIds: z.array(z.string()).optional().default([]),
```

---

### Database Changes (SQLiteContext.ts)

Add to tubes table creation:

```sql
-- In CREATE TABLE tubes:
isLocked INTEGER DEFAULT 0,
lockedBy TEXT,
lockNote TEXT,
lockedAt TEXT,
sharedWithUserIds TEXT,  -- JSON array: '["user1","user2"]'

-- Add indexes after table creation:
CREATE INDEX idx_tubes_locked ON tubes(isLocked);
CREATE INDEX idx_tubes_lockedBy ON tubes(lockedBy);
```

---

### Domain Entity Updates (Tube.ts)

Add private fields:

```typescript
private _isLocked: boolean = false;
private _lockedBy?: string;
private _lockNote?: string;
private _lockedAt?: Date;
private _sharedWithUserIds: string[] = [];
```

Add methods:

```typescript
// Locking
lock(userId: string, note?: string): Tube {
  if (this._isLocked) {
    throw new DomainError('Tube is already locked');
  }
  return Tube.fromData({
    ...this.toData(),
    isLocked: true,
    lockedBy: userId,
    lockNote: note,
    lockedAt: new Date().toISOString(),
  });
}

unlock(): Tube {
  if (!this._isLocked) {
    throw new DomainError('Tube is not locked');
  }
  return Tube.fromData({
    ...this.toData(),
    isLocked: false,
    lockedBy: undefined,
    lockNote: undefined,
    lockedAt: undefined,
    sharedWithUserIds: [], // Auto-clear shared access
  });
}

shareWith(userIds: string[]): Tube {
  const newSharedIds = [...new Set([...this._sharedWithUserIds, ...userIds])];
  return Tube.fromData({
    ...this.toData(),
    sharedWithUserIds: newSharedIds,
  });
}

revokeAccess(userIds: string[]): Tube {
  const newSharedIds = this._sharedWithUserIds.filter(id => !userIds.includes(id));
  return Tube.fromData({
    ...this.toData(),
    sharedWithUserIds: newSharedIds,
  });
}

// Query methods
get isLocked(): boolean { return this._isLocked; }
get lockedBy(): string | undefined { return this._lockedBy; }
get lockNote(): string | undefined { return this._lockNote; }
get lockedAt(): Date | undefined { return this._lockedAt; }
get sharedWithUserIds(): readonly string[] { return [...this._sharedWithUserIds]; }

isLockedBy(userId: string): boolean {
  return this._isLocked && this._lockedBy === userId;
}

canBeAccessedBy(userId: string): boolean {
  if (!this._isLocked) return true;
  if (this._lockedBy === userId) return true;
  if (this._sharedWithUserIds.includes(userId)) return true;
  return false;
}
```

Update `toData()` and `fromData()` to include lock fields.

---

### Container Lookup for Permission Checks

**Existing method to use:** `Configuration.getBox(tankId, rackId, boxId)`

This method already exists at `server/src/domain/entities/Configuration.ts:830` and returns:
```typescript
{ box: BoxData, rack: RackData, tank: TankData } | null
```

**Usage in TubeApplicationService:**

```typescript
private async getContainerForTube(tube: Tube): Promise<{ box: BoxData; rack: RackData } | null> {
  const config = await this.configurationRepository.getCurrent();
  if (!config) return null;

  const result = config.getBox(
    tube.location.tankId,
    tube.location.rackId,
    tube.location.boxId
  );

  return result ? { box: result.box, rack: result.rack } : null;
}
```

The `box` and `rack` objects contain `assignedUserId` and `sharedWithUserIds` fields for permission checking.

---

### AccessControlService Updates

Add these methods to `server/src/domain/services/AccessControlService.ts`:

```typescript
// Check if user can lock a tube
canLockTube(user: User, tube: Tube, container?: { assignedUserId?: string | null }): AccessResult {
  if (user.isAdmin()) {
    return { allowed: true, reason: 'Admin access' };
  }

  if (tube.isLocked) {
    return { allowed: false, reason: 'Tube is already locked' };
  }

  // In user's own assigned space
  if (container?.assignedUserId === user.id) {
    return { allowed: true, reason: 'User owns container' };
  }

  // In common/unassigned space (null or undefined)
  if (!container?.assignedUserId) {
    return { allowed: true, reason: 'Common space' };
  }

  // In another user's space
  return { allowed: false, reason: `Cannot lock tubes in another user's assigned space` };
}

// Check if user can unlock a tube
canUnlockTube(user: User, tube: Tube): AccessResult {
  if (user.isAdmin()) {
    return { allowed: true, reason: 'Admin access' };
  }

  if (!tube.isLocked) {
    return { allowed: false, reason: 'Tube is not locked' };
  }

  if (tube.isLockedBy(user.id)) {
    return { allowed: true, reason: 'User owns lock' };
  }

  return { allowed: false, reason: 'Only the lock owner or an admin can unlock this tube' };
}

// Update existing canEditTube to check lock status
canEditTube(user: User, tube: Tube, container?: { assignedUserId?: string | null; sharedWithUserIds?: string[] }): AccessResult {
  if (user.isAdmin()) {
    return { allowed: true, reason: 'Admin access' };
  }

  // Check tube-level lock first
  if (tube.isLocked && !tube.canBeAccessedBy(user.id)) {
    return { allowed: false, reason: 'Tube is locked by another user' };
  }

  // Check container-level protection (existing logic)
  if (container?.assignedUserId) {
    const hasContainerAccess =
      container.assignedUserId === user.id ||
      container.sharedWithUserIds?.includes(user.id);

    if (!hasContainerAccess) {
      return { allowed: false, reason: `Tube is in another user's assigned space` };
    }
  }

  return { allowed: true, reason: 'Access granted' };
}
```

---

### ConfigurationChangeDetector Updates

Add detection for `sharedWithUserIds` changes in `detectRackChanges()` and `detectBoxChanges()`:

```typescript
// In detectRackChanges() - add after existing field checks:
const oldShared = oldRack.sharedWithUserIds ?? [];
const newShared = newRack.sharedWithUserIds ?? [];
if (JSON.stringify(oldShared.sort()) !== JSON.stringify(newShared.sort())) {
  // Determine if sharing or revoking
  const added = newShared.filter(id => !oldShared.includes(id));
  const removed = oldShared.filter(id => !newShared.includes(id));

  if (added.length > 0) {
    events.push(new RackAccessSharedEvent(userId, tankId, rackId, added));
  }
  if (removed.length > 0) {
    events.push(new RackAccessRevokedEvent(userId, tankId, rackId, removed));
  }
}

// Same pattern for detectBoxChanges()
```

**Note:** Need to create `RackAccessSharedEvent`, `RackAccessRevokedEvent`, `BoxAccessSharedEvent`, `BoxAccessRevokedEvent` in `ConfigurationEvents.ts`.

---

### ServiceContainer Updates

Add to `server/src/infrastructure/di/ServiceContainer.ts`:

```typescript
// Add private field
private tubeLockController?: TubeLockController;

// Add getter method
getTubeLockController(): TubeLockController {
  if (!this.tubeLockController) {
    this.tubeLockController = new TubeLockController(
      this.getTubeApplicationService()
    );
  }
  return this.tubeLockController;
}
```

Update `ResourceRouteModule` constructor to accept `TubeLockController`.

---

### Domain Events (TubeLockEvents.ts) - NEW FILE

```typescript
import { DomainEvent } from '@domain/events/DomainEvent';

export class TubeLockChangedEvent extends DomainEvent {
  constructor(
    public readonly tubeId: string,
    public readonly isLocked: boolean,
    public readonly lockedBy: string | undefined,
    public readonly lockNote: string | undefined,
    public readonly userId: string
  ) {
    super(1);
  }

  eventName(): string {
    return 'TubeLockChanged';
  }

  getAggregateId(): string {
    return this.tubeId;
  }

  protected getEventData(): Record<string, any> {
    return {
      tubeId: this.tubeId,
      isLocked: this.isLocked,
      lockedBy: this.lockedBy,
      lockNote: this.lockNote,
      userId: this.userId
    };
  }
}

export class TubeAccessSharedEvent extends DomainEvent {
  constructor(
    public readonly tubeIds: string[],
    public readonly sharedWithUserIds: string[],
    public readonly sharedBy: string
  ) {
    super(1);
  }

  eventName(): string {
    return 'TubeAccessShared';
  }

  getAggregateId(): string {
    return this.tubeIds.join(',');
  }

  protected getEventData(): Record<string, any> {
    return {
      tubeIds: this.tubeIds,
      sharedWithUserIds: this.sharedWithUserIds,
      sharedBy: this.sharedBy
    };
  }
}

export class TubeAccessRevokedEvent extends DomainEvent {
  constructor(
    public readonly tubeIds: string[],
    public readonly revokedUserIds: string[],
    public readonly revokedBy: string
  ) {
    super(1);
  }

  eventName(): string {
    return 'TubeAccessRevoked';
  }

  getAggregateId(): string {
    return this.tubeIds.join(',');
  }

  protected getEventData(): Record<string, any> {
    return {
      tubeIds: this.tubeIds,
      revokedUserIds: this.revokedUserIds,
      revokedBy: this.revokedBy
    };
  }
}
```

---

### Keyboard Shortcut Behavior: Shift+L

**Verified:** No conflicts with existing shortcuts. Only `Shift+Arrow` is used for range selection.

**Toggle Lock Behavior:**

```typescript
// In useGridController.ts
const lockAll = useCallback(async () => {
  const selectedTubes = getSelectedTubes();
  if (selectedTubes.length === 0) return;

  // Filter to only tubes that CAN be locked (unlocked + user has permission)
  const lockableTubes = selectedTubes.filter(t =>
    !t.isLocked && canLockTube(t)
  );

  if (lockableTubes.length === 0) {
    notifications.warning('No tubes can be locked');
    return;
  }

  // Open lock modal to get optional note
  modalService.showLockTubesModal({
    tubeIds: lockableTubes.map(t => t.id),
  });
}, [getSelectedTubes, canLockTube]);

const unlockOwned = useCallback(async () => {
  const selectedTubes = getSelectedTubes();
  if (selectedTubes.length === 0) return;

  // Filter to only tubes user owns locks on
  const ownedLocks = selectedTubes.filter(t =>
    t.isLocked && t.lockedBy === currentUserId
  );

  if (ownedLocks.length === 0) {
    notifications.warning('No owned locks to unlock');
    return;
  }

  const result = await unlockTubesMutation.mutateAsync({
    tubeIds: ownedLocks.map(t => t.id),
  });

  const count = result.unlocked.length;
  notifications.update(`Unlocked ${count} tube${count !== 1 ? 's' : ''}`);
}, [getSelectedTubes, currentUserId, unlockTubesMutation]);

// Shift+L: Always tries to LOCK ALL selected tubes
// (If all are already locked by user, they would use Unlock from context menu)
const handleShiftL = useCallback(() => {
  lockAll();
}, [lockAll]);
```

**Context Menu Logic:**

| Selection State | Show "Lock" | Show "Unlock" |
|-----------------|-------------|---------------|
| All unlocked, user can lock | Yes (Lock X) | No |
| Some locked by user, some unlocked | Yes (Lock X unlocked) | Yes (Unlock X owned) |
| All locked by user | No | Yes (Unlock X) |
| All locked by others | No | No |
| Mixed (some by user, some by others) | No | Yes (Unlock X owned) |

---

### Username Resolution for Display

**Existing infrastructure to use:**
- `useUserLookupQuery(userIds)` from `client/src/domains/users/hooks/useUserLookupQuery.ts`
- Returns `UserDisplayInfo[]` with `{ id, username, displayName }`

**Display format:** `"Display Name (username)"` or just `"username"` if no display name.

**Usage in LockIndicator and TubeInfoPanel:**

```typescript
// In component that renders lock info
const lockedByUserIds = tubes
  .filter(t => t.isLocked && t.lockedBy)
  .map(t => t.lockedBy!);

const { data: lockOwners = [] } = useUserLookupQuery(lockedByUserIds);

// Create lookup map
const ownerMap = new Map(lockOwners.map(u => [u.id, u]));

// Get display string
const getOwnerDisplay = (userId: string): string => {
  const user = ownerMap.get(userId);
  if (!user) return 'Unknown user';
  return user.displayName
    ? `${user.displayName} (${user.username})`
    : user.username;
};
```

---

### Toast Notifications

**Use existing `notifications` utility** from `client/src/shared/utils/notifications.ts`.

Add new method for lock operations:

```typescript
// In notifications.ts - add new method
/** Lock/Unlock operation - uses update color (Mint Frost) */
lock: (message: string) => {
  toast.success(message, {
    duration: 2000,
    position: 'bottom-right',
    style: {
      background: COLORS.mintyFrost,
      color: '#065F46', // Dark green text
    },
  });
},
```

**Notification messages:**

| Action | Message |
|--------|---------|
| Lock success | `"Locked X tube(s)"` |
| Lock partial | `"Locked X tube(s). Y skipped."` |
| Unlock success | `"Unlocked X tube(s)"` |
| Unlock partial | `"Unlocked X tube(s). Y skipped."` |
| Share success | `"Shared access with X user(s)"` |
| Revoke success | `"Revoked access from X user(s)"` |
| Error | `notifications.error("Failed to lock tubes")` |

---

### Audit Trail Actions

Add to AuditEventHandler.ts subscriptions:

```typescript
this.eventBus.subscribe('TubeLockChanged', this.handleTubeLockChanged.bind(this));
this.eventBus.subscribe('TubeAccessShared', this.handleTubeAccessShared.bind(this));
this.eventBus.subscribe('TubeAccessRevoked', this.handleTubeAccessRevoked.bind(this));
// Container sharing handled by ConfigurationChangeDetector events
```

Actions to log:

| Action | When | Details |
|--------|------|---------|
| `tube_locked` | Single tube locked | tubeId, lockedBy, lockNote |
| `tubes_batch_locked` | Multiple tubes locked | tubeIds[], lockedBy, lockNote, count |
| `tube_unlocked` | Single tube unlocked | tubeId, unlockedBy |
| `tubes_batch_unlocked` | Multiple unlocked | tubeIds[], unlockedBy, count |
| `tube_lock_admin_override` | Admin unlocks another's tube | tubeId, originalLockedBy, adminId, reason |
| `tube_access_shared` | Tube access shared | tubeIds[], sharedBy, sharedWithUserIds[] |
| `tube_access_revoked` | Tube access revoked | tubeIds[], revokedBy, revokedUserIds[] |
| `box_access_shared` | Box access shared | boxId, boxName, sharedBy, sharedWithUserIds[] |
| `box_access_revoked` | Box access revoked | boxId, boxName, revokedBy, revokedUserIds[] |
| `rack_access_shared` | Rack access shared | rackId, rackName, sharedBy, sharedWithUserIds[] |
| `rack_access_revoked` | Rack access revoked | rackId, rackName, revokedBy, revokedUserIds[] |

---

## Implementation Phases (Ordered)

### Phase 1: Schema & Database ✓ COMPLETED

**Goal:** Types and database ready

1. ✓ Created `packages/shared-schemas/src/tubes/tubeLockSchemas.ts`
2. ✓ Updated `packages/shared-schemas/src/tubes/tubeSchemas.ts` - added lock fields
3. ✓ Updated `packages/shared-schemas/src/storage/configurationSchemas.ts` - added sharedWithUserIds
4. ✓ Updated `packages/shared-schemas/src/index.ts` - exported new schemas
5. ✓ Built shared-schemas package
6. ✓ Updated `server/src/infrastructure/database/SQLiteContext.ts` - added columns + indexes
7. ✓ Deleted existing SQLite database

**Verification:** TypeScript compiles on server and client

---

### Phase 2: Domain Layer ✓ COMPLETED

**Goal:** Business logic complete

1. ✓ Created `server/src/domain/events/TubeLockEvents.ts`
2. ✓ Updated `server/src/domain/events/index.ts` - exported new events
3. ✓ Updated `server/src/domain/entities/Tube.ts` - added lock fields and methods
4. ✓ Updated `server/src/infrastructure/database/mappers/TubeMapper.ts` - handled lock fields
5. ✓ Updated `server/src/infrastructure/repositories/SQLiteTubeRepository.ts` - mapped lock columns
6. ✓ Updated `server/src/domain/services/AccessControlService.ts` - added lock check methods
7. ✓ Verified `server/src/domain/types/services/AccessControl.ts` - existing interfaces sufficient
8. ✓ Updated `server/src/domain/services/ConfigurationChangeDetector.ts` - detects sharedWithUserIds changes
9. ✓ Added container sharing events to `server/src/domain/events/ConfigurationEvents.ts`
10. ✓ Updated `server/src/domain/valueObjects/Equipment.ts` - added sharedWithUserIds to Rack/Box

**Verification:** Server and client TypeScript compile successfully

---

### Phase 3: Application & API

**Goal:** API endpoints working

1. Create `server/src/application/dto/TubeLockDto.ts`
2. Update `server/src/application/services/TubeApplicationService.ts` - add lock methods
3. Create `server/src/presentation/controllers/TubeLockController.ts`
4. Update `server/src/infrastructure/di/ServiceContainer.ts` - register controller
5. Update `server/src/presentation/routes/ResourceRouteModule.ts` - add routes
6. Update `server/src/middleware/Validation.ts` - add lock validation schemas
7. Update `server/src/application/eventHandlers/SocketEventHandler.ts` - emit lock events
8. Update `server/src/application/eventHandlers/AuditEventHandler.ts` - log lock actions

**Verification:** API endpoints respond correctly via curl/Postman

---

### Phase 4: Frontend Core

**Goal:** Lock functionality working in UI

1. Update `client/src/domains/tubes/services/TubeService.ts` - add lock methods
2. Create `client/src/domains/tubes/hooks/useTubeLockMutations.ts`
3. Create `client/src/domains/tubes/hooks/useTubeAccessControl.ts`
4. Update `client/src/domains/tubes/hooks/index.ts` - export new hooks
5. Update `client/src/infrastructure/socket/queryBridge.ts` - handle lock events
6. Create `client/src/domains/tubes/ui/components/LockIndicator.tsx`
7. Create `client/src/domains/tubes/ui/components/modals/LockTubesModal.tsx`
8. Update `client/src/shared/utils/notifications.ts` - add lock notification

**Verification:** Can lock/unlock tubes programmatically, Socket events work

---

### Phase 5: Frontend Integration

**Goal:** Complete UI integration

1. Update `client/src/shared/ui/primitives/shared/ContextMenu.tsx` - add lock actions
2. Update `client/src/app/hooks/grid/useGridKeyboardNavigation.ts` - add Shift+L, Shift+S
3. Update `client/src/app/hooks/grid/useGridController.ts` - add lock actions
4. Update `client/src/domains/tubes/ui/components/grid/TubeGrid.tsx` - wire up
5. Update `client/src/domains/tubes/ui/components/grid/GridPosition.tsx` - render LockIndicator
6. Update `client/src/domains/tubes/ui/components/TubeInfoPanel.tsx` - show lock details
7. Update `client/src/domains/tubes/ui/components/modals/TubeEditorModal.tsx` - read-only mode
8. Create `client/src/shared/ui/components/ShareAccessModal.tsx`
9. Update `client/src/domains/storage/ui/components/modals/BoxRow.tsx` - Share button
10. Update `client/src/domains/storage/ui/components/modals/RackRow.tsx` - Share button
11. Update `client/src/app/stores/modalStore.ts` - add lock modal state
12. Update `client/src/app/components/layout/Dashboard.tsx` - render modals

**Verification:** Full lock workflow works end-to-end

---

### Phase 6: Testing & Polish

**Goal:** Production ready

1. Test all lock scenarios (own space, common space, denied)
2. Test admin override with reason
3. Test batch operations with mixed lock states
4. Test Socket.IO real-time sync
5. Test audit trail logging
6. Test container sharing via ConfigurationChangeDetector
7. UI polish (icons, colors, tooltips, accessibility)
8. Error handling edge cases

**Verification:** All scenarios work, build/package succeeds

---

## Testing Checklist

### Access Control Tests
- [ ] User can lock tube in own assigned space
- [ ] User can lock tube in common space
- [ ] User CANNOT lock tube in another's space
- [ ] User can unlock own locked tube
- [ ] User CANNOT unlock another's locked tube
- [ ] Admin can lock any tube
- [ ] Admin can unlock any tube
- [ ] Shared user can edit locked tube
- [ ] Non-shared user CANNOT edit locked tube

### UI Tests
- [ ] Lock icon shows on locked-out tubes (red, bottom-left)
- [ ] Lock icon does NOT show on own locks
- [ ] Lock icon does NOT show for admins
- [ ] Dimming effect on locked-out tubes
- [ ] Tooltip shows lock owner as "Display Name (username)"
- [ ] Context menu shows Lock/Unlock appropriately
- [ ] Shift+L locks all selected (unlocked) tubes
- [ ] Shift+S opens share modal for owned locks
- [ ] TubeInfoPanel shows lock details
- [ ] TubeEditorModal shows read-only warning when locked out

### Notification Tests
- [ ] "Locked X tube(s)" on successful lock
- [ ] "Unlocked X tube(s)" on successful unlock
- [ ] Partial success shows skipped count
- [ ] Error notifications on failure

### Batch Operation Tests
- [ ] Batch lock with partial success
- [ ] Batch unlock with partial success
- [ ] Batch delete skips locked tubes with notification
- [ ] Batch edit skips locked tubes with notification

### Real-time Tests
- [ ] Lock change reflects immediately in other tabs
- [ ] Share access reflects immediately
- [ ] Revoke access reflects immediately

### Container Sharing Tests
- [ ] Share button appears on assigned boxes/racks
- [ ] Sharing box triggers audit log
- [ ] ConfigurationChangeDetector fires sharing events

---

## Summary

This plan provides a complete, verified implementation path for the resource locking feature. All file paths have been confirmed to exist, all patterns follow existing conventions, and all integration points have been identified.

**Key Numbers:**
- **Files to CREATE:** 10
- **Files to EDIT:** 29
- **New API Endpoints:** 4
- **New Domain Events:** 6 (3 tube + 3 container)
- **New Audit Actions:** 11

**Ready for implementation.**
