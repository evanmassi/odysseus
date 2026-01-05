# Storage Architecture: Single Source of Truth Migration Plan

**Created:** 2026-01-05
**Status:** Ready for Implementation
**Priority:** High - Data Integrity Risk
**Reviewed:** 2026-01-05

---

## Executive Summary

The storage domain has a **critical architectural violation** against the project's stated principles in AGENTS.md. Server state (lab configuration, tanks, racks, boxes) is stored in BOTH React Query AND Zustand with `persist` middleware, creating dual sources of truth that can diverge and cause **data loss**.

### AGENTS.md Violations

> **AGENTS.md Lines 14-15:**
> - "React Query (TanStack Query v5) - Server state & caching"
> - "Zustand - UI state only (navigation, selections)"

> **AGENTS.md Lines 617-620:**
> - "ONLY for UI-specific state – never for server data"
> - "Never store server data in Zustand"

### Current Reality

| Component | What It Stores | Violation? |
|-----------|----------------|------------|
| `useLoadStorageQuery` (React Query) | Server configuration | ✅ Correct |
| `useStorageStore` (Zustand + persist) | Same data + localStorage | ❌ VIOLATION |

---

## Problem Statement

### The Dual-State Risk

The `storageStore.ts` uses Zustand with `persist` middleware, meaning:
1. Lab configuration is stored in localStorage
2. Components reading from `useCurrentLab()` get localStorage data, NOT server data
3. When saving, components may send stale localStorage data to server
4. Server replaces its data with potentially outdated client data → **DATA LOSS**

### Root Cause: Dangerous Save Pattern

**File:** `client/src/domains/storage/hooks/useStorageQuery.ts:48-71`

```typescript
export const useSaveStorageMutation = () => {
  return useMutation({
    mutationFn: ({ systemConfig, currentLab }) =>
      StorageService.saveConfiguration(systemConfig, currentLab),  // Sends ENTIRE config
  });
};
```

**File:** `server/src/application/commands/ConfigurationCommands.ts:413-421`

```typescript
currentConfig.updateFromData({
  tanks: command.currentLab.equipment?.tanks || [],  // If undefined → ALL TANKS WIPED!
  systemSettings: { ... }
});
```

The server's `UpdateConfigurationCommandHandler` performs a **full state replacement**. If the client sends incomplete or stale data, the server overwrites everything with that data.

---

## Vulnerability Analysis

### Data Loss Scenarios

| Scenario | Risk | Impact |
|----------|------|--------|
| **Stale localStorage** | 🔴 HIGH | User has old data in localStorage from yesterday, opens modal, saves → overwrites server with old data |
| **Multi-tab conflict** | 🔴 HIGH | Tab A opens modal at version 5, Tab B adds tank (v6), Tab A saves → Tab B's tank lost |
| **Partial state send** | 🔴 HIGH | Component sends config with missing `equipment.tanks` → all tanks wiped |
| **Race condition** | 🟡 MEDIUM | Two users save simultaneously → last write wins, first user's changes lost |

### Confirmed Bug (Fixed for Lab Name)

We confirmed this exact bug when changing the lab name caused all rack configurations to be wiped. The fix was to use a dedicated `PUT /configuration/system` endpoint instead of the dangerous full-config save.

---

## Files Affected

### Directly Vulnerable (Store/Read Server Data in Zustand)

| File | Lines | Risk | Issue |
|------|-------|------|-------|
| `storageStore.ts` | 940 | 🔴 HIGH | Stores server data with `persist` middleware |
| `StorageManagementModal.tsx` | 141-144 | 🔴 HIGH | Sends full config from local state |
| `useConfigurationSync.ts` | 38 | 🟡 MEDIUM | Uses `useSaveStorageMutation` for fresh install |

### Zustand Hooks Reading Server Data (Should Use React Query)

| Hook | Location | Issue |
|------|----------|-------|
| `useCurrentLab()` | `storageStore.ts:916` | Returns potentially stale localStorage data |
| `useCurrentTanks()` | `storageStore.ts:921` | Same |
| `useCurrentRacks()` | `storageStore.ts:926` | Same |
| `useCurrentBoxes()` | `storageStore.ts:931` | Same |
| `useGridTemplates()` | `storageStore.ts:936` | Same |

