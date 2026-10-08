# Client Audit — Backlog

Everything from the client audit that was **deferred**, **skipped**, or **needs a decision** — with
enough detail to act without re-deriving it. (The source `CLIENT_FINDINGS.md` report was removed once
its findings were resolved; the items below stand on their own.)

**Status:** §1 (S1 bugs), §2 (S2 by area), §3 (themes), §4 (dead code), §6 (comments/naming) are
**done**. §5 (consolidations) is done except the items below. Branch: `audit/fixes`. Line numbers
may have drifted — locate by content. Gate every change with `npm run typecheck:client` + `npx eslint`
on the touched files; commit per-domain as `refactor(scope): … (C-NN)`, staging only your own files.

---

## 0. Open from the reagents build (added 2026-07-29)

Small decisions left after the reagents suite and the catalog rail. Not audit findings — deferred calls
that need eyes on the running app rather than a code read.

- **Catalog add-entry `✕`** — with the reveal field at full row width, the cancel `✕` next to `Add` may
  be redundant with Escape. Decide by looking at it.
- **Catalog usage column shows `—`, not `0`** — pre-existing and deliberate (`usageCount > 0 ? n : '—'`);
  the dash is what gates the delete button. It reads as "unknown" rather than "unused". Change to `0`,
  `Unused`, or leave.
- **`HelpModal` search header** — its `rightMeta` nub moved ~80px right when `SectionHeader`'s
  consumer-specific `right-20` offset was removed. Expected to read better; unverified.
- ~~**Reagent lot UI never rendered with data**~~ — **closed.** Phase 9 drove real lots through the app:
  bulk receive minted them, bulk void reversed a multi-lot FEFO draw whole, and lot labels printed from
  the sheet flow. Two defects only visible with data came out of it — label text truncating worse on
  larger sheet templates, and the lot panel listing depleted lots inline — both fixed. Still unexercised:
  the expiry alert panel against lots that actually cross the 90-day window.
- **Persisted cache has no schema-version gate** — `queryClient` persists most query keys to
  `localStorage` for a day, and `validateCacheVersion` only busts it on a _storage config_ version
  mismatch (a DB reset). Nothing busts it when a client data _shape_ changes, so a user whose tab
  cached the old shape rehydrates it and the new reader crashes before any refetch corrects it —
  exactly what convergence item 12 did to attribute definitions. Mitigated there by excluding
  `attributes`/`customUnits` from persistence, but tubes, storage, reagents and supplies are all
  persisted and all one shape change away from the same thing. A cache-schema constant bumped
  alongside breaking shape changes would close it.
- ~~**Attribute scoping is one type or all types**~~ — **closed** by convergence item 12: migration 033
  replaced `applies_to_type` with an `applies_to_types TEXT[]`, so an attribute can name several reagent
  types. It needed no join table — nothing queried the column, since every scoping decision is made
  client-side.
- **Attribute options don't share the tube `species` lookup** — an antibody's Host Species attribute
  re-types mouse/rabbit/human, which the tube `species` lookup already holds. Sourcing an attribute's
  options from a lookup category is real new plumbing; decide whether the overlap actually bites.
- **`resolveExpiryBadge` boundary** — covered by 11 unit tests, including the 90-vs-91-day edge. Its
  helper builds dates from **local** parts; `toISOString()` shifts the calendar day on a UTC-behind
  machine, which is the drift `dateExpiry` exists to avoid. Don't "simplify" it back.

---

## A. Quick wins (small, bounded — good "clear a bunch of little things" batch)

- **C-4(c)** — two trivial dedups in admin:
  - `visibleColumns(cols, readOnly)` helper for `readOnly ? cols.filter(c => c.id !== 'actions') : cols`
    (UsersTab, ResearchersTab — ×4 sites).
  - Local `resetForm()` in `InviteCodesTab.tsx` for the 4-line reset block (×2: create-onSuccess + Cancel).
  - ⚠ **Do NOT** extract the "demo banner ×2" — AdminSettingsModal vs MonitoringTab share only
    `AlertBanner` + `variant="demo"` with **different text**. Over-reach.

- **C-26** — `bulkSearchInputStyle.ts` (`SEARCH_INPUT_CLASS`; moved to
  `shared/ui/components/inventory/` in Phase 9b, now used by two shared bulk tabs) is an
  acknowledged copy of `SearchInput`'s styling. Extract the shared token soup
  (`bg-[hsl(var(--input-well))] border-line-faint hover:border-foreground/30 focus:*`) into one constant
  that `SearchInput`, `SEARCH_INPUT_CLASS`, and `Autocomplete`'s default all compose from.
  ⚠ **Do NOT** build a full Autocomplete "console variant" — rabbit hole (SearchInput has icon/trailing
  slots + a size system Autocomplete lacks).

- **C-13** — `SearchResultsPanel.tsx` (`formatPositions`, ~:346-447) re-implements
  `formatPositionRangesForBox` (`storage/utils/positionDisplayUtils.ts`, ~:134-201). Extract the shared
  **consecutive-run range-builder** → `string[]`; `formatPositionRangesForBox` joins it, SearchResults
  keeps its own shell (≤3 positions listed individually, `"Pos: "` prefix, `>4 → (+N more)` truncation,
  no-gridConfig numeric fallback). Behavior-neutral **only** if factored this way — a straight swap
  changes search display. SMALL-MEDIUM.

