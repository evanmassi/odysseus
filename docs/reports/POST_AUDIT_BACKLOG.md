# Post-Audit Backlog — Major Follow-Ups

**As of:** 2026-07-12, after the four-bucket quality review (every audit finding closed or
deliberately skipped — see the `*_FINDINGS.md` ledgers in this directory).

This captures the larger, out-of-scope items worth investigating later — the "real work," not
polish. Each has a starting point so it can be picked up cold. Ranked roughly by ongoing cost.

**Next up:** #3 (the twins decision), then #4 (frontend) / #5 (a11y). #0 is done, and #1 and #2 are
closed for the paths that carried real risk.

> **Revised 2026-07-12** after verifying each item against the code. Several starting points in the
> original draft were wrong — corrections are inline, struck through rather than deleted so the
> mistake is visible.
>
> | Item | State |
> |------|-------|
> | #0 Vulnerable dependencies | **Done** (`eb4e59f1`) — 16 prod vulns → 1, which is unreachable |
> | #1 Transactions | **Mechanism built + auth flows wrapped** (`cf4996a3`); bulk tubes + storage import remain |
> | #2 Wire contract | **Largely closed** (`ccc3a81a`); runtime serialization tests remain |
> | #3–#7 | Open |

---

## 0. Vulnerable production dependencies

**What:** `npm audit --omit=dev` reports 16 vulnerabilities (8 high) in *shipped* dependencies.

**Why it matters:** It undercuts the security pass. `jsonwebtoken` depends on `jws`, which has an
advisory for *improperly verifying HMAC signatures* — the library that validates the tokens the
security pass just hardened. Also: `express-rate-limit` (IPv4-mapped IPv6 addresses bypass
per-client limiting), `path-to-regexp` via `express` (ReDoS), `ws` via `socket.io` (uninitialized
memory disclosure, memory-exhaustion DoS), `react-router-dom` (XSS via open redirect).

**Where to start:** Every one of these reports `fixAvailable: true` with no breaking change. Run
`npm audit fix`, re-run the suites, done. This is an afternoon, not a project. The knip pass covered
*dead* dependencies; it never looked at *vulnerable* ones.

## 1. Transaction integrity across multi-write flows

**What:** Several operations write to multiple tables in sequence with no surrounding transaction,
so a mid-flow failure leaves inconsistent state.

**Why it matters:** Data-integrity risk — the highest-severity class of issue that remains.

**Mechanism: built 2026-07-12** (`cf4996a3`). The original draft's premise was wrong twice over —
`PostgresContext` already had `transaction()`, and the real blocker was that repositories query the
pool directly, so no *cross-repository* flow could share one. Both are now resolved:

- `Queryable` — the query surface repositories depend on. `PostgresContext` implements it
  pool-backed; `TransactionalContext` implements it bound to one client. All 18 repos take
  `Queryable`.
- `UnitOfWork` (`application/contracts`), implemented by `RepositoryFactory`. `withTransaction(work)`
  hands the callback a repo set bound to that transaction. **The pool-backed singletons are
  deliberately left alone** — that is what keeps event-handler writes (audit) out of the caller's
  transaction, where a rollback would erase the record of the very failure being audited. This is
  the reason an ambient/AsyncLocalStorage transaction was rejected.
- `TransactionalContext.transaction()` **joins** the active transaction rather than nesting: a second
  `BEGIN` on the same client is a silent no-op and the inner `COMMIT` would commit the outer
  transaction early. Four repositories call `transaction()` internally, so this matters.

**Auth flows wrapped** (`cf4996a3` + follow-up): refresh rotation, login (`createTokenPair`),
token-family revocation, and all four password-change handlers (admin reset, token reset,
force-change, user-initiated) via the shared `commitPasswordChange` helper. Integration tests inject
a mid-flow failure and assert rollback; each was verified to fail without its transaction.

**What remains:** the non-auth flows — **bulk tube operations** and **storage import**
(`ImportStorageCommandHandler`). Both are lower severity: a partial write there is recoverable data,
whereas a partial auth write locked the user out. Wrap them with `withTransaction`; the mechanism
needs no further work.