### Components Using Vulnerable Hooks

Any component importing from `useCurrentLab`, `useCurrentTanks`, etc. is potentially reading stale data:
- `AppHeader.tsx` - Displays lab name
- `SystemConfigTab.tsx` - Lab name editing (FIXED - now uses dedicated endpoint)
- Storage Navigator components
- Grid components

### Safe Patterns Already in Place

| File | Pattern | Status |
|------|---------|--------|
| `useStorageData.ts` | React Query only | ✅ Correct |
| `useBoxPositionDisplay.ts` | Dedicated mutation (`PUT /box-position-display`) | ✅ Correct |
| `useUpdateResourceLabelMutation` | Dedicated mutation (`PUT /resource-label`) | ✅ Correct |

---

## Architecture Patterns Used

### 1. Single Source of Truth
React Query is the ONLY holder of server state. Zustand stores ONLY UI state (selections, collapsed states, view modes).

### 2. CQRS (Command Query Responsibility Segregation)
Send specific commands instead of full state replacement:

```typescript
// ✅ What we're implementing
addTank({ name, location })
updateTank({ tankId, updates })
deleteTank({ tankId })
assignRack({ tankId, rackId, userId })
```

### 3. Immediate Save
Each user action persists immediately. No draft state, no batch saves, no data loss risk.

---

## AGENTS.md Alignment Check

### Architecture Compliance

| AGENTS.md Requirement | Plan Compliance | Notes |
|-----------------------|-----------------|-------|
| React Query for server state | ✅ Yes | Migrating all server data to React Query |
| Zustand for UI state only | ✅ Yes | Stripping storageStore to UI-only state |
| Clean Architecture layers | ✅ Yes | Commands in application layer, events in domain |
| Domain events via EventBus | ✅ Yes | Each handler emits appropriate events |
| CQRS pattern | ✅ Yes | Specific commands instead of full-state replacement |
| Named exports only | ✅ Yes | All new mutations use named exports |
| Centralized query keys | ✅ Yes | Using `queryKeys.storage.*` |
| No bandaid solutions | ✅ Yes | Full architectural fix, not a patch |

### Code Quality Compliance

| AGENTS.md Requirement | Plan Compliance | Notes |
|-----------------------|-----------------|-------|
| Proper TypeScript types | ✅ Yes | Commands and DTOs fully typed |
| Validation via Zod | ✅ Yes | Request validation at API boundary |
| AccessControlService | ✅ Yes | Permission checks in each handler |
| Error handling | ✅ Yes | Typed errors for validation failures |
| No floating promises | ✅ Yes | All async properly handled |

### Gaps Identified & Resolved

| Gap | Resolution |
|-----|------------|
| Domain events not mentioned | Added full event table - each handler must emit |
| URL structure incorrect | Full parent context in all URLs |
| Tube deletion cascade | Block delete if tubes exist |
| Fresh install flow | New `/initialize` endpoint |
| Transaction safety | Immediate save pattern eliminates risk |

---

## Critical Side Effects & Considerations

### 1. Endpoint URL Structure (CRITICAL FIX)

**Problem:** `rackId` and `boxId` are NOT globally unique - they're only unique within their parent.
- Rack "1" can exist in Tank A AND Tank B (different racks)
- Box "A" can exist in multiple racks

**Fix:** All endpoints MUST include full parent context in the URL path.

### 2. Domain Events (CRITICAL)

The system has a rich event system consumed by Socket.IO for multi-client sync. **Every new command handler MUST emit appropriate events:**

| Event | When to Emit |
|-------|--------------|
| `TankAddedEvent` | After adding a tank |
| `TankUpdatedEvent` | After updating tank properties |
| `TankDeletedEvent` | After deleting a tank |
| `RackAddedEvent` | After adding rack(s) |
| `RackUpdatedEvent` | After updating rack properties |
| `RackDeletedEvent` | After deleting a rack |
| `RackAssignedEvent` | After assigning rack to user |
| `RackUnassignedEvent` | After removing rack assignment |
| `RackReassignedEvent` | After changing rack from one user to another |
| `BoxAddedEvent` | After adding box(es) |
| `BoxUpdatedEvent` | After updating box properties |
| `BoxDeletedEvent` | After deleting a box |
| `BoxAssignedEvent` | After assigning box to user |
| `BoxUnassignedEvent` | After removing box assignment |
| `BoxReassignedEvent` | After changing box from one user to another |
| `BulkResourcesUnassignedEvent` | After bulk unassign (3+ resources) |
| `BulkResourcesReassignedEvent` | After bulk reassign (3+ resources) |

