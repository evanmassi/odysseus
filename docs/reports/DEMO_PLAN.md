# Public Demo Hardening — Implementation Plan

Plan for making the live deployment demo-able by anyone with a link — no passwords handed out, no
invite codes — without exposing the app to strangers or bots. This doc is the shared source of
truth; we iterate on it as we build.

**Status:** planning complete; implementation not started. Branch `update/demo`.

Every claim in this document — file paths, line numbers, foreign keys, required fields, guard
coverage, rate limiters, barrel usage — was verified against the codebase or the dev database rather
than assumed. Where something is deliberately left open it says so explicitly.

### Progress ledger — check off as each phase lands

- [x] Phase 0 — migration `037` + `is_seeded` threading (§2a)
- [ ] Phase 1 — containment guards + `DemoGuards.test.ts`, taxonomy lock, creation caps (§2b–2d).
      Split three ways on build: **1a** seeded-record protection ✅, **1b** taxonomy lock ✅,
      **1c** creation caps ✅
- [ ] Phase 2 — demo login endpoint + login-screen CTA (§1)
- [ ] Phase 3 — dataset + nightly reset (§3)
- [ ] Phase 4 — client lock affordance + demo banner (§4)
- [ ] Phase 5 — rate limiters on exports + catalog bulk routes (§5)

---

## Context

Odysseus is live on `main` (Vercel + Railway). The demo exists primarily as a portfolio piece
alongside a LinkedIn video. The hard requirement is containment: a stranger or a bot must not damage
the app, run up a bill, or reach anything outside the demo lab.

Three findings shape the work:

1. **The demo lab is empty.** In dev, `Ithaca Labs` (`is_demo = true`) holds 1 user, 1 researcher,
   19 seeded audit rows, and zero of everything else — tubes, donors, reagent items, supply items,
   equipment items, and locations all count 0. A visitor lands in a blank app. Populating it is the
   largest single task here.
2. **There is no way in.** Entry is `/auth/register-with-profile` behind an invite code, and
   `InviteCodeCommands.ts:76` deliberately blocks minting codes for a seeded demo lab.
3. **Nothing restores the lab.** Two things sound like they might and neither does: `unseedAll()`
   only flips `isSeeded` flags on storage config (`Storage.ts:701`), and the existing
   `ResetDemoDataCommandHandler` (`TankCommands.ts:201`) is a *wipe* — it deletes tubes and donors
   and strips visitor-added storage, but puts nothing back and never touches the three catalogs.
   Restoring is the capability that has to be built, on top of that handler (§3).

Already sound, no work needed: demo authority is lab-scoped (`User.isDemo` reads `_labIsDemo`,
`User.ts:583`); cross-lab reads funnel through `findByIdForRequester`, which widens only for
`system_admin`; there is **no file-upload infrastructure** in the server; the only wired
`EmailService` is `ConsoleEmailService` (`ServiceContainer.ts:156`), so the app cannot be a spam
relay; rate limiting is real (300/min global, 10/min auth) with `trust proxy: 1` set for Railway
(`index.ts:124`); bulk endpoints act on existing IDs capped at 100, so they cannot mass-create; and
demo users already get a raised session cap of 50 (`JwtSessionService.ts:50`).

**Decisions taken:** demo user is `lab_admin`; seeded content is delete-protected but freely
editable and movable, while visitor-created content is fully theirs to delete; every block reads as
a demo restriction, never a generic permission error; dataset is rich and hand-authored; reset runs
nightly and automatically.

---

## 1. Entry — one-click demo login

**Config.** Add an optional `demo: { username?, resetKey? }` block to the `ConfigurationService`
contract and its env implementation, following the existing optional-secret precedent of
`systemAdminSetupKey` (`EnvironmentConfigurationService.ts:107`). Both endpoints below 404 when
their key is unset, so dev and any self-hosted deployment are untouched.

**Endpoint.** `POST /api/public/auth/demo-login`, handled by a `demoLogin` method on
`PublicAuthController`. It resolves the account with the existing
`UserRepository.findByUsername(username)` and reuses the existing private `issueTokens(req, user)`
helper (line 244).

**Load-bearing detail, verified:** `findByUsername` selects through `USER_FROM`, which
`LEFT JOIN`s `labs` and aliases `l.is_demo AS lab_is_demo` (`UserRepository.ts:20-28`). That is what
populates `User._labIsDemo`, and therefore `user.isDemo` — the flag every guard in §2 checks first.
Had this lookup not joined `labs`, every demo guard would have silently no-opped and the whole
containment story would have been decorative. Any future change to how the demo user is resolved
must preserve that join.

**Extract the status checks rather than pasting them.** `login` inlines three
deactivated / suspended / approved checks across `PublicAuthController.ts:157-182`, each calling
`denyLogin`. `demoLogin` needs exactly the same gate, and copying 26 lines of security-relevant
branching into a second method is how the two drift apart later. Pull the block into a private
`assertUserCanLogIn(req, user)` and call it from both. The refactor is behaviour-neutral for `login`
and the diff is the gate — there is no existing test over that block.

Route guards: `this.authLimiter` (10/min, already constructed in `PublicRouteModule`) plus a hard
refusal when the resolved user is not `lab_admin` or their lab is not `is_demo`. That second check
is what stops a fat-fingered env var from minting a session for a real account. No `validateBody` —
the request has no body, and adding a schema with nothing to validate would be speculative.

**Response reuses the existing `AuthResponse`.** No new shared schema; a demo login is a login.

**The CTA needs a visibility condition, and the plumbing already exists.** With `DEMO_USERNAME`
unset — every local dev environment, and any self-hosted deployment — the endpoint 404s, so a
permanently-rendered button would be a broken control shipped to every developer. The client has to
know whether the demo is configured *before* login.

No new endpoint and no extra round trip: `/api/public/auth/first-time` is already prefetched during
bootstrap (`AppBootstrapService.ts:136`) and already consumed by `AuthGateway.tsx:42` — the exact
component that renders `AuthLoginModal`. Add `demoAvailable: boolean` to `FirstTimeResponse`
(server-side: "is a demo username configured"), and gate the CTA on it. Both ends of that schema
change land together, satisfying caller-first.

**Client.** `AuthService.demoLogin()` → a `demoLogin` action on `authStore`, consumed by
`AuthLoginModal`.

**Extract the post-auth commit; don't mirror it.** The `login` action's success path
(`authStore.ts:151-170`) builds `userWithActivity`, calls `sessionManager.setTokens`, and commits an
eight-field `set()`. A near-identical commit already appears again in the password-change completion
path, so `demoLogin` would be the third copy. Pull it into one internal helper that takes the auth
result and commits, and have all three call it. `demoLogin` itself is then genuinely small: call the
service, commit, handle the error — no password-change branch, since a demo login can't require one.

The CTA sits in the `login`
branch after the `Sign In` button (line 283) and above the "Don't have an account?" block (line
286): a thin `or` divider, then a full-width `Button` with `variant="secondary"` (a real variant —
confirmed in `Button.tsx`) reading `Explore the live demo`. Present and obvious, visually
subordinate to real sign-in. No marketing copy, no callout box.

---

## 2. Containment

### 2a. Per-row seeding for content

`isSeeded` exists only on storage config today. Extend it to the tables where visitors create their
own records, so seeded rows can be delete-protected while visitor rows stay fully theirs.

