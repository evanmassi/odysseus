# Resource Locking System - Implementation Plan v2

**Date:** 2025-01-XX
**Status:** Ready for Implementation
**Complexity:** Medium (3-5 days estimated)
**Priority:** High
**Prerequisite:** Resource Assignment System (completed)

---

## Executive Summary

This document outlines the implementation plan for a **tube-level locking system** that allows users to protect inventory items they're working with. The system integrates with the existing **resource assignment** feature to provide layered protection.

### Core Principle

**Assignment protects the container. Locking protects the contents.**

- **Assigned racks/boxes** already prevent other users from adding/removing tubes
- **Tube locking** adds explicit protection for specific tubes + notes + sharing capabilities
- Both systems work together to give users full control over their inventory

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Container locking | **Not needed** | Assignment already provides container protection |
| Tube locking | **Explicit opt-in** | For notes, common space protection, sharing |
| Default tube state | **Unlocked** | Protected by container assignment if applicable |
| Lock notes | **Optional**, max 100 chars | For project/purpose documentation |
| Shared access | **Per-container AND per-tube** | Flexible collaboration |
| Admin override reason | **Optional** | For audit clarity |
| User deletion | **Auto-cleanup** | Unlock all tubes, handled by existing cascade |
| Lock expiration | **None** | Locks persist until manually unlocked |
| Batch ops with mixed locks | **Partial success** | Unlocked tubes processed, locked tubes skipped with notification |

---

## Table of Contents

