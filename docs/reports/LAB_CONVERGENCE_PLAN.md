# Lab-Wide Convergence — Work Order

Cross-catalog cleanup that the reagents build surfaced. Every item here removes a duplicated
mechanism or a vocabulary a lab experiences as single but the schema splits per suite. This is a
**sequencing document**, not a design document — the decisions are made; what matters is what blocks
what.

**Status:** items 1, 2, 3, 4a, 5, 6, 7 and 9 done. Reagents is complete through Phase 6 and **Phase 7
is in progress**. Items 4b (equipment locations), 8 (lab-wide barcode resolve, due before reagents
Phase 8), 10 and 11 (attributes for the other two catalogs, after Phase 7) remain. Companion to
`REAGENTS_PLAN.md` (which owns the reagent subsystem design).

**Migration policy — amend-in-place is over.** Dev has applied everything through **032**. While
reagents were unreleased, schema corrections amended 027 in place; that window is closed. Every change
from here is a **new migration (033+)**, and anything touching live data gets rehearsed on a clone
first (`CREATE DATABASE odysseus_mig_rehearsal TEMPLATE odysseus_dev`, run the runner, verify, drop) —
the drill that caught a silent ID collision in 031 and verified the five-column unit rewrite in 032.
There is no `down`: the runner interface is `{ id, name, up }`. `odysseus_test` is disposable — drop it
and the integration setup rebuilds it.

**Governing rule.** One source of truth per concept. Where a concept is genuinely lab-wide (a vendor,
a fridge, a unit), it gets one home and every suite points at it. Where it's genuinely suite-specific
(an equipment category tree, a lot ledger), it stays split — see *Not merging* below, and don't
relitigate it.

**Standing pattern — alerts are derived, not fetched.** Low-stock, expiry and maintenance alerts are
computed **client-side from the item list the tab already loads**. No alert endpoints, repo queries
or response schemas. The list rows carry what's needed (`totalStock` + `reorderThreshold`;
`soonestExpiration`; `nextMaintenanceDate`), so a dedicated endpoint answers the same question twice
— two caches, two staleness clocks, the threshold rule written once in SQL and again on the client.
Equipment already works this way; supplies' `GET /reorder-list` is the outlier (item 9). Revisit only
if a lab outgrows loading its item list, which would break the category tree first.

**Authoring standard.** Same as reagents: fresh to the Donor exemplars in `AGENTS.md`. Supplies and
equipment are the *surface* reference only — never a code reference.

---

## Work order

Ordered by cost of delay. Each item states what blocks it, because several get materially more
expensive one phase later.

### 1. Shared alert panel — ✅ done (`192eafa7`); low-stock panel shared later

**Follow-on landed (`66e9523b`).** `SupplyLowStockAlertPanel` and `ReagentLowStockAlertPanel` were 125
and 123 lines differing in **30** — a clone. Collapsed into
`shared/ui/components/inventory/LowStockAlertPanel.tsx` (+ co-located test, matching every sibling in
that folder), with each domain keeping only its query, its unit formatting (`formatQuantity` vs
`pluralizeUnit`) and which reorder modal opens. Both bindings are now ~53 lines.


**What.** Extract one alert panel component + one alert shape (severity, entity, message, action)
to `shared/ui/components/`; rewire supplies and equipment onto it. Add a lab-wide roll-up (count
badge in the header or dashboard) that links *into* the per-tab panels.

**Why.** `SupplyLowStockAlertPanel` (215 lines) and `EquipmentMaintenanceAlertPanel` (220 lines) are
two hand-written implementations of one pattern. Reagents Phases 3 and 6 would add a third and
fourth. Separately, nothing today tells an admin anything needs attention unless they visit each tab
and look.

**Not doing:** merging the panels into one list. Per-tab placement is deliberate — scoped alerts are
digestible and sit where you'd act on them. The roll-up reports *that* something needs attention;
the panels stay the place you deal with it.

**Landed.** `shared/ui/components/inventory/AlertPanel.tsx` + co-located test; supplies and equipment
rewired; 184 lines removed from the two domains. The **roll-up is deferred** — revisit after reagents
Phase 3, when there are three real alert sources to aggregate and the placement can be judged against
the running app. Preferred placement if built: a strip across the lab-management tabs, where the data
is already loaded, rather than the app header, which would need count endpoints the standing pattern
above deliberately avoids.

### 2. Attribute system → shared vocabulary — ✅ done

**What.** `reagent_attribute_definitions` / `_options` become lab-wide `attribute_definitions` /
`attribute_options`; the existing `applies_to_type` scope column generalises to catalog + type. Each
catalog keeps a thin `*_attribute_values` table with a real FK to its own items. Migrate
`supply_item_property` onto it and drop that lookup category.