**Migration `037_add_is_seeded_to_content.ts`** — `is_seeded BOOLEAN NOT NULL DEFAULT FALSE` on
`tubes`, `donors`, `reagent_items`, `supply_items`, `equipment_items`, `reagent_transactions`,
`supply_transactions`. Child records (`reagent_lots`, `equipment_maintenance_log`) aren't lab-scoped
and derive protection from their parent.

Note the numbering gap: `033`/`034` were folded into earlier migrations pre-release and their IDs
are already recorded in dev's `schema_migrations`. **Never reuse them** — this is `037`.

The five item entities carry the flag; the two transaction tables have no entity (confirmed — no
transaction classes in `domain/entities/`), so their flag flows through mapper and DTO only.

**Guard.** Add to `DemoGuards.ts` beside the existing storage guards, matching their shape exactly
(no-op for non-demo users, first line):

```
rejectSeededItemDeletion(user, item: { isSeeded?: boolean }, label: string)
```

Structural parameter type, not a union of five entity classes — the same call AGENTS.md records for
`shared/ui/components/inventory/`: generic over a shape, never over a merged identity.

Wire into **destructive methods only**. Enumerated per service, because the three catalogs do *not*
share a destructive surface — AGENTS.md says the item surfaces only look alike, and they don't:

| Service | Methods |
|---|---|
| Reagent, Supply | `deleteItem`, `archiveItem`, `voidTransaction`, `bulkArchive`, `bulkVoidTransactions`, `removeDocument`, `removeBarcode`, `removePackagingLevel` |
| Equipment | `deleteItem`, `deleteMaintenanceEntry`, `removeDocument` |
| Tube | `deleteTube`, `bulkDeleteTubes` |
| Donor | `deleteDonor`, `deleteCollectionHistory` |

Equipment has no `archiveItem`, no transactions, and no `bulkArchive`/`bulkVoidTransactions` — its
bulk operations are `bulkLogMaintenance`, `bulkChangeStatus`, and `bulkRelocate`, all
non-destructive. Its `decommissionItem` is a status change and stays open; retiring a seeded
freezer is a workflow worth demoing, and the reset restores it.

**The `remove*` methods matter as much as the deletes.** They strip documents, barcodes, and
packaging levels off an item. Left unguarded, a visitor hollows out a seeded reagent — the item row
survives, but its barcodes and SDS links are gone. These are child records, so the guard keys on the
**parent item's** `isSeeded`, not on the child.

Every method above already takes `user: User`, and — verified — every one already **loads the entity
before destroying it**: `deleteItem` calls `getItemOrThrow(id, labId)` first
(`ReagentApplicationService.ts:302`), and the child-record removals load the parent the same way
(`removeDocument`, line 406). So the guard always has the object it needs to inspect, and insertion
really is one line after an existing load — no extra queries, no restructuring.

Leave `updateItem`, `recordTransaction`, tube moves, and maintenance logging alone — those are the
demo.

**`isSeeded` must round-trip through edits.** Visitors *can* edit seeded items, and `updateItem`
loads → mutates → `save()`s the entity. If the flag doesn't survive that round trip, the first edit
to a seeded record silently clears its protection and makes it deletable.

**As built, the flag is insert-only.** It appears in each `save()`'s INSERT column list but is
deliberately **absent from `ON CONFLICT DO UPDATE SET`**, exactly like `created_at`. An edit
therefore cannot rewrite it no matter what the entity carries, which makes the failure above
structurally impossible rather than merely avoided. Each of the five `save()` methods carries a
one-line comment saying so, because adding it to the update list "for completeness" is the obvious
well-meaning change that would break demo protection silently. The reset purges before it upserts,
so seeded rows always take the INSERT path and the flag still lands as `true`.

The flag is still threaded through the entity constructor and mapper `toRow`/`fromRow` — reads need
it for the guard and the client affordance. Cover the round trip in `DemoGuards.test.ts`.

### 2b. Lab-level lock for taxonomy

Categories, attributes, units, and locations don't need per-row precision — a visitor doesn't have
to delete a category to experience the app. Reuse the coarser pattern already proven at
`LookupValueApplicationService.rejectIfSeededDemo` (line 36): if the lab has seeded resources, lock
the surface for non-system-admins. Promote it into `DemoGuards.ts` so there is one home for it, and
apply to the three catalogs' category methods plus `AttributeApplicationService`,
`CustomUnitApplicationService`, and `LabLocationApplicationService`.

**Promoted as-is, not reshaped — decided against the sync variant this section first proposed.**
The original idea was `rejectIfTaxonomyLocked(user, config: Storage, surface)` with callers loading
the config, to keep `DemoGuards.ts` synchronous and dependency-free. That shape costs a storage-config
read on **every** category, unit, attribute, location, and lookup mutation in **every** lab — real
customer labs included — purely to answer a demo question, and it puts two or three lines at each of
24 call sites. The existing private guard already avoids exactly that by settling the question from
the user before touching the database. So it moves across unchanged in behaviour:

```
await rejectIfTaxonomyLocked(user, storageRepository, labId, surface)
```

One line per call site, and non-demo labs pay nothing. The trade is that this single function is
`async` and takes a repository interface while the rest of the module stays sync — a deliberate
exception, documented in its JSDoc, not a drift in the file's character. `DemoGuards.test.ts` and
`LookupValueApplicationService.seededDemo.test.ts` both assert the no-query path for real labs so
the property can't silently regress.

**The error type changed with it:** `ValidationError` (400) → `PermissionError` (403), matching every
other demo guard. Verified safe: no client code branches on 403, so the message still surfaces
verbatim through `getErrorMessage`.

**Prerequisite worth knowing: the lock keys on *storage* seeding.** `hasAnySeededResources()`
inspects only tanks, racks, and boxes — so the vocabularies stay editable until someone presses
**Seed Demo** for storage, no matter how much seeded content the lab holds. Inherited from the
guard's original form and left as-is, but it means provisioning the demo lab includes seeding
storage, or §2b silently protects nothing.

**This requires DI work not otherwise implied — on six services, not three.** Verified by grep:
`AttributeApplicationService`, `CustomUnitApplicationService`, `LabLocationApplicationService`,
`ReagentApplicationService`, `SupplyApplicationService`, and `EquipmentApplicationService` all have
**zero** references to `storageRepository`. Every one needs it injected and wired in the DI module
that builds it. Only `LookupValueApplicationService` already has it, as an optional constructor dep.

Locking taxonomy also means it never drifts — which is why §3 upserts rather than purges it.

### 2c. Creation caps

`DEMO_LIMITS_DEFAULTS` (`demoSchemas.ts:9`) covers only tanks/racks/boxes. Add `maxTubes`,
`maxDonors`, `maxItemsPerCatalog`, each with a sensible `.min()/.max()` on the schema. Without
these, one script at 300 req/min adds ~430k rows a day.

**These guards can't be shaped exactly like `enforceAddTankLimit`.** The storage guards count from
the already-loaded config in memory (`config.countNonSeededTanks()`); items have no in-memory
equivalent, so counting means a database call. Rather than make `DemoGuards` async and
repository-bearing — the same trap §2b avoids — **the caller queries the count and passes it in**:

```
enforceAddItemsLimit(user, lab, currentCount: number, adding: number)
```

