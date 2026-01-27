# DRY Audit Report — Odysseus App

**Date:** January 27, 2026
**Scope:** Full client and server codebase
**Status:** Audit complete — pending implementation

---

## Summary

| Area | Duplicated Lines | Files Affected |
|------|-----------------|----------------|
| Server | ~1,370 | 20+ |
| Client | ~1,500 | 60+ |
| **Total** | **~2,870** | **80+** |

---

## Server Findings

### S1 — Auth/User Extraction Helpers (HIGH — ~150 lines)

Every controller re-implements `getAuthenticatedUser()` and similar helpers.

**Files:**
- `server/src/presentation/controllers/TubeController.ts`
- `server/src/presentation/controllers/SearchController.ts`
- `server/src/presentation/controllers/TubeLockController.ts`
- `server/src/presentation/controllers/ResearcherController.ts`
- `server/src/presentation/controllers/UserController.ts`
- `server/src/presentation/controllers/ConfigurationController.ts`

**Pattern:**
```typescript
private getAuthenticatedUser(req: Request): User {
  const user = req.user;
  if (!user) {
    throw new Error('Authentication required - user not found in request context');
  }
  return user;
}
```

**Fix:** Create a `BaseController` class with shared auth helpers.

---

### S2 — Audit Event Handlers (HIGH — ~200+ lines)

30+ handlers in `AuditEventHandler.ts` follow the same resolve-username, build-details, log-action template.

**File:** `server/src/application/eventHandlers/AuditEventHandler.ts`

**Pattern:**
```typescript
private async handleTubeCreated(event: TubeCreatedEvent): Promise<void> {
  await this.safeLogAudit('tube created', { tubeId: event.tubeId }, async () => {
    const username = await this.resolveUsername(event.createdBy);
    const displayLocation = await this.getDisplayLocation(event.location);
    await this.auditService.logAction({
      userId: event.createdBy,
      username,
      action: 'tube_created',
      entityType: 'tube',
      entityId: event.tubeId,
      details: { ... },
    });
  });
}
// Same structure repeated 30+ times for every event type
```

**Fix:** Create a generic audit event adapter that accepts event metadata and detail extractors.

---

### S3 — Error Handling / Not-Found Patterns (MEDIUM — ~200 lines)

Fetch entity → null check → throw NotFoundError, repeated everywhere.

**Files:**
- `server/src/application/services/TubeApplicationService.ts`
- `server/src/application/services/UserApplicationService.ts`
- `server/src/application/services/ResearcherApplicationService.ts`

**Pattern:**
```typescript
const tube = await this.tubeRepository.findById(id);
if (!tube) {
  throw new NotFoundError(`Tube not found: ${id}`, { tubeId: id });
}
```

**Fix:** Extract `findByIdOrThrow()` into repositories or a shared utility.

---

### S4 — Batch Operation Loops (MEDIUM — ~180 lines)

Identical try/catch-per-item with success/fail arrays for create, update, and delete bulk operations.

**File:** `server/src/application/services/TubeApplicationService.ts`

**Pattern:**
```typescript
const created: TubeResponse[] = [];
const failed: Array<{ index: number; request: CreateTubeRequest; error: string }> = [];
for (let i = 0; i < requests.length; i++) {
  try {
    const tube = await this.createTube(requests[i], authenticatedUser);
    created.push(tube);
  } catch (error) {
    failed.push({ index: i, request: requests[i], error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
return { success: failed.length === 0, created, failed };
// Repeated for bulkUpdate and bulkDelete
```

**Fix:** Create a generic `executeBatchOperation<TInput, TResult>()` helper.

---

### S5 — Permission Check Patterns (HIGH — ~150 lines)

Same `canCreate/canEdit/canDelete` structure repeated.

**File:** `server/src/domain/services/AccessControlService.ts`

**Fix:** Extract a generic `checkPermission(user, permission)` method.

---

### S6 — Repository `findByIds` (LOW — ~60 lines)

Identical placeholder-building query logic in every repository.

**Files:**
- `server/src/infrastructure/repositories/PersonRepository.ts`
- `server/src/infrastructure/repositories/ResearcherRepository.ts`
- `server/src/infrastructure/repositories/UserRepository.ts`

**Fix:** Add a generic `findByIds<T>()` to `PostgresContext` or a `BaseRepository`.

---

### S7 — Researcher+Person Enrichment (MEDIUM — ~120 lines)

Same `Promise.all` → map → `toResponse` pattern repeated 5 times.

**File:** `server/src/application/services/ResearcherApplicationService.ts`

**Fix:** Extract an `enrichResearchersWithPersons()` private helper method.

---

### S8 — Container Access Checking (MEDIUM — ~80 lines)

Same fetch-config → get-box → check-permission sequence at 8 call sites.

**File:** `server/src/application/services/TubeApplicationService.ts`

**Fix:** Consolidate into a single `validateContainerAccess()` method.

---

## Client Findings

### C1 — Storage Edit Modals (HIGH — ~150 lines)

BoxEditModal, RackEditModal, TankEditModal, and CustomLabelEditModal all share identical form reset, save, submit, and button patterns.

