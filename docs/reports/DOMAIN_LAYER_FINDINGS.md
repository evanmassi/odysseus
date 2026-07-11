# Domain Layer Findings — Bucket 3, Batch 1 (server/src/domain)

**Date:** 2026-07-11 · **Branch:** `audit/fixes` · **Status: AWAITING REVIEW — nothing applied**

All 81 domain files audited by 15 finder agents against `docs/audit-rubric.md`; every cross-file
claim grep-verified; cascades reconciled across reports. **14 files verified CLEAN** including the
Donor exemplars and ResearcherRepository (exemplar status confirmed). Everything below is a
proposal — grouped by the decision it needs.

---

## Re-verification status (2026-07-11): COMPLETE

Every load-bearing zero-caller claim below was independently re-verified by the coordinator with
fresh greps (receiver-aware patterns, construction-site checks, non-test scoping). Outcome:
**2 findings withdrawn** (both would have changed behavior — the review gate worked), the rest
confirmed. Cascades extended where re-verification revealed deeper chains.

**WITHDRAWN — do not touch:**
- ~~Delete StorageEvents.ts + 21 DomainEventMap entries~~ — the storage-events subsystem is ALIVE:
  Tank/Rack/Box/Storage/BulkAssignment commands + UserApplicationService construct and publish these
  events (11 importing files), and both AuditEventHandler (audit trail) and SocketEventHandler
  (live UI sync) subscribe to all 17 names. The finder's grep was broken.
- ~~SampleData mediaSupplements/mediaSelection getters dead~~ — ALIVE: read off the VO by
  TubeMapper.ts:74-75 (DB rows) and AuditEventHandler.ts:426-427 (audit details).

## A. File deletions (need explicit sign-off) — re-verified

| # | Delete | Evidence |
|---|--------|----------|
| A2 | `domain/services/StorageChangeService.ts` (~381 lines) | Only instantiation: its own test (`new StorageChangeService()` at test:68). The live event publishers are the command handlers, not this diff-detection service. Its `ConfigurationChangeSummary` type has no other consumer (InitializeStorageCommand builds its summary as an inline literal — verified). |
| A3 | `domain/services/StorageChangeService.test.ts` | Tests the dead service. |

## B. Dead code — grep-proven, zero production callers (recommend: apply all)

### B1. Repository interface methods (41) + their Postgres impls
Every one verified with receiver-greps (`repo.<method>` across the whole tree) and alias checks:

- **RefreshTokenRepository (10 of 20!):** findById, findValidTokensByUserId, findAllTokensByUserId,
  deleteByToken, revoke, revokeExpiredTokens, recordTokenUsage, countActiveTokensForUser,
  bulkRevoke, bulkDelete — the OAuth-style token-management surface was built but the live JWT flow
  uses only 10 methods.
- **UserRepository (2):** findByApiKey (JSDoc "Primary authentication lookup" is stale — API-key
  auth is not wired; auth is JWT/session), apiKeyExists.
- **StorageRepository (5):** exportStorage, importStorage, validateStorage + saveWithVersioning
  (cascade: only importStorage called them), getAvailablePositions (cascade: only dead
  TubePositionService method called it) + orphaned `StorageExport`/`StorageValidationResult` types.
- **TubeRepository (6):** findByTank, findByTankIds, isPositionAvailable, saveMany,
  findByResearcher (cascade), countByResearcher (cascade).
- **LabRepository (3):** findActive, delete, exists. **PersonRepository (2):** emailExists, findAll.
- **SupplyItemRepository (3):** findByLabId, findByCategoryId, getTotalStock.
- **Equipment/SupplyCategoryRepository (2):** hasItems ×2 (delete guards use hasItemsIncludingChildren).
- **InviteCodeRepository (1):** findActiveByLabId. **LookupValueRepository (1):** countTubesUsingValue
  (singular; the batched plural is the live one). **UserSessionRepository (1):** delete (sessions are
  soft-revoked). **AuditRepository (1):** deleteOlderThan (retention deletes via the archive repo).