**Count sources — as built, five new methods, not four.** The caps count **only what a visitor
added** (`WHERE lab_id = $1 AND is_seeded = FALSE`), matching how the storage limits already count
non-seeded tanks. Otherwise the seeded dataset would eat the visitor's budget and the numbers would
have to be set above the dataset size to mean anything. That makes the existing
`TubeRepository.countByLabId` unsuitable, so tubes get `countNonSeededByLabId` too — five methods
across tubes, donors, and the three item repositories.

**Shaped like §2b's guard, for the same reason.** `enforceDemoCreationLimit(user, labRepository,
labId, limit, countVisitorCreated, adding)` settles the demo question from the user and returns
before touching the database. The originally planned `(user, lab, currentCount, adding)` required the
caller to load the lab *and* run a `COUNT(*)` first — on every tube creation in every lab, the
busiest write path in the app. Bulk tube creation counts once for the batch and its per-tube calls
opt out via the existing `bulkOperation` flag.

**The entity needs no change** — `Lab.updateDemoLimits` (line 98) merges by spread, so new fields
flow through untouched.

**The admin UI does, and it should be restructured while we're there.** `LabDemoSettings.tsx`
hand-wires every limit four separate times: a `baseline*` const, a `max*` const, a term in
`changedCount`, and a `SettingsRow` + `NumberInput` in the JSX. Three limits is 12 hand-wired
pieces; six limits is 24. That is the duplication `docs/audit-prompt.txt` calls out — repeated
blocks with trivial variation. Drive the rows from one small array of `{ key, label, hint, max }`
and derive baselines, values, and `changedCount` from it. Six identical callers is well past the
two-caller bar for extracting.

### 2d. Error copy

Per AGENTS.md the server owns error text and the client renders it verbatim. Every demo guard
message is self-contained and names the demo as the reason — `"Seeded demo records can't be deleted
— create your own to try this"`, never `"Permission denied"`. This is a requirement, not polish.

**The delivery path is verified end-to-end**, since the requirement is worthless if the text gets
replaced en route. `DomainError` subclasses (which `PermissionError` and `ValidationError` are) are
serialized with their own `statusCode` and `message` intact (`errorHandler.ts:79-82`); the client's
`getErrorMessage` returns any 4xx message verbatim rather than substituting canned copy
(`getErrorMessage.ts:74-75`); and `MutationCache.onError` toasts it. The one exception is 429, which
`isInfrastructureError` classifies as infrastructure and replaces with rate-limit copy — correct,
and not a path any demo guard uses.

---

## 3. Dataset and reset

**Dataset** — `application/config/DemoDataset.ts`, a static `DEMO_DATASET` const following the
`AuditConfig.ts` precedent in that directory. Roughly 3 tanks of storage, ~150-250 tubes across
several boxes, 8-12 donors, 15-20 researchers, 20-30 reagents with lots and transaction history,
20-30 supplies, 15-20 equipment items with maintenance logs, plus the lookup vocabularies and
locations everything above references. Hand-authored so names and values read as a real lab.

**Author the vocabularies first.** Lookup values, categories, attribute definitions and options,
units, and locations are what the item records point at, and the demo lab has none of them today.
Writing tubes before their `species` list exists means inventing values that no dropdown offers.

Three things in the dataset are **not** knowable at authoring time and must be resolved when the
reset runs, because they differ per environment: tube tank/rack IDs, transaction `performed_by` user
IDs, and anything else pointing at a hand-provisioned record. Everything else uses stable IDs the
dataset owns. Keeping that line sharp is what makes the dataset portable from dev to production.

Every record in the dataset carries a **stable, deterministic ID** (e.g. `tube_demo0001`). This is
what makes the reset idempotent — see below. Verified compatible: `generateId` produces
`prefix_nanoid` and nothing validates the suffix, so hand-authored IDs pass everywhere real ones do.

**Tube locations cannot be hardcoded — they must be resolved at reset time.** This is the one design
detail that would pass in dev and fail in production. A `TubeLocation` is
`{ tankId, rackId, boxId, position }`, and those tank and rack IDs are random nanoids minted when a
lab's storage config was first created (`Storage.createDefault()` calls `generateId('rack')`). The
dev demo lab's are `tank_23_CKZEfi60aCPTvIefGr` / `rack_WVpBIrgssrf6mngR0tBMi`; production's will be
different values. A dataset with IDs copied out of dev would place zero tubes in prod, or throw.

So `DEMO_DATASET` addresses tube positions **symbolically** — tank index, rack name, box name,
position — and the reset resolves them against the demo lab's live `Storage` config, which it has
already loaded, before constructing each `TubeLocation`. Note also that boxes in the config carry a
`name` ("A", "B", …) and no `id` field, so box addressing is by name regardless.

If the config has fewer tanks or racks than the dataset addresses, the reset must fail loudly rather
than silently skipping tubes — a demo lab that half-populates is worse than one that refuses to.

**Transaction actors must be resolved at runtime too — same trap as tank IDs.**
`reagent_transactions.performed_by` and its supply equivalent are `NOT NULL` foreign keys to `users`,
and the demo user is provisioned by hand per environment, so its ID is unknowable at authoring time.
The dataset therefore records *that* a transaction was performed, not *by whom*, and the reset fills
in the demo user resolved from the lab. The existing `seedAuditLogEntries` already does exactly this
— it calls `userRepository.findByLabId(labId)` and picks actors from the result
(`DemoSeedCommands.ts:88,101-102`). Follow it.

`location_id` on those tables is also `NOT NULL`, which is a second reason locations must be upserted
in step 5 before any transaction lands in step 6.

Cosmetic consequence worth expecting: with one demo user, all transaction and audit history reads as
performed by that single account. The existing audit seed has the same property. Adding more demo
users would fix it and is not worth the provisioning cost now.

**Build dataset entities with `fromData()`, never `create()`.** This is the single easiest way to
silently break idempotence. Every entity's `create()` calls `generateId()` internally
(`Donor.ts:61`) and gives no way to supply an ID, so a dataset built through `create()` would mint
fresh random IDs on every reset — the upsert-by-ID below would then insert duplicates instead of
updating, and the demo lab would grow without bound one night at a time. `fromData()` takes an
explicit `id` and exists on all five entities (`Tube`, `Donor`, `ReagentItem`, `SupplyItem`,
`EquipmentItem` — confirmed). Use it.

> `application/` subdirectories are role-named, so a feature-named `application/demo/` would break
> the convention; `config/` is the closest existing home, alongside `AuditConfig.ts`. Decided and
> settled — the fixture lives at `application/config/DemoDataset.ts`.

**Reset — extend what exists; do not build a second one.** `ResetDemoDataCommandHandler` already
exists at `TankCommands.ts:201`, already has a system-admin route
(`/system/labs/:labId/demo/reset`), already has a client service method (`LabService.resetDemoData`),
already has a mutation hook with cache invalidation (`useResetDemoDataMutation`), and already has a
**Reset Demo** button in `LabDemoSettings.tsx`. Creating a parallel handler would be exactly the
redundant system AGENTS.md forbids.

What it does today: deletes every tube in the lab's tanks, deletes every donor, and strips
non-seeded tanks/racks/boxes from the storage config. It is a **wipe**, not a restore — nothing is
put back, and it never touches reagents, supplies, equipment, transactions, or sessions.

