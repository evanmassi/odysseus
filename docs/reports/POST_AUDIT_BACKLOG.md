# Post-Audit Backlog — Major Follow-Ups

**As of:** 2026-07-12, after the four-bucket quality review (every audit finding closed or
deliberately skipped — see the `*_FINDINGS.md` ledgers in this directory).

This captures the larger, out-of-scope items worth investigating later — the "real work," not
polish. Each has a starting point so it can be picked up cold. Ranked roughly by ongoing cost.

**If you only do three:** #1 (transactions), #2 (wire-contract tests), #3 (the twins decision).
Those carry real ongoing cost today; the rest are missing coverage or deferred decisions.

---

## 1. Transaction integrity across multi-write flows

**What:** Several operations write to multiple tables in sequence with no surrounding transaction,
so a mid-flow failure leaves inconsistent state.

**Why it matters:** Data-integrity risk — the highest-severity class of issue that remains.

**Where to start:** The refresh-token rotation added in `JwtSessionService.refreshAccessToken`
(revoke old token → save new token → repoint session) is a concrete example — three sequential
writes, no transaction. Then audit the other multi-write paths: bulk tube operations
(`TubeApplicationService` / `TubeRepository`), storage import (`ImportStorageCommandHandler`),
password-reset (revokes sessions + tokens), and login (creates session + refresh token). First
check whether `PostgresContext` exposes a transaction/`withTransaction` wrapper; if not, that
helper is the prerequisite. Wrap the flows that must be atomic.

## 2. Client-validated wire-contract test gap

**What:** Nothing tests that the server's actual response shapes match the Zod schemas the client
validates them against.

**Why it matters:** This is a structural blind spot — it's exactly what produced the login
regression mid-review (removing a field the client's `authResponseSchema` still required). A whole
class of silent breakage has no guard.

**Where to start:** A test layer that runs representative server responses (or contract fixtures)
through the client response schemas in `@odysseus/shared-schemas`. Highest-value coverage: the auth
responses (`authResponseSchema`, `loginResponseSchema`), the refresh response (currently typed
inline in the client `SessionService`, not even schema-validated), and the list/data wrappers.

## 3. The equipment ↔ supplies twin decision

**What:** Near-identical full-stack duplication between the equipment and supplies domains —
entities, mappers, repositories, services, and ~9 byte-identical schema pairs (categories,
documents, bulk responses, item-id fields).

**Why it matters:** The biggest remaining architectural/DRY question. It was deferred at every layer
of the review. Leaving it *undecided* is the cost — the two copies will drift.

**Where to start:** Decide the fork explicitly: (a) consolidate behind a shared generic
"inventory item" abstraction, or (b) formally accept them as permanently separate and document why.
The domain-layer ledger (C11) and the shared-schemas "Twins" note track the specific pairs. Note
that AGENTS.md marks both domains as *un-audited* exemplars — resolving this is also what would let
them become reference-quality.

## 4. Frontend audit + code-splitting

**What:** The client got lighter scrutiny than the server (the client sweep was narrow — cross-domain
barrels and design tokens — not the file-by-file pass the server layers got). Separately, the main
bundle is large.

**Why it matters:** Real load-time cost, and likely undiscovered component-level debt.

**Where to start:** The production build reports a ~1 MB main chunk (~317 kB gzipped) with only the
admin tabs lazy-loaded (`AdminSettingsModal`'s `lazy()` imports). Split by domain / route. Then a
proper component-quality pass (prop-drilling, near-duplicate components, hook boundaries) using the
same rubric the server got (`docs/audit-rubric.md`).

## 5. Accessibility

**What:** AGENTS.md mandates keyboard support for interactive elements, but there's no evidence of an
actual a11y pass.

**Why it matters:** Probably the widest gap between the documented standard and the real state, given
how modal- and form-driven the UI is.

**Where to start:** Focus management on the modals (`BaseModal` and everything built on it), keyboard
traps, ARIA roles/labels on custom interactive elements (the `role="button"` + `onKeyDown` pattern in
AGENTS.md), and tab order. An automated pass (axe) plus manual keyboard-only testing of the main flows.

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
Sentry-equivalent); metrics/health beyond the basic health check; a documented, hardened deploy
(the `NODE_ENV` fail-open fixed in the security pass hinted the deploy path is thin — secrets
management, env handling); and a plain `npm audit` / dependency-freshness check — the knip pass
covered *dead* dependencies, not *vulnerable or stale* ones.

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
