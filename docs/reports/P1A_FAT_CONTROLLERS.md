# P1a — Fat-Controller / Application-Service Extraction Plan

**Date:** 2026-07-07 · **Branch:** `audit/fixes` · **Owner:** P1a from `ARCHITECTURE_AUDIT.md`

> **✅ RESOLVED — 2026-07-08.** All six phases landed as seven commits (`ea7951f3`→`bdd365c5`); the grep
> gate returns 0. New application services: `SecurityConfig`, `Person`, `UserSession`, `Lab`,
> `StorageAnalytics`, `SecurityMonitoring`; new handlers: `GetSystemMetrics`, `ForceChangePassword`,
> `GetSessionInfo`, `ListInviteCodes`; shared `application/authentication/passwordCredentials` helpers
> adopted by the login + change-password handlers. Behaviour-preserving except two intentional, tested
> fixes (force-change session revoke; AdminConfig error code) and in-file P2 cleanups. Verified:
> typecheck · 834 unit · 36 integration.

Removes every `@domain/repositories` dependency from the presentation layer: the 12 controllers that
inject repositories directly must depend on the application layer (a service, or — in CQRS domains —
a command/query handler) instead. Investigation (six parallel read-only trace agents + first-hand
verification of all 12 controllers, the exemplar service, and the full DI chain) **reframed the audit's
headline**: most writes already delegate; the leftover repo imports are overwhelmingly *reads with no
application-layer home*, plus four genuine inline write pipelines.

> **Line numbers are as-of-investigation (2026-07-07).** Confirm each at edit time before changing.
> Work **red → green** per phase; **stop for review before each commit**. Commits batched by domain.

---

## Decisions (locked)

- **Extraction pattern: match per domain.** New `XApplicationService` only where no application-layer
  home exists; fold into the existing service/handler otherwise. Do **not** wrap the 27 working Storage
  command handlers (or the Lab command handlers) behind a new facade — that would be a parallel system.
  The enforceable bar is the grep gate; the spirit is "no raw repository in presentation."
- **Behavior changes: included, with tests.** Two correctness/security gaps surfaced by the extraction are
  fixed as part of it (not silently preserved): (a) `forceChangePassword` will revoke other sessions like
  its sibling password commands; (b) `StorageAnalytics` will route its tube-count read through the existing
  `requireCanViewTubes` + tank-scope gate. Each gets an integration test.
- **Sweep: in-file only.** P2 hygiene bugs are fixed *only* inside handlers we are already rewriting
  (AdminConfig `FORBIDDEN`/`400` at `:89`; StorageAnalytics raw `'MISSING_LAB_ID'`/`req.user` at `:39,:41`;
  Auth/PublicAuth extending `BaseController`). Unrelated P2 (dead code, magic time literals, DTO drift,
  the god-file, `AuditController` `req.user`) is left to a dedicated P2 pass.