What it grows into: the same wipe, extended to the three item catalogs and their transactions, then
followed by re-applying `DEMO_DATASET` and purging expired sessions. Because it changes from
"delete some rows" to "delete and repopulate across a dozen tables," it also gets wrapped in the
existing **`UnitOfWork`** (`application/contracts/UnitOfWork.ts`) — a partial failure part-way
through a restore would leave the demo lab in a state no visitor should see.

**Move it while extending it.** A demo-reset handler living in `TankCommands.ts` is misfiled today
and will be indefensible once it spans every catalog. It moves to `DemoSeedCommands.ts` beside the
seed, unseed, and limits handlers. Update the import in `StorageModule.ts`.

Its existing guard is `user.isAdmin()`, not `requireSystemAdmin` like its seed/unseed siblings —
worth reconciling during the move, since a demo `lab_admin` visitor would otherwise pass it.

**Its response shape goes stale.** The controller returns `{ message, deletedTubes }`
(`StorageController.ts:620-624`), which stops describing the operation once reset restores five
catalogs rather than deleting tubes. The client already discards it — `LabService.resetDemoData`
returns `Promise<void>` — so either widen it to report what was restored and surface that in the
success toast, or drop the field. Don't leave a `deletedTubes` count on an operation whose job is
putting things back.

**The `Repositories` bag is missing two things.** It carries `equipmentCategories`,
`supplyCategories`, `equipmentItems`, `supplyItems`, `reagentItems`, `tubes`, `donors`,
`researchers`, `persons`, `users`, `storage`, `attributes`, `labLocations` — but **no
`reagentCategories` and no `customUnits`**, both of which the upsert step needs and both of which
exist as repositories (`CategoryRepository<T>`, `CustomUnitRepository`). Extend `Repositories` with
those two. Caller-first is satisfied: the reset is a real consumer landing in the same change.

**There are no transaction repositories, and none are needed.** `reagent_transactions` and
`supply_transactions` are owned by `ReagentItemRepository` and `SupplyItemRepository` — verified,
the transaction SQL lives there. So the transaction purge is a method on the *item* repositories,
and the bag already carries both. (`RepositoryFactory` is the `UnitOfWork` implementation —
`implements UnitOfWork` at line 59.)

**Purge order is FK-constrained — this is not free choice.** Most children of the item tables are
`ON DELETE CASCADE` (lots, barcodes, documents, attribute values, packaging levels, supply stock,
maintenance log, donor collection history), but **`reagent_transactions.item_id` and
`supply_transactions.item_id` are `NO ACTION`**. Deleting items before their transactions throws a
foreign-key violation. The order is:

1. `reagent_transactions`, `supply_transactions`
2. `tubes`
3. `reagent_items`, `supply_items`, `equipment_items` — children cascade from here
4. `donors` — `donor_collection_history` cascades

Then:

5. **Upsert stable content** by deterministic ID — **persons first**, then researchers, categories,
   attributes, units, locations. Persons are not optional: `researchers.person_id` is a foreign key
   to `persons`, so a dataset with 15-20 researchers needs 15-20 person rows upserted ahead of them.
   Upsert, never delete-and-recreate: `*_items.category_id` and `equipment_items.location_id` are
   `RESTRICT`, so recreating a referenced category or location would throw. Upserting is also what
   makes a second run a no-op.

   **Exact upsert order.** Derived from a full enumeration of the foreign keys on every table the
   dataset writes (30 of them), not from intuition. Each line depends only on lines above it:

   1. `persons` → 2. `researchers` (`person_id` NOT NULL)
   3. `lookup_values`, `custom_units` — no dependencies beyond `labs`
   4. `locations` — **parents before children**, `parent_id` self-references
   5. `*_categories` — **parents before children**, `parent_id` self-references; two-level rule
      applies
   6. `attribute_definitions`, then `attribute_options`
   7. Items (`category_id` NOT NULL on all three catalogs), then their attribute values, barcodes,
      packaging levels, lots, and stock
   8. Tubes (`tank_id`, `rack_id`, `box_id`, `position` all NOT NULL), donors, then collection
      history and transactions

   **`attribute_options` is a dependency the plan had never named.** Every
   `*_attribute_values.value_option_id` is a foreign key to it, so any select-type attribute value in
   the dataset fails without its option row. `AttributeRepository` already covers it —
   `saveOption`, `findOptionsByLabId` (lines 33-36) — so this is a sequencing requirement, not new
   code. "Upsert attributes" must mean definitions **and** options.

   **Lookup values belong in this list and were missing from it.** The demo lab currently has
   **zero** rows in `lookup_values` — verified, no `species`, `source`, `media`, `specimen_type`, or
   `equipment_maintenance_type`. Those are the dropdown vocabularies behind tube sample fields, donor
   collection history, and equipment maintenance entries. Without them the dataset can't be authored
   coherently and every one of those dropdowns renders empty, so the demo looks broken even once it
   is full of records. They are also locked from demo users by §2b, which makes them stable content
   by the same definition as categories and units. `LookupValueRepository` is already in the
   `Repositories` bag.

   **No new upsert methods are needed.** The existing `save()` on every relevant repository is
   already `INSERT … ON CONFLICT (id) DO UPDATE` — verified in `DonorRepository` (line 101),
   `ReagentItemRepository` (138), `EquipmentItemRepository` (68), and `TubeRepository` (78). Given
   stable IDs from `fromData()`, plain `save()` is the upsert.
6. Re-apply `DEMO_DATASET` volatile records through the normal repositories.
7. **Keep the existing `removeNonSeededEquipment()` call** (`TankCommands.ts:236-246`) — it drops
   the tanks, racks, and boxes a visitor added, which is exactly right. Do **not** add a
   `config.seedAll()` here: once visitor-added storage is stripped, everything remaining is already
   marked seeded, so `seedAll()` would be a no-op at best. Seeding stays the job of the separate
   **Seed Demo** button.
8. Re-run the existing `seedAuditLogEntries` (`DemoSeedCommands.ts:98`), which already solves the
   "demo actions write no audit rows" problem (`AuditEventHandler.ts:219-222`).
9. **Purge expired sessions and refresh tokens** — see the growth note below.

**Never purged, under any circumstance:** the `users` table. Deleting it destroys the demo login
account the whole feature depends on. This belongs in a comment on the purge, not only here.

Purge scope is deliberately narrow — **only what a visitor can create**. A single cross-table purge
repository would be faster to write but would be a second data-access path alongside the repository
pattern, which AGENTS.md rules out. Per repository:

- **Tubes — reuse `deleteByTankIds(tankIds, labId)`**, which already exists on `TubeRepository` and
  is already what the current reset calls. Every tube lives in a tank, so passing all tank IDs
  covers the lab. Adding a `deleteAllForLab` here would be a second bulk-delete path for the same
  rows — the exact redundancy this plan keeps warning about.
- **Donors — add `deleteAllForLab`** and use it to replace the existing per-donor loop
  (`TankCommands.ts:230-233`), which fetches every donor and deletes them one at a time. That's a
  replacement, not a duplicate.
- **Reagent, supply, equipment items — add `deleteAllForLab`.** No bulk delete exists on these
  today. The reagent and supply ones also clear their transaction tables, which they own.