## 2. Wire-contract enforcement — *largely closed 2026-07-12*

**What it was:** Nothing bound the server's response shapes to the Zod schemas the client validates
them against. This produced the login regression mid-review (`db403874`): the application-layer
cleanup dropped a field the client's `authResponseSchema` still required, and it compiled fine.

**What was done** (commit `ccc3a81a`): the auth surface is now bound at the type level. Every auth
response declares the shared-schemas type the client parses it with, so a dropped or added field is
a `tsc` failure. Verified by re-introducing the original bug and watching it fail to compile.
Alongside that: `refreshTokenResponseSchema` is new (the refresh payload previously had *no* schema
and two independent hand-rolled shapes — a server interface and a client inline generic);
`sessionToken` was deleted (required by the schema, sent in three places, read by nobody, and only a
copy of `tokens.accessToken`); and `SessionService` now parses its refresh and session-info
responses instead of casting them. `User.toPublicData()` returns `Date` rather than pre-stringifying
— the wire bytes are identical, but the schema's inferred type now matches what the server produces.

**What remains:**

- **Runtime serialization checks.** Types cannot see the wire. `dateField` is `z.coerce.date()`,
  which accepts `Date` *and* `string`, so no type-level bind can catch a date that serializes wrong,
  nor an envelope change. Only a test that round-trips through real JSON can. **Any such test must
  `JSON.parse(JSON.stringify(...))` before `.parse()`** — validating the controller's return object
  instead of its serialized form passes vacuously.
- **The prerequisite the original draft missed:** there is no way to boot the app in a test.
  `index.ts` constructs Express inside a non-exported class whose constructor wires sockets, DB,
  services and routes as side effects, and the module's last line instantiates it and binds a TCP
  port. The existing integration harness (`tests/integration/setup/`) is repository-level only — real
  Postgres, no HTTP. `supertest` is installed but only used against a throwaway bare `express()` app.
  So this is an `index.ts` refactor (extract a `createApp()` factory that returns the app without
  `.listen()`), not a test-writing task. A login-through-HTTP test would additionally trip on
  `createTestUser` (`domain/__tests__/helpers.ts:11`), which seeds a **fake** bcrypt hash that won't
  verify against any plaintext.
- **Extend the binding past auth.** `ResponseBuilder.success<T>(data: T)` infers `T` from its
  argument — zero constraint. Every non-auth controller is still unbound.
- **25 raw unvalidated client calls** — `httpClient.post/put/delete` instead of the schema-taking
  `postData/putData/deleteWithData`. Ten are in `StorageService`; the rest are in `AdminUserService`,
  `AdminResearcherService`, `LabService`, `SecurityMonitoringService`. All are mutations whose
  response bodies are currently discarded, so the blast radius is small, but it's a systematic
  bypass of the rule in AGENTS.md.

## 3. The equipment ↔ supplies twin decision

**What:** Near-identical full-stack duplication between the equipment and supplies domains —
entities, mappers, repositories, services, and ~9 byte-identical schema pairs (categories,
documents, bulk responses, item-id fields).

**Why it matters:** The biggest remaining architectural/DRY question. It was deferred at every layer
of the review. Leaving it *undecided* is the cost — the two copies will drift.

**Where to start:** First read `P1B_EQUIPMENT_SUPPLIES_TWIN.md` — the **client** half of this was
already resolved (2026-07-08): seven shared components, ~1,500 lines collapsed. The original draft
didn't reference it, so anyone picking this up cold would re-tread solved ground.

What actually remains is the **server** twin: `EquipmentCategoryRepository` and
`SupplyCategoryRepository` are both exactly 77 lines; the application services are 632 vs 810; plus
the ~9 byte-identical schema pairs. Decide the fork explicitly: (a) consolidate behind a shared
generic "inventory item" abstraction, or (b) formally accept them as permanently separate and
document why. The domain-layer ledger (C11) and the shared-schemas "Twins" note track the pairs.
AGENTS.md marks both domains as *un-audited* exemplars — resolving this is what would let them
become reference-quality.

