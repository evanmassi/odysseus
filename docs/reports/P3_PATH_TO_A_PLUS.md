# P3 — Path to A+ (the residual "immaculate" tail)

**Date:** 2026-07-09 · **Branch:** `audit/fixes` · **Owner:** the audit's "Path to A+ per dimension" table

> **STATUS: A · B · C · D · E · F — ALL DONE. The Path to A+ tail is closed.** (2026-07-10, branch `audit/fixes`.)
> Done + committed:
> - **A — Type safety** (`c8c1b1e7`): `SessionHttpClient` `any`→`unknown`; 3 floating `void mutateAsync` → `.mutate({onSuccess})`.
> - **B — Envelope consistency** (`ff4fc986` redundant `success` · `0c3d889d` dead `UserDto` removed · `a6a96eb8` hand-rolled `/health`,`/version`,404 → `ResponseBuilder`).
> - **C — Canonical error codes** (`6544f0de` domain codes → `API_ERROR_CODES` + one-branch handler · `6a8f34cf` `ExpressAuthMiddleware` flat envelope + codes; **fixed a real client bug** — auth-error codes were being dropped, so session-terminal detection now works; added `LAB_DEACTIVATED`).
> - **D — DTO derivation** (`cf5682bc`): 13 hand-rolled response DTOs → `z.infer` aliases (zero behaviour change).
> - **E — Barrel-bypasses** (`c54d63cf` users · `cb4a099a` auth · `61d440fc` tubes · `b8b66c4b` storage · `a727c86f` tails): every cross-domain import now resolves through the target's public barrel or is a documented exception. The **only 5 remaining deep imports are the marked `tubes↔storage` cycle edges**; **zero cycles proven by a clean production build.** `TubeData` (a shared-schema type) was repathed to `@odysseus/shared-schemas` rather than a domain barrel; the dev-only `SurfacePreviewPage` was exempted with a one-line comment rather than bloating barrels; 5 latent intra-tubes self-barrel imports (surfaced by the promotion) were fixed to deep aliases. See the Batch E section for the final cycle rule.
> - **F — Date-only correctness** (`2eaeb8f6` convention + pg fix · `ae07785e` DTO derivation): date-only fields typed `z.string()` via new `dateOnlyField`/`optionalDateOnlyField` helpers (7 fields + `collectionDate` retrofit). **Root-cause timezone fix:** `pg.types.setTypeParser(1082, v => v)` returns Postgres `DATE` columns as raw `"YYYY-MM-DD"` strings — no `Date`, no local/UTC round-trip, no day shift. The last 5 deferred DTOs collapsed to `z.infer` aliases. **Verified end-to-end in-app** (UI date edit round-tripped with no ±1 shift).
> - **Logger port** (decision #1): consciously left as a documented ambient-infra exception. Recorded here; **no AGENTS.md change** — the logger is an application/infra dependency and violates no stated rule (the Cross-Layer rule targets `domain`), so a note there would be misplaced.
> - Also `e22aa719`: fixed a pre-existing DTO import-order lint regression introduced by Batch D.
>
> **Remaining: none.** All verified green throughout: typecheck · client lint · **client production build (no import cycles)** · client Vitest (189) · server Jest (838) · integration (36).

P0–P2 closed the priority roadmap. This is the remaining B− → A+ polish the audit lists in its
"Path to A+" table plus two items P2 deliberately deferred. Investigation **resized several items** —
the "~20 barrel-bypasses" is actually **78**; the DTO "full derivation" splits into a safe 13 and a
schema-correctness cluster; the residual error-code drift is **provably client-safe**.

> **Line numbers are as-of-investigation (2026-07-09).** Confirm at edit time. Work **red → green**
> per batch; **stop for review before each commit.** Batches ordered clean-wins → structural.

---

## Decisions (recommended — flagged for approval)

1. **Logger port → LEAVE (documented exception).** 13 app files / ~89 call sites import the concrete infra
   `logger`. A `Logger` port injected into 13 constructors is textbook over-abstraction (AGENTS.md warns
   against it); logging is the single most widely-tolerated DIP exception (all the *real* outward edges —
   repos, session, event bus, config — are already ports). "Immaculate" means right-sized, not
   maximally-abstracted. Recommend leaving it, with a one-line note so future audits stop re-flagging.
2. **Date-only schema retype → its own verified batch (Batch F), framed as a correctness fix.** Six shared
   schema fields type date-only values (`purchaseDate`, `expirationDate`, …) as `Date` via `optionalDateField`,
   which `z.coerce.date()` shifts across timezones — a latent bug the codebase already documents and avoids for
   `collectionDate` (`donorSchemas.ts:37`). Retyping them to `z.string()` fixes the bug *and* unblocks the last
   DTO aliases. Touches shared schemas + the client render path → deserves its own change with client
   verification, not smuggling into a refactor.
3. **Barrel-bypasses: promote real public API, repath all consumers, but don't make barrels kitchen sinks.**
   A symbol with a genuine external consumer *is* public → it belongs on the barrel. The "internal leaks"
   (grid internals composed by the app shell) have real app-shell consumers, so promoting them is correct, not
   a smell. The 12 dev-only `SurfacePreviewPage` rows are lowest value — **recommend cleaning them too** for a
   truly immaculate bar (they're the same mechanical repath), but easy to drop if you'd rather exempt the dev
   tool.
4. **Dead `UserDto.toAuthResponse` cluster → delete.** It + its only producers (`registerWithPassword`/`login`)
   have zero callers (the live path is `PublicAuthController`). Caller-first: delete, don't just de-`success` it.

---

## Batches (clean-wins → structural)

### Batch A — Type safety to A [client]
- `SessionHttpClient.ts:18,27` — `<T = any>` → `<T = unknown>` (+ `post`'s `data: any` → `unknown`). Internals
  unchanged (`request<T>` already `as T`); auth-only client, so audit call sites, tighten any that leaned on the
  `any` default.
- **Three** floating `void …mutateAsync` promises → `.mutate(payload, { onSuccess })` (idiomatic TanStack
  fire-and-forget; matches `DonorEditForm`): `SupplyItemForm.tsx:255`, `:287`, `SupplyItemInfoPanel.tsx:484`.
  (Global `MutationCache.onError` already shows the user error — this is the technical floating-promise only.)
- **Leave:** the 6 annotated `any` and `zodResolver(...) as never` (RHF friction) — the audit's "~6 annotated,
  zero suppressions" holds exactly; forcing those would be churn, not immaculacy.
- **Verify:** typecheck · client Vitest · lint. **Commits:** 1 (`fix(types): tighten SessionHttpClient generic + close floating mutations`).

### Batch B — Response-envelope consistency [server]
- Drop the redundant inner `success: true` from 9 `ResponseBuilder.success({ success: true, … })` sites:
  `AdminUserController.ts:127,145,185,211,251`; `SystemAdminUserController.ts:32,50,68,86`.
- Delete the dead `UserDto.toAuthResponse` (`UserDto.ts:48`) + the `AuthResponse` `success` field +
  the unused `registerWithPassword`/`login` producers (zero callers — verify then delete).
- Hand-rolled **success** envelopes → `ResponseBuilder.success`: `/health` + `/version`
  (`PublicRouteModule.ts:142-162`).
- Hand-rolled **error** envelopes in presentation → `ResponseBuilder.error`: `RouteRegistry.ts` 404 (`:103`)
  + global handler (`:83-90`).
- **Verify:** typecheck · server Jest. **Commits:** ~2 (redundant-success + dead-DTO; hand-rolled envelopes).

### Batch C — Canonical error codes [server]
- Domain error classes: set each `code` to its canonical `API_ERROR_CODES` member (closes the only real leak —
  the fallback global handler `RouteRegistry.ts:79` passes `err.code` raw): `VALIDATION_ERROR→VALIDATION_FAILED`,
  `CONFLICT_ERROR→DATA_CONFLICT`, `NOT_FOUND_ERROR→RESOURCE_NOT_FOUND`, `PERMISSION_ERROR→FORBIDDEN`,
  `USER_ALREADY_EXISTS`/`EMAIL_ALREADY_EXISTS→RESOURCE_ALREADY_EXISTS`, `USER_NOT_FOUND→RESOURCE_NOT_FOUND`,
  `TOO_MANY_LOGIN_ATTEMPTS→RATE_LIMITED`, `USER_INACTIVE→FORBIDDEN` (across `server/src/domain/errors/*`). The 3
  password/email codes have no member → they already surface as `BUSINESS_RULE_VIOLATION` via
  `handleControllerError`; leave their strings or fold to `VALIDATION_FAILED` — no new members.
- `ExpressAuthMiddleware.ts` raw strings → `API_ERROR_CODES.*` (`:40,53,82` behavior-identical) and remap the
  non-canonical: `AUTHORIZATION_ERROR`/`AUTHENTICATION_ERROR→INTERNAL_SERVER_ERROR` (500s), `ACCOUNT_INACTIVE→FORBIDDEN`,
  `LAB_DEACTIVATED→FORBIDDEN`. Normalize its divergent `{error:{code,message},meta}` envelope shape while there.
- **Client-safe (verified):** the client keys off only `SESSION_IDLE_TIMEOUT`/`SESSION_ABSOLUTE_TIMEOUT`/
  `SESSION_REVOKED` (`HttpClient.ts:14-18`, passed through raw at `ExpressAuthMiddleware.ts:99`) — leave those
  three untouched; a grep confirms the client branches on no other code.
- **Verify:** typecheck · server Jest. **Commits:** ~2 (domain codes; middleware codes+envelope).

### Batch D — DTO clean derivation [server]
- Collapse **13** hand-rolled `*Response` interfaces to `z.infer` aliases / `.extend`, dropping ~15
  `.toISOString()` (mapper emits the entity's `Date`; wire is identical — client re-coerces via the shared
  schema). 4 files: `DonorDto`, `EquipmentDto`, `SupplyDto`, `ResearcherDto`. `SupplyBarcodeResponse` /
  `SupplyPackagingLevelResponse` need no mapper change (zero date fields).
- **Leave hand-rolled** (re-verified): `UserDto` quartet, Tube wrappers (`BulkUpdateRequest`,
  `TubeSearchResponse`) — genuinely distinct. Exclude the 3 date-only-blocked interfaces (→ Batch F).
- **Verify:** typecheck · server Jest. **Commits:** 1.

### Batch E — Barrel-bypasses (the structural one) [client]

> **STATUS: DONE** (`c54d63cf` users · `cb4a099a` auth · `61d440fc` tubes · `b8b66c4b` storage · `a727c86f`
> tails). Implemented as **option (a)**: keep each symbol in its home domain, barrelize every non-cyclic
> cross-edge, and confine the `tubes↔storage` coupling to the minimal set of documented deep imports.
>
> **The estimate resized: the irreducible deep set is 5 edges, not ~9.** Most storage→tubes consumers
> (`StorageNavigator`, `BoxOccupancyMatrix`, `useRackTubesByBox`) only become cyclic once promoted onto the
> storage barrel; promoting them forces exactly those three edges deep, plus `useStorageSync→tubeStore` and
> `useTubeMutations→getStorageDataFromCache`. Each carries the uniform `// deep import: avoids
> @domains/tubes↔@domains/storage barrel cycle` marker. Every *consumer* import (app-shell/help/search) goes
> through a barrel; the marked exceptions are all genuine `tubes↔storage` cross-edges.
>
> **Why (a), not (b) [relocate the leaves to `@shared`]:** the cycle's irreducible legs are *stateful* —
> `TubeInfoPanel→useStorageData` (React-Query hook) and `useStorageSync→useTubeStore` (Zustand store) —
> neither can move to `@shared`. So (b) cannot dissolve the cycle *and* would misfile domain semantics
> (`formatPositionForBox` reads storage-equipment config; `getTubeColorFromFields` reads tube fields) into the
> generic bucket. (a) keeps each symbol in its home and marks the real coupling — the same "right-sized, not
> maximally-abstracted" ethos as the logger exception (decision #1). **Zero cycles proven by a clean
> production `build`.**
>
> **Other as-built decisions:** `TubeData` (a shared-schema type) repaths to `@odysseus/shared-schemas`, not
> a domain barrel. Dynamic `import()` lazy-loads (StorageManagerModal/UserSettingsModal/DonorRegistryModal)
> stay deep. `SurfacePreviewPage` (dev catalog) was **exempted** with a one-line comment rather than promoting
> ~8 internals onto public barrels. Promoting the grid components surfaced 5 latent **intra-tubes** self-barrel
> imports (a domain importing its own `@domains/tubes` barrel) → fixed to deep aliases.
>
> _The plan text below is the pre-flight estimate (68 in-scope edges, tentative E1–E5 split); the batches
> actually shipped by target domain (auth/tubes/storage/tails) as summarised above._

78 cross-domain deep imports → all through barrels. Sub-batched by target domain; each: promote the
externally-consumed symbols onto the target barrel, then repath consumers. Behavior-preserving (repaths) —
typecheck + Vitest are the backstop; **watch for barrel-level circular deps** (tubes↔storage already
cross-depend) per sub-batch.
- **E1 — trivial repaths (19):** the 17 already-barrel-exported + 2 MIXED after adding `sessionManager` to the
  auth barrel. No design decisions.
- **E2 — tubes barrel promotions (largest):** export the public `types` (`TubeData`, `PositionKey`) + the
  grid/editor/locking components the app shell composes; repath ~26 sites.
- **E3 — storage:** promote `formatPositionForBox`, `getAxisLabelsForBox`, `getStorageDataFromCache`,
  storage-navigator public pieces; repath (incl. the 5 tubes→storage outbound).
- **E4 — users/donors/admin/auth tails:** promote `useUserProfile`/`useUserSettingsQuery`, `useDonorRegistryStore`,
  the auth entry components + `authService`; repath.
- **E5 — dev-only `SurfacePreviewPage` (12):** same mechanical repath (or exempt per decision #3).
- **Verify:** typecheck · client Vitest · lint per sub-batch. **Commits:** ~5 (one per sub-batch).

### Batch F — Date-only schema correctness [shared + server] — *decision-gated (see #2)*

> **STATUS: DONE** (`2eaeb8f6` convention + runtime fix · `ae07785e` DTO derivation). Two refinements over the
> plan: (1) it was **7** date-only fields, not 6 (`nextScheduledDate` was missed in the estimate), plus a
> `collectionDate` retrofit; a named `dateOnlyField`/`optionalDateOnlyField` helper pair makes the convention
> explicit and greppable. (2) **The root cause is runtime, not just the type.** Retyping the schema to
> `z.string()` alone doesn't stop the shift — the mapper's `toISOString(localMidnightDate)` still shifted the
> day. The real fix is `pg.types.setTypeParser(1082, v => v)` in `PostgresContext`: Postgres `DATE` columns
> return raw `"YYYY-MM-DD"` strings, so no `Date` is ever constructed (no local/UTC round-trip). The 7 date-only
> mapper reads were simplified to string pass-through and their row types made honest (`string | null`). All 5
> deferred DTOs collapsed to `z.infer` aliases (`EquipmentItemResponse`, `EquipmentMaintenanceLogResponse`,
> `EquipmentItemDetailResponse`, `SupplyTransactionResponse`, `SupplyItemDetailResponse`); `SupplyStockResponse`
> stayed hand-rolled (no domain entity since P2) with `updatedAt: Date` so the composed alias typechecks.
> **Verified end-to-end in-app** — a UI date edit round-tripped with no ±1-day shift.

- Retype the 6 date-only shared fields from `optionalDateField`/`dateField` → `z.string()` in
  `equipmentSchemas.ts` + `supplySchemas.ts` (matches `donorSchemas.ts:37`), fixing the `z.coerce.date()`
  timezone shift. Then collapse the 3 previously-blocked DTOs (`EquipmentItemResponse`,
  `EquipmentMaintenanceLogResponse`, `SupplyTransactionResponse`) + 2 composed to aliases.
- **Verify:** typecheck · server Jest · client Vitest · **drive the client** (equipment/supply date rendering)
  since this touches the render path. **Commits:** ~1–2.

---

## Definition of done (A+ bar)
Every cross-domain import goes through a barrel; type safety has no unannotated `any`, zero suppressions, no
floating promises, no untyped generic defaults; one canonical envelope and one canonical error-code table
(no hand-rolled envelopes or non-canonical codes reaching any path); response DTOs derive from shared schemas
(no drift, no parallel hand-rolled shapes except the genuinely-distinct few); the date-only timezone bug fixed.
Logger port consciously left as a documented ambient-infra exception. Each change zero-regression.

**✓ Met (2026-07-10).** All bars cleared: cross-domain imports go through a barrel or one of the 5 marked
`tubes↔storage` cycle exceptions (zero cycles proven by production build); the date-only bug fixed at the
root and verified in-app; DTOs derive from shared schemas; logger left as-is by decision. Nothing outstanding.