1. [Business Requirements](#business-requirements)
2. [Protection Model](#protection-model)
3. [Access Control Rules](#access-control-rules)
4. [Schema Changes](#schema-changes)
5. [Database Changes](#database-changes)
6. [Backend Implementation](#backend-implementation)
7. [Frontend Implementation](#frontend-implementation)
8. [Audit Trail](#audit-trail)
9. [Implementation Phases](#implementation-phases)
10. [Testing Strategy](#testing-strategy)

---

## Business Requirements

### User Stories

**As a regular user, I want to:**
- Lock tubes in my assigned space to indicate they're reserved for a project
- Lock tubes in common/unassigned space to claim them for my work
- Add notes to locked tubes explaining what they're for (e.g., "Project X - Donor 123")
- Batch lock multiple selected tubes at once with a single note
- Unlock my tubes when I no longer need them reserved
- Share access to my locked tubes with specific colleagues
- Move my locked tubes between my assigned spaces or to common space
- See which tubes I'm locked out from (red lock icon + dimmed) and who owns the lock (via tooltip)

**As an admin, I want to:**
- Lock/unlock any tube regardless of ownership
- Override locks when users leave or in emergencies
- See all locks across the system
- Optionally provide a reason when overriding locks (for audit trail)

**As any user, I want to:**
- View all tubes (locked or not) - locking only affects edit/move/delete
- Clearly see which tubes are locked out from me (red lock icon + dimmed appearance)
- Hover over the lock icon to see who owns the lock (so I can contact them for access)
- View lock details (owner, note, timestamp) in the Tube Info Panel

### What Users CANNOT Do

- Lock entire racks or boxes in common/unassigned space (prevents abuse)
- Lock tubes in another user's assigned space
- Edit/move/delete tubes locked by someone else (unless shared or admin)
- Move locked tubes into another user's assigned space

---

## Protection Model

### Layered Protection System

The system has two layers of protection that work together:

#### Layer 1: Container Assignment (Already Implemented)

Assignment of racks/boxes creates implicit protection:

| Container State | Add Tubes | Remove/Edit Tubes |
|-----------------|-----------|-------------------|
| Assigned to Alice | Only Alice + admins | Only Alice + admins + shared users |
| Unassigned (common) | Anyone | Anyone (unless tube is locked) |

#### Layer 2: Tube Locking (This Feature)

Explicit tube-level protection for additional control:

| Tube State | Edit | Move | Delete |
|------------|------|------|--------|
| Unlocked | Depends on container | Depends on container | Depends on container |
| Locked by Alice | Only Alice + shared + admins | Only Alice + admins (to allowed destinations) | Only Alice + admins |

### How They Work Together

**Scenario 1: Alice's Assigned Box**
- Box is assigned to Alice
- Bob cannot add tubes, remove tubes, or edit tubes in this box
- Alice doesn't need to lock individual tubes - they're protected by assignment
- Alice CAN lock tubes if she wants to add notes or share with specific users

**Scenario 2: Common Space**
- Box is unassigned (common)
- Anyone can add/edit/remove tubes
- Alice can lock specific tubes she's working with
- Once locked, only Alice (or shared users + admins) can edit/move/delete those tubes

**Scenario 3: Sharing**
- Alice owns Box A with tubes inside
- Bob needs to work with some of Alice's tubes
- Alice adds Bob to `sharedWithUserIds` on her box (or on specific tubes)
- Now Bob can edit/move tubes in Alice's box (or the specific shared tubes)

---

## Access Control Rules

### Complete Decision Tree

#### Can User X Edit/Delete Tube T?

```
1. Is User X an admin?
   → YES: ALLOWED

2. Is Tube T explicitly locked?
   → YES: Is User X the lock owner OR in tube's sharedWithUserIds?
         → YES: ALLOWED
         → NO: DENIED ("Tube locked by [owner]")
   → NO: Continue to step 3

3. Is Tube T in an assigned container?
   → YES: Is User X the container owner OR in container's sharedWithUserIds?
         → YES: ALLOWED
         → NO: DENIED ("Tube is in [owner]'s assigned space")
   → NO (common space): ALLOWED
```

#### Can User X Add Tube to Box B?

```
1. Is User X an admin?
   → YES: ALLOWED

2. Is Box B assigned to someone?
   → YES: Is User X the assignee OR in box's sharedWithUserIds?
         → YES: ALLOWED
         → NO: DENIED ("Box is assigned to [owner]")
   → NO (common space): ALLOWED
```

#### Can User X Move Tube T to Box B? (Cut/Paste Operation)

```
Step 1: Can User X remove Tube T from current location?
   → Apply "Can User X Edit/Delete Tube T?" rules above
   → If DENIED: Operation fails

Step 2: Can User X add to destination Box B?
   → Apply "Can User X Add Tube to Box B?" rules above
   → If DENIED: Operation fails ("Cannot move into [owner]'s assigned space")

Both steps pass → ALLOWED
```

#### Can User X Lock Tube T?

```
1. Is User X an admin?
   → YES: ALLOWED

2. Is Tube T already locked?
   → YES: DENIED ("Tube already locked by [owner]")

3. Is Tube T in User X's assigned space?
   → YES: ALLOWED

4. Is Tube T in common/unassigned space?
   → YES: ALLOWED

5. Is Tube T in another user's assigned space?
   → DENIED ("Cannot lock tubes in [owner]'s assigned space")
```

#### Can User X Unlock Tube T?

```
1. Is User X an admin?
   → YES: ALLOWED

2. Is User X the lock owner?
   → YES: ALLOWED

3. Otherwise:
   → DENIED ("Only lock owner or admin can unlock")
```

---

## Schema Changes

### Shared Schemas Package

#### Tube Schema Updates

**File:** `packages/shared-schemas/src/tubes/tubeSchemas.ts`

Add new fields to `tubeDataSchema`:

```typescript
// NEW: Locking fields
isLocked: z.boolean().optional().default(false),
lockedBy: z.string().optional(),           // userId who locked it
lockNote: z.string().max(100).optional(),  // "Project X - Donor 123"
lockedAt: z.string().datetime().optional(), // ISO timestamp
sharedWithUserIds: z.array(z.string()).optional(), // Users granted access
```

**Type Export:**
```typescript
export type TubeData = z.infer<typeof tubeDataSchema>;
// Will now include: isLocked, lockedBy, lockNote, lockedAt, sharedWithUserIds
```

#### Equipment Schema Updates

**File:** `packages/shared-schemas/src/storage/configurationSchemas.ts`

Add `sharedWithUserIds` to Box and Rack schemas:

```typescript
// BoxConfigurationSchema - add:
sharedWithUserIds: z.array(z.string()).optional(),

// RackConfigurationSchema - add:
sharedWithUserIds: z.array(z.string()).optional(),
```

### API Request/Response Schemas

#### Lock Operations

**File:** `packages/shared-schemas/src/tubes/tubeLockSchemas.ts` (NEW)

```typescript
import { z } from 'zod';

// Lock single tube
export const lockTubeRequestSchema = z.object({
  tubeId: z.string(),
  lockNote: z.string().max(100).optional(),
});

// Batch lock multiple tubes
export const batchLockTubesRequestSchema = z.object({
  tubeIds: z.array(z.string()).min(1).max(100),
  lockNote: z.string().max(100).optional(),
});

// Unlock tubes (single or batch)
export const unlockTubesRequestSchema = z.object({
  tubeIds: z.array(z.string()).min(1).max(100),
});

// Share tube access
export const shareTubeAccessRequestSchema = z.object({
  tubeIds: z.array(z.string()).min(1),
  userIds: z.array(z.string()).min(1),
});

// Revoke tube access
export const revokeTubeAccessRequestSchema = z.object({
  tubeIds: z.array(z.string()).min(1),
  userIds: z.array(z.string()).min(1),
});

// Type exports
export type LockTubeRequest = z.infer<typeof lockTubeRequestSchema>;
export type BatchLockTubesRequest = z.infer<typeof batchLockTubesRequestSchema>;
export type UnlockTubesRequest = z.infer<typeof unlockTubesRequestSchema>;
export type ShareTubeAccessRequest = z.infer<typeof shareTubeAccessRequestSchema>;
export type RevokeTubeAccessRequest = z.infer<typeof revokeTubeAccessRequestSchema>;
```

---

## Database Changes

### Tubes Table

Add columns to existing `tubes` table:

```sql
-- Add locking columns
ALTER TABLE tubes ADD COLUMN isLocked INTEGER DEFAULT 0;
ALTER TABLE tubes ADD COLUMN lockedBy TEXT;
ALTER TABLE tubes ADD COLUMN lockNote TEXT;
ALTER TABLE tubes ADD COLUMN lockedAt TEXT;
ALTER TABLE tubes ADD COLUMN sharedWithUserIds TEXT;  -- JSON array: '["user1","user2"]'

-- Index for lock queries
CREATE INDEX idx_tubes_locked ON tubes(isLocked);
CREATE INDEX idx_tubes_lockedBy ON tubes(lockedBy);
```

### No New Tables Required

Lock data is stored directly on tubes. Container sharing (`sharedWithUserIds`) is stored in the configuration JSON (existing pattern).

---

## Backend Implementation

### Domain Layer

#### Tube Entity Updates

**File:** `server/src/domain/entities/Tube.ts`

Add new private fields:
```typescript
private _isLocked: boolean;
private _lockedBy?: string;
private _lockNote?: string;
private _lockedAt?: Date;
private _sharedWithUserIds: string[];
```

Add new methods:
```typescript
// Locking
lock(userId: string, note?: string): Tube {
  if (this._isLocked) {
    throw new DomainError('Tube is already locked');
  }
  // Return new instance with lock applied
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
    sharedWithUserIds: [], // Auto-clear shared access when unlocking
  });
}

// Note: sharedWithUserIds is automatically cleared when unlocking because:
// 1. Sharing only makes sense for locked tubes
// 2. An unlocked tube is accessible to everyone (based on container permissions)
// 3. Prevents stale shared access from persisting after unlock

// Sharing
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

// Queries
isLocked(): boolean {
  return this._isLocked;
}

isLockedBy(userId: string): boolean {
  return this._isLocked && this._lockedBy === userId;
}

canBeAccessedBy(userId: string): boolean {
  if (!this._isLocked) return true;
  if (this._lockedBy === userId) return true;
  if (this._sharedWithUserIds.includes(userId)) return true;
  return false;
}

// Getters
get lockedBy(): string | undefined { return this._lockedBy; }
get lockNote(): string | undefined { return this._lockNote; }
get lockedAt(): Date | undefined { return this._lockedAt; }
get sharedWithUserIds(): readonly string[] { return [...this._sharedWithUserIds]; }
```

Update `toData()` to include lock fields.

#### AccessControlService Updates

**File:** `server/src/domain/services/AccessControlService.ts`

Add new methods:

```typescript
// Check if user can edit a tube (considering both container and tube lock)
async canEditTube(user: User, tube: Tube, container?: Equipment): Promise<AccessResult> {
  // Admins can always edit
  if (user.isAdmin()) {
    return AccessResult.allowed();
  }

  // Check tube-level lock first
  if (tube.isLocked()) {
    if (tube.isLockedBy(user.id) || tube.canBeAccessedBy(user.id)) {
      // User owns lock or has shared access - continue to container check
    } else {
      return AccessResult.denied(`Tube is locked by another user`);
    }
  }

  // Check container-level protection
  if (container && container.assignedUserId) {
    const hasContainerAccess =
      container.assignedUserId === user.id ||
      container.sharedWithUserIds?.includes(user.id);

    if (!hasContainerAccess) {
      return AccessResult.denied(`Tube is in ${container.assignedUserName}'s assigned space`);
    }
  }

  return AccessResult.allowed();
}

// Check if user can lock a tube
async canLockTube(user: User, tube: Tube, container?: Equipment): Promise<AccessResult> {
  // Admins can always lock
  if (user.isAdmin()) {
    return AccessResult.allowed();
  }

  // Already locked
  if (tube.isLocked()) {
    return AccessResult.denied('Tube is already locked');
  }

  // In user's own assigned space
  if (container?.assignedUserId === user.id) {
    return AccessResult.allowed();
  }

  // In common/unassigned space
  if (!container?.assignedUserId || container.assignedUserId === null) {
    return AccessResult.allowed();
  }

  // In another user's space
  return AccessResult.denied(`Cannot lock tubes in another user's assigned space`);
}

// Check if user can unlock a tube
async canUnlockTube(user: User, tube: Tube): Promise<AccessResult> {
  // Admins can always unlock
  if (user.isAdmin()) {
    return AccessResult.allowed();
  }

  // Not locked
  if (!tube.isLocked()) {
    return AccessResult.denied('Tube is not locked');
  }

  // User owns the lock
  if (tube.isLockedBy(user.id)) {
    return AccessResult.allowed();
  }

  return AccessResult.denied('Only the lock owner or an admin can unlock this tube');
}

// Check if user can move tube to destination
async canMoveTubeTo(
  user: User,
  tube: Tube,
  sourceContainer: Equipment | undefined,
  destContainer: Equipment | undefined
): Promise<AccessResult> {
  // First check: can user remove from source?
  const canRemove = await this.canEditTube(user, tube, sourceContainer);
  if (!canRemove.allowed) {
    return canRemove;
  }

  // Admins can move anywhere
  if (user.isAdmin()) {
    return AccessResult.allowed();
  }

  // Second check: can user add to destination?
  if (destContainer?.assignedUserId) {
    const hasDestAccess =
      destContainer.assignedUserId === user.id ||
      destContainer.sharedWithUserIds?.includes(user.id);

    if (!hasDestAccess) {
      return AccessResult.denied(`Cannot move into ${destContainer.assignedUserName}'s assigned space`);
    }
  }

  return AccessResult.allowed();
}
```

### Application Layer

#### TubeApplicationService Updates

**File:** `server/src/application/services/TubeApplicationService.ts`

Add new methods:

```typescript
// Return type for batch operations with partial success
interface BatchLockResult {
  locked: TubeDto[];
  skipped: { tubeId: string; reason: string }[];
}

async lockTubes(
  tubeIds: string[],
  userId: string,
  lockNote?: string
): Promise<BatchLockResult> {
  const user = await this.userRepository.findById(userId);
  if (!user) throw new NotFoundError('User not found');

  const locked: TubeDto[] = [];
  const skipped: { tubeId: string; reason: string }[] = [];

  for (const tubeId of tubeIds) {
    const tube = await this.tubeRepository.findById(tubeId);
    if (!tube) {
      skipped.push({ tubeId, reason: 'Tube not found' });
      continue;
    }

    const container = await this.getContainerForTube(tube);

    const canLock = await this.accessControlService.canLockTube(user, tube, container);
    if (!canLock.allowed) {
      skipped.push({ tubeId, reason: canLock.reason });
      continue; // Skip this tube, continue with others
    }

    const lockedTube = tube.lock(userId, lockNote);
    await this.tubeRepository.update(lockedTube);

    // Emit event for real-time sync
    this.eventBus.publish(new TubeLockChangedEvent({
      tubeId,
      isLocked: true,
      lockedBy: userId,
      lockNote,
    }));

    locked.push(this.toTubeDto(lockedTube));
  }

  // Audit log (only if at least one tube was locked)
  if (locked.length > 0) {
    await this.auditService.log({
      userId,
      action: locked.length === 1 ? 'tube_locked' : 'tubes_batch_locked',
      entityType: 'tube',
      entityIds: locked.map(t => t.id),
      details: { lockNote, count: locked.length, skippedCount: skipped.length },
    });
  }

  return { locked, skipped };
}

// Return type for batch unlock operations with partial success
interface BatchUnlockResult {
  unlocked: TubeDto[];
  skipped: { tubeId: string; reason: string }[];
}

async unlockTubes(
  tubeIds: string[],
  userId: string,
  overrideReason?: string  // For admin overrides
): Promise<BatchUnlockResult> {
  const user = await this.userRepository.findById(userId);
  if (!user) throw new NotFoundError('User not found');

  const unlocked: TubeDto[] = [];
  const skipped: { tubeId: string; reason: string }[] = [];

  for (const tubeId of tubeIds) {
    const tube = await this.tubeRepository.findById(tubeId);
    if (!tube) {
      skipped.push({ tubeId, reason: 'Tube not found' });
      continue;
    }

    const canUnlock = await this.accessControlService.canUnlockTube(user, tube);
    if (!canUnlock.allowed) {
      skipped.push({ tubeId, reason: canUnlock.reason });
      continue; // Skip this tube, continue with others
    }

    const originalLockedBy = tube.lockedBy;
    const unlockedTube = tube.unlock();
    await this.tubeRepository.update(unlockedTube);

    // Emit event
    this.eventBus.publish(new TubeLockChangedEvent({
      tubeId,
      isLocked: false,
    }));

    unlocked.push(this.toTubeDto(unlockedTube));

    // If admin override, log separately
    if (user.isAdmin() && originalLockedBy !== userId) {
      await this.auditService.log({
        userId,
        action: 'tube_lock_admin_override',
        entityType: 'tube',
        entityId: tubeId,
        details: {
          originalLockedBy,
          reason: overrideReason || 'Admin override'
        },
      });
    }
  }

  // Standard audit log (only if at least one tube was unlocked)
  if (unlocked.length > 0) {
    await this.auditService.log({
      userId,
      action: unlocked.length === 1 ? 'tube_unlocked' : 'tubes_batch_unlocked',
      entityType: 'tube',
      entityIds: unlocked.map(t => t.id),
      details: { count: unlocked.length, skippedCount: skipped.length },
    });
  }

  return { unlocked, skipped };
}

async shareTubeAccess(
  tubeIds: string[],
  targetUserIds: string[],
  userId: string
): Promise<void> {
  const user = await this.userRepository.findById(userId);
  if (!user) throw new NotFoundError('User not found');

  for (const tubeId of tubeIds) {
    const tube = await this.tubeRepository.findById(tubeId);
    if (!tube) continue;

    // Only lock owner or admin can share
    if (!tube.isLockedBy(userId) && !user.isAdmin()) {
      throw new PermissionError('Only the lock owner can share access');
    }

    const updatedTube = tube.shareWith(targetUserIds);
    await this.tubeRepository.update(updatedTube);
  }

  // Audit log
  await this.auditService.log({
    userId,
    action: 'tube_access_shared',
    entityType: 'tube',
    entityIds: tubeIds,
    details: { sharedWithUserIds: targetUserIds },
  });
}

async revokeTubeAccess(
  tubeIds: string[],
  targetUserIds: string[],
  userId: string
): Promise<void> {
  const user = await this.userRepository.findById(userId);
  if (!user) throw new NotFoundError('User not found');

  for (const tubeId of tubeIds) {
    const tube = await this.tubeRepository.findById(tubeId);
    if (!tube) continue;

    // Only lock owner or admin can revoke
    if (!tube.isLockedBy(userId) && !user.isAdmin()) {
      throw new PermissionError('Only the lock owner can revoke access');
    }

    const updatedTube = tube.revokeAccess(targetUserIds);
    await this.tubeRepository.update(updatedTube);
  }

  // Audit log
  await this.auditService.log({
    userId,
    action: 'tube_access_revoked',
    entityType: 'tube',
    entityIds: tubeIds,
    details: { revokedUserIds: targetUserIds },
  });
}
```

Update existing `updateTube()` method to check lock status:

```typescript
async updateTube(id: string, request: UpdateTubeRequest, userId: string): Promise<TubeDto> {
  const tube = await this.tubeRepository.findById(id);
  if (!tube) throw new NotFoundError('Tube not found');

  const user = await this.userRepository.findById(userId);
  if (!user) throw new NotFoundError('User not found');

  const container = await this.getContainerForTube(tube);

  // NEW: Check access control (considers both lock and container assignment)
  const canEdit = await this.accessControlService.canEditTube(user, tube, container);
  if (!canEdit.allowed) {
    throw new PermissionError(canEdit.reason);
  }

  // Check if this is a move operation
  if (request.location && this.isLocationChange(tube, request.location)) {
    const destContainer = await this.getContainerByLocation(request.location);
    const canMove = await this.accessControlService.canMoveTubeTo(
      user, tube, container, destContainer
    );
    if (!canMove.allowed) {
      throw new PermissionError(canMove.reason);
    }
  }

  // ... rest of existing update logic
}
```

Update existing `deleteTube()` method to check lock status:

```typescript
async deleteTube(id: string, userId: string): Promise<void> {
  const tube = await this.tubeRepository.findById(id);
  if (!tube) throw new NotFoundError('Tube not found');

  const user = await this.userRepository.findById(userId);
  if (!user) throw new NotFoundError('User not found');

  const container = await this.getContainerForTube(tube);

  // NEW: Check access control (considers both lock and container assignment)
  // Uses same canEditTube since delete requires same permissions as edit
  const canDelete = await this.accessControlService.canEditTube(user, tube, container);
  if (!canDelete.allowed) {
    throw new PermissionError(canDelete.reason);
  }

  // ... rest of existing delete logic
}
```

### Presentation Layer

#### New Lock Routes

**File:** `server/src/presentation/routes/TubeLockRouteModule.ts` (NEW)

```typescript
import { Router } from 'express';
import type { TubeApplicationService } from '@application/services/TubeApplicationService';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validateRequest';
import {
  batchLockTubesRequestSchema,
  unlockTubesRequestSchema,
  shareTubeAccessRequestSchema,
  revokeTubeAccessRequestSchema,
} from '@odysseus/shared-schemas';

export class TubeLockRouteModule {
  constructor(private tubeService: TubeApplicationService) {}

  createRouter(): Router {
    const router = Router();

    // Lock tubes (single or batch)
    router.post(
      '/lock',
      authMiddleware,
      validateRequest(batchLockTubesRequestSchema),
      async (req, res, next) => {
        try {
          const { tubeIds, lockNote } = req.body;
          const userId = req.user!.id;
          const result = await this.tubeService.lockTubes(tubeIds, userId, lockNote);
          res.status(200).json(result);
        } catch (error) {
          next(error);
        }
      }
    );

    // Unlock tubes (single or batch)
    router.post(
      '/unlock',
      authMiddleware,
      validateRequest(unlockTubesRequestSchema),
      async (req, res, next) => {
        try {
          const { tubeIds } = req.body;
          const { reason } = req.query; // Optional admin reason
          const userId = req.user!.id;
          const result = await this.tubeService.unlockTubes(
            tubeIds,
            userId,
            reason as string | undefined
          );
          res.status(200).json(result);
        } catch (error) {
          next(error);
        }
      }
    );

    // Share tube access
    router.post(
      '/share',
      authMiddleware,
      validateRequest(shareTubeAccessRequestSchema),
      async (req, res, next) => {
        try {
          const { tubeIds, userIds } = req.body;
          const userId = req.user!.id;
          await this.tubeService.shareTubeAccess(tubeIds, userIds, userId);
          res.status(204).send();
        } catch (error) {
          next(error);
        }
      }
    );

    // Revoke tube access
    router.post(
      '/revoke',
      authMiddleware,
      validateRequest(revokeTubeAccessRequestSchema),
      async (req, res, next) => {
        try {
          const { tubeIds, userIds } = req.body;
          const userId = req.user!.id;
          await this.tubeService.revokeTubeAccess(tubeIds, userIds, userId);
          res.status(204).send();
        } catch (error) {
          next(error);
        }
      }
    );

    return router;
  }
}
```

**API Endpoints Summary:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tubes/lock` | Lock one or more tubes |
| POST | `/api/tubes/unlock` | Unlock one or more tubes |
| POST | `/api/tubes/share` | Share access to locked tubes |
| POST | `/api/tubes/revoke` | Revoke shared access |

### WebSocket Events

Add new events for real-time sync:

```typescript
// Server emits
'tube_lock_changed' → { tubeId, isLocked, lockedBy?, lockNote? }
'tube_access_shared' → { tubeIds, sharedWithUserIds }
'tube_access_revoked' → { tubeIds, revokedUserIds }
```

---

## Frontend Implementation

### Query Keys

**File:** `client/src/app/queryKeys.ts`

No new query keys needed - tube lock data is part of tube data, fetched with existing `tubes` queries.

### React Query Hooks

**File:** `client/src/domains/tubes/hooks/useTubeLockMutations.ts` (NEW)

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@app/queryKeys';
import { TubeService } from '../services/TubeService';
import type {
  BatchLockTubesRequest,
  UnlockTubesRequest,
  ShareTubeAccessRequest,
  RevokeTubeAccessRequest
} from '@odysseus/shared-schemas';

export const useLockTubesMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: BatchLockTubesRequest) => TubeService.lockTubes(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.all });
    },
  });
};

export const useUnlockTubesMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UnlockTubesRequest & { reason?: string }) =>
      TubeService.unlockTubes(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.all });
    },
  });
};

