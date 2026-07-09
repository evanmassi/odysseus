# P2 — Hygiene Sweep (dead code · DTO drift · error-codes · req.user · time literals · search barrel)

**Date:** 2026-07-08 · **Branch:** `audit/fixes` · **Owner:** P2 from `ARCHITECTURE_AUDIT.md`

> **✅ RESOLVED — 2026-07-09.** Nine commits (`002ffef2`→`0d367365`) on `audit/fixes`. All six concerns
> closed: the `search` barrel added; ~40 magic time literals centralized on `MS_PER_*`
> (`shared/utils/timeConstants.ts`); the confirmed dead set removed — **86 shared-schema exports + 4
> passthrough** (zero-caller proven; full monorepo typecheck is the backstop) plus the 5 dead server
> helpers; the 2 raw error codes routed through `API_ERROR_CODES`; the 5 drifted DTO fields tightened to
> shared enums / the shared create type; the raw-`req.user` auth decisions in `AdminUser`/`AdminConfig`
> and `AuditController` routed through `BaseController`; and the `AuditController` retention/archival
> routes now enforce system-admin via **route middleware** (the sole inline gates were an escalation risk
> once removed), pinned by a new wiring test. Investigation ran six parallel read-only agents +
> first-hand re-verification of every load-bearing claim at `file:line`. Zero-regression throughout —
> typecheck · full lint · client Vitest (189) · server Jest (835) · integration (36) green.
>
> **Deviations from plan (all surfaced at review):** `SupplyTransactionType` was held back from the
> dead-sweep because DTO fix #4 consumes it. The barcode/txn DTO fixes use a validated mapper-cast
> (smaller blast radius than narrowing the repo Row interface). The admin lab-context reads use
> `getAuthenticatedUser(req).labId` rather than `extractLabId` (which throws → would collapse the
> distinct 403/400 statuses to 500). One extra commit (`2351a997`) completed a time-literal file missed
> in the Batch-2 staging. `SessionService.ts` `MIN_REFRESH_DELAY_MS` was centralized too (one literal
> beyond the enumerated set, same file/concern). The `search` grep confirmed the audit's `grid` domain
> does not exist. Deliberately left (out of scope, noted): the domain `ValidationError.code =
> 'VALIDATION_ERROR'` (domain layer; client may key off it) and the `ExpressAuthMiddleware` raw-code
> cluster (infra; some codes aren't `API_ERROR_CODES` members).

Unlike P1b (one cohesive twin), P2 is a **set of independent hygiene items** spanning shared-schemas,
server, and client. The investigation's headline: **P1a/P1b already closed several P2 items**, and the
remaining ones are smaller and sharper than the audit's list implied. This plan enumerates only what is
**still open**, at `file:line`, batched by concern.

> **Line numbers are as-of-investigation (2026-07-08).** Confirm each at edit time before changing.
> Work **red → green** per batch; **stop for review before each commit.** One commit per concern.

---

## What P1a/P1b already fixed (do NOT re-do)

| Audit P2 item | Status |
|---|---|
| 796-line `EquipmentBulkUpdateModal` god-file | **DONE** in P1b (split into `bulk-update-tabs/`) |
| `AdminConfigController` `FORBIDDEN`-code / `400`-status latent bug | **DONE** in P1a (`:66` now `REQUIRED_FIELD_MISSING`+400, consistent) |
| `StorageAnalyticsController` raw `'MISSING_LAB_ID'` (`:41`) + raw `req.user` (`:39`) | **DONE** in P1a (extends BaseController, uses `REQUIRED_FIELD_MISSING`) |
| `AuthController` raw `req.user` | **DONE** in P1a (extends BaseController, uses `getAuthenticatedUser`) |

`PublicAuthController` does **not** extend `BaseController` (P1a's note was inaccurate) but references
`req.user` **nowhere** — nothing to remediate.

---

## Still-open, verified at `file:line`

### Concern A — Dead code (shared-schemas): ~90 exports, zero-caller proven

The "~90 dead shared-schema exports" lead is **run down and essentially correct.** Of 568 exports:
379 externally consumed, 189 zero-external → **86 confirmed dead** (no external consumer, no live
internal composition) + **4 effectively-dead** passthrough types. The 103 remaining zero-external
exports are **alive via composition** (a live schema `.extend/.pick/z.object`s them) — false positives,
**not** deleted. Full machine-verified lists in the investigation transcript; deletion set spans:
`admin`(19), `auth`(14), `storage`(13), `tubes`(11), `labs`(6), `supplies`(6), `users`(5),
`researchers`(3), `search`(2), `lookups`(2), `equipment`(2), `demo`/`infrastructure`/`utils`(3).

- Includes the audit's named clusters: `tubeFormatters.ts` 4 fns + `TubeLocationFormatOptions`
  (the file's `formatConcentrationDisplay` is **alive** — 5 client consumers — the file survives);
  `tubeSchemas.ts` `tubeDataArraySchema`/`bulkTubeOperationSchema`/`validateTubePosition`
  (+ dead `BulkTubeOperation`/`tubeValidationResultSchema`/`TubeValidationResult`); the auth trio
  `verifyEmailRequestSchema`/`resendVerificationRequestSchema`/`systemAdminSetupSchema`.
- **Auth trio note:** the server keeps *drifted local copies* in
  `presentation/validation/httpValidationSchemas.ts` (`VerifyEmailBodySchema:143`,
  `ResendVerificationBodySchema:147`, `SetupSystemAdminBodySchema:153` — the last adds
  `setupKey`/`department`/`position`). The shared versions are genuinely orphaned. This plan **deletes**
  the orphans (the audit's call); it does **not** re-converge the server onto them (larger change,
  different fields).
- **Type-vs-schema precision:** several entries are dead *type* halves whose *schema* is alive (e.g.
  `RetentionMetricsData`/`RetentionPolicyData` dead; `retentionMetricsSchema`/`retentionPolicySchema`
  alive). Delete only the dead half + its barrel line.
- **The 4 passthrough** (`TubeSample`, `TubeTimestamps`, `TubeUpdateSample`, `UNKNOWN_RESEARCHER`) are
  dead-in-practice — only referenced by a client passthrough barrel `client/src/domains/tubes/types/index.ts`
  that nothing downstream imports; deleting each also trims that barrel line.

**Backstop:** for shared-schemas, `typecheck` is a near-perfect verifier — any wrongly-classified-dead
export still composed into a live schema fails compilation. Spot-verified a cross-module sample
(create-requests, user-settings, force-change-password, public-lab, audit-stats) — all definition+barrel
only.

### Concern B — Dead code (server): 5 symbols

- `BaseController.extractApiKey` (`server/src/presentation/controllers/BaseController.ts:38`) — zero callers.
- `ResponseBuilder.{validationError, unauthorized, notFound, conflict}`
  (`server/src/presentation/utils/responseBuilder.ts:45,49,57,64`) — zero callers.
  `success`/`error`/`forbidden`/`internalError` stay (live). Not individually barrel-exported.

### Concern C — DTO drift: 5 fields (not ~20)

Exemplar to follow: `TubeDto.ts:18` (`TubeResponse = TubeData`) / `StorageDto.ts:15`.

| # | Field (file:line) | Fix | Risk |
|---|---|---|---|
| 1 | `EquipmentDto.ts:32` `status: string` | → `EquipmentStatus` (import shared) | none — mapper already passes the enum; pure type-tighten |
| 2 | `SupplyDto.ts:48` `status: string` | → `SupplyItemStatus` | none — pure type-tighten |
| 3 | `SupplyDto.ts:98` `barcodeType: string` | → `SupplyBarcodeType` | deeper — repo row type is `string`; narrow `SupplyBarcodeRow.barcodeType` (`SupplyItemRepository.ts:23`) at the DB boundary |
| 4 | `SupplyDto.ts:116` `type: string` | → `SupplyTransactionType` | deeper — narrow `SupplyTransactionRow.type` (`SupplyItemRepository.ts:33`) |
| 5 | `ResearcherDto.ts:15` `CreateResearcherRequest.email?` | re-export shared `CreateResearcherProfile` (email required) | low — route already validates with the required-email schema |

**Corrections from investigation:** the audit's "ResearcherDto:15" is the *request* type (drift). The
*response* `ResearcherResponse.email?` (`:27`) correctly matches optional `Person.email` — **not drift.**
A **full** `z.infer` alias of the ~15 CLEAN DTOs is *not* in this batch: shared schemas type timestamps
as `Date` (`z.coerce.date()`) while mappers emit `.toISOString()` strings, so aliasing forces mapper
rewrites — that's a larger "convergence," out of scope here. Do **not** touch the `UserDto` quartet or
Tube wrappers (intentionally distinct concepts).

### Concern D — Error-code drift: 2 sites

- `SupplyController.ts:259` — raw `'VALIDATION_ERROR'` (not an `API_ERROR_CODES` member); controller
  doesn't import the constant → use `ResponseBuilder.error(API_ERROR_CODES.REQUIRED_FIELD_MISSING, …)`
  ("X is required" convention; matches `PublicAuthController:325`).
- `RouteRegistry.ts:106` — 404 handler builds `code: 'ROUTE_NOT_FOUND'` (not a member) → `RESOURCE_NOT_FOUND`.

**No new codes added.** `ExpressAuthMiddleware`'s raw code cluster (`:40,53,66,82,113,137` — some,
e.g. `AUTHENTICATION_ERROR`/`ACCOUNT_INACTIVE`, aren't members) is **out of scope** (infrastructure layer,
not presentation; would require adding codes) — flagged as a follow-up.

### Concern E — Raw `req.user` auth decisions: 3 controllers, 2 risk tiers

**E1 (security-sensitive) — `AuditController`.** Does **not** extend `BaseController` (`:24`). Its 4 inline
`if (!req.user?.isSystemAdmin())` gates (`:142,168,194,228`) are the **SOLE** system-admin enforcement —
verified: `AdminRouteModule.ts:61-62` applies only `authenticate`+`requireAdmin`, and the 4 retention/archive
routes (`:182-196`) have no per-route middleware. Plus 4 raw-`req.user` lab-scoping decisions
(`:54-55,89-90,118-119,288-289`). **Fix order matters:** attach `requireSystemAdmin` to the 4 route
registrations **first**, then extend `BaseController` and drop the inline gates; route the 4 lab-scoping
decisions through `getAuthenticatedUser`/`extractLabId`. Removing the inline gates without the route
middleware = lab-admin privilege escalation. **Needs an integration test** (lab-admin → 403 on retention).

**E2 (mechanical) — lab-context reads.**
- `AdminUserController.ts:41` `const labId = req.user?.labId` → `this.extractLabId(req)` (extends BaseController).
- `AdminConfigController.ts:64` `const labId = req.user?.labId` → `this.extractLabId(req)`.
- **Semantics caveat:** `extractLabId` *throws* rather than returning; current code returns 403 (AdminUser)
  / 400 (AdminConfig) when absent. Preserve the existing status via `handleControllerError` mapping or an
  explicit guard — resolve red→green, don't silently change the HTTP status.

### Concern F — Magic time literals (client)

No shared time-constants module exists; `MS_PER_DAY` is file-local (`InviteCodesTab.tsx:47`);
`CACHE_TIMES` tiers live inline in `queryClient.ts`. ~40 duration literals across query hooks + session
service + date presets + intervals (full table in investigation transcript). Three buckets:
- **(a)** 3 query overrides redundant with the `CACHE_TIMES.MEDIUM` default (`useStorageQueries.ts:22,23`,
  `useActiveUsersQuery.ts:21`) → drop to inherit.
- **(b)** query staleTime/gcTime with genuinely-different values → express via `MS_PER_*` **value-preserving**.
- **(c)** non-query durations (SessionService TTLs, AuditLogFilterPanel 7/30/180/365-day presets,
  LabsPanel 48h, intervals) → `MS_PER_*`.

**Home:** new `client/src/shared/utils/timeConstants.ts` exporting `MS_PER_SECOND/MINUTE/HOUR/DAY`,
re-exported via `shared/utils/index.ts` (beside `relativeTime.ts`/`dateFormatters.ts`). Remove the
file-local `MS_PER_DAY`. **Value-preserving only** — do **not** snap query hooks to `DOMAIN_QUERY_OPTIONS`
tiers (that changes cache behavior, e.g. `TUBE_STALE_TIME` 5min→3min). Client-only (server duplicates the
same pattern incl. its own `MS_PER_DAY` at `LabApplicationService.ts:21` — flagged as a follow-up, not
this batch).

### Concern G — Search barrel (client)

`client/src/domains/search/index.ts` is missing — the only domain without a barrel (the audit's `grid`
domain doesn't exist). Two external deep-imports, both in the app shell:
`AppBootstrapService.ts:10` (`useSearchStore`), `AppHeader.tsx:28` (`SearchPanel`). Add
`search/index.ts` re-exporting `SearchPanel` + `useSearchStore` (matches sibling convention); rewire the
2 imports to `@domains/search`.

---

## Decisions (recommended — flagged for approval)

1. **Batch by concern, not by layer.** Each commit = one hygiene theme (easy review/revert). By-layer would
   mix dead-code + DTO + req.user in one server commit. → 8 commits.
2. **Delete the full 86 + the 4 passthrough** (zero-caller proven, typecheck-backstopped). Not just the
   named clusters — the lead is confirmed.
3. **Dead-code / DTO / req.user travel as separate commits** (different risk profiles; the AuditController
   change is security-sensitive and gets its own commit + integration test).
4. **Time constants → `client/src/shared/utils/timeConstants.ts` (`MS_PER_*`)**, value-preserving,
   client-only.
5. **DTO scope = the 5 drift fields only** (eliminates genuine drift, minimal blast radius); full
   `z.infer` derivation of CLEAN DTOs deferred.
6. **Error codes reuse existing `API_ERROR_CODES` members** (no new codes); `ExpressAuthMiddleware`
   cluster deferred.

---

## Phased plan (8 commits, low-risk → delicate)

Each phase = one review gate + one commit. Ordered so client-mechanical lands first and the
security-sensitive AuditController change lands last.

| # | Commit | Layer | Verify |
|---|---|---|---|
| 1 | `refactor(search): add domain barrel` | client | typecheck · client Vitest |
| 2 | `refactor(client): centralize time-duration constants` | client | typecheck · lint · client Vitest |
| 3 | `chore(shared-schemas): remove dead exports (86 + passthrough)` | shared | typecheck · server Jest · client Vitest |
| 4 | `chore(server): remove dead BaseController/ResponseBuilder helpers` | server | typecheck · server Jest |
| 5 | `fix(error-codes): route SupplyController + 404 handler through API_ERROR_CODES` | server | typecheck · server Jest |
| 6 | `refactor(dto): tighten drifted response/request DTOs to shared schemas` | server | typecheck · server Jest |
| 7 | `refactor(admin): route lab-context through BaseController.extractLabId` | server | typecheck · server Jest + integration |
| 8 | `fix(audit): enforce system-admin via route middleware; route auth through BaseController` | server | typecheck · server Jest + **new integration test** |

**Verification per batch:** run the layer's suite — `npm run typecheck` everywhere; client Vitest +
`npm run lint` for 1–2; server Jest (`npm test`) for 3–8; server integration (`npm run test:integration`)
for 7–8. Batch 1 (search barrel) is the only one with a real UI wire to eyeball; batches 3–8 are
type/test-backstopped with no meaningful UI surface.

## Definition of done (audit's bar)

Verified dead clusters deleted (zero-caller proven); the ~90-export lead delivered as a confirmed
delete-list (86 + 4); drifted DTOs derived from / reuse shared schemas; remaining raw error codes go
through `API_ERROR_CODES`; remaining raw `req.user` auth decisions go through
`BaseController`/`requireSystemAdmin`; magic time literals centralized on `MS_PER_*`; `search` gets its
`index.ts`. Each change zero-regression — typecheck + lint + tests green.
