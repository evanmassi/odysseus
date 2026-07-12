# Infrastructure Layer Findings — Bucket 3, Batch 3 (server/src/infrastructure)

**Date:** 2026-07-12 · **Branch:** `audit/fixes` · **Status: AWAITING REVIEW — nothing applied**

All 91 files audited by 10 finders (applied migrations 001–022 got a registry-level structural check
only — content is historical); every load-bearing claim coordinator-re-verified, none withdrawn.
**The cleanest layer yet: ~60 files fully CLEAN**, including the ResearcherRepository exemplar, all
of PostgresContext/search preprocessing/audit filter builder, 12 of 16 small mappers, 10 of 13 DI
files, and the migrations registry (all 22 registered, ordered, gap-free).

## A. Real bugs (recommend: fix — each is a behavior change for the better)

| # | Bug | Fix |
|---|-----|-----|
| A1 | **Search sorting silently broken** (TubeRepository): `criteria.sortBy` is camelCase but both sort allow-lists are snake_case column names — the guard is always false, every user-selected sort falls back to default. Client DOES send sortBy (SearchService.ts:36). | Add a camelCase→column map for the criteria union; user sorting starts working. Also derive the structured allow-list from `ALLOWED_SORT_COLUMNS` (currently maintained twice). |
| A2 | **Migration concurrency guard doesn't work** (migrationRunner): `pg_advisory_lock` via `pool.query` binds the lock to one pooled connection while the work and unlock run on others — lock leaks, guard is luck-based. | Hold one dedicated `pool.connect()` client for lock→unlock lifetime (bookkeeping on it; `migration.up(pool)` unchanged). |
| A3 | **Expired sessions get the generic error** (ExpressAuthMiddleware): the errorMessages map omits `SESSION_EXPIRED` (contract + JwtSessionService both produce it) → users see "Authentication failed" instead of a session-expired message. | Add the map entry. |

## B. Dead code — grep-proven (recommend: apply)

1. **12 dead ServiceContainer getters** (pure delegations nothing calls — index.ts is the only
   container consumer) + make `getPasswordService`/`getEmailService` private (internal-only, matching
   the file's own convention) + drop EventModule's threaded-but-never-read `repositoryFactory` ctor dep.
2. **Dead `logging` config section**: schema + loader + contract field — the logger reads env
   directly and registers transports unconditionally; only tests read `get('logging')`.
3. **Dead `expirationTime` chain** (extends the finder's finding): JwtSessionService copy + the
   `jwt.expirationTime` contract field + Env schema/loader line + the `JWT_EXPIRATION` env read —
   zero readers end-to-end; real expiry comes from securityConfig.accessTokenExpiryMinutes.
4. **2 dead `fromRows`** (SupplyItemMapper, RefreshTokenMapper); unexport `JwtSessionConfig`.
5. **`needsUpgrade(storedHash, …)` never reads the hash** (body: `return !!salt` — "has salt = legacy
   PBKDF2"). Caller-first: drop the param from contract + impl + the one call site. (Re-add if
   bcrypt cost-upgrade detection is ever built.)

## C. Duplication / consolidation (recommend: apply)

1. `parseCount` adoption: 6 hand-rolled `parseInt(row?.count ?? '0', 10)` sites across
   Donor/EquipmentItem/EquipmentCategory/SupplyCategory/SupplyLocation repos (byte-identical to the
   shared helper the exemplar uses).
2. Shared `AuditLogEntryMapper.fromRow` (new mapper file) replacing the byte-identical private
   `rowToEntry` in AuditRepository + AuditArchiveRepository.
3. StorageRepository: extract `insertStorageVersion` (version INSERT ×3); leave the two differing
   optimistic-lock conflict branches alone.
4. SupplyItemRepository: extract the stock-aggregation SELECT + row-mapping shared by
   `findByLabIdWithStock`/`findItemsAtOrBelowThreshold`.
5. TubeRepository: `TUBE_COMPLETE_CONDITION` const (predicate ×2); JwtSessionService: private
   `signToken`/`verifyToken` helpers (×2 each).

## D. Naming / comments / small (recommend: apply)

- StorageModule: 3 getter names the Configuration→Storage rename missed (incl. the
  `getGetCheckConfigurationHealthHandler` stutter) — internal-only, safe renames.
- `UserSessionRepositoryImpl` → plain class name + `I<Name>` interface alias (5:1 sibling convention;
  touches RepositoryFactory ×2).
- eslint-disable reasons: TubeMapper block, EnvironmentConfigurationService ×14, logger ×1 (all the
  same legitimate `||` env/empty-string rationale).
- InMemoryEventBus log field `successfulHandlers` → `handlerCount` (currently reports failures as
  successes); csvGenerator type-annotation simplification (kills the `'forceText' in col` cast
  gymnastics); RefreshTokenRepository divider casing + 1 interface-duplicated JSDoc;
  EquipmentItemRepository divider casing; TubeRepository 3 restatement comments; logger header
  "optional" claim fixed; migrationRunner baseline-detection rationale comment (documents why
  `labs`→15, `persons`→1); migration 001 header's stale "fingerprint" reference → `detectExistingState`.

## E. Deferred (accumulating into the existing parked decisions)

- **Equipment↔Supply twins, now full-stack** (E4): category repos are structural twins (+ byte-identical
  COLUMNS const), Category + Document mapper pairs byte-identical modulo entity class. One deliberate
  consolidation pass covers service+repo+mapper+entity levels together — or accept the split like the
  client-side call.
- AuditArchiveRepository `buildDateClauses` vs shared filter builder (Date-vs-string param gap —
  small adaptation, low value; fold into E4-adjacent work or leave).

**Scale if A–D approved:** ~30 files, net deletion again; behavior changes are exactly the three
bugs in A (all improvements: sorting works, deploys serialize, expired sessions message properly).
**Verification:** build:shared · tsc ×2 · lint ×3 · Jest · integration 36 (exercises migrations +
lab scoping) · client suite.