**The demo account must be provisioned — nothing does this today.** `DEMO_USERNAME` names a user
that has to exist, and since the reset never purges `users`, nothing recreates it if it's missing.
Two one-time operational steps, done once against prod and documented in this file when they are:
create the demo lab through the existing system-admin lab creation with `isDemo: true`, then create
the demo `lab_admin` user in it. The account never authenticates by password — `demo-login` bypasses
it — so it gets a random unusable hash. Its status must be approved and active, or the status checks
borrowed from `login` will reject every visitor.

**Session and token growth — must be handled here.** `revokeSession` and `bulkRevoke` only soft-flag
`is_active = FALSE` (`UserSessionRepository.ts:118,144`); rows are never deleted. The cleanup pair
does exist — `purgeExpiredSessions()` + `cleanupExpiredTokens()`, both called from
`SecurityMonitoringApplicationService.purgeExpiredSessions()` (line 76) — but it is wired **only** to
a system-admin HTTP route (`SystemAdminRouteModule.ts:216`). There is no scheduled job; the sole job
in `infrastructure/jobs/` is `AuditArchivalJob`. Every demo visit mints a `user_sessions` row and a
`refresh_tokens` row that nothing ever reclaims, so the nightly reset calls that existing service as
its last step. Reuse it — do not write a second purge.

**Trigger** — the manual path is already built and needs no client work: the **Reset Demo** button
in `LabDemoSettings.tsx` → `useResetDemoDataMutation` → `LabService.resetDemoData` →
`/system/labs/:labId/demo/reset`. It simply starts doing more.

The only new trigger is the unattended one: `POST /api/public/demo/reset`, guarded by
`createStrictRateLimiter()` (5/min, already in `apiRateLimiter.ts`) plus a constant-time comparison
against `config.demo.resetKey`, 404 when unset, called nightly by a Railway cron service. The
limiter matters — without it the key is brute-forceable at the global 300/min, and it matches how
the existing system-admin demo routes are already guarded (`this.strictLimiter`,
`SystemAdminRouteModule.ts:127-133`). It calls the same handler as the button.

---

## 4. Client polish

**Lock affordance — share the predicate, not a copy of it.** `useStoragePermissions.ts` already
derives `isResourceLocked` from `isDemo && resource.isSeeded === true` (lines 29-34). Writing that
line a second time in a new catalog hook would be duplication, so the line itself moves to a shared
pure function:

```
isDemoLocked(isDemo: boolean, item: { isSeeded?: boolean }): boolean
```

`useStoragePermissions` calls it, and a new `shared/hooks/useDemoItemLock.ts` calls it too — the
latter sourcing `isDemo` from `useIsDemo()` rather than a parameter. One implementation, six-plus
consumers.

**Why not merge the two hooks outright:** `useStoragePermissions` takes `isDemo` as an argument from
a caller that already holds it, while catalog components have no such caller. Unifying them means
changing that hook's signature, which ripples through `StorageManagerModal`,
`StorageManagerContext`, and the three row components — a lot of churn to unify one line. Sharing
the predicate gets the DRY win with zero ripple.

The catalog components then use `useDemoItemLock` to disable destructive controls with a tooltip.
Disabling beats discovering the restriction through an error toast.

**Where those controls actually are** — enumerated, so this isn't a vague sweep. The recurring shapes
are `*ItemRow` (inline actions), `*InfoPanel` (detail-pane actions), `*Tab` (toolbar actions),
`*BulkOperationsModal` (bulk archive/void), and the two timelines that own child-record deletes:

| Domain | Components |
|---|---|
| Tubes | `editor/TubeEditorModal`, `grid/TubeGrid`, `grid/TubeGridContextMenu` |
| Donors | `DonorInfoPanel`, `DonorRegistryModal`, `CollectionHistoryTimeline` |
| Reagents | `ReagentItemRow`, `ReagentItemInfoPanel`, `ReagentsTab`, `ReagentBulkOperationsModal`, `ReagentExpiryAlertPanel` |
| Supplies | `SupplyItemRow`, `SupplyItemInfoPanel`, `SuppliesTab`, `SupplyBulkOperationsModal` |
| Equipment | `EquipmentItemInfoPanel`, `EquipmentTab`, `EquipmentMaintenanceTimeline` |

`TubeGridContextMenu` is easy to miss — the grid's right-click menu is a second delete path onto the
same records.

**Barrels — measured, not deferred.** `@shared/hooks` has 24 barrel importers and `@shared/utils` has
37, so both barrels are the real surface and gain their new export. `info-display/` has **zero** deep
importers, so it too is consumed only through a barrel. All three get the export; no judgement call
left for implementation time.

**Banner — generalize `DemoModeBanner`; do not add a second component.** The original plan created
an `AppDemoBanner`, which would have been two components ~90% identical differing only in copy —
precisely what `docs/audit-prompt.txt` says to collapse into one with props.

`DemoModeBanner` is already a reused component with two render sites (`AccountTab.tsx:132`,
`SecurityTab.tsx:120`) and is 19 lines: `useIsDemo()` plus `AlertBanner variant="demo"` with fixed
copy. It gains an optional message (defaulting to today's account-settings text, so both existing
call sites are untouched) and a third render site in `App.tsx` beside `AppErrorBanner` (line 85).

**It has to move to be importable.** It currently sits at
`domains/users/ui/components/settings-modal/DemoModeBanner.tsx`; the app shell reaching into another
domain's settings-modal internals is a layering violation. It moves to
**`shared/ui/components/info-display/DemoModeBanner.tsx`**, exported through `@shared/ui` — the path
its two existing callers already use to reach `AlertBanner`. Update the two imports. The relocation
is driven by a real third consumer, not tidiness.

Three things make `shared/ui` the right destination rather than the authentication domain:

- **Shared components already call domain hooks here.** `OnlineUsersBadgeList.tsx` (in
  `shared/ui/components/badges/`) imports `useAuthStore` from `@domains/authentication`, and
  `shared/hooks/useLookupValuesQuery.ts` imports `useLabId` from it. Keeping `useIsDemo()` inside the
  banner is consistent with that precedent, so callers don't each repeat the demo check.
- **`domains/authentication/ui/components/` contains only `gateway/` and `password/`** — both
  subdirectories. Dropping a loose file beside them is exactly what AGENTS.md's loose-file rule
  forbids, so that route would have required inventing a subdirectory for one file.
- **It keeps its name.** Shared components take no domain prefix (`OnlineUsersBadgeList`,
  `BarcodeScanInput`), so `DemoModeBanner` stays correct. In the authentication domain the
  entity-first rule would have forced `AuthDemoBanner`, which reads as a banner about auth demos.

`info-display/` over a new `banners/`: the smallest existing subdirectory under
`shared/ui/components/` holds three files, so a one-file `banners/` would be an outlier, and
`info-display/` is already the catch-all for small informational display components.

**Not dismissible.** `AlertBanner` has no dismiss or `onClose` prop — its surface is `variant`,
`spacing`, `animate`, `icon`, `title`, `actions`. Dismissibility would mean widening a shared
primitive for one caller or bolting visibility state onto the banner, and neither earns its keep:
the banner is what makes every §2d restriction legible, so a visitor who dismisses it then hits a
block with no context.

Banner copy follows the house convention: sentence case, period only on full sentences.

---

## 5. Abuse surface — what a demo visitor can actually reach