**If events are not emitted:** Other browser tabs and users will NOT see changes until page refresh.

### 3. Tubes Reference Equipment Locations (DELETE BLOCKING)

Tubes store `tankId`, `rackId`, `boxId` as location data. **Deleting equipment that contains tubes is BLOCKED.**

**Behavior:** Server rejects deletion requests if any tubes exist in the target location. User must move or delete tubes first.

**Implementation (using existing TubeRepository methods):**
```typescript
// Delete Tank - check ALL tubes in tank
const tubesInTank = await tubeRepository.findByTank(tankId);
if (tubesInTank.length > 0) {
  throw new ValidationError(
    `Cannot delete tank: ${tubesInTank.length} tubes are stored in this location. ` +
    `Move or delete the tubes first.`
  );
}

// Delete Rack - check ALL tubes in rack (across all boxes)
const tubesInRack = await tubeRepository.findByTankAndRack(tankId, rackId);
if (tubesInRack.length > 0) {
  throw new ValidationError(
    `Cannot delete rack: ${tubesInRack.length} tubes are stored in this location. ` +
    `Move or delete the tubes first.`
  );
}

// Delete Box - check tubes in specific box
const tubesInBox = await tubeRepository.findByCompleteLocation(tankId, rackId, boxId);
if (tubesInBox.length > 0) {
  throw new ValidationError(
    `Cannot delete box: ${tubesInBox.length} tubes are stored in this location. ` +
    `Move or delete the tubes first.`
  );
}
```

### 4. Validation & Access Control

Each new command handler needs:
1. **User permission check** via `AccessControlService`
2. **Business rule validation** via `ValidationService`
3. **Entity existence validation** (tank/rack/box must exist)

### 5. Fresh Install Flow

`useConfigurationSync.ts` uses `useSaveStorageMutation` to initialize default configuration on fresh install.

**After migration:** Create a dedicated `POST /api/configuration/initialize` endpoint that only works when no configuration exists.

### 6. Immediate Save Pattern (Transaction Safety)

Each user action in the StorageManagementModal saves immediately to the server. This eliminates transaction safety concerns entirely - no batching, no partial failures, no compensation logic needed.

**Why this is correct:**
- Each mutation is atomic on the server
- React Query cache invalidates automatically
- UI always reflects server truth
- No risk of partial state from failed batches

### 7. Bulk Add Event Emission

When adding multiple racks/boxes (e.g., count=4), emit **one event per item created**:
- Add 4 racks → emit 4 `RackAddedEvent`s
- Add 3 boxes → emit 3 `BoxAddedEvent`s

This maintains consistency with the existing event system and ensures Socket.IO notifications work correctly.

### 8. Default Grid Configuration for New Boxes

When adding boxes via `{ count }`, server applies the **lab's default grid configuration** (stored in `systemConfig.defaultGridConfig`). This matches current behavior where new boxes inherit defaults.

### 9. Delete Confirmation Dialogs

Delete operations in the modal must show confirmation dialogs before calling the API:
- "Delete Tank X? This will also delete all racks and boxes in this tank."
- "Delete Rack Y? This will also delete all boxes in this rack."
- "Delete Box Z?"

### 10. Phase Deployment Requirement

**CRITICAL:** Phases 1-4 must deploy together as a single release. Partial deployment creates risk:
- Phase 1 only: Old modal still uses dangerous full-save pattern
- Phase 3 without Phase 4: Zustand still holds stale data

Deploy all four phases together, or use feature flags to gate the new modal until all phases are ready.

---

## Migration Plan

### Phase 1: Create CQRS Endpoints (Server)

Create dedicated endpoints that perform atomic operations instead of full-state replacement.

**IMPORTANT:** All endpoints must:
1. Include full parent context in URL (tankId for racks, tankId+rackId for boxes)
2. Emit appropriate domain events via EventBus
3. Check permissions via AccessControlService
4. Validate via ValidationService
5. Check for tubes before allowing equipment deletion

