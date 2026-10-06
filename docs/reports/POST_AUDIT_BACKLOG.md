# Post-Audit Backlog — Major Follow-Ups

**As of:** 2026-07-12, after the four-bucket quality review (every audit finding closed or
deliberately skipped).

This captures the larger, out-of-scope items worth investigating later — the "real work," not
polish. Each has a starting point so it can be picked up cold. Ranked roughly by ongoing cost.

**Next up:** #4 (bundle size) and #6 (performance at volume). Everything that carried real risk is
closed, and the "unaudited frontend" this doc pointed at does not exist.

> **Revised 2026-07-12** after verifying each item against the code. **Most of the original draft's
> starting points were wrong**, and they were wrong in a consistent direction: it described work as
> outstanding that had already been done, and pointed at prerequisites that already existed.
> Corrections are struck through rather than deleted so the mistake stays visible. Two would have
> actively wasted a reader's time or made the codebase worse — #3's "consolidate behind a generic
> inventory item", and #4's claim that the client was never audited.
>
> **Read the code before trusting an item in this file.**
>
> | Item                          | State                                                                                                                                    |
> | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
> | #0 Vulnerable dependencies    | **Done** (`eb4e59f1`) — 16 prod vulns → 1, which is unreachable                                                                          |
> | #1 Transactions               | **Done** (`cf4996a3`, `fcc99674`) — mechanism + every auth flow; the two "remaining" flows needed no transaction                         |
> | #2 Wire contract              | **Largely closed** (`ccc3a81a`); runtime serialization tests remain                                                                      |
> | #3 Equipment ↔ supplies twin | **Done** (`f966d4b7`, `c9ee8994`, `66c06491`) — split verdict; the standing rule now lives in AGENTS.md                                  |
> | #4 Frontend audit             | **Already done before this doc was written** — 53 `audit:` commits; 151 of 216 branch commits touch `client/`. Only bundle size remains. |
> | #5 Accessibility              | **Partly done incidentally** by the component audit; no dedicated sweep                                                                  |
> | #6–#7                         | Open                                                                                                                                     |

---

## 0. Vulnerable production dependencies

**What:** `npm audit --omit=dev` reports 16 vulnerabilities (8 high) in _shipped_ dependencies.

**Why it matters:** It undercuts the security pass. `jsonwebtoken` depends on `jws`, which has an
advisory for _improperly verifying HMAC signatures_ — the library that validates the tokens the
security pass just hardened. Also: `express-rate-limit` (IPv4-mapped IPv6 addresses bypass
per-client limiting), `path-to-regexp` via `express` (ReDoS), `ws` via `socket.io` (uninitialized
memory disclosure, memory-exhaustion DoS), `react-router-dom` (XSS via open redirect).

**Where to start:** Every one of these reports `fixAvailable: true` with no breaking change. Run
`npm audit fix`, re-run the suites, done. This is an afternoon, not a project. The knip pass covered
_dead_ dependencies; it never looked at _vulnerable_ ones.

## 1. Transaction integrity across multi-write flows

**What:** Several operations write to multiple tables in sequence with no surrounding transaction,
so a mid-flow failure leaves inconsistent state.

**Why it matters:** Data-integrity risk — the highest-severity class of issue that remains.

**Mechanism: built 2026-07-12** (`cf4996a3`). The original draft's premise was wrong twice over —
`PostgresContext` already had `transaction()`, and the real blocker was that repositories query the
pool directly, so no _cross-repository_ flow could share one. Both are now resolved:

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

**What remains: nothing — #1 is closed.** The two flows the original draft still listed turned out
not to need transactions, and wrapping one of them would have been a bug:

- ~~Bulk tube operations~~ — these must **not** be atomic. They run through `executeBulk`, which
  executes each item independently and collects failures, and the wire contract says so:
  `bulkUpdateResponseSchema` / `bulkDeleteResponseSchema` return `updated`/`deleted` **plus**
  `failed: [{ id, error }]`. Partial success is the designed, client-visible behavior (delete twelve
  tubes, two are locked → ten deleted, two reported). A transaction would make it all-or-nothing and
  silently break the feature. Each per-tube write is a single row, already atomic on its own.
- ~~Storage import~~ — already atomic. It writes via `StorageRepository.saveWithOptimisticLock`,
  which wraps its writes in `context.transaction(...)` (`StorageRepository.ts:146`).

## 2. Wire-contract enforcement — _largely closed 2026-07-12_

**What it was:** Nothing bound the server's response shapes to the Zod schemas the client validates
them against. This produced the login regression mid-review (`db403874`): the application-layer
cleanup dropped a field the client's `authResponseSchema` still required, and it compiled fine.

**What was done** (commit `ccc3a81a`): the auth surface is now bound at the type level. Every auth
response declares the shared-schemas type the client parses it with, so a dropped or added field is
a `tsc` failure. Verified by re-introducing the original bug and watching it fail to compile.
Alongside that: `refreshTokenResponseSchema` is new (the refresh payload previously had _no_ schema
and two independent hand-rolled shapes — a server interface and a client inline generic);
`sessionToken` was deleted (required by the schema, sent in three places, read by nobody, and only a
copy of `tokens.accessToken`); and `SessionService` now parses its refresh and session-info
responses instead of casting them. `User.toPublicData()` returns `Date` rather than pre-stringifying
— the wire bytes are identical, but the schema's inferred type now matches what the server produces.

**What remains:**

- **Runtime serialization checks.** Types cannot see the wire. `dateField` is `z.coerce.date()`,
  which accepts `Date` _and_ `string`, so no type-level bind can catch a date that serializes wrong,
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

