# Application Layer Findings — Bucket 3, Batch 2 (server/src/application)

**Date:** 2026-07-12 · **Branch:** `audit/fixes` · **Status: AWAITING REVIEW — nothing applied**

All 56 files audited by 13 finders; every load-bearing zero-caller claim independently re-verified
by the coordinator (no findings withdrawn this round — the tightened finder methodology held).
**17 files verified CLEAN**, including the Donor exemplar (again) and 4 of 6 command modules.
Overall the layer is structurally healthy: every service method except two is controller-reachable,
all 42 command/query handlers are DI-wired and routed. The findings concentrate in dead contract
surface, silently-dropped inputs, and cross-service duplication.

## A. File deletions
None this layer.

## B. Dead code — grep-proven, coordinator-re-verified (recommend: apply)

1. **6 dead port methods + their impls:** `EventBus.publishAll/unsubscribe/getSubscriptions`
   (→ InMemoryEventBus), `ConfigurationService.getAll/isProduction` (→ EnvironmentConfigurationService
   + tests), `SessionService.revokeSession` (→ JwtSessionService; logout revokes via the repository,
   not this port — also trim the file header's stale "revocation" mention).
2. **Dead service methods:** `TubeApplicationService.getTubesByRackAndBox` (self-labeled legacy);
   `UserApplicationService.isFirstTimeSetup` (ghost duplicating the live query handler);
   `AuditService.getUserActivity` + `getActionLog` (speculative; cascades: `AuditRepository.findByUserId`
   interface + Postgres impl lose their only caller); `PresenceService.getConnectedUsers`.
3. **Ghost event chain #3 — `LabNameChangedEvent`:** never constructed (renames fire `LabRenamedEvent`).
   Delete: class (StorageEvents.ts), DomainEventMap import+entry, subscription+handler in
   AuditEventHandler AND SocketEventHandler (+ import + type-union member), and the client
   `SocketQueryBridge` unreachable `'LabNameChanged'` branch.
4. **Dead/write-only fields:** `LoginResult.sessionToken` (always `''`, never read) +
   `EnhancedLoginResponse.sessionToken` (tokenTypes) + its population in JwtSessionService;
   `CreateSystemAdminCommand.initiatedBy` (never populated or read);
   **`UpdateSystemStorageCommand.systemSettings` — 6 of 7 fields silently dropped** (timezone,
   dateFormat, temperatureUnit, enableAuditTrail [misnamed vs entity's auditTrailEnabled],
   autoBackupEnabled, backupRetentionDays; entity accepts labName only; client sends labName only)
   → narrow to `{ labName?: string }`; `RateLimitingService.cleanupInterval` field (stored, never
   read — keep the bare `setInterval`).
5. **Retire the `BaseQuery` scaffolding:** `queryId`/`createdAt`/`requestedBy` are write-only;
   only UserQueries (1 of 4 query files) adopted the base; `AdminUserController:62` passes a real
   user id that's discarded. Collapse the 3 subclasses to plain query interfaces (the other query
   files' convention), delete `BaseQuery` + the internal `Query` interface + `randomUUID` import,
   stop passing the dead arg at the 3 construction sites.
6. **Unexports:** `UpdateMyProfileRequest` (PersonApplicationService), `ScopedByIdReader` +
   `RequesterScope` (findByIdForRequester) — zero external importers each.

## C. Parallel shapes — server hand-rolls what shared-schemas already defines (recommend: apply)

| # | Where | Swap to |
|---|-------|---------|
| C1 | EquipmentApplicationService bulk methods (param + return ×3) | `EquipmentBulkStatusRequest['data']` / `EquipmentBulkRelocateRequest['data']` / `EquipmentBulkResponse` — **also fixes a real type-wideness bug**: hand-rolled `status` admits `'decommissioned'`, which the route's schema excludes |
| C2 | SupplyApplicationService local `BulkResult` (×5 returns) | `SupplyBulkResponse` |
| C3 | TubeApplicationService `moveTubes` param | `BulkMoveRequest['moves']` (client already derives it) |
| C4 | StorageAnalyticsApplicationService inline return literals | `LabStorageAnalyticsResponse` / `CrossLabStorageAnalyticsResponse` (field-exact match) |
| C5 | TubeDto `fromUpdateRequest` — identical ~20-field inline type written twice | one named local type |
| C6 | StorageDto duplicate `defaultGridConfig` literal ×2 | one const — at apply time check whether shared-schemas' `DEFAULT_GRID_CONFIG` is the same value and import it instead of hoisting a local |

## D. In-file extractions + small refactors (recommend: apply)

- **UserApplicationService:** replace the private `validatePasswordPolicy` copy with the shared
  PasswordGuards helper (storageRepository non-null already guaranteed by caller); extract the
  `requireCanManageUsers`+demo-guard pair repeated at 5 method heads; drop `ensureNotLastAdmin`'s
  always-`'delete'` parameter; delete 2 restatement JSDocs.
- **rejectIfDemoLab twin (User + Researcher services):** consolidate into `DemoGuards` (the
  established home) as a parameterized guard preserving each service's exact message
  ("X management is restricted in the demo environment"). Note: one finder proposed reusing
  `rejectDemoConfigOperation` — rejected here because its message wording differs; a new
  parameterized sibling keeps behavior identical.
- **TubeApplicationService:** extract `loadModifiableTube` (the ~20-line load+authorize preamble ×3)
  and `loadTubesForBulk` (the setup triple ×6); fix the stale `executeBulk` JSDoc consumer list.
- **SecurityMonitoringApplicationService:** extract `revokeAssociatedToken` (byte-identical block ×2).
- **AuditEventHandler:** extract `formatRawLocation` (×5); name the preview cap
  (`AUDIT_TUBE_ID_PREVIEW_LIMIT = 10`, ×8 literals).
- **BulkAssignmentCommands:** extract the shared tank/rack/box traversal+persist helper
  (unassign/reassign handlers are ~95% identical in-file).
- **ExportService:** make the 3 always-provided repos required; delete the 2 unreachable guards
  (factory always constructs them; tsc gates the optionality question at compile time).

## E. Cross-service consolidations (judgment calls)

| # | Item | Recommendation |
|---|------|----------------|
| E1 | `executeBulk` byte-identical ×3 (Tube/Supply/Equipment) + unused `index` param | **Apply**: one shared helper under `application/`, drop the dead param |
| E2 | AssignRack ↔ AssignBox handlers ~90% identical, 2 behavioral divergences (ValidationError vs NotFoundError for missing user; `null` vs `?? undefined` coercion) | **Apply with care**: shared assign-flow helper; standardize on NotFoundError + `?? undefined` (behavior change — flagging) |
| E3 | Update-handler trio + Delete-handler trio scaffolding across Tank/Rack/Box | **Defer** — error-ordering-sensitive, larger extraction; own pass |
| E4 | Equipment ↔ Supply category-tree twin (depth guard, delete cascade, getItemOrThrow, trackItemChanges) | **Defer** — mirrors the client P1b decision; deserves its own consolidated pass with the drifts reconciled deliberately |
| E5 | AuditRetentionService queryAllLogs/ForLab near-dup | **Leave** — extraction needs 2 callback params; over-abstraction for 2 callers |

## F. Socket payload contract (decision needed)

The client's only socket consumer reads a fraction of what the server sends: 14 events carry
entirely-unread payloads; ~10 more carry unread metadata (timestamps, actor names, counts).
Trimming requires changing the event schemas in shared-schemas in tandem (client validates with
them; a removed-but-required field would drop whole events).

**Recommendation: defer to the shared-schemas batch** (it owns those schema files), treating
today's payloads as the wire contract until then. Alternative: trim now in one coordinated change.

## G. Comments / headers (recommend: apply)
StorageDto stale bidirectional header; SupplyDto "(removed in P2)" process ref; tokenTypes
title + "(for analytics)" claim; AuditConfig 2 stale/restating comments; PasswordService DIP
boilerplate; EmailVerificationCommands + InviteCodeQueries + LookupValue service headers;
Rack/StorageCommands header enumerations; BoxCommands 2 restatement JSDocs; 1 bare eslint-disable
reason (StorageCommands:460); `CheckStorageHealthQuery` named-interface consistency; 2 log-casing
nits (SocketEventHandler).

---

**Scale if B+C+D+E1+E2+G approved:** ~40 files touched; a few hundred lines deleted; the one
intentional behavior change is E2's error-type standardization (cross-lab/missing-user cases in
rack/box assignment).
**Verification plan:** build:shared · tsc both · lint ×3 · Jest · integration 36 · client typecheck
(SocketQueryBridge branch removal) · Vitest.