#### Tank Endpoints

| Method | Endpoint | Command | Request Body |
|--------|----------|---------|--------------|
| `POST` | `/api/configuration/tanks` | AddTankCommand | `{ name, location }` |
| `PUT` | `/api/configuration/tanks/:tankId` | UpdateTankCommand | `{ name?, location?, isActive? }` |
| `DELETE` | `/api/configuration/tanks/:tankId` | DeleteTankCommand | - |

**Delete Tank Validation:** Must check all racks in tank for tubes. Block if any tubes exist.

#### Rack Endpoints

| Method | Endpoint | Command | Request Body |
|--------|----------|---------|--------------|
| `POST` | `/api/configuration/tanks/:tankId/racks` | AddRacksCommand | `{ count: number }` (bulk) |
| `PUT` | `/api/configuration/tanks/:tankId/racks/:rackId` | UpdateRackCommand | `{ name?, capacity?, isActive? }` |
| `DELETE` | `/api/configuration/tanks/:tankId/racks/:rackId` | DeleteRackCommand | - |
| `PUT` | `/api/configuration/tanks/:tankId/racks/:rackId/assign` | AssignRackCommand | `{ userId: string \| null }` |

**Delete Rack Validation:** Must check all boxes in rack for tubes. Block if any tubes exist.

#### Box Endpoints

| Method | Endpoint | Command | Request Body |
|--------|----------|---------|--------------|
| `POST` | `/api/configuration/tanks/:tankId/racks/:rackId/boxes` | AddBoxesCommand | `{ count: number }` (bulk) |
| `PUT` | `/api/configuration/tanks/:tankId/racks/:rackId/boxes/:boxId` | UpdateBoxCommand | `{ name?, gridConfig? }` |
| `DELETE` | `/api/configuration/tanks/:tankId/racks/:rackId/boxes/:boxId` | DeleteBoxCommand | - |
| `PUT` | `/api/configuration/tanks/:tankId/racks/:rackId/boxes/:boxId/assign` | AssignBoxCommand | `{ userId: string \| null }` |

**Delete Box Validation:** Must check box for tubes. Block if any tubes exist.

#### Bulk Assignment Endpoints

| Method | Endpoint | Command | Request Body |
|--------|----------|---------|--------------|
| `POST` | `/api/configuration/bulk-unassign` | BulkUnassignCommand | `{ userId: string }` |
| `POST` | `/api/configuration/bulk-reassign` | BulkReassignCommand | `{ fromUserId, toUserId }` |

#### Initialization Endpoint (New)

| Method | Endpoint | Command | Request Body |
|--------|----------|---------|--------------|
| `POST` | `/api/configuration/initialize` | InitializeConfigCommand | `{ labName, defaultTankCount? }` |

Only works when no configuration exists (fresh install).

#### Existing Safe Endpoints (No Changes Needed)

- `PUT /api/configuration/system` - System settings (labName, etc.) ✅
- `PUT /api/configuration/box-position-display` - Box position display ✅
- `PUT /api/configuration/lab-position-display` - Lab default position display ✅
- `PUT /api/configuration/resource-label` - Custom labels ✅

---

### Phase 2: Create React Query Mutations (Client)

Create mutation hooks for each operation in `client/src/domains/storage/hooks/`:

#### New File: `useStorageEquipmentMutations.ts`

```typescript
// Tank mutations
export const useAddTankMutation = () => { ... };
export const useUpdateTankMutation = () => { ... };
export const useDeleteTankMutation = () => { ... };

// Rack mutations (with bulk support)
export const useAddRacksMutation = () => { ... };  // count-based bulk
export const useUpdateRackMutation = () => { ... };
export const useDeleteRackMutation = () => { ... };
export const useAssignRackMutation = () => { ... };

// Box mutations (with bulk support)
export const useAddBoxesMutation = () => { ... };  // count-based bulk
export const useUpdateBoxMutation = () => { ... };
export const useDeleteBoxMutation = () => { ... };
export const useAssignBoxMutation = () => { ... };

// Bulk assignment
export const useBulkUnassignMutation = () => { ... };
export const useBulkReassignMutation = () => { ... };
```