The demo account is a `lab_admin`, so it passes `requireAdmin` and reaches the whole admin surface.
This section enumerates that surface rather than sampling it, because "the guards look thorough" is
not a security argument.

**Verified guarded — no work needed:**

| Surface | Why it holds |
|---|---|
| User management | Every mutation routes through the private `requireUserManagementAllowed`, which calls `rejectDemoManagementOperation`. `deactivateUser` and `suspendUser` reach it indirectly by delegating to `disableUser` (`UserApplicationService.ts:301`) — easy to miss, and load-bearing. `disableUser` also refuses self-targeting, and every visitor *is* the demo user. |
| Researcher management | `rejectDemoManagementOperation` at four call sites. |
| Lookup catalog | `rejectIfSeededDemo`, becoming §2b's `rejectIfTaxonomyLocked`. |
| Invite codes | Creation blocked for seeded demo labs (`InviteCodeCommands.ts:76`), so no visitor can mint real access. |
| Cross-lab reads | `findByIdForRequester` widens only for `system_admin`; the demo user is not one. |
| Real-time events | `emitToLabRooms` scopes to the demo lab's room. |
| Storage config | `rejectDemoConfigOperation` on reset-to-default and import. |

**The one gap: six unguarded export endpoints.** `/admin/export/{tubes,users,researchers,equipment,supply-reorder-list,system-backup}`
carry `authenticate + requireAdmin` and nothing else — no demo guard, no rate limiter beyond the
global 300/min.

Data leakage is not the concern; every row is fabricated. The concern is **unbounded work**: each
call scans a table and serializes the result, and a script can issue 300 a minute per IP. That is
the cheapest way to spend your Railway CPU budget from a browser. `/export/system-backup`
additionally dumps lab configuration, which is uninteresting for a fake lab but is the one export
that isn't just demo rows.

**Decision: keep exports working, add a limiter.** Exporting is a genuinely good thing to demo, so
blocking it for demo users costs more than it saves. Apply `createModerateRateLimiter()` (20/min,
already in `apiRateLimiter.ts`) to the export routes — a sensible bound for real deployments too,
not a demo-only patch.

**Second gap: catalog bulk writes are unlimited, and the §2c caps don't reach them.** Enumerating
limiters across every route module shows a clear house pattern — `ResourceRouteModule` puts
`createModerateRateLimiter()` on the bulk tube operations (lines 122, 129, 142), `SearchRouteModule`
limits advanced search, `StorageRouteModule` puts the strict limiter on config changes. But
`ReagentRouteModule`, `SupplyRouteModule`, `EquipmentRouteModule`, `DonorRouteModule`, and
`UserRouteModule` have **zero** limiters.

That matters most for `bulk/receive` and `bulk/issue`, which write stock transactions 100 items at a
time. The §2c caps bound tubes, donors, and catalog *items* — they do not bound **transactions**, so
the highest-throughput write path in the app is also the only uncapped one. At the global 300/min
that is tens of thousands of transaction rows a minute.

Rate limiting is the right lever here rather than another cap: a `maxTransactions` limit would block
recording stock movement, which is the most interesting thing in the catalog to demo. Apply
`createModerateRateLimiter()` to the bulk routes in the three catalog modules — matching what tube
bulk operations already do, so this closes an inconsistency rather than inventing a rule.

**Verified cheap, no action:** bulk barcode and lot-label retrieval only run one indexed query and
return barcode *strings* (`ReagentApplicationService.ts:465-482`) — rendering happens client-side,
so there is no server-side image or PDF generation to abuse.

These two limiter changes are the only security work §5 asks for.

---

## 6. Residual risks — accepted, not fixed

Surfaced by an adversarial pass over the plan. None is a containment hole; each is a
demo-degradation or pre-existing issue, recorded so nobody rediscovers them mid-build.

**Stock depletion isn't covered by delete-protection.** §2a blocks removal, not
`recordTransaction`. A visitor can issue seeded reagent and supply stock down to zero, so the
inventory dashboards can read as dead until the nightly reset restores them. Accepted: capping
transactions would block the single most interesting workflow in the catalog. Revisit if it turns
out to be the first thing every visitor does.

**Revoked sessions keep working until token expiry.** `RefreshTokenRepository` has no session
linkage, so evicting a session at the 50-session cap (`JwtSessionService.ts:50`) doesn't revoke its
refresh token. Pre-existing, and amplified by one shared public account. Out of scope here; it is a
real finding against the auth model and deserves its own decision.

**Concurrent visitors share one identity.** Sockets are correctly lab-room scoped
(`SocketEventHandler.emitToLabRooms`, line 86) — no cross-lab leakage. But simultaneous visitors sit
in the same room as the same user, so they see each other's edits appear live and show up as
duplicate `user_online` entries of one username. Odd rather than harmful; watch it during the first
public day.

**Tube locks have no expiry** — `tubes.is_locked/locked_by/locked_at`, no auto-release, and lock
calls accept up to 100 IDs. Self-healing here by luck: `canUnlockTube` (`AccessControlService.ts:154`)
allows both `user.isAdmin()` and the lock owner, and every demo visitor is the same `lab_admin`, so
any visitor can clear another's locks. No action needed while the demo user stays `lab_admin` — if
that ever changes to `user`, this becomes a real griefing vector.

**A reset yanks data out from under anyone mid-visit.** The nightly job deletes and rebuilds rows
while sessions may be open, so a visitor browsing at that moment gets 404s on records that vanished
and a stale cache until they refresh. Running at ~3am makes it unlikely rather than impossible.
Accepted — the alternative is a maintenance-mode flag, which is a lot of machinery for a portfolio
demo. Worth knowing before it's mistaken for a bug.

**A stale browser cache can briefly show an unlocked control on a seeded record.** The client
persists tubes to `localStorage` and rehydrates without re-validating against the schema, so a
visitor whose cache predates the §2a deploy holds tubes with no `isSeeded`. The §4 affordance then
reads it as absent and leaves the delete control enabled until the query refetches. The server guard
still refuses the delete, so this is a cosmetic race, not a containment hole, and it clears on the
next refetch. `clearStaleCaches` (`cacheVersionValidation.ts`) is the existing lever if it ever needs
forcing, though it keys on the storage-config version rather than on a response-shape change. Worth
knowing before it is mistaken for a broken guard.

**Idle timeout logs visitors out mid-demo.** Demo sessions obey the same idle timeout as real ones,
so someone who leaves the tab open and comes back gets bounced to the login screen. Correct
behaviour, mildly awkward first impression; the demo button makes getting back in one click.

**`/invite-codes/validate` has no auth limiter.** Public routes carry the global 300/min plus
`rateLimitMiddleware`, but that middleware is a *login-failure lockout* keyed on IP
(`RateLimitingService.isBlocked`), not a general throttle — so it doesn't slow code-guessing.
Pre-existing and low-severity, but publicising the app moves it from theoretical to worth a line.
Adding `this.authLimiter` to that route is a one-line fix if you want it swept in.

---

## Convention compliance

Checked against AGENTS.md and `docs/audit-prompt.txt`:

- **File headers** — every new file opens with a plain-English JSDoc title above imports, no bullet
  lists, no process references.
