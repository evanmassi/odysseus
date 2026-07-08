# P1b — Collapse the `equipment` ↔ `supplies` Twin

**Date:** 2026-07-08 · **Branch:** `audit/fixes` · **Owner:** P1b from `ARCHITECTURE_AUDIT.md`

Collapses the parallel `equipment` and `supplies` client domains — 5+ near-identical component
pairs, ~1,000+ lines of copy-paste — into shared, domain-agnostic components. Investigation (six
parallel read-only diff agents + first-hand re-verification of every load-bearing pair at
`file:line`) sharpened the audit's headline: the **category surface** is genuinely twinned and
consolidates cleanly, while the **item surface** (ItemRow, ItemInfoPanel) and the **services/hooks**
only *look* twinned — they render/return genuinely different domain data and must stay per-domain.

> **Line numbers are as-of-investigation (2026-07-08).** Confirm each at edit time before changing.
> Work **red → green** per phase; **stop for review before each commit.** One commit per shared component.

---

## What is actually a twin (verified)

| Pair | Lines | Identical | Verdict | Disposition |
|---|---|---|---|---|
| `*CategoryModal` | 133 / 133 | 119 (90%) | True twin — 2 hook imports, 1 type, 2 identifiers, 2 placeholders | **Consolidate** |
| `*InfoPanelEmpty` | 35 / 35 | 29 (83%) | True twin — entity icon, title, message | **Consolidate** |
| `*CategorySelect` | 103 / 88 | equivalent UX | Near-twin — supplies is the cleaner reimpl (`description`-driven, `placeholder` prop) | **Consolidate** (supplies base) |
| `*CategoryPanel` | 488 / 483 | 419 (86%) | Near-twin — clean skeleton, zero divergent render branches | **Consolidate** (the big win) |
| Bulk-modal *selector* (inline in both) | ~270 each | byte-identical mod. 4 nouns | Hidden true twin | **Consolidate** (+ lands most of the P2 god-file) |
| `*ItemRow` | 151 / 138 | shell only (~40) | Genuinely divergent payload (maintenance-urgency vs stock-urgency) | Partial chrome only |
| `*ItemInfoPanel` | 425 / 736 | ~35% shell | Genuinely divergent (packaging/stock/barcodes/txns) | Partial chrome only |
| Services / hooks | 212/395 etc. | thin CRUD skeleton | Legit distinct — deep domain tails; generic would fight the type system | **Leave separate** |

**Schema facts (load-bearing).** The two `Category` Zod schemas are field-for-field identical
(`{id,labId,name,parentId,sortOrder,createdAt,updatedAt}`; no status/description) — a shared category
type is sound. Item **status vocabularies differ** (equipment: `active/inactive/under_maintenance/
out_of_service/decommissioned`; supplies: `active/discontinued/archived`) and item **schemas differ
substantially** — which is exactly why the shared tree panel takes a *status predicate* + an *item
render-prop*, and why ItemRow/ItemInfoPanel are not twins.

---

## Decisions (locked)

- **Home:** category-specific components (CategoryModal, CategoryHierarchySelect, CategoryTreePanel,
  BulkCategoryTreeSelector) go in new `client/src/shared/ui/components/inventory/` with its own `index.ts`
  barrel, imported as `@shared/ui/components/inventory` (mirrors `overlays`/`tree-lines`, which both domains
  already consume). **`InfoPanelEmpty` is the exception** — it proved to be a *generic* cross-domain empty
  panel (backs donors too, not just inventory), so it lives in `shared/ui/components/info-display/` beside
  the other generic cross-domain info components (`CompletenessMeter`, `DetailRow`) and is lifted to the
  top-level `@shared/ui` barrel like them. Precedent for cross-domain feature components in
  `shared/ui/components/` is established (`NavTreeLines`, `DocumentLinkModal`, `CompletenessMeter`).
- **Domain-agnostic by construction.** Domain barrels export only their Tab, so shared components import
  **zero `@domains/*`**: they take data, callbacks, and render-props. Mutations are injected. The Tabs
  (and edit form / bulk modal) stay per-domain and are the wiring sites.
- **Wiring: direct, delete the per-domain files.** The Tab (and edit form / bulk modal) renders the
  shared component directly; the old `Equipment*`/`Supply*` twin files are deleted. Maximizes copy-paste
  removal; the genuinely-distinct wiring lives where domain state already lives. (Deletions surfaced at
  each phase review.)
- **Commits: one per shared component**, on `audit/fixes` (continues P0/P1a cadence).
- **Naming:** `<CategoryModal>`, `<InfoPanelEmpty>`, `<CategoryHierarchySelect>`, `<CategoryTreePanel>`,
  `<BulkCategoryTreeSelector>` — un-prefixed, correct for shared (matches `NavTreeLines`,
  `CompletenessMeter`); the call site makes the domain explicit via props.
- **Scope = full, taste-gated.** Core 4 + bulk selector + verbatim-dup extractions (`StripLabel`,
  `STATUS_LINE`) are unconditional. Chrome extractions (`ItemDocumentsSection`, `ItemRowShell`,
  `InfoPanelShell`) are attempted but **dropped in favor of two clean components if they'd produce a
  config-heavy / bad abstraction** — immaculate ≠ over-abstracted. Equipment's bulk action forms
  (Maintenance/Status/Relocate) are hoisted into `equipment/ui/components/bulk-update-tabs/` to finish
  the P2 god-file while we're in that file (intra-equipment, no cross-domain sharing).

---

## The shared components

1. **`<InfoPanelEmpty>`** — props `{ title, emptyIcon, emptyMessage }`. Pure presentational.
2. **`<CategoryModal>`** — inject `createMutation`/`updateMutation` (call-signature-identical across
   domains) + `categoryPlaceholder`/`subcategoryPlaceholder`; category typed structurally `{id,name}`.