Each mutation should:
1. Call the dedicated endpoint
2. Invalidate `queryKeys.storage.storage()` on success
3. Support optimistic updates for instant UI feedback

---

### Phase 3: Refactor StorageManagementModal

#### Current Pattern (Dangerous)

```typescript
// Collects all changes locally, sends entire state on save
const [localLab, setLocalLab] = useState(currentLab);  // Local draft

const handleAddRack = () => {
  setLocalLab(addRackToLab(localLab, tankId, newRack));  // Update local
};

const handleSave = () => {
  // Sends ENTIRE localLab - can overwrite server with stale data
  saveConfigurationMutation.mutateAsync({ systemConfig, currentLab: localLab });
};
```

#### New Pattern: Immediate Save

Each operation saves immediately to server. No local draft state, no "Save" button for equipment changes.

```typescript
const addRacksMutation = useAddRacksMutation();
const assignRackMutation = useAssignRackMutation();

const handleAddRack = (tankId: string, count: number) => {
  addRacksMutation.mutate({ tankId, count }, {
    onSuccess: () => {
      // React Query cache auto-invalidated, UI updates automatically
      notifications.success(`Added ${count} rack(s)`);
    },
    onError: (error) => {
      // Show server's error message (e.g., validation errors)
      notifications.error(error.message || 'Failed to add rack');
    }
  });
};

const handleAssignRack = (tankId: string, rackId: string, userId: string | null) => {
  assignRackMutation.mutate({ tankId, rackId, userId }, {
    onSuccess: () => {
      notifications.success('Rack assignment updated');
    },
    onError: (error) => {
      notifications.error(error.message || 'Failed to update assignment');
    }
  });
};

const handleDeleteRack = (tankId: string, rackId: string, rackName: string) => {
  // Show confirmation dialog first
  if (!confirm(`Delete ${rackName}? This will also delete all boxes in this rack.`)) {
    return;
  }

  deleteRackMutation.mutate({ tankId, rackId }, {
    onSuccess: () => {
      notifications.success(`Deleted ${rackName}`);
    },
    onError: (error) => {
      // Server returns helpful message like "Cannot delete: 5 tubes in this location"
      notifications.error(error.message || 'Failed to delete rack');
    }
  });
};
```

#### UX Changes

| Current | New |
|---------|-----|
| Make changes → Click "Save" → All changes sent | Each action saves immediately |
| "Cancel" discards all unsaved changes | No cancel needed - remove button |
| "Save Changes" button required | No save needed - remove button |
| Risk of losing work if modal closed | No risk - each action is persisted |
| Stale data can overwrite server | Impossible - server is always truth |

#### Modal Button Changes

| Button | Action |
|--------|--------|
| "Save Changes" | **Remove** - no longer needed |
| "Cancel" | **Remove** - no longer needed |
| "Done" | **Add** - closes the modal (replaces both Save and Cancel) |

The modal footer simplifies from two buttons to one:

```tsx
// Before
<ModalFooter>
  <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
  <Button variant="primary" onClick={handleSave}>Save Changes</Button>
</ModalFooter>

// After
<ModalFooter>
  <Button variant="primary" onClick={onClose}>Done</Button>
</ModalFooter>
```

---

### Phase 4: Remove Server Data from Zustand

#### 4.1 Strip `storageStore.ts`

Remove all server data and keep only UI state:

**Before (940 lines):**
```typescript
const useStorageStore = create(persist((set, get) => ({
  systemConfig: defaultSystemConfig,      // ❌ Server data
  currentLab: defaultLab,                 // ❌ Server data

  // All the CRUD operations              // ❌ Server operations
  addTank, updateTank, deleteTank,
  addRack, updateRack, deleteRack,
  // ... 900 more lines
}), { name: 'odysseus-configuration-store' }));  // ❌ localStorage persist
```

**After (~100 lines):**
```typescript
const useStorageStore = create((set) => ({
  // UI-only state (no persist needed)
  selectedTankId: null as string | null,
  selectedRackId: null as string | null,
  selectedBoxId: null as string | null,
  collapsedTanks: new Set<string>(),
  collapsedRacks: new Set<string>(),
  viewMode: 'tree' as 'tree' | 'byUser',

  // UI actions only
  setSelectedTank: (tankId) => set({ selectedTankId: tankId }),
  setSelectedRack: (rackId) => set({ selectedRackId: rackId }),
  toggleTankCollapse: (tankId) => set(state => { ... }),
  // ... UI actions only
}));
```