## 4. Frontend audit + code-splitting

**What:** The client got lighter scrutiny than the server (the client sweep was narrow — cross-domain
barrels and design tokens — not the file-by-file pass the server layers got). Separately, the main
bundle is large.

**Why it matters:** Real load-time cost, and likely undiscovered component-level debt.

**Where to start:** The production build reports a ~1 MB main chunk (~317 kB gzipped). ~~Only the
admin tabs are lazy-loaded.~~ Correction: `lazy()` is used in **seven** files (`App.tsx`,
`AppDashboard`, `AppHeader`, `AdminSettingsModal`, `SystemAdminDashboard`, `HelpModal`,
`UserSettingsModal`) — so the low-hanging fruit is already picked, and the remaining 1 MB is the
*core* bundle. Note also `client/vite.config.ts:40` sets `chunkSizeWarningLimit: 1100`, i.e. the
warning was **silenced, not fixed**. Split by domain / route. Then a proper component-quality pass
(prop-drilling, near-duplicate components, hook boundaries) using the same rubric the server got
(`docs/audit-rubric.md`).

## 5. Accessibility

**What:** AGENTS.md mandates keyboard support for interactive elements, but there's no evidence of an
actual a11y pass.

**Why it matters:** Probably the widest gap between the documented standard and the real state, given
how modal- and form-driven the UI is.

**Where to start:** ~~Focus management on the modals.~~ Correction: `BaseModal.tsx` already has
`useFocusTrap`, `role="dialog"`, `aria-modal`, `aria-labelledby`, Escape scoped for nested modals,
and an `aria-label` on close — the starting point the original draft named is already built.

One **real bug** lurks there: `id="modal-title"` is a hardcoded literal (`BaseModal.tsx:146`) in a
component that explicitly supports nesting, so two open modals produce duplicate DOM ids and
`aria-labelledby` resolves to the wrong one. Should be `useId()`. Beyond that, the open work is ARIA
roles/labels on custom interactive elements (the `role="button"` + `onKeyDown` pattern), tab order,
and an automated axe pass plus manual keyboard-only testing of the main flows.

## 6. Performance under data volume

**What:** Never examined during the review.

**Why it matters:** Correctness holds at small scale; behavior at realistic volume is unknown.

**Where to start:** Look for N+1 query patterns in the application services; confirm the
search/filter paths are actually indexed (there's an indexes migration — check it covers the real
query shapes, especially the multi-layer tube search and the full-text search vector); profile the
loaded tube-search path with `EXPLAIN`. Seed a realistic dataset first.

## 7. Ops / production readiness

**What:** Observability and deployment hardening were out of scope.

**Why it matters:** Fine for a for-fun project; a prerequisite before any real use.

**Where to start:** Structured error tracking (winston logs to console/file today — no
Sentry-equivalent); metrics/health beyond the basic health check; and a documented, hardened deploy
(the `NODE_ENV` fail-open fixed in the security pass hinted the deploy path is thin — secrets
management, env handling). The dependency-vulnerability half of this item was promoted to **#0** —
it turned out to be the most urgent thing in this document.

---

## Smaller parked items (from the review itself)

- **Handler trios** — tank/rack/box update+delete handlers have repeated structure (application-layer
  ledger, E3). Candidate for consolidation.
- **Category-tree twin** — server-side equipment ↔ supplies category-tree duplication (E4); part of #3
  above.
- **Deliberate security skips** (see `SECURITY_FINDINGS.md` for the rationale, revisit if desired):
  - **L5** — `POST /storage/import` has no `validateBody` (domain-defended; `StorageImportData` is a
    hand-rolled interface with no shared schema, so a bespoke one would be a drift-prone parallel shape).
  - **I3** — registration reveals email/name-taken (invite-gated; the specific messages are better UX).

## Reference

The completed-work ledgers: `docs/reports/{DOMAIN,APPLICATION,INFRASTRUCTURE,PRESENTATION,SHARED_SCHEMAS,SECURITY}_*.md`
and the standing conventions in `AGENTS.md` + `docs/audit-rubric.md`.