3. **`<CategoryHierarchySelect>`** — generic category, `placeholder` prop; adopt supplies'
   `description`-driven impl. *Risk:* empty-render guard differs (`!opt` vs `!opt?.value`) — verify at
   all 4 call sites.
4. **`<CategoryTreePanel<T,C>>`** — inject `renderItem` (absorbs the ItemRow swap + all status/badge
   divergence), `isHidden` + `showHidden` (**exact single-status test**, never `!== 'active'`),
   `getItemSearchFields`, `treeId` (**required, no default** — document-global `querySelector` key), and
   a `labels` bundle (count noun threads into the sub-component). Preserve menu-disable parity
   (`totalCount` at top level vs `items.length` in subcategory).
5. **`<BulkCategoryTreeSelector<T,C>>`** — inject `isSelectable`, `getSecondaryText`, labels,
   controlled/internal search. Removes ~270 lines from the equipment god-file + ~240 from supplies.

## Out of scope (with reasons)

- **Services & hooks** — shallow similarity, deep divergence; a generic service is a classic bad
  abstraction. *(Separate small hygiene item: the hooks-barrel asymmetry — equipment has no
  `hooks/index.ts`; supplies' barrel omits mutations. Not consolidation.)*
- **Full ItemRow / ItemInfoPanel merge** and the **bulk-modal action tabs** — genuine domain divergence.

---

## Phased plan

Each phase = one review gate + one commit. **Nothing moves forward until the phase is green and reviewed.**
Ordered easiest → hardest.

### Phase 1 — `<InfoPanelEmpty>` (backs equipment + supplies + donors)
- New `shared/ui/components/info-display/InfoPanelEmpty.tsx` + `InfoPanelEmpty.test.tsx`; exported from the
  info-display barrel and lifted to `@shared/ui`. Generalized with `headerIcon` (default `NotepadText`) +
  `stripLabel` (default `'Status'`) props so donor (`BookUser` / `'Collections'`) fits alongside
  equipment/supplies.
- Rewire `EquipmentTab`, `SuppliesTab`, and `DonorRegistryModal`; delete `EquipmentInfoPanelEmpty.tsx`,
  `SupplyInfoPanelEmpty.tsx`, `DonorInfoPanelEmpty.tsx` (105 lines of triplet).
- **Excluded after verification (not twins):** `TubeInfoPanel` (integrated chassis for both empty +
  populated states; substantive location/position HeaderStrip) and `SearchResultsPanel` (uses the bare
  `PanelEmptyState` primitive, no panel chrome — already correctly shared at the primitive level).
- **Commit:** `refactor(info-display): shared InfoPanelEmpty backs equipment + supplies + donors`

### Phase 2 — `<CategoryModal>`
- New shared `CategoryModal.tsx` + test (pass `vi.fn()` mutations).
- Rewire `EquipmentTab.tsx:352`, `SuppliesTab.tsx:365`; delete both `*CategoryModal.tsx`.
- **Commit:** `refactor(inventory): shared CategoryModal backs equipment + supplies`

### Phase 3 — `<CategoryHierarchySelect>`
- New shared `CategoryHierarchySelect.tsx` (supplies base + `placeholder`) + test.
- Rewire 4 call sites (`EquipmentEditForm`, `EquipmentBulkUpdateModal`, `SupplyItemForm`,
  `bulk-update-tabs/BulkReassignTab`); delete both `*CategorySelect.tsx`. Verify empty-render at each.
- **Commit:** `refactor(inventory): shared CategoryHierarchySelect backs equipment + supplies`

### Phase 4 — `<CategoryTreePanel>` (the ~950-line win)
- **Read both `*CategoryPanel.tsx` in full before editing.**
- New shared generic `CategoryTreePanel.tsx` + test; honor the 5 risk callouts.
- Rewire `EquipmentTab.tsx:285`, `SuppliesTab.tsx:298` (pass `renderItem={<EquipmentItemRow …/>}` etc.);
  delete both `*CategoryPanel.tsx`. `*ItemRow.tsx` stay (they are the injected render-prop).
- **Commit:** `refactor(inventory): shared CategoryTreePanel backs equipment + supplies`

### Phase 5 — `<BulkCategoryTreeSelector>` + finish the equipment god-file
- **Read both bulk modals in full before editing.**
- New shared generic `BulkCategoryTreeSelector.tsx` + test.
- Rewire both `*BulkUpdateModal.tsx`; hoist equipment's Maintenance/Status/Relocate forms into
  `equipment/ui/components/bulk-update-tabs/`.
- **Commit:** `refactor(inventory): shared bulk category-tree selector; split equipment bulk-update god-file`

### Phase 6 — verbatim-dup + taste-gated chrome
- `StripLabel`, `STATUS_LINE` (verbatim dups → shared). Then attempt `ItemDocumentsSection`,
  `ItemRowShell`, `InfoPanelShell` — keep each only if its diff reads immaculate; drop otherwise.
- **Commit(s):** per extraction that lands.

---

## Verification (every phase)

`npm run typecheck` · client Vitest · `npm run lint` — and, because this is UI, **drive both the
equipment and supplies pages** to confirm identical render/behavior before committing. New shared
components take injected data/callbacks, so tests pass `vi.fn()` mutations and need no providers.

## Definition of done (audit's bar)

Shared `<CategoryModal>`, `<CategoryHierarchySelect>`, `<InfoPanelEmpty>`, and `<CategoryTreePanel>`
(+ the bulk selector) back both domains; each domain keeps only its Tab-level wiring and
genuinely-distinct components (ItemRow, ItemInfoPanel, action tabs); the ~1,000 lines of copy-paste are
gone with no behavioral or visual change.