- **Naming** — the four genuinely new files: `037_add_is_seeded_to_content.ts` → `migration037` /
  `name: 'add_is_seeded_to_content'` (matches `035_retire_supply_item_property`); `DemoDataset.ts`
  (PascalCase, matching its `AuditConfig.ts` sibling); `DemoGuards.test.ts` (matches its subject);
  `isDemoLocked.ts` and `useDemoItemLock.ts` (camelCase, `use` prefix on the hook, matching
  `compareByOrderThenName.ts` and `useUnitOptions.ts` in the same folders). New guard functions are
  named for the existing `rejectIfSeeded` / `enforceAddTankLimit` family.
- **The moved banner keeps its name.** `DemoModeBanner` carries no domain prefix, which is correct
  for `shared/ui` (cf. `OnlineUsersBadgeList`, `BarcodeScanInput`). Landing it in a domain instead
  would have forced an entity-first rename to `AuthDemoBanner` and a loose file beside
  all-subdirectory siblings.
- **Caller-first** — no schema, route, type, or repository method lands without its consumer in the
  same change. `AuthResponse` is reused instead of minting a demo-login schema.
- **Response schemas in shared-schemas** — only if one is needed. The reset's existing response is
  discarded by the client (`LabService.resetDemoData` returns `Promise<void>`), so adding a
  `resetDemoResponseSchema` is only correct if §3 resolves toward surfacing restored counts in the
  success toast. If the field is dropped instead, no schema is added — a schema with no `.parse()`
  caller is dead by the caller-first rule.
- **One shape per concept** — `isSeeded` is threaded through the existing entity/mapper/DTO chain;
  no parallel "demo item" type.
- **Error model** — server owns the text; no client-side rewriting; mutation errors surface through
  the existing `MutationCache.onError`, and no mutation hook toasts on its own.
- **No convenience wrappers** — no forwarding getters added to entities for `isSeeded`.
- **No speculative code** — creation caps ship with their guards wired; `deleteAllForLab` is added to
  exactly **four** repositories (donors, reagent items, supply items, equipment items). Tubes are
  deliberately excluded: they reuse the existing `deleteByTankIds`, so no fifth method is written.
- **Barrels** — three are touched (`shared/hooks`, `shared/utils`,
  `shared/ui/components/info-display`). Each gains its new export only if barrel imports are the real
  surface there; measured with grep counts at implementation time, per the barrel convention.

---

## File tree

```
server/
├── src/
│   ├── application/
│   │   ├── commands/
│   │   │   ├── DemoSeedCommands.ts .................. EDIT  receives + extends the moved
│   │   │   │                                                ResetDemoDataCommandHandler
│   │   │   └── TankCommands.ts ...................... EDIT  move that handler out
│   │   ├── config/
│   │   │   └── DemoDataset.ts ....................... NEW   DEMO_DATASET fixture
│   │   ├── contracts/
│   │   │   ├── ConfigurationService.ts .............. EDIT  + optional demo config block
│   │   │   └── UnitOfWork.ts ........................ EDIT  + reagentCategories, customUnits
│   │   │                                                    to the Repositories bag
│   │   ├── guards/
│   │   │   ├── DemoGuards.ts ........................ EDIT  + item-deletion, taxonomy, caps
│   │   │   └── DemoGuards.test.ts ................... NEW   first guard test in the repo
│   │   └── services/
│   │       ├── SecurityMonitoringApplicationService.ts  REUSE purgeExpiredSessions()
│   │       │                                            called by the reset — no edit
│   │       ├── TubeApplicationService.ts ............ EDIT  guard on destructive methods
│   │       ├── DonorApplicationService.ts ........... EDIT       ""
│   │       ├── ReagentApplicationService.ts ......... EDIT       ""  + category lock
│   │       ├── SupplyApplicationService.ts .......... EDIT       ""  + category lock
│   │       ├── EquipmentApplicationService.ts ....... EDIT       ""  + category lock
│   │       ├── AttributeApplicationService.ts ....... EDIT  taxonomy lock + inject
│   │       │                                                storageRepository (absent today)
│   │       ├── CustomUnitApplicationService.ts ...... EDIT       ""
│   │       ├── LabLocationApplicationService.ts ..... EDIT       ""
│   │       └── LookupValueApplicationService.ts ..... EDIT  private guard → DemoGuards
│   │                                                        (already has storageRepository)
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── Tube.ts .............................. EDIT  + isSeeded
│   │   │   ├── Donor.ts ............................. EDIT  + isSeeded
│   │   │   ├── ReagentItem.ts ....................... EDIT  + isSeeded
│   │   │   ├── SupplyItem.ts ........................ EDIT  + isSeeded
│   │   │   └── EquipmentItem.ts ..................... EDIT  + isSeeded
│   │   └── repositories/ ............................ EDIT  on the same 4 interfaces
│   │                                                        (donors + 3 item repos):
│   │                                                        + deleteAllForLab, + countByLabId.
│   │                                                        TubeRepository untouched — already
│   │                                                        has deleteByTankIds + countByLabId
│   ├── infrastructure/
│   │   ├── database/
│   │   │   ├── migrations/
│   │   │   │   ├── 037_add_is_seeded_to_content.ts .. NEW
│   │   │   │   └── index.ts ......................... EDIT  register migration037
│   │   │   └── mappers/ ............................. EDIT  isSeeded through 7 mappers
│   │   │                                                    (5 item + 2 transaction)
│   │   ├── repositories/ ............................ EDIT  deleteAllForLab impls;
│   │   │                                                    is_seeded in SELECT/INSERT
│   │   ├── services/
│   │   │   └── EnvironmentConfigurationService.ts ... EDIT  + demo username / resetKey
│   │   └── di/
│   │       ├── RepositoryFactory.ts ................. EDIT  UnitOfWork impl — supply the
│   │       │                                                two added repositories
│   │       └── modules/
│   │           ├── StorageModule.ts ................. EDIT  sole owner of the reset handler
│   │           │                                            (getResetDemoDataHandler) — new
│   │           │                                            import path + added deps.
│   │           │                                            ServiceContainer never references
│   │           │                                            it, so it needs no change
│   │           ├── AttributeModule.ts ............... EDIT  inject storageRepository
│   │           ├── CustomUnitModule.ts .............. EDIT       ""
│   │           ├── LabLocationModule.ts ............. EDIT       ""
│   │           ├── ReagentModule.ts ................. EDIT       ""
│   │           ├── SupplyModule.ts .................. EDIT       ""
│   │           └── EquipmentModule.ts ............... EDIT       ""
│   └── presentation/
│       ├── controllers/
│       │   ├── auth/PublicAuthController.ts ......... EDIT  + demoLogin; extract login's
│       │   │                                                status checks into a shared
│       │   │                                                private assertUserCanLogIn
│       │   └── StorageController.ts ................. EDIT  resetDemoDataForLab EXISTS —
│       │                                                    only its response shape changes
│       └── routes/
│           ├── AdminRouteModule.ts .................. EDIT  moderate limiter on the 6
│           │                                                /export/* routes (§5)
│           ├── ReagentRouteModule.ts ................ EDIT  moderate limiter on bulk routes
│           ├── SupplyRouteModule.ts ................. EDIT       ""
│           ├── EquipmentRouteModule.ts .............. EDIT       ""
│           ├── PublicRouteModule.ts ................. EDIT  + demo-login, + demo/reset
│           └── SystemAdminRouteModule.ts ............ NO CHANGE — /labs/:labId/demo/reset
│                                                            already registered at line 127
│                                                            with validateParams + strictLimiter
│
packages/shared-schemas/src/
├── auth/authSchemas.ts .............................. EDIT  + demoAvailable on
│                                                            FirstTimeResponse (§1)
├── demo/demoSchemas.ts .............................. EDIT  + the 3 new caps. Reset-response
│                                                            schema ONLY if §3 resolves toward
│                                                            surfacing restored counts
├── tubes/tubeSchemas.ts ............................. EDIT  + isSeeded on response
├── donors/donorSchemas.ts ........................... EDIT       ""
├── reagents/reagentSchemas.ts ....................... EDIT       ""  (+ transaction)
├── supplies/supplySchemas.ts ........................ EDIT       ""  (+ transaction)
└── equipment/equipmentSchemas.ts .................... EDIT       ""
│
client/src/
├── App.tsx .......................................... EDIT  render the demo banner beside
│                                                            AppErrorBanner (line 85)
├── shared/
│   ├── utils/
│   │   ├── isDemoLocked.ts .......................... NEW   pure predicate, shared with
│   │   │                                                    storage's isResourceLocked
│   │   └── index.ts ................................. EDIT  if barrel is the surface
│   ├── ui/components/info-display/
│   │   ├── DemoModeBanner.tsx ....................... MOVE-IN  from users domain,
│   │   │                                                    + optional message prop
│   │   └── index.ts ................................. EDIT  export it
│   └── hooks/
│       ├── useDemoItemLock.ts ....................... NEW   wraps isDemoLocked + useIsDemo
│       └── index.ts ................................. EDIT  if barrel is the surface
└── domains/
    ├── storage/hooks/useStoragePermissions.ts ....... EDIT  isResourceLocked delegates to
    │                                                        isDemoLocked; signature unchanged
    ├── users/ui/components/settings-modal/
    │   ├── DemoModeBanner.tsx ....................... MOVE-OUT → @shared/ui
    │   └── tabs/{Account,Security}Tab.tsx ........... EDIT  update the two imports
    ├── authentication/
    │   ├── services/AuthService.ts .................. EDIT  + demoLogin
    │   ├── stores/authStore.ts ...................... EDIT  + demoLogin action; extract the
    │   │                                                    shared post-auth commit
    │   └── ui/components/gateway/
    │       ├── AuthGateway.tsx ...................... EDIT  pass demoAvailable down
    │       └── AuthLoginModal.tsx ................... EDIT  + demo CTA, gated on it
    ├── admin/
    │   ├── services/LabService.ts ................... NO CHANGE — resetDemoData exists
    │   ├── hooks/useLabMutations.ts ................. EDIT  useResetDemoDataMutation exists
    │   │                                                    but invalidates only labDetails —
    │   │                                                    must widen now that reset restores
    │   │                                                    tubes, donors, and 3 catalogs
    │   └── ui/components/system-dashboard/
    │       └── LabDemoSettings.tsx .................. EDIT  Reset button unchanged, but the
    │                                                        3 new limits each need a row,
    │                                                        baseline, value, and changedCount
    │                                                        term — see the DRY note in §2c
    └── {tubes,donors,reagents,supplies,equipment}/
        └── ui/components/ ........................... EDIT  disable destructive controls
                                                             via useDemoItemLock
```