#### 4.2 Update All Components

Replace Zustand hooks with React Query:

| Old (Zustand) | New (React Query) |
|---------------|-------------------|
| `useCurrentLab()` | `useStorageData().currentLab` |
| `useCurrentTanks()` | `useStorageData().getCurrentTanks()` |
| `useCurrentRacks(tankId)` | `useStorageData().getCurrentRacks(tankId)` |
| `useCurrentBoxes(tankId, rackId)` | `useStorageData().getCurrentBoxes(tankId, rackId)` |

#### 4.3 Remove localStorage Persistence

The `persist` middleware stores configuration in localStorage. After migration:
- Remove `persist` wrapper entirely
- Delete `odysseus-configuration-store` from localStorage (one-time cleanup)

---

### Phase 5: Optimistic Locking (Optional - Lower Priority)

With immediate save pattern, optimistic locking is **less critical** but provides additional safety for concurrent edits.

**When it matters:** Two admins editing the same tank simultaneously - last write wins without locking.

**Implementation (if needed later):**

```typescript
// Server: UpdateTankCommandHandler
if (command.expectedVersion !== currentConfig.version) {
  throw new ConflictError(
    'Configuration was modified by another user. Please refresh and try again.'
  );
}
```

```typescript
// Client: useUpdateTankMutation
updateTankMutation.mutate({
  tankId,
  updates,
  expectedVersion: currentConfig.version
});
```

**Decision:** Defer to Phase 5. The immediate save pattern already prevents the main data loss scenarios (stale localStorage, full-state replacement). Optimistic locking can be added later if concurrent admin editing becomes a real issue.

---

### Phase 6: Deprecate Dangerous Endpoint

After all components migrate to CQRS endpoints:

1. Add deprecation warning to `PUT /api/configuration`
2. Log usage to identify any remaining callers
3. Eventually remove the endpoint

---

### Phase 7: Rename StorageManagementModal to StorageManagerModal

Rename the modal from "Storage Management" (the action) to "Storage Manager" (the tool). This follows standard naming conventions (File Manager, Task Manager, Package Manager).

#### Changes Required

**File Renames:**
- `StorageManagementModal.tsx` → `StorageManagerModal.tsx`
- `StorageManagementContext.tsx` → `StorageManagerContext.tsx` (if exists)

**Component Renames:**
- `StorageManagementModal` → `StorageManagerModal`
- `StorageManagementContext` → `StorageManagerContext`

**Import Updates:**
- Update all files importing the old component names

**UI Text Updates:**
- Modal title: "Manage Storage" → "Storage Manager"
- Any button labels referencing "Storage Management"

**Why do this last:** The Phase 3 refactor significantly changes the modal's internals. Doing the rename separately keeps changes atomic and makes debugging easier if issues arise.

---

## Implementation Priority

| Priority | Phase | Item | Risk Mitigation |
|----------|-------|------|-----------------|
| 1 | Phase 1 | Tank CRUD endpoints | Prevents equipment loss |
| 2 | Phase 1 | Rack endpoints (with bulk) | Prevents rack loss |
| 3 | Phase 1 | Box endpoints (with bulk) | Prevents box loss |
| 4 | Phase 1 | Assignment endpoints | Prevents assignment loss |
| 5 | Phase 1 | Initialize endpoint | Safe fresh install |
| 6 | Phase 2 | React Query mutations | Client-side safety |
| 7 | Phase 3 | StorageManagementModal refactor | Removes dangerous save pattern |
| 8 | Phase 4 | Remove server data from Zustand | Eliminates dual-state risk |
| 9 | Phase 6 | Deprecate dangerous endpoint | Removes risk entirely |
| 10 | Phase 7 | Rename to StorageManagerModal | Cleaner naming convention |
| — | Phase 5 | Optimistic locking (optional) | Defer - lower priority |

---

## Success Criteria

### Data Safety
- [ ] No operation can accidentally wipe unrelated data
- [ ] Stale localStorage data cannot overwrite server data
- [ ] Multi-tab usage is safe