### B2. Dead service methods + their DI/type cascades
- **AccessControlService:** canEditResearcher, canDeleteResearcher (researcher delete-protection
  never wired), canPerformMaintenance + canAssignResource (test-only). Cascades: `Researcher` import,
  `userRepository` ctor dep (+ ServiceContainer arg), `AccessResult.metadata` field (written once,
  read never — trim createAllowed/DeniedResult params).
- **ValidationService:** the entire 8-method tube/researcher/bulk validation cluster (~350 lines) —
  a dead parallel system; the live tube path validates inline/via shared schemas. Only
  `validateStorageUpdate` survives. Cascades: 5 ctor deps drop to 2 (+ ServiceContainer + test),
  header description update. (Includes a drifted concentration rule that disagrees with
  `concentrationUnitRefinement` — dies with the cluster.)
- **TubePositionService:** canMoveTubeTo, getSuggestedAlternativePositions, findOptimalPosition,
  getBoxStatistics + the never-populated `conflicts` return field. Cascades:
  `PositionConflict`/`BoxStatistics` types, `conflicts:` trims at TubeApplicationService:153/529.
- **RolePermissionService:** hasAnyPermission, hasAllPermissions, getAllRoles, getRolesWithPermission.
- **EmailService.sendPasswordResetEmail** + ConsoleEmailService impl (reset flow never emails).

### B3. Dead entity/VO members (test-only or zero callers)
- **Tube (12):** isExpired, hasConcentrationData, hasCompleteSampleData (sole caller is inside the
  dead ValidationService cluster), isInSameLocationAs, isInSameRackAs, getLocationDescription,
  isLockedBy, canBeAccessedBy, updateSample, assignToResearcher, equals, toString. **Cascade:**
  SampleData.isExpired/isComplete/hasConcentration are only called by the three dead Tube wrappers
  (Tube.ts:380/384/388) → delete together. (Session/token isExpired are separate live methods.)
- **User (5):** toData (fromData stays), getPermissions, requirePermission, hasHigherPrivilegesThan, toString.
- **Storage (7):** removeTank, updateTanks, updateRacks, updateBoxes, locationExists,
  getAvailablePositions, toApiData.
- **Equipment VO (8):** Tank/Rack/Box.equals ×3, positionToGridCoordinates, gridCoordinatesToPosition,
  getAllPositionLabels, getValidBoxNames + validBoxNames getter, Box.gridSize.
- **UserSession (7):** isValid, recordActivity, revoke, getAgeInMinutes, getInactiveMinutes,
  getMinutesUntilExpiration, toJSON (production uses repository SQL paths for all of these).
- **RefreshToken (5):** isRecentlyUsed, isNearingExpiry, toSecureData, daysUntilExpiry, timeUntilExpiry.
- **Location (2):** toKey, isInSameBox. **SampleData (1):** empty() (media getters withdrawn — alive).
- **Permission (5):** description + category getters, getAllCategories, toString, toJSON.
- **Person / Researcher / InviteCode / Lab:** equals ×4, toString ×2, Lab.toPublicData.
- **Researcher dual accessor:** delete isActive() — its only caller is inside the dead
  ValidationService cluster; the `active` getter is the convention (7+ sites).
- **EquipmentCategory.reorder + SupplyCategory.reorder** (identical dead twins; update() covers sortOrder).

### B4. Event-system dead surface
- **DomainEvent.toData() + getEventData() + DomainEventData:** the serialization path has zero
  callers (bus routes on eventName(); handlers read fields directly) → delete base surface + all
  ~54 per-class getEventData() overrides across 10 event files.
- **`version` field:** only read inside dead toData() → drop field + the `1` arg from every
  `super(1, labId)` call. *(Keep only if you want future event-sourcing headroom — say so.)*
- **Ghost events (never constructed, handlers waiting):** ResearcherApprovedEvent +
  InviteCodeUsedEvent → delete class + DomainEventMap entry + AuditEventHandler subscription/handler each.