export const useShareTubeAccessMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ShareTubeAccessRequest) => TubeService.shareTubeAccess(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.all });
    },
  });
};

export const useRevokeTubeAccessMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: RevokeTubeAccessRequest) => TubeService.revokeTubeAccess(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.all });
    },
  });
};
```

### TubeService Updates

**File:** `client/src/domains/tubes/services/TubeService.ts`

Add new methods:

```typescript
static async lockTubes(request: BatchLockTubesRequest): Promise<TubeData[]> {
  const response = await httpClient.post<TubeData[]>('/api/tubes/lock', request);
  return response.data;
}

static async unlockTubes(request: UnlockTubesRequest & { reason?: string }): Promise<TubeData[]> {
  const { reason, ...body } = request;
  const url = reason ? `/api/tubes/unlock?reason=${encodeURIComponent(reason)}` : '/api/tubes/unlock';
  const response = await httpClient.post<TubeData[]>(url, body);
  return response.data;
}

static async shareTubeAccess(request: ShareTubeAccessRequest): Promise<void> {
  await httpClient.post('/api/tubes/share', request);
}

static async revokeTubeAccess(request: RevokeTubeAccessRequest): Promise<void> {
  await httpClient.post('/api/tubes/revoke', request);
}
```

### UI Components

#### Tube Context Menu - Lock/Unlock Options

**File:** `client/src/domains/tubes/ui/components/TubeContextMenu.tsx` (UPDATE EXISTING)

Add lock/unlock options to the **bottom** of the existing tube context menu:

```typescript
// Add to existing context menu items:

// Separator before lock options
<ContextMenuSeparator />

// Lock option - shown when tube is unlocked and user CAN lock
{!tube.isLocked && canLock && (
  <ContextMenuItem onClick={handleLock}>
    <Lock className="w-4 h-4 mr-2" />
    Lock
  </ContextMenuItem>
)}

// Lock option - grayed out when tube is unlocked but user CANNOT lock
{!tube.isLocked && !canLock && (
  <ContextMenuItem disabled className="text-gray-400">
    <Lock className="w-4 h-4 mr-2" />
    Lock
  </ContextMenuItem>
)}

// Unlock option - shown when tube is locked and user CAN unlock (owner or admin)
{tube.isLocked && canUnlock && (
  <ContextMenuItem onClick={handleUnlock}>
    <Unlock className="w-4 h-4 mr-2" />
    Unlock
  </ContextMenuItem>
)}

// Unlock option - grayed out when tube is locked by someone else
{tube.isLocked && !canUnlock && (
  <ContextMenuItem disabled className="text-gray-400">
    <Lock className="w-4 h-4 mr-2" />
    Locked by {tube.lockedByUsername}
  </ContextMenuItem>
)}
```

**Context Menu Lock State Logic:**

| Tube State | User Context | Menu Item | State |
|------------|--------------|-----------|-------|
| Unlocked | In own space or common | "Lock" | Enabled |
| Unlocked | In another's space | "Lock" | Grayed out |
| Locked by self | Any | "Unlock" | Enabled |
| Locked by other | Regular user | "Locked by [name]" | Grayed out |
| Locked by other | Admin | "Unlock" | Enabled |

**Batch Selection:** When multiple tubes are selected, context menu shows:
- "Lock (X tubes)" - if any selected tubes can be locked
- "Unlock (X tubes)" - if user owns locks on any selected tubes

---

#### Keyboard Shortcut: Shift+L

**Implementation:** Add to existing keyboard handler in TubeGrid

```typescript
// In TubeGrid keyboard handler
const handleKeyDown = (e: KeyboardEvent) => {
  // ... existing handlers ...

  // Shift+L: Toggle lock on selected tubes
  if (e.shiftKey && e.key === 'L') {
    e.preventDefault();
    handleToggleLock();
  }
};

