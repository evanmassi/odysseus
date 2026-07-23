# Reagent Tracking & Management — Implementation Plan

Living plan for the final lab-management suite. Reagents mirror **supplies** most closely, then
extend it with the things that make a reagent a reagent: per-lot expiry, chemistry/safety metadata,
and a lab-configurable attribute system. This doc is the shared source of truth; we iterate on it as
we build.

**Status:** planning complete; implementation not started. Branch `feature/reagents`.

### Progress ledger — check off as each phase lands (details in §10)

- [ ] Phase 0 — shared extractions
- [ ] Phase 1 — schema + DB foundation
- [ ] Phase 2 — server core CRUD
- [ ] Phase 3 — alerts
- [ ] Phase 4 — attribute system
- [ ] Phase 5 — client core
- [ ] Phase 6 — client stock + alerts
- [ ] Phase 7 — client attributes
- [ ] Phase 8 — barcodes
- [ ] Phase 9 — bulk ops + polish

_Current: plan committed; ready to start Phase 0. Each session — read this plan, do the current phase, tick its box, commit._

> **Authoring standard (non-negotiable).** Supplies is the *surface* reference — what tables,
> endpoints, and components exist — **not** a code reference. The audit rubric explicitly bars
> equipment/supplies/consumables as style references; they're un-audited. Every reagent file is
> authored fresh to the **Donor exemplars** (AGENTS.md): plain-English title header above imports;
> near-zero JSDoc (a single-line "why/called-by" only on non-obvious methods — no `@param`/`@returns`
> boilerplate); no restatement/inline comments; controllers = `try/catch` → service →
> `ResponseBuilder.success` / `handleControllerError`; services = constructor-injected deps +
> `requireAdminAccess` on writes + `getXOrThrow` helpers + publish-after-save + DTO mapping. We copy
> supplies' *shape*, never its files.

---

## Table of Contents

