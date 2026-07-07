# P0 — Lab-Scoping Remediation Plan

**Date:** 2026-07-06 · **Branch:** `audit/fixes` · **Owner:** P0 from `ARCHITECTURE_AUDIT.md`

Closes the multi-tenant (lab) isolation gap: by-id repository operations that read or mutate
another lab's data. Investigation (three parallel trace agents + first-hand verification)
expanded the original audit's **3 holes to 10 confirmed leak points**, one of them in the
"exemplar" Donor domain.

> **Line numbers are as-of-investigation (2026-07-06).** Confirm each at edit time before changing.
> Work **red → green**: prove each hole with a failing integration test first, then fix, then watch it pass.

---

## Decisions (locked)

- **Scope: Tier 3 — total convergence.** Every method on a `lab_id`-bearing table scopes `lab_id`
  in SQL; no exceptions. Not just the leaking methods — also the currently-guarded-but-Camp-B
  writes, so there is exactly **one** mechanism and no template to copy the leak from.
  (Identity/auth/tenant-root tables — `persons`, `refresh_tokens`, `user_sessions`, `labs` — have
  no `lab_id` column and are correctly scoped by their natural owner. Out of scope.)
- **Tests: Both.** A net-new integration harness (real `odysseus_test` Postgres) is the authoritative
  proof that SQL actually filters; fast mocked service-layer forwarding tests give cheap CI regression.
- **System-admin cross-lab access** stays possible where legitimate, via an **explicit, greppable
  `findByIdAnyLab`** method — never a nullable `labId` param. The scoped `findById(id, labId)` is the default.

---

## Root cause

Two camps for scoping a by-id operation:
- **Camp A (correct):** repo bakes `lab_id` into SQL — `WHERE id = $1 AND lab_id = $2`.
- **Camp B (leaky):** repo takes a bare id and defers scoping to a service guard — which is sometimes
  missing (reads), inverted (researcher), or run *after* the mutation (child writes).

Child tables (`equipment_documents`, `supply_documents`, `supply_barcodes`, `supply_packaging_levels`)
have **no `lab_id` column at all**, so they must be scoped through their parent item (`AND item_id = $n`).

---

## The 10 confirmed leaks

### Cross-lab reads (no write required — highest severity)

| # | Leak | Who can exploit | Repo (unscoped) | Guard defect |
|---|------|-----------------|-----------------|--------------|
| 1 | `Researcher.findById` — read any lab's researcher / tube count | **any authenticated user** | `ResearcherRepository.ts:21` | guard *inverted* — only throws for lab admins (`ResearcherApplicationService.ts:449`) |
| 2 | `User.findById` — read any lab's user public data | lab admin | `UserRepository.ts:35` | no lab check in handler (`UserQueries.ts:30`) |
| 3 | `Donor.getCollectionHistory` — read any lab's collection history | **any authenticated user** | `DonorRepository.ts:199` | zero guard (`DonorApplicationService.ts:144`, `DonorController.ts:90`) |

### Cross-lab child writes (admin-gated; parent lab-checked, child mutated by global id)

| # | Leak | Shape | Repo (unscoped) | Service |
|---|------|-------|-----------------|---------|
| 4 | Equipment `updateDocument` | weak: `UPDATE` runs before the 404 check | `EquipmentItemRepository.ts:114` | `EquipmentApplicationService.ts:363` |
| 5 | Equipment `deleteDocument` | leaky: foreign doc deleted, returns true | `EquipmentItemRepository.ts:131` | `EquipmentApplicationService.ts:377` |
| 6 | Supply `updateDocument` | weak | `SupplyItemRepository.ts:178` | `SupplyApplicationService.ts:281` |
| 7 | Supply `deleteDocument` | leaky | `SupplyItemRepository.ts:184` | `SupplyApplicationService.ts:294` |
| 8 | Supply `updateBarcode` | weak | `SupplyItemRepository.ts:241` | `SupplyApplicationService.ts:329` |
| 9 | Supply `deleteBarcode` | leaky | `SupplyItemRepository.ts:247` | `SupplyApplicationService.ts:341` |
| 10 | Supply `updatePackagingLevel` | leaky | `SupplyItemRepository.ts:491` | `SupplyApplicationService.ts:428` |