**Why.** Supplies' `item_property` lookup is a degenerate attribute system; reagents deliberately
dropped `properties[]` for the real one. Shipping both is two mechanisms for one concept.

**Rejected:** a polymorphic `item_id` + `item_type` with no FK. `REAGENTS_PLAN` §5.4 chose normalized
EAV *for* referential integrity; dropping the item FK partly undoes its own rationale. Sharing the
vocabulary while keeping values local is the same call `AGENTS.md` already made for categories.

**Landed.** `attribute_definitions` + `attribute_options` (lab-wide, `applies_to_catalog` CHECK of
reagent/supply/equipment, null = all) with `reagent_attribute_values` keeping its name and its FK to
`reagent_items`. Schemas moved to a new `shared-schemas/src/attributes/` module mirroring `units/`;
reagents keeps only the per-item value schemas. **Amended migration 027 in place** rather than adding
a rename migration — reagents are unreleased and dev had not applied 027, so the tables are created
correctly the first time. `supply_item_property` migrates onto this system when supplies adopts it.

### 3. Custom units → catalog-agnostic — ✅ done

**What.** `reagent_custom_units` → `custom_units`; the five schemas and three types in
`shared-schemas/src/units/customUnitSchemas.ts` lost their `reagent` prefix.

**Why.** A lab's custom unit isn't a reagent concept. Once supplies moves onto the registry (item 6)
it needs the same escape hatch.

**Landed** with item 2, in the same amendment to migration 027.

### 4. Locations merge — ✅ 4a done (equipment onboarding = 4b, outstanding)

**What.** One `locations` table (prefix `loc`) replacing `supply_locations` + `reagent_locations`,
**hierarchical via a `parent_id` self-FK**, with equipment's free-text `location` column migrated onto
it. All three catalogs FK to it.

**Why.** "Freezer A" is one physical place holding supplies *and* reagents. Renaming it today means
two tables and a text field. Hierarchy because a lab's places nest for real — *Room 204 → Cold Room →
Shelf 2* — and flat lists force compound strings like "Room 204, Bench 3" that nothing can query.

**Depth.** `validateCategoryDepth` generalises to a `maxDepth` option counting **tiers**: categories
keep today's `2` as the default (behaviour identical), locations pass `3`. The guard switches to
computing parent tier + subtree height from `findByLabId`, because `hasChildren` cannot distinguish a
subtree of height 1 from 2.

**Naming.** Deliberately `locations`, not `lab_locations` — a store room isn't necessarily in the lab.

**Client home.** `domains/lab-management/`, which now holds lab-wide vocabularies rather than a page.
The cycle that briefly ruled it out — its barrel exported `LabManagementPage`, which imports
`SuppliesTab` — was the page's fault, not the domain's: that page owns no domain logic, has one
consumer (`AppDashboard`), and even imported `@app/components/layout/AppHeader`, a domain reaching
into the app shell. Moving it to `app/components/layout/` inverts the dependency correctly — the
domain exports vocabularies, catalogs import them, `app/` composes both. Attributes and custom units
land here too. Not `domains/storage/` — positional tube subsystem, disjoint consumers (see *Parked*).

**Landed (4a).** One `locations` table with `parent_id`, created in the amended 027; migration 030
moves supply rows across, repoints the `supply_stock` and `supply_transactions` FKs and drops
`supply_locations`. One `Location` entity/repo/mapper, `/api/locations`, and `domains/locations/` on
the client. `validateCategoryDepth` generalised to `maxDepth` tiers; `CategoryHierarchySelect` now
recurses so the third tier is selectable rather than schema-only.

**Rehearsed** on a clone of dev through the whole 027→030 chain: both supply locations moved, the
stock row and transaction still resolve, `supply_locations` dropped, dev itself untouched at 26.

**Follow-on.** Lookups (species, vendor, manufacturer) are still administered from
`domains/admin/CatalogTab` while these vocabularies live in lab-management — the same concept in two
homes. Item 7's rail is the moment to reconcile that, since the rail *is* one surface for every lab
vocabulary.

**Outstanding (4b).** Equipment's free-text `location` column still needs backfilling onto the tree —
deferred because converting it to a constrained dropdown is a product call, not plumbing.

### 5. Vendor / manufacturer merge — ✅ done

**What.** Drop the domain prefixes: `supply_vendor` + `reagent_vendor` → `vendor`, same for
`manufacturer`. Consumed by supplies, reagents and equipment. Equipment gains `vendor_name` +
`vendor_catalog_number` columns.