- **C-16 (remaining)** — do the crisp bits, skip the sprawl:
  - New `<AccentTick>` primitive for the standalone stripe `h-2.5 w-0.5 bg-primary/80
dark:shadow-[0_0_6px_hsl(var(--primary)/0.55)]` hand-rolled ~10×
    (AdminSettingsModal has a local `accentBar` const reused ×3; also PasswordResetModal,
    UserSettingsModal, DonorRegistryModal, TubeLocationDisplay, HelpModal, SupplyReorderList).
  - `StripLabel` `tone` prop for the 2 recolored copies (`InfoPanelEmpty` muted stripe, `TubeInfoPanel`
    warning stripe).
  - `ValidatedInput` compact branch → reuse `FIELD_LABEL_COMPACT` for the non-error case (fiddly: the
    error case is `base + text-danger-text`, so extract the base first).
  - ⚠ Do **not** try to unify all ~24 micro-label typography sites — that's the sprawl the finding warns about.

- **C-19 Part B** — reuse the existing `handleSelectNode(node)` in `StorageNavigator.tsx` at the 3 inline
  `onSelect` call sites (tank/rack/box, ~:307/:339/:383). Marginal (~3 lines), node-non-null caveat. Low value.

- **C-27 (remaining)** — `STATE_STRIPE` (`Table.tsx`, ~:182-189): the 4 non-muted keys could fold to one
  `--row-tone` literal + 4 setters (same technique already applied to `ROW_GLOW`), but `muted` adds
  `/var(--alpha-stripe-muted)` and can't fold. ROI low (each value is a single utility). Optional.

---

## B. Larger refactors (real work — take individually, verify in-app)

- ~~**C-8(b)**~~ — **closed** by reagents Phase 9b. `BulkStockMovementTab` lives in
  `shared/ui/components/inventory/`, collapsing supplies' receive (253→129) and issue (189→80) and
  giving reagents both for 163+80 rather than ~450 cloned. Landed with four callers rather than the
  two this entry assumed, so the parameterisation was proven rather than guessed — and the extra
  fields ride an injected render slot, as predicted, with no direction sign.

- **C-22(a)** — ~90-line profile block shared between `AuthRegistrationModal` and `AuthSysAdminSetupPage`
  (`domains/authentication/ui/components/gateway/`). Extract `<AuthProfileFields>` (5 inputs + username
  preview, ~15 props). Password section / email handling / flow orchestration genuinely differ — keep
  per-site. MEDIUM. Only worth doing alongside other auth work.

---

## C. Open decisions (need a product/design call before a fix)

- **C-24(a) — bulk-path invalidation guard.** The 4 single-tube mutation guards were deduped into
  `invalidateTubeLocation()` (done). The **bulk** paths use a different style: `useBulkUpdateTubesMutation`
  / `useBulkDeleteTubesMutation` use `if (variables.location)`; `useMoveTubesMutation` /
  `usePasteTubesMutation` build a box-key `Set` with no per-field guard. Folding these into the helper
  would **add** the per-field guard = behavior change. **Decide:** standardize onto the helper, or leave.

- **C-24(b) — lock-variant disagreement (latent inconsistency).** `TubeGrid`'s tooltip variant does not
  require an owner name; `TubeGridCell`'s indicator variant requires `lockOwnerName` for
  shared/admin-override/other. So a locked tube whose owner name doesn't resolve shows a tooltip variant
  but **no** cell indicator. **Decide** which is correct, then align. (Do **not** mechanically merge the
  two variant selectors — they genuinely differ.)

- **C-12 — malformed packaging-chain fallback.** The inline threshold walks were unified onto
  `computePackagingMultiplier` (done). That helper still has an internal inconsistency: unit-not-found →
  returns `1` (discards partial product); an over-long cycle → returns the partial product. **Decide:**
  make both malformed exits agree (recommend both return `1`). Low priority (corrupt data only).

- **Supplies threshold UX limitation.** You cannot set a reorder threshold in a unit _smaller_ than the
  stock unit — the dropdown only offers the stock unit + larger packaging levels. Surfaced during D-16
  verification. Not a bug; a product-design question about whether sub-stock thresholds should be possible.

---

## D. Verified WON'T-DO (over-reaches — documented so they aren't re-attempted)

- **C-10** — rack composite key has **3 distinct keyspaces** (navigator `${tankId}-${rackId}`, modal
  `${tankId}-rack-${rackId}`, kbd-nav `rack:${tankId}:${rackId}`) with a deliberate B→A conversion loop.
  A single `rackKey()` is **not** behavior-neutral. Per-keyspace helpers only (low value).
- **C-15 (dedupe)** — BulkPrintTab vs users DisplayTab selection-card constants: only `SELECTED` is
  identical; `BASE` (py-2/py-3, text-left) and `UNSELECTED` (hover bg) differ by design. Merging changes
  visuals. (The false "shared" comment was already removed.)
- **C-17** — the 3 alert-panel sort comparators sort different columns over different row types; the shared
  part is ~5 lines. Expand/collapse shell is a ×2 over-abstraction. Leave.
- **C-23(b)** — `app/services/SessionService.ts`'s local `ApiEnvelope<T>` is deliberate refresh-path
  decoupling; no shared type exists to swap to. Leave.
- **D-13 (AuditLogViewer `?? 50/0`)** — type-required: `auditLogFiltersSchema` marks `limit`/`offset`
  `.optional()`, so the guards are load-bearing. Removing needs a shared-schema contract change. Leave.
- **D-13 (`void`-on-sync)** — the `void` operator on handler calls is frequently the intentional
  no-floating-promises marker; not a bug. Leave.
- **N-6** — AGENTS.md's client tree lists `domains/grid/`, which doesn't exist. Doc drift, left for the
  AGENTS.md owners.