- **Dead bulk payload fields:** tankIds / sourceTankIds / destinationTankIds on the 4 bulk tube
  events (perItemData superseded them) → also removes ~60 lines of dead computation at 4
  TubeApplicationService construction sites.

### B5. Dead type members
- `TubeSearchCriteria.isExpired` + `.groupBy` — declared, never set, never read (silently-dropped filters).

### B6. Test cleanup
Corresponding test blocks for every deleted method (12+ test files). SampleData tests swap
`.empty()` → `.create({})`.

## C. Refactors / consolidations (judgment calls)

**Recommend apply now (mechanical, in-file, behavior-neutral):**
| # | Change |
|---|--------|
| C1 | `Storage.fromData` param → reuse `StorageImportData` (kills 3rd copy; StorageRepository derivation auto-resolves) + extract `reconstructTanks()` (~40 dup lines between fromData/updateFromData) |
| C2 | Tube: extract local `TubeLocationData`/`TubeSampleData`/`TubeSampleUpdate` interfaces (sample shape inlined 5×; Donor-exemplar pattern) |
| C3 | User: extract `hashToken()` (PBKDF2 tuple ×4); verifyEmail tail → `this.markEmailVerified()` |
| C4 | AccessControlService: extract `isOwnedBy`/`isUnassigned` predicates (guards pasted in edit+delete) |
| C5 | tubeOperationTypes: extract shared `TubeSampleInput` (byte-identical 12-field shape ×2) |
| C6 | EquipmentItem: replace hand-rolled `VALID_STATUSES` with shared `equipmentStatusValues` import |
| C7 | InviteCode.findById → lab-scoped `findById(id, labId)` + route handler through `findByIdForRequester` (the one P0-pattern straggler; drops the hand-rolled lab check) |
| C8 | Permission → key-only VO: with description/category getters dead, `_description`/`_category` are write-only — drop both ctor params and the metadata from all 13 constants |

**Recommend defer / accept as-is:**
| # | Item | Call |
|---|------|------|
| C9 | Equipment VO toData shapes vs storage schemas (3 representations, field sets differ) | Defer to a dedicated pass — not a mechanical swap |
| C10 | SampleData shape vs `tubeSampleSchema` (identical 16 fields) | Defer — needs a new shared-schemas type export; do with the schemas batch |
| C11 | SupplyDocument ↔ EquipmentDocument twin | Accept split (matches your client-side supplies/equipment precedent) |
| C12 | User.toPublicData vs `PublicUserData` (Date vs wire-string mismatch) | Leave hand-rolled; not clean to derive |
| C13 | BulkReceiveItemDetail / BulkIssueItemDetail identical shapes | Leave — semantic distinction is intentional documentation |
| C14 | Storage `tanks` convenience getter (technically an AGENTS.md violation, but it IS the dominant access path, 15+ sites) | Keep getter, delete its redundant comment |
| C15 | DomainError.toJSON — VERIFIED load-bearing (logger.ts:17 JSON.stringifies log meta) | Keep + add one-line comment |

## D. Comments / headers (low risk; recommend apply all)
- Restatement-comment deletions: Storage.ts (~14 lines), Tube.ts (4), Equipment VO (5 + 3 `// Getters`
  dividers), TubeEvents (1), Location (1 divider), AccessControlService stale `ResourceWithOwnership` JSDoc.
- Header fixes: LookupValue (stale "tube metadata" description — categories span 4 domains);
  title-restating descriptions on UserEvents/TubeEvents/EmailVerificationEvents/PasswordResetEvents/ResearcherEvents.
- 4 bare eslint-disables get `-- reason` (Storage.ts ×3, Equipment VO ×1).

---

**Scale if all approved:** ~2,000+ lines of dead code removed across the domain layer + impls + tests;
zero behavior change on any production path (every deletion is zero-caller-proven).
**Verification plan:** typecheck server · Jest (838 → minus deleted test blocks) · integration (36) · lint.
