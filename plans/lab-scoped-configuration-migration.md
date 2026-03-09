# Lab-Scoped Configuration Migration Plan

## Problem

The `ConfigurationRepository` has a legacy singleton pattern where many methods internally call `getCurrent()`, which queries `WHERE id = 1`. In a multi-tenancy architecture where each lab has its own configuration row (keyed by `lab_id`), these singleton methods silently ignore lab context and always return the first row. This means equipment validation, settings queries, and other operations can read the wrong lab's data.

## Current State

### What's already lab-scoped (working correctly)
- `getForLab(labId)` / `saveForLab(labId, config)` / `ensureDefaultForLab(labId)`
- `deleteEmptyTank/Rack/Box(labId, ...)` — atomic equipment deletion
- `saveWithVersioning(..., labId?)` / `saveWithOptimisticLock(..., labId?)` — labId is optional, defaults to singleton
- `getSystemMetrics(labId)`
- All **ConfigurationCommands** handlers — correctly use `getForLab()` and pass labId to `saveWithOptimisticLock()`
- **TubeApplicationService** — correctly calls `getForLab(labId)` everywhere
- Most **ConfigurationQueries** handlers — correctly use `getForLab()`

### What's broken (singleton methods)

**Category A — Equipment validation (called by TubePositionService with labId available but not passed):**
- `isLocationValid(location)` — no labId
- `tankExists(tankId)` — no labId
- `rackExists(tankId, rackId)` — no labId
- `boxExists(tankId, rackId, boxId)` — no labId
- `getMaxPosition(tankId, rackId, boxId)` — no labId
- `getAvailablePositions(tankId, rackId, boxId, occupiedPositions)` — no labId
- `getAllTankIds()` — no labId
- `getRackIds(tankId)` — no labId
- `getBoxNames(tankId, rackId)` — no labId

**Category B — Settings getters/setters (called internally via getCurrent):**
- `getLabName()` / `updateLabName()`
- `getDefaultResearcher()` / `updateDefaultResearcher()`
- `getAutoSave()` / `updateAutoSave()`
- `getAuditTrailEnabled()` / `updateAuditTrailEnabled()`
- `getSyncEnabled()` / `updateSyncEnabled()`

**Category C — Stats/export/maintenance:**
- `getEquipmentSummary()` — no labId
- `getCapacityInfo()` — no labId
- `exportConfiguration()` — no labId
- `importConfiguration(configExport)` — no labId
- `createSnapshot(description?)` — no labId
- `getStats()` — no labId
- `performMaintenance()` — no labId
- `getForApi()` / `getForFrontend()` — no labId
- `validateConfiguration(configuration)` — no labId

