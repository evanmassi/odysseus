# Security Pass Findings — Bucket 4

**Date:** 2026-07-12 · **Branch:** `audit/fixes` · **Status: FIX-NOW TIER COMMITTED; D1–D3 APPLIED + VERIFIED (uncommitted)**

Fix-now tier (H1, M1–M11, L1–L4, L6/L7) committed: `795b0a50` + docs `7f7d4c45`.
D1–D3 then applied (the user opted to close all findings for an A+): D1 refresh-token rotation +
reuse detection, D2 hash refresh tokens at rest (both `refresh_tokens` and `user_sessions`), D3
allowlist for client-facing error context. All suites green: Jest 675 · integration 33 (added a
refresh-token-hashing round-trip test) · client Vitest 189 · tsc ×2 · lint ×3 · client build.
Remaining: only the optional hardening (L5, L8–L10, I1–I3) and the redundant now-locked
`/admin/security-config` PUT cleanup.

Seven parallel finder agents, one security dimension each (authN/token lifecycle, authZ/lab-scoping,
input-validation, SQL, transport/CORS/rate-limiting/sockets, secrets/config, data-exposure). Every
medium-and-up finding below was **coordinator-re-verified** by reading the actual code (cited).

## Baseline is strong (verified clean)
JWT verification always runs with algorithm/issuer/audience pinned and `exp` enforced; bcrypt cost 12;
reset/verification tokens are 256-bit random, hashed at rest, single-use, expiring; reset flow is
enumeration-opaque. **SQL is fully parameterized** — no injection anywhere; every dynamic identifier
(sort columns, category columns) is allowlisted-by-construction. HTTP CORS is locked to an allowlist
(not wildcard); helmet mounted before routes; **login/reset/register ARE rate-limited** (login
double-layered); `trust proxy` correct; body size capped at 100kb. Input-validation coverage is high
and **mass assignment is clean** (no controller spreads `req.body` into an entity without a schema).
`User.toPublicData` excludes hash/salt/apiKey/tokens; no secret reaches any response or log. Lab
tenant-isolation is solid across user-management, invite-codes, supply/equipment sub-resources,
sessions, audit/export — the two IDOR findings below are specific holes, not a systemic pattern.

---

## HIGH

### H1 — A lab-admin can rewrite the global security policy for every tenant
`security_config` is a single global row (`schema.sql:64` `CHECK (id = 1)`, no `lab_id`).
`PUT /api/admin/security-config` (`AdminRouteModule.ts:143`) sits behind `requireAdmin`
(`ExpressAuthMiddleware.ts:142` = `user.isAdmin()`, **true for lab_admin**), and
`SecurityConfigApplicationService.updateSecurityConfig` gates only on `user.isDemo` — no
system-admin check. A lab-admin of any lab can POST `{ enableRateLimiting:false,
requireStrongPasswords:false, passwordMinLength:1, logFailedAttempts:false }` and downgrade auth,
disable brute-force protection, and stop failed-login logging **system-wide**. A dedicated
system-admin route (`/api/system/security-config`) already exists for this global row; the client
calls both (`AdminService.ts:42` and `:84`).
**Fix:** lock the write to system-admin — add `requireSystemAdmin` to the admin PUT route, or drop
the admin write and keep only `/system/security-config`, or enforce system-admin inside the service.
**Decision for Evan:** the lab-admin Settings UI currently calls this endpoint; it must be
hidden/read-only for lab-admins or they'll get 403s. No data migration.

---

## MEDIUM — recommend fix now (low risk, contained)

### M1 — Logout revokes nothing server-side  *(the parked `/auth/logout` question — answered)*
`AuthController.logout` (`AuthController.ts:57-69`) only publishes `UserLoggedOutEvent` (audit-only
subscriber) and returns success — no `revokeSession`, no refresh-token revoke. The client
(`AuthService.logout`) doesn't even call the endpoint (just `queryClient.clear()`). Session + 7-day
refresh token stay valid after logout. On a shared lab workstation, a captured token pair keeps
working. **Fix:** revoke the session (`req.sessionId` is populated) + its refresh token in the
handler; wire the client to POST logout. No response-shape change.

