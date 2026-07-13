# Client Code Review — Consolidated Findings

**Date:** 2026-07-13 · **Branch:** `audit/fixes` (clean) · **Read-only pass — no code changed.**

Second full-client review (~490 files, ~68k lines) after the earlier file-by-file Opus pass.
Fourteen parallel reviewers each read their slice in full and verified every cross-file claim by
repo-wide grep (dead-code claims checked against all import forms + JSX render sites; bug claims
traced end-to-end, several into server code). All fourteen scopes are complete.

**Gate status:** `npm run typecheck` ✓, `npm run lint` ✓ (zero warnings).
Convention battery 10/15 clean: no `export default`, no inline `z.object()` in services, no
cross-boundary imports, no unjustified `any`/`@ts-ignore`, no console leftovers, no banned comment
language, no orphaned files. The shared/ui dead-*component* sweep was negative — every component
has real production consumers.

**Overall:** structurally the client is in strong shape. What remains clusters in hot spots — the
tube grid clipboard, supplies bulk/transaction flows, the admin settings modal, search display
code, and the socket/session infrastructure — plus ~10 codebase-wide policy calls.

Severity: **S1** wrong data / data loss / unintended access · **S2** broken flow or wrong display
· **S3** latent/minor. Confidence is the reviewer's own (high unless noted). *Decision* = needs a
product/convention call before fixing.

---

## 1. S1 — wrong data, data loss, unintended access

| ID | Location | Finding |
|----|----------|---------|
| S1-1 | `tubes/ui/components/grid/useGridClipboard.ts:304-361` | Cut-paste whose target range overlaps the source doesn't exclude the cut tubes from the conflict check — the "overwrite?" prompt then **deletes the tubes being moved** and the move of the now-deleted IDs fails. Data loss. |
| S1-2 | `useGridClipboard.ts:170-181,363-380` | Cut + fill-mode paste never populates `pastedSourceTubeIds` → `onMoveTubes([])` no-ops, yet it toasts "Moved X tubes" and **clears the clipboard**; `skippedCount` also goes negative in fill mode. |
| S1-3 | `tubes/ui/components/locking/TubeShareAccessModal.tsx:36` | `selectedUserIds` never resets on reopen (modal is persistently mounted via `BiobankModals`) — stale checkboxes silently **re-share access** to users from a previous open. Sibling `TubeLockModal` resets correctly. |
| S1-4 | `supplies/ui/components/bulk-update-tabs/BulkItemRow.tsx:51-52` + Receive/Issue tabs | Rows keyed by `${itemId}-${index}` with quantity mirrored in parent state: removing a row remounts rows below with reset inputs while the parent keeps old values → **"Receive/Issue All" submits quantities the user no longer sees**. |
| S1-5 | `BulkItemRow.tsx:52` vs tab init | Non-packaging rows display qty `1` but the parent submits `0` unless edited — accepted defaults are silently dropped from the submit and count. |
| S1-6 | `supplies/ui/components/SupplyTransactionForm.tsx:167-176` | No resolver + `.min(0)` schema → empty form **records a quantity-0 ledger entry** (received/issued/disposed). The `errors.quantity`/Controller error plumbing is dead; hidden `itemId` field unused. |
| S1-7 | `users/.../tabs/AccountTab.tsx:99-101` | Clearing Department/Position silently no-ops end-to-end (`undefined` dropped by `JSON.stringify`, server `?? person.department` treats absent as unchanged) — **success toast, old value returns**. *Decision:* clear semantics (send `''` vs nullable). |
| S1-8 | `storage-manager/useStorageHandlers.tsx:100` + server `resourceAssignment.ts:84` | Box assignment tri-state (`null`=common / `undefined`=inherit) is **unwritable end-to-end**: client flattens both to `null`, server flattens `null` to `undefined`. "Unassigned/Common" silently produces "inherit"; permissions differ (`AccessControlService.ts:321/377`). All null-handling client+server (plus tests) services an unreachable state. *Decision:* cross-stack — preserve `null` through both layers or delete the tri-state; check for legacy `null` rows. |

## 2. S2 bugs by area

### app/
- **APP-1** `app/bootstrap/AppBootstrapService.ts:120-124` — duplicate-bootstrap guard checks `isInitialized` (set at the *end*), so StrictMode's double effect runs two interleaved bootstraps in dev. Fix: in-flight promise guard.
- **APP-2** `app/components/layout/RealtimeSyncIndicator.tsx:23-31` — "Syncing…" clears when *any* mutation settles even if others are pending. Use `queryClient.isMutating()`.
- **APP-3** `app/services/SessionService.ts:194-229` — refresh retry loop retries 4xx (invalid refresh token) 3× with backoff before logout; should fail fast on 4xx like `mutationRetryLogic` does. (Independently found by infra reviewer.)
- **APP-4** `app/cache/queryClient.ts:287` — `EXCLUDED_QUERY_PREFIXES` misses `'labs'` and `'storageAnalytics'`, so system-admin data persists to localStorage despite the header's claim; also `startsWith` where exact-match is meant. *Decision.*
- **APP-5** `SessionService.ts:566-573` — debug readout treats computed 0 minutes as "Not scheduled" (falsy zero). Trivial.