const handleToggleLock = () => {
  if (selectedTubeIds.length === 0) return;

  const selectedTubes = tubes.filter(t => selectedTubeIds.includes(t.id));

  // Determine action based on majority state
  const lockedCount = selectedTubes.filter(t => t.isLocked && t.lockedBy === currentUserId).length;
  const unlockableCount = selectedTubes.filter(t => !t.isLocked && canLockTube(t)).length;

  if (lockedCount > 0) {
    // Unlock tubes owned by current user
    handleUnlockTubes(selectedTubes.filter(t => t.isLocked && t.lockedBy === currentUserId));
  } else if (unlockableCount > 0) {
    // Lock unlocked tubes user can lock
    openLockModal(selectedTubes.filter(t => !t.isLocked && canLockTube(t)));
  }
};
```

---

#### Lock Indicator (for grid cells)

**File:** `client/src/domains/tubes/ui/components/LockIndicator.tsx` (NEW)

**Key Principle:** Lock icons are shown on tubes that are **locked OUT from you** (you don't have access). This clearly indicates which tubes you cannot interact with. Tubes you CAN access (unlocked, or locked by you, or shared with you) do NOT show a lock icon.

```typescript
import React from 'react';
import { Lock } from 'lucide-react';
import type { TubeData } from '@odysseus/shared-schemas';