- **Batching / branch: 6 domain commits on `audit/fixes`** (continues P0's cadence and history).
- **New-service convention:** deps-object constructor (`constructor(private deps: XApplicationServiceDeps)`),
  matching the newest exemplar `ResearcherApplicationService`; `(labId, …, user)` method signatures;
  `accessControlService` gate first; DTO-mapped returns; domain errors. Rewiring touches **one file per
  domain** (`infrastructure/di/modules/<Domain>Module.ts`); `index.ts`, route modules, and
  `RepositoryFactory` are unchanged.

---

## Reframe: what actually trips the gate

The audit described "12 fat controllers [that] orchestrate persistence / write-side business rules in the
presentation layer." First-hand verification: only **four** controllers hold real inline write logic.
Everything else is **reads with no home** or **already-delegated writes** where a stray repo import
remains. The grep gate (`from '@domain/repositories` under `presentation/controllers` → 0) forces both to
move, but the risk profiles differ sharply — the reads are mechanical, the four writes are delicate.

| Controller | What trips the gate (file:line) | Kind | Target home |
|---|---|---|---|
| **PersonController** | `updateMyProfile:46-125` — verify `:70`, lazy re-hash + `userRepository.save :76-79`, email-uniqueness `:104`, `personRepository.save :112` | **WRITE pipeline** | new `PersonApplicationService` |
| **PublicAuthController** | `forceChangePassword:404-459` — `findByIdAnyLab:422`→validate→`hash:436`→`setPasswordHash:437`→`save:439`; + config/person/session reads | **WRITE pipeline** + reads | new `ForceChangePasswordCommandHandler` (+ session-revoke fix); reads → SecurityConfig svc / PersonApplicationService / session-info home |
| **AdminConfigController** | `configRepository.updateSecurityConfig:68` (write); `getSecurityConfig:31`, `getSystemMetrics:92` (reads) | **WRITE** + reads | new `SecurityConfigApplicationService`; `getSystemMetrics` → new storage `GetSystemMetricsQueryHandler`; `getUserStatistics` unchanged |
| **SecurityMonitoringController** | `mergeIpActivity:219-256`, failed-login decode `:183`, session→token cascade `:121-129` (revoke/bulkRevoke/purge) | reads + WRITE | new `SecurityMonitoringApplicationService` |
| **StorageAnalyticsController** | `computeLabUtilization:124-192` + cross-lab rollup `:76-118` | reads (aggregation) | new `StorageAnalyticsApplicationService` (+ permission gate) |
| **LabController** | `getLabDetails:114-195`, `getOverview:212-274`, `listLabs:46`, `getDemoLimits:279`; writes already delegate | reads (aggregation) | new `LabApplicationService` (reads); Create/Update handlers return the lab |
| **UserController** | `lookupUsers:65`, `listActiveUsers:78-79`, `toDisplayUsers:88-108`; settings already delegate | reads | `UserApplicationService` (dedupe with `getEnrichedLabUsers`) |
| **UserSessionController** | `getUserSessions:31`, `revokeSession:54-83` (ownership rule) | read + WRITE | new `UserSessionApplicationService` |
| **AuthController** | `personRepository.findById` email reads `:130,:159`; `logout` event `:76` | reads | `PersonApplicationService` email lookup |
| **InviteCodeController** | `inviteCodeRepository.findByLabId:53` (list) | read | new `ListInviteCodesQueryHandler` |
| **StorageController** | `labRepository.findById:107` (demo-limits graft) | read | fold into `GetCurrentStorageQueryHandler` |
| **LookupValueController** | `storageRepository.getForLab:33` (seeded-demo guard) | read | fold into `LookupValueApplicationService` (gains `storageRepository`) |

### The four genuine write pipelines
`PersonController.updateMyProfile`, `PublicAuthController.forceChangePassword`,
`AdminConfigController.updateSecurityConfig`, and `SecurityMonitoringController`'s revoke/bulk-revoke
cascade. These are the only delicate extractions; the rest are read/aggregation relocations.

### Duplication to reuse, not re-create
`PersonController`'s current-password verify (`:70-73`) duplicates `ChangeUserPasswordCommandHandler`
(`UserCommands.ts:143-149`); its lazy PBKDF2→bcrypt re-hash (`:76-79`) duplicates `LoginCommandHandler`
(`UserCommands.ts:243-247`). Extract a single shared verify-and-upgrade helper rather than duplicate a third time.

### Two behavior changes (intentional, tested)
1. **`forceChangePassword` session revoke.** Its siblings `ChangeUserPasswordCommandHandler`
   (`UserCommands.ts:158-168`) and `ResetPasswordWithTokenCommandHandler` revoke other sessions after a
   password change; `forceChangePassword` does not. The new command handler will, closing the gap.
2. **StorageAnalytics permission gate.** `getLabStorageAnalytics` calls `tubeRepository.countGroupedByLocation`
   raw (`:57`); `TubeApplicationService.getLocationCounts` wraps the same call with `requireCanViewTubes`
   + tank-scope filtering. The new service routes through it.

---

## Phased plan

Each phase = one review gate + one commit. **Nothing moves forward until the phase is green and reviewed.**
Ordered so each phase's dependencies land first (① is the home for ④'s security-config reads).

### Phase ① — Config / AdminConfig
- New `SecurityConfigApplicationService` (deps-object ctor): `getSecurityConfig`, `updateSecurityConfig`
  (with demo-mode guard). Security-scoped only — no metrics/stats grab-bag.
- New storage `GetSystemMetricsQueryHandler` for `getMetrics` (StorageRepository-backed; sits with the
  other storage query handlers). `getUserStatistics` stays on its existing handler.
- In-file fix: `AdminConfigController.ts:89` — `FORBIDDEN` code paired with `400` status → correct code/status.
- Rewire `AdminConfigController` in `StorageModule.ts`; drop `configRepository`.
- Tests: mocked service unit tests (demo-guard 403, security-config round-trip, metrics lab-scoping).
- **Commit:** `refactor(admin-config): extract SecurityConfigApplicationService + system-metrics query`

### Phase ② — Person / Profile + Auth email reads
- New `PersonApplicationService`: `getMyProfile`, `updateMyProfile` (profile mutation + email-uniqueness +
  password verify/re-hash via the shared helper + demo guard), and an email lookup used by AuthController.