### M2 — Unauthenticated sockets can enumerate all online users across all labs
`socketAuth` lets tokenless/invalid-token sockets connect (`socketAuth.ts:31,50` — `next()` with no
rejection). `request_presence` (`SocketEventHandler.ts:144`) is registered **outside** the
`if (socket.userId && socket.username)` guard, so an anonymous socket emits it, hits the
`labId`-less else → `getOnlineUserIds()` (all tenants). **Fix:** guard `request_presence` on
`socket.userId && socket.labId` (empty list otherwise); reject tokenless sockets in `socketAuth`.

### M3 — `POST /api/users/lookup` leaks cross-lab PII (IDOR)
`UserRepository.findByIds` SQL has no `lab_id` filter; the route is `authenticate`-only. Any user can
POST arbitrary user IDs and get back username + real first/last name of users in any lab. **Fix:**
lab-scope the lookup (`findByIdsInLab(ids, labId)`), system-admins bypass. Mirrors the already-fixed
supply-transaction leak.

### M4 — `POST /auth/change-password` has no `validateBody`
`changePasswordRequestSchema` does not exist (grep: zero hits). The route
(`AuthRouteModule.ts:50`) forwards raw `req.body`. Bounded downstream (current-password check +
length cap) but an unvalidated auth endpoint. **Fix:** add `changePasswordRequestSchema` to
shared-schemas + `validateBody`. (One of the deferred schema items earmarked for this bucket.)

