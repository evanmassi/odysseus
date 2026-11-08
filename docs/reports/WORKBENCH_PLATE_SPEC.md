# Vessel map and Dilutions: port spec (slice 3)

Map of the mockup code (`docs/mockups/workbench-builder-study.html`, line numbers refer to it) and the
agreed redesign. Read with `WORKBENCH_PLAN.md` → "Resume here". Already ported and touching plates:
`utils/vessels/vesselCatalog.ts`, `utils/vessels/vesselMapNames.ts` (counts, amounts, material well
counts; still keyed on painted groups), `utils/formulas/nameRenames.ts` (renames group labels), the
v2 schema (`groups`, `wells`, `counts`, `amountNames`) and its legacy upgrade.

## Agreed redesign (decided 2026-11-08)

- **One color system.** Painted groups (`groups` + `wells`) are retired. A well's color comes only from
  the value of its color line. Each line value may carry a `color`.
- **Colors stick.** A value gets the next free palette color when it is created on the color line and
  keeps it (stored on the value); the user can pick another. Neutral values (vehicle, medium, blank,
  untreated, mock…) get the neutral grey. A well with no value on the color line gets no color (the
  mockup gave it the first treatment's color).
- **Same name, same thing.** Values match ignoring case and surrounding space. Typing a value that
  already exists on another line joins that line. Lines with the same values and no well holding both
  merge.
- **Legend rename changes only the value clicked.** No composite "A and B" names.
- **File format v3 upgrade (on open):** per plate block, find the color line (explicit `role: 'color'`,
  else the best-fit line decided below; create a line if none). For each painted group with wells:
  - every painted well shares one color-line value → that value takes the group color (first group
    wins on conflict);
  - no painted well has a color-line value → write `label || "Color N"` as their color-line value,
    colored with the group color;
  - mixed → only the empty wells get the label value.
    Then drop `groups`/`wells`; re-key `counts[groupId]` → `counts[valueId]` and `amountNames` keys
    ending `:<groupId>` → `:<valueId>`; merge duplicate lines as above. Evan's recall file maps cleanly
    (4 painted colors = 4 drug values; two disjoint HCKA lines merge). The polluted joined name the old
    handoff described is not in his saved file, so no repair step is needed.
- **Also fix:** shelf vessels (flasks/tubes) get value colors; legend count and formula count agree
  (both card-wide with overrides); deleting a plate prunes orphan values/lines/series; well-editor
  autocomplete only suggests the line's own values; legend names insertable regardless of tab count.
- **`1:N` series run forward (decided 2026-11-08).** The mockup divided the N, so "1:10" fold 3 read
  1:10, 1:3.33, 1:1.11. The port multiplies it: 1:10, 1:30, 1:90, so the start is always the top
  (strongest) point for every unit and Dilutions needs no `startIsTop`. Saved files are not converted:
  the start and fold the user typed are kept and now read the way they were meant.
- **Picking the color line on upgrade (decided 2026-11-08):** an explicit `role: 'color'` line wins;
  otherwise the `auto` line that keeps the most painted colors apart (ties: more painted wells already
  holding a value on it, then line order), pinned to `role: 'color'`; a new line only when no line
  touches a painted well. The plain auto rule lost two colors in the cytotox example.

## Build split

1. Lead: v3 schema + upgrade + tests; value colors, normalized value identity, line merging; rework
   `vesselMapNames.ts` (counts per value, amounts split by color-line value, twin tags by value);
   drop group renames from `nameRenames.ts`; Values-block plate rows.
   **Done (2026-11-08):** schema v3 (`groups`/`wells` gone, `color` on line values); shared rules in
   `shared-schemas/src/workbench/vesselMapValues.ts` (`plateValueKey`, `colorLineOf`, `isFilledCell`,
   `unifyPlateValues`, `normalizeVesselMap` with sticky palette colors); v2→v3 in
   `paintedGroupUpgrade.ts` (legacy files go legacy→v2→v3; orphan values pruned first; a created
   color line is pinned `role: 'color'`; best-fit color line as decided above); `vesselMapNames.ts` reworked with tests; group renames
   dropped. **Not done:** Values-block plate rows. The client must call `normalizeVesselMap` after
   every plate edit (Agent A's well editor). Vitest reads shared-schemas from `dist`, so run
   `npm run build` in the package before client tests.
2. Agent A: plate grid, sizing, tabs/vessel picker/duplicate/remove, selection + keyboard + clipboard,
   well editor (lines, values, amounts, series editor), merging replicates.
3. Agent B: Dilutions block (preps, pipettes, stock ask, strip SVG).
4. Then: layers/decor (color strength, header doses, bands, captions, hover), legend, `renameMaterialsAfterLabels`,
   `replaceTypedTwins`, the kDa prompt (`isTherapeuticAntibodyName` was removed as unused; re-add with
   its caller), one shared step reader `utils/steps/stepReadings.ts` (materials half exists in
   `utils/materials/materialReadings.ts`), Values plate rows.

## Vessel map feature inventory

- **Catalog/words/title (1103-1179):** `VESSELS`, `VESSEL_SHAPES` (SVG w/h/inside%/vertical), `wordsForTypes`,
  `cardTabs` (one tab per plate + one shared shelf tab for sets), `vesselMapTitle` autoTitle (only when
  title equals the label), `shelfLabel` "Group 1". Keys: `${plateId}:A1`, shelf `${setId}#${i}:1`.
- **Tabs and vessels (2350-2570, 3130-3159, 5857-5868, 5964-6012):** `vesselSheet` (rows/cols/keyAt/labels),
  `setVesselCount` (0..48 per type, total ≥ 1, snapshot + `confirmVesselLoss` rollback, `fitCardWidth`,
  `pruneVesselWells`), Add Vessel picker (search, grouped, −/n/+), `duplicateTab` (new block beside or
  below, re-key cells, reset counts, prune), tab drag-scroll and wheel, remove plate ×, name input
  (plate name / `shelfName`), tools: "Select wells to fill them in" (w ≥ 9), Merge Replicates, Add Vessel,
  Duplicate, ⋮ menu when narrow.
- **Grid (2656-2677, 2877-2906, 2953-2977, 5825-5899):** headers (corner select-all with dose unit, column
  `.ch` / row `.rh` with optional dose), merged anchors span the grid, shelf rows draw SVG vessels.
  Plate wells show only the color line (label, readable amount, short header number when doses have a
  unit); shelf vessels show all lines. Hover title: position (or range · N wells), one line per line.
  `PLATE_SIZING` {min,max,w,ratio}: 6 90/160/4/.85 · 12 76/140/5/.8 · 24 60/120/5/.75 · 48 48/100/6/.65 ·
  96 36/96/6/.6 · 384 22/52/12/.8. Well width `clamp(min,max,floor((bodyW-42)/cols-5))`; classes tiny
  (<30) / narrow (<70) / snug (color line and < 70); height grows to fit text up to 110. Shelf scale
  `clamp(.5,1.25,(bodyW-24)/widest)`. `fitCardWidth` sets `w` from sizing when the only plate's type
  changes. Card height fits content (already `fitsContent` in the port).
- **Selection (3031-3081, 3592-3607, 5904-5963, 6031-6084):** click / shift-rectangle / ctrl-toggle / drag,
  headers select row/column/all, empty click clears; releasing opens the well editor. Keys: arrows
  (shift extends), Ctrl+C/V within the card (asks before overwriting), Esc, Delete (confirm), typing
  opens the editor seeded with the character, double-click edits one well.
- **Well editor (3270-3565):** one row per line on the selection (or `added`): value input (shared value
  or "Mixed. Typing replaces all"), amount + unit or series button, "Dilution" link, Show as (plates
  only, `auto|color|band|caption|hover`), remove ×, suggestions; head shows selection name + count,
  Clear, Done; "+ Line". Placement right / left / below the selection. Closing drops lines with no
  cells. Cell writers keep a line with value/amount/series (or `{unit}` alone); amount parsing via
  `splitAmount` ("10 µM"). The color swatch row is replaced by value colors (legend / editor swatch).
- **Series (2603-2637, 3223-3268, 3326-3331, 3447-3457, 3567-3591):** step mode `{start, unit, fold, direction}`
  or list mode `{points, direction}`; `seriesValue` divides by fold^step (`1:N` multiplies the N instead), splicing `toPrecision(3)`
  into the start text (start/fold may be a board name); preview "N steps: a, b, c, …, z, and K left
  blank"; targets = selection + wells already in the series on that line; steps = index along the axis
  (right/left columns, down/up rows; reversed for left/up); `prep` kept on rewrite; remove clears the
  selected wells. Edge: series spanning plates steps by column across plates.
- **Merge replicates (2909-2951):** plates only, `mergesReplicates !== false`; signature = well text (no
  longer group); grow across and down from each top-left, keep the larger area, skip 1×1.
- **Layers (2679-2875):** auto role per line: varies (>1 text or any series) and color free → color;
  one text on every used well → caption; else band. Header doses (columns then rows, ≥ 2, one amount
  per header on the color line, shared unit in the corner; `headerNumber`: ≥100 rounded, else 2 sig
  figs without leading 0). Captions "Every well: …". Bands per text split into 4-connected clusters:
  ≤ 2 wells ring, non-rectangle tag, spans used rows top bracket, else left bracket; `BAND_COLORS`
  `#f0b35b #e8875a #6fbf73 #c9ccd3`; SVG overlay with lanes 16 px. Series strength: tint 58% at step 0
  down to 12% at the last step (fade follows the color-line series once groups are gone).
  `VALUE_COLORS` `#6fa8e8 #5cc8bd #b48ee6 #e88fbf #8b9cf0 #b8d36a #e8875a #8fd3e8`; neutral `#7d8494`;
  neutral regex `^(no\b|none\b|vehicle|media\b|medium\b|untreated|unstim|blank|empty|mock)` (add `\b`).
- **Legend (2979-3029):** treatments (swatch per color-line value, recolor, rename, count), shade
  ("stronger color = higher dose", "(columns|rows show the dose)"), bands, "<Plural> used".
- **Counts and amounts (1132-1224, 6300-6312, 6507-6732):** formula names "<value> <plural>" (was per
  group), "<Plural> used", plate/set totals; amounts per line grouped by subject+noun ("concentration",
  "volume per well", "per well", "ratio", "amount"), uniform → "<subject> <noun>", else split per
  color-line value "… in <value>"; series "<subject> top dose|dilution", "fold", "points" with twin tag
  " in <value>" or " N"; overrides in `amountNames`, `counts`. Values block shows plate rows under a
  Plate material section (counts per value, Wells used, editable amounts, Remove), `amountSection`
  places amounts by subject material, else the Plate material, else general.
- **Renames (6941-7018):** `renameMaterialsAfterLabels` (a value renamed from a material's exact name
  renames the material), `replaceTypedTwins` (a new plate amount removes a typed Values item with the
  same name), `carryRenames` already ported (drop group labels).

## Dilutions (4764-5021, 6198-6224)

- Preps from every step-mode series: `subject`, `perStep` well counts, `prep` defaulting to
  `{volumeAdded:'', wellVolume:'', extraPercent:'20', roundTo:'5'}`.
- `fold`, `points = maxStep+1`, `wells = max(perStep)`, `ratio = unit==='1:N' && start not a name`,
  `top` = start for every unit (the mockup's backwards ratio series is fixed, see above).
  Missing start/fold → "Give this series a starting amount with a unit, and a fold, on the plate map."
- `strength = wellVolume/volumeAdded` (needs add > 0, well ≥ add, else "Set the well volume and the
  volume added."); `extra = max(0, extra%)/100`; `need = wells·add·(1+extra)`;
  `roughTransfer = ceil(need/(fold−1)/roundTo)·roundTo`; transfer = `dialUp(series pipette)`;
  diluent = `dialNearest(series pipette for transfer·(fold−1))`; `total = transfer + diluent`;
  `inWell(i) = top/fold^i` (ratios ×); working = in-well × strength (ratios ÷).
- Stock: material by name (`normalizeMaterialKey`, then with parentheses stripped), `stock-concentration`
  converted to the series unit, mass↔molar via `molecular-weight` (kDa ×1000); `rawStock =
total·top·strength/stock` (ratios `total/(top/strength)`); `stockUl = dialNearest(stock pipette)`,
  top diluent `total − stockUl`.
- Warnings: ratio stronger than undiluted; stock weaker than the top needs; below a P2 (make an
  intermediate) / more than a P1000; no 12-channel covers the transfer; no 24-channel covers adding;
  more than a 2 mL deep-well holds (use tubes).
- Deep-well plates: 500 µL (fill 450), 1 mL (900), 2 mL (1800); first that fits is recommended.
- Pipettes (smallest whose range covers the volume; `dialNearest`/`dialUp` to the increment):
  stock singles P2 0.1–2/0.002, P10 0.5–10/0.02, P20 2–20/0.02, P100 10–100/0.2, P200 20–200/0.2,
  P1000 100–1000/2; series 12-channel 10 µL 0.5–10/0.02, 20 2–20/0.02, 50 5–50/0.05, 100 10–100/0.2,
  200 20–200/0.2, 300 20–300/0.5, 1200 100–1200/2; plating 24-channel 20 µL 1–20/0.02, 100 5–100/0.1.
  Digits: step < .01 → 3, < .1 → 2, < 1 → 1, else 0.
- Stock ask: inline number + unit when stock or molecular weight is missing (kDa suggested for
  antibodies/proteins/`…mab` names, "about 150 kDa for an IgG"); saving writes the field onto the
  material (creating it from a guess if missing) and shows it.
- UI: per series header "subject · top · 1:fold · N points", settings row (Well volume, Volume added,
  Factor read-only, Extra %, Round to µL), the strip SVG (stock box, stock arrow with pipette, transfer
  arrows, wells with volumes, final and working concentrations, replicates when uneven), footer "Well 1:
  X µL stock + Y µL diluent · Diluent total · Recommended: <plate>", warnings. Known mockup issues:
  point-1 volume formatted with the diluent pipette's digits; empty subject can create an unnamed
  material; prep saved on change only.

## Mockup bugs to not carry over

Composite legend rename; "+ Line" always new; exact-text value identity and id churn while typing;
unstable auto colors (insertion order, cycling, empty wells taking the first color, band/value color
collision); explicit color lines on other tabs blocking auto color; shelves without color; legend vs
formula counts disagreeing; orphan values after removing plates; `{unit}`-only lines counting as
filled; "Remove dilution" clearing only the selection; paint reusing groups by color; plate rows
"Remove" saying wells become empty but keeping cells; `valueAmounts` serving only the first Values
block; export printing every plate's series on every page.