**Why.** A lab has one vendor list. These categories resolve to a bare `TEXT` column, so splitting
them buys no type safety — it only partitions a vocabulary the user experiences as single. Equipment
carries `manufacturer` as free text today with no controlled vocabulary at all.

**Not adding `catalog_number` to equipment** — `model` already plays that role, and two fields for
one meaning is the problem we're fixing. `serial_number` / `asset_tag` are per-unit and unaffected.

**Scope.** Migration merging existing values (dedupe on collision), CHECK swap, the ~8 files reagents
commit 2c touched, and a rename/count cascade fanning out to three item tables.

**Landed.** Migration 029 merges the categories (dedupe guarded by `UNIQUE(lab_id, category, value)`),
backfills equipment's free-text manufacturers into the shared list so existing items resolve against
their own dropdown, and adds `vendor_name` / `vendor_catalog_number` to `equipment_items`. Migration
027 was amended to never create the reagent-scoped pair. `LookupValueApplicationService` now resolves
a *list* of catalog fns per category — vendor and manufacturer sum counts across supplies, reagents
and equipment, and a rename cascades to all three.

**Rehearsed before shipping:** the data migration was replayed on a clone of the dev database — 3
vendors and 4 manufacturers moved, *Eppendorf* backfilled from the one equipment item, *Thermo
Scientific* correctly retained as both a vendor and a manufacturer.

**Resolved by item 7:** the merged lists were parked in a `Suppliers` accordion group; the rail
dissolved all grouping, so they are now simply the *Vendors* and *Manufacturers* leaves.

### 6. Supplies → unit registry — ✅ done

**What.** Drop the `supply_stock_unit` lookup; map existing values to registry ids, unmappable ones
become lab custom units. Widen the registry's `count` kind to cover packaging vocabulary (box, case,
pack).

**Why.** Tubes are confirmed migrating onto the registry and reagents are built on it, leaving
supplies as the only catalog using a lookup. A free-text lookup can't do dimension tagging (offering
`mg/mL` but never `mL` on a concentration field) or canonical formatting — it gives you "ug", "µg"
and "mcg" as three entries.

**Blocks.** Nothing hard, but it removes a leaf from the catalog rail, so it went first.

**Landed.** Migration 032 rewrites the unit string across **all five columns that hold one** —
`supply_items.stock_unit` / `reorder_unit` / `reorder_threshold_unit` and
`supply_packaging_levels.unit_name` / `parent_unit` — because the packaging chain walks
`parent_unit` → `unit_name` → `stock_unit` by string equality, and rewriting any subset detaches the
conversions silently. The lab's three values (Box · Pack · Case) all map onto new registry entries,
so the custom-unit fallback in the migration went unused; it stays for values a future environment
might hold. The registry's `count` kind gained `box` / `pack` / `case`, which also hands reagents the
pack vocabulary its packaging editor was missing.

**Deleted rather than fixed:** `renameStockUnit` only ever rewrote `supply_items.stock_unit`, so
renaming a unit already broke packaging chains and left `reorder_unit` dangling. Retiring the lookup
retires the bug class. `countItemsUsingStockUnit` went with it.

**Rehearsed** on a clone of dev through the full 027→032 chain: all five columns lowercased
consistently, every `parent_unit` still resolves to a sibling `unit_name` per item, the
`supply_stock_unit` rows and CHECK entry are gone, `custom_units` empty as predicted — and dev itself
untouched at 26.

**Note:** supplies' unit dropdowns are registry-only until custom-unit CRUD lands in reagents Phase 7,
so there is no "add a unit" path in between. A no-op for this lab, whose three units all became
registry entries.

### 7. Catalog tab → nav rail — ✅ done

**What.** Replace the accordion groups with a left rail + detail pane. Rail lists every editable
vocabulary (flat, alphabetical, filter box, entry counts); right pane shows the selected list — the
existing per-list table, unchanged. Shared vocabularies carry a *used by · Supplies · Reagents ·
Equipment* line. Route context pre-selects a leaf. Reuses the existing `nav-tree` CSS and
`NavTreeLines` already used by the sibling `SystemTab`.

**Why.** Semantic grouping can't classify Phase 7's *lab-defined* attribute vocabularies, so a
taxonomy solves the fixed half of the surface and structurally cannot solve the growing half. The
rail also makes group names optional decoration rather than load-bearing containers.

**Blocks.** Phase 7 roughly doubles this surface (attribute definitions + options + custom units all
land here as leaves).