### M5 — Audit-search `limit`/`offset` unbounded (DoS)
`AuditController.parseAuditFilters` does `parseInt(query.limit)` with no max/NaN guard; flows into
SQL `LIMIT` (`AuditRepository.ts:179`, `??` doesn't catch NaN). Routes have no `validateQuery`.
A lab-admin sends `?limit=100000000` (memory exhaustion) or `?limit=abc` (`LIMIT NaN` → 500).
**Fix:** `validateQuery` with `z.coerce.number().int().min(1).max(200)`.

### M6 — CSV formula injection in exports
`csvGenerator.escapeValue` only quotes on comma/quote/newline; never neutralizes leading
`= + - @`. Stored user text (names, notes, cellType) exports verbatim; when an admin opens the CSV,
`=HYPERLINK(...)`/`=WEBSERVICE(...)` executes on their machine and can exfiltrate other cells.
**Fix:** prefix a cell beginning with `= + - @ \t \r` with `'` — but skip `-` for genuine numeric
cells (equipment cost/price) so negatives aren't stringified.

### M7 — Global error handler leaks `err.message` + `context`
`RouteRegistry.applyGlobalErrorHandler` (`RouteRegistry.ts:84-87`) returns raw `err.message` and
`context` unconditionally (stack dev-gated) — unlike `handleControllerError`, which fails closed.
Middleware/`next(err)` errors (e.g. a Postgres unique-violation message) reach the client.
**Fix:** for non-DomainError, respond with a fixed generic message/code (log the detail); base the
dev-stack flag on an explicit `NODE_ENV === 'development'`.

### M8 — Login timing oracle (user enumeration)  *(flagged by two finders)*
`LoginCommandHandler` (`UserCommands.ts:226`) throws before bcrypt when the user doesn't exist;
existing users pay the ~100ms bcrypt cost. Response latency distinguishes real accounts (messages
are already identical — only timing leaks). **Fix:** run a dummy bcrypt compare on the not-found
path.

### M9 — `NODE_ENV` fails open (config)
`environment = process.env.NODE_ENV || 'development'` (`EnvironmentConfigurationService.ts:62`);
the prod fail-closed throw + DB SSL are gated on `=== 'production'`. A prod deploy that forgets
`NODE_ENV` boots in dev mode → known/committed JWT secret + SSL off → forgeable admin tokens.
**Fix:** treat unset/non-dev `NODE_ENV` as fail-closed (only use the dev secret when
`NODE_ENV === 'development'` explicitly). Pairs with L6.

### M10 — Socket.IO CORS is wildcard `origin: "*"`
`index.ts:69` — the socket server allows any origin while HTTP CORS is locked (`index.ts:124`).
Mitigated by token-handshake auth (not ambient cookie), but removes the origin gate on the socket
surface (incl. M2). **Fix:** reuse `allowedOrigins`.

### M11 — `emitToLabRooms` fails open (downgraded from finder's medium)
`SocketEventHandler.ts:86-89` — a missing `labId` broadcasts globally via `io.emit()`. Tracing the
call sites, the **only** path passing `undefined` is `configuration_updated`
(`:352`, when `labId === 'unknown'`) — config settings, not researcher PII (all tube/researcher/user
events pass a populated `event.labId`). Real fail-open design, limited payload. **Fix:** fail closed
(log + drop) when `labId` is missing.

---

## MEDIUM — recommend DEFER (wire-contract / migration risk — the login-regression class)

### D1 — Refresh tokens are not rotated
`JwtSessionService.refreshAccessToken` returns a new access token but the same refresh token; no
rotation, no reuse detection (despite "OAuth 2.0 rotation" comments). A stolen refresh token is
replayable for 7 days. **Fix is larger:** true rotation changes the refresh wire contract (client
must persist the new token) + needs a lineage column. **Do now:** at minimum remove the misleading
"rotation" comments. **Defer** the real change to a coordinated client+server+migration effort.

### D2 — Refresh tokens stored in plaintext at rest
`RefreshTokenRepository.save`/`findByToken` store & match the raw token (`token = $1`), unlike the
hashed reset tokens. DB read access = usable bearer credentials. **Fix:** store SHA-256 of the token
(256-bit random → fast hash is fine, keeps a single indexed lookup). **Needs a migration** (existing
tokens invalidated → one forced re-login). Pair with D1.

### D3 — `DomainError.context` is returned to clients as `details`
`handleControllerError` (`errorHandler.ts:48`) serializes each error's `context`. Currently benign
(reflected input / caller's own IDs), but any future error placing a sensitive value in `context`
auto-leaks. **Fix carries wire risk:** `ConflictError`'s version fields drive the client's
optimistic-lock retry UX — a blanket strip would regress that. Scope narrowly (allowlist safe keys)
or defer.

---

## LOW

- **L1** `refreshAccessToken` doesn't check `session.isActive` — a revoked session can still mint
  access tokens (neutralized downstream by access-token validation; defense-in-depth). Cheap fix:
  reject `!userSession.isActive`. *(recommend fix now)*
- **L2** `POST /auth/force-change-password` lacks the per-route `authLimiter` its siblings have
  (`PublicRouteModule.ts:120`) — brute-forceable at the 300/min global ceiling vs 10/min. *(fix now)*
- **L3** `PUT /me/profile` has no `validateBody` — whitelisted downstream; `updatePersonProfileSchema`
  already exists and just needs wiring. *(fix now — deferred schema item)*
- **L4** Security-monitoring `limit`/`hours` unbounded (`SecurityMonitoringController.ts:91,104`) —
  system-admin-only, so high trust boundary. *(fix now — cheap)*
- **L5** `POST /storage/import` has no `validateBody` — domain-defended via `Storage.fromData`.
  *(optional / low priority)*
- **L6** `server/.env.development` carries a real (dev-scoped) JWT secret + DB password; it's the
  fallback M9 uses. Replace with placeholders or gitignore. *(fix now, pairs with M9)*
- **L7** Email PII logged at info level (`PublicAuthController.ts:267,316,350`). Log-only. *(fix now)*
- **L8/L9** Unescaped LIKE `%`/`_` in donor search (`DonorRepository.ts:66`) and tube researcher-name
  search (`TubeRepository.ts:714`) — bound params, lab-scoped, no injection. Defense-in-depth only.
  *(optional)*
- **L10** `SYSTEM_ADMIN_SETUP_KEY` gate is skipped when unset, and compared with `!==` (not
  `timingSafeEqual`). **Mitigated:** the create-system-admin endpoint self-disables once any system
  admin exists (`UserCommands.ts:83-86`), so the risk is only the first-run bootstrap window.
  *(optional: require the key in prod + timing-safe compare)*

## INFO
- **I1** Non-constant-time `===` on PBKDF2/token hashes (`BcryptPasswordService.ts:39`, User token
  checks) — optional hardening.
- **I2** Two intentional pre-config `process.env` reads (bootstrap) + dead `LOG_CONSOLE`/`LOG_FILE`
  keys in `.env.example`.
- **I3** Registration reveals email/name-taken — but gated behind a valid invite code; accepted
  trade-off unless tightened.

---

**Applied (implementation notes):**
- **H1** — `requireSystemAdmin` added to `PUT /admin/security-config` (client was already read-only for
  lab-admins, so no UX change).
- **M1** — logout revokes the current session (`userSessionRepository.revokeSession`); combined with
  **L1** (refresh now rejects an inactive session) both tokens die for that device without logging out
  others. Client `AuthService.logout` now POSTs the endpoint best-effort.
- **M2** — `request_presence` returns early for `!socket.userId`. **M11** — `emitToLabRooms` drops +
  warns when `labId` is missing (no global broadcast). **M10** — socket CORS reuses `allowedOrigins`.
- **M9** — unset `NODE_ENV` defaults to `production`; `getJwtSecret` throws outside development/test.
  **L6** — left `.env.development` as the dev template (dev-scoped values); the M9 code change covers the
  realistic "prod forgot NODE_ENV" exposure.
- **M8** — bcrypt run on the user-not-found login path (timing parity). **M6** — CSV formula-char guard
  (skips genuine numbers). **M7** — global error handler stays generic on 500s. **L7** — email PII
  removed from verification logs.
- **M3** — `users/lookup` lab-scoped (`user.isSystemAdmin() ? undefined : user.labId` → `findByIds(ids, labId?)`).
  **M4/L3** — `changePasswordRequestSchema` + `updateMyProfileRequestSchema` added and wired via
  `validateBody`. **M5/L4** — audit-search + security-monitoring query bounds via `validateQuery`
  (`action`/`entityType` kept string-or-array for repeated params). **L2** — `authLimiter` on force-change-password.

**D1–D3 applied (implementation notes):**
- **D1 rotation** — `refreshAccessToken` now revokes the presented token, issues a new one inheriting
  the session's remaining lifetime, and repoints the session (`UserSession.rotateRefreshToken`). The
  refresh response returns the new token; the client (`SessionService`) persists it. Replaying an
  already-rotated (revoked) token triggers `revokeUserTokenFamily` (all sessions + refresh tokens).
- **D2 hash-at-rest** — refresh tokens are stored as SHA-256 hashes in both `refresh_tokens.token`
  and `user_sessions.refresh_token` (`domain/utils/tokenHash.ts`). The `RefreshToken` entity persists
  the hash and exposes the raw value transiently (client response only); both repo lookups hash their
  input. Migration 023 clears the now-stale plaintext rows. New integration test proves the round-trip.
- **D3 error-context** — `filterPublicContext` (an explicit client-safe key allowlist) gates what
  `handleControllerError` and the global handler return; full context is still logged server-side.

**Polish batch applied:** removed the redundant `/admin/security-config` PUT (and the orphaned
client `updateSecurityConfig` method / `useSecurityConfig` branch — the `/system` route is the sole
writer); **L10** now requires `SYSTEM_ADMIN_SETUP_KEY` in production (handler fails closed when
unset) and compares it with `constantTimeEqual`; **I1** routes the PBKDF2 password path and the
email-verification / password-reset token checks through `constantTimeEqual` (`domain/utils`);
**I2** dropped the dead `LOG_CONSOLE`/`LOG_FILE` keys from `.env.example`; **L8/L9** escape LIKE
metacharacters (`%` `_` `\`) in donor + tube-researcher search via `escapeLikePattern` + `ESCAPE '\'`
(fixes literal-underscore over-matching; integration test added).

**Deliberately left (verified marginal):** L5 (storage-import validateBody — `StorageImportData` is a
hand-rolled domain interface with no shared schema; a bespoke Zod schema would be a drift-prone
parallel shape, and `Storage.fromData` is the authoritative validator), I3 (registration
enumeration — invite-gated, and the specific messages are better UX).