Not in the repo: two Railway env vars (`DEMO_USERNAME`, `DEMO_RESET_KEY`) and one Railway cron
service for the nightly reset.

---

## Test impact

The plan had no test section until now. Two things it has to say:

**`DemoGuards.ts` has no tests, and neither does any other guard** — there is not a single
`*Guards*.test.ts` in the repo. That was tolerable when the guards protected a private demo lab. It
is not tolerable once they are the only thing standing between an anonymous visitor and the data,
and `docs/audit-prompt.txt` is explicit that untested behavior-sensitive code makes "tests pass" a
vacuous gate. **New: `server/src/application/guards/DemoGuards.test.ts`**, covering the no-op path
for non-demo users (every guard's first line, and the one most likely to regress into blocking real
labs), seeded-item rejection, the taxonomy lock, and each creation cap at and over its limit.

**Existing tests that change:**

| Test | Why |
|---|---|
| `LookupValueApplicationService.seededDemo.test.ts` | Four tests drive the taxonomy guard through the service. §2b changes it to take a loaded `Storage` instead of reading the repo, so their setup changes. |
| `authStore.test.ts` | Gains coverage for the new `demoLogin` action, mirroring the existing `login` tests. |

**Checked and resilient — no change needed:** `Lab.test.ts` asserts
`expect(lab.demoLimits).toEqual(DEMO_LIMITS_DEFAULTS)` against the constant rather than a literal,
so adding three fields to `DEMO_LIMITS_DEFAULTS` keeps it green. `User.test.ts`, `Equipment.test.ts`,
`LabApplicationService.test.ts`, and `GetCurrentStorageQueryHandler.test.ts` touch `isDemo`/`isSeeded`
only on storage config, which this work doesn't alter.

---

## Verification

1. `npm run typecheck && npm run lint && npm test` — gate on green before any commit.
2. `npm run test:integration` — migration `037` runs against the dev DB. Confirm `is_seeded`
   defaults to `false` on all seven tables and existing rows are unaffected.
3. Reset locally against `Ithaca Labs`, then confirm via psql that counts match `DEMO_DATASET` and
   `is_seeded = true` throughout.
4. **Idempotence, explicitly:** run the reset twice and diff row counts across *every* lab-scoped
   table. Researchers, categories, attributes, units, and locations must not double. Confirm the
   demo login still works afterward — proof the `users` table survived.
5. **Dirty-state reset:** create tubes and items as the demo user, delete some seeded ones via psql,
   then reset and confirm the lab returns to the dataset exactly.
6. **Purge order under load:** record reagent and supply transactions against seeded items, then
   reset. This is the case that throws a foreign-key violation if transactions aren't deleted before
   their parent items — a reset with an empty transaction table proves nothing.
7. `/api/public/auth/demo-login` with the env var unset → 404, **and the CTA must not render** —
   check a local dev build with no `DEMO_USERNAME`. Set → token pair and a visible CTA. Pointed at a
   non-demo or non-`lab_admin` user → refusal.
8. Rate limiters: 21 rapid `/admin/export/tubes` calls → 429 on the 21st; same for a catalog
   `bulk/receive`. Confirm a normal single export and a normal bulk receive still succeed.
9. Eleven rapid demo-login calls → 429 on the eleventh. Six rapid reset calls with a wrong key →
   429 on the sixth, and never a 200.
10. **Session reclamation:** count `user_sessions` and `refresh_tokens` before and after a reset that
    follows a batch of demo logins — the expired rows must actually drop.
11. **Seeded-flag round trip:** edit a seeded item as the demo user, then confirm via psql that its
    `is_seeded` is still `true` and that deleting it is still refused. This is the silent-protection-
    leak case from §2a.
12. **In-app checklist handed over** rather than driving the UI: demo CTA reads professional and
   secondary; a seeded tube edits and moves but won't delete, with the demo-specific message; a
   visitor-created tube deletes fine; caps surface a clear message at the limit; audit log shows
   seeded history.

## Out of scope

Ephemeral per-visitor labs; wiring a real email provider (reopens the spam-relay question); the
global-`security_config`-readable-by-any-lab-admin multi-tenancy smell, which is real but unrelated.