interface LockIndicatorProps {
  tube: TubeData;
  currentUserId: string;
  isAdmin: boolean;
}

export const LockIndicator: React.FC<LockIndicatorProps> = ({
  tube,
  currentUserId,
  isAdmin
}) => {
  // Admins always have access - no lock shown
  if (isAdmin) return null;

  // Not locked - no indicator needed
  if (!tube.isLocked) return null;

  // User owns the lock - they have access, no indicator
  if (tube.lockedBy === currentUserId) return null;

  // User has shared access - they have access, no indicator
  if (tube.sharedWithUserIds?.includes(currentUserId)) return null;

  // Locked OUT from this user - show lock icon
  return (
    <div
      className="absolute bottom-0.5 left-0.5 text-red-500"
      title={`Locked by ${tube.lockedByUsername}`}
    >
      <Lock className="w-3 h-3" aria-hidden="true" />
    </div>
  );
};
```

**Lock Icon Visibility Rules:**

| Tube State | Icon Shown? | Visual Effect | Why |
|------------|-------------|---------------|-----|
| Unlocked | No | Normal | You have access |
| Locked by you | No | Normal | You have access (you own the lock) |
| Shared with you | No | Normal | You have access (shared) |
| Locked by someone else (no access) | Yes (red lock, bottom-left) | Dimmed | You're locked out |
| Admin viewing any lock | No | Normal | Admins always have access |

**Tooltip:** Hovering over the lock icon shows "Locked by [username]" so the user knows who to contact for access.

**Dimming Effect:** In addition to the lock icon, tubes that are locked out should be visually dimmed (reduced opacity) to make it immediately clear which tubes are inaccessible.

```typescript
// In TubeCell component
const isLockedOut = tube.isLocked &&
  tube.lockedBy !== currentUserId &&
  !tube.sharedWithUserIds?.includes(currentUserId) &&
  !isAdmin;

<div className={`tube-cell ${isLockedOut ? 'opacity-50' : ''}`}>
  {/* tube content */}
  <LockIndicator tube={tube} currentUserId={currentUserId} isAdmin={isAdmin} />
</div>
```

**Note:** Racks and boxes do NOT show lock icons. Resource assignment already implies protection - if a box is assigned to someone, others can't access it. No additional lock indicator needed.

---

#### Lock Tubes Modal (for adding notes)

**File:** `client/src/domains/tubes/ui/components/LockTubesModal.tsx` (NEW)

Opened when user initiates lock via context menu or keyboard shortcut.

**Modal Contents:**
- Header: "Lock [X] Tube(s)"
- Text input for lock note (optional, max 100 chars, placeholder: "e.g., Project X - Donor 123")
- Character counter showing remaining chars
- Count of tubes being locked
- Buttons: "Lock" (primary) / "Cancel" (secondary)

```typescript
interface LockTubesModalProps {
  tubeIds: string[];
  onConfirm: (lockNote?: string) => void;
  onCancel: () => void;
}
```

---

#### ShareAccessModal (Universal)

**File:** `client/src/shared/ui/components/ShareAccessModal.tsx` (NEW)

A single, reusable modal for sharing access to **both tubes and containers**. This modal is opened from multiple entry points.

**Modal Contents:**
- Header: Dynamic based on context
  - "Share Access to [X] Tube(s)"
  - "Share Access to [Box/Rack Name]"
- Multi-select dropdown of active users (excluding current user)
- List of currently shared users with remove (X) buttons
- Buttons: "Save" (primary) / "Cancel" (secondary)

```typescript
interface ShareAccessModalProps {
  resourceType: 'tube' | 'box' | 'rack';
  resourceIds: string[];           // For tubes: array of tube IDs; for container: single ID in array
  resourceName?: string;           // Display name (e.g., "Box A" or "3 tubes")
  currentSharedUserIds: string[];  // Users already shared with
  onSave: (userIds: string[]) => void;
  onCancel: () => void;
}
```

---

#### Tube Sharing - Entry Points

Users can share access to their locked tubes via **three entry points** (same pattern as edit/delete/copy/cut):

**1. Context Menu:**
Add "Share Access" option to tube context menu (only shown when user owns the lock on selected tubes)

```typescript
// In TubeContextMenu - add after Lock/Unlock options
{hasOwnedLocksInSelection && (
  <ContextMenuItem onClick={handleShareAccess}>
    <Share className="w-4 h-4 mr-2" />
    Share Access
  </ContextMenuItem>
)}
```

**2. Dashboard Buttons:**
Add "Share" button to tube action toolbar (enabled when selection contains tubes user has locked)

**3. Keyboard Shortcut:**
`Shift+S` opens ShareAccessModal for selected tubes (only tubes user owns locks on)

---

#### Container Sharing - Entry Point

**File:** `client/src/domains/storage/ui/components/modals/BoxRow.tsx` (UPDATE)
**File:** `client/src/domains/storage/ui/components/modals/RackRow.tsx` (UPDATE)

Add a "Share" button next to the custom label button:

```typescript
// In BoxRow.tsx / RackRow.tsx - add to action buttons area
{isAssignedToCurrentUser && (
  <button
    type="button"
    onClick={() => openShareModal(box.id)}
    className="p-1.5 rounded hover:bg-gray-100"
    aria-label="Share access to this box"
    title="Share access with other users"
  >
    <Share className="w-4 h-4 text-gray-500" />
  </button>
)}
```

**Icon:** Lucide `Share` (NOT `Share2`)

**Visibility:** Only shown when the container is assigned to the current user.

---

#### Container Sharing - Backend

**No new API endpoints needed.** Container sharing uses the existing configuration save infrastructure:

1. `sharedWithUserIds` is added to the Equipment schema (Box/Rack configuration)
2. When user updates sharing via ShareAccessModal, frontend updates the Zustand store
3. Frontend calls existing `useSaveStorageMutation()` / configuration save endpoint
4. Backend's existing `UpdateConfigurationCommandHandler` validates and saves
5. Existing `ConfigurationChangeDetector` detects the change and emits events
6. Audit logging captures the share/revoke action (see Audit Trail section)
7. Existing Socket integration broadcasts to all clients

This follows the same pattern as `assignedUserId` and `customLabel` - container sharing is a configuration change, not a separate domain operation.

---

#### Tube Sharing Use Case

**Scenario:** Bob has Rack 1 assigned to him. Alice needs access to 5 specific tubes in Bob's Box A, but Bob doesn't want to give Alice access to the entire box.

**Solution:**
1. Bob selects the 5 tubes Alice needs
2. Bob locks them (if not already locked) via context menu or `Shift+L`
3. Bob opens ShareAccessModal via context menu "Share Access" or `Shift+S`
4. Bob selects Alice from the user dropdown
5. Alice can now edit/move those 5 specific tubes, but NOT other tubes in Bob's box

---

### Batch Operations Behavior

#### Mixed Lock State Handling

When performing batch operations (edit, delete, move) on a selection that includes locked tubes:

1. **Filter:** Separate locked (inaccessible) tubes from unlocked (accessible) tubes
2. **Proceed:** Execute operation on accessible tubes only
3. **Notify:** Show toast notification explaining the partial operation

**Notification Examples:**

```typescript
// Batch edit with some locked tubes
toast.info(`Edited ${successCount} tubes. ${lockedCount} locked tubes were skipped.`);

