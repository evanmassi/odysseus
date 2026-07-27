# Lab-Wide Convergence — Work Order

Cross-catalog cleanup that the reagents build surfaced. Every item here removes a duplicated
mechanism or a vocabulary a lab experiences as single but the schema splits per suite. This is a
**sequencing document**, not a design document — the decisions are made; what matters is what blocks
what.

**Status:** items 1, 2, 3 and 9 done. Reagents Phase 2 is complete and Phase 3 dissolved into the
client-side alerting rule below. **Next: items 4 + 5 (locations, vendor/manufacturer) before reagents
Phase 5.** Companion to `REAGENTS_PLAN.md` (which owns the reagent subsystem design).

**Migration policy while reagents are unreleased.** Dev has not applied 027; reagent schema changes
**amend 027 in place** rather than stacking corrective migrations, so the tables are created correctly
on the single run. Only add a new migration when the change touches data already live in dev
(supplies, equipment, lookups) — items 4, 5 and 6 all do. `odysseus_test` is disposable: drop it and
the integration setup rebuilds it.

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

### 1. Shared alert panel — ✅ done (`192eafa7`)

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

### 4. Locations merge — *before reagents Phase 5*

**What.** One `locations` table (prefix `loc`) replacing `supply_locations` + `reagent_locations`,
with equipment's free-text `location` column migrated onto it. All three catalogs FK to it.

**Why.** "Freezer A" is one physical place holding supplies *and* reagents. Renaming it today means
two tables and a text field.

**Naming.** Deliberately `locations`, not `lab_locations` — a store room isn't necessarily in the lab.

**Blocks.** Reagent location UI (Phase 5). Touches supplies + equipment live data.

### 5. Vendor / manufacturer merge — *before reagents Phase 5*

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

**Blocks.** Reagent item form (Phase 5) binds a specific category. `reagent_vendor` is provably empty
right now — this is the cheapest it will ever be.

### 6. Supplies → unit registry — *before item 7*

**What.** Drop the `supply_stock_unit` lookup; map existing values to registry ids, unmappable ones
become lab custom units. Widen the registry's `count` kind to cover packaging vocabulary (box, case,
pack).

**Why.** Tubes are confirmed migrating onto the registry and reagents are built on it, leaving
supplies as the only catalog using a lookup. A free-text lookup can't do dimension tagging (offering
`mg/mL` but never `mL` on a concentration field) or canonical formatting — it gives you "ug", "µg"
and "mcg" as three entries.

**Blocks.** Nothing hard, but it removes a leaf from the catalog rail, so do it first.

### 7. Catalog tab → nav rail — *before reagents Phase 7*

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
- [ ] 4 — Locations merge
- [ ] 5 — Vendor / manufacturer merge
- [ ] 6 — Supplies → unit registry
- [ ] 7 — Catalog tab → nav rail
- [ ] 8 — Lab-wide barcode resolve
- [x] 9 — Supplies low-stock → client-side
