# Odysseus Architecture Audit

**Date:** 2026-07-06 · **Branch:** `audit/fixes` · **Overall grade: B−**

A skeptical, architecture-only audit — structure, organization, consistency, and maintainability, *not* product correctness. Conducted by fanning out seven parallel review agents (one per dimension/area), then personally re-verifying every load-bearing claim against the actual code at `file:line`. Findings the agents produced but that could not be independently confirmed are labelled and quarantined (see [Confidence ledger](#confidence-ledger)) rather than passed through.

> **How to use this doc.** Every finding cites `file:line` and a confidence tag:
> - **`[VERIFIED]`** — personally confirmed at the cited line(s). Safe to act on.
> - **`[AGENT / UNVERIFIED]`** — reported by a review agent, plausible, but *not* independently confirmed here. **Investigate before acting.**
>
> Work the [Priority roadmap](#priority-roadmap) top-down — it's ordered by leverage, biggest offenders first. Each item has a "Done when" bar so "A+" is concrete, not vibes.

---

## Verdict

Excellent bones, real and *fixable* systemic drift — not rot. The hardest things are done right: an airtight domain layer, correct dependency inversion, near-total type safety, uniform error/response/config handling, and 100%-centralized query keys. The Donor domain genuinely earns its "cleanest" label (A−) and is a valid benchmark. What holds the codebase back is a recurring "two ways to do the same thing" pattern in cross-cutting mechanisms, plus concentrated debt in the layers not re-audited since the redesign (`server/` and `shared-schemas/`) and the older controllers. Close the five systemic weaknesses below and this is an A− codebase; the A+ ceiling is reachable but gated on convergence discipline, not rewrites.

> **Audit context.** `client/` was fully audited per-file in the most recent pass. `server/` and `packages/shared-schemas/` were audited *before* the app redesign and have **not** been re-audited since the lab-management suite was built — so their current design is effectively un-audited, which is where the heaviest debt below concentrates. Note that the two client-side structural flaws (the `equipment`↔`supplies` twin, the 796-line god-file) survived the recent per-file client audit precisely because per-file review under-detects cross-file duplication and oversized-file composition — they need a dedicated cross-cutting pass, not another per-file sweep.

---

## Grades at a glance

| # | Dimension | Grade | One-line reason |
|---|-----------|-------|-----------------|
| 1 | Layering & boundaries | **B−** | Domain airtight + DIP textbook, but 12/24 fat controllers bypass the app layer and the client has 20 cross-domain barrel-bypasses. |
| 2 | Single source of truth | **B−** | Client is exemplary; server hand-rolls ~20 DTO response shapes that parallel shared schemas and have already drifted. |
| 3 | Cross-cutting consistency | **C+** | Error/response/config unified, but by-id **lab scoping is still non-uniform** with 3 confirmed cross-lab holes. |
| 4 | DRY vs duplication | **C+** | `equipment` and `supplies` are twin implementations (~1,000+ lines copy-paste); shared infra is well-factored. |
| 5 | Dead & speculative code | **C+** | Verified dead clusters in shared-schemas + server utils, violating the repo's own caller-first rule. |
| 6 | Naming & file organization | **B+** | Conventions well-followed; one 796-line god-file and one barrel-less domain. |
| 7 | Abstraction quality | **B−** | Right-sized mostly; two notable *missing* abstractions (the twin, app-service extraction). |
| 8 | Type safety | **A−** | `any` is a last resort and always annotated; zero type-checker suppressions. |
| 9 | Coupling & cohesion | **B−** | Mostly cohesive; dragged by the god-file, the `tubes` coupling hub, and fat controllers. |

---

## Priority roadmap

Ordered by leverage. **P0** is the single highest-value change; **P1** is structural debt; **P2** is hygiene that compounds if ignored.

### P0 — Unify by-id lab scoping (correctness + consistency in one) `[VERIFIED]`

> **✅ RESOLVED — 2026-07-07.** All confirmed cross-lab holes closed; the two camps converged to SQL-level lab scoping (one mechanism). Investigation grew the scope from 3 → 10 verified holes, plus the guarded-but-Camp-B convergence. See [`P0_LAB_SCOPING_REMEDIATION.md`](./P0_LAB_SCOPING_REMEDIATION.md) and commits `0982dd9d`→`1351aeca` on `audit/fixes`; backed by 49 two-lab integration tests.

**The problem.** Two mechanisms for tenant-scoping a by-id lookup coexist, and the older one leaks:

- **Camp A (correct):** repo bakes `labId` into SQL — `DonorRepository.findById(id, labId)` → `WHERE id = $1 AND lab_id = $2` (`server/src/infrastructure/repositories/DonorRepository.ts:24-28`). Also Tube, Equipment(×2), Supply(×3), LookupValue.
- **Camp B (leaky):** repo takes bare `findById(id)` and defers scoping to a hand-written service guard — Researcher, User, InviteCode, UserSession.

**Three confirmed cross-lab holes** (all in Camp B or its sub-resources):

| # | Hole | Evidence | Impact |
|---|------|----------|--------|
| 1 | `getResearcherById` / `getResearcherTubeCount` readable cross-lab by non-admins | `ResearcherApplicationService.ts:450` guard only throws when `user.isLabAdmin()`; route has no role gate (`ResourceRouteModule.ts:176-184`); repo unscoped (`ResearcherRepository.ts:21-27`) | Cross-lab **read** |
| 2 | `GetUserByIdQueryHandler` reads any user by id, no lab check | `UserQueries.ts:30` — `findById(query.userId)` with no scope; writes go through `User.canManage` so read/write are asymmetric | Cross-lab **read** (admin) |
| 3 | Equipment document update/delete keyed on global `docId` | `EquipmentApplicationService.ts:364,378` verify the *item*'s lab but not doc→item; `updateDocument` runs the `UPDATE` *before* the 404 check (`EquipmentItemRepository.ts:114-134`) | Cross-lab **write** |

**Why P0.** It's simultaneously a security fix and the consistency fix — collapsing the two camps removes the "which layer scopes?" ambiguity that *produced* these holes. It's also the exact class of bug a prior audit started and did not finish.

**Done when:** every by-id repo lookup and every sub-resource mutation scopes `labId` at the SQL layer (Donor pattern); the Camp-B service guards become redundant defense-in-depth, not the sole gate; a cross-lab request returns 404 for *every* role. Add one integration test per hole.

### P1a — Extract application services for the 12 fat controllers `[VERIFIED]`

> **✅ RESOLVED — 2026-07-08.** All 12 controllers now depend on the application layer (a service or a
> command/query handler); none imports `@domain/repositories`. The grep gate returns **0**. Investigation
> reframed the work — most writes already delegated, so the bulk was giving read/aggregation paths an
> application-layer home, plus four genuine inline write pipelines (Person profile, force-change-password,
> security-config, session revoke cascade). Two real bugs were fixed en route: the `forceChangePassword`
> session-revoke gap and the AdminConfig `FORBIDDEN`-code/`400`-status mismatch. See
> [`P1A_FAT_CONTROLLERS.md`](./P1A_FAT_CONTROLLERS.md) and commits `ea7951f3`→`bdd365c5` on `audit/fixes`;
> backed by new service-layer unit tests (834 unit / 36 integration green).

12 of ~24 controllers inject `@domain/repositories` and orchestrate writes in the presentation layer. **Biggest offender:** `PersonController.updateMyProfile` (`PersonController.ts:46-121`) — password verification, a lazy PBKDF2→bcrypt re-hash + `userRepository.save` (76-79), email-uniqueness enforcement (104-107), and `personRepository.save` (112). Others: `UserSessionController`, `LabController` (6 repos), `PublicAuthController` (4 repos), `AuthController`, `InviteCodeController`, `LookupValueController`, `AdminConfigController`, `StorageController`, `UserController`, `SecurityMonitoringController`, `StorageAnalyticsController`.

**Contrast:** `DonorController`/`TubeController`/`EquipmentController`/`SupplyController` take *only* an application service. The pattern is known — it's just applied to only half the controllers.

**Done when:** every controller depends on an application service, not a repository; no controller performs persistence or write-side business rules. Grep gate: `from '@domain/repositories` under `presentation/controllers` returns 0.

### P1b — Collapse the `equipment` ↔ `supplies` twin `[VERIFIED]`

> **✅ RESOLVED — 2026-07-08.** Seven shared components (`<InfoPanelEmpty>` — also donors —
> `<CategoryModal>`, `<CategoryHierarchySelect>`, `<CategoryTreePanel>`, `<BulkCategoryTreeSelector>`,
> `<StripLabel>`, `<ItemRowShell>`) in `shared/ui/components/inventory/` + `info-display/` now back both
> domains; the 796-line equipment bulk-update god-file was split into `bulk-update-tabs/`. ~1,500 lines of
> twin gone with no behavioural/visual change; each domain keeps only its genuinely-distinct wiring. The
> item surface (ItemRow/ItemInfoPanel) and services/hooks only *looked* twinned and were correctly left
> per-domain. See [`P1B_EQUIPMENT_SUPPLIES_TWIN.md`](./P1B_EQUIPMENT_SUPPLIES_TWIN.md) and commits
> `8b78b7a6`→`1a236036`; a test per shared component (189 client tests green).

The two domains are parallel implementations — 5+ near-identical component pairs, 1,000+ lines of copy-paste. **Verified worst case:** `EquipmentCategoryModal.tsx` and `SupplyCategoryModal.tsx` are both 132 lines and *character-for-character identical* from line 30 down, differing only in the type name, two hook imports, and two placeholder strings. Same twinning in `InfoPanelEmpty` (35/35), `CategoryPanel` (488/483), `CategorySelect`, `ItemRow`, `BulkUpdateModal`, and the services. This survived the recent per-file client audit — a per-file review reads each twin in isolation and can't see its sibling, so consolidation needs a deliberate cross-domain pass.

**Done when:** shared `<CategoryModal>`, `<CategoryHierarchySelect>`, `<InfoPanelEmpty>`, and a `<CategoryTreePanel>` (parametrized by entity type + a status predicate) back both domains; each domain keeps only its genuinely-distinct wiring.

### P2 — Hygiene (compounds if ignored)

> **✅ RESOLVED — 2026-07-09.** All six concerns closed across nine commits (`002ffef2`→`0d367365`) on
> `audit/fixes`: `search` barrel added; ~40 magic time literals centralized on `MS_PER_*`; the confirmed
> dead set deleted (the "~90" lead ran down to **86 shared-schema exports + 4 passthrough**, zero-caller
> proven, plus 5 dead server helpers); raw error codes routed through `API_ERROR_CODES`; the drifted DTOs
> (5 fields) tightened to shared enums / the shared create type; raw `req.user` auth decisions routed
> through `BaseController`; and `AuditController`'s retention/archival routes now enforce system-admin via
> route middleware (an escalation gap had the inline gates been removed without it), pinned by a wiring
> test. Several P2 items were already closed by P1a/P1b (the god-file, the AdminConfig/StorageAnalytics
> error-code + `req.user` fixes). See [`P2_HYGIENE.md`](./P2_HYGIENE.md); typecheck · lint · Vitest (189) ·
> Jest (835) · integration (36) green.

- **Dead code `[VERIFIED clusters]`.** Delete: `BaseController.extractApiKey` (`BaseController.ts:38`, zero callers); 4 dead `ResponseBuilder` helpers (`validationError`, `unauthorized`, `notFound`, `conflict` — only `forbidden`/`success`/`error`/`internalError` are used); `tubeFormatters.ts` (4 dead fns: `formatTubeLocation`, `formatTubeLocationShort`, `formatTubeDate`, `parseConcentrationDisplay`); `tubeSchemas.ts` (`tubeDataArraySchema`, `bulkTubeOperationSchema`, `validateTubePosition`); 3 orphaned auth schemas (`verifyEmailRequestSchema`, `resendVerificationRequestSchema`, `systemAdminSetupSchema`). A review agent estimated **~90 dead shared-schema exports** total — `[AGENT / UNVERIFIED]`, treat as a lead, not a fact (its "26 dead route verticals" corollary was **disproven** — email verification is live on the client).
- **DTO drift `[VERIFIED]`.** Server response DTOs hand-roll shapes that parallel shared schemas and have drifted: `EquipmentDto.ts:32` types `status: string` (looser than the shared enum); `ResearcherDto.ts:15` types `email?: string` (shared create schema requires it). Derive from shared schemas or reuse (`TubeDto.ts:18` shows how: `TubeResponse = TubeData`).
- **Error-code drift `[VERIFIED]`.** `AdminConfigController.ts:89` returns a `FORBIDDEN` code with a **400** status (latent bug); `StorageAnalyticsController.ts:41` uses a raw `'MISSING_LAB_ID'` string; `SupplyController.ts:259` uses raw `'VALIDATION_ERROR'` — bypassing `API_ERROR_CODES`.
- **Raw `req.user` auth decisions `[VERIFIED]`.** `AuditController` doesn't extend `BaseController` and inlines a system-admin check 4× (`:143,169,195,229`) despite a `requireSystemAdmin` middleware existing. Also `AdminConfigController`, `AuthController`, `PublicAuthController`, plus spot bypasses in `AdminUserController.ts:41` / `StorageAnalyticsController.ts:39`.
- **Magic time literals `[VERIFIED]`.** `5 * 60 * 1000` inlined across ~15 query hooks despite a central default block (`client/src/app/cache/queryClient.ts:76-97`); `24*60*60*1000` recurs 20+ times; `MS_PER_DAY` is defined once (`InviteCodesTab.tsx:47`) but ignored elsewhere.
- **God-file `[VERIFIED]`.** `EquipmentBulkUpdateModal.tsx` — 796 lines, 8 top-level declarations; the `ItemSelector` + `BulkSelectItem` + helpers (~250 lines) are a self-contained concern that should split out.
- **`search` domain has no barrel `[VERIFIED]`** — the only domain missing `index.ts`; any sibling needing it is forced to deep-import.

---

## Detailed findings by dimension

### 1. Layering & boundaries — B−

**Strengths (preserve these).**
- **Domain purity `[VERIFIED]`** — grep under `server/src/domain/` for `@application`/`@infrastructure`/`@presentation` and relative climbs returns **zero**. The cardinal sin is absent; deps never point outward from the core.
- **Correct DIP `[VERIFIED]`** — ports declared in `application/contracts/`, implemented in infra (`JwtSessionService`, `BcryptPasswordService`, `EnvironmentConfigurationService`, `ExpressAuthMiddleware`, `InMemoryEventBus`). Infra depends inward on app-defined interfaces.

**Flaws.**
- **Fat controllers `[VERIFIED]`** — see [P1a]. 12/24 controllers inject domain repositories.
- **Client cross-domain coupling — C `[VERIFIED]`** — 20 deep imports past sibling barrels; `tubes` is the hub (9 outbound to storage/users/donors). One file shows both flavors: `TubeLocationDisplay.tsx` imports the storage barrel correctly (line 9), reaches *past* it (line 10, `formatPositionForBox` isn't barrel-exported), and gratuitously deep-imports `useUserSettings` (line 11) which *is* on the users barrel. `donors`/`equipment`/`supplies`/`researchers` are fully clean.
- **App→infra logger `[VERIFIED]`** — 13 application files import the concrete infra `logger` (`AuditService.ts:11` et al.) with no logging port. A real outward edge, though a commonly-tolerated one.

### 2. Single source of truth — B−

**Strengths.**
- **Client is exemplary `[VERIFIED]`** — zero inline `z.object` in `client/src`; both `zod` imports confined to the HTTP infra layer (`HttpClient.ts:8`, plus a type-only `ZodType` in `useTubeForm.ts:30`); services validate through imported shared schemas.
- **`success` is envelope-only `[VERIFIED]`** — no data schema carries a `success` field.

**Flaws.**
- **Hand-rolled DTO response shapes `[VERIFIED]`** — ~20 interfaces across `DonorDto`/`EquipmentDto`/`SupplyDto`/`ResearcherDto` parallel shared entity schemas. Confirmed drift at `EquipmentDto.ts:32` and `ResearcherDto.ts:15` (see [P2]).
- **Orphaned + drifted auth schemas `[VERIFIED]`** — `verifyEmailRequestSchema`/`resendVerificationRequestSchema`/`systemAdminSetupSchema` have zero consumers repo-wide (grep: definitions + barrels only), while the server keeps drifted local copies in `httpValidationSchemas.ts` (`:143-162`). The "single source" is neither single nor authoritative for these flows.

### 3. Cross-cutting consistency — C+

**Strengths.**
- **Error handling — A `[VERIFIED]`** — `handleControllerError` (`errorHandler.ts:29`) used everywhere; no per-controller `handleError` variants.
- **Response wrapping — A− `[VERIFIED]`** — `ResponseBuilder.success`/`.error` uniform. (Nit: 9 spots nest a redundant `success: true` inside `data`; `/health` and `/version` hand-roll the envelope — `PublicRouteModule.ts:142-162`.)
- **Config — A `[VERIFIED]`** — `EnvironmentConfigurationService` is the sole `process.env` reader (only bootstrap logger/index read env directly).

**Flaws.**
- **Lab scoping non-uniform — 3 confirmed holes `[VERIFIED]`** — see [P0]. This is the headline systemic problem and the reason this dimension is capped at C+ despite the strong error/response/config story.
- **Auth extraction — B `[VERIFIED]`** — raw `req.user` for auth decisions in ~5 controllers; `AuditController` is the heaviest offender (see [P2]).

### 4. DRY vs duplication — C+

**Strength.** Shared server infra is genuinely well-factored `[VERIFIED]` — repo column constants (`EquipmentItemRepository.ts:19-21`), `handleControllerError`, `ResponseBuilder`, `BaseController`. DTO↔entity mappers are per-table, not copy-paste. Donor carries almost none of this debt.

**Flaws.** The `equipment`↔`supplies` twin (see [P1b]) is the dominant systemic duplication. Secondary: magic time literals and error-code drift (see [P2]). The mutation scaffold repeats ~139× `[AGENT / UNVERIFIED count]` but is idiomatic TanStack Query — low priority.

### 5. Dead & speculative code — C+

Verified dead clusters listed in [P2]. The client-consuming surface is clean `[VERIFIED]` (query keys all used, no dead stores). The aggregate "~90 dead exports" figure is unverified; the specific clusters checked all confirmed dead, so the *direction* is right even if the magnitude isn't confirmed.

### 6. Naming & file organization — B+

**Strengths `[VERIFIED]`** — entity-first component names; **no** `utils.ts`/`helpers.ts` even in the equipment/supplies domains; named exports only (the lone `export default` is Vite's asset shim, `vite-env.d.ts:13`); JSDoc file headers throughout; kebab-case dirs. **Flaws** — the 796-line god-file and the barrel-less `search` domain (see [P2]).

### 7. Abstraction quality — B−

Right-sized mostly `[VERIFIED]` (equipment's util files are legit multi-caller, not premature). Two **missing** abstractions: the equipment↔supplies twin ([P1b]) and the application-service extraction the fat controllers skip ([P1a]).

### 8. Type safety — A−

**Strength `[VERIFIED]`** — production `any` is ~6 total, every one annotated with a rationale; the other ~25 `as any` are in `.test.ts`. **Zero** `@ts-ignore`/`@ts-expect-error` anywhere. Codebase reaches for `unknown` over `any` (`Record<string, unknown>` pervasive; the single `Record<string, any>` is justified in `AuditService.ts:22`). Server domain layer is effectively cast-free. **Half-grade off** for `SessionHttpClient`'s untyped generic and one uncaught mutation `.then` (`SupplyItemForm.tsx:256`).

### 9. Coupling & cohesion — B−

Most modules cohesive; dragged by the god-file, `tubes` as a client coupling hub, and fat controllers mixing HTTP + persistence + business rules.

---

## Strengths to preserve (ranked)

1. **Domain purity + correct DIP** — the hardest part of Clean Architecture, nailed. Don't let the fat-controller fix leak infra back into the core.
2. **Unified error/response/config** — one error mapper, one response builder, one env reader.
3. **Type-safety discipline** — `any` as annotated last resort; zero suppressions.
4. **Client server/UI boundary** — query keys 100% centralized (0 inline arrays across 195 sites), Zustand stores UI-only, logout clears the Query cache.
5. **Client SSOT + the Donor benchmark** — no inline schemas client-side; Donor is genuinely A− end-to-end and a valid reference for every other domain.

---

## Path to A+ per dimension

| Dimension | Now | To reach A |
|-----------|-----|------------|
| Layering & boundaries | B− | Fix P1a (fat controllers) + the 20 client barrel-bypasses; optionally invert the logger behind a port. |
| Single source of truth | B− | Derive DTO responses from shared schemas ([P2]); delete or wire up the orphaned auth schemas. |
| Cross-cutting consistency | C+ | Fix P0 (lab scoping) — the whole grade is gated on it; then normalize `req.user` and error codes. |
| DRY | C+ | Collapse the equipment↔supplies twin ([P1b]); centralize the time literals. |
| Dead code | C+ | Delete the verified clusters; then run down (and confirm) the ~90-export lead. |
| Naming & org | B+ | Split the god-file; add the `search` barrel. |
| Abstraction | B− | Same as P1a + P1b — both are missing-abstraction fixes. |
| Type safety | A− | Type `SessionHttpClient`'s generic; `.catch` the `SupplyItemForm` mutation. |
| Coupling & cohesion | B− | Falls out of P1a + the god-file split + reducing the `tubes` hub's outbound deep imports. |

---

## AGENTS.md claims that no longer match the code

> **Addressed 2026-07-07** — the doc fixes below (stale `HttpClient` name, incomplete client-domain and shared-module lists, and the repo exemplar — `ResearcherRepository` is now lab-scoped, so it's a valid exemplar again) have been applied to AGENTS.md.

- **`AuthenticatedHttpClient` (line 112) doesn't exist** — renamed to `HttpClient.ts`. The "only valid zod import" rule points at a stale filename.
- **Client domain list (lines 60-84) is incomplete** — omits `equipment`, `supplies`, `help`, `lab-management`.
- **Shared-schemas "Modules" list (line 110) is incomplete** — omits equipment, supplies, labs, lookups, demo.
- **Repository exemplar drift** — AGENTS.md holds up `ResearcherRepository` as the repo exemplar, but its `findById(id)` is unscoped (Camp B) and is the *source* of the headline cross-lab read leak (P0, hole #1). The designated exemplar exhibits the inconsistency.
- **"Equipment domain has NOT been audited" (line 175) is now split and partly stale** — the *client* `equipment` (and `supplies`) domains were audited in the most recent per-file pass; only the *server* + shared-schema slices remain un-audited-since-redesign. And even un-audited, equipment's server layer (entities, service, controller, routes) is at Donor parity — its real gaps are the document-mutation bug (P0 #3), `zodResolver(...) as never` form typing, and the one god-file — so "un-audited" should not be read as "low quality." Update line 175 to scope the exclusion to the server/shared layers.
- **Even the Donor exemplar** — `DonorRepository.delete(id)` (`:109`) drops `labId` at the SQL layer, safe only because the service reads lab-scoped first. Not defense-in-depth; converge it in P0.

---

## Confidence ledger

Everything acted on in the roadmap is `[VERIFIED]`. Explicitly **not** verified — investigate before trusting:

- **"~90 dead shared-schema exports"** — a review agent's dependency-graph estimate. The *specific clusters* spot-checked (tubeFormatters, tubeSchemas, auth) were all genuinely dead, but the aggregate count and the full list are unconfirmed. Its "26 dead route verticals" corollary was **disproven** (email verification is live on the client via `AuthEmailVerificationPage.tsx` / `AuthService.ts`) — so treat graph-inferred "dead route" claims with suspicion.
- **Mutation-scaffold count (~139×)** and other raw occurrence counts — reported by agents, not re-counted here.
- **Exploitability of the 3 lab-scoping holes** — confirmed reachable at the code level (route + service + repo all read), but not proven end-to-end with a running request. Add integration tests as part of P0.

---

*Method: 7 parallel review agents (layering, cross-cutting/lab-scoping, single-source-of-truth, client decoupling, equipment-vs-donor, dead code, DRY/type-safety) → personal re-verification of every load-bearing claim at `file:line` → agent over-claims dropped or quarantined. Read-only audit; no source files modified.*
