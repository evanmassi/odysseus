# Navigator Field Map — Implementation Plan

Port the dialed-in study (`refs/redesign/Navigator Studies.html`, variant C) into the live biobank
dashboard navigator. This document is the contract: it must satisfy `AGENTS.md` and
`docs/audit-prompt.txt`. **No code until approved.**

> Verified against the codebase (controllers, services, DTOs, repositories, schemas + barrels, hooks,
> socket bridge, tree-line system, color coding, storage view-model, stats + counts aggregates). Exact
> signatures and line anchors are embedded so the implementation mirrors existing patterns precisely.
>
> **Terminology:** at the data/API/domain layer the unit is a **tube** at a **position** in a **box** —
> there is no "cell" entity (in this codebase "cell" means only the biological `cellType`/`cellLine`, or
> the UI grid square `TubeGridCell`). All new server/schema/client names are **tube-named**.

---

## 1. Objective

Replace the text tree in the dashboard's left **Navigator** pane with a `ConsolePanel`-chassis
navigator: collapsible tanks → rack accordion → each box rendered as an occupancy **minimap** (the box's
`gridConfig` matrix, each occupied position painted in the tube's real smart color). Glowing-blue tree
connectors (tank→rack→box) with bright junction nubs; a nub turns amber when its box is full.
Selected/expanded tank+rack get a stripe-on-button treatment, distinct from the box's stronger "active"
fill+glow. Tank rows, rack rows, and the panel header show **occupancy** (filled/capacity).

**Confirmed product decisions**
- Minimap positions use the **real smart color** (existing color engine), not filled/empty — color is a memory aid.
- The per-box **fullness bar is dropped** (color encodes fill); the **box owner badge** takes that space.
- Box **owner indicators** at the box level (not only racks), matching the current tree.
- **Two minimal feeds:** a slim per-tube **color** projection (lazy, per open rack) and a lightweight
  per-box **counts** feed (eager, for occupancy numbers on collapsed tank/rack rows + facility). Neither
  hauls full tube records.

---

## 2. Scope & blast radius

- **Improve `StorageNavigator` in place — no parallel component.** `StorageNavigator` + `StorageNavigatorNode`
  are dashboard-only (sole consumer: `BiobankDashboard`). The StorageManager modal does **not** import them —
  it has its own rows but **shares** `storage-navigator.css` and the SVG tree-line system
  (`TreeLinesByLocation` / `calculateTreeLines` / `TreeLinesDisplay`).
- Changes to **shared** CSS / tree-line files must be **additive** and visually inert for the modal.

---

## 3. Pre-implementation checklist (AGENTS.md)

1. **Schema first** — `tubeSampleSchema` / `tubeLocationSchema` (`packages/shared-schemas/src/tubes/tubeSchemas.ts`);
   `BoxConfigurationSchema` / `GridConfigurationSchema` (`.../storage/storageSchemas.ts`).
2. **Verify field names** — color inputs: `sample.cellType`, `sample.donorInternalId`, `sample.donorSourceId`,
   `sample.lotNumber`, `sample.cultureCondition` (all `z.string().optional()`); `location.{tankId,rackId,boxId,position}`.
   IDs are **strings**; `position` / `count` are `z.number().int()`.
3. **FK resolution in UI** — resolve `assignedUserId` → initials via `useStorageOwnership().getUserInfo`.
4. **Use existing patterns** — mirror the `getTubesByLocation` read path; reuse the `countGroupedByLocation` aggregate.
5. **Import from shared-schemas** — `rackTubeSchema` / `tubeLocationCountSchema` in the tubes module + barrel.

---

## 4. End-to-end field traces (Write-Time Discipline #1)

**Color (lazy, per open rack):**
```
tubes (cell_type, donor_internal_id, donor_source_id, lot_number, culture_condition, box_id, position, tank_id, rack_id, lab_id)
  → TubeRepository.findByRack(tankId, rackId, labId): Tube[]       [infra — reuse TUBE_COLUMNS + TubeMapper.fromRows]
  → TubeApplicationService.getTubesByRack(...): RackTube[]         [application — access control + TubeDto.toRackTubeList]
  → TubeController.getTubesByRack (GET /api/tubes/by-rack)         [presentation — ResponseBuilder.success]
  → rackTubeSchema (bare array)  → TubeService.fetchTubesByRack    [shared-schemas → client service]
  → useTubesByRack(tankId, rackId)  → getTubeColorFromFields(rackTube) → <StorageBoxMinimap> position fill
```
The projection drops every field the map doesn't paint (~7 vs ~30). The repo reuses the audited full-row
mapper internally; the slim shape is produced once in the DTO — no row-mapping duplicated.

**Counts (eager, occupancy numbers):**
```
tubes (tank_id, rack_id, box_id, lab_id)
  → TubeRepository.countGroupedByLocation(labId): {tankId,rackId,boxId,count}[]   [infra — EXISTING aggregate, reused as-is]
  → TubeApplicationService.getLocationCounts(user): TubeLocationCount[]            [application — access-scope filter]
  → TubeController.getLocationCounts (GET /api/tubes/location-counts)              [presentation]
  → tubeLocationCountSchema (bare array)  → TubeService.fetchLocationCounts        [shared-schemas → client]
  → useLocationCounts()  → reduce to facility / per-tank / per-rack / per-box totals (capacity from gridConfig)
```

---

## 5. Server changes (Clean Architecture)

### 5.1 shared-schemas — `packages/shared-schemas/src/tubes/tubeSchemas.ts` (+ barrel `index.ts`)
```ts
export const rackTubeSchema = tubeSampleSchema
  .pick({ cellType: true, donorInternalId: true, donorSourceId: true, lotNumber: true, cultureCondition: true })
  .extend({ boxId: z.string(), position: z.number().int().min(1) });
export type RackTube = z.infer<typeof rackTubeSchema>;

export const tubeLocationCountSchema = z.object({
  tankId: z.string(), rackId: z.string(), boxId: z.string(), count: z.number().int().min(0),
});
export type TubeLocationCount = z.infer<typeof tubeLocationCountSchema>;
```
No `success` in data shapes. Both are **bare arrays**, validated client-side via `httpClient.getArray`.
**Barrel-export** all four names from `tubes/index.ts` (it re-exports each explicitly).

### 5.2 domain — `server/src/domain/repositories/TubeRepository.ts`
Add `findByRack(tankId, rackId, labId): Promise<Tube[]>` (mirrors `findByCompleteLocation` minus `boxId`).
`countGroupedByLocation(labId)` already exists (line 51) — **no change**.

### 5.3 infrastructure — `server/src/infrastructure/repositories/TubeRepository.ts`
Reuse `this.TUBE_COLUMNS` + `TubeMapper.fromRows`:
```ts
async findByRack(tankId, rackId, labId): Promise<Tube[]> {
  const rows = await this.context.queryMany<TubeRow>(
    `SELECT ${this.TUBE_COLUMNS} FROM tubes WHERE tank_id = $1 AND rack_id = $2 AND lab_id = $3 ORDER BY position`,
    [tankId, rackId, labId]
  );
  return TubeMapper.fromRows(rows);
}
```
*(Full-row read is internal; the client gets the slim projection. Chosen over a slim SQL select to avoid
duplicating `TubeMapper`'s field mapping. `countGroupedByLocation` impl already exists at line 341.)*

### 5.4 application — `server/src/application/services/TubeApplicationService.ts`
Two methods, both mirroring the access-control of `getTubesByLocation` (line 356):
```ts
async getTubesByRack(tankId, rackId, user: User): Promise<RackTube[]> {
  await this.accessControlService.requireCanViewTubes(user);
  const allowed = await this.getAllowedTankIds(user.labId!);
  if (!allowed.includes(tankId)) return [];
  return TubeDto.toRackTubeList(await this.tubeRepository.findByRack(tankId, rackId, user.labId!));
}

async getLocationCounts(user: User): Promise<TubeLocationCount[]> {
  await this.accessControlService.requireCanViewTubes(user);
  const allowed = await this.getAllowedTankIds(user.labId!);
  const counts = await this.tubeRepository.countGroupedByLocation(user.labId!);
  return counts.filter(c => allowed.includes(c.tankId));   // same tank-scope as the location read
}
```
Add `TubeDto.toRackTubeList(tubes: Tube[]): RackTube[]` beside `toResponseList` (uses `tube.toData()`) —
projects `boxId`/`position` from `location` + the 5 color fields from `sample`. The counts return shape
already matches `TubeLocationCount` (no mapper needed).

### 5.5 presentation — controller + routes + query validation
- **Query schema:** `RackQuerySchema = tubeLocationSchema.pick({ tankId: true, rackId: true })` in
  `server/src/presentation/validation/httpValidationSchemas.ts` (beside `LocationQuerySchema`, line 80).
- **Controllers** `getTubesByRack` and `getLocationCounts` mirror `getTubesByLocation` (line 206):
  `this.getAuthenticatedUser(req)`, `ResponseBuilder.success(...)`, `handleControllerError(...)`.
  `getLocationCounts` takes no query params (just the authed lab).
- **Routes** in `ResourceRouteModule.ts`, both **before `/tubes/:id` (line 82)**:
  `router.get('/tubes/by-rack', validateQuery(RackQuerySchema), …getTubesByRack…)` and
  `router.get('/tubes/location-counts', …getLocationCounts…)`. Auth + rate-limit apply module-wide.

---

## 6. Client changes

### 6.1 Query keys — `client/src/app/cache/queryKeys.ts`
```ts
byRack: (labId = '', tankId: string, rackId: string) =>
  [...queryKeys.tubes.all(labId), 'byRack', tankId, rackId] as const,
locationCounts: (labId = '') => [...queryKeys.tubes.all(labId), 'locationCounts'] as const,
```
*(Distinct from the existing — and apparently unused — `locationStats` key.)*

### 6.2 Service — `TubeService`
`fetchTubesByRack(tankId, rackId)` and `fetchLocationCounts()`, both `httpClient.getArray(url, <schema>)`
mirroring `fetchTubesByLocation` (line 98).

### 6.3 Hooks — `useTubeQueries.ts`
- `useTubesByRack(tankId, rackId)` — matches `useTubesByLocation` (no `Query` suffix); `enabled: !!(labId && tankId && rackId)`;
  invoked from the **expanded** rack's content so it mounts only when open (lazy). Returns `RackTube[]`.
- `useLocationCounts()` — `enabled: !!labId`; loaded once on navigator mount (~one row per occupied box).

Both stay fresh via the existing `tubes.all` prefix-invalidation (§6.8).

### 6.4 Color — `client/src/domains/tubes/utils/tubeColorCoding.ts` (one engine, no duplication)
```ts
interface TubeColorFields { cellType?: string; cellLine?: string; donor?: string;
  donorInternalId?: string; donorSourceId?: string; lotNumber?: string; cultureCondition?: string; }
function colorResultFromFields(f: TubeColorFields): ColorResult { /* current getTubeColor body from signature on */ }
export function getTubeColor(tube: TubeData): ColorResult { return colorResultFromFields(adaptTubeDataForColorSystem(tube)); }
export function getTubeColorFromFields(f: TubeColorFields): ColorResult { return colorResultFromFields(f); }
```
`RackTube` satisfies `TubeColorFields`; minimap calls `getTubeColorFromFields`. Grid/`TubeInfoPanel`
unchanged. No server-side color (would duplicate the engine).

### 6.5 View-model — `storageNavigatorTypes.ts` + `BiobankDashboard.tsx`
`BoxConfiguration` already carries `gridConfig` + `assignedUserId`; the dashboard mapping (lines 200-207)
drops `gridConfig`. Add `gridConfig: GridConfiguration` to the navigator `Box` type (reuse the shared type)
and forward it. Capacity via `getGridTotalPositions` (default `DEFAULT_GRID_CONFIG`).

### 6.6 Navigator components — `domains/storage/ui/components/storage-navigator/`
- `StorageNavigator.tsx` — orchestrator; renders its **own chrome** (`ConsolePanel` + `PanelHeader`
  compass+"Navigator" + occupancy bar via `NubDivider`), like `TubeInfoPanel`. `BiobankDashboard` drops its
  bare `bg-card` wrapper + `<h4>`. Keep `getEffectiveOwner` / `computeOwnershipType` / `resolveInitials`.
  Derives tank/rack/facility occupancy from `useLocationCounts`.
- `StorageNavigatorNode.tsx` — tank + rack accordion rows (occupancy bars from counts). Keep
  `[data-level][data-id]` wrappers + the `.storage-nav-button` class (tree-line calc needs it at tank/rack).
- `StorageBoxMinimap.tsx` — **new**: gridConfig matrix painted via `getTubeColorFromFields` from the rack's
  `useTubesByRack` data (mapped by `position`); owner `UserBadge` (`variant="navigator"`); name + count (from
  the counts feed). Focusable element `role="treeitem"`; carries `[data-level="box"][data-id]`.
- Reuse `useStorageNavigator` (state) and `useTreeKeyboardNavigation` (keyboard) **unchanged**.

### 6.7 Tree lines + nubs — reuse the SVG system, no logic change
- Reuse `calculateTreeLines` / `TreeLinesDisplay` / `useTreeLines`. **One additive edit** — the box-branch
  selector (`.storage-nav-button, [role="listitem"]`) also accepts `[role="treeitem"]` (modal inert).
- **Glow** via scoped CSS on the navigator container — redefine `--storage-nav-text-muted` → `hsl(var(--primary))`
  + `drop-shadow`/full opacity on `.tree-line` under that container only. Modal keeps the muted stroke.
- **Nubs** as per-node DOM → primary normally, **amber when the box is full** (fullness from counts).

### 6.8 Socket freshness — `SocketQueryBridge.ts`: **no change required**
Every tube event already invalidates `queryKeys.tubes.all(labId)` (prefix match) — covers `byRack` and
`locationCounts`. *(Verify no `exact: true` during impl.)*

### 6.9 Accessibility
Box minimaps are focusable `treeitem`s: preserve roving `tabIndex`, arrow/Enter/Space, Left-collapse, focus refs.

### 6.10 Responsive width
Rail flexes **180–280px**. Matrix cells fluid (`1fr`); indent + thumbnail use min sizes (legible at 180px).

---

## 7. File inventory

**New**
| Path | Kind | Header title |
|------|------|--------------|
| `client/.../storage-navigator/StorageBoxMinimap.tsx` | component | "Storage Box Minimap" |
| `server/.../application/services/TubeApplicationService.getTubesByRack.test.ts` | test | "Tubes By Rack Service" |

**Modified**
| Path | Change |
|------|--------|
| `packages/shared-schemas/src/tubes/tubeSchemas.ts` | add `rackTubeSchema`/`RackTube`, `tubeLocationCountSchema`/`TubeLocationCount` |
| `packages/shared-schemas/src/tubes/index.ts` | barrel-export the above |
| server `presentation/validation/httpValidationSchemas.ts` | add `RackQuerySchema` |
| server `domain/repositories/TubeRepository.ts` | add `findByRack` |
| server `infrastructure/repositories/TubeRepository.ts` | implement `findByRack` (reuse TUBE_COLUMNS + TubeMapper) |
| server `application/dto/TubeDto.ts` | add `toRackTubeList` |
| server `application/services/TubeApplicationService.ts` | add `getTubesByRack` + `getLocationCounts` |
| server `presentation/controllers/TubeController.ts` | add `getTubesByRack` + `getLocationCounts` |
| server `presentation/routes/ResourceRouteModule.ts` | register `/tubes/by-rack` + `/tubes/location-counts` before `/tubes/:id` |
| client `app/cache/queryKeys.ts` | add `tubes.byRack` + `tubes.locationCounts` |
| client `tubes/services/TubeService.ts` | add `fetchTubesByRack` + `fetchLocationCounts` |
| client `tubes/hooks/useTubeQueries.ts` | add `useTubesByRack` + `useLocationCounts` |
| client `tubes/utils/tubeColorCoding.ts` | extract `colorResultFromFields` + `getTubeColorFromFields` |
| client `storage-navigator/storageNavigatorTypes.ts` | add `gridConfig` to `Box` |
| client `storage-navigator/StorageNavigator.tsx` | chrome + accordion + minimap + occupancy wiring |
| client `storage-navigator/StorageNavigatorNode.tsx` | tank/rack rows + occupancy bars (keep markers) |
| client `storage-navigator/calculateTreeLines.ts` | additive: box selector also matches `[role="treeitem"]` |
| client `storage-navigator/storage-navigator.css` | additive, container-scoped glow + nub styles |
| client `app/components/layout/BiobankDashboard.tsx` | forward `gridConfig`; drop bare wrapper; mount self-chromed navigator |

Tests added where they earn it: a focused `getTubesByRack` service test (access control + tank-scope + projection).
*(Note: the only existing app-service test lives in the non-audited `supply` domain — we follow its
`<Service>.<method>.test.ts` filename convention but write the test clean, not mirror its internals.)*

---

## 8. Guideline compliance checklist

**AGENTS.md**
- [ ] Schema read first; fields verified; IDs strings; **tube-named** (no invented "cell" data noun).
- [ ] Response schemas in shared-schemas + barrel; client imports; no inline `z.object`; no `success` in data.
- [ ] Layers: domain interface-only; presentation via `getAuthenticatedUser` + `ResponseBuilder.success` + `handleControllerError`; app-layer access control mirrors `getTubesByLocation`.
- [ ] Caller-first / no speculative exports: every addition wired to a real caller same-change.
- [ ] No parallel systems: one color engine, one navigator (improved in place), reuse query/socket/tree-line systems and the `countGroupedByLocation` aggregate.
- [ ] DRY: `.pick()` schemas; reuse `TubeMapper`, `TubeDto`, `getAllowedTankIds`, `countGroupedByLocation`, `useStorageOwnership`, `UserBadge`, `getGridTotalPositions`, the SVG tree lines.
- [ ] Minimal data: slim `RackTube` (color) + lightweight `TubeLocationCount` (numbers) — no full records to the client.
- [ ] Lab context: `useLabId`, `enabled: !!labId`, lab-scoped keys.
- [ ] Accessibility: keyboard + ARIA on box thumbnails.

**docs/audit-prompt.txt**
- [ ] File header on every new/edited file.
- [ ] Comments explain *why*; no restatement / self-promotional / process-reference / decorative.
- [ ] Naming + directory conventions; entity-first components; tube-named data layer.
- [ ] No duplication (schema pick, mapper reuse, single color engine, reused counts aggregate).
- [ ] No dead/zombie code; no unused params; route ordering correct.

---

## 9. Phasing

1. **Backend** — `rackTubeSchema` + `tubeLocationCountSchema` + barrel → `RackQuerySchema` → `findByRack` →
   `TubeDto.toRackTubeList` → `getTubesByRack` + `getLocationCounts` → controllers → routes (order).
   **+ `getTubesByRack` service test.** HTTP-verifiable.
2. **Client data** — `byRack` + `locationCounts` keys/services/hooks; color core extraction.
3. **View-model** — forward `gridConfig`.
4. **Components** — `StorageNavigator` chrome + accordion, `StorageBoxMinimap`, owner badges, occupancy
   bars + facility fill from counts (parity with study C).
5. **Tree lines + nubs** — additive selector, scoped glow CSS, per-node nubs (amber-on-full).
6. **a11y + responsive** — keyboard parity, 180–280px; confirm modal unchanged; confirm live refresh.
7. **Swap + cleanup** — mount in `BiobankDashboard`, remove old wrapper, QA both surfaces.

---

## 10. Risks / verification

- **Route shadowing** by `/tubes/:id` — register `by-rack` + `location-counts` first (§5.5).
- **Shared-file regressions** — modal must look identical after the additive selector + scoped CSS (visual check).
- **Keyboard parity** — re-test the full tree keyboard model with the box as a thumbnail.
- **Tree-line / DOM-nub alignment** — SVG elbow endpoint vs per-node nub; tune offset.
- **Access scope on counts** — `getLocationCounts` must filter `countGroupedByLocation` to `getAllowedTankIds`
  (a restricted user must not see counts for tanks they can't access).
- **Tests** — read path currently has no service/controller tests (only `Tube.test.ts` + `TubePositionService.test.ts`);
  add the focused `getTubesByRack` service test; verify with `npm run typecheck` / `npm test`.
- **Cleanup candidate (out of scope):** `queryKeys.tubes.locationStats` appears to have no consumer.
```