**Files:**
- `client/src/domains/storage/ui/components/modals/BoxEditModal.tsx`
- `client/src/domains/storage/ui/components/modals/RackEditModal.tsx`
- `client/src/domains/storage/ui/components/modals/TankEditModal.tsx`
- `client/src/domains/storage/ui/components/modals/CustomLabelEditModal.tsx`

**Fix:** Create a `useEditModalForm<T>` hook for form lifecycle.

---

### C2 — Tube Modal Form Logic (HIGH — ~200 lines)

TubeEditorModal (838 lines) and BatchTubeEditorModal (652 lines) share form reset, error handling, progress tracking, and validation patterns.

**Files:**
- `client/src/domains/tubes/ui/components/modals/TubeEditorModal.tsx`
- `client/src/domains/tubes/ui/components/modals/BatchTubeEditorModal.tsx`

**Fix:** Extract `useTubeFormLifecycle` hook and reusable mutation error handler.

---

### C3 — Try/Catch Error Notifications (MEDIUM — ~300 lines)

The same `try { op(); notifications.success() } catch { notifications.error() } finally { setLoading(false) }` pattern appears 30+ times.

**Files:** 10+ modal and hook files across all domains.

**Fix:** Create a `withAsyncErrorHandling()` wrapper utility.

---

### C4 — Animated SVG Components (MEDIUM — ~150 lines)

4 animated mark components duplicate visibility state, delay useEffect, and stroke animation logic.

**Files:**
- `client/src/shared/components/AnimatedCheckmark.tsx`
- `client/src/shared/components/AnimatedXMark.tsx`
- `client/src/shared/components/AnimatedWarningMark.tsx`
- `client/src/shared/components/AnimatedInfoMark.tsx`

**Fix:** Create a `useAnimatedSVG` hook and animated mark factory.

---

### C5 — Form Reset `useEffect` (MEDIUM — ~100 lines)

`if (isOpen) { resetStates() }` pattern copied into 8+ modals.

**Files:** PasswordResetModal, ResearcherModal, UserSettingsModal, TubeEditorModal, BatchTubeEditorModal, BoxEditModal, RackEditModal, TankEditModal

**Fix:** Create a `useModalFormReset` hook.

---

### C6 — Admin Table Tabs (MEDIUM — ~100 lines)

UsersTab and ResearchersTab duplicate state management, data loading, sorting, and delete confirmation.

**Files:**
- `client/src/domains/admin/ui/components/tabs/UsersTab.tsx`
- `client/src/domains/admin/ui/components/tabs/ResearchersTab.tsx`

**Fix:** Create a `useAdminTable` hook.

---

### C7 — Query Hook Structure (MEDIUM — ~100 lines)

Multiple query hooks are thin wrappers with identical `useQuery` boilerplate.

**Files:**
- `client/src/domains/admin/hooks/useUsersQuery.ts`
- `client/src/domains/users/hooks/useActiveUsersQuery.ts`
- `client/src/domains/users/hooks/useUserLookupQuery.ts`

**Fix:** Create a query hook factory function.

---

### C8 — Position Utility Signatures (LOW — ~100 lines)

6+ functions pass the same 7 parameters instead of a single context object.

**File:** `client/src/domains/storage/utils/positionDisplayUtils.ts`

**Fix:** Introduce a `PositionContext` interface to bundle the repeated parameters.

---

### C9 — Location Display Markup (LOW — ~100 lines)

Identical location breadcrumb HTML built manually in 3 places.

**Files:**
- `client/src/domains/tubes/ui/components/modals/TubeEditorModal.tsx`
- `client/src/domains/tubes/ui/components/modals/BatchTubeEditorModal.tsx`

**Fix:** Extract a reusable `LocationDisplayBadge` component.

---

## Consolidation Priority

### Phase 1 — Highest Impact (~1,290 lines saved)

| Item | Lines Saved | Effort |
|------|------------|--------|
| S1 — BaseController | ~150 | Easy |
| S2 — Audit event adapter | ~200 | Medium |
| C1 — useEditModalForm hook | ~150 | Easy |
| C2 — Tube form lifecycle hook | ~200 | Medium |
| S4 — Batch operation helper | ~180 | Medium |
| C3 — Async error wrapper | ~300 | Easy |
| S6 — Base repository | ~60 | Easy |
| S5 — Permission check utility | ~150 | Easy |

### Phase 2 — Medium Impact (~570 lines saved)

| Item | Lines Saved | Effort |
|------|------------|--------|
| C4 — Animated SVG factory | ~150 | Easy |
| S7 — Researcher enrichment helper | ~120 | Easy |
| C5 — Modal form reset hook | ~100 | Easy |
| C6 — useAdminTable hook | ~100 | Medium |
| C7 — Query hook factory | ~100 | Easy |

### Phase 3 — Cleanup (~280 lines saved)

| Item | Lines Saved | Effort |
|------|------------|--------|
| S3 — findByIdOrThrow utility | ~200 | Easy |
| S8 — Container access method | ~80 | Easy |
| C8 — PositionContext interface | ~100 | Easy |
| C9 — LocationDisplayBadge | ~100 | Easy |