### Architecture Compliance
- [ ] React Query is single source of truth for server state
- [ ] Zustand stores only UI state (no `persist` for server data)
- [ ] All save operations use dedicated CQRS endpoints

### Feature Parity
- [ ] Bulk rack add (count-based) works
- [ ] Bulk box add (count-based) works
- [ ] Bulk assign/unassign works
- [ ] All current functionality preserved

---

## Files to Create/Modify

### Server - New Files

| File | Purpose |
|------|---------|
| `application/commands/TankCommands.ts` | AddTankCommand, UpdateTankCommand, DeleteTankCommand handlers |
| `application/commands/RackCommands.ts` | AddRacksCommand, UpdateRackCommand, DeleteRackCommand handlers |
| `application/commands/BoxCommands.ts` | AddBoxesCommand, UpdateBoxCommand, DeleteBoxCommand handlers |
| `application/commands/AssignmentCommands.ts` | AssignRackCommand, AssignBoxCommand, BulkAssign/Unassign handlers |
| `application/commands/InitializeConfigCommand.ts` | Fresh install initialization handler |

### Server - Modify

| File | Changes |
|------|---------|
| `presentation/routes/ConfigurationRouteModule.ts` | Add new routes for all CQRS endpoints |
| `presentation/controllers/ConfigurationController.ts` | Add handler methods for new endpoints |
| `domain/events/ConfigurationEvents.ts` | Already complete - no changes needed |

### Client - New Files

| File | Purpose |
|------|---------|
| `domains/storage/hooks/useStorageEquipmentMutations.ts` | All CQRS mutation hooks |
| `domains/storage/hooks/useInitializeConfigMutation.ts` | Fresh install mutation |

### Client - Modify

| File | Changes |
|------|---------|
| `domains/storage/services/StorageService.ts` | Add API methods for new endpoints |
| `domains/storage/stores/storageStore.ts` | Strip to UI-only state (~100 lines from ~940) |
| `domains/storage/ui/components/modals/StorageManagementModal.tsx` | Use new mutations instead of full-config save |
| `domains/storage/hooks/useConfigurationSync.ts` | Use initialize endpoint for fresh install |
| `domains/storage/index.ts` | Export new mutations, remove Zustand server-data exports |
| `app/components/layout/AppHeader.tsx` | Use `useStorageData()` instead of `useCurrentLab()` |

### Client - Delete (After Migration)

| Export/Hook | Reason |
|-------------|--------|
| `useCurrentLab()` | Replace with `useStorageData().currentLab` |
| `useCurrentTanks()` | Replace with `useStorageData().getCurrentTanks()` |
| `useCurrentRacks()` | Replace with `useStorageData().getCurrentRacks()` |
| `useCurrentBoxes()` | Replace with `useStorageData().getCurrentBoxes()` |
| `useSaveStorageMutation()` | Replace with specific CQRS mutations |

### Testing Requirements

| Area | Test Type | Coverage |
|------|-----------|----------|
| New command handlers | Integration | Happy path + validation errors + permission denied |
| Tube deletion blocking | Unit | Verify equipment with tubes cannot be deleted |
| Domain event emission | Integration | Verify correct events emitted for each operation |
| React Query mutations | Component | Optimistic updates + error rollback |
| StorageManagementModal | E2E | Full user flow with new endpoints |

---

## Rollback Plan

If issues arise during migration:
1. Keep old `PUT /api/configuration` endpoint functional
2. Keep `useSaveStorageMutation` as fallback
3. Feature flag new endpoints: `FEATURE_CQRS_STORAGE=true`

---

## Implementation Notes

- **Pattern precedent:** The lab name fix (`PUT /configuration/system`) established the correct pattern - this migration extends it to all operations
- **Reusable code:** `storageLocalUpdates.ts` utility functions can be reused for optimistic UI updates
- **Correct hook exists:** `useStorageData.ts` is the correct pattern - all components migrate to this
- **Cleanup required:** After deployment, clear `odysseus-configuration-store` from localStorage (add to release notes)
- **Method rename (Phase 4):** After removing the legacy `deleteTank` method from `StorageService.ts`, rename `deleteTankCQRS` back to `deleteTank` for consistency. The `CQRS` suffix was added temporarily to avoid naming collision during migration.