- Rewire `PersonController` (`UserModule`) and `AuthController` person-email reads (`AuthModule`).
- In-file: `AuthController` extends `BaseController`.
- Tests: verify-fail, re-hash-upgrade, email-uniqueness collision, demo guard; integration for `updateMyProfile`.
- **Commit:** `refactor(person): extract PersonApplicationService from profile + auth controllers`

### Phase ③ — User lookups + self-service sessions
- `UserApplicationService`: add `lookupUsers(userIds)` + `listActiveUsers(labId)` (dedupe with
  `getEnrichedLabUsers`).
- New `UserSessionApplicationService`: `getUserSessions`, `revokeSession` (ownership rule preserved).
- Rewire `UserController`, `UserSessionController` (`UserModule`); drop their repos.
- Tests: lookup mapping, lab-filtered list, revoke-own-vs-foreign, revoke-current-session rejection.
- **Commit:** `refactor(user): extract user-lookup + session application services`

### Phase ④ — Public-auth write path
- New `ForceChangePasswordCommandHandler` (matches `PasswordResetCommands` family) **including session revoke**.
- Rewire `PublicAuthController`: `forceChangePassword` → command; `getSecurityConfig` reads → Phase ①
  service; person-email reads → Phase ② service; `getSessionInfo` session read → its home (session-info
  query/service). Drop all 4 repos + `passwordService`/`userRepository` write usage. Extends `BaseController`
  where it makes auth decisions.
- Tests: force-change happy path, temp-token invalid, weak-password reject, **other-sessions-revoked** (integration).
- **Commit:** `fix(auth): extract force-change-password command + close session-revoke gap`

### Phase ⑤ — Lab + Invite reads
- New `LabApplicationService`: `listLabs`, `getLabDetails`, `getOverview`, `getDemoLimits`.
- `CreateLabCommandHandler`/`UpdateLabCommandHandler` return the created/updated lab (drop the controller's
  post-hoc `labRepository.findById` at `:72,:89`).
- New `ListInviteCodesQueryHandler` (matches `InviteCodeQueries`) for `InviteCodeController.listCodes`.
- Rewire `LabController`, `InviteCodeController` (`LabModule`); drop 6 + 1 repos.
- Tests: lab-details aggregation shape, overview tallies, invite-list lab scoping.
- **Commit:** `refactor(lab): extract LabApplicationService + invite-list query`

### Phase ⑥ — Storage reads + analytics + security monitoring
- Fold `StorageController` demo-limits read into `GetCurrentStorageQueryHandler`; drop `labRepository`.
- Fold `LookupValueController` seeded-demo guard into `LookupValueApplicationService` (gains
  `storageRepository`); drop the repo from the controller.
- New `StorageAnalyticsApplicationService` (`computeLabUtilization` + cross-lab rollup; **route tube-count
  through `TubeApplicationService.getLocationCounts` permission gate**). In-file: fix raw `'MISSING_LAB_ID'`
  (`:41`) + raw `req.user` scoping (`:39`) via a domain error + `extractLabId`.
- New `SecurityMonitoringApplicationService` (overview, active sessions, IP activity/`mergeIpActivity`,
  purge, revoke/bulk-revoke cascade, failed-login decode, session activity).
- Rewire `StorageController`, `LookupValueController`, `StorageAnalyticsController`,
  `SecurityMonitoringController`; drop remaining repos.
- Tests: analytics utilization math + permission gate (integration), IP-activity merge, revoke cascade.
- **Commit:** `refactor(storage/security): extract analytics + security-monitoring services`

---

## Definition of done (audit's bar)

- Every controller depends on the application layer (service or command/query handler), not a repository.
- No controller performs persistence or write-side business rules.
- **Grep gate:** `from '@domain/repositories` under `presentation/controllers` returns **0**.
- The two behavior changes are covered by integration tests; every new service has mocked unit tests.
- `npm --prefix server run typecheck` + `test` + `test:integration` all green.

## Out of scope (explicitly deferred)

- **P1b** (equipment↔supplies twin) and the broader **P2** hygiene sweep (dead code, DTO drift, magic time
  literals, the 796-line god-file, `search` barrel, error-code/`req.user` drift in untouched files).
- **Service convergence** for the Storage/Lab CQRS domains — controllers there depend on handler bags,
  which is gate-clean and audit-compliant but not a stricter one-service-per-controller ideal.

## Confidence

All controller classifications and file:line citations were personally re-verified against source
(all 12 controllers, `DonorApplicationService`, `ResearcherApplicationService`, `ServiceContainer`,
`UserModule`/`LabModule`/`StorageModule`/`AuthModule` DI). No existing controller-level tests exist, so
the refactor breaks none; the net is new service-layer unit tests plus the P0 integration suite staying green.
