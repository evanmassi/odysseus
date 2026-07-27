# Lab-Wide Convergence — Work Order

Cross-catalog cleanup that the reagents build surfaced. Every item here removes a duplicated
mechanism or a vocabulary a lab experiences as single but the schema splits per suite. This is a
**sequencing document**, not a design document — the decisions are made; what matters is what blocks
what.

**Status:** none started. Reagents Phase 2 is complete; **Phase 3 is held until item 1 lands.**
Companion to `REAGENTS_PLAN.md` (which owns the reagent subsystem design).

**Governing rule.** One source of truth per concept. Where a concept is genuinely lab-wide (a vendor,
a fridge, a unit), it gets one home and every suite points at it. Where it's genuinely suite-specific
(an equipment category tree, a lot ledger), it stays split — see *Not merging* below, and don't
relitigate it.

**Authoring standard.** Same as reagents: fresh to the Donor exemplars in `AGENTS.md`. Supplies and
equipment are the *surface* reference only — never a code reference.

---

## Work order

Ordered by cost of delay. Each item states what blocks it, because several get materially more
expensive one phase later.

### 1. Shared alert panel — *before reagents Phase 3*

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

**Blocks.** Reagent alert panels (Phases 3, 6).

### 2. Attribute system → shared vocabulary — *before reagents Phase 4*

**What.** `reagent_attribute_definitions` / `_options` become lab-wide `attribute_definitions` /
`attribute_options`; the existing `applies_to_type` scope column generalises to catalog + type. Each
catalog keeps a thin `*_attribute_values` table with a real FK to its own items. Migrate
`supply_item_property` onto it and drop that lookup category.

**Why.** Supplies' `item_property` lookup is a degenerate attribute system; reagents deliberately
dropped `properties[]` for the real one. Shipping both is two mechanisms for one concept.

**Rejected:** a polymorphic `item_id` + `item_type` with no FK. `REAGENTS_PLAN` §5.4 chose normalized
EAV *for* referential integrity; dropping the item FK partly undoes its own rationale. Sharing the
vocabulary while keeping values local is the same call `AGENTS.md` already made for categories.

**Blocks.** Reagent attribute CRUD (Phase 4). Cheap now — the tables exist but nothing reads them.

### 3. Custom units → catalog-agnostic — *before reagents Phase 4*

**What.** Rename `reagent_custom_units` → `custom_units`; ID prefix `rcun` → `cuni`.

**Why.** A lab's custom unit isn't a reagent concept. Once supplies moves onto the registry (item 6)
it needs the same escape hatch.

**Blocks.** Phase 4 builds this table's CRUD. Today it's one `ALTER TABLE` on an unused table; after
Phase 4 it's a migration plus repo/DTO/service churn.

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

- [ ] 1 — Shared alert panel
- [ ] 2 — Attribute system → shared vocabulary
- [ ] 3 — Custom units → catalog-agnostic
- [ ] 4 — Locations merge
- [ ] 5 — Vendor / manufacturer merge
- [ ] 6 — Supplies → unit registry
- [ ] 7 — Catalog tab → nav rail
- [ ] 8 — Lab-wide barcode resolve
