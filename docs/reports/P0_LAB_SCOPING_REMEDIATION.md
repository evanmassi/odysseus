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

### Phase 1 — Reads → Camp A (holes 1–3)

- [ ] `ResearcherRepository.findById(id)` → `findById(id, labId)`, SQL `WHERE id = $1 AND lab_id = $2` (+ interface `domain/repositories/ResearcherRepository.ts`).
- [ ] `getResearcherOrThrow(id)` → `(id, labId)`; update all call sites (`ResearcherApplicationService.ts:104,183,251,301,331,372`) to pass `user.labId`; cross-lab → `NotFoundError`. Remove reliance on inverted `requireSameLabAsResearcher` (`:449`).
- [ ] `UserRepository.findById(id)` → `findById(id, labId)`, SQL `WHERE u.id = $1 AND u.lab_id = $2`; `GetUserByIdQuery` carries requester `labId`; handler passes it (`UserQueries.ts:29`).
- [ ] Donor collection-history read: scope it — either `findCollectionHistory(donorId, labId)` with a `d.lab_id = $2` JOIN (like `DonorRepository.ts:207`) or load donor via `findById(id, labId)` first in `getCollectionHistory` (`DonorApplicationService.ts:144`); controller passes `user.labId`.
- [ ] Add explicit `findByIdAnyLab` for legitimate system-admin cross-lab paths (audit `SystemAdminUserController` + any system-admin researcher read); default stays scoped.
- [ ] Red→green integration test per hole (cross-lab read returns null/404; same-lab still works; system-admin any-lab still works).
- **Commit:** `fix(security): lab-scope by-id reads — researcher/user/donor collection history`

### Phase 2 — Child writes → parent-scoped (holes 4–10)

- [ ] Equipment `updateDocument(docId, itemId, fields)` + `deleteDocument(docId, itemId)` → `AND item_id`, return rowCount; service passes `itemId`, 404 on 0 rows, drop post-hoc find (`EquipmentItemRepository.ts:114,131`; `EquipmentApplicationService.ts:355-386`).
- [ ] Supply `updateDocument` + `deleteDocument` + `updateBarcode` + `deleteBarcode` + `updatePackagingLevel` → same treatment (`SupplyItemRepository.ts:178,184,241,247,491`; `SupplyApplicationService.ts:272-343,426-430`).
- [ ] Update repo interfaces to match new signatures.
- [ ] Red→green integration test per hole (foreign-lab child id → 404, no mutation; own child still mutable).
- **Commits:** `fix(security): scope equipment child mutations to parent item` · `fix(security): scope supply child mutations to parent item`

### Phase 3 — Tier-3 convergence sweep + dead code

- [ ] `DonorRepository.delete(id)` → `delete(id, labId)`, `WHERE id = $1 AND lab_id = $2` (`:110`); update `DonorApplicationService.ts:136` + any other callers.
- [ ] `TubeRepository.saveWithOptimisticLock` → add `AND lab_id = $n` to the WHERE (`:174`); verify hot-path callers (`TubeApplicationService.ts:554,859,960`). **Test carefully — hot path.**
- [ ] `LookupValueRepository.delete(id)` → `delete(id, labId)` (`:72`); update `LookupValueApplicationService.ts:115`.
- [ ] Delete dead `InviteCodeRepository.delete(id)` (`:71`) + its interface entry.
- [ ] Integration + typecheck green.
- **Commit:** `refactor: converge remaining by-id writes to SQL lab-scoping; drop dead InviteCode.delete`

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