### admin + users
- **ADM-1** `AdminSettingsModal.tsx:101,187,240` + `SystemTab.tsx:210-215` — security-config save path unreachable for every audience; "Detailed System Logging" toggle mutates state nothing can persist; lab admins can hit an unresolvable unsaved-changes prompt. *Decision:* intended writer.
- **ADM-2** `system-dashboard/LabDashboard.tsx:63-73` — `lastActivity` sorted as string → alphabetical by weekday, not chronological.
- **ADM-3** `tabs/UsersTab.tsx:542` — unlink confirm spinner never shows (`updating` only set by role updates). Use `unlinkResearcherMutation.isPending`.
- **ADM-4** `system-dashboard/LabsPanel.tsx:176` — one lab's power toggle disables **all** cards (global `isPending`). Scope via `mutation.variables === lab.id`.
- **ADM-5** `tabs/CatalogTab.tsx:493-507` — rename invalidates only lookups+tubes; `specimen_type`/`equipment_maintenance_type` renames leave donor/equipment timelines stale (medium).
- **ADM-6** `CatalogTab.tsx:110-120,478-491` — parent `handleAdd` swallows errors → child clears the typed value on failure.
- **ADM-7** `AuditLogFilterPanel.tsx:544-552` — custom "To" date doesn't clear `datePreset` (the "From" one does).
- **ADM-8** `LabsPanel.tsx:122-125,220-224` — un-caught `navigator.clipboard.writeText`; generate flow skips its success notification on clipboard rejection (medium). PasswordResetModal/InviteCodesTab show the correct try/catch pattern.
- **ADM-9** `AdminSettingsModal.tsx:141-147` — metrics-load failure fabricates `SystemMetrics` (`totalUsers: 1`, `lastBackup: new Date()`) → fake "Last Backup: today" (med-high).
- **ADM-10** `LabsPanel.tsx:86-99,304`, `LabDashboard.tsx:111-123,175` — Enter-key submits bypass the `isPending` button guard → double-submit (low-med).
- **ADM-11** `AuditLogFilterPanel.tsx:64` — offers filter `lab_name_changed`; server emits `lab_renamed` → filter matches nothing.
- **ADM-12** `admin/utils/auditLogFormatters.ts:822-836` — handles 2 supply actions; server emits ~16 more (`AuditEventHandler.ts:1572-1875`) that all render `'-'`, while equipment has full coverage. Zero supply cases in the test file.
- **ADM-13** `SessionListPanel.tsx:108-124,213-216` — bulk revoke can include the current session (select-all has no exclusion) → guaranteed "Failed to revoke 1 session".
- **ADM-14** `SessionListPanel.tsx:80-81` — `others` capped at 4 makes the no-current-session `slice(0, 5)` branch contradictory/unreachable (medium).
- **ADM-15** `PasswordResetModal.tsx:87,226` — hardcoded min length 4 may bypass the configurable `passwordMinLength` policy. *Needs verification* (server-side enforcement on reset endpoint).
- **ADM-16** `AdminSettingsModal.tsx:97-100` — `demoSeeded` `??`-chaining is correct only under an unstated invariant (false tank ⇒ no seeded children). *Needs verification*; `||` descent is the robust form. (Same invariant hand-rolled at `StorageManagerModal.tsx:90-92` with `??` where `||` is meant — fix both.)
- **ADM-17** `AuditRetentionSettings.tsx:129-137,204-212` — Refresh flips the whole panel to the loading placeholder (collapses the expanded view; button spinner never renders) (medium).

### authentication
- **AUTH-1** `authStore.ts:268-279` — a legitimate `status: 'pending'` registration (201, awaiting approval) is thrown as "Registration failed" → user retries into duplicate-email. Latent today (invite codes force auto-approve) but the mishandling is real.
- **AUTH-2** `AuthLoginModal.tsx:100-107` — stale closure: throws render-time `authError` instead of the store error `forceChangePassword` just set → generic message instead of the server's specific one.

### search / help / donors
- **SRCH-1** `SearchResultsPanel.tsx:203-214` — local `formatDate` parses date-only strings with `new Date()` + local getters → **previous day in US timezones** (dropdown + CSV); also a third date format vs the app-wide `formatDateForDisplay`. Dead `try/catch` (renders "NaN/NaN/NaN" instead). (Found independently by two reviewers.)
- **SRCH-2** `SearchResultsPanel.tsx:174-185` — rows render `Box box_V1StG…` (raw nanoid) and ignore rack `customLabel`, while the CSV path in the same file resolves both correctly. Reuse `getLocationNames`.
- **SRCH-3** `useSearch.ts:47` + `SearchResultsPanel.tsx:458-465` — "Updating" overlay unreachable with `placeholderData` (status stays `success`) → repeat searches silently show stale results. Wire `isFetching`/`isPlaceholderData`.
- **SRCH-4** `searchStore.ts:73` + `SearchPanel.tsx:145,166` — deselecting the last filter leaves `{key: undefined}`; `Object.keys().length` guards misfire (dropdown auto-reopens; Enter refetches with no criteria). Delete emptied keys.
- **SRCH-5** `SearchPanel.tsx:130` vs `ShortcutsTab.tsx:10-11,42` — help documents ⌘+F on Mac; handler checks only `ctrlKey`.
- **SRCH-6** `search/utils/groupTubesByRelevance.ts:54` — fallback matches query against `researcherId` (nanoid) → `'researcher'` group unreachable (medium).
- **HELP-1** `tabs/DonorsTab.tsx:117-119` — claims donor deletion clears donor fields on tubes; server does nothing of the sort (verified repo + migrations). *Decision:* fix copy or implement clearing.
- **HELP-2** `AdministrationTab.tsx:101-107` + `helpContent.ts:330` — catalog help omits equipment maintenance types (medium).
- **DON-1** `DonorRegistryModal.tsx:57-69` — deep-link effect depends on `donors` (new identity per refetch) → selection yanked back to the deep-linked donor after any mutation/refetch. Consume once via ref.
- **DON-2** `DonorRegistryModal.tsx:40` (+ `AppHeader.tsx:459`) — modal mounted unconditionally → full donors+tube-counts fetched at startup for every user; "lazy" chunk downloads immediately. *Decision:* gate on `isOpen` vs intended prefetch.
- **DON-3** `CollectionHistoryTimeline.tsx:145` — cancelling an add keeps the typed draft. Trivial.