**Landed.** `CatalogRail` (flat, alphabetical, filter box, entry counts) beside the selected list;
`CatalogGroup` and its five `expanded` flags deleted. The nine hand-written `CategorySection` blocks
became one `CATALOG_LEAVES` config plus a single render, so the tab lost ~210 lines while gaining the
filter and the *used by* line — which rides in `SubsectionHeader`'s existing `meta` slot rather than
new chrome. `CategorySection` itself is untouched: the per-list table, inline add/rename/delete,
sorting and usage counts are exactly as they were. Route context pre-selects on mount only, so
navigating with the modal open doesn't yank the selection.

**Deviation from the sketch:** `NavTreeLines` was *not* used. It only emits connectors for expanded
`l1` parents, so on a flat rail it renders an empty SVG. The `nav-tree` CSS is still the vocabulary —
a new `--rail` variant was folded into the existing selected-row selectors (three lines of selector
widening, no duplicated declarations) because `--item`'s junction dot expects a spine that a flat list
doesn't have.

**Reworked after first render** (the first pass was hand-rolled and didn't match the app): the rail now
uses `Tabs orientation="vertical"` — the same primitive as the Lab Management sidebar — which brought
the sliding phosphor indicator, active treatment and tab semantics for free. Three shared primitives
were widened rather than worked around: `Tabs` gained a `size` prop (`sm` = 12px + tighter padding, for
a dense rail rather than a few section tabs; all 11 other call sites default to the old `md`),
`SectionHeader`'s terminator nub lost a `right-20` magic number tuned to its only prior consumer, and
`AdminSettingsModal` gained an `onTabAction` slot mirroring its existing `onTabFooter` so Refresh could
sit in the tab header, where its catalog-wide scope reads correctly (it refetches all nine lists).
The `nav-tree` `--rail` CSS variant added by the first pass was reverted with it.

**The pane no longer names itself.** With a rail, the lit leaf is the title and the count, so
`CategorySection`'s toolbar dropped its `SubsectionHeader` and became actions-only — matching
`InviteCodesTab`, the app's existing pattern. `+ Add` reveals a full-width field (Enter commits,
Escape cancels, stays open for consecutive entries); `toolbar.left` now carries only the *used by* note,
and only for the two shared vocabularies.

### 8. Lab-wide barcode resolve — *before reagents Phase 8*

**What.** One resolve endpoint that fans out across catalogs. Barcode tables stay per-catalog.

**Why.** `SupplyService.resolveBarcode` hits `/api/supplies/barcodes/resolve`; reagents would add its
own. That means a scan only resolves if you're already in the right tab — you must know what a thing
is before scanning it to find out what it is.

**Blocks.** Reagent barcode wrappers (Phase 8).

### 9. Supplies low-stock → client-side — ✅ done

**What.** Derive supplies' low-stock from the item list the tab already loads; delete
`GET /reorder-list` and its repo query, service method, client service method and query hook.

**Why.** `SuppliesTab` already loads every item with `totalStock`, and `reorderThreshold` is on the
item — so the endpoint re-answers a question the client can already answer, from a second cache. It's
the one place violating the standing pattern above.

**Verify before deleting.** The SQL filters `status = 'active'` and compares
`SUM(stock.quantity) <= reorder_threshold`; confirm the list's `totalStock` uses the same sum and
apply the same status filter client-side. A behavioural diff to check, not assume.

**Landed.** Predicate proven exact before deleting: `ITEM_WITH_STOCK_SELECT` is a shared prefix for
both queries, so `total_stock` is computed identically; the reorder query is the list query plus
`status = 'active'`, `reorder_threshold IS NOT NULL`, and the `HAVING` comparison — reproduced
client-side verbatim. **The repo method survives** — `findItemsAtOrBelowThreshold` also backs the
admin CSV export, which the reorder modal's Export CSV button calls via blob; only the client-query
chain went. Also removed three stale `reorderList` invalidations and dropped the three orphaned
Phase-1 reagent alert schemas.

**Known residual.** The threshold rule now exists client-side (display) and in SQL (CSV export). The
admin export tab is an independent consumer, so the server path earns its place. No shared predicate
helper yet — one caller; reagents becomes the second in Phase 6, extract then.

### 10. Catalog tab skeleton → shared shell — *not started*

**What.** `EquipmentTab`, `SuppliesTab` and `ReagentsTab` hand-write the same chassis: the 60/40 split,
`ConsolePanel`, `PanelHeader`, the locator `HeaderStrip` with item/category counts, and the
search · sort · show-archived toolbar. Normalising the domain prefixes away, the reagents and supplies
tabs differ in **120 lines** — nearly all of it the contents, not the frame.

**Why.** Three catalogs now share one frame, and a fourth surface would copy it again. This is the
largest duplication left after the low-stock panel; `shared/ui/components/inventory/` is the
established home.