**Fix shape for #4–10 (uniform):** repo signature gains `itemId`; SQL becomes
`... WHERE id = $1 AND item_id = $2` returning `rowCount`; the service passes the already-lab-verified
`itemId` (from `getItemOrThrow(itemId, labId)`) and 404s on `rowCount === 0`. This also removes the
mutate-then-verify ordering bug — no post-hoc `.find()` check needed. Mirrors the existing correct
`Donor.deleteCollectionHistory` (`DonorRepository.ts:233`) and equipment maintenance-log pattern.

---

## Confirmed SAFE — do NOT touch (already properly guarded)

Invite-code deactivate (`InviteCodeCommands.ts:115`), user-session revoke (`UserSessionController.ts:63`),
refresh tokens (self-service only), audit reads (`…ForLab` for non-system-admins), storage tank/rack/box
config (single per-lab row, ids are indices into the lab's own config), equipment maintenance-log
update/delete (fetch-and-verify `entry.itemId !== itemId`), supply `removePackagingLevel` /
`voidTransaction`, supply `regenerateInternalBarcode`. Person/RefreshToken/UserSession/Lab tables
(no `lab_id` column — scoped by owner).

**Dead code to delete:** `InviteCodeRepository.delete(id)` (`:71`) — zero callers.

---

## Phased plan

Each phase = one review gate + one (or two) commits. **Nothing moves forward until every box in the
phase is checked and the review passes.** Commits batched by domain per the audit workflow.

### Phase 0 — Integration harness (prerequisite) ✅ DONE (pending commit)

- [x] `odysseus_test` database — auto-created by the harness (`ensureTestDatabase` in `tests/integration/setup/testDb.ts`), same container as `odysseus_dev`.
- [x] `server/tests/integration/` dir. Runs via a **separate** `jest.integration.config.js` (serial `maxWorkers: 1`, 30s timeout); main `jest.config.js` now excludes `tests/integration` so `npm test` stays DB-free. Script: `npm run test:integration`.
- [x] Boot `PostgresContext` against `odysseus_test`; migrations run once in `beforeAll` (idempotent — `schema_migrations` ledger, no fragile ts-jest `globalSetup`).
- [x] **Per-test cleanup is `TRUNCATE … RESTART IDENTITY CASCADE`, NOT transaction rollback.** Deviation from original plan: repos call `pool.query` directly (`PostgresContext.ts:60-105`), so a wrapping `transaction()` client can't capture them. Serial execution avoids cross-suite truncation races.
- [x] Two-lab seed factories in **new** `tests/integration/setup/factories.ts` (`createSeed(context)`) — a separate persisting layer (the existing `helpers.ts` is construct-only, doesn't save). Covers Lab, Person, Researcher, Donor+collectionHistory, Equipment category+item+document, Supply category+item+document+barcode+packaging, each auto-filling required FKs.
- [x] Smoke test green: `tests/integration/labScoping.smoke.test.ts` — 7 tests, every factory persists a readable lab-scoped row. All 22 migrations apply on a fresh DB. Unit suite unaffected (27 suites / 762 tests pass).
- **Commit:** `test: server integration harness + two-lab fixtures`

### Phase 1 — Reads → Camp A (holes 1–5)

**Scope expanded after the caller-classification pass** (`findById` blast-radius trace, 2026-07-06):
a blanket signature swap would break auth. `UserRepository.findById` has ~23 callers, many in
identity/auth paths with no lab context. The trace also surfaced **two new verified holes**.

**Design:** `findById(id, labId)` becomes the **scoped default** (SQL `AND lab_id = $2`); a new,
explicit `findByIdAnyLab(id)` serves identity/auth/system-admin. The unqualified name is now the
safe one — an unscoped read must be deliberately spelled `AnyLab`. Holes reachable by system-admins
(no labId) get a **role-branch**: `isSystemAdmin()` → `findByIdAnyLab`, else scoped.

**Verified holes:**
- **#1** `ResearcherApplicationService.getResearcherOrThrow` — cross-lab **read**, any non-admin (guard at `:449` is inverted).
- **#2** `GetUserByIdQueryHandler` (`UserQueries.ts:30`) — cross-lab **read**, lab-admin via `GET /admin/users/:id`.
- **#3** `DonorApplicationService.getCollectionHistory` — cross-lab **read**, any user (`DonorController.ts:90`, unguarded).
- **#4 (new)** `UserApplicationService.getUserOrThrow` feeds `deactivate`/`suspend`/`reactivate` which lack a per-target lab check (`reactivate` none; `deactivate`'s `expectedLabId` is never passed by the controller, `AdminUserController.ts:123`) — cross-lab **write**.
- **#5 (new)** `ValidationService.validateResearcherIdReference` (`:334`) + `TubeApplicationService.ts:164` — unscoped + advisory-only, so a tube can reference a **foreign-lab researcher**; leaks the researcher's name for inactive foreign ids. Fix = scoped lookup **plus** promote a foreign/invalid researcher ref to a hard error at the write path (behavior change, approved).

**Cleared (not a hole):** admin password reset — `AdminReset`/`GeneratePasswordResetToken` both call `admin.requireCanManage(targetUser)` (`PasswordResetCommands.ts:53,94`), same-lab enforced.

**Call-site handling** (full table in session notes):
- **Group A → `findByIdAnyLab`** (mechanical, no behavior change): `JwtSessionService:157/382/465`, `PublicAuthController:422`, `EmailVerificationCommands:45/108`, `AuditEventHandler:160`, `UserGuards.requireUser:13`, `UserCommands:186`.
- **Group B → `findById(id, labId)`** (labId already in scope; also closes latent assign-to-foreign-user gaps): `Bulk/Rack/BoxCommands` ×7, `UserApplicationService` researcher lookups ×3, `TubeApplicationService:164`, `PersonController:62`, `UserQueries:116`, `UserCommands:137/298`.
- **Group C → scope + role-branch**: `getResearcherOrThrow`, `GetUserByIdQuery`, `getUserOrThrow` (scope by actor; **keep** `expectedLabId` — it's the system-admin target-lab selector, `SystemAdminUserController:47,65`), `UserCommands.ChangeUserRole` lookup, `ValidationService` ref check.

**Implementation refinements (vs. written plan):** (1) `expectedLabId` is kept, not dropped — the system-admin path relies on it. (2) Self-service sites (own id) use `findByIdAnyLab(ownId)` rather than scoped — scoping by your own labId is redundant and breaks system admins (no labId); safe because the id is the caller's own.

**Sub-commits (batched by domain, reviewed as one phase):**
- [x] `fix(security): lab-scope user by-id reads + deactivate/reactivate writes` (#2, #4; adds `findByIdAnyLab`, role-branch, keeps `expectedLabId`) — **DONE, green, pending commit**
- [x] `fix(security): lab-scope researcher by-id reads` (#1; inverted guard deleted; #5 reference lookups scoped — name-leak closed) — **DONE, green**
- [x] `fix(security): lab-scope donor collection-history read` (#3) — `getCollectionHistory` guards via the lab-scoped `getDonorOrThrow`. **DONE, green** (`donorLabScoping.test`).
- [x] `fix(security): scope researcher findByIds + reject cross-lab tube→researcher refs` (#5) — name-leak closed on **both** paths (`findById` and the bulk-cache `findByIds` now lab-scoped); hard-block on tube **create + update** rejects a *set* `researcherId` that doesn't resolve in-lab (unassigned/empty/null still allowed, per requirement). **DONE, green.** Write-guard proven by `TubeApplicationService.researcherScope.test` (5 tests: rejects a foreign researcherId on create *and* update; allows an unassigned tube and a valid in-lab researcher).
- Shared: `application/authorization/findByIdForRequester.ts` — the one helper backing every actor-scoped read (User + Researcher).
- [ ] Red→green integration tests per hole (cross-lab → null/404/reject; same-lab works; system-admin any-lab works).

### Phase 2 — Child writes → parent-scoped (holes 4–10)

- [x] Equipment `updateDocument`/`deleteDocument` → `AND item_id`; update returns the row via `RETURNING` (collapses the mutate-then-verify + drops the extra fetch), delete returns rowCount>0; service 404s on no-match. **DONE.**
- [x] Supply `updateDocument`/`deleteDocument`/`updateBarcode`/`deleteBarcode`/`updatePackagingLevel` → same treatment. The 3 previously-**silent** methods (`removeDocument`, `removeBarcode`, `updatePackagingLevel`) now 404 on a missing/foreign child id (approved behavior change). `regenerateInternalBarcode` threads `itemId` (item-sourced id, safe). **DONE.**
- [x] Repo interfaces updated to match.
- [x] Integration tests: `equipmentDocLabScoping.test` (4), `supplyChildLabScoping.test` (9) — foreign itemId → null/false + target row untouched; own child still mutable. **All green** (typecheck · 31 integration · 767 unit).
- **Commits (pending):** `fix(security): scope equipment + supply child mutations to parent item`

### Phase 3 — Tier-3 convergence sweep + dead code

Scope = **Option 2** (converge every guarded Camp-B by-id method that was an *inconsistency*; leave the genuinely-cross-lab ones). Entity-labId (not actor) used for researcher/user deletes.

- [x] Deletes → `(id, labId)` + `AND lab_id`: `Donor.delete`, `LookupValue.delete`, `Researcher.delete` (entity labId), `User.delete` (entity labId).
- [x] `Tube.saveWithOptimisticLock` → `AND lab_id = $32` (append `tube.labId`). Hot path — regression-tested (save works + stale version → `ConflictError`).
- [x] Donor collection-history: `findCollectionHistory`/`updateCollectionHistory` → scoped via donor subquery (matches already-converged `deleteCollectionHistory`).
- [x] Supply transactions: `findTransactionById` + `voidTransaction` (inner SELECT/UPDATE) → `AND lab_id`; dropped the service's manual `existing.labId !== labId` check.
- [x] Deleted dead `InviteCodeRepository.delete` + interface entry.
- [x] **Left as-is (legitimately cross-lab, not inconsistencies):** `InviteCode.findById` (deactivate has a real system-admin cross-lab branch), `User.findByIds` (audit spans labs), `Researcher.findByPersonId` (person↔researcher global), the `findByIdAnyLab` methods.
- [x] `phase3ConvergenceLabScoping.test` (5) — cross-lab delete no-op, lab-scoped collection-history, Tube hot-path. **Green** (typecheck · 36 integration · 767 unit).
- **Commit (pending):** `refactor: converge remaining by-id writes to SQL lab-scoping; drop dead InviteCode.delete`

### Phase 4 — Service-layer forwarding tests (the fast "Both" layer)

- [ ] Extend the existing mocked `makeService()` pattern for every touched service: cross-lab id → `NotFoundError`; assert `user.labId` forwarded to the repo.
- [ ] Full `npm test` green.
- **Commit:** folded into phases or `test: service-layer lab-forwarding assertions`

### Phase 5 — Docs

- [ ] AGENTS.md: repoint the repo exemplar (currently `ResearcherRepository`, the source of hole #1) to an already-scoped repo, or keep it now that it's fixed — decide at edit time.
- [ ] AGENTS.md: add a Common-Mistakes rule — *by-id methods on `lab_id` tables scope `lab_id` in SQL; child mutations scope `item_id`.*
- [ ] AGENTS.md: fix stale `AuthenticatedHttpClient` → `HttpClient.ts` (line 112); complete the client-domain list (adds equipment/supplies/help/lab-management) and shared-schemas module list (adds equipment/supplies/labs/lookups/demo).
- [ ] `ARCHITECTURE_AUDIT.md`: update P0 from 3 → 10 verified holes.
- **Commit:** `docs: repoint repo exemplar; record verified P0 scope`

---

## Definition of done (A+ bar)

- Every by-id read and every child mutation scopes `labId` / `item_id` at the **SQL layer**.
- Service guards become **defense-in-depth**, not the sole gate.
- A cross-lab request returns **404 for every role** (system-admin any-lab paths explicit and named).
- Green integration tests **prove** isolation (real SQL, two labs); fast service tests guard regression.
- `npm run typecheck` + full `npm test` green; manual two-lab smoke on one read + one write path.