1. [The higher view](#1-the-higher-view)
2. [v1 feature set](#2-v1-feature-set)
3. [Locked decisions](#3-locked-decisions)
4. [Architecture reuse ledger](#4-architecture-reuse-ledger)
5. [Data model](#5-data-model)
6. [Shared-schemas plan](#6-shared-schemas-plan)
7. [Server plan](#7-server-plan)
8. [Client plan](#8-client-plan)
9. [Open questions / iteration points](#9-open-questions--iteration-points)
10. [Build phasing](#10-build-phasing)
11. [Out of scope / future](#11-out-of-scope--future)
12. [File tree — adds & edits](#12-file-tree--adds--edits)

---

## 1. The higher view

Supplies and reagents look like twins, but they differ on one axis that changes the model: **for a
reagent, the lot is the unit of truth, not the SKU.** A supply asks "how many boxes of gloves." A
reagent asks "which *lot* of this antibody is this, when does *it* expire, when was *it* opened, is
*it* the one I should grab next." Expiry, safety, and traceability attach to the lot.

So: **reagents = the supplies inventory model + a lot subsystem + chemistry/safety fields + a
lab-configurable attribute system + expiry alerting.** Everything else is inherited.

The suite is already stubbed: a disabled `reagents` tab in `LabManagementPage.tsx` (Biohazard icon,
`/lab/reagents`). We flip it on at the end.

---

## 2. v1 feature set

- **Reagent catalog** — SKU-level metadata (name, manufacturer, catalog #, vendor) + chemistry
  (CAS #, concentration + unit, physical form, grade) + safety (hazard class, storage conditions).
- **Per-lot inventory with expiration** — the core. Each lot: quantity, expiration, received date,
  opened date, location, status. On-hand stock = sum of lots.
- **Consumption & stock ledger** — received / consumed / disposed / count-adjusted, append-only,
  with void/reversal. FEFO (first-expired-first-out) consumption.
- **Dual alerting** — **low-stock** (reorder, inherited from supplies) **and** **expiry**
  (expired + expiring-soon, net-new). Both surface in the tab and drive a badge on rows.
- **Storage by location** — named zones (fridge / freezer / cabinet). Storage *conditions* (−20 °C
  etc.) are a seeded item attribute (§5.4), not a location property.
- **Lab-configurable attributes** — the lab defines attributes (Fluorophore, Host, Clone, Isotype…)
  with curated value lists, then filters/sorts/searches reagents by them. Fluorophore is the poster
  case: "what fluorophores do I have in stock" → build a flow-cytometry panel.
- **Safety documents** — SDS attachments + hazard classification.
- **Barcodes / labels** — item + per-lot bottle labeling & scan, on a shared barcode core (§4.4).
- **Packaging levels** — case → box → bottle unit-of-measure hierarchy.
- **2-level categories + bulk operations** — inherited.
- **Kits (bones only)** — v1 tracks a kit as a single reagent/lot; true kit→component composition
  is v2.

---

## 3. Locked decisions

| # | Decision | Choice |
|---|----------|--------|
| D1 | Lot/expiry model | **Full per-lot inventory.** `reagent_lots` is the stock unit; stock = SUM(lots); FEFO consume; per-lot expiry alerts. |
| D2 | Optional subsystems | **All in v1:** barcode/label, packaging levels, SDS + hazard safety, storage locations, reorder. |
| D3 | Alerting | **Both** low-stock and expiry alerts. |
| D4 | Type-specific attributes | **Lab-configurable custom-attribute system** with controlled vocabularies, filterable/sortable — *not* a hardcoded per-type schema. Its own definition/option/value tables (§5.4), deliberately **not** the CHECK-constrained lookups table. |
| D5 | Kits | **Single item in v1**, composition deferred to v2 (bones captured below). |

---

## 4. Architecture reuse ledger

The mandate: **use every bit of architecture already available.** Four buckets.

### 4.1 Reuse unchanged (free)

**Server**
- `domain/entities/Category.ts`, `Document.ts` — abstract bases; add thin `ReagentCategory` /
  `ReagentDocument` subclasses (ID prefix only).
- `domain/repositories/CategoryRepository.ts` — generic `CategoryRepository<T>`; reuse via a new
  `REAGENT_CATEGORY_TABLES` constant.
- `infrastructure/repositories/CategoryRepository.ts` (impl), `DocumentQueries.ts`,
  `database/mappers/CategoryMapper.ts`, `DocumentMapper.ts` — generic; reuse with reagent table names.
- `application/guards/CategoryGuards.ts` — two-level depth rule, domain-agnostic.
- `application/services/executeBulk.ts` — bulk runner `{ succeeded, failed[] }`.
- `domain/utils/generateId.ts`, `toDomainDate.ts`; `domain/types/fieldChangeTypes.ts` (audit diffing).
- `domain/events/DomainEvent.ts` + `DomainEventMap.ts` (register reagent events here).
- `AccessControlService` (admin gating), `EventBus`.
- `presentation/controllers/BaseController.ts` (`extractLabId`/`getAuthenticatedUser`),
  `presentation/utils/errorHandler.handleControllerError`, `ResponseBuilder`,
  `routes/RouteModule` + `RouteRegistry`, `middleware/requestValidation.ts`
  (`validateBody`/`validateParams`), auth + rate-limit + sanitize middleware.
- `infrastructure/database/migrations/migrationRunner.ts` + ordered `index.ts`.
- DI: `RepositoryFactory` + `ServiceContainer` + per-domain module pattern.

**Shared-schemas**
- `utils/dateFields.ts` — `optionalDateOnlyField` for expiration / opened / received dates.
- `utils/stringFields.ts` — `optionalText()` / `patchText()` (equipment uses these; reagents should
  too, for trim + blank-normalisation on create/patch requests).
- **Tubes concentration handling** — `tubes/tubeValidation.ts` `concentrationPreprocessor(Nullable)`
  (parses `1.5e6` scientific notation) + `concentrationUnitRefinement` (both-or-neither rule);
  `tubes/tubeFormatters.ts` `formatConcentrationDisplay`. Reuse the *pattern* for the reagent
  concentration field; reagents get their own unit set (see §6).

**Client**
- `shared/ui/components/inventory/*` — `CategoryTreePanel`, `CategoryModal`,
  `CategoryHierarchySelect`, `BulkCategoryTreeSelector`, `ItemRowShell`, `SortControls`
  (generic over structural shapes — satisfy the shape, inject callbacks/labels).
- `shared/ui/components/tree-lines/*` (auto), `shared/ui/components/overlays/DocumentLinkModal.tsx`.
- `shared/utils/collectMatchingCategoryIds.ts`, `compareByOrderThenName.ts`.
- All `@shared/ui` chrome: `ConsolePanel`, `PanelHeader`, `SearchInput`, `Button`, `ConfirmDialog`,
  `ScrollArea`, `OverflowMenu`, etc.
- `AppDashboard` routing (lazy-loads `/lab/*`) — no change.

### 4.2 Clone from supplies (identical structure, new identity)

Per the non-negotiable two-catalog rule (AGENTS.md §Equipment↔Supplies): reagents get their **own**
item type / repo / service / schemas. Share *behaviour/shape*, never *identity*.

- **Server:** `ReagentItem` entity, `ReagentItemRepository` (interface + Postgres impl),
  `ReagentLocation` entity + repo, `ReagentApplicationService`, `ReagentDto`, `ReagentEvents`,
  `ReagentModule` (DI), `ReagentController`, `ReagentRouteModule` (`/api/reagents`), item/location/
  lot/transaction/barcode/packaging mappers.
- **DB:** `027_create_reagents.ts` migration.
- **Shared-schemas:** new `reagents/` module (category + document schemas duplicated by design; new
  item + lot + transaction + barcode + packaging + bulk + reorder + attribute surface).
- **Client:** `domains/reagents/` — service, query + mutation hooks, `ReagentsTab`, item row / info /
  form, transaction form + timeline + void modal, low-stock panel + reorder modal, bulk modal + tabs,
  locations modal, ~4 thin barcode wrappers over the shared core (§4.4), status util;
  `queryKeys.reagents` block.

### 4.3 Genuinely new (the reagent delta)

- **`reagent_lots`** — per item×lot×location stock with expiration/opened/received/status. Replaces a
  separate `reagent_stock` table — the lot *is* the stock row (supplies' `supply_stock` analogue).
- **New item columns** — `reagent_type`, `cas_number`, `concentration(+unit)`, `expiry_warning_days`
  (hazard / form / grade / storage are seeded **attributes**, §5.4 — not columns).
- **Expiry alerting** — new queries (`expiring-soon`, `expired`), a domain event, a client
  `ReagentExpiryAlertPanel`, expiry sort/filter.
- **Lab-configurable attribute system** — `reagent_attribute_definitions` +
  `reagent_attribute_options` + `reagent_attribute_values`; admin CRUD UI; dynamic form fields;
  attribute-based list filtering. (§5.4)
- **SDS document typing** — small additive `docType` on the shared Document (decided; §7).
- **New lookup categories + Catalog group** (§8.4).

### 4.4 Shared extractions (pre-work — DRY, not duplication)

Verified reuse wins that happen *before* (or with) reagents, so we share instead of clone:

- **Barcode render/print core → `shared/ui/components/barcodes/`.** The supplies "barcode subsystem"
  is really **8 domain-agnostic files** (label, sheet templates, print styles, sheet modal/preview,
  single print, `PrintableLabel` type, the `placeLabelsOnSheets` test) mis-prefixed `Supply` — zero
  supply imports. Extract them (drop the prefix), rewire supplies' ~4 import sites, and both catalogs
  reuse them. Reagents adds only ~4 thin coupled wrappers. Mirrors the existing `inventory/` shared
  precedent. **Not** a 12-file clone (~1,100 lines saved).
- **`packagingChain.ts` → `shared/utils/`.** Already generic and import-free but misfiled under
  supplies. Move it, re-import from supplies, reuse for reagents. No clone.
- **`daysUntil` / `isExpiringSoon` → `shared/utils/` (new, small).** No days-until helper exists;
  build one on the existing `normalizeDateString` + `MS_PER_DAY` primitives (optionally refactor
  equipment's `resolveMaintenanceDue` onto it). Reagent expiry + equipment maintenance both use it —
  don't copy equipment's math or reach into its domain.
- **`CategoryTreePanel` sort union** — sorting the tree by expiry/stock means additively widening the
  shared `sortField` union + `switch` (benefits all catalogs) or pre-sorting before handoff.
- **Barcode-type enum** — a plain string enum (`internal`/`manufacturer_sku`/`upc`), no
  identity-safety concern → promote to a shared schema rather than duplicate per catalog.
- **Unit registry → new shared module `packages/shared-schemas/src/units/` (§6).** The dimension-tagged
  registry + `formatQuantity` + `reagent_custom_units` supplement; tubes migrate onto it and reagents
  build on it — Phase-0 shared work, not per-catalog.

---

## 5. Data model

Mirrors the 8 supply tables, minus `reagent_stock` (folded into `reagent_lots`), plus the lot,
attribute, and custom-unit subsystems. All top-level tables carry `lab_id TEXT NOT NULL REFERENCES labs(id)`; child
tables scope through their parent item. Migration `027_create_reagents.ts`, appended to
`migrations/index.ts`.

**FK on-delete (matches supplies/equipment; lab deletion is unsupported/soft):** `lab_id → labs(id)`
with **no ON DELETE** (restrict — a lab can't be dropped while rows exist); `category_id →
reagent_categories` and the category `parent_id` self-ref use **RESTRICT**; child tables (lots,
transactions, barcodes, documents, packaging, attribute values) → `reagent_items(id)` **ON DELETE
CASCADE**. The 027 migration also re-drops/re-adds the `lookup_values_category_check` constraint to add
the reagent lookup categories (that constraint currently lives in migration 021).

### 5.1 Core (clone of supplies)

- **`reagent_categories`** — shape shared with supply/equipment categories (id, lab_id, name,
  parent_id nullable self-FK, sort_order, timestamps; partial-unique top/sub name constraints).
- **`reagent_locations`** — id, lab_id, name, description, sort_order, timestamps,
  `UNIQUE(lab_id, name)`. No temperature/condition column — storage conditions are a seeded **item**
  attribute (§5.4), not a location property.
- **`reagent_items`** — see §5.3.
- **`reagent_transactions`** — append-only ledger. Clone of `supply_transactions` **plus `lot_id`**:
  id, item_id, `lot_id`, location_id, lab_id, type CHECK
  (`received`/`issued`/`disposed`/`count_adjustment`/`void_reversal`), quantity_change,
  quantity_after, po_number, cost, performed_by, notes, created_at, voided_at/by/reason,
  related_transaction_id (self-FK). lot_number/expiration_date move to `reagent_lots`.
- **`reagent_documents`** — shared Document shape **+ optional `doc_type`** (`sds` / `spec_sheet` /
  `coa` / `protocol` / `other`), added to the *shared* Document (§7) so all three catalogs gain it
  additively.
- **`reagent_barcodes`** — like `supply_barcodes` **plus a nullable `lot_id`** (both-level model):
  `manufacturer_sku` / `upc` barcodes sit at the **item** level (`lot_id` NULL — identify the product);
  auto-generated `internal` barcodes sit at the **lot** level (`lot_id` set — printed per lot on receive,
  identify the physical bottle). Globally-unique value, is_primary, label. Resolve returns the item and,
  when `lot_id` is set, the lot (→ its expiry / remaining).
- **`reagent_packaging_levels`** — clone of `supply_packaging_levels` (unit_name, quantity,
  parent_unit; `UNIQUE(item_id, unit_name)`).
- **`reagent_custom_units`** *(new — not a supplies clone)* — the lab-scoped custom-unit supplement (§6): `id` (`rcun`), `lab_id`,
  `label`, `kind`, `sort_order`, timestamps; `UNIQUE(lab_id, label)`. Created by migration 027 with the
  other reagent tables.

### 5.2 Lot subsystem (the extension) — `reagent_lots`

The stock unit. Replaces a separate stock table.

| column | type / notes |
|---|---|
| id | TEXT PK (`rlot`) |
| item_id | TEXT NOT NULL REFERENCES reagent_items(id) ON DELETE CASCADE |
| location_id | TEXT NOT NULL REFERENCES reagent_locations(id) ON DELETE RESTRICT |
| lot_number | TEXT |
| quantity | NUMERIC NOT NULL DEFAULT 0 (in the item's `stock_unit` — this is the "amount", §5.7) |
| expiration_date | DATE |
| opened_date | DATE |
| received_date | DATE |
| concentration | NUMERIC NULLABLE (per-lot override of the item concentration; e.g. antibody titer) |
| concentration_unit | TEXT NULLABLE |
| status | TEXT (`active` / `depleted` / `disposed`) — `expired` is derived, never stored (see note) |
| created_at / updated_at | TIMESTAMPTZ DEFAULT NOW() |

- On-hand = `SUM(quantity)` over active lots (per item, or per item×location).
- **FEFO consume (default order):** issue draws from the earliest-expiring **non-expired** lot first
  (earliest `expiration_date >= today`). **Expired lots are never auto-drained** — a single issue may
  offer an explicit "include expired" path (with the acknowledgment), while **bulk issue skips expired
  entirely** (it can't prompt), failing a line with a server-owned message if only expired stock remains.
- **Expiry alerts:** query lots with `expiration_date <= now + window` and `quantity > 0`.
- Transactions reference the lot they moved; receiving with a new lot number creates a lot row.
- `UNIQUE(item_id, location_id, lot_number)` (a lot is one row per location).

> **Modeling note:** a lot is a **DB row + mapper + repo row-type**, not a full domain entity —
> matching how supplies models stock/transactions (only Item/Category/Document/Location are entities).
> FEFO ordering and expiry-status derivation live in the application service (+ a pure, unit-tested
> helper), not as entity transition methods.
>
> Stored `status` is `active` / `depleted` / `disposed`; **"expired" is derived at read-time**
> (`expiration_date < today`), never stored — **no cron/scheduler**. **No overdraw:** issuing more than
> on-hand errors with a server-owned "insufficient stock" message. **Expired lots stay in stock and
> usable** — flagged, never auto-excluded or blocked (fluorescent antibodies etc. often work well past
> an underestimated expiry, and a researcher may knowingly use one at their own risk). Consuming an
> expired lot needs an explicit acknowledgment; reorder / low-stock counts total on-hand, and the expiry
> panel flags expired independently.

### 5.3 `reagent_items` (core + chemistry/safety)

Common columns cloned from `supply_items` (name, manufacturer, catalog_number, vendor_name,
vendor_catalog_number, stock_unit, reorder_threshold(+unit), reorder_quantity(+unit), unit_price,
description, notes, status, category_id, timestamps) **plus reagent-specific real columns:**

| column | type / notes |
|---|---|
| reagent_type | TEXT (lookup-backed; the discriminator — scopes which attributes apply; antibody/enzyme/buffer/oligo/stain/kit/…) |
| cas_number | TEXT |
| concentration | NUMERIC (reuse tubes preprocessor pattern) |
| concentration_unit | TEXT (shared unit registry, §6) |
| expiry_warning_days | INTEGER NULLABLE (per-item override of the lab default expiry window; §9) |

**Hazard class, physical form, grade, and storage conditions are NOT columns** — they're **seeded
attributes** (§5.4), so the lab can extend/reorder their option lists. Of the chemistry/safety
candidates, only `reagent_type` (the attribute-scoping discriminator), `cas_number`, and
`concentration(+unit)` stay columns (alongside the alerting override `expiry_warning_days`), because
they carry structural/formatting semantics the attribute system doesn't.

`concentration` is **optional** (many reagents ship as a pure substance or an amount you dilute
yourself) and may be **overridden per lot** (antibody lots are titered individually — §5.2).
**Amount** ("500 g", "100 µg") is not a separate field — it's the **lot quantity in a physical
`stock_unit`** (§5.7).

**Deliberately NOT cloned from `supply_items`:** `properties[]` (superseded by the attribute system —
keeping it would be a parallel metadata system) and `base_item_name` / `current_lot_number` (no
discussed need; lots are first-class). Excluding them is the no-parallel-systems rule, not an oversight.

Status enum: reuse supplies' `active` / `discontinued` / `archived` (archive if it has ledger
history, else hard-delete).

> **Note:** `reagent_items` holds **no quantity** — quantity lives in `reagent_lots`. `current_lot_number` is dropped in favour of real lot rows.

### 5.4 Attribute subsystem (D4) — lab-configurable, filterable

The lab defines attributes and their allowed values; reagents carry values; the list filters on them.
Runtime-configurable (no migration to add "Fluorophore"), so it can't ride the CHECK-constrained
`lookup_values` table — it gets its own three tables.

- **`reagent_attribute_definitions`** — id (`radf`), lab_id, name ("Fluorophore"), value_type
  (`select` / `multi_select` / `text` / `number`; `date` / `boolean` deferred until a real use case),
  applies_to_type (nullable
  reagent_type scope — e.g. Fluorophore applies to antibodies; null = all), sort_order, timestamps,
  **`is_system`** (seeded defaults the lab may extend/reorder but not delete),
  **`system_key`** (stable slug for seeded defs — e.g. `hazard_class` — so code finds them without
  matching display names; null for user-created),
  **`prompt_on_form`** (render blank by default vs add-on-demand — see *Form behaviour* below).
- **`reagent_attribute_options`** — id (`rato`), definition_id FK, value ("FITC"), sort_order — the
  curated vocabulary for select/multi_select attributes (the "colors available to you").
- **`reagent_attribute_values`** — id (`ratv`), item_id FK, definition_id FK, and a value column set
  (`value_option_id` FK for select/multi_select, `value_text`, `value_number`) — one
  populated per row by type. Normalized (not JSONB) for **referential integrity**: a `value_option_id`
  FK means renaming/removing a Fluorophore option flows to every item via the join, not a JSONB rewrite.

**Why normalized, not the JSONB blob first sketched:** referential integrity to the option rows (FKs
that cascade on rename/delete) and clean admin management of the definition/option vocabulary — **not**
server-side list filtering. **Filtering, sorting, and searching the list run client-side**, matching
supplies/equipment (all in-memory in `CategoryTreePanel`); the list row carries a compact
`attributeValues` summary (§6) so the filter bar has what it needs. JSONB would lose the option FKs.

**Form behaviour (columns vs attributes — the tedium question).** Real **columns** (reagent_type,
cas_number, concentration, amount/stock_unit) always render on the form — that's why they're kept to
the near-universal few. **Attributes are add-on-demand by default:** the lab's definitions form a
*palette*; on a reagent form the user clicks "add attribute", picks the relevant one (scoped by
`applies_to_type`, so antibody-only attributes never clutter a buffer), and fills a value. Only
populated attributes show. Each definition's **`prompt_on_form`** flag overrides this — leave it off
and the attribute is purely opt-in; turn it on to pre-render it blank (a lab that wants to
*encourage* hazard entry promotes Hazard Class to always-prompt). Nothing is required in v1, so forms
never force busywork.

**Seeding:** ship default **system** definitions per lab — **Hazard Class**, **Physical Form**,
**Grade**, **Storage Conditions** — with seeded options (Hazard: GHS classes; Form:
liquid/powder/lyophilized/solution; Storage: −20 °C / 4 °C / RT / desiccated), rendered add-on-demand,
extendable/reorderable, undeletable (`is_system`); the safety badge resolves hazard via
`system_key = 'hazard_class'`, not display name. **Seeding hook (decided):** no per-lab seeding exists
today (only a storage-config default), so seeding rides a small new step in `CreateLabCommandHandler`
(parallel to `ensureDefaultForLab`) plus a one-time backfill migration for existing labs.

### 5.5 Kits (bones, D5)

v1: a kit is a normal `reagent_item` (`reagent_type = 'kit'`) with one lot/expiry; its components are
listed via attribute values or notes. v2 adds `reagent_kit_components` (per-component lot + expiry;
kit expiry = MIN(component expiries)). No v1 schema commitment beyond the `kit` reagent_type value.

### 5.6 ID prefixes

`ritm` item · `rcat` category · `rdoc` document · `rloc` location · `rlot` lot · `rtxn` transaction ·
`rbcd` barcode · `rpkg` packaging · `radf` attr-def · `rato` attr-option · `ratv` attr-value ·
`rcun` custom-unit.
(Internal barcode value format mirrors supplies' `SITM-<nanoid>` → `RITM-<nanoid>`.)

### 5.7 Amount vs concentration

Two different axes, both optional, no conflict:

- **Concentration** — a *ratio* (mM, mg/mL, %, U/mL). A property of the substance. Item-level, with
  an optional per-lot override for reagents titered per lot (antibodies). Often absent — a bottle of
  pure powder has no meaningful concentration until dissolved.
- **Amount** — *how much you physically have* (500 g, 100 µg, 5 mL). Simply the **lot quantity** in a
  physical `stock_unit`; consuming decrements it. No separate field.

Example — "500 g bottle of 100 % EtOH": `stock_unit = g`, lot `quantity = 500`, `concentration = 100`,
`concentration_unit = %`. Example — "100 µg antibody, concentration not stated": `stock_unit = µg`,
lot `quantity = 100`, concentration null (set later if you titer/dilute).

**Deferred (v2): derived working stock.** Taking a stock lot and making a diluted/aliquoted working
lot at a new concentration is a real workflow but a larger feature (parent→child lots, like kits).
v1 handles it as a manual new-lot entry.

---

## 6. Shared-schemas plan

New module `packages/shared-schemas/src/reagents/` (`reagentSchemas.ts` + `index.ts`), registered in
the root `src/index.ts` (flat, explicit re-exports — add a reagents block).

- **Duplicate by design:** `reagentCategorySchema` / `reagentDocumentSchema` (+ create/update/response)
  — byte-identical to supplies but distinct inferred types (prevents cross-repo assignment). The
  document schemas across all three catalogs gain an optional `docType` enum (additive; §7).
- **Item surface:** `reagentItemSchema` (common + chemistry/safety fields), `reagentItemWithStockSchema`
  (adds rolled-up on-hand + soonest-expiry + location names **+ a compact `attributeValues` summary**
  for the list row — so client-side filtering/sorting has what it needs), create/update requests
  (using `optionalText`/`patchText`), responses, `reagentItemDetailSchema`
  (item + lots + documents + barcodes + recentTransactions + packagingLevels + attributeValues).
- **Lot surface:** `reagentLotSchema`, create/adjust requests, response.
- **Transaction surface:** clone supplies (record / stock-count / void / bulk-void) with `lotId`
  and FEFO semantics; transaction-type enum (barcode-type comes from the shared enum, §4.4).
- **Attribute surface:** `reagentAttributeDefinitionSchema`, `reagentAttributeOptionSchema`,
  `reagentAttributeValueSchema` + create/update requests; a `reagentAttributeValueType` enum.
- **Alerts:** `reagentReorderListResponseSchema` (clone) + `reagentExpiryListResponseSchema` (new).
- **Units — shared registry (standard) + lab custom supplement (the tail), dimension-tagged.** A
  canonical code registry (`packages/shared-schemas/src/units/unitRegistry.ts`): curated entries
  `{ id, label, kind }` + a `formatQuantity(value, unitId)` helper (canonical spelling — `µ` micro
  sign, slash form `mg/mL`, one space: `1.5 mM`, `500 g`). `kind` tags the dimension (mass · volume ·
  molarity · mass-conc · count-conc · percent · activity · fold · cell-conc · count). **Each field
  accepts a filtered subset**, so nothing bloats:
  - `concentration_unit` → ratio kinds (molarity, mass-conc, count-conc, percent, activity, fold)
  - `stock_unit` / amount / reorder units → absolute kinds (mass, volume, activity, count)
  - tubes concentration → cell-conc only (`c/v`, `c/mL`) — dropdown unchanged
  Standard units are code-fixed and canonically formatted. **Escape hatch for the oddball tail**
  (`beads/50 µL`, units nobody enumerated): a lab-scoped **custom unit** — a row in a new
  `reagent_custom_units` table (`id`, `lab_id`, `label`, `kind`, `sort_order`), added once by a lab
  manager, reused across the lab, rendered verbatim (no auto-conversion). The dropdown =
  registry ∪ the lab's customs, filtered by kind — bounded (only what the lab uses), controlled
  (managed list, not per-item free text), consistent. **Reagents only**; tubes stay fixed. Reuse the
  tubes `concentrationPreprocessor` (sci-notation) + both-or-neither refinement for the concentration
  pair. See §5.7 and §9. **Tubes migrate onto this registry** (confirmed).
- **Lookup categories:** add reagent categories to `lookups/lookupSchemas.ts` `LOOKUP_CATEGORIES`
  (and the other touch-points — see §8.4 / §12).

Per-module barcode/packaging/bulk schemas clone supplies. **No server-side filter/criteria schemas** —
attribute + expiry filtering runs client-side (in-memory) like supplies/equipment, fed by the compact
`attributeValues` + soonest-expiry on the list row. (Server filtering stays a scale-only future option.)

---

## 7. Server plan

Mirror the supplies *surface*, authored to the Donor exemplars (see Authoring standard). Splice in
lots, attributes, expiry.

- **Entities (4 only — mirror supplies):** `ReagentItem`, `ReagentCategory`, `ReagentDocument`,
  `ReagentLocation`. Lots, transactions, barcodes, packaging levels, and attribute
  definitions/options/values are **DB rows + mappers + repo row-types**, not entities (supplies models
  stock/transactions the same way). No `updateConcentration` (general `update()` covers it); no lot
  transition methods.
- **Repository interface** `ReagentItemRepository` — items (with lot rollup), lots (find/save/adjust,
  FEFO pick, expiring-soon query), documents, barcodes, transactions (atomic lot-aware record/void),
  packaging, reorder + expiry queries, attribute defs/options/values CRUD, custom-unit CRUD, lookup
  rename/count cascades (only `reagent_type`/`vendor`/`manufacturer` — not stock-unit, now registry-backed).
  `ReagentLocationRepository`.
- **Postgres impl** — the atomic `recordTransaction` writes a **lot** (not a stock row): received →
  find-or-create lot + increment; issued/disposed → FEFO decrement across lots; count_adjustment →
  reconcile a lot. Reuse generic `CategoryRepository` + `DocumentQueries`. No `ReagentCategoryMapper` /
  `ReagentDocumentMapper` files and no `ReagentCategoryRepository` file (map/build inline, per supplies).
- **Application service** `ReagentApplicationService` — the supply use cases (categories, locations,
  items, documents, barcodes, packaging, stock ops, reorder) + new: lot management, `getExpiringSoon` /
  `getExpired`, attribute definition/option/value CRUD, FEFO issue, custom-unit CRUD.
  **Write access (decided):** **admin-only, mirroring supplies/equipment** — every write calls
  `requireAdminAccess`. A delegated non-admin "operator" tier is intentionally *not* built here; it's
  deferred to a separate cross-catalog permissions project (§11) so reagents/supplies/equipment stay
  consistent rather than reagents growing a one-off role.
- **Bulk ops** — bulk receive, **issue** (FEFO across lots per item), reassign-category, archive, void.
  Bulk issue is the one net-new bulk path beyond supplies (supplies has no lot layer); its FEFO decrement
  reuses the single-issue helper per item.
- **DTO** `ReagentDto` — lot/attribute mappers; detail aggregate = item + lots + documents + barcodes +
  recentTransactions + packagingLevels + attributeValues.
- **Error text (server-owned, per AGENTS.md):** net-new reagent 4xx messages are self-contained on the
  server and shown verbatim — insufficient stock (FEFO overdraw), delete-blocked-by-transaction-history,
  lot-not-found. The client never rebuilds them.
- **Events** `ReagentEvents` (register in `DomainEventMap`) — only events with a real emitter, mirroring
  supplies: item created/updated/archived/deleted, category/document add/remove, stock
  received/issued/disposed/count-adjusted/voided, bulk. **Dropped as speculative:** `ReagentExpiringSoon`
  (a time condition = a query, not an event) and lot/attribute-definition "change" events until a real
  need. Keep the set lean — each event costs a subscribe + handler in the central audit handler (below).
- **Audit wiring (central-file edits, required — not automatic):** the `EventBus` dispatches only to
  explicit subscribers. For reagent mutations to hit `audit_log`, EDIT
  `application/event-handlers/AuditEventHandler.ts` (one `subscribe(...)` + one `handleReagent*` per
  event) and `domain/events/DomainEventMap.ts`. No `AuditModule` / `index.ts` / `InMemoryEventBus` change.
- **DI** — `RepositoryFactory` getters (register in `getRepositories()` **and** `buildRepositories()`),
  `buildReagentCategoryRepository` helper, new `di/modules/ReagentModule.ts`, wire
  `getReagentController()` into `ServiceContainer` (field + `getReagentModule()` + public getter).
- **Presentation** — `ReagentController` + `ReagentRouteModule` (base `/api/reagents`, `authenticate`
  only, matches supplies), register in `index.ts` (controller getter ~line 160, route registration
  ~line 216), Http-alias schemas in `presentation/validation/httpValidationSchemas.ts`.
- **Tests (calibrated to repo norms — sparse, targeted):** co-located `*.test.ts` unit tests for the
  genuinely novel pure logic (FEFO ordering incl. the non-expired-first rule, expiry computation) at the
  owning layer (mirror `SupplyApplicationService.getBulkBarcodes.test.ts`); one lab-scoping/query
  integration test in `server/tests/integration/` (mirror `supplyChildLabScoping.test.ts`) with reagent
  seeds in `tests/integration/setup/factories.ts`; the client-side attribute-filter util gets a Vitest
  test. **No** controller/route tests; no full-service coverage.
- **Shared-code touch (`docType`)** — additive optional field on `domain/entities/Document.ts`,
  `infrastructure/repositories/DocumentQueries.ts`, `database/mappers/DocumentMapper.ts`. The reagents
  migration creates `reagent_documents` with `doc_type` inline; a **separate** migration
  (`028_add_document_type.ts`, one concern) ALTERs the existing `equipment_documents` /
  `supply_documents`. Each catalog's document schema gains the optional enum.

New route groups beyond supplies: `GET /expiring-soon`, `GET /:id/lots` + lot ops,
`/attribute-definitions` CRUD, `/attribute-definitions/:id/options` CRUD, `/custom-units` CRUD, and
attribute-value writes on items. **No filter params on `GET /`** — the list is filtered client-side.

---

## 8. Client plan

### 8.1 Reuse boundary

**Reuse as-is (satisfy the shape — verified):** `inventory/CategoryTreePanel`, `CategoryModal`,
`CategoryHierarchySelect`, `BulkCategoryTreeSelector`, `ItemRowShell`, `SortControls` (injected
options); `tree-lines/*`; `overlays/DocumentLinkModal`; tree utils; all `@shared/ui` chrome;
`AppDashboard` routing. Reagent items satisfy the `TreeItem` / `ItemRowShell` shapes structurally —
extra fields (lots, expiry, attributes) are ignored by the shells. (`SortControls` / `CategoryTreePanel`
take an additive sort-union edit only if the tree sorts by expiry/stock — §4.4 / §12; otherwise
reuse-as-is.)

**Reuse via extraction (shared, not cloned — §4.4):** the 8-file barcode render/print core (new
`shared/ui/components/barcodes/`), `packagingChain.ts` (→ `shared/utils/`), and the new
`daysUntil` / `isExpiringSoon` date helper.

**New reagent files, authored to standard (mirror supplies' shape, not its code):**
`domains/reagents/services/ReagentService.ts`; hooks (`useReagentQueries.ts` +
`useReagentMutations.ts` + `index.ts`); `ReagentsTab.tsx` (+ `index.ts` exporting only the tab);
`ReagentItemRow` (thin `ItemRowShell` wrapper); `ReagentItemInfoPanel`; `ReagentItemForm`; transaction
form + timeline + void modal; bulk modal + `bulk-update-tabs/*` (kept bulk ops only); locations modal;
`reagentStatus.ts`; and ~4 thin barcode wrappers (`ReagentBarcodeForm`, `ReagentBarcodeLinkDialog`,
`ReagentBarcodeScanInput`, `ReagentQuickScanBar`) over the shared core.

### 8.2 Net-new client

- **Lot UI** — lot list on the info panel (qty, expiry, opened, location, status), FEFO hint on the
  consume form, per-lot expiry badges.
- **`ReagentExpiryAlertPanel`** — pinned collapsible expiring-soon/expired table (sibling of the
  cloned `ReagentLowStockAlertPanel`). Both alert channels live in `ReagentsTab`.
- **`ReagentReorderList`** — the full reorder **modal** (sortable table + CSV export) opened from the
  low-stock panel, mirroring supplies' `SupplyReorderList` (panel and modal are two separate
  components — the panel imports the modal).
- **Attribute system UI** — dynamic attribute fields on `ReagentItemForm` (rendered from the lab's
  definitions), an attribute **filter bar** on the list (filter/sort by Fluorophore etc.), and admin
  CRUD for definitions + options (in the Catalog surface, §8.4).
- **`reagentExpiry.ts` util** — reagent-specific expiry **status/label** derivation, built on the
  shared `daysUntil` / `isExpiringSoon` helper (§4.4), not its own day-math. FEFO ordering is a shared
  pure helper the transaction form consumes.
- **Lot barcodes** — the reagent barcode wrappers add lot context the shared core doesn't: print an
  internal lot barcode on receive, and a scan of a lot barcode resolves to the lot (surfacing its
  expiry/remaining). Expired lots render an explicit flag; consuming one prompts an acknowledgment.
- **Accessibility** — net-new interactive components (lot panel, attribute add/remove fields, expiry
  panel, attribute filter) carry keyboard support per AGENTS.md (`role` / `tabIndex` / `onKeyDown`),
  matching the inventory-component pattern.

### 8.3 Query keys & nav

- `queryKeys.reagents` in `app/cache/queryKeys.ts` — `all(labId)` → `categories`, `items`, `detail`,
  `locations`, `transactions(labId,itemId)`, `reorderList`, **`lots`**, **`expiring`**,
  **`attributeDefinitions`**, **`customUnits`**.
- `LabManagementPage.tsx` — flip `enabled: true`, add `<Route path="reagents" element={<ReagentsTab/>}/>`.
- `AppHeader.tsx` — optional `/lab/reagents` quick-link.

### 8.4 Catalog / lookups integration

Two vocabulary mechanisms, one clear boundary:

- **Lookups** (system-defined, code-referenced, cross-entity semantics) — the multi-file update (~6 edit
  points across ~5 files; §12 is the authoritative list):
  (`lookupSchemas.LOOKUP_CATEGORIES`, `LookupValue.ts` type + `validate()` array, migration CHECK,
  `LookupValueApplicationService` usage/rename/delete branch + `CatalogTab` `CATEGORY_USAGE_LABELS`)
  plus a new `CatalogGroup` in `CatalogTab.tsx`. Reagent lookup categories (parallel to supplies):
  `reagent_type`, `reagent_vendor`, `reagent_manufacturer` (amount/concentration units come from the
  unit registry, §6 — not a lookup).
- **Attributes** (lab-defined, runtime-added, type-scoped, filterable) — hazard / form / grade /
  storage (seeded, `is_system`) *and* Fluorophore / Host / Clone / etc. (lab-added). Managed in the
  **`CatalogTab` subtree** (same surface as the lookup groups, richer editor); adding one is no code
  change. Custom units (§6) live here too.

**Rule of thumb:** if the *code* keys off it (reorder unit, vendor cascade, type scoping) → lookup;
if it's per-item metadata the lab curates and filters by → attribute.

---

## 9. Open questions / iteration points

### Resolved
- **Columns vs attributes** → hazard / form / grade / storage are **seeded attributes** (`is_system`),
  not columns. Attributes are **add-on-demand** with an optional `prompt_on_form` flag (§5.4) — forms
  stay lean and hazard can be *encouraged* without being forced. Columns stay minimal (reagent_type,
  cas_number, concentration, amount/stock_unit).
- **Amount vs concentration** → distinct axes (§5.7). Concentration is optional, item-level with an
  optional **per-lot** override. Amount is just the **lot quantity** in a physical `stock_unit` — no
  separate field.
- **Units** → shared dimension-tagged registry (standard, code-fixed, canonical) **+ a lab
  custom-unit supplement** (`reagent_custom_units`) for the oddball tail; per-field subset. **Tubes
  migrate onto it** (confirmed).
- **Oddball units** → `beads/mL` etc. Common count-concentrations become standard (`count-conc`
  kind); the truly rare (`beads/50 µL`, unforeseen) are lab-manager-added custom units, reused and
  rendered verbatim. Reagents only; dropdown stays bounded.
- **Expiry** → two tiers (expired / expiring-soon); lab default **90 days** + optional per-item
  `expiry_warning_days` override (confirmed). Per-lot not used.
- **SDS typing** → optional `docType` on the shared `Document` (additive).
- **Attribute value storage** → normalized EAV (JSONB rejected).

### Proposed unit lists — trim / add
- **Concentration (ratio):** Molarity `M, mM, µM, nM, pM`; Mass-conc `g/L, mg/mL, µg/mL, µg/µL,
  ng/µL`; Count-conc `beads/mL, cells/mL, particles/mL, IU/mL`; Percent `%`; Activity `U/mL`;
  Fold `X`. Anything rarer → lab custom unit.
- **Amount (absolute):** Mass `g, mg, µg, ng, kg`; Volume `L, mL, µL, nL`; Activity `U`; Count
  `vial, tube, each` (if wanted).
- Formatting: `µ` micro sign, slash form, one space; no auto-conversion.

### Decided in review
- **Consumption permission** → **admin-only for v1**, mirroring supplies/equipment (every write =
  `requireAdminAccess`). A delegated "operator" tier is deferred to a separate cross-catalog
  permissions project (§11) — building it only for reagents would fork the permission model.
- **Real-time** → **parity, none** (matches supplies; live updates are an easy future add).
- **Bulk issue** → **included** in v1 (FEFO across lots; reuses the single-issue decrement).

### Decided — final review pass
- **Barcodes** → **both levels.** Manufacturer/UPC at the item level; auto-generated internal barcodes
  at the **lot** level (printed on receive). `reagent_barcodes` gains a nullable `lot_id` (§5.1).
- **Expired stock** → **stays in stock and usable**, flagged not excluded (antibodies etc. often work
  past an underestimated expiry). Consuming expired needs an acknowledgment; reorder counts total
  on-hand; the expiry panel flags expired separately (§5.2).
- **Attribute seeding** → seed recommended system attributes at lab creation via a new
  `CreateLabCommandHandler` step + a backfill migration (`029`) for existing labs.
- **Expiry derivation / overdraw** → expired derived at read-time (no cron); no negative stock (§5.2).
- **Demo data** → none (parity; the seeded-demo lock covers reagent lookups automatically).
- **Lab-deletion FK** → lab_id restrict, category RESTRICT, item-children CASCADE (§5).
- **Lookup multi-place (~5 files)** → touch-points added to §12.

### Still parked
- **Lab-default expiry home** — existing lab config vs a small reagent-settings row (infra detail,
  resolve at build time). **Per-category** expiry tier: not v1 unless you want it.
- **`reagent_type` weight** — how hard it drives attribute scoping / grouping.
- **Opened shelf-life** — effective expiry = min(printed, opened + shelf-life)? adds
  `open_shelf_life_days`. Deferred unless wanted.
- **Global search** — supplies/equipment aren't in `search_vector`; reagents wouldn't be either
  unless we wire it (net-new).

---

## 10. Build phasing

Each phase ends green (build + typecheck + lint + tests) and is independently reviewable.

0. **Shared extractions (§4.4)** — move the 8-file barcode core to `shared/ui/components/barcodes/`
   and `packagingChain.ts` to `shared/utils/` (rewire supplies' imports), add `daysUntil` /
   `isExpiringSoon` + the unit registry. Pure refactor/additions; supplies stays green. Do first so
   reagents builds on shared code.
1. **Schema + DB foundation** — shared-schemas `reagents/` module (item/category/document/lot/
   transaction/attribute/custom-unit), migration `027_create_reagents` (+ `028_add_document_type`),
   lookup categories. No behaviour yet.
2. **Server core CRUD** — entities (4), repos, app service, DTO, events + **audit wiring**, DI,
   controller, routes for catalog/categories/locations. Lots + transactions + FEFO ledger. Unit-test
   the FEFO/expiry logic; one lab-scoping integration test.
3. **Alerts** — reorder + expiry queries/events + endpoints.
4. **Attribute system** — definitions/options/values + custom-unit **server CRUD** (their tables land
   in Phase 1), the lab-creation seeding hook + migration `029_backfill_reagent_attributes` (defaults
   for existing labs). (List filtering is client-side — Phase 7.)
5. **Client core** — service, hooks, `ReagentsTab`, item row/info/form, lot UI, category tree reuse,
   locations. Flip the tab on.
6. **Client stock + alerts** — transaction form/timeline/void, low-stock + expiry panels, reorder.
7. **Client attributes** — dynamic form fields, list filter bar, admin definition/option/custom-unit CRUD.
8. **Barcodes** — thin reagent wrappers over the Phase-0 shared core (not a clone).
9. **Bulk ops + polish** — kept bulk ops, CSV export, catalog group, header quick-link.

---

## 11. Out of scope / future

- **Kit composition** — `reagent_kit_components`, per-component lots, derived kit expiry (v2).
- **Derived working stock** — dilute/aliquot a stock lot into a child working lot at a new
  concentration (parent→child lots; sibling of kit composition).
- **Tube ↔ reagent traceability** — tubes already carry concentration/lotNumber; linking a tube to
  the reagent lot used is a natural future integration.
- **Global full-text search** wiring for reagents (and supplies/equipment).
- **Open-shelf-life** effective-expiry computation (if not pulled into v1).
- **Certificate-of-analysis / lot-document** attachments per lot (vs per item).
- **Delegated inventory permissions (cross-catalog "operator" tier)** — a follow-on project *after*
  reagents ships, applied uniformly to reagents + supplies + equipment (not one-off per catalog).
  Designed model to carry forward: a role between `user` and `lab_admin` (e.g. `lab_operator`) assigned
  in the admin Users tab, along **view / operate / govern** lines — User views; Operator does day-to-day
  stock + item/lot work; Admin governs taxonomy (categories/attributes/units), corrections (void/delete),
  and people/config. Cost: the role added across its ~4 enum layers + a role CHECK-constraint migration +
  the Users-tab role picker (binary → three-way), and each catalog's writes re-gated to the new tier.
  Deferred so v1 reagents stays admin-only and consistent with the other two catalogs.

---

## 12. File tree — adds & edits

`+` new file · `~` edit existing central/shared file. Names vetted against AGENTS.md conventions
(entity-first, established suffixes). Directories kebab-case.

### Shared-schemas — `packages/shared-schemas/src/`

```
+ reagents/reagentSchemas.ts     item/category/document/lot/transaction/barcode/packaging/attribute/custom-unit/bulk/reorder/expiry
+ reagents/index.ts              barrel
+ units/unitRegistry.ts          dimension-tagged registry + formatQuantity + custom-unit schema
+ units/index.ts
~ index.ts                       add reagents + units re-export blocks
~ tubes/tubeSchemas.ts           migrate onto the shared registry (cell-conc subset)
~ tubes/tubeValidation.ts        delegate formatting/refinement to the registry
~ tubes/tubeFormatters.ts        formatConcentrationDisplay → formatQuantity
~ lookups/lookupSchemas.ts       + reagent_type / reagent_vendor / reagent_manufacturer categories
~ equipment/equipmentSchemas.ts  optional docType on the document schema (additive)
~ supplies/supplySchemas.ts      optional docType on the document schema (additive)
```

### Server — `server/src/`

```
Domain
+ domain/entities/ReagentItem.ts
+ domain/entities/ReagentCategory.ts
+ domain/entities/ReagentDocument.ts
+ domain/entities/ReagentLocation.ts
+ domain/repositories/ReagentItemRepository.ts        interface + row-types (lot/txn/barcode/packaging/attr/custom-unit)
+ domain/repositories/ReagentLocationRepository.ts
+ domain/events/ReagentEvents.ts
~ domain/events/DomainEventMap.ts                     register reagent events
~ domain/entities/Document.ts                         optional docType (shared)
~ domain/entities/LookupValue.ts                      + reagent_type/vendor/manufacturer (LookupCategory type + validate array)

Infrastructure
+ infrastructure/repositories/ReagentItemRepository.ts
+ infrastructure/repositories/ReagentLocationRepository.ts
+ infrastructure/database/mappers/ReagentItemMapper.ts
+ infrastructure/database/mappers/ReagentLotMapper.ts
+ infrastructure/database/mappers/ReagentTransactionMapper.ts
+ infrastructure/database/mappers/ReagentBarcodeMapper.ts
+ infrastructure/database/mappers/ReagentPackagingLevelMapper.ts
+ infrastructure/database/mappers/ReagentLocationMapper.ts
+ infrastructure/database/mappers/ReagentAttributeMapper.ts   defs/options/values rows
+ infrastructure/database/mappers/ReagentCustomUnitMapper.ts   custom-unit rows
+ infrastructure/database/migrations/027_create_reagents.ts
+ infrastructure/database/migrations/028_add_document_type.ts
+ infrastructure/database/migrations/029_backfill_reagent_attributes.ts  seed defaults for existing labs
~ infrastructure/database/migrations/index.ts                 register 027 + 028 + 029
~ infrastructure/repositories/DocumentQueries.ts             docType column (shared)
~ infrastructure/database/mappers/DocumentMapper.ts          docType (shared)
~ infrastructure/di/RepositoryFactory.ts                     reagent getters + builder (both bundles)
+ infrastructure/di/modules/ReagentModule.ts
~ infrastructure/di/ServiceContainer.ts                      field + getReagentModule + getReagentController

Application
+ application/services/ReagentApplicationService.ts
+ application/dto/ReagentDto.ts
~ application/event-handlers/AuditEventHandler.ts            subscribe + handleReagent* per event
~ application/services/LookupValueApplicationService.ts      reagent usage/rename/delete branches + inject ReagentItemRepository
~ application/commands/LabCommands.ts                        seed default reagent attribute defs on lab creation (CreateLabCommandHandler)

Presentation
+ presentation/controllers/ReagentController.ts
+ presentation/routes/ReagentRouteModule.ts
~ presentation/validation/httpValidationSchemas.ts           reagent Http-alias block
~ index.ts                                                   controller getter + route registration

Tests  (co-located unit tests under src/; integration tests under server/tests/, NOT src/)
+ application/services/ReagentApplicationService.fefo.test.ts        (+ .expiry / .attrFilter as needed)
+ server/tests/integration/reagentLabScoping.test.ts
~ server/tests/integration/setup/factories.ts                       reagent seeds
```

### Client — `client/src/`

```
Shared extractions (Phase 0)
+ shared/ui/components/barcodes/BarcodeLabel.tsx
+ shared/ui/components/barcodes/BarcodeSheetModal.tsx
+ shared/ui/components/barcodes/BarcodeSheetPreview.tsx
+ shared/ui/components/barcodes/BarcodePrint.tsx
+ shared/ui/components/barcodes/sheetTemplates.ts
+ shared/ui/components/barcodes/barcodePrintStyles.ts
+ shared/ui/components/barcodes/barcodeSheetTypes.ts
+ shared/ui/components/barcodes/BarcodeSheetModal.test.ts
+ shared/ui/components/barcodes/index.ts
+ shared/utils/packagingChain.ts                    moved from supplies
+ shared/utils/dateExpiry.ts                         daysUntil / isExpiringSoon
~ domains/supplies/… (~5 barcode + packagingChain import sites)   rewire to shared
~ shared/ui/components/inventory/SortControls.tsx    widen sort union (if tree-sorting by expiry/stock)
~ shared/ui/components/inventory/CategoryTreePanel.tsx  + sortField case

Reagents domain — domains/reagents/
+ index.ts                                          exports ReagentsTab only
+ services/ReagentService.ts
+ hooks/useReagentQueries.ts
+ hooks/useReagentMutations.ts
+ hooks/index.ts
+ ui/components/ReagentsTab.tsx
+ ui/components/ReagentItemRow.tsx
+ ui/components/ReagentItemInfoPanel.tsx
+ ui/components/ReagentItemForm.tsx
+ ui/components/ReagentTransactionForm.tsx
+ ui/components/ReagentTransactionTimeline.tsx       (mirrors SupplyTransactionTimeline)
+ ui/components/ReagentVoidTransactionModal.tsx
+ ui/components/ReagentLotPanel.tsx                  lot list on the info panel
+ ui/components/ReagentLowStockAlertPanel.tsx
+ ui/components/ReagentReorderList.tsx               reorder modal + CSV export (mirrors SupplyReorderList)
+ ui/components/ReagentExpiryAlertPanel.tsx
+ ui/components/ReagentLocationModal.tsx
+ ui/components/ReagentAttributeFields.tsx           add-on-demand attribute inputs (mirrors EquipmentMaintenanceFields)
+ ui/components/ReagentAttributeFilterPanel.tsx      list filter by attribute
+ ui/components/ReagentBulkUpdateModal.tsx
+ ui/components/bulk-update-tabs/…                    kept bulk ops only
+ ui/components/barcode/ReagentBarcodeForm.tsx
+ ui/components/barcode/ReagentBarcodeLinkDialog.tsx
+ ui/components/barcode/ReagentBarcodeScanInput.tsx
+ ui/components/barcode/ReagentQuickScanBar.tsx
+ utils/reagentStatus.ts
+ utils/reagentExpiry.ts
+ utils/reagentAutocompleteOptions.ts               transaction-form item autocomplete (mirrors supplies)
+ utils/reagentAttributeFilter.ts                   client-side attribute/expiry filter predicate (+ Vitest test)

Admin / nav (central edits)
~ domains/admin/…/settings-modal/tabs/CatalogTab.tsx            reagent CatalogGroup + attribute/custom-unit admin
~ domains/lab-management/ui/components/LabManagementPage.tsx    enabled:true + <Route path="reagents">
~ app/cache/queryKeys.ts                                        queryKeys.reagents block
~ app/components/layout/AppHeader.tsx                           optional /lab/reagents quick-link
```

**Naming notes:** `Timeline` and `Fields` aren't in the canonical suffix list but match existing
siblings (`SupplyTransactionTimeline`, `EquipmentMaintenanceFields`) — sibling consistency wins.
Everything else uses canonical suffixes (Tab/Panel/Modal/Form/Row/Field). The attribute-definition +
custom-unit admin lives in the **`CatalogTab` subtree** alongside the reagent lookup groups (decided),
same surface as equipment/supplies catalog management — a richer editor than the plain lookup lists,
but the same home.