**Cost.** Invasive: it touches all three tabs' layout at once, two of which are un-audited. Worth doing
deliberately, not folded into another item. A `ReorderList` shell is a weaker second candidate — the
table and CSV are common but the export mechanism genuinely differs (supplies fetches a server
endpoint, reagents serialises client-side) and so do the columns.

### 11. Attributes → supplies + equipment — *not started*

**What.** Give supplies and equipment their own `*_attribute_values` tables and point the reagent
attribute UI at all three catalogs. Migrate `supply_item_property` onto the attribute system and drop
that lookup category.

**Why.** The vocabulary half is already built and already catalog-agnostic: item 2 shipped
`attribute_definitions` / `attribute_options` lab-wide with an `applies_to_catalog` CHECK of
reagent/supply/equipment (null = all), and named `supply_item_property` as the degenerate attribute
system to retire. So two of the three catalogs can define attributes today and have nowhere to store
a value. Equipment has no per-item metadata mechanism at all.

**Blocks.** Nothing blocks it. Reagents Phase 7 lands first so the shared extraction has a real
second caller instead of a guessed one — the order that produced `AlertPanel`, `LowStockAlertPanel`
and the shared `Location`.

**Scope.**
- Migration: `supply_attribute_values` + `equipment_attribute_values` mirroring
  `reagent_attribute_values` (item FK, definition FK, the three value columns, same three indexes).
- Repos: value read + `replaceAttributeValues`, plus the batched fill on each item-list query —
  `ReagentItemRepository` is the model.
- Schemas: per-catalog value schemas, duplicated by design exactly as documents are.
- Client: `ReagentAttributeFields` and `ReagentAttributeFilterPanel` move to
  `shared/ui/components/inventory/`; each catalog keeps only its query/mutation binding.
- Admin: the create modal gains the catalog picker Phase 7 deliberately left off (`REAGENTS_PLAN` §9
  — a picker offering catalogs that can't store a value implies a capability that doesn't exist), and
  each definition carries a *used by* line like the shared lookups.
- Data: migrate existing `supply_item_property` values into a "Product Property" multi-select
  definition, then drop the lookup category (CHECK swap plus the ~5 lookup touch-points).

**Not doing:** a polymorphic `item_id` + `item_type` values table. Item 2 rejected it and nothing has
changed — the item FK *is* the referential integrity the normalized EAV exists for.

---

## Parked — decide when we get there

**Locations ↔ biobank storage.** Once locations are a real tree (item 4), the lab has *two* models of
physical place: `locations` (Room → Area → Shelf, named containment, no coordinates — used by
supplies, reagents, equipment) and the biobank's `storage` (tank → rack → box **plus grid positions**,
capacity and occupancy analytics — used by tubes). They are coherent as one thing: a cryo tank
genuinely sits in Room 204, and a freezer could hold both reagent lots and tube boxes.

Folding them together is a **project, not a merge** — storage carries positional addressing, capacity
maths and its own navigator UI that locations have no concept of. The plausible shape is locations
becoming the outer tree with tanks hanging off a room, storage keeping the coordinate system below
that. Revisit deliberately once locations are in use; do **not** let it ride along with item 4.

---

## Not merging

Decided; don't reopen without a new reason.

| Concern | Why it stays split |
|---|---|
| Categories | An equipment tree ("Centrifuges › Benchtop") is meaningless to reagents. Behaviour already shared via `Category.ts`; identity stays local. |
| Documents | Child rows of one item, not a shared vocabulary. `docType` is already shared additively — that's the right amount. |
| Transactions / stock ledger | Reagent's carries `lot_id` and FEFO semantics supplies has no concept of. Genuinely different shapes. |
| Packaging levels | Per-item structure. Only the *unit* vocabulary converges (item 6). |
| Item surfaces | `AGENTS.md` §Equipment↔Supplies, still right: equipment tracks asset lifecycle, consumables track stock. |

---

## Progress

- [x] 1 — Shared alert panel *(roll-up deferred to after reagents Phase 3)*
- [x] 2 — Attribute system → shared vocabulary
- [x] 3 — Custom units → catalog-agnostic
- [x] 4 — Locations merge *(4a; equipment onboarding 4b outstanding)*
- [x] 5 — Vendor / manufacturer merge
- [x] 6 — Supplies → unit registry
- [x] 7 — Catalog tab → nav rail
- [ ] 8 — Lab-wide barcode resolve
- [x] 9 — Supplies low-stock → client-side
- [ ] 10 — Catalog tab skeleton → shared shell
- [ ] 11 — Attributes → supplies + equipment
