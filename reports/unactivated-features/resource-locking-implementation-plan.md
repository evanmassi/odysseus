# Resource Locking & Ownership System - Implementation Plan

**Date:** 2025-01-17 (Updated: 2025-01-17)
**Status:** 📋 **Planning Phase - Ready for Implementation**
**Complexity:** High (6-8 days estimated)
**Priority:** Medium

---

## Executive Summary

This document outlines a comprehensive plan to implement a **hierarchical resource locking and ownership system** for Odysseus inventory management. The system will allow **users** (not researchers) to claim exclusive or shared ownership of racks, boxes, or individual tubes, while maintaining full administrative oversight and audit trails.

**Core Principle:** Balance user autonomy with administrative authority - users manage their assigned space independently, but admins retain ultimate control.

**Key Decisions:**
- ✅ **User-owned locks** - Locks owned by Users (user.id), not Researchers
- ✅ **Three-level granularity** - Can lock racks, boxes, or tubes
- ✅ **Position + entity locking** - Tube locks include both tube ID and current position
- ✅ **Full transparency** - All users can see all locks and who owns them
- ✅ **ESLint compliance enforced** - All code must pass with zero errors/warnings

---

## Table of Contents

1. [Business Requirements](#business-requirements)
2. [Existing Architecture Analysis](#existing-architecture-analysis)
3. [ESLint & Type Safety Compliance](#eslint--type-safety-compliance)
4. [Domain Model Design](#domain-model-design)
5. [Database Schema Design](#database-schema-design)
6. [Backend Implementation Plan](#backend-implementation-plan)
7. [Frontend Implementation Plan](#frontend-implementation-plan)
8. [Integration Points](#integration-points)
9. [Edge Cases & Business Rules](#edge-cases--business-rules)
10. [Security & Audit Trail](#security--audit-trail)
11. [Implementation Phases](#implementation-phases)
12. [Testing Strategy](#testing-strategy)
13. [Decisions Confirmed](#decisions-confirmed)

---

## Business Requirements

### Functional Pillars

#### 1. User Autonomy
- **Users** (not researchers) can claim ownership of racks, boxes, or tubes
- Ownership grants **exclusive modification rights** (only owner and admins can edit)
- Users can **voluntarily release** ownership
- Users can **share access** with specific collaborators
- **Resource ownership assignment** - Mechanism to assign whole racks/boxes to specific users
- **Unassigned resources** default to admin ownership

#### 2. Administrative Oversight
- Admins have **global visibility** of all resources (locked or unlocked)
- Admins can **override any lock** without owner permission
- All admin overrides **generate audit log entries** with required reason
- Admins can **view lock status** and ownership history
- Admins can **assign ownership** of racks/boxes to users

#### 3. Hierarchical Control
- Operates on hierarchy: **Tank → Rack → Box → Tube**
- Locks **cascade downward** (locking a rack locks all boxes and tubes within)
- Locks **do not cascade upward** (locking a tube doesn't lock the box)
- Users can lock at any granularity level
- **User-owned rack** → full control of locking everything within

#### 4. Visibility Rules
- Locked resources remain **visible to all users** (read-only for non-owners)
- Visual indicators show **who owns what** (badges, icons, tooltips)
- Lock status displayed in grids, navigation, and detail panels
- **Full transparency** - all users see all locks

#### 5. Collaboration & Sharing
- **Temporary locks** expire automatically after set duration (optional)
- **Shared access** allows co-ownership with specific users
- Shared access: **simple boolean** - read-only or full modify
- Owner can **revoke shared access** at any time

#### 6. Auditability
- Every lock/unlock action creates audit record
- Every share/revoke action creates audit record
- Every admin override creates audit record (with required reason)
- Audit trail shows **who-touched-what-when**
- Uses existing `audit_log` and `audit_log_archive` tables

#### 7. Conflict Resolution
Priority order for conflicts:
1. **Admin action** (highest priority)
2. **Existing lock owner** (second priority)
3. **First claim in time** (tie-breaker)

#### 8. Movement & Position Locking
- **Tube locks include position** - Locking a tube locks both entity ID and current position
- **Lock follows tube** when moved between owner's boxes
- **Movement INTO locked box** - Only allowed if you own the box lock
- **Movement OF locked tube** - Only allowed if you own the tube lock
- **Same-owner movement** - Can move locked tubes freely between own locked boxes
- **Cross-owner blocking** - User Y cannot move tubes into User X's locked boxes

---

## Existing Architecture Analysis

### What We Already Have (Reusable Components)

#### 1. Audit Logging System ✅
**Location:** `server/src/infrastructure/database/SQLiteContext.ts` (lines 138-172)

**Tables:**
- `audit_log` - Hot storage (recent activity)
- `audit_log_archive` - Warm storage (90+ day archive)

**Fields:**
```sql
id, userId, username, action, entityType, entityId,
details (JSON), timestamp, ipAddress, userAgent
```

**Reuse Strategy:**
- Use existing audit tables for lock operations
- Add new action types: `lock_created`, `lock_released`, `lock_shared`, `lock_overridden`, `lock_expired`
- Store lock details in `details` JSON field
- No new audit tables needed ✅

**Repository:** `SQLiteAuditRepository.ts` - Already implemented

---

#### 2. Access Control System ✅
**Location:** `server/src/domain/services/AccessControlService.ts`

**Current Capabilities:**
- Role-based permissions (admin, user)
- Resource ownership checks (tube.researcherId)
- Permission enforcement patterns (`canEdit`, `requireEdit`)
- Admin override capabilities

**Integration Points:**
```typescript
// Existing methods to extend
async canEditTube(user: User, tube: Tube): Promise<AccessResult>
async canDeleteTube(user: User, tube: Tube): Promise<AccessResult>
async canMoveTube(user: User, tube: Tube, location?: Location): Promise<AccessResult>

// New methods to add
async canLockResource(user: User, resourceType: string, resourceId: string): Promise<AccessResult>
async canUnlockResource(user: User, lock: Lock): Promise<AccessResult>
async canShareLock(user: User, lock: Lock): Promise<AccessResult>
async requireLockAccess(user: User, lock: Lock, operation: string): Promise<void>
```

**Reuse Strategy:**
- Extend AccessControlService with lock-aware methods
- Integrate lock checks into existing tube operation methods
- Use existing PermissionError patterns
- Maintain consistency with RBAC model

---

#### 3. Database Infrastructure ✅
**Pattern:** `SQLiteContext.createTables()` + Mapper + Repository

**Existing Patterns to Follow:**
- Table creation in `SQLiteContext.ts`
- Mappers in `infrastructure/database/mappers/`
- Repositories in `infrastructure/repositories/`
- Factory pattern in `RepositoryFactory`

**Foreign Key Support:** Already used for tubes.researcherId, users.personId, etc.

**Reuse Strategy:**
- Add lock tables to `createTables()` method
- Create `LockMapper.ts` following `TubeMapper.ts` pattern
- Create `SQLiteLockRepository.ts` following `SQLiteTubeRepository.ts` pattern
- Add to `RepositoryFactory.getLockRepository()`

---

#### 4. Real-Time Updates (Socket.IO) ✅
**Location:** `server/src/infrastructure/socket/` + `client/src/infrastructure/socket/`

**Existing Events:**
- `tube_created`, `tube_updated`, `tube_deleted`
- `researcher_created`, `researcher_updated`, `researcher_deleted`
- `configuration_updated`

**Reuse Strategy:**
- Add new events: `lock_created`, `lock_released`, `lock_shared`, `lock_overridden`
- Use existing query bridge pattern to invalidate React Query cache
- Frontend auto-updates when locks change

---

#### 5. React Query Infrastructure ✅
**Location:** `client/src/app/queryKeys.ts` + domain hooks

**Existing Patterns:**
- Centralized query keys factory
- Domain-specific hooks (useTubesQuery, useResearchersQuery)
- Mutation hooks with optimistic updates
- Socket.IO query bridge

**Reuse Strategy:**
- Add `queryKeys.locks` section
- Create `useLocksQuery()`, `useLockMutations()` hooks
- Use existing optimistic update patterns
- Integrate with socket events for real-time sync

---

### What We Need to Build (New Components)

#### 1. Domain Layer (NEW)
- `Lock` entity
- `LockScope`, `LockType`, `LockStatus` value objects
- **`ResourceIdentifier` value object** - Handles composite resource IDs
- `LockingService` domain service
- `OwnershipService` domain service
- `LockRepository` interface
- **Domain events** - `LockCreatedEvent`, `LockReleasedEvent`, etc.

#### 2. Infrastructure Layer (NEW)
- `LockMapper` - DB row ↔ domain entity
- `SQLiteLockRepository` - Data access implementation
- Lock table creation in SQLiteContext
- Background job for lock expiration

#### 3. Application Layer (NEW)
- `LockApplicationService` - Use case orchestration
- `LockDto` - Data transfer objects
- Domain event handlers (optional)

#### 4. Presentation Layer (NEW)
- `LockController` - HTTP API
- Lock routes in route modules
- WebSocket events for lock updates

#### 5. Frontend (NEW)
- `domains/locks/` - New domain
- `LockService` - API client
- `useLockQuery`, `useLockMutations` - React Query hooks
- UI components: `LockBadge`, `LockModal`, `ShareAccessModal`

---

## ESLint & Type Safety Compliance

**CRITICAL:** All code must pass ESLint with **zero errors and zero warnings**. The following rules are strictly enforced.

### Enforced ESLint Rules

#### 1. @typescript-eslint/no-floating-promises (ERROR)
**Rule:** Every async call MUST be awaited or explicitly handled

```typescript
// ❌ WRONG - Floating promise
someAsyncFunction();

// ✅ CORRECT - Awaited
await someAsyncFunction();

// ✅ CORRECT - Explicitly handled
void someAsyncFunction().catch(error => {
  logger.error('Failed:', error);
});
```

---

#### 2. @typescript-eslint/consistent-type-imports (ERROR)
**Rule:** Use `import type` for type-only imports

```typescript
// ❌ WRONG
import { LockData } from '@odysseus/shared-schemas';

// ✅ CORRECT
import type { LockData } from '@odysseus/shared-schemas';
```

---

#### 3. @typescript-eslint/no-explicit-any (WARN)
**Rule:** Avoid `any` - use proper types or `unknown`

```typescript
// ❌ WRONG
function handleError(error: any): void {
  console.log(error.message);
}

// ✅ CORRECT
function handleError(error: unknown): void {
  if (error instanceof Error) {
    console.log(error.message);
  }
}
```

---

#### 4. TypeScript Strict Mode - Explicit Return Types
**Rule:** All functions must have explicit return types

```typescript
// ❌ WRONG - No return type
async function createLock(request) {
  return lockRepository.create(request);
}

// ✅ CORRECT - Explicit return type
async function createLock(request: CreateLockRequest): Promise<Lock> {
  return lockRepository.create(request);
}
```

---

#### 5. jsx-a11y/click-events-have-key-events (ERROR)
**Rule:** Interactive elements need keyboard support

```typescript
// ❌ WRONG - Missing keyboard handler
<div onClick={handleClick}>Lock Resource</div>

// ✅ CORRECT - Full accessibility
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
  aria-label="Lock resource"
>
  Lock Resource
</div>
```

---

#### 6. jsx-a11y/no-static-element-interactions (ERROR)
**Rule:** Use semantic HTML for interactive elements

```typescript
// ❌ WRONG - div with onClick
<div onClick={handleDelete} className="delete-button">Delete</div>

// ✅ CORRECT - button element
<button onClick={handleDelete} className="delete-button" aria-label="Delete lock">
  Delete
</button>
```

---

#### 7. import/order (ERROR)
**Rule:** Strict import ordering with newlines between groups

```typescript
// ❌ WRONG - Unordered imports
import { Lock } from '../entities/Lock';
import React from 'react';
import type { LockData } from '@odysseus/shared-schemas';
import { useState } from 'react';

// ✅ CORRECT - Ordered imports
import React, { useState } from 'react';

import type { LockData } from '@odysseus/shared-schemas';

import { Lock } from '../entities/Lock';
```

**Order:** builtin → external → internal → parent → sibling → type

---

#### 8. no-console (WARN)
**Rule:** No console statements in production code

```typescript
// ❌ WRONG
console.log('Lock created:', lock.id);

// ✅ CORRECT - Use proper logging
logger.info('Lock created:', { lockId: lock.id });
```

---

### Required Patterns for Implementation

#### Pattern 1: Async Function with Audit
```typescript
async function createLock(
  request: CreateLockRequest,
  user: User
): Promise<LockDto> {
  const lock = await this.lockingService.createLock(
    request.resourceType,
    request.resourceId,
    user.id,
    request.lockType,
    request.expiresAt
  );

  await this.lockRepository.create(lock);

  await this.auditRepository.create({
    userId: user.id,
    username: user.username,
    action: 'lock_created',
    entityType: request.resourceType,
    entityId: request.resourceId,
    details: JSON.stringify({
      lockId: lock.id,
      lockType: request.lockType
    }),
    timestamp: new Date().toISOString(),
    ipAddress: null,
    userAgent: null
  });

  return this.toLockDto(lock);
}
```

---

#### Pattern 2: Type-Safe Error Handling
```typescript
import type { AxiosError } from 'axios';

async function fetchLock(lockId: string): Promise<LockData | null> {
  try {
    const response = await httpClient.get<LockData>(`/api/locks/${lockId}`);
    return response.data;
  } catch (error: unknown) {
    if (this.isAxiosError(error)) {
      if (error.response?.status === 404) {
        return null;
      }
      throw new Error(error.response?.data?.message || 'Failed to fetch lock');
    }
    throw error;
  }
}

private isAxiosError(error: unknown): error is AxiosError {
  return (error as AxiosError).isAxiosError === true;
}
```

---

#### Pattern 3: Accessible React Component
```typescript
import React, { type FC, type KeyboardEvent, type MouseEvent } from 'react';

import type { LockData } from '@odysseus/shared-schemas';
import { formatLockTooltip } from '@odysseus/shared-schemas';

interface LockBadgeProps {
  lock: LockData;
  onClick?: () => void;
}

export const LockBadge: FC<LockBadgeProps> = ({ lock, onClick }) => {
  const handleClick = (e: MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation();
    onClick?.();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="lock-badge"
      aria-label={`Locked by ${lock.ownerUsername}`}
      title={formatLockTooltip(lock)}
    >
      <LockIcon className="lock-icon" aria-hidden="true" />
    </button>
  );
};
```

---

### Pre-Implementation ESLint Checklist

Before starting each phase, confirm:

- [ ] All function signatures have explicit return types
- [ ] All type imports use `import type` syntax
- [ ] No `any` types (use proper types or `unknown`)
- [ ] All async calls are awaited or explicitly handled
- [ ] All interactive UI has keyboard support (`onKeyDown`)
- [ ] All clickable divs replaced with `<button>` or semantic HTML
- [ ] All imports ordered correctly with newlines between groups
- [ ] No `console.log` statements (use logger)
- [ ] All React components have proper `aria-label` attributes
- [ ] No floating promises in event handlers

---

### Phase-Specific Success Criteria

Each phase must include:
- ✅ Code passes `npm run lint` with zero errors
- ✅ Code passes `npm run typecheck` with zero errors
- ✅ All functions have explicit return types
- ✅ All UI components pass a11y checks
- ✅ Import ordering verified

---

## Domain Model Design

### Pattern Reference

**Follow Existing Entity Pattern:** `server/src/domain/entities/Tube.ts`
- Private constructor with params object
- Static factory methods (`create()`, `fromData()`)
- Public getters for all private fields
- Business methods for state changes
- Validation in constructor

---

### Entities

#### Lock Entity
**Location:** `server/src/domain/entities/Lock.ts`

```typescript
import type { LockScope } from '../valueObjects/LockScope';
import type { LockType } from '../valueObjects/LockType';
import type { LockStatus } from '../valueObjects/LockStatus';
import { ValidationError } from '@domain/errors/ValidationError';

export class Lock {
  private constructor(
    private readonly _id: string,
    private _resourceType: LockScope,
    private _resourceId: string,
    private _ownerId: string,
    private _lockType: LockType,
    private _status: LockStatus,
    private _expiresAt: Date | undefined,
    private readonly _createdAt: Date,
    private _updatedAt: Date
  ) {
    this.validate();
  }

  // Factory method: Create new lock
  static create(data: {
    resourceType: LockScope;
    resourceId: string;
    ownerId: string;
    lockType: LockType;
    expiresAt?: Date;
  }): Lock {
    const id = Lock.generateId();
    const now = new Date();

    return new Lock(
      id,
      data.resourceType,
      data.resourceId,
      data.ownerId,
      data.lockType,
      LockStatus.active(),
      data.expiresAt,
      now,
      now
    );
  }

  // Factory method: Reconstitute from persistence
  static fromData(data: {
    id: string;
    resourceType: LockScope;
    resourceId: string;
    ownerId: string;
    lockType: LockType;
    status: LockStatus;
    expiresAt?: Date;
    createdAt: Date;
    updatedAt: Date;
  }): Lock {
    return new Lock(
      data.id,
      data.resourceType,
      data.resourceId,
      data.ownerId,
      data.lockType,
      data.status,
      data.expiresAt,
      data.createdAt,
      data.updatedAt
    );
  }

  private static generateId(): string {
    return 'lock_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private validate(): void {
    if (!this._id || this._id.trim().length === 0) {
      throw new ValidationError('Lock ID is required');
    }

    if (this._lockType.isTemporary() && !this._expiresAt) {
      throw new ValidationError('Temporary locks must have expiration time');
    }

    if (this._createdAt > this._updatedAt) {
      throw new ValidationError('Created date cannot be after updated date');
    }
  }

  // Domain methods
  isOwnedBy(userId: string): boolean {
    return this._ownerId === userId;
  }

  isExpired(): boolean {
    if (!this._expiresAt) return false;
    return new Date() > this._expiresAt;
  }

  canBeAccessedBy(userId: string, sharedUserIds: string[]): boolean {
    return this.isOwnedBy(userId) || sharedUserIds.includes(userId);
  }

  expire(): void {
    this.validateNotExpired();
    this._status = LockStatus.expired();
    this._updatedAt = new Date();
  }

  release(): void {
    this._status = LockStatus.released();
    this._updatedAt = new Date();
  }

  extend(newExpiresAt: Date): void {
    if (!this._lockType.isTemporary()) {
      throw new ValidationError('Cannot extend non-temporary lock');
    }
    if (newExpiresAt <= new Date()) {
      throw new ValidationError('New expiration must be in the future');
    }
    this._expiresAt = newExpiresAt;
    this._updatedAt = new Date();
  }

  // Business rules
  validateNotExpired(): void {
    if (this.isExpired()) {
      throw new Error(`Lock ${this._id} has expired`);
    }
  }

  validateOwnership(userId: string): void {
    if (!this.isOwnedBy(userId)) {
      throw new Error(`User ${userId} does not own lock ${this._id}`);
    }
  }

  // Getters (immutable access)
  get id(): string {
    return this._id;
  }

  get resourceType(): LockScope {
    return this._resourceType;
  }

  get resourceId(): string {
    return this._resourceId;
  }

  get ownerId(): string {
    return this._ownerId;
  }

  get lockType(): LockType {
    return this._lockType;
  }

  get status(): LockStatus {
    return this._status;
  }

  get expiresAt(): Date | undefined {
    return this._expiresAt;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }
}
```

**Invariants:**
- Lock must have valid resource type (rack, box, tube)
- Lock must have owner (userId foreign key)
- Temporary locks must have expiration date
- Expired locks cannot be used for access control

---

### Value Objects

#### ResourceIdentifier (NEW)
**Location:** `server/src/domain/valueObjects/ResourceIdentifier.ts`

**Purpose:** Encapsulates composite resource ID parsing and hierarchy resolution

```typescript
export class ResourceIdentifier {
  private static readonly DELIMITER = '|';

  private constructor(
    private readonly tankId: string,
    private readonly rackId?: string,
    private readonly boxId?: string
  ) {}

  static fromString(id: string): ResourceIdentifier {
    const parts = id.split(this.DELIMITER);

    if (parts.length === 1) {
      throw new Error('Invalid resource ID: must include tankId and at least rackId');
    }

    const [tankId, rackId, boxId] = parts;
    return new ResourceIdentifier(tankId, rackId, boxId);
  }

  static forRack(tankId: string, rackId: string): ResourceIdentifier {
    return new ResourceIdentifier(tankId, rackId);
  }

  static forBox(tankId: string, rackId: string, boxId: string): ResourceIdentifier {
    return new ResourceIdentifier(tankId, rackId, boxId);
  }

  toString(): string {
    const parts = [this.tankId, this.rackId, this.boxId].filter(Boolean);
    return parts.join(ResourceIdentifier.DELIMITER);
  }

  isRack(): boolean {
    return !!this.rackId && !this.boxId;
  }

  isBox(): boolean {
    return !!this.boxId;
  }

  getParentId(): string | null {
    if (this.isBox()) {
      return ResourceIdentifier.forRack(this.tankId, this.rackId!).toString();
    }
    if (this.isRack()) {
      return null; // Rack is top level
    }
    return null;
  }

  getTankId(): string {
    return this.tankId;
  }

  getRackId(): string | undefined {
    return this.rackId;
  }

  getBoxId(): string | undefined {
    return this.boxId;
  }
}
```

**Why This Works:**
- ✅ Encapsulates composite ID format (`Tank1|R3|B5`)
- ✅ Single responsibility (parsing and hierarchy logic)
- ✅ No string manipulation scattered across codebase
- ✅ Type-safe access to ID components
- ✅ Clean Architecture compliant (value object pattern)

**Usage Example:**
```typescript
const boxId = ResourceIdentifier.forBox('Tank1', 'R3', 'B5');
console.log(boxId.toString()); // "Tank1|R3|B5"

const parentId = boxId.getParentId(); // "Tank1|R3"
```

---

#### LockScope (Resource Type)
**Location:** `server/src/domain/valueObjects/LockScope.ts`
**Pattern:** Follow existing value object pattern (see `UserRole.ts`)

```typescript
import { ValidationError } from '@domain/errors/ValidationError';

export class LockScope {
  private static readonly VALID_SCOPES = ['rack', 'box', 'tube'] as const;

  private constructor(private readonly value: string) {
    this.validate();
  }

  // Factory method matching existing pattern (not fromString)
  static create(value: string): LockScope {
    return new LockScope(value);
  }

  static rack(): LockScope {
    return new LockScope('rack');
  }

  static box(): LockScope {
    return new LockScope('box');
  }

  static tube(): LockScope {
    return new LockScope('tube');
  }

  private validate(): void {
    if (!LockScope.VALID_SCOPES.includes(this.value as any)) {
      throw new ValidationError(`Invalid lock scope: ${this.value}`);
    }
  }

  isRack(): boolean {
    return this.value === 'rack';
  }

  isBox(): boolean {
    return this.value === 'box';
  }

  isTube(): boolean {
    return this.value === 'tube';
  }

  getHierarchyLevel(): number {
    const levels = { rack: 1, box: 2, tube: 3 };
    return levels[this.value as keyof typeof levels];
  }

  toString(): string {
    return this.value;
  }
}
```

---

#### LockType
**Location:** `server/src/domain/valueObjects/LockType.ts`

```typescript
export class LockType {
  private static readonly VALID_TYPES = ['exclusive', 'shared', 'temporary'] as const;

  private constructor(private readonly value: string) {}

  static exclusive(): LockType {
    return new LockType('exclusive');
  }

  static shared(): LockType {
    return new LockType('shared');
  }

  static temporary(): LockType {
    return new LockType('temporary');
  }

  isExclusive(): boolean {
    return this.value === 'exclusive';
  }

  isShared(): boolean {
    return this.value === 'shared';
  }

  isTemporary(): boolean {
    return this.value === 'temporary';
  }

  requiresExpiry(): boolean {
    return this.isTemporary();
  }

  toString(): string {
    return this.value;
  }
}
```

---

#### LockStatus
**Location:** `server/src/domain/valueObjects/LockStatus.ts`

```typescript
export class LockStatus {
  private static readonly VALID_STATUSES = ['active', 'expired', 'released'] as const;

  private constructor(private readonly value: string) {}

  static active(): LockStatus {
    return new LockStatus('active');
  }

  static expired(): LockStatus {
    return new LockStatus('expired');
  }

  static released(): LockStatus {
    return new LockStatus('released');
  }

  isActive(): boolean {
    return this.value === 'active';
  }

  canBeUsed(): boolean {
    return this.isActive();
  }

  toString(): string {
    return this.value;
  }
}
```

---

### Domain Events (NEW)

**Location:** `server/src/domain/events/LockEvents.ts`

```typescript
import type { DomainEvent } from './DomainEvent';

export interface LockCreatedEvent extends DomainEvent {
  type: 'LockCreated';
  lockId: string;
  resourceType: string;
  resourceId: string;
  ownerId: string;
  lockType: string;
  timestamp: Date;
}

export interface LockReleasedEvent extends DomainEvent {
  type: 'LockReleased';
  lockId: string;
  resourceType: string;
  resourceId: string;
  releasedBy: string;
  timestamp: Date;
}

export interface LockSharedEvent extends DomainEvent {
  type: 'LockShared';
  lockId: string;
  sharedWithUserId: string;
  canModify: boolean;
  sharedBy: string;
  timestamp: Date;
}

export interface LockOverriddenEvent extends DomainEvent {
  type: 'LockOverridden';
  lockId: string;
  originalOwnerId: string;
  overriddenBy: string;
  reason: string;
  timestamp: Date;
}

export interface LockExpiredEvent extends DomainEvent {
  type: 'LockExpired';
  lockId: string;
  resourceType: string;
  resourceId: string;
  timestamp: Date;
}
```

**Usage:** Emit events after state changes, allows extensibility for notifications, webhooks, etc.

---

### Domain Services

#### LockingService
**Location:** `server/src/domain/services/LockingService.ts`

**Responsibilities:**
- Create locks with validation
- Check lock ownership and access
- Handle lock expiration logic
- Resolve hierarchical lock conflicts using ResourceIdentifier
- Cascade lock queries using Configuration entity

**Methods:**
```typescript
import type { LockRepository } from '@domain/repositories/LockRepository';
import type { TubeRepository } from '@domain/repositories/TubeRepository';

export class LockingService {
  constructor(
    private lockRepository: LockRepository,
    private tubeRepository: TubeRepository
  ) {}

  async createLock(
    resourceType: string,
    resourceId: string,
    ownerId: string,
    lockType: LockType,
    expiresAt?: Date
  ): Promise<Lock> {
    // Check if resource already locked
    const existingLock = await this.lockRepository.findByResource(resourceType, resourceId);
    if (existingLock?.status === 'active') {
      throw LockError.alreadyLocked(resourceType, resourceId);
    }

    // Check parent locks (prevents child locking if parent locked)
    if (resourceType !== 'rack') {
      const parentLock = await this.getParentLock(resourceType, resourceId);
      if (parentLock?.status === 'active') {
        throw new LockError(
          `Cannot lock ${resourceType} because parent ${parentLock.resourceType} is locked`
        );
      }
    }

    const lock = new Lock(/* ... */);
    return lock;
  }

  async releaseLock(lockId: string, userId: string): Promise<void> {
    const lock = await this.lockRepository.findById(lockId);
    if (!lock) throw new Error('Lock not found');

    lock.validateOwnership(userId);
    lock.release();

    await this.lockRepository.update(lock);
  }

  async isResourceLocked(resourceType: string, resourceId: string): Promise<boolean> {
    const lock = await this.getEffectiveLock(resourceType, resourceId);
    return lock?.status === 'active';
  }

  async getEffectiveLock(resourceType: string, resourceId: string): Promise<Lock | null> {
    // Check direct lock
    const directLock = await this.lockRepository.findByResource(resourceType, resourceId);
    if (directLock?.status === 'active') return directLock;

    // Check parent locks (cascade)
    return this.getParentLock(resourceType, resourceId);
  }

  async canUserAccessLockedResource(
    userId: string,
    resourceType: string,
    resourceId: string
  ): Promise<boolean> {
    const lock = await this.getEffectiveLock(resourceType, resourceId);
    if (!lock || lock.status !== 'active') return true;

    if (lock.isOwnedBy(userId)) return true;

    const sharedUsers = await this.lockRepository.findSharedUsers(lock.id);
    return sharedUsers.some(s => s.userId === userId);
  }

  private async getParentLock(resourceType: string, resourceId: string): Promise<Lock | null> {
    if (resourceType === 'tube') {
      // Fetch tube to get its location (Tube.location getter - see Tube.ts:346)
      const tube = await this.tubeRepository.findById(resourceId);
      if (!tube) return null;

      // Check if the box is locked
      const boxId = ResourceIdentifier.forBox(
        tube.location.tankId,
        tube.location.rackId,
        tube.location.boxId
      );
      return this.lockRepository.findByResource('box', boxId.toString());
    }

    if (resourceType === 'box') {
      // Parse box ID to get rack ID
      const identifier = ResourceIdentifier.fromString(resourceId);
      const parentId = identifier.getParentId();
      if (!parentId) return null;

      return this.lockRepository.findByResource('rack', parentId);
    }

    return null; // Rack is top level
  }

  async expireOutdatedLocks(): Promise<number> {
    const expiredLocks = await this.lockRepository.findExpiredLocks();

    for (const lock of expiredLocks) {
      lock.expire();
      await this.lockRepository.update(lock);
    }

    return expiredLocks.length;
  }
}
```

---

#### OwnershipService
**Location:** `server/src/domain/services/OwnershipService.ts`

**Responsibilities:**
- Manage shared access (co-ownership)
- Validate ownership transfer
- Handle cascade deletion (when user/researcher deleted)

**Methods:**
```typescript
export class OwnershipService {
  constructor(
    private lockRepository: LockRepository,
    private userRepository: UserRepository
  ) {}

  async shareAccess(
    lockId: string,
    targetUserId: string,
    canModify: boolean,
    sharedBy: string
  ): Promise<void> {
    const lock = await this.lockRepository.findById(lockId);
    if (!lock) throw new Error('Lock not found');

    lock.validateOwnership(sharedBy);

    const targetUser = await this.userRepository.findById(targetUserId);
    if (!targetUser) throw new Error('Target user not found');

    await this.lockRepository.createShare(lockId, targetUserId, canModify);
  }

  async revokeSharedAccess(lockId: string, targetUserId: string, revokedBy: string): Promise<void> {
    const lock = await this.lockRepository.findById(lockId);
    if (!lock) throw new Error('Lock not found');

    lock.validateOwnership(revokedBy);

    await this.lockRepository.deleteShare(lockId, targetUserId);
  }

  async getUserLocks(userId: string): Promise<Lock[]> {
    return this.lockRepository.findByOwner(userId);
  }

  async getLocksSharedWithUser(userId: string): Promise<Lock[]> {
    return this.lockRepository.findSharedWithUser(userId);
  }

  async releaseUserLocks(userId: string): Promise<number> {
    const locks = await this.lockRepository.findByOwner(userId);

    for (const lock of locks) {
      lock.release();
      await this.lockRepository.update(lock);
    }

    return locks.length;
  }
}
```

---

### Repository Interface

#### LockRepository
**Location:** `server/src/domain/repositories/LockRepository.ts`

```typescript
import type { Lock } from '../entities/Lock';
import type { SharedAccess } from '../types/locking/SharedAccess';

export interface LockRepository {
  // CRUD
  create(lock: Lock): Promise<Lock>;
  update(lock: Lock): Promise<Lock>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<Lock | null>;

  // Query by resource
  findByResource(resourceType: string, resourceId: string): Promise<Lock | null>;
  findByResourceHierarchy(resourceType: string, resourceId: string): Promise<Lock[]>;

  // Query by ownership
  findByOwner(userId: string): Promise<Lock[]>;
  findSharedWithUser(userId: string): Promise<Lock[]>;

  // Expiration
  findExpiredLocks(): Promise<Lock[]>;
  findExpiringSoon(withinMinutes: number): Promise<Lock[]>;
  markAsExpired(lockId: string): Promise<void>;

  // Sharing
  createShare(lockId: string, userId: string, canModify: boolean): Promise<void>;
  deleteShare(lockId: string, userId: string): Promise<void>;
  findSharedUsers(lockId: string): Promise<SharedAccess[]>;
}
```

---

## Database Schema Design

### New Tables

#### locks Table
```sql
CREATE TABLE locks (
  id TEXT PRIMARY KEY,
  resourceType TEXT NOT NULL CHECK(resourceType IN ('rack', 'box', 'tube')),
  resourceId TEXT NOT NULL,
  ownerId TEXT NOT NULL,
  lockType TEXT NOT NULL CHECK(lockType IN ('exclusive', 'shared', 'temporary')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'expired', 'released')),
  expiresAt TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (ownerId) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(resourceType, resourceId)
);

-- Indexes for performance
CREATE INDEX idx_locks_resource ON locks(resourceType, resourceId);
CREATE INDEX idx_locks_owner ON locks(ownerId);
CREATE INDEX idx_locks_status ON locks(status);
CREATE INDEX idx_locks_expires ON locks(expiresAt);
CREATE INDEX idx_locks_composite ON locks(resourceType, resourceId, status);
```

**Design Notes:**
- `ownerId` references `users.id` (user-owned locks, not researcher-owned)
- `resourceId` format: `Tank1|R3|B5` (parsed by ResourceIdentifier)
- `UNIQUE(resourceType, resourceId)` - Only one lock per resource
- `ON DELETE CASCADE` - Auto-release locks when user deleted
- `status` field - Allows soft delete and expiration tracking

---

#### lock_shares Table (Collaboration)
```sql
CREATE TABLE lock_shares (
  id TEXT PRIMARY KEY,
  lockId TEXT NOT NULL,
  sharedWithUserId TEXT NOT NULL,
  canModify INTEGER NOT NULL DEFAULT 0 CHECK(canModify IN (0, 1)),
  sharedBy TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (lockId) REFERENCES locks(id) ON DELETE CASCADE,
  FOREIGN KEY (sharedWithUserId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (sharedBy) REFERENCES users(id),
  UNIQUE(lockId, sharedWithUserId)
);

-- Indexes
CREATE INDEX idx_lock_shares_lock ON lock_shares(lockId);
CREATE INDEX idx_lock_shares_user ON lock_shares(sharedWithUserId);
```

**Design Notes:**
- `ON DELETE CASCADE` - Auto-cleanup when lock or user deleted
- `UNIQUE(lockId, sharedWithUserId)` - Prevent duplicate shares
- `canModify` boolean - Simple read-only vs full access

---

### Audit Log Integration (Reuse Existing Tables)

**No new tables needed.** Use existing `audit_log` table with new action types:

**New Action Types:**
```typescript
// Lock lifecycle
'lock_created'        // User creates lock
'lock_released'       // User releases lock
'lock_expired'        // System expires lock
'lock_extended'       // User extends expiration

// Sharing
'lock_shared'         // Access granted to user
'lock_share_revoked'  // Access revoked from user

// Admin actions
'lock_overridden'     // Admin unlocks resource
'lock_transferred'    // Admin transfers ownership
```

**Audit Details JSON Structure:**
```json
{
  "lockId": "lock-123",
  "resourceType": "rack",
  "resourceId": "Tank1|R3",
  "ownerId": "user-456",
  "ownerUsername": "john_smith",
  "lockType": "exclusive",
  "expiresAt": "2025-01-20T15:30:00Z",
  "targetUserId": "user-789",
  "canModify": true,
  "reason": "Administrative override"
}
```

---

## Backend Implementation Plan

### Phase 1: Domain Layer

#### 1.1 Value Objects
**Files to Create:**
- `server/src/domain/valueObjects/ResourceIdentifier.ts` (NEW)
- `server/src/domain/valueObjects/LockScope.ts`
- `server/src/domain/valueObjects/LockType.ts`
- `server/src/domain/valueObjects/LockStatus.ts`

**Pattern:** Immutable value objects with static factory methods

**ESLint Requirements:**
- ✅ Explicit return types on all methods
- ✅ No `any` types

---

#### 1.2 Entities
**Files to Create:**
- `server/src/domain/entities/Lock.ts`

**Key Methods:**
```typescript
isOwnedBy(userId: string): boolean
isExpired(): boolean
canBeAccessedBy(userId: string, sharedUserIds: string[]): boolean
expire(): void
release(): void
validateNotExpired(): void
validateOwnership(userId: string): void
```

**ESLint Requirements:**
- ✅ All methods have explicit return types
- ✅ All parameters have explicit types

---

#### 1.3 Domain Events (NEW)
**Files to Create:**
- `server/src/domain/events/LockEvents.ts`

**Events to Define:**
- `LockCreatedEvent`
- `LockReleasedEvent`
- `LockSharedEvent`
- `LockOverriddenEvent`
- `LockExpiredEvent`

---

#### 1.4 Domain Types
**Files to Create:**
- `server/src/domain/types/locking/LockOperations.ts`
- `server/src/domain/types/locking/SharedAccess.ts`

```typescript
export interface CreateLockRequest {
  resourceType: 'rack' | 'box' | 'tube';
  resourceId: string;
  lockType: 'exclusive' | 'shared' | 'temporary';
  expiresAt?: Date;
}

export interface ShareAccessRequest {
  targetUserId: string;
  canModify: boolean;
}

export interface SharedAccess {
  userId: string;
  username: string;
  canModify: boolean;
  sharedBy: string;
  sharedAt: Date;
}
```

---

#### 1.5 Repository Interface
**Files to Create:**
- `server/src/domain/repositories/LockRepository.ts`

**Methods:** See [Repository Interface](#repository-interface) section above

---

#### 1.6 Domain Services
**Files to Create:**
- `server/src/domain/services/LockingService.ts`
- `server/src/domain/services/OwnershipService.ts`

**Files to Modify:**
- `server/src/domain/services/AccessControlService.ts` - Add lock integration

**Integration Example:**
```typescript
async canEditTube(user: User, tube: Tube): Promise<AccessResult> {
  // Existing permission checks...

  // Check lock status
  const lock = await this.lockingService.getEffectiveLock('tube', tube.id);
  if (lock && !lock.isOwnedBy(user.id)) {
    const canAccess = await this.lockingService.canUserAccessLockedResource(
      user.id,
      'tube',
      tube.id
    );
    if (!canAccess && !user.hasRole(UserRole.admin())) {
      return AccessResult.denied('Resource is locked by another user');
    }
  }

  return AccessResult.allowed();
}
```

---

#### 1.7 Domain Errors
**Files to Create:**
- `server/src/domain/errors/LockError.ts`

```typescript
export class LockError extends DomainError {
  static alreadyLocked(resourceType: string, resourceId: string): LockError {
    return new LockError(`Resource ${resourceType}:${resourceId} is already locked`);
  }

  static notLocked(resourceType: string, resourceId: string): LockError {
    return new LockError(`Resource ${resourceType}:${resourceId} is not locked`);
  }

  static notOwner(lockId: string, userId: string): LockError {
    return new LockError(`User ${userId} does not own lock ${lockId}`);
  }

  static expired(lockId: string): LockError {
    return new LockError(`Lock ${lockId} has expired`);
  }
}
```

---

### Phase 2: Infrastructure Layer

#### 2.1 Database Schema
**Files to Modify:**
- `server/src/infrastructure/database/SQLiteContext.ts`

**Changes:**
```typescript
private createTables(): void {
  // ... existing tables ...

  this.db.exec(`
    CREATE TABLE IF NOT EXISTS locks (
      id TEXT PRIMARY KEY,
      resourceType TEXT NOT NULL CHECK(resourceType IN ('rack', 'box', 'tube')),
      resourceId TEXT NOT NULL,
      ownerId TEXT NOT NULL,
      lockType TEXT NOT NULL CHECK(lockType IN ('exclusive', 'shared', 'temporary')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'expired', 'released')),
      expiresAt TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (ownerId) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(resourceType, resourceId)
    )
  `);

  this.db.exec(`
    CREATE TABLE IF NOT EXISTS lock_shares (
      id TEXT PRIMARY KEY,
      lockId TEXT NOT NULL,
      sharedWithUserId TEXT NOT NULL,
      canModify INTEGER NOT NULL DEFAULT 0 CHECK(canModify IN (0, 1)),
      sharedBy TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (lockId) REFERENCES locks(id) ON DELETE CASCADE,
      FOREIGN KEY (sharedWithUserId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (sharedBy) REFERENCES users(id),
      UNIQUE(lockId, sharedWithUserId)
    )
  `);
}

private createIndexes(): void {
  // ... existing indexes ...

  this.db.exec('CREATE INDEX IF NOT EXISTS idx_locks_resource ON locks(resourceType, resourceId)');
  this.db.exec('CREATE INDEX IF NOT EXISTS idx_locks_owner ON locks(ownerId)');
  this.db.exec('CREATE INDEX IF NOT EXISTS idx_locks_status ON locks(status)');
  this.db.exec('CREATE INDEX IF NOT EXISTS idx_locks_expires ON locks(expiresAt)');
  this.db.exec('CREATE INDEX IF NOT EXISTS idx_locks_composite ON locks(resourceType, resourceId, status)');
  this.db.exec('CREATE INDEX IF NOT EXISTS idx_lock_shares_lock ON lock_shares(lockId)');
  this.db.exec('CREATE INDEX IF NOT EXISTS idx_lock_shares_user ON lock_shares(sharedWithUserId)');
}
```

---

#### 2.2 Mapper
**Files to Create:**
- `server/src/infrastructure/database/mappers/LockMapper.ts`

**Pattern:** Follow `TubeMapper.ts` structure

```typescript
import type { Lock } from '@domain/entities/Lock';

export interface LockRow {
  id: string;
  resourceType: string;
  resourceId: string;
  ownerId: string;
  lockType: string;
  status: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export class LockMapper {
  static toDomain(row: LockRow): Lock {
    return Lock.fromData({
      id: row.id,
      resourceType: LockScope.create(row.resourceType),
      resourceId: row.resourceId,
      ownerId: row.ownerId,
      lockType: LockType.create(row.lockType),
      status: LockStatus.create(row.status),
      expiresAt: row.expiresAt ? new Date(row.expiresAt) : undefined,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    });
  }

  static toDatabase(lock: Lock): LockRow {
    return {
      id: lock.id,
      resourceType: lock.resourceType.toString(),
      resourceId: lock.resourceId,
      ownerId: lock.ownerId,
      lockType: lock.lockType.toString(),
      status: lock.status.toString(),
      expiresAt: lock.expiresAt?.toISOString() ?? null,
      createdAt: lock.createdAt.toISOString(),
      updatedAt: lock.updatedAt.toISOString()
    };
  }
}
```

**ESLint Requirements:**
- ✅ Explicit return types on all methods
- ✅ Type-safe null handling (use `??` not `||`)

---

#### 2.3 Repository Implementation
**Files to Create:**
- `server/src/infrastructure/repositories/SQLiteLockRepository.ts`

**Pattern:** Follow `SQLiteTubeRepository.ts` structure

```typescript
import type { Lock } from '@domain/entities/Lock';
import type { LockRepository } from '@domain/repositories/LockRepository';
import type { SQLiteContext } from '../database/SQLiteContext';

import { LockMapper, type LockRow } from '../database/mappers/LockMapper';

export class SQLiteLockRepository implements LockRepository {
  constructor(private context: SQLiteContext) {}

  async create(lock: Lock): Promise<Lock> {
    const row = LockMapper.toDatabase(lock);
    const stmt = this.context.db.prepare(`
      INSERT INTO locks (id, resourceType, resourceId, ownerId, lockType, status, expiresAt, createdAt, updatedAt)
      VALUES (@id, @resourceType, @resourceId, @ownerId, @lockType, @status, @expiresAt, @createdAt, @updatedAt)
    `);
    stmt.run(row);
    return lock;
  }

  async findByResource(resourceType: string, resourceId: string): Promise<Lock | null> {
    const stmt = this.context.db.prepare(`
      SELECT * FROM locks
      WHERE resourceType = ? AND resourceId = ? AND status = 'active'
    `);
    const row = stmt.get(resourceType, resourceId) as LockRow | undefined;
    return row ? LockMapper.toDomain(row) : null;
  }

  // ... implement all interface methods
}
```

**ESLint Requirements:**
- ✅ All methods have explicit return types
- ✅ All async methods return `Promise<T>`
- ✅ Proper type narrowing (check `undefined` before mapping)

---

#### 2.4 Repository Factory
**Files to Modify:**
- `server/src/infrastructure/repositories/index.ts`

```typescript
import type { LockRepository } from '@domain/repositories/LockRepository';

import { SQLiteLockRepository } from './SQLiteLockRepository';

export class RepositoryFactory {
  // ... existing methods ...

  static getLockRepository(): LockRepository {
    const context = SQLiteContext.getInstance();
    return new SQLiteLockRepository(context);
  }
}
```

---

### Phase 3: Application Layer

#### 3.1 DTOs
**Files to Create:**
- `server/src/application/dto/LockDto.ts`

```typescript
export interface LockDto {
  id: string;
  resourceType: 'rack' | 'box' | 'tube';
  resourceId: string;
  ownerId: string;
  ownerUsername: string;
  lockType: 'exclusive' | 'shared' | 'temporary';
  status: 'active' | 'expired' | 'released';
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  sharedWith?: SharedAccessDto[];
}

export interface SharedAccessDto {
  userId: string;
  username: string;
  canModify: boolean;
  sharedBy: string;
  sharedAt: string;
}

export interface CreateLockDto {
  resourceType: 'rack' | 'box' | 'tube';
  resourceId: string;
  lockType: 'exclusive' | 'shared' | 'temporary';
  expiresInMinutes?: number;
}

export interface ShareLockDto {
  targetUserId: string;
  canModify: boolean;
}
```

---

#### 3.2 Application Service
**Files to Create:**
- `server/src/application/services/LockApplicationService.ts`

**Responsibilities:**
- Orchestrate use cases
- Coordinate domain services
- Handle transactions
- Create audit log entries
- Emit domain events

**Methods:**
```typescript
import type { Lock } from '@domain/entities/Lock';
import type { LockRepository } from '@domain/repositories/LockRepository';
import type { AuditRepository } from '@domain/repositories/AuditRepository';
import type { UserRepository } from '@domain/repositories/UserRepository';
import type { LockingService } from '@domain/services/LockingService';
import type { OwnershipService } from '@domain/services/OwnershipService';

import type { CreateLockDto, LockDto, ShareLockDto } from '../dto/LockDto';

export class LockApplicationService {
  constructor(
    private lockRepository: LockRepository,
    private lockingService: LockingService,
    private ownershipService: OwnershipService,
    private auditRepository: AuditRepository,
    private userRepository: UserRepository
  ) {}

  async createLock(request: CreateLockDto, userId: string): Promise<LockDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new Error('User not found');

    const existing = await this.lockRepository.findByResource(
      request.resourceType,
      request.resourceId
    );
    if (existing) {
      throw LockError.alreadyLocked(request.resourceType, request.resourceId);
    }

    const expiresAt = request.expiresInMinutes
      ? new Date(Date.now() + request.expiresInMinutes * 60000)
      : undefined;

    const lock = await this.lockingService.createLock(
      request.resourceType,
      request.resourceId,
      userId,
      request.lockType,
      expiresAt
    );

    await this.lockRepository.create(lock);

    await this.auditRepository.create({
      userId: userId,
      username: user.username,
      action: 'lock_created',
      entityType: request.resourceType,
      entityId: request.resourceId,
      details: JSON.stringify({
        lockId: lock.id,
        lockType: request.lockType,
        expiresAt: expiresAt?.toISOString()
      }),
      timestamp: new Date().toISOString(),
      ipAddress: null,
      userAgent: null
    });

    return this.toLockDto(lock, user.username, []);
  }

  // Presenter pattern: Convert Lock entity to LockDto (see AGENTS.md lines 482-497)
  private toLockDto(lock: Lock, ownerUsername: string, sharedWith: SharedAccessDto[]): LockDto {
    return {
      id: lock.id,
      resourceType: lock.resourceType.toString() as 'rack' | 'box' | 'tube',
      resourceId: lock.resourceId,
      ownerId: lock.ownerId,
      ownerUsername,
      lockType: lock.lockType.toString() as 'exclusive' | 'shared' | 'temporary',
      status: lock.status.toString() as 'active' | 'expired' | 'released',
      expiresAt: lock.expiresAt?.toISOString(),
      createdAt: lock.createdAt.toISOString(),
      updatedAt: lock.updatedAt.toISOString(),
      sharedWith
    };
  }

  async releaseLock(lockId: string, userId: string): Promise<void> {
    await this.lockingService.releaseLock(lockId, userId);

    const user = await this.userRepository.findById(userId);
    const lock = await this.lockRepository.findById(lockId);

    if (user && lock) {
      await this.auditRepository.create({
        userId: userId,
        username: user.username,
        action: 'lock_released',
        entityType: lock.resourceType.toString(),
        entityId: lock.resourceId,
        details: JSON.stringify({ lockId: lock.id }),
        timestamp: new Date().toISOString(),
        ipAddress: null,
        userAgent: null
      });
    }
  }

  async extendLock(lockId: string, userId: string, expiresInMinutes: number): Promise<LockDto> {
    const lock = await this.lockRepository.findById(lockId);
    if (!lock) throw new NotFoundError('Lock not found');

    lock.validateOwnership(userId);

    const newExpiresAt = new Date(Date.now() + expiresInMinutes * 60000);
    const oldExpiresAt = lock.expiresAt;

    lock.extend(newExpiresAt);
    await this.lockRepository.update(lock);

    const user = await this.userRepository.findById(userId);
    if (user) {
      await this.auditRepository.create({
        userId,
        username: user.username,
        action: 'lock_extended',
        entityType: lock.resourceType.toString(),
        entityId: lock.resourceId,
        details: JSON.stringify({
          lockId: lock.id,
          oldExpiresAt: oldExpiresAt?.toISOString(),
          newExpiresAt: newExpiresAt.toISOString()
        }),
        timestamp: new Date().toISOString(),
        ipAddress: null,
        userAgent: null
      });
    }

    this.eventBus.publish(new LockExtendedEvent(/* ... */));
    return this.toLockDto(lock, user?.username || 'Unknown', []);
  }

  async overrideLock(lockId: string, adminUser: User, reason: string): Promise<void> {
    if (!adminUser.isAdmin()) {
      throw new PermissionError('Only admins can override locks');
    }

    const lock = await this.lockRepository.findById(lockId);
    if (!lock) throw new NotFoundError('Lock not found');

    const originalOwnerId = lock.ownerId;

    lock.release();
    await this.lockRepository.update(lock);

    await this.auditRepository.create({
      userId: adminUser.id,
      username: adminUser.username,
      action: 'lock_overridden',
      entityType: lock.resourceType.toString(),
      entityId: lock.resourceId,
      details: JSON.stringify({
        lockId,
        originalOwnerId,
        reason
      }),
      timestamp: new Date().toISOString(),
      ipAddress: null,  // TODO: Extract from Express Request
      userAgent: null   // TODO: Extract from Express Request
    });

    this.eventBus.publish(new LockOverriddenEvent({
      lockId,
      originalOwnerId,
      overriddenBy: adminUser.id,
      reason,
      timestamp: new Date()
    }));
  }

  // ... other methods with audit logging
}
```

**ESLint Requirements:**
- ✅ All async methods must await or handle promises
- ✅ No floating promises
- ✅ Explicit return types

---

### Phase 4: Presentation Layer (API)

#### 4.1 Controller
**Files to Create:**
- `server/src/presentation/controllers/LockController.ts`

**Endpoints:**
```typescript
import type { Request, Response } from 'express';
import type { LockApplicationService } from '@application/services/LockApplicationService';
import type { CreateLockDto, ShareLockDto } from '@application/dto/LockDto';

export class LockController {
  constructor(private lockService: LockApplicationService) {}

  async createLock(req: Request, res: Response): Promise<void> {
    const request = req.body as CreateLockDto;
    const userId = req.user!.id;

    const lock = await this.lockService.createLock(request, userId);

    res.status(201).json(lock);
  }

  async getLockByResource(req: Request, res: Response): Promise<void> {
    const { resourceType, resourceId } = req.params;

    const lock = await this.lockService.getLockByResource(resourceType, resourceId);

    res.status(200).json(lock);
  }

  async releaseLock(req: Request, res: Response): Promise<void> {
    const { lockId } = req.params;
    const userId = req.user!.id;

    await this.lockService.releaseLock(lockId, userId);

    res.status(204).send();
  }

  async extendLock(req: Request, res: Response): Promise<void> {
    const { lockId } = req.params;
    const { expiresInMinutes } = req.body;
    const userId = req.user!.id;

    const lock = await this.lockService.extendLock(lockId, userId, expiresInMinutes);

    res.status(200).json(lock);
  }

  async adminOverrideLock(req: Request, res: Response): Promise<void> {
    const { lockId } = req.params;
    const { reason } = req.body;
    const adminUser = req.user!;

    if (!reason || reason.trim().length === 0) {
      throw new ValidationError('Admin override requires a reason');
    }

    await this.lockService.overrideLock(lockId, adminUser, reason);

    res.status(204).send();
  }

  // ... other methods
}
```

**API Routes:**
```
POST   /api/locks                              - Create lock
GET    /api/locks/resource/:resourceType/:resourceId - Get lock by resource
GET    /api/locks/user/:userId                 - Get user's locks
GET    /api/locks/shared                       - Get locks shared with user
DELETE /api/locks/:lockId                      - Release lock
PUT    /api/locks/:lockId/extend               - Extend expiry (implemented)
POST   /api/locks/:lockId/share                - Share lock
DELETE /api/locks/:lockId/share/:userId        - Revoke shared access
POST   /api/locks/:lockId/override (admin)     - Admin override (implemented)
GET    /api/locks/status/:resourceType/:resourceId - Quick status check (lightweight)
```

**Note:** Lock transfers intentionally not supported (see Decision #7)
```

**ESLint Requirements:**
- ✅ All methods have explicit return types (`:Promise<void>`)
- ✅ All async operations are awaited
- ✅ Type-safe request/response handling

---

#### 4.2 WebSocket Events

**Pattern:** Use Event Bus (see `TubeApplicationService.ts:94` for reference)

**DO NOT directly emit to socket** - Use `eventBus.publish()` instead. The SocketEventHandler automatically converts domain events to WebSocket events.

**New Domain Events:**
```typescript
// File: server/src/domain/events/LockEvents.ts (already defined in plan)
export interface LockCreatedEvent extends DomainEvent {
  type: 'LockCreated';
  lockId: string;
  resourceType: string;
  resourceId: string;
  ownerId: string;
  lockType: string;
  timestamp: Date;
}

// ... other events
```

**Event Emission in Application Service:**
```typescript
// In LockApplicationService.createLock()
this.eventBus.publish(new LockCreatedEvent({
  lockId: lock.id,
  resourceType: request.resourceType,
  resourceId: request.resourceId,
  ownerId: userId,
  lockType: request.lockType,
  timestamp: new Date()
}));
```

**SocketEventHandler Integration:**
```typescript
// File: server/src/application/eventHandlers/SocketEventHandler.ts
// Add lock event handlers to existing handleEvent() method

if (event.type === 'LockCreated') {
  this.io.emit('lock_created', {
    lockId: event.lockId,
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    ownerId: event.ownerId,
    lockType: event.lockType
  });
}

// Similar for lock_released, lock_shared, lock_overridden, lock_expired
```

---

### Phase 5: Shared Schemas

#### 5.1 Lock Schemas
**Files to Create:**
- `packages/shared-schemas/src/locks/lockSchemas.ts`

```typescript
import { z } from 'zod';

export const lockScopeSchema = z.enum(['rack', 'box', 'tube']);
export const lockTypeSchema = z.enum(['exclusive', 'shared', 'temporary']);
export const lockStatusSchema = z.enum(['active', 'expired', 'released']);

export const lockDataSchema = z.object({
  id: z.string(),
  resourceType: lockScopeSchema,
  resourceId: z.string(),
  ownerId: z.string(),
  ownerUsername: z.string(),
  lockType: lockTypeSchema,
  status: lockStatusSchema,
  expiresAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  sharedWith: z.array(z.object({
    userId: z.string(),
    username: z.string(),
    canModify: z.boolean(),
    sharedBy: z.string(),
    sharedAt: z.string().datetime()
  })).optional()
});

export const createLockRequestSchema = z.object({
  resourceType: lockScopeSchema,
  resourceId: z.string().min(1),
  lockType: lockTypeSchema,
  expiresInMinutes: z.number().positive().optional()
});

export const shareLockRequestSchema = z.object({
  targetUserId: z.string(),
  canModify: z.boolean()
});

// Type exports
export type LockData = z.infer<typeof lockDataSchema>;
export type CreateLockRequest = z.infer<typeof createLockRequestSchema>;
export type ShareLockRequest = z.infer<typeof shareLockRequestSchema>;
```

---

#### 5.2 Lock Formatters
**Files to Create:**
- `packages/shared-schemas/src/locks/lockFormatters.ts`

```typescript
import type { LockData } from './lockSchemas';

export const formatLockOwner = (lock: LockData): string => {
  return lock.ownerUsername;
};

export const formatLockType = (lockType: string): string => {
  const types = {
    exclusive: 'Exclusive',
    shared: 'Shared',
    temporary: 'Temporary'
  };
  return types[lockType as keyof typeof types] || lockType;
};

export const formatLockExpiration = (expiresAt?: string): string => {
  if (!expiresAt) return 'No expiration';

  const expiry = new Date(expiresAt);
  const now = new Date();
  const diff = expiry.getTime() - now.getTime();

  if (diff < 0) return 'Expired';

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `Expires in ${days} day${days > 1 ? 's' : ''}`;
  if (hours > 0) return `Expires in ${hours} hour${hours > 1 ? 's' : ''}`;
  return `Expires in ${minutes} minute${minutes > 1 ? 's' : ''}`;
};

export const formatLockTooltip = (lock: LockData): string => {
  const owner = formatLockOwner(lock);
  const type = formatLockType(lock.lockType);
  const expiry = formatLockExpiration(lock.expiresAt);

  return `Locked by ${owner}\nType: ${type}\n${expiry}`;
};
```

---

## Frontend Implementation Plan

### Phase 6: Frontend Services & Hooks

#### 6.1 Lock Service (API Client)
**Files to Create:**
- `client/src/domains/locks/services/LockService.ts`

```typescript
import type {
  LockData,
  CreateLockRequest,
  ShareLockRequest
} from '@odysseus/shared-schemas';

import { httpClient } from '@infra/api/httpClient';

export class LockService {
  static async createLock(request: CreateLockRequest): Promise<LockData> {
    const response = await httpClient.post<LockData>('/api/locks', request);
    return response.data;
  }

  static async getLockByResource(
    resourceType: string,
    resourceId: string
  ): Promise<LockData | null> {
    const response = await httpClient.get<LockData | null>(
      `/api/locks/resource/${resourceType}/${resourceId}`
    );
    return response.data;
  }

  static async releaseLock(lockId: string): Promise<void> {
    await httpClient.delete(`/api/locks/${lockId}`);
  }

  static async shareLock(lockId: string, request: ShareLockRequest): Promise<void> {
    await httpClient.post(`/api/locks/${lockId}/share`, request);
  }
}
```

**ESLint Requirements:**
- ✅ All methods have explicit return types
- ✅ All async properly typed as `Promise<T>`
- ✅ Type imports use `import type`

---

#### 6.2 React Query Hooks

**Pattern Reference:** Follow `client/src/domains/tubes/hooks/useTubeMutations.ts`
- Optimistic updates with rollback
- Proper cache invalidation
- Error handling
- Loading states

**Files to Create:**
- `client/src/domains/locks/hooks/useLocksQuery.ts`
- `client/src/domains/locks/hooks/useLockByResource.ts`
- `client/src/domains/locks/hooks/useLockMutations.ts` (follow useTubeMutations pattern)

**Files to Modify:**
- `client/src/app/queryKeys.ts` - Add lock query keys

**Query Keys:**
```typescript
// In queryKeys.ts
export const queryKeys = {
  // ... existing keys ...

  locks: {
    all: ['locks'] as const,
    byUser: (userId: string) => [...queryKeys.locks.all, 'user', userId] as const,
    byResource: (resourceType: string, resourceId: string) =>
      [...queryKeys.locks.all, 'resource', resourceType, resourceId] as const,
    shared: () => [...queryKeys.locks.all, 'shared'] as const,
  }
} as const;
```

**useLockByResource.ts:**
```typescript
import { useQuery } from '@tanstack/react-query';

import type { LockData } from '@odysseus/shared-schemas';

import { queryKeys } from '@app/queryKeys';

import { LockService } from '../services/LockService';

export const useLockByResource = (
  resourceType: string,
  resourceId: string
): UseQueryResult<LockData | null> => {
  return useQuery({
    queryKey: queryKeys.locks.byResource(resourceType, resourceId),
    queryFn: () => LockService.getLockByResource(resourceType, resourceId),
    staleTime: 5 * 60 * 1000,
    enabled: !!resourceType && !!resourceId,
  });
};

export const useIsResourceLocked = (
  resourceType: string,
  resourceId: string
): { isLocked: boolean; lock: LockData | null | undefined; isLoading: boolean } => {
  const { data: lock, isLoading } = useLockByResource(resourceType, resourceId);

  return {
    isLocked: !!lock && lock.status === 'active',
    lock,
    isLoading
  };
};
```

**ESLint Requirements:**
- ✅ Explicit return types on hooks
- ✅ Type imports use `import type`
- ✅ Proper optional chaining (`?.`)

---

### Phase 7: Frontend UI Components

**NOTE:** UI design phase blocked - will flesh out with user before implementation.

#### 7.1 Lock Badge Component
**Files to Create:**
- `client/src/domains/locks/ui/components/LockBadge.tsx`

```typescript
import React, { type FC, type MouseEvent, type KeyboardEvent } from 'react';
import { Lock as LockIcon } from 'lucide-react';

import type { LockData } from '@odysseus/shared-schemas';
import { formatLockTooltip } from '@odysseus/shared-schemas';

interface LockBadgeProps {
  lock: LockData;
  onClick?: () => void;
}

export const LockBadge: FC<LockBadgeProps> = ({ lock, onClick }) => {
  const handleClick = (e: MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation();
    onClick?.();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  const colorClasses = {
    exclusive: 'text-red-600',
    shared: 'text-blue-600',
    temporary: 'text-yellow-600'
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`inline-flex items-center gap-1 ${colorClasses[lock.lockType]}`}
      aria-label={`Locked by ${lock.ownerUsername}`}
      title={formatLockTooltip(lock)}
    >
      <LockIcon className="w-4 h-4" aria-hidden="true" />
    </button>
  );
};
```

**ESLint Requirements:**
- ✅ Proper accessibility (button, aria-label, keyboard support)
- ✅ Type imports use `import type`
- ✅ Explicit return type (`:FC<Props>`)
- ✅ Event handlers have explicit types

---

#### 7.2 Integration with Existing Components

**Files to Modify:**
- `client/src/domains/tubes/ui/components/TubeGrid.tsx` - Show lock badges
- `client/src/domains/tubes/ui/components/TubeModal.tsx` - Disable editing if locked
- `client/src/domains/storage/ui/components/StorageNavigator.tsx` - Show rack/box locks

**TubeGrid Integration Example:**
```typescript
import type { FC } from 'react';

import { useLockByResource } from '@domains/locks/hooks/useLockByResource';
import { LockBadge } from '@domains/locks/ui/components/LockBadge';

// Inside TubeGrid cell rendering
const TubeCell: FC<{ tube: TubeData }> = ({ tube }) => {
  const { data: lock } = useLockByResource('tube', tube.id);

  return (
    <div className="tube-cell">
      {lock?.status === 'active' && <LockBadge lock={lock} />}
      {/* ... existing tube display */}
    </div>
  );
};
```

**ESLint Requirements:**
- ✅ Type-safe optional chaining (`lock?.status`)
- ✅ Explicit component types (`:FC<Props>`)

---

## Integration Points

### 1. AccessControlService Integration
**File:** `server/src/domain/services/AccessControlService.ts`

**Changes Required:**
```typescript
export class AccessControlService {
  constructor(
    private rolePermissionService: RolePermissionService,
    private lockingService: LockingService
  ) {}

  async canEditTube(user: User, tube: Tube): Promise<AccessResult> {
    // Step 1: Check basic permissions
    if (!user.hasPermission(Permission.editTubes())) {
      return AccessResult.denied('Missing edit_tubes permission');
    }

    // Step 2: Check ownership
    if (!user.isAdmin() && tube.researcherId !== user.researcherId) {
      return AccessResult.denied('Can only edit your own tubes');
    }

    // Step 3: Check lock status
    const lock = await this.lockingService.getEffectiveLock('tube', tube.id);
    if (lock?.status === 'active') {
      const canAccess = await this.lockingService.canUserAccessLockedResource(
        user.id,
        'tube',
        tube.id
      );

      if (!canAccess && !user.isAdmin()) {
        return AccessResult.denied(`Tube is locked by another user`);
      }
    }

    return AccessResult.allowed();
  }

  // Similar changes for canDeleteTube, canMoveTube
}
```

---

### 2. Socket.IO Real-Time Updates
**File:** `client/src/infrastructure/socket/queryBridge.ts`

**New Event Handlers:**
```typescript
import type { QueryClient } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';

import { queryKeys } from '@app/queryKeys';

export const setupLockEventHandlers = (socket: Socket, queryClient: QueryClient): void => {
  socket.on('lock_created', (data: { lockId: string; resourceType: string; resourceId: string }) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.locks.all });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.locks.byResource(data.resourceType, data.resourceId)
    });

    if (data.resourceType === 'tube') {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tubes.detail(data.resourceId) });
    }
  });

  socket.on('lock_released', (data: { lockId: string; resourceType: string; resourceId: string }) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.locks.all });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.locks.byResource(data.resourceType, data.resourceId)
    });
  });

  // Similar for other lock events
};
```

**ESLint Requirements:**
- ✅ Explicitly void floating promises (`void queryClient.invalidateQueries()`)
- ✅ Type-safe event data

---

## Edge Cases & Business Rules

### 1. User Deletion
**Problem:** What happens to locks when user is deleted?

**Solution:** Cascade delete (handled by foreign key)
```sql
FOREIGN KEY (ownerId) REFERENCES users(id) ON DELETE CASCADE
```

**Business Rule:** When user deleted, all their locks are automatically released.

**Audit:** Create audit entry before cascade:
```typescript
async deleteUser(userId: string, adminUser: User): Promise<void> {
  const userLocks = await this.lockRepository.findByOwner(userId);

  for (const lock of userLocks) {
    await this.auditRepository.create({
      userId: adminUser.id,
      username: adminUser.username,
      action: 'lock_released',
      entityType: lock.resourceType.toString(),
      entityId: lock.resourceId,
      details: JSON.stringify({
        lockId: lock.id,
        reason: 'User account deleted',
        deletedUserId: userId
      }),
      timestamp: new Date().toISOString(),
      ipAddress: null,
      userAgent: null
    });
  }

  await this.userRepository.delete(userId);
}
```

---

### 2. Researcher Deactivation
**Problem:** What happens to locks on tubes owned by deactivated researcher?

**Solution:** Auto-release locks when researcher deactivated

**Business Rule:** Researcher deactivation releases locks on their tubes

---

### 3. Lock Expiration
**Problem:** How to handle expired temporary locks?

**Solution:** Background job + lazy expiration

**Implementation:**
```typescript
// Background job (runs every 5 minutes)
export class LockExpirationJob {
  constructor(
    private lockRepository: LockRepository,
    private auditRepository: AuditRepository,
    private io: SocketServer
  ) {}

  async run(): Promise<void> {
    const expiredLocks = await this.lockRepository.findExpiredLocks();

    for (const lock of expiredLocks) {
      await this.lockRepository.markAsExpired(lock.id);

      await this.auditRepository.create({
        userId: 'system',
        username: 'system',
        action: 'lock_expired',
        entityType: lock.resourceType.toString(),
        entityId: lock.resourceId,
        details: JSON.stringify({
          lockId: lock.id,
          ownerId: lock.ownerId,
          expiresAt: lock.expiresAt?.toISOString()
        }),
        timestamp: new Date().toISOString(),
        ipAddress: null,
        userAgent: null
      });

      this.io.emit('lock_expired', {
        lockId: lock.id,
        resourceType: lock.resourceType.toString(),
        resourceId: lock.resourceId
      });
    }
  }
}

// Schedule in server startup
setInterval(() => {
  void new LockExpirationJob(lockRepository, auditRepository, io).run();
}, 5 * 60 * 1000);
```

---

### 4. Movement Rules (Tube Locking + Position)

**Business Rules:**
1. **Tube lock includes position** - When you lock a tube, you lock its current position
2. **Lock follows tube** - Moving tube updates the lock's implicit position
3. **Movement into locked box** - Blocked unless you own the box lock
4. **Movement of locked tube** - Blocked unless you own the tube lock
5. **Same-owner movement** - Can move locked tubes between own locked boxes

**Implementation in TubeApplicationService:**
```typescript
async updateTube(id: string, request: UpdateTubeRequest, user: User): Promise<TubeDto> {
  const tube = await this.tubeRepository.findById(id);
  if (!tube) throw new NotFoundError('Tube not found');

  // Check if location changed
  const isLocationChange = request.location &&
    (request.location.boxId !== tube.location.boxId ||
     request.location.position !== tube.location.position);

  if (isLocationChange) {
    const { boxId } = request.location;

    // Check if destination box is locked
    const boxIdentifier = ResourceIdentifier.forBox(
      request.location.tankId,
      request.location.rackId,
      boxId
    );
    const boxLock = await this.lockingService.getEffectiveLock('box', boxIdentifier.toString());

    if (boxLock?.status === 'active') {
      const canAccess = await this.lockingService.canUserAccessLockedResource(
        user.id,
        'box',
        boxIdentifier.toString()
      );

      if (!canAccess && !user.isAdmin()) {
        throw new PermissionError(
          `Cannot move tube into locked box (owned by ${boxLock.ownerUsername})`
        );
      }
    }

    // Check if tube itself is locked
    const tubeLock = await this.lockingService.getEffectiveLock('tube', tube.id);
    if (tubeLock?.status === 'active') {
      const canMove = await this.lockingService.canUserAccessLockedResource(
        user.id,
        'tube',
        tube.id
      );

      if (!canMove && !user.isAdmin()) {
        throw new PermissionError('Cannot move locked tube (you do not own the lock)');
      }
    }
  }

  // ... rest of update logic
}
```

---

## Security & Audit Trail

### Security Measures

#### 1. Authorization Checks
- Every lock operation requires authentication
- Lock ownership validated before release/share/extend
- Admin operations require admin role
- Cannot lock resources you don't have permission to access

#### 2. Input Validation
- All requests validated with Zod schemas
- Resource IDs validated (format checked by ResourceIdentifier)
- User IDs validated (must be active users)
- Expiration times validated (cannot be in past)

#### 3. SQL Injection Prevention
- Parameterized queries in all repository methods
- No string concatenation for SQL
- Follows existing repository pattern (SQLite prepared statements)

---

### Audit Trail Requirements

**Every Lock Operation Creates Audit Entry:**

| Operation | Action Type | Details Captured |
|-----------|-------------|------------------|
| Create Lock | `lock_created` | lockId, resourceType, resourceId, ownerId, lockType, expiresAt |
| Release Lock | `lock_released` | lockId, resourceType, resourceId, reason (if admin) |
| Expire Lock | `lock_expired` | lockId, resourceType, resourceId, ownerId, expiresAt |
| Extend Expiry | `lock_extended` | lockId, oldExpiresAt, newExpiresAt |
| Share Access | `lock_shared` | lockId, targetUserId, canModify, sharedBy |
| Revoke Share | `lock_share_revoked` | lockId, targetUserId, revokedBy |
| Admin Override | `lock_overridden` | lockId, originalOwnerId, reason, adminUserId |
| Transfer Ownership | `lock_transferred` | lockId, oldOwnerId, newOwnerId, adminUserId |

---

## Implementation Phases

### Phase 0: Database Setup (Day 0)
**Duration:** 10 minutes

#### Development Environment
**Tasks:**
- Delete existing SQLite database (`server/data/odysseus.sqlite`)
- Server will recreate schema on next startup with new lock tables

**No Migration Needed:** Fresh database creation includes locks tables from start

#### Production Environment
**For existing production databases** - Use migration script:

Create: `server/src/infrastructure/database/migrations/add-locks-tables.sql`

```sql
-- Migration: Add resource locking tables
BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS locks (
  id TEXT PRIMARY KEY,
  resourceType TEXT NOT NULL CHECK(resourceType IN ('rack', 'box', 'tube')),
  resourceId TEXT NOT NULL,
  ownerId TEXT NOT NULL,
  lockType TEXT NOT NULL CHECK(lockType IN ('exclusive', 'shared', 'temporary')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'expired', 'released')),
  expiresAt TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY(ownerId) REFERENCES users(id),
  UNIQUE(resourceType, resourceId, ownerId)
);

CREATE INDEX idx_locks_resource ON locks(resourceType, resourceId);
CREATE INDEX idx_locks_owner ON locks(ownerId);
CREATE INDEX idx_locks_status ON locks(status);
CREATE INDEX idx_locks_expires ON locks(expiresAt);

CREATE TABLE IF NOT EXISTS shared_access (
  id TEXT PRIMARY KEY,
  lockId TEXT NOT NULL,
  userId TEXT NOT NULL,
  permissions TEXT NOT NULL DEFAULT 'view',
  grantedAt TEXT NOT NULL,
  FOREIGN KEY(lockId) REFERENCES locks(id) ON DELETE CASCADE,
  FOREIGN KEY(userId) REFERENCES users(id),
  UNIQUE(lockId, userId)
);

CREATE INDEX idx_shared_access_lock ON shared_access(lockId);
CREATE INDEX idx_shared_access_user ON shared_access(userId);

COMMIT;
```

**Apply Migration:**
```bash
# Backup first!
cp server/data/odysseus.sqlite server/data/odysseus.sqlite.backup

# Apply
sqlite3 server/data/odysseus.sqlite < migrations/add-locks-tables.sql
```

---

### Phase 1: Domain Layer (Day 1)
**Duration:** 1 day

**Tasks:**
1. ✅ Create value objects (ResourceIdentifier, LockScope, LockType, LockStatus)
2. ✅ Create Lock entity with business logic
3. ✅ Create LockRepository interface
4. ✅ Create domain types
5. ✅ Create LockingService domain service
6. ✅ Create OwnershipService domain service
7. ✅ Create LockError domain error class
8. ✅ Create domain events (LockEvents.ts)
9. ✅ Write unit tests

**ESLint Success Criteria:**
- ✅ Zero ESLint errors/warnings
- ✅ All functions have explicit return types
- ✅ No `any` types
- ✅ All async properly typed

---

### Phase 2: Infrastructure Layer (Day 2)
**Duration:** 0.75 day

**Tasks:**
1. ✅ Add lock tables to SQLiteContext
2. ✅ Create indexes
3. ✅ Create LockMapper
4. ✅ Create SQLiteLockRepository
5. ✅ Add to RepositoryFactory
6. ✅ Test repository CRUD operations

**ESLint Success Criteria:**
- ✅ Zero ESLint errors/warnings
- ✅ All repository methods have explicit return types
- ✅ Proper type narrowing (check undefined before mapping)

---

### Phase 2.5: Dependency Injection (ServiceContainer)
**Duration:** 0.5 day

**Files to Modify:**
- `server/src/infrastructure/di/ServiceContainer.ts`

**Pattern:** Follow existing service registration (see lines 152+)

**Add Service Registrations:**
```typescript
// Private fields
private lockingService?: LockingService;
private ownershipService?: OwnershipService;
private lockApplicationService?: LockApplicationService;
private lockController?: LockController;
private lockExpirationJob?: LockExpirationJob;

// Getter methods
getLockingService(): LockingService {
  if (!this.lockingService) {
    this.lockingService = new LockingService(
      this.repositoryFactory.getLockRepository(),
      this.repositoryFactory.getTubeRepository()
    );
  }
  return this.lockingService;
}

getOwnershipService(): OwnershipService {
  if (!this.ownershipService) {
    this.ownershipService = new OwnershipService(
      this.repositoryFactory.getLockRepository(),
      this.repositoryFactory.getUserRepository()
    );
  }
  return this.ownershipService;
}

getLockApplicationService(): LockApplicationService {
  if (!this.lockApplicationService) {
    this.lockApplicationService = new LockApplicationService(
      this.repositoryFactory.getLockRepository(),
      this.getLockingService(),
      this.getOwnershipService(),
      this.repositoryFactory.getAuditRepository(),
      this.repositoryFactory.getUserRepository(),
      this.getEventBus()
    );
  }
  return this.lockApplicationService;
}

getLockController(): LockController {
  if (!this.lockController) {
    this.lockController = new LockController(
      this.getLockApplicationService()
    );
  }
  return this.lockController;
}

getLockExpirationJob(): LockExpirationJob {
  if (!this.lockExpirationJob) {
    this.lockExpirationJob = new LockExpirationJob(
      this.repositoryFactory.getLockRepository(),
      this.repositoryFactory.getAuditRepository(),
      this.socketIO!
    );
  }
  return this.lockExpirationJob;
}
```

**Add to RepositoryFactory:**
```typescript
// File: server/src/infrastructure/repositories/index.ts
static getLockRepository(): LockRepository {
  const context = SQLiteContext.getInstance();
  return new SQLiteLockRepository(context);
}
```

---

### Phase 3: Application & Integration Layer (Day 2-3)
**Duration:** 1.25 days

**Tasks:**
1. ✅ Create LockDto types
2. ✅ Create LockApplicationService
3. ✅ Integrate with audit log
4. ✅ Modify AccessControlService to check locks
5. ✅ Modify TubeApplicationService to enforce locks
6. ✅ Create lock expiration background job (see Phase 3.5)
7. ✅ Write integration tests

**ESLint Success Criteria:**
- ✅ All async operations awaited
- ✅ No floating promises
- ✅ Explicit return types on all methods

---

### Phase 3.5: Background Job - Lock Expiration
**Duration:** 0.5 day

**Pattern:** Follow `server/src/infrastructure/jobs/AuditArchivalJob.ts`

**Files to Create:**
- `server/src/infrastructure/jobs/LockExpirationJob.ts`

**Implementation:**
```typescript
import * as cron from 'node-cron';
import type { LockRepository } from '@domain/repositories/LockRepository';
import type { AuditRepository } from '@domain/repositories/AuditRepository';
import type { Server as SocketIOServer } from 'socket.io';
import { logger } from '@utils/logger';

export class LockExpirationJob {
  private task: cron.ScheduledTask | null = null;

  constructor(
    private lockRepository: LockRepository,
    private auditRepository: AuditRepository,
    private socketIO: SocketIOServer
  ) {}

  start(): void {
    if (this.task) {
      logger.warn('Lock expiration job already running');
      return;
    }

    logger.info('Starting lock expiration job (runs every 5 minutes)');

    // Run every 5 minutes: '*/5 * * * *'
    this.task = cron.schedule('*/5 * * * *', async () => {
      await this.expireLocks();
    });

    logger.info('Lock expiration job started successfully');
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('Lock expiration job stopped');
    }
  }

  private async expireLocks(): Promise<void> {
    const startTime = Date.now();

    try {
      const expiredLocks = await this.lockRepository.findExpiredLocks();

      for (const lock of expiredLocks) {
        lock.expire();
        await this.lockRepository.update(lock);

        await this.auditRepository.create({
          userId: 'system',
          username: 'System',
          action: 'lock_expired',
          entityType: lock.resourceType.toString(),
          entityId: lock.resourceId,
          details: JSON.stringify({ lockId: lock.id }),
          timestamp: new Date().toISOString(),
          ipAddress: null,
          userAgent: null
        });

        this.socketIO.emit('lock_expired', {
          lockId: lock.id,
          resourceType: lock.resourceType.toString(),
          resourceId: lock.resourceId
        });
      }

      const duration = Date.now() - startTime;
      if (expiredLocks.length > 0) {
        logger.info('Lock expiration completed', {
          expired: expiredLocks.length,
          duration: `${duration}ms`
        });
      }
    } catch (error) {
      logger.error('Lock expiration failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }

  isRunning(): boolean {
    return this.task !== null;
  }
}
```

**Start Job in Server:**
```typescript
// File: server/src/index.ts (around line 123)
// After audit archival job:

this.serviceContainer.getLockExpirationJob().start();
logger.info('Lock expiration job started');
```

**Stop Job on Shutdown:**
```typescript
// File: server/src/index.ts (around line 632)
// Before stopping audit archival job:

this.serviceContainer.getLockExpirationJob().stop();
logger.info('Lock expiration job stopped');
```

---

### Phase 4: Presentation Layer (API) (Day 3-4)
**Duration:** 1 day

**Tasks:**
1. ✅ Create LockController
2. ✅ Add lock routes
3. ✅ Add WebSocket events
4. ✅ Create API validation schemas
5. ✅ Write API tests

**ESLint Success Criteria:**
- ✅ All controller methods have explicit return types
- ✅ Type-safe request/response handling

---

### Phase 5: Shared Schemas (Day 4)
**Duration:** 0.25 day

**Tasks:**
1. ✅ Create lock schemas in shared-schemas package
2. ✅ Create lock formatters
3. ✅ Export from package index
4. ✅ Rebuild shared-schemas package

**ESLint Success Criteria:**
- ✅ Schemas importable from `@odysseus/shared-schemas`
- ✅ All formatters have explicit return types

---

### Phase 6: Frontend Services & Hooks (Day 5)
**Duration:** 1 day

**Tasks:**
1. ✅ Create locks domain structure
2. ✅ Create LockService API client
3. ✅ Add query keys to queryKeys.ts
4. ✅ Create React Query hooks
5. ✅ Wire up Socket.IO query bridge
6. ✅ Write hook tests

**ESLint Success Criteria:**
- ✅ Zero ESLint errors/warnings
- ✅ All hooks have explicit return types
- ✅ Proper import ordering
- ✅ Type imports use `import type`

---

### Phase 7: Frontend UI Components (Day 6-7)
**Duration:** 2 days
**Status:** ⚠️ **BLOCKED - UI Design Needed**

**Tasks:**
1. ⏸️ Design UI workflows with user
2. ⏸️ Create LockBadge component
3. ⏸️ Create LockModal component
4. ⏸️ Create ShareAccessModal component
5. ⏸️ Integrate into TubeGrid
6. ⏸️ Integrate into TubeModal
7. ⏸️ Integrate into StorageNavigator

**ESLint Success Criteria:**
- ✅ All components have proper accessibility (a11y)
- ✅ Keyboard support on all interactive elements
- ✅ Proper semantic HTML (buttons, not divs)
- ✅ Type imports use `import type`

---

### Phase 8: Testing & Polish (Day 8)
**Duration:** 1 day

**Tasks:**
1. ✅ End-to-end testing
2. ✅ Test hierarchical lock logic
3. ✅ Test admin override functionality
4. ✅ Test audit log entries
5. ✅ Test edge cases
6. ✅ Performance testing
7. ✅ UI/UX polish and accessibility
8. ✅ Documentation updates

**ESLint Success Criteria:**
- ✅ Full codebase passes `npm run lint` with zero errors
- ✅ Full codebase passes `npm run typecheck` with zero errors

---

## Testing Strategy

### Unit Tests

#### Domain Layer
```typescript
describe('Lock Entity', () => {
  test('should create exclusive lock', () => {
    const lock = new Lock(/* ... */);
    expect(lock.lockType.toString()).toBe('exclusive');
  });

  test('should validate expiration for temporary locks', () => {
    const lock = Lock.createTemporary(/* ... */);
    expect(lock.expiresAt).toBeDefined();
  });

  test('should expire lock when past expiration time', () => {
    const lock = Lock.createTemporary(/* expiresAt: yesterday */);
    expect(lock.isExpired()).toBe(true);
  });
});

describe('ResourceIdentifier', () => {
  test('should parse box ID correctly', () => {
    const id = ResourceIdentifier.fromString('Tank1|R3|B5');
    expect(id.getTankId()).toBe('Tank1');
    expect(id.getRackId()).toBe('R3');
    expect(id.getBoxId()).toBe('B5');
  });

  test('should get parent ID for box', () => {
    const boxId = ResourceIdentifier.forBox('Tank1', 'R3', 'B5');
    expect(boxId.getParentId()).toBe('Tank1|R3');
  });
});
```

---

### Integration Tests

#### API Endpoints
```typescript
describe('Lock API', () => {
  test('POST /api/locks - should create lock', async () => {
    const response = await request(app)
      .post('/api/locks')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        resourceType: 'box',
        resourceId: 'Tank1|R3|B5',
        lockType: 'exclusive'
      });

    expect(response.status).toBe(201);
    expect(response.body.lockType).toBe('exclusive');
  });

  test('DELETE /api/locks/:id - should release lock', async () => {
    const lock = await createTestLock(user.id, 'tube', 'tube-123');

    const response = await request(app)
      .delete(`/api/locks/${lock.id}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(204);
  });
});
```

---

## Decisions Confirmed

### 1. Lock Granularity ✅
**Decision:** Option A - Rack + Box + Tube (all three levels)
**Rationale:** Maximum flexibility for users

### 2. Default Lock Behavior ✅
**Decision:** Option B - No auto-lock, user must explicitly lock
**Rationale:** Less disruptive, opt-in model

### 3. Lock Expiration Default ✅
**Decision:** Option A - No expiration by default, user can optionally set
**Rationale:** Simpler, less maintenance

### 4. Shared Access Granularity ✅
**Decision:** Option A - Simple boolean: read-only vs full access
**Rationale:** Covers 90% of use cases without complexity

### 5. Lock Visibility ✅
**Decision:** Option A - Users see all locks (full transparency)
**Rationale:** Aligns with business requirements

### 6. Notification System ✅
**Decision:** Option B - Real-time toasts for lock events affecting user
**Rationale:** Better UX, immediate feedback

### 7. Lock Transfer ✅
**Decision:** Option C - No transfers, must release and re-lock
**Rationale:** Simpler, less abuse potential

### 8. Rack/Box Locking UI ✅
**Decision:** Option C - Both StorageNavigator context menu and dedicated panel
**Rationale:** Most accessible
**Status:** ⚠️ UI design phase needed before implementation

### 9. Ownership Model ✅
**Decision:** User-owned locks (not researcher-owned)
**Rationale:** Users are the authenticated entities; researchers may no longer be in lab

### 10. Resource ID Structure ✅
**Decision:** Use ResourceIdentifier value object with delimiter format (`Tank1|R3|B5`)
**Rationale:** Industry standard for composite keys, no schema refactoring needed

### 11. Tube Locking Semantics ✅
**Decision:** Lock includes both entity ID and position
**Rationale:** Prevents conflicts and ensures position integrity

---

## Next Steps

### Before Implementation
1. ✅ Review this plan with stakeholder
2. ✅ Make decisions on open questions
3. ✅ Confirm edge case handling
4. ⏸️ Design UI workflows (blocked Phase 7)
5. ✅ Finalize lock granularity and defaults

### Implementation Kickoff
1. ✅ Delete existing database (dummy data)
2. ✅ Start Phase 1: Domain Layer
3. ✅ Iterate through phases sequentially
4. ✅ Test thoroughly after each phase
5. ✅ Run ESLint after each file created
6. ✅ Document as we build

---

## Additional Implementation Notes

### SharedAccess Type Definitions

**Domain Type:** Create separate domain type, not just DTO
**Location:** `server/src/domain/types/SharedAccess.ts`

```typescript
export interface SharedAccess {
  userId: string;
  permissions: 'view' | 'modify';
  grantedAt: Date;
}
```

**Why:** Domain types should exist separately from DTOs for proper layer separation.

---

### LockRepository Methods Documentation

**Method:** `findByResourceHierarchy(resourceId: string): Promise<Lock[]>`

**Purpose:** Find all locks that affect a resource through hierarchy cascade
- For a tube: Returns locks on that tube, its box, and its rack
- For a box: Returns locks on that box and its rack
- For a rack: Returns only locks on that rack

**Usage Example:**
```typescript
// Get all locks affecting a specific box
const locks = await lockRepository.findByResourceHierarchy('Tank1|R3|B5');
// Returns: [lockOnRack, lockOnBox, lockOnSpecificTube]
```

This method powers the cascade checking logic in AccessControlService.

---

### Test File Organization

**Pattern:** `{FileName}.test.ts` adjacent to source file

**Locations:**
```
server/src/domain/entities/Lock.test.ts
server/src/domain/valueObjects/LockScope.test.ts
server/src/domain/services/LockingService.test.ts
server/src/infrastructure/repositories/SQLiteLockRepository.test.ts
server/src/application/services/LockApplicationService.test.ts
client/src/domains/locks/hooks/useLockMutations.test.ts
client/src/domains/locks/ui/components/LockBadge.test.tsx
```

**Framework:** Jest (server), Vitest (client)

---

### Socket Query Bridge Setup

**File:** `client/src/infrastructure/socket/queryBridge.ts`

**Location:** Add lock event handlers inside **existing** `setupQueryBridge()` function (do NOT create separate function)

```typescript
// Inside setupQueryBridge() function:

socket.on('lock_created', (data: { lockId: string; resourceType: string; resourceId: string }) => {
  void queryClient.invalidateQueries({ queryKey: queryKeys.locks.all });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.locks.byResource(data.resourceType, data.resourceId)
  });
});

socket.on('lock_released', (data: { lockId: string; resourceType: string; resourceId: string }) => {
  void queryClient.invalidateQueries({ queryKey: queryKeys.locks.all });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.locks.byResource(data.resourceType, data.resourceId)
  });
});

socket.on('lock_overridden', (data: { lockId: string }) => {
  void queryClient.invalidateQueries({ queryKey: queryKeys.locks.all });
});

socket.on('lock_expired', (data: { lockId: string; resourceType: string; resourceId: string }) => {
  void queryClient.invalidateQueries({ queryKey: queryKeys.locks.all });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.locks.byResource(data.resourceType, data.resourceId)
  });
});
```

---

### Tube Modal Disable Editing Logic

**File:** `client/src/domains/tubes/ui/components/TubeEditorModal.tsx`

**Implementation:**
```typescript
// Inside TubeEditorModal component
const { data: lock, isLoading: isLoadingLock } = useLockByResource('tube', tube.id);
const currentUser = useAuth().user;

const isLocked = lock && lock.status === 'active' && lock.ownerId !== currentUser?.id;

// Disable form fields if locked
<input
  {...register('cellType')}
  disabled={isLocked || isSubmitting}
  className={isLocked ? 'opacity-50 cursor-not-allowed' : ''}
/>

// Show lock warning
{isLocked && (
  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
    <p className="text-sm text-yellow-800">
      This tube is locked by {lock.ownerUsername}. You cannot edit it.
    </p>
  </div>
)}
```

**Apply to:**
- TubeEditorModal - Disable all form fields
- BatchEditModal - Filter out locked tubes
- TubeGrid - Show lock badge on locked tubes

---

### Audit Log IP/UserAgent Extraction

**Current State:** All examples show `ipAddress: null, userAgent: null`

**Future Enhancement:** Extract from Express Request object

**Pattern to use:**
```typescript
// In controller methods
const ipAddress = req.ip || req.connection.remoteAddress || null;
const userAgent = req.get('user-agent') || null;

// Pass to application service
await this.lockService.createLock(request, userId, {
  ipAddress,
  userAgent
});
```

**Why not implemented now:** Non-critical for MVP, can be added later without breaking changes.

---

### Lock Transfer Limitation

**Design Decision:** Lock transfers intentionally **not supported** (Decision #7)

**Rationale:**
- Simpler implementation
- Reduces abuse potential
- Clear audit trail (release → new lock)

**Workaround:**
1. Original owner releases lock
2. New user creates new lock
3. Both actions logged in audit trail

**API Documentation:** Document this limitation in API docs under "Unsupported Operations"

---

### Tube ResourceId Clarification

**Critical:** Tube IDs are **NOT composite** - they use simple string format

**Format:** `tube_{timestamp}_{random}` (e.g., `tube_1731864523456_a7k3n2p1q`)

**Location Info:** Stored in `Tube.location` property (value object)
- Accessed via: `tube.location.tankId`, `tube.location.rackId`, `tube.location.boxId`, `tube.location.position`

**Lock Table Structure:**
- `resourceType`: `'tube'`
- `resourceId`: Tube's UUID string (e.g., `tube_1731864523456_a7k3n2p1q`)

**No special handling needed** - Tube location is tracked via Tube entity, not in locks table.

---

## Conclusion

This implementation plan provides a **comprehensive, ESLint-compliant roadmap** for building a production-ready resource locking and ownership system for Odysseus. The design:

✅ **Builds on existing architecture** - Reuses audit log, access control, database patterns
✅ **Follows Clean Architecture** - Proper domain/application/infrastructure separation
✅ **Maintains DDD principles** - Rich domain model with business logic in entities
✅ **ESLint compliant** - All code examples follow strict ESLint rules
✅ **Type-safe** - Explicit return types, no `any`, proper type imports
✅ **Accessible** - Full keyboard support, ARIA labels, semantic HTML
✅ **User-owned locks** - Clear ownership model tied to authenticated users
✅ **ResourceIdentifier pattern** - Industry standard for composite IDs
✅ **Position + entity locking** - Comprehensive tube locking semantics
✅ **Domain events** - Extensible event-driven architecture
✅ **Full audit trail** - Every action logged for compliance

**Estimated Timeline:** 6-8 days (Phase 7 blocked pending UI design)
**Complexity:** High (touches all layers of architecture)
**Risk:** Low (well-defined scope, existing patterns to follow, ESLint compliance enforced)

---

**Status:** Ready for implementation (pending UI design for Phase 7)

# APPENDIX: Future Features (To Be Fleshed Out)

The following features were discussed for the **Locking System** (Phase 2 of resource control). These need to be properly detailed, designed, and integrated into a comprehensive locking implementation plan.

## 🔒 Lock Control Features (Future Implementation)

### 1. Animated Lock Icon System

**Concept:**
- SVG animated lock that transitions between states
- Visual feedback for lock/unlock actions
- State-specific icons

**States to Visualize:**
- **Unlocked** (default) → Unlocked padlock icon
- **Locked (Exclusive)** → Locked padlock with animation
- **Locked (Shared)** → Lock with user initials badge
- **Locked (Temporary)** → Lock with timer icon overlay
- **Transitioning** → Smooth animation between states

**Questions to Answer:**
- Animation library: Framer Motion? CSS transitions? Custom SVG animation?
- Animation duration/easing curves?
- Accessibility considerations (reduced motion)?

---

### 2. One-Click Locking Mechanism

**Concept:**
- First click on unlocked resource → Creates **exclusive lock** (no confirmation)
- Second click on your locked resource → Opens **context menu**

**Context Menu Options:**
```
┌─────────────────────────┐
│ 🔓 Unlock                │
│ ⏰ Set Timer to Unlock   │
│ 👥 Share Access...       │
│ ❌ Cancel                │
└─────────────────────────┘
```

**Questions to Answer:**
- Context menu positioning (above/below/beside button)?
- Click-outside to close?
- Keyboard navigation support?
- Touch device support (mobile/tablet)?

---

### 3. Timer-Based Auto-Unlock

**Concept:**
- User sets timer: "Unlock in X minutes/hours"
- Resource automatically unlocks when timer expires
- Timer visible on hover/click

**UI Requirements:**
- Timer duration picker (preset options + custom)
- Timer countdown display
- Option to extend timer before expiration
- Visual indication that timer is active (clock icon)

**Backend Requirements:**
- Background job to check expired timers
- Notification when timer about to expire?
- What happens if user leaves before timer expires?

**Questions to Answer:**
- Timer presets: 15min, 30min, 1hr, 2hr, 4hr, 8hr, custom?
- Show absolute time or countdown?
- Extend timer workflow?

---

### 4. Shared Access with User Selection

**Concept:**
- User can share locked resource with specific users
- Two modes:
  - **Unlimited sharing** - No time limit
  - **Timed sharing** - Auto-revokes after duration

**UI Requirements:**
- User selection interface (checkboxes? multi-select dropdown?)
- Option to set time limit for sharing
- List of currently shared users
- Revoke access button per user

**Questions to Answer:**
- Can you share with multiple users at once?
- If you share with User A for 2 hours, can you extend it later?
- Does sharing persist if you unlock the resource?
- Admin visibility into shared access?

---

### 5. Lock State Visual System

**Concept:**
Three distinct icon types based on perspective:

| Your Perspective | Icon | Color | Meaning |
|------------------|------|-------|---------|
| **Your Lock** | `ShieldCheck` | Blue | "Protected by you" |
| **Others' Lock** | `LockKeyhole` | Red | "Barred from accessing" |
| **Shared Lock** | `LockOpen` | Green | "Open to multiple users" |

**Questions to Answer:**
- Should temporary locks have a different icon or just overlay?
- Hover states (tooltip showing lock details)?
- What if resource is both assigned AND locked (show both badges)?

---

### 6. Admin Lock Override System

**Concept:**
- Admins can unlock/override anyone's locks
- **MUST require confirmation + reason**

**UI Requirements:**
- Override confirmation dialog
- Required reason text field (for audit)
- Warning message ("This will notify the lock owner")
- Cannot be undone warning

**Backend Requirements:**
- Audit log entry with reason
- Optional: Notification to original lock owner
- Domain event: `LockOverriddenEvent`

**Questions to Answer:**
- Should override release the lock or transfer to admin?
- Notify original owner immediately or just log it?
- Can admin re-lock as themselves or only release?

---

### 7. Lock Icon Animation Transitions

**Concept:**
Smooth visual transitions between lock states

**Animation Examples:**
```
Unlocked → Locked:
- Padlock shackle closes down
- Slight bounce/lock sound effect?

Locked → Unlocked:
- Padlock shackle opens up
- Slight spring effect

Locked → Shared:
- Lock opens partially
- User initials fade in

Shared → Exclusive:
- User initials fade out
- Lock fully closes
```

**Questions to Answer:**
- Animation duration (200ms? 300ms?)?
- Easing curves?
- Sound effects (optional)?
- Reduced motion preference support?

---

### 8. Timer Display on Hover

**Concept:**
When hovering over timer icon, show:
- Initial duration set
- Time remaining
- Absolute unlock time
- Option to extend

**UI Design:**
```
┌─────────────────────────────┐
│ ⏰ Auto-unlock Timer         │
├─────────────────────────────┤
│ Set for: 2 hours            │
│ Remaining: 1h 23m           │
│ Unlocks at: 3:45 PM         │
│                             │
│ [Extend Timer]  [Cancel]    │
└─────────────────────────────┘
```

**Questions to Answer:**
- Tooltip or popover?
- Update live (real-time countdown)?
- Mobile support (tap instead of hover)?

---

### 9. Lock State Machine

**Concept:**
Formal state machine for lock transitions

```
States:
- UNLOCKED (default)
- LOCKED_EXCLUSIVE (you)
- LOCKED_EXCLUSIVE (other)
- LOCKED_SHARED (you)
- LOCKED_SHARED (other, you have access)
- LOCKED_TEMPORARY (you, auto-unlocks)

Transitions:
- UNLOCKED → LOCKED_EXCLUSIVE (one click)
- LOCKED_EXCLUSIVE → UNLOCKED (context menu)
- LOCKED_EXCLUSIVE → LOCKED_SHARED (share access)
- LOCKED_EXCLUSIVE → LOCKED_TEMPORARY (set timer)
- LOCKED_TEMPORARY → UNLOCKED (timer expires)
```

**Questions to Answer:**
- Use XState library or custom state machine?
- Server-side validation of transitions?
- What if client state diverges from server?

---

### 10. Context Menu Component

**Reusable context menu for all lock operations**

**Props Interface:**
```typescript
interface LockContextMenuProps {
  lock: LockData;
  onUnlock: () => void;
  onSetTimer: (duration: number) => void;
  onShare: (userIds: string[]) => void;
  onClose: () => void;
  position: { x: number; y: number };
}
```

**Questions to Answer:**
- Render as portal (outside DOM hierarchy)?
- Keyboard navigation (arrow keys, escape)?
- Nested menus (Share → User selection submenu)?

---

### 11. Permission Warnings

**Concept:**
Show warnings when user tries to edit locked resources

**Examples:**

**Non-admin trying to edit someone else's lock:**
```
⚠️ This box is locked by Alice.
You cannot edit it without permission.
[Request Access] [Cancel]
```

**Admin about to override:**
```
⚠️ Admin Override Required
This rack is locked by Bob. Overriding will:
- Release Bob's lock
- Create an audit entry
- Optionally notify Bob

Reason (required):
[_________________________]

[Override Lock] [Cancel]
```

**Questions to Answer:**
- "Request Access" button → What does it do? Send notification?
- Toast notification vs modal dialog?
- Different warnings for different scenarios?

---

## Integration Questions

### How Locking Integrates with Assignment

**Critical Questions:**
1. Can you lock resources **not assigned to you**?
   - **Proposed:** No, only assigned resources can be locked (admin exception)

2. If a rack is assigned to you, are all its boxes implicitly lockable?
   - **Proposed:** Yes, but boxes can have individual locks too

3. What happens to locks when resource is reassigned?
   - **Proposed:** Locks are automatically released on reassignment

4. Can admin assign a resource that's currently locked?
   - **Proposed:** Yes, but it releases the lock (with warning)

---

## UI/UX Open Questions

### Filter System
We discussed a filter system for the Storage Management Modal:

**Proposed Filters:**
- Show **all resources** (default)
- Show **only assigned to me**
- Show **only my locked resources**
- Show **only unlocked resources**
- Show **all locked resources** (anyone's locks)

**Questions:**
- Dropdown filter or tabs?
- Multi-select filters (combine "assigned to me" + "locked")?
- Persist filter preference?

---

### Visual Hierarchy
When both **assigned** and **locked**:

```
Example: Box B assigned to you, locked by you
┌──────────────────────────────────────┐
│ 📦 Box B (T cell donors)             │
│    [HA] 🛡️  9×9                      │
│    ↑    ↑                            │
│    │    └─ Lock indicator (blue shield)
│    └────── Initials badge (assigned)
└──────────────────────────────────────┘
```

**Questions:**
- Badge order (assignment first or lock first)?
- Size/spacing between badges?
- Mobile layout (stack or inline)?

---

## Technical Architecture Questions

### State Management
- Lock state stored where? Zustand? React Query cache? Both?
- Optimistic updates for lock/unlock?
- Handle race conditions (two users locking simultaneously)?

### Performance
- How many locks can exist simultaneously (scalability)?
- Index locks by resource ID? User ID? Both?
- Cache lock status client-side?

---

## Next Steps

**Before implementing locking system:**

1. ✅ Complete Assignment System (this document)
2. 📝 Create detailed Locking System plan answering all questions above
3. 🎨 Design UI mockups for lock interactions
4. 🧪 Prototype animated lock icon
5. 📊 Define lock state machine formally
6. 🔒 Design lock permission matrix
7. 📅 Estimate timeline for locking features

**Estimated Effort:** 6-8 days (after assignment system complete)

---

**Document Status:** Assignment System plan complete, locking features outlined for future detailed planning.