### storage
- **STO-1** `hooks/useStorageSync.ts:40-74` — fresh-install failure → **unbounded retry loop** (`hasInitialized` reset + effect dep on new mutation identity), no backoff/cap.
- **STO-2** `StorageManagerModal.tsx:26` — `storage-navigator.css` imported only by the lazy modal chunk, but the eagerly-rendered dashboard `StorageNavigator` depends on its classes; styling works by accident of AppHeader mounting the modal.
- **STO-3** `StorageManagerModal.tsx:120-129` — "default racks collapsed" reads `currentLab` in a `useState` initializer at (eager) mount, usually before the query resolves → racks open expanded, contradicting the comment.
- **STO-4** `edit-modals/*.tsx` — `await onSave(); onClose()` but `onSave` wraps `mutate()` (void) → modals close before the request settles, including on failure; the `onSuccess` closes in `useEditModals` are dead in practice. *Decision:* `mutateAsync` (stays open on error) or drop the pretense.
- **STO-5** `hooks/useStorageMutations.ts:381-388` — conditional `onError` drops offline/conflict handling for no reason; use the standard handler unconditionally.
- **STO-6** By-Location/By-User trees: `role="tree"` containers with non-treeitem rows; `ByUserTab.tsx:225-229` renders a focusable button with no onClick; `:274` `role="listitem"` inside a "tree". Navigator does it properly.
- **STO-7** `StorageBoxMinimap.tsx:86`, `BoxRow.tsx:167` — occupancy fill width unclamped (navigator node clamps) (medium).