// Batch delete with some locked tubes
toast.info(`Deleted ${successCount} tubes. ${lockedCount} locked tubes were skipped.`);

// Batch move with some locked tubes
toast.info(`Moved ${successCount} tubes. ${lockedCount} locked tubes were skipped.`);
```

**No blocking errors** - the operation succeeds for what it can, and informs the user about what was skipped.

---

### Integration Points

#### TubeGrid Updates

- Show `LockIndicator` (red lock icon, bottom-left) on tubes **locked out from you** (locked by others, no shared access)
- Apply dimming effect (opacity-50) to locked-out tubes for clear visual distinction
- Tooltip on lock icon shows "Locked by [username]" so user knows who to contact
- Disable double-click edit on tubes you don't have access to (locked by others, or in others' assigned space)
- Right-click context menu includes Lock/Unlock options
- Keyboard shortcut `Shift+L` toggles lock on selection

#### TubeEditorModal Updates

- Check if tube is locked before allowing edit
- **If locked out (locked by someone else, no shared access):**
  - Show warning banner: "This tube is locked by [name]. You cannot edit it."
  - Disable all form fields
  - Hide save button (read-only mode)
- **If user has access (owns lock, has shared access, or is admin):**
  - Normal edit mode, no warnings

**Note:** The TubeEditorModal shows a warning banner for locked-out tubes because the user is attempting an action. This is different from the Tube Info Panel which is passive viewing.

#### Tube Info Panel Updates

The Tube Info Panel shows lock information for **all locked tubes** (not just your own), since this is passive viewing and users need to know the lock status.

**When viewing a locked tube:**

```
┌─────────────────────────────────┐
│ 🔒 Locked by [username]         │
│ Note: Project X - Donor 123     │  (if note present)
│ Since: Jan 15, 2025             │
│ Shared with: Bob, Alice         │  (if shared)
└─────────────────────────────────┘
```

- Lock icon (`Lock` from Lucide) displayed prominently
- "Locked by [username]" text (shows actual owner name)
- Lock note (if present)
- Lock timestamp
- List of shared users (if any)

**When viewing an unlocked tube:** No lock section shown.

**Edit actions in info panel:** Disabled if user doesn't have access (locked out or not in assigned space).

#### Storage Management Modal Updates

- Add Share button (`Share` icon) to BoxRow and RackRow
- Only visible when container is assigned to current user

---

## Audit Trail

### Audit Actions

#### Tube Lock Actions

| Action | When Logged | Details Captured |
|--------|-------------|------------------|
| `tube_locked` | Single tube locked | tubeId, lockedBy, lockNote |
| `tubes_batch_locked` | Multiple tubes locked | tubeIds[], lockedBy, lockNote, count |
| `tube_unlocked` | Single tube unlocked | tubeId, unlockedBy |
| `tubes_batch_unlocked` | Multiple tubes unlocked | tubeIds[], unlockedBy, count |
| `tube_lock_admin_override` | Admin unlocks others' tube | tubeId, originalLockedBy, adminId, reason |

#### Tube Sharing Actions

| Action | When Logged | Details Captured |
|--------|-------------|------------------|
| `tube_access_shared` | Access shared to tube(s) | tubeIds[], sharedBy (userId), sharedWithUserIds[] |
| `tube_access_revoked` | Access revoked from tube(s) | tubeIds[], revokedBy (userId), revokedUserIds[] |

#### Container Sharing Actions

| Action | When Logged | Details Captured |
|--------|-------------|------------------|
| `box_access_shared` | Access shared to box | boxId, boxName, sharedBy (userId), sharedWithUserIds[] |
| `box_access_revoked` | Access revoked from box | boxId, boxName, revokedBy (userId), revokedUserIds[] |
| `rack_access_shared` | Access shared to rack | rackId, rackName, sharedBy (userId), sharedWithUserIds[] |
| `rack_access_revoked` | Access revoked from rack | rackId, rackName, revokedBy (userId), revokedUserIds[] |

### Audit Log Integration

Uses existing `audit_log` table structure. No schema changes needed.

**Container sharing audit:** Since container sharing uses the existing configuration save flow, the `ConfigurationChangeDetector` should detect changes to `sharedWithUserIds` and emit appropriate events that trigger audit logging.

---

## Implementation Phases

### Phase 1: Schema & Database (Day 1)

**Tasks:**
1. Add lock fields to `tubeSchemas.ts` in shared-schemas
2. Add `sharedWithUserIds` to equipment schemas
3. Create `tubeLockSchemas.ts` for API requests
4. Update shared-schemas barrel exports
5. Rebuild shared-schemas package
6. Add columns to tubes table (SQL migration)
7. Create indexes

**Deliverables:**
- Updated shared-schemas with lock types
- Database migration script
- Passing TypeScript compilation

### Phase 2: Domain & Access Control (Day 1-2)

**Tasks:**
1. Update Tube entity with lock fields and methods
2. Update TubeMapper for new fields
3. Add lock-related methods to AccessControlService
4. Write unit tests for access control logic

**Deliverables:**
- Tube entity with locking capability
- Complete access control rules
- Unit tests passing

### Phase 3: Application Services & API (Day 2-3)

**Tasks:**
1. Add lock/unlock/share methods to TubeApplicationService
2. Update existing updateTube() to check lock status
3. Create TubeLockRouteModule with new endpoints
4. Add WebSocket events for lock changes
5. Integrate with audit logging
6. Write integration tests

**Deliverables:**
- Working API endpoints
- Real-time sync via WebSocket
- Audit trail for all lock operations
- Integration tests passing

### Phase 4: Frontend - Core (Day 3-4)

**Tasks:**
1. Add lock mutations to useTubeLockMutations.ts
2. Update TubeService with lock API calls
3. Create LockIndicator component for tube grid cells
4. Create LockTubesModal for adding notes when locking
5. Wire up Socket.IO query bridge for lock events

**Deliverables:**
- Lock/unlock functionality working
- Visual indicators on locked tubes
- Real-time sync on frontend

### Phase 5: Frontend - Integration (Day 4-5)

**Tasks:**
1. Add Lock/Unlock options to existing TubeContextMenu
2. Implement `Shift+L` keyboard shortcut for lock toggle
3. Integrate lock checks into TubeGrid (disable edit for inaccessible tubes)
4. Integrate lock checks into TubeEditorModal (read-only mode)
5. Update tube info panel to show lock details (for all locked tubes)
6. Implement batch operation filtering (skip locked tubes with notification)
7. Create universal ShareAccessModal (shared/ui/components)
8. Add "Share Access" to context menu, dashboard buttons, and `Shift+S` shortcut for tubes
9. Add Share button to BoxRow/RackRow in Storage Management Modal

**Deliverables:**
- Context menu Lock/Unlock working
- Keyboard shortcuts working (`Shift+L` lock, `Shift+S` share)
- Complete UI integration
- Batch operations with partial success + notifications
- Share access working for both tubes and containers via single ShareAccessModal

### Phase 6: Testing & Polish (Day 5)

**Tasks:**
1. End-to-end testing of all lock scenarios
2. Test permission denied cases
3. Test admin override functionality
4. Test user deletion cleanup
5. UI polish (icons, colors, tooltips)
6. Documentation updates

**Deliverables:**
- All tests passing
- Polished UI
- Updated documentation

---

## Testing Strategy

### Unit Tests

**AccessControlService:**
- `canEditTube` - all permission combinations
- `canLockTube` - own space, common space, others' space
- `canUnlockTube` - owner, admin, others
- `canMoveTubeTo` - locked tubes, container permissions

**Tube Entity:**
- `lock()` - already locked error
- `unlock()` - not locked error
- `shareWith()` - adds users correctly
- `revokeAccess()` - removes users correctly

### Integration Tests

**API Endpoints:**
- POST /api/tubes/lock - success, already locked, permission denied
- POST /api/tubes/unlock - success, not locked, permission denied
- POST /api/tubes/share - success, not owner
- POST /api/tubes/revoke - success, not owner

### E2E Scenarios

1. User locks tube in own space → success
2. User locks tube in common space → success
3. User locks tube in others' space → denied
4. User edits own locked tube → success
5. User edits others' locked tube → denied
6. User with shared access edits locked tube → success
7. Admin overrides lock → success with audit
8. User moves locked tube to own space → success
9. User moves locked tube to others' space → denied
10. User deletion → all locks released

---

## Resolved Design Decisions

The following questions were resolved during planning:

| Question | Decision |
|----------|----------|
| **Container sharing UI** | Share button (`Share` icon) on BoxRow/RackRow in Storage Management Modal |
| **Container sharing backend** | Uses existing configuration save endpoint (no new API) |
| **Tube sharing UI** | Context menu + dashboard button + `Shift+S` keyboard shortcut |
| **Tube locking UI** | Context menu + `Shift+L` keyboard shortcut |
| **Share modal** | Single universal ShareAccessModal for both tubes and containers |
| **Lock expiration** | No auto-expiration - locks persist until manually unlocked |
| **Batch ops with mixed locks** | Partial success - accessible tubes processed, locked tubes skipped with toast notification |
| **Lock icon visibility** | Red lock icon (bottom-left) shown on tubes **locked OUT from you** (no access) |
| **Locked-out tube styling** | Dimmed (opacity-50) + red lock icon + tooltip showing owner |
| **Lock icon on containers** | Not needed - assignment implies protection |
| **sharedWithUserIds on unlock** | Auto-cleared when tube is unlocked |
| **Tube Info Panel** | Shows lock info for ALL locked tubes (passive viewing context) |
| **TubeEditorModal** | Shows warning banner only when locked OUT (action context) |

---

## Appendix: Comparison with Original Plan

| Aspect | Original Plan v1 | This Plan v2 |
|--------|------------------|--------------|
| Container locking | Separate lock table, explicit lock/unlock | Not needed - assignment IS protection |
| Lock storage | New `locks` table | Fields on tube record |
| Lock types | Exclusive, Shared, Temporary | Single type (simpler) |
| Lock expiration | Built-in timer system | Not included (can add later) |
| Complexity | High (6-8 days) | Medium (3-5 days) |
| New tables | 2 (locks, lock_shares) | 0 |
| New API endpoints | 10+ | 4 |

---

**Status:** Draft - Pending Final Review

**Next Steps:**
1. Final review and approval of this plan
2. Begin Phase 1 implementation (Schema & Database)