**Category D — History/versioning:**
- `getHistory(limit?)` — no labId (ConfigurationQueries handler has labId but doesn't pass it)
- `getByVersion(version)` — no labId (ConfigurationQueries handler has labId but doesn't pass it)

**Category E — Intentionally system-wide (DO NOT add labId):**
- `getSecurityConfig()` — system-wide security policy
- `updateSecurityConfig(updates)` — system-wide security policy
- `getSyncStatus()` — global sync state
- `isHealthy()` — infrastructure health check

## Migration Strategy

**Approach:** Add `labId: string` as the first parameter to every method that reads or writes lab-specific configuration. This matches TubeRepository's established pattern where every method takes `labId`.

**Principle:** Make `labId` required, not optional. No fallbacks to singleton queries. If a caller doesn't have labId, that's a bug to fix at the call site, not something to paper over with a default.

## Implementation Steps

### Phase 1: Domain Interface — Add `labId` to all lab-scoped methods

**File:** `server/src/domain/repositories/ConfigurationRepository.ts`

Changes:
1. Remove `getCurrent()` — replaced by `getForLab(labId)` which already exists
2. Remove `save(configuration)` — replaced by `saveForLab(labId, configuration)` which already exists
3. Make `labId` required (not optional) on `saveWithVersioning()` and `saveWithOptimisticLock()`
4. Add `labId: string` as first parameter to all Category A, B, C, D methods listed above
5. Leave Category E methods unchanged (system-wide singletons)

### Phase 2: Infrastructure Implementation — Replace `getCurrent()` internals

**File:** `server/src/infrastructure/repositories/ConfigurationRepository.ts`

Changes:
1. Delete `getCurrent()` method (the `WHERE id = 1` query)
2. Every method that currently calls `getCurrent()` must instead:
   - Accept `labId: string` parameter
   - Call `getForLab(labId)` instead of `getCurrent()`
3. Update `saveWithVersioning()` — make `labId` required, remove the `WHERE id = 1` fallback path
4. Update all ~25 methods listed in Categories A-D to accept and use labId

### Phase 3: Domain Entity — Clean up string conversion leftovers

**File:** `server/src/domain/entities/Configuration.ts`

- Already completed in prior session (rackId string fixes)
- No additional changes needed

### Phase 4: TubePositionService — Pass labId to ConfigurationRepository

**File:** `server/src/domain/services/TubePositionService.ts`

Changes (6 call sites):
- `configurationRepository.isLocationValid(location)` → `configurationRepository.isLocationValid(labId, location)`
- `configurationRepository.tankExists(tankId)` → `configurationRepository.tankExists(labId, tankId)`
- `configurationRepository.rackExists(tankId, rackId)` → `configurationRepository.rackExists(labId, tankId, rackId)`
- `configurationRepository.boxExists(tankId, rackId, boxId)` → `configurationRepository.boxExists(labId, tankId, rackId, boxId)`
- `configurationRepository.getMaxPosition(tankId, rackId, boxId)` → `configurationRepository.getMaxPosition(labId, tankId, rackId, boxId)`
- `configurationRepository.getAvailablePositions(...)` → `configurationRepository.getAvailablePositions(labId, ...)`

### Phase 5: ConfigurationQueries — Fix remaining singleton calls

**File:** `server/src/application/queries/ConfigurationQueries.ts`

Changes:
- `GetConfigurationHistoryQueryHandler`: `getHistory(limit)` → `getHistory(labId, limit)`
- `GetConfigurationByVersionQueryHandler`: `getByVersion(version)` → `getByVersion(labId, version)`

### Phase 6: Remaining External Callers

**AuditEventHandler** (`server/src/application/eventHandlers/AuditEventHandler.ts`):
- `getDisplayLocation()` calls `getCurrent()` — needs labId injected
- The audit event should carry `labId` in its payload (it likely already does from the tube/config context)

**UserCommands** (`server/src/application/commands/UserCommands.ts`):
- `deleteCascade()` has fallback: `user.labId ? getForLab(user.labId) : getCurrent()`
- Fix: require `labId` — if deleting a user's lab data, the lab must be known

**UserApplicationService** (`server/src/application/services/UserApplicationService.ts`):
- `getAdminResourceSummary()` has same fallback pattern
- Fix: require `labId` parameter from caller

**TubeRepository** (`server/src/infrastructure/repositories/TubeRepository.ts`):
- `addPositionLabelFilter()` has fallback: `labId ? getForLab(labId) : getCurrent()`
- Fix: require `labId` (it's always available from TubeRepository method callers) — remove `getCurrent()` fallback

### Phase 7: Clean Up

1. Remove `getCurrent()` from domain interface entirely
2. Remove `save(configuration)` from domain interface (use `saveForLab`)
3. Remove any remaining `WHERE id = 1` queries (should be zero after Phase 2)
4. Remove internal helper methods that only existed to support the singleton pattern

## Method Signature Changes (Complete Reference)

```typescript
// BEFORE → AFTER

// Remove entirely (use getForLab instead)
getCurrent(): Promise<Configuration | null>
save(configuration: Configuration): Promise<number>

// Make labId required
saveWithVersioning(config, desc?, changedBy?, labId?: string) → saveWithVersioning(labId: string, config, desc?, changedBy?)
saveWithOptimisticLock(config, expectedVersion, desc?, changedBy?, labId?: string) → saveWithOptimisticLock(labId: string, config, expectedVersion, desc?, changedBy?)

// Add labId as first parameter
isLocationValid(location) → isLocationValid(labId: string, location)
tankExists(tankId) → tankExists(labId: string, tankId)
rackExists(tankId, rackId) → rackExists(labId: string, tankId, rackId)
boxExists(tankId, rackId, boxId) → boxExists(labId: string, tankId, rackId, boxId)
getAvailablePositions(tankId, rackId, boxId, occupied) → getAvailablePositions(labId: string, tankId, rackId, boxId, occupied)
getMaxPosition(tankId, rackId, boxId) → getMaxPosition(labId: string, tankId, rackId, boxId)
getAllTankIds() → getAllTankIds(labId: string)
getRackIds(tankId) → getRackIds(labId: string, tankId)
getBoxNames(tankId, rackId) → getBoxNames(labId: string, tankId, rackId)
getEquipmentSummary() → getEquipmentSummary(labId: string)
getCapacityInfo() → getCapacityInfo(labId: string)
getLabName() → getLabName(labId: string)
updateLabName(name) → updateLabName(labId: string, name)
getDefaultResearcher() → getDefaultResearcher(labId: string)
updateDefaultResearcher(r) → updateDefaultResearcher(labId: string, r)
getAutoSave() → getAutoSave(labId: string)
updateAutoSave(v) → updateAutoSave(labId: string, v)
getAuditTrailEnabled() → getAuditTrailEnabled(labId: string)
updateAuditTrailEnabled(v) → updateAuditTrailEnabled(labId: string, v)
getSyncEnabled() → getSyncEnabled(labId: string)
updateSyncEnabled(v) → updateSyncEnabled(labId: string, v)
exportConfiguration() → exportConfiguration(labId: string)
importConfiguration(export) → importConfiguration(labId: string, export)
createSnapshot(desc?) → createSnapshot(labId: string, desc?)
restoreFromSnapshot(id) → restoreFromSnapshot(labId: string, id)
listSnapshots() → listSnapshots(labId: string)
cleanupSnapshots(keep) → cleanupSnapshots(labId: string, keep)
getForApi() → getForApi(labId: string)
getForFrontend() → getForFrontend(labId: string)
validateConfiguration(config) → validateConfiguration(labId: string, config)
getStats() → getStats(labId: string)
performMaintenance() → performMaintenance(labId: string)
getHistory(limit?) → getHistory(labId: string, limit?)
getByVersion(version) → getByVersion(labId: string, version)

// UNCHANGED (system-wide singletons)
getSecurityConfig(): Promise<SecurityConfig>
updateSecurityConfig(updates): Promise<SecurityConfig>
getSyncStatus(): Promise<SyncStatus>
isHealthy(): Promise<boolean>
```

## Execution Order

Phases 1-2 must go together (interface + implementation). Phase 4 (TubePositionService) is the highest-priority fix since it affects tube creation/validation. Phases 3, 5, 6 can follow in any order. Phase 7 is cleanup after everything compiles.

## Risk Notes

- This is a breaking change across the domain interface — every caller must be updated in the same commit
- TypeScript compiler will catch any missed call sites (type errors on missing labId)
- The `getForLab()` method already handles the `WHERE lab_id = $1` query correctly, so the database layer is ready
- No database migration needed — `configuration_current` table already has `lab_id` column

## Verified Callers — Full Audit (37 files import ConfigurationRepository)

### Already lab-scoped (no changes needed) — 14 files
- `ConfigurationCommands.ts` — all handlers use `getForLab(labId)` + `saveWithOptimisticLock(..., labId)`
- `BoxCommands.ts` — uses `getForLab(labId)`, `saveWithOptimisticLock(..., labId)`, `deleteEmptyBox(labId, ...)`
- `RackCommands.ts` — uses `getForLab(labId)`, `saveWithOptimisticLock(..., labId)`, `deleteEmptyRack(labId, ...)`
- `TankCommands.ts` — uses `getForLab(labId)`, `saveWithOptimisticLock(..., labId)`, `deleteEmptyTank(labId, ...)`
- `InviteCodeCommands.ts` — uses `getForLab(labId)`
- `LabCommands.ts` — uses `ensureDefaultForLab(lab.id)`
- `DemoSeedCommands.ts` — uses `getForLab(labId)`, `saveWithOptimisticLock(..., labId)`
- `InitializeConfigurationCommand.ts` — uses `getForLab(labId)`, `saveWithOptimisticLock(..., labId)`
- `BulkAssignmentCommands.ts` — uses `getForLab(labId)`, `saveWithOptimisticLock(..., labId)`
- `TubeApplicationService.ts` — uses `getForLab(labId)` everywhere
- `LabController.ts` — uses `getForLab(lab.id)`
- `LookupValueController.ts` — uses `getForLab(extractLabId(req))`
- `ConfigurationQueries.ts` — `GetCurrentConfigurationQueryHandler` and `GetConfigurationForUserQueryHandler` use `getForLab(labId)` (but `getHistory` and `getByVersion` handlers are singleton — covered in Phase 5)

### System-wide singletons (no changes needed) — 5 files
- `JwtSessionService.ts` — calls `getSecurityConfig()` only (4 times)
- `BcryptPasswordService.ts` — calls `getSecurityConfig()` only
- `RateLimiting.ts` middleware — calls `getSecurityConfig()` only
- `AuthRouteModule.ts` / `PublicRouteModule.ts` — pass ConfigurationRepository to rate limiter middleware only

### Type-only imports (no method calls) — 7 files
- `ValidationService.ts`, `SocketEventHandler.ts`, `AuthController.ts`
- `ResourceRouteModule.ts`, `SearchRouteModule.ts`
- Repository index files, domain index files

### Need migration (covered in plan phases) — 7 files
- `TubePositionService.ts` — 6 calls missing labId (Phase 4)
- `ConfigurationQueries.ts` — `getHistory`, `getByVersion` missing labId (Phase 5)
- `AuditEventHandler.ts` — `getCurrent()` call (Phase 6)
- `UserCommands.ts` — `getCurrent()` fallback (Phase 6)
- `UserApplicationService.ts` — `getCurrent()` fallback (Phase 6)
- `TubeRepository.ts` — `getCurrent()` fallback in `addPositionLabelFilter` (Phase 6)
- `ExportService.ts` — calls `getSecurityConfig()` which is fine, but may also have lab-scoped calls to verify