## 3. The equipment ↔ supplies twin — _closed 2026-07-12_

**What it was:** Near-identical duplication between the equipment and supply domains, deferred at
every layer of the review. Leaving it _undecided_ was the stated cost — the two copies would drift.

**They had already drifted, and it had already cost a bug.** Both catalogs document a two-level
category hierarchy and both enforced it on create. Only equipment enforced it on _reparent_, so
`PUT /supplies/categories/:id` could move a category under a subcategory and reach a third level the
create path forbids and the UI cannot render. Equipment got the hardening; supplies never did,
because the rule lived in two places.

**The answer was a split verdict, not the binary the draft posed.** Measured, not guessed:

| Pair                      | Identical after renaming                       |
| ------------------------- | ---------------------------------------------- |
| Category repository       | **100%** — zero differing lines                |
| Category entity           | **98%** — differed by one line (the ID prefix) |
| Document entity / mappers | 97% — differed by a header comment             |
| Item entity               | 50%                                            |
| Item repository           | 35% (207 vs 483 lines)                         |
| Application service       | 38% (19 vs 34 public methods)                  |

So the category and document surfaces are a genuine twin; the item surface only looks like one. That
matches what the client-side twin analysis concluded in July.

**Done** (`f966d4b7`, `c9ee8994`, `66c06491`): the depth rule extracted to one guard; category and
document entities, repositories, and mappers collapsed to one implementation each; eight duplicate
files removed. The four subclasses now hold nothing but an ID prefix, so the next drift is visible.

**Deliberately NOT done, and recorded in AGENTS.md → _Equipment ↔ Supplies_:**

- The **item surface stays separate, permanently.** ~6 shared fields out of 15+; equipment tracks
  asset lifecycle, supplies tracks a stock ledger. A generic "inventory item" would be a
  lowest-common-denominator wrapper around two unrelated subsystems — the wrong abstraction, and
  harder to unwind than the duplication. The draft's option (a) was a trap.
- The **byte-identical schema pairs stay separate.** Merging them would make a supply category
  assignable to an equipment repository. Share behaviour, never share identity.

**Found and fixed along the way:** the two catalogs ordered item documents differently — equipment
oldest-first, supplies newest-first, and neither client re-sorted, so the two panels really did
display in opposite orders. It was preserved through the refactor, then unified separately as the
behaviour change it is. Both now list newest-first, matching 7 of the 9 time-ordered queries in the
app — including the maintenance log sitting directly beside the documents on the equipment panel,
which had been newest-first while the documents next to it were not.

## 4. Code-splitting — _the "frontend audit" half of this item was already done_

> ~~**What:** The client got lighter scrutiny than the server (the client sweep was narrow —
> cross-domain barrels and design tokens — not the file-by-file pass the server layers got).~~
>
> **This was wrong, and it is the most misleading claim in the original draft.** The client had
> already received a full file-by-file audit on this branch — **53 `audit:` commits** covering every
> domain (tubes, users, supplies, storage, search, equipment, researchers, lab-management, help,
> admin, donors, authentication) plus `ui/primitives`, `ui/components/*`, and `styles/`. Of the 216
> commits on `audit/fixes`, **151 touch `client/` against 57 touching `server/`** — the client sweep
> was the larger of the two, and at a finer grain (dead props, barrel surfaces, token
> centralization, component extraction). Anyone reading the draft would conclude the client is
> unexamined. It is the most examined part of the repo.

**What actually remains:** the main bundle is large. That is a separate concern from code quality and
was never addressed by the audit.

**Why it matters:** Real load-time cost.

**Where to start:** The production build reports a ~1 MB main chunk (~317 kB gzipped). ~~Only the
admin tabs are lazy-loaded.~~ Correction: `lazy()` is used in **seven** files (`App.tsx`,
`AppDashboard`, `AppHeader`, `AdminSettingsModal`, `SystemAdminDashboard`, `HelpModal`,
`UserSettingsModal`) — so the low-hanging fruit is already picked, and the remaining 1 MB is the
_core_ bundle. Note also `client/vite.config.ts:40` sets `chunkSizeWarningLimit: 1100`, i.e. the
warning was **silenced, not fixed**. Split by domain / route.

~~Then a proper component-quality pass.~~ Not needed — that pass happened (see above). Component
quality is not the open question here; bundle size is.

## 5. Accessibility — _partly done, incidentally_

**What:** AGENTS.md mandates keyboard support for interactive elements. ~~There's no evidence of an
actual a11y pass.~~ Correction: there was no _dedicated_ a11y pass, but the component audit did a
fair amount of it in passing — 13 client commits touch aria/focus/keyboard (option ids and
`aria-activedescendant` on Autocomplete, focus-ring tokens, the modal focus trap). So the state is
better than the draft implies, but it was a by-product rather than a sweep.

**Why it matters:** Still likely a gap between the documented standard and the real state, given how
modal- and form-driven the UI is — but a narrower one than "no a11y pass has happened."

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
- **Deliberate security skips** (rationale inline, revisit if desired):
  - **L5** — `POST /storage/import` has no `validateBody` (domain-defended; `StorageImportData` is a
    hand-rolled interface with no shared schema, so a bespoke one would be a drift-prone parallel shape).
  - **I3** — registration reveals email/name-taken (invite-gated; the specific messages are better UX).

## Reference

The standing conventions in `AGENTS.md` + `docs/audit-rubric.md`. (The per-layer findings ledgers and
priority reports were removed once their work landed — git history and AGENTS.md are the source of truth.)