### equipment / supplies
- **SUP-1** `hooks/useSupplyMutations.ts:309-339` — record-transaction/stock-count mutations don't invalidate `supplies.transactions(...)` (void mutation does) → **Void tab history stale up to 30 min**; new transactions can't be voided.
- **SUP-2** `SupplyItemForm.tsx:538-539,229` — "base item" parent choice stores `null`, which both display and submit treat as "unset" → falls back to top-of-chain; base becomes silently unselectable once a chain exists.
- **SUP-3** `SupplyItemForm.tsx:105-129` — threshold-conversion effect keyed on refetch-unstable `detail?.packagingLevels` resets the input to the stored value while form state keeps the user's number (med-high).
- **SUP-4** `SupplyTransactionTimeline.tsx:133-139,200` — `hasDetails` omits `expirationDate` → expiration-only rows get no chevron; `cost` truthiness vs `!== undefined` inconsistent.
- **SUP-5** `SupplyReorderList.tsx:156` + `SuppliesTab.tsx:319` — Export CSV visible to non-admins but endpoint is `requireAdmin` → guaranteed failure toast.
- **SUP-6** `BulkPrintTab.tsx:214-244` — preview success path never clears `isLoading` (only `closePreview` does) (medium).
- **SUP-7** `SupplyItemRow.tsx:39-41` — comment says warning shows "at or below reorder"; code marks warning up to `threshold * 2`. One of them is wrong — *product intent*.
- **SUP-8** Receive/Issue tabs — `setLastLocationId` called inside `setRows` updater (StrictMode purity violation, idempotent today). Trivial.
- **EQP-1** `EquipmentTab.tsx:261-272` + `SuppliesTab.tsx:277-287` — icon-only sort-direction buttons have no accessible name (Radix Tooltip doesn't provide one).
- **EQP-2** Twin bulk modals diverge on error: supplies closes the confirm on failure, equipment leaves it open. Pick one (low).

### shared/ui/components
- **SHC-1** `overlays/ConfirmDialog.tsx:87-97` — focus-restore effect reads a modal-store slice that's only correct for 2 of ~20 call sites, and `useFocusTrap` already restores focus for all of them; store slices retain stale `previousFocusElement` after close. Delete the effect (+ then-dead store fields `unsavedConfirm`/`lockTubesModal`/`shareAccessModal.previousFocusElement`).
- **SHC-2** `inventory/CategoryTreePanel.tsx:174-177` — `dateAdded` comparator returns newest-first on "Ascending" (name/manufacturer are correct) — label lies. *Product call* on intended direction.
- **SHC-3** `overlays/BaseModal.tsx:146,238,250` — hardcoded `id="modal-title"` duplicates when modals nest (real flows nest) → inner dialog announced with outer title; invalid duplicate-id HTML. Use `useId()`.
- **SHC-4** `inventory/CategoryModal.tsx:91` (pattern at 8+ sites) — `className="max-w-md"` fights BaseModal's `size` default; winner decided by stylesheet order. Root fix: express width via `size`. *Needs verification* (which class currently wins).

### shared/ui/primitives
- **PRM-1** `button/Button.tsx:234-238` — icon-only buttons never show the loading spinner (`iconOnly` branch returns before any `isLoading` check). Production-visible: `CatalogTab`, `ResearchersTab`, `LabDashboard`, `SupplyItemInfoPanel` all pass `iconOnly` + `isLoading` — deletes give only cursor-wait feedback.
- **PRM-2** `date-picker/DatePicker.tsx:518-568` — DayPicker portal always mounted, hidden with `opacity-0 pointer-events-none` → ~40 invisible buttons stay keyboard-tabbable and AT-exposed per DatePicker on screen.
- **PRM-3** `select/Select.tsx:530-543,302-321,398-416,593` — same hidden-portal pattern; `highlightedIndex` only reset in `handleToggle`, so select/Escape/click-outside leaves a hidden `tabIndex={0}` option after every normal selection.
- **PRM-4** `date-picker/DatePicker.tsx:186-204` — year segment commits unclamped/unpadded: typing `1` + Enter emits `"1-05-12"` to `onChange` — malformed YYYY-MM-DD upstream (low frequency, real).
- **PRM-5** `date-picker/DatePicker.tsx:452-468,501-511,525` — calendar unreachable by keyboard (`tabIndex={-1}` button, no key mapping) while the trigger announces `aria-haspopup="dialog"`; `aria-controls` target has `role="presentation"`.
- **PRM-6** `button/Button.tsx:253-254` — `tail` and `rightIcon` mutually suppress (pass both → neither renders), contradicting the documented contract in `button/types.ts:30`. Latent — no caller passes both.
- **PRM-7** `date-picker/DatePicker.tsx:236-262` — `processDigit` schedules `setTimeout` side effects inside the `setSegments` updater → StrictMode double-invoke commits twice (double `onChange`) (medium).
- **PRM-8** `Select.tsx:383-395`, `Autocomplete.tsx:63-73`, `OverflowMenu.tsx:78-90` — popup positioned in `useEffect` (post-paint) → one-frame flash at stale coordinates on open; use `useLayoutEffect` (medium).
- **PRM-9** `autocomplete/Autocomplete.tsx:154-158` — 150 ms blur-close timer never cancelled: refocus within the window still closes; fires after unmount (medium).

### infrastructure
- **INF-1** `socket/SocketQueryBridge.ts:430` — `fetchQuery({queryKey})` with no `queryFn` and no default → rejects unless a mounted observer exists; version tracking / db-reset detection silently degrade depending on the open screen.
- **INF-2** `api/HttpClient.ts:144` — 401 retry replays the **same** token (`getValidAccessToken` only refreshes near local expiry) → retry guaranteed to 401 on revocation/rotation/skew. Force refresh on 401.
- **INF-3** `api/SessionHttpClient.ts:69` — `AbortSignal.timeout()` throws `TimeoutError`, not `AbortError` → 408 mapping never fires; `HttpTransport` maps timeouts to nothing at all.
- **INF-4** `api/SessionHttpClient.ts:56` — reads `responseData.message`; server error envelope field is `error` → session-layer error text never captured.
- **INF-5** `socket/SocketService.ts:39-64` — failed `initialize()` leaves an auto-reconnecting socket + initialized bridge; bootstrap `retry()` never calls `cleanupSocket()` → second socket with realtime sync bound to the zombie one.
- **INF-6** `socket/SocketService.ts:51` — static `auth` token reused on every reconnect → stale after ~15 min. *Needs verification* (server behavior on reconnect).
- **INF-7** `socket/SocketQueryBridge.ts:502-510` — tank/rack/box toasts say "**Equipment** configuration modified…" — copy predates the equipment domain. Reword to "Storage…".

### tubes (further)
- **TUB-1** `grid/useGridClipboard.ts:238-240` — drag-paste fallbacks: source `?? 9` but target `?? 5` cols/rows vs the 9×9 `DEFAULT_GRID_CONFIG` → phantom 5×5 bounds drop tubes if `getBox` misses.
- **TUB-2** `editor/TubeEditorModal.tsx:639-666` — intentional skip-occupied (overwrite unchecked) reports "Processed X of Y. N failed." with 0 errors — misleading failure toast for a successful op.
- **TUB-3** `editor/TubeBulkEditorModal.tsx:253-260,432-440` + `TubeBulkProgressModal` — progress plumbing cross-wired: shown only where never updated (update), updated only where never shown (delete); the determinate UI is unreachable.
- **TUB-4** `grid/useGridKeyboardNavigation.ts:143-194` — case-exact key matching breaks Ctrl+A/C/X/V under CapsLock and Shift+L/S (medium).
- **TUB-5** `editor/useTubeModalFocusReturn.ts:18-31` — cleanup fires on dep *change*, stealing focus behind an open modal (low).
- **TUB-6** `locking/TubeShareAccessModal.tsx:84-88` — partial-success share skips `onSuccess` (medium).
- **TUB-7** `editor/TubeConcentrationField.tsx:53-55` — initial-value refs never resync after form `reset()` → dirty/green state compares against pre-refresh values. *Needs verification* (visual only).
- **TUB-8** `hooks/useTubeMutations.ts:157-161,190-192` — create-tube optimistic snapshot/rollback provably dead (exact-key `getQueryData` on a key no query registers). Delete or implement per-location insert.
- **TUB-9** `hooks/useTubeMutations.ts:634-658` — optimistic move identifies boxes via `oldData[0]`, so empty destination caches are skipped → tube visibly vanishes until refetch; `getQueriesData` re-run per move though loop-invariant.
- **TUB-10** `hooks/useTubeForm.ts:79-108` — position-conflict pre-check fetches the whole target box per submit and only `logger.warn`s the result. *Decision:* surface via `form.setError` or delete the fetch.
- **TUB-11** `hooks/useTubeAccessControl.ts:14-17,35-48` — `canLockTube`'s `container` param never supplied → assigned-space branch dead; client may allow locks the server rejects. *Needs verification* (server `AccessControlService`), then wire or delete.

---

## 3. Cross-cutting themes (policy decisions)

- **T1 — Double error toasts.** Global `MutationCache.onError` toasts every failed mutation; ~15 local `catch` blocks toast again (tubes lock/share/bulk/editor modals; equipment tab/panel/forms; supplies bulk/void). Pick: drop local toasts (convention shown by `EditModeForm`) or add a mutation-meta suppression flag.
- **T2 — Missing `enabled: !!labId` guards** (AGENTS.md contract) at 6 lab-scoped hooks: `useTubesByLocation`, `useTube`, `useBulkTubes` (`useTubeQueries.ts:31,91,125`), `useActiveResearchersQuery:19-26`, `useLookupValuesQuery:20-25`, `useSearchQuery:21-29`. Mechanical fix.
- **T3 — `meta.invalidates` convention** (documented in queryClient, used by donors/tubes-locks/users/admin at 22 sites) is unused by equipment/supplies: ~14 static-key hooks hand-roll `useQueryClient` + `onSuccess` (~100 removable lines).
- **T4 — Date formatting** must go through `@shared/utils/dateFormatters`: SRCH-1, plus `AuditRetentionSettings.tsx:106-117` (third format). App-wide display format is `D Mon YYYY`.
- **T5 — Lint hygiene.** Add `--report-unused-disable-directives` to the lint script; it currently hides 5 dead disables (`AuthPasswordCreateForm.tsx:109`, `BulkVoidTab.tsx:160`, `TubeEditorModal.tsx:168`, `ClientLogger.ts:8`, `Button.tsx:201`). 3 bare disables need `-- reason` (`TubeBulkEditorModal.tsx:290`, `useMergedRef.ts:19`, `useTextTruncation.ts:66`).
- **T6 — zod type-only import** `useTubeForm.ts:30` (`import type { ZodType }`) — only zod import outside HttpClient. Exempt type-only imports in the rule, or re-export the type from shared-schemas.
- **T7 — Query-key segments minted outside the registry**: `useTubeMutations.ts:620,635` hand-builds `[...tubes.all(labId), 'location']` (+ `slice(3)` hard-codes key shape) — add a central prefix key like supplies has; `useDonorSearchQuery.ts:19` appends `limit` ad hoc (moot — the whole `limit` chain is dead, see D-23).
- **T8 — Whole-store Zustand subscriptions** (~18 `useAuthStore()` sites; `BiobankDashboard` subscribing to all of `useModalStore`/`useTubeStore`; `AppHeader` to all of donor registry store) — any modal open/close re-renders the dashboard tree. Selector-based subscriptions; perf polish, optional.
- **T9 — localStorage persistence gap** — APP-4 above (system-admin `labs`/`storageAnalytics` cached to disk). Product call.
- **T10 — Service class style** — `users/` mixes static classes and instance singletons (repo ~11 static vs ~13 singleton; exemplar `DonorService` is static). Standardize at least within `users/`.
- **T11 — Within-domain import style** — storage is three-way inconsistent (own-barrel self-imports = latent cycle trap, deep alias, relative); admin/users have 4 aliased outliers vs the relative majority. Pick: relative (or deep alias) inside a domain, never the domain's own barrel; tubes deep-import convention (with cycle comment) stays.

---

## 4. Dead code (grep-verified; behavior-neutral removals)

**Clusters**
- **D-1** `app/bootstrap/` steps machinery: `AppBootstrapState.steps`, `BootstrapStepInfo`, all of `constants.ts` (7 display labels), bookkeeping in `updateStep`/`retry` — no consumer ever reads step labels/state. Plus `canRetry` ≡ `isError`, and the `'initializing'` state member is constant-by-guard.
- **D-2** `app/cache/queryClient.ts:253-285` — `DOMAIN_QUERY_OPTIONS.tubes/.configuration/.statistics` + transitively `CACHE_TIMES.CONFIG` unused; the dead `.tubes` entry (3/15 min) has drifted from live `TUBE_STALE_TIME` (5/10 min) and `useTube`'s third hardcoded gcTime — delete, then decide tube cache times in one place.
- **D-3** `App.tsx:60-70` — unreachable "Finalizing…" fallback (guard math).
- **D-4** `shared/ui/components/inputs/ValidatedInput.tsx` — entire select/autofocus/onBlur/warning surface has zero consumers (~40 lines): select branch, 5 props, focus effect, warning class branches, 4 type-union members. (Latent bugs inside it are moot once deleted.)
- **D-5** `tubes/utils/tubeColorCoding.ts:27-39,351-359,739-762` — legacy `donor`/`cellLine` JSON-fallback paths unreachable (~45 lines).
- **D-6** `supplies/ui/components/SupplyLocationModal.tsx` — whole edit path (prop, updateMutation, title/icons) has zero callers; strands `useUpdateSupplyLocationMutation`. *Decision:* strip or wire up location editing.
- **D-7** `tubes/ui/components/editor/TubeEditorModal.tsx:63-64` — `rackId`/`boxId` props dead end-to-end incl. feeder chain through `useGridController`, `modalStore:38-39,233-234`, `BiobankModals` (2 eslint-disabled fallbacks).
- **D-8** `tubes/hooks/useTubeForm.ts` — `submitError` (zero consumers, wrong eslint-disable justification) + `useBulkEditTubeForm`'s constant-false `isSubmitting` OR'd into `TubeBulkEditorModal` state.
- **D-9** `tubes` field-path trio drift: 6 dead `TUBE_FIELD_PATHS` entries; `TubeFieldTypeMap` missing 4 real schema fields + hand-rolled `'c/v'|'c/mL'` instead of `ConcentrationUnit`; `TubeInfoPanel.tsx:63-81` re-declares the 18 paths locally.

**Singles** (one-line removals unless noted)
- **D-10** `admin/ui/AuditLogViewer.tsx:108-109` — `initialFilters`/`onFiltersChange` props, zero producers.
- **D-11** `AuditRetentionSettings.tsx:32-34` — `isDemo` never passed (demo gating never activates — or wire it, *decision*); `defaultCollapsed` only passed its default.
- **D-12** `DataExportForm.tsx:25,34-58` — `defaultFormat` populated, never read → format doesn't reset leaving JSON-only types (implement or drop).
- **D-13** `CatalogTab.tsx` — 9 impossible `?? category` fallbacks on exhaustive Records; `AuditLogViewer` null-guards on never-null state; `SecurityPanel` no-op MouseEvent casts; `UsersTab`/`LabUsersPanel` dead `?? []`, `as UserRole`, `void`-on-sync batch.
- **D-14** `SystemAdminDashboard.tsx:92-101` — permanent `value="—"` StatCells behind past-due, ticketless TODOs. Speculative UI, *product call*.
- **D-15** `supplies/hooks/useSupplyMutations.ts:343-347,379-388` — `SupplyBulkAction` `'receive'`/`'issue'` arms unreachable (dedicated mutations exist; equipment's arms are all live).
- **D-16** `SupplyItemForm.tsx:687-693` — hidden RHF inputs whose `setValueAs` never runs (medium — confirm payload unchanged).
- **D-17** `equipment/EquipmentItemInfoPanel.tsx:68,124-125` + `SupplyItemInfoPanel.tsx:143` — unreachable `??` fallbacks; root cause `Record<string,…>` loosening.
- **D-18** `EquipmentBulkUpdateModal.tsx:245` — redundant `as BulkActionType` cast.
- **D-19** auth: `passwordError` only ever set to `null` (dead wiring incl. `AuthPasswordCreateForm` `error`/`onErrorClear` props); `AuthGateway.tsx:43` constant-false initializer; `LoginResult` export unused; two defensive try/catch around never-throwing calls.
- **D-20** storage: `getEffectiveOwner` zero consumers (see also C-9); `buildUserAssignments` dead `inheritedBoxCount`/`isInherited`/`firstName`/`lastName`; `CustomLabelButton.className`; `StorageService.updateRack` `capacity` param; `RackRow`/`BoxRow` `isAdmin` re-checks constant under `canManageStorage`; `storageNavigatorTypes.ts:24` over-wide `| null`.
- **D-21** `infrastructure`: `HttpClient.deleteWithData` (zero callers); `SocketQueryBridge.ts:443` always-true check.
- **D-22** `search/utils/searchFormatters.ts:22,112` — `DisplayResults.hasResults` unused.
- **D-23** `donors/hooks/useDonorSearchQuery.ts` + `DonorService.ts:32-41` — `limit` param chain never exercised (fixes T7's ad-hoc key too).
- **D-24** tubes misc: `ClipboardData.timestamp` (write-only, wouldn't survive JSON round-trip); `handlePositionClick` phantom `gridSize` param; `PasteTubesResult`/`MoveTubesResult` exports; always-true wrap guard (`useGridKeyboardNavigation.ts:95`); redundant `hasFilledSelection`; re-checked `errors.length`; `filterNode` dead `path` threading; no-op `key` on non-list root; CSSOM-discarded `!important` inline styles; duplicate `'#FFFFFFFF'` entry.
- **D-25** `shared/ui/components/tree-lines/useTreeLines.ts:18` — `TreeLine.type` written by all producers, read by none.
- **D-26** `ErrorBoundary.tsx:168-175` — unreachable `errorId` fallback + redundant setState (+ redundant `displayName` in BaseModal).
- **D-27** `users/.../SecurityTab.tsx:65,86` — pointless `async` + unreachable `return`.
- **D-28** `SupplyTransactionForm` dead error plumbing + hidden `itemId` (part of S1-6).
- **D-29** `primitives/input/Input.tsx` + `input/types.ts` — **roughly half the component** has zero production consumers (verified across all 19 call-site files + ValidatedInput): the entire validation framework (`validate`/`validateOn`/`onValidationChange`/`runValidation`/`ValidationResult` — `'submit'` mode was never even implemented), label/description/error/warning/success rendering, icon/prefix/suffix slots + `isLoading` spinner + all 10 compoundVariants, the `type="date"` machinery (DatePicker owns dates), and sizes `lg`/`xl`. Strip to the used surface.
- **D-30** `primitives/select/Select.tsx` + `select/types.ts` — dead surface across all 24 call sites: `multiple` (whole multi-select subsystem), `searchable`+`onSearch` (whose keyboard nav never worked anyway), `isLoading`, `defaultValue`/uncontrolled path, `closeOnSelect`, `onOpen`/`onClose`, `warning`/`success`/`description`; also an always-empty `{...props}` spread (:500) and an impossible `value === null` check (:440). Alive: `clearable`, `renderOption`/`renderValue`, `error`, `label`, `state`, sizes xs/sm/md.
- **D-31** `primitives/table/Table.tsx:105-107,422,475` — `stickyHeader` has zero consumers **and is broken** (the `sticky` header variant is never passed to any `<th>`). Delete prop, variant, wrapper.
- **D-32** `primitives/button/Button.tsx` — variants `info`/`success` and size `xl` have zero consumers (all dynamic variant sources audited). Narrow `ButtonVariant`/`ButtonSize`.
- **D-33** Dead props/variants batch: `PanelHeader` `meta`/`actions` (12 call sites pass title+icon only); `HeaderStrip` `tone`; `NumberInput` `inputWidth` (+ unconsumed sizes xs/lg); DatePicker size `lg`; SearchInput sizes xs/md/lg; Textarea `size`/`readOnly`/`aria-labelledby`/`aria-required` (+ 3 callers pass `resize="none"` redundantly — it's the default); Chip `color="success"` cluster.
- **D-34** Unexport 5 same-file `*Props` interfaces with zero external importers: `Badge`, `Checkbox`, `ConsolePanel`, `HeaderStrip`, `NubDivider` (keep `NubDividerTone` exported — HeaderStrip imports it).

---

## 5. Duplication / consolidation candidates

Behavior-neutral unless flagged ⚠ (swap changes edge behavior — per audit rules, diff before applying).

- **C-1** Linked user/researcher cell (~25 lines × **4**): `UsersTab:297`, `ResearchersTab:285`, `LabUsersPanel:261`, `LabResearchersPanel:171` → one display component.
- **C-2** "Inactive X (n)" collapsible dimmed section × **5** (UsersTab, ResearchersTab, InviteCodesTab, LabUsersPanel, LabResearchersPanel) — ≥2 near-byte-identical (med-high).
- **C-3** `displayName`+`initials` derivation ×2 (incl. identical eslint-disable) — UsersTab vs LabUsersPanel.
- **C-4** `AdminSettingsModal` TAB_META duplicated against handwritten `<Tab>` JSX; PasswordResetModal's 4 parallel strength functions; small in-file dups (readOnly column filter ×2×2, InviteCodesTab reset block, demo banner ×2).
- **C-5** `CatalogTab.tsx:384-464` — 9 parallel `useState` arrays + setter map + manual invalidation = server state outside TanStack Query (parallel system; ~60 lines). Larger refactor, sign-off.
- **C-6** `SystemTab.tsx:56` — inline `useAuthStore(s => s.user?.labId)` where `useLabId()` is mandated. (Also `© 2025` hardcoded at :227.)
- **C-7** Maintenance form fields duplicated: `BulkMaintenanceTab:51-156` vs `EquipmentMaintenanceForm:113-220`, already drifting → shared `EquipmentMaintenanceFields`.
- **C-8** Equipment/Supplies toolbars + `SortField` type near-identical (structural-generic extraction only, per the settled two-catalog rule); Bulk Receive vs Issue tabs ~85% identical (multi-file, sign-off).
- **C-9** Storage ownership cascade encoded **5×** (`useStorageOwnership` ×2 incl. the dead one, `useStoragePermissions`, `StorageNavigator`, `BoxRow`) — consolidate to one pure `getEffectiveOwner`; prerequisite for S1-8.
- **C-10** Rack composite key in **two formats** (`${tankId}-${rackId}` vs `${tankId}-rack-${rackId}`, 6 literal sites + a conversion loop) → one `rackKey()` helper.
- **C-11** ⚠ `AssignmentDropdown.getInitials` vs shared-schemas `getPersonInitials` (edge behavior differs).
- **C-12** ⚠ Threshold-to-entry-unit walk inlined in `SupplyItemForm:111-122` + `SupplyItemInfoPanel:155-168` vs `computePackagingMultiplier` (differs on corrupt chains) → new `thresholdInEntryUnit` helper in `packagingChain.ts`. (Also: `packagingChain.ts:23-30` inconsistent malformed-chain fallbacks — needs a decision.)
- **C-13** ⚠ `SearchResultsPanel:394-444` re-implements `formatPositionRangesForBox` (differs: lists ≤3 individually).
- **C-14** `TransactionMode` union copied ×6 in supplies UI → export from `SupplyTransactionForm`.
- **C-15** Selection-card class constants byte-copied: `BulkPrintTab:30-39` vs users `DisplayTab:14-25` (comment even claims they're "shared" — they aren't).
- **C-16** Tick/label primitive hand-rolled ×23 client-wide (`StripLabel`/`CompletenessMeter` own it; `CompletenessMeter:21-27` itself inlines StripLabel byte-identically) → shared primitive; micro-label typography cluster ×3 (`fieldLabelClass` / `ValidatedInput.getLabelClasses` / `DetailRow:14`) → split base+tone constants.
- **C-17** Alert-panel sort comparators ×3 (supplies low-stock, reorder list, equipment maintenance); expand/auto-collapse shell ×2 (⚠ over-abstraction risk on the shell — comparator util only).
- **C-18** `matchingCategoryIds` search logic line-for-line ×2 (`CategoryTreePanel:127` vs `BulkCategoryTreeSelector:144`).
- **C-19** Facility occupancy bar ~95% ×2 (+1 cousin in help); `handleSelectNode` toggle+select duplicated inline ×2 (same file).
- **C-20** ConfirmDialog/InfoDialog `warning` variant style rows → hoist into `AlertDialog`.
- **C-21** Barcode scan→resolve→link-dialog logic ×2 (`SupplyQuickScanBar` vs `SupplyBarcodeScanInput`; QuickScanBar also passes no `onLinked` — nothing happens after linking. Bug-adjacent, low).
- **C-22** Auth: ~150-line profile+password JSX duplicated (`AuthRegistrationModal` vs `AuthSysAdminSetupPage`) — ⚠ sign-off (flows differ); auth link-button class ×5 → `AuthLinkButton`; logout clears the query cache twice with two catch layers → single owner (`clearAuth`).
- **C-23** `users/services/PersonService.ts:15-17` — `UpdatePersonProfileWithPassword` hand-rolls `UpdateMyProfileRequest` (shared-schemas) — byte-equivalent swap; `SessionService.ts:25-28` local `ApiEnvelope<T>` re-shape (medium — may be deliberate decoupling).
- **C-24** Tubes: invalidate-location guard block pasted ×4 (with internally inconsistent guard) → `invalidateTubeLocation()`; lock-variant derivation ×2 (`TubeGrid` vs `TubeGridCell`); lock-owner/shared-access predicate ×2; `useGridSelectionAnalysis` double `tubes.find` pass → one Map pass.
- **C-25** `HttpTransport.getBlob:118-135` re-implements `buildApiError` inline.
- **C-26** `searchInputStyle.ts` acknowledged copy of SearchInput primitive styling → console variant on Autocomplete (low).
- **C-27** ⚠ `primitives/table/Table.tsx:30-75` — `ROW_GLOW`: four ~8-line tone blocks identical except the color token; sibling `rowHoverGlow.ts` already proves the `var(--row-tone)` recipe. `STATE_STRIPE` (:187-194) rides along. No test coverage — diff the emitted class strings.
- **C-28** Hand-rolled Enter/Space keydown handlers on native `<button>`s ×3 (`Chip:230`, `MenuItem:65`, `Tabs:95`) — browsers synthesize click for both keys; deletion is behavior-neutral.
- **C-29** Icon-pop hover pattern duplicated (`MenuItem:58-63` vs `Tabs:85-91`), both with un-cleared 350 ms timers that mis-reset on rapid re-hover and fire post-unmount → shared hook, or at least clear the timers.

---

## 6. Comments / naming / organization

- **N-1** Restatement dividers to delete: `tubes/hooks/index.ts` ×5; `AuditLogViewer` ×8 (`// Pagination` etc.); `EquipmentBulkUpdateModal:61 // Main modal`; `AuthSessionTimeoutModal:194 {/* Actions */}`.
- **N-2** Wrong/stale comments: `AuditLogViewer:279` (describes casting that doesn't exist); `UsersTab:165,172` ("Make sure to await" on a `() => void` — type it async or drop); tube modal "component stays mounted" reset comments false at the only host (fix comments; keeping the guard is a judgment call); `useDonorSearchQuery:4` claims debouncing it doesn't do; `SupplyItemRow:39-41` contradicts code (SUP-7).
- **N-3** Naming: `SupplyBarcodeLabel.tsx` exports `BarcodeLabel` (rename export, 4 sites); `usePrintTabState` hook living in a component file + updater-only setter type; `DataExportForm.exportOptions` → UPPER_CASE; `LockVariant` type defined inside the tubes barrel; `useDeleteEquipmentMaintenanceEntryMutation` filed under the wrong divider; two `React.FC` outliers in `app/`; `ResearcherModal:239` `ReturnType<typeof useForm>['control']` → `Control<T>`.
- **N-4** a11y/consistency nits: `DonorIdAutocomplete` label not associated (DonorEditForm pattern exists); SearchFilterPanel toggles missing `type="button"`/`aria-expanded`; `LabDashboard:176` `ref={el => el?.focus()}` refocuses every render; mixed floating-promise handler style in admin (bare vs `void`-wrapped); `badges/index.ts` barrel omits `LabBadge` (2 deep-importers) and its header is wrong.
- **N-5** `equipment` status display split (labels in util, colors component-local, loosely typed) vs supplies' consolidated `SUPPLY_STATUS_DISPLAY` → mirror it (also closes D-17's root cause).
- **N-6** Doc drift: AGENTS.md client tree lists `domains/grid/`, which doesn't exist.
- **N-7** Primitives minor: `menus/types.ts:7` union member subsumed by the other; redundant `role="table"`/`role="columnheader"` on native elements; helper-home policy split (`lookupOptions`/`withPlaceholder`/`STAT_STRIP` barrel-exported vs `consoleHeaderSurface`/`rowHoverGlow` deep-imported); `DatePicker` is the only `React.FC` primitive; `Input.tsx:333` `catch (error)` shadows the `error` prop (moot with D-29); `Tabs` lacks roving tabindex (acceptable variant, noted only).

---

## 7. Cleared — verified healthy (no action)

- Every `queryKeys` entry has a live consumer; keys correctly lab-partitioned.
- No dead components anywhere in `shared/ui/components`; barrels carry no dead re-exports; deep-import conventions are consistent.
- All cross-domain deep imports are the deliberate, commented barrel-cycle workarounds; dev preview pages are dev-gated.
- Auth domain: no security-relevant holes; logout does clear the query cache (twice — C-22).
- `storageAnalytics.lab('self')` key, `useCreateLabInviteCodeMutation` no-invalidation, client-side request `.parse()` pattern, `SessionDebugInfo`, `LabBadge` color overrides — all checked and fine.
- Shared hooks/utils: zero dead exports; the 8 infra/shared test files test real behavior.
- Comment/JSDoc hygiene is strong overall — headers present and conforming across all 14 scopes; primitives' comments are exemplary (Badge `--lit` note, MenuItem mousedown rationale).

## 8. Suggested sequencing (after findings are approved)

1. **S1 fixes** — each verified individually (no test coverage on most paths: per audit rules, the diff is the gate).
2. **Mechanical dead code** (§4) — behavior-neutral, typecheck+grep gated; biggest wins D-1/D-2/D-4/D-5/D-7.
3. **Policy calls** (§3) — decide T1–T11, then apply mechanically.
4. **S2 fixes** by area, batched with that area's dead-code/duplication items per the audit commit convention.
5. **Consolidations** (§5) — behavior-neutral ones first; ⚠ items individually approved.
6. **Comments/naming** (§6) — single sweep commit.
