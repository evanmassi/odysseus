# Investigation Prompt — Client Mutation Error-Handling Standard

**For a future session.** Goal: decide and document one industry-standard way the client
surfaces mutation/query failures, then migrate every call site to it. Today the codebase mixes
three patterns for the same job; T1 removed the clearly-wrong one (double toasts) in three domains
but deliberately left the deeper style questions — and two whole domains — untouched, because they
can't be answered piecemeal.

---

## Background: how errors surface today

- **`client/src/app/cache/queryClient.ts`** owns two global handlers:
  - `MutationCache.onError` → `handleMutationError`: toasts **every** failed mutation. On `4xx` it
    shows the server's `error.message`; on `5xx / offline / 429 / network` it shows a canned string.
  - `QueryCache.onError` → `handleQueryError`: only toasts when the error is a **network** failure
    (status 0). Every other failed query is silent unless a local `catch` handles it.
- Server 4xx errors are `ValidationError`s with specific, user-facing messages (e.g. "Transaction
  has already been voided", "Cannot delete category — equipment items are still assigned…"). These
  reach the client verbatim: `HttpTransport.buildApiError` puts the envelope's `error` into
  `ApiError.message`, which the global 4xx branch shows. **The whole error-UX model rests on server
  message quality** — confirm it holds everywhere before committing to "global is the sole toaster".
- The `meta: { invalidates: [...] }` convention already exists (see `handleMutationSuccess`) — proof
  that `meta`-driven mutation behaviour is an accepted idiom here. Any `meta`-based error solution
  should follow that precedent.

## What T1 already settled (do NOT redo)

Commit `19e72c5a` removed redundant **local** error toasts in **tubes, equipment, supplies** — the
global handler is now the sole error toaster there. It kept: partial-success `warning`s, pre-flight
validation guards, non-mutation query/blob errors (barcode resolve, reorder export, bulk-print
fetch), and resolved partial-failure branches. Where a `catch` only toasted, it became a commented
empty catch; where it also logged/cleaned up, only the toast line was removed.

## The open problems this session must resolve

1. **Enriched per-error-code handlers vs "global is sole toaster".**
   `client/src/domains/tubes/hooks/useTubeMutations.ts` wires enriched `onError` handlers
   (`handlePositionOccupiedError`, `handleTubeConflictError`) that resolve the occupied position to a
   location string / give conflict guidance — genuinely **better** than the global generic message,
   but they **double-toast** because nothing suppresses the global one. This is the case that proves
   "global is the only toaster" is too blunt. Decide the mechanism: a `meta: { suppressErrorToast }`
   flag, an error-code → message registry consulted **inside** the global handler, or moving the
   enrichment into the global handler. (T1 left these two handlers in place on purpose.)

2. **`.mutate(…, { onError })` vs `mutateAsync` + `try/catch`.** The codebase uses **both** for the
   same job (e.g. `EquipmentBulkUpdateModal` uses `.mutate` callbacks; most forms use
   `mutateAsync`+try/catch). Pick one house style. This choice also decides #3.

3. **The empty-catch smell.** T1 left ~20 `catch { /* global handler shows the toast */ }` blocks.
   They exist **only** because `mutateAsync` + `await` forces a catch to avoid an unhandled
   rejection. Switching those sites to `mutation.mutate(vars, { onSuccess })` removes the catch —
   and its comment — entirely. If #2 lands on the callback style, this smell disappears for free.

4. **Operation context on infrastructure errors (deferred "Option C").** On `5xx/network` the toast
   is generic ("Server error…") with no operation name. If that context is wanted, the clean way is
   `meta: { errorMessage: '…' }` read by the global handler for the non-4xx branches only (4xx keeps
   the server message). Weigh it: ~20 annotations of maintenance surface for messages users rarely
   see and can't act on. T1's author judged it optional polish, not a correction.

5. **Query-failure policy.** `QueryCache.onError` only toasts network errors; other failed queries
   are silent or locally handled. Confirm that's intended and consistent (list the queries that
   currently self-handle: barcode resolve, reorder-list export, bulk-print fetch).

6. **Unfinished scope.** T1 only swept **tubes/equipment/supplies**. The same double-toast pattern
   was **not** audited in **storage, admin, users, authentication** — do a client-wide sweep as part
   of the migration.

## Investigation steps

1. Inventory every mutation/query error site client-wide. Useful greps:
   - `notifications.error` / `notifications.warning` inside `catch` blocks and `onError` callbacks.
   - `.mutate(` with an `onError` option vs `await …mutateAsync(` inside `try`.
   - empty/commented catches (`catch {` followed by only a comment).
   Classify each: global-only · double-toast · enriched · resolved-partial-failure · query/blob ·
   pre-flight guard.
2. Audit server `ValidationError` messages (`server/src/**`) for user-appropriateness — the model
   depends on them being the primary source of specific error text.
3. Resolve decisions #1–#5 above. Prefer the TanStack-idiomatic shape: **one owner** for error
   toasts (the global handler), `meta` for per-mutation customization/suppression, and a single
   mutation-call style.
4. Write the standard into `AGENTS.md` (a short "Error handling" section under the client rules),
   then migrate all sites — including the two enriched tube handlers and the four un-swept domains.

## Deliverables

- A written standard in `AGENTS.md`.
- All client mutation/query error sites migrated to it (no double toasts, no rogue empty catches,
  one mutation-call style, enriched errors handled without duplication).
- `npm run typecheck` and `npm run lint` clean.

## Key files

| Concern | File |
|---|---|
| Global handlers + `meta.invalidates` | `client/src/app/cache/queryClient.ts` |
| Enriched per-code handlers (the hard case) | `client/src/domains/tubes/hooks/useTubeMutations.ts` |
| Server message → `ApiError.message` | `client/src/infrastructure/api/HttpTransport.ts` |
| Toast API | `client/src/shared/utils/notifications.ts` |
| The intended convention, in a comment | `client/src/domains/tubes/ui/components/editor/TubeEditorModal.tsx` (`handleFormSubmit`) |
| Where the standard gets documented | `AGENTS.md` |
