# Workbench: Code Names Match App Words (inventory, nothing renamed yet)

The app's words were settled in `WORKBENCH_WORDS.md`, but the workbench code still names most
ideas with older words (block for card, vessel for Plate map, formula for Calculations, cytometer
for the Flow panel, sources for Donors, dropped for Set aside, mix for Stain…). This doc is the
inventory for renaming the code so every idea is named by its app word. **Nothing is renamed
until Evan has gone through the decisions at the end.**

Swept 2026-11-21: every identifier, file, folder, saved key and stored value in
`client/src/domains/workbench/` and `packages/shared-schemas/src/workbench/`, plus everything
outside them that uses those names. Four sweeps (board and cards; Plate map and dilutions; Flow
panel and Flow diagram; Calculations, Values, Materials and cells), each claim spot-checked
against the code.

---

## The rule going forward

- **Code names an idea by its app word.** A new identifier, file or saved key uses the word from
  `WORKBENCH_WORDS.md`. If the app has no word for it yet, the word is settled first.
- **One word, one meaning in code too.** Where a code word means two things today (below), each
  meaning gets its own word.

## How it has to be done

- **Never find-and-replace.** Almost every word has look-alikes that would break:
  - **block:** the CSS class `block`, the browser option `scrollIntoView({ block })` and the lab
    verb "Blocking".
  - **card:** `discard`, cardiomyocytes and mCardinal.
  - **tab:** `table`, `tabIndex` and `database`.
  - **plate:** `template`.
  - **set:** JavaScript's `Set` and `.set()`.
  - **fold:** the saved Materials key `foldedGroups`, and the × unit (which really is a fold).
  - **cell / cells:** biological cells, and table cells.
  - **flow:** `overflow` and the `Workflow` icon.
  - **cytometer:** `hemocytometer`, and the cytometer picture in the Flow diagram.
  - **mix:** CSS `color-mix()` and the Values mix rows.
  - **Fluor:** the dye names cFluor, eFluor, NovaFluor and Alexa Fluor.
  - **marker:** the SVG arrowhead `<marker>`.
  - **lot:** slot, blot and plot.
  - **board:** Keyboard and clipboard.
  - **Extra:** TypeScript's `Extract`.
  - **drop:** drag-and-drop and `DropdownMenu`.
  - **Instrument / Dye / Antibody:** saved material types.

  Every rename is done identifier by identifier from this inventory, checked by the typecheck.

- **Saved keys and code properties are the same thing.** The card types in code are read straight
  from the file schema, so a card's fields in code _are_ its saved keys. Renaming `isDropped` in
  code is renaming it in the file. So the work splits in two:
  - **Phase A, code-only names:** types, functions, components, files, folders, variables and
    constants that are not saved. These are safe at any time and done one area per commit.
  - **Phase B, saved words:** a new file format (version 5) that renames the saved keys and values
    in one step, with a conversion that runs when an older file opens. It also migrates the lab
    memory kept in the browser. It is one version bump, so a file can never hold half the renames.
- **Where data is saved:**
  - **Protocol files** (.json), now version 4. Versions 1 to 3 are converted on open
    (`legacyProtocolSchemas.ts`, `paintedGroupUpgrade.ts`, `seriesDiluentUpgrade.ts`).
    `stainSideUpgrade.ts` runs on every open.
    - The v3→v4 step jumps straight to "current", so v5 needs a frozen v4 copy and its own step.
  - **The unsaved-changes copy** in the browser (`odysseus-workbench-recovery`). It goes through
    the same conversion.
  - **Lab memory** in the browser (`odysseus-workbench-lab-memory`), with keys `kinds`, `materials`,
    `fields`, `startingFields`, `dyes`, `sources`, `sourceFields`, `startingSourceFields`.
    - It fills missing keys from an empty default. So renaming a key without a migration silently
      forgets remembered donors and fluors.
  - **Ignored suggestions** (`protocol.ignoredReadings`) hold saved prefixes `material:`, `value:`
    and `plate:`.
  - **Renamed generated names** (`plate.amountNames`) are filed under keys built from saved names
    (`s:<series>:start`, `s:<series>:fold`, `s:<series>:points`, `a:<line>:<subject>-<word>`).
    - Renaming a series key, or a term's word, means rewriting these keys or the user's renames
      are lost.
- **Testing:** every saved sample file (`utils/protocolFile/fixtures`) is version 1, and none holds
  a Flow panel, a Stain side, donors, set-aside materials, recipes or a Plate-map-on-another-page
  card. **Before any renaming, add version 4 sample files covering all of those, with a test that
  opens them.** Phase B is then checked against them and against Evan's real protocol files.
- **What must keep working:** the frozen mockup (`docs/mockups/workbench-builder-study.html`)
  writes version 1 files, so the version 1 reader keeps its old words.
- **Outside the workbench:**
  - `packages/shared-schemas/src/index.ts` re-exports the card types.
  - `AppDashboard.tsx` imports only `WorkbenchPage`.
  - No server code uses any of these names.
  - Docs that name code paths (`WORKBENCH_PLAN.md`, `WORKBENCH_PLATE_SPEC.md`,
    `WORKBENCH_WORDS.md`, `WORKBENCH_MATERIALS.md`, `WORKBENCH_DYE_PEAKS.md`) are updated with
    each rename.
- **Name clashes with the rest of the app:**
  - The biobank already has `Donor`, `DonorService` and so on, so workbench donor types are
    prefixed (`MaterialDonor`).
  - Supplies and reagents have `Vendor`.

---

## 1. The board and its cards

| Idea (app word)                                | Code today                                                                                                                                                                                                                                                                                                                                                                                                                      | Proposed                                                                                                              | Saved today                                       | Notes                                                                                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **card**                                       | `block` everywhere: `ProtocolBlock`, `ProtocolBlockType`, `blockBase`, `BLOCK_TYPES`, `BLOCK_ICONS`, `BLOCK_PANELS`, `useUpdateBlock`, `useShowBlock`, `useBlocksOf`, `createBlock`, `WorkbenchBlockShell`, `…Rail`, `…UsageTip`, `…PendingPanel`, folders `ui/components/blocks/` (127 files) and `utils/blocks/`, `blockId` (100+), about 1,700 `block` variables, the DOM names `data-block-id` and `workbench-block-handle` | `card`: `ProtocolCard`, `CARD_TYPES`, `useUpdateCard`, `WorkbenchCardShell`, `ui/components/cards/`, `cardId`, `card` | **`blocks`** (the list of cards)                  | Not: the CSS class `block`, `scrollIntoView({ block })`, the verb "Blocking", `Fc block`, `blockedBy` (meaning prevented) |
| A step with its sub-steps                      | `moveStepBlock`, `blockEnd`                                                                                                                                                                                                                                                                                                                                                                                                     | `moveStepWithSubSteps`, `subStepsEnd`                                                                                 | no                                                | A second meaning of "block"                                                                                               |
| **page** (board pages)                         | `page`, `pages`, `activePageId`…                                                                                                                                                                                                                                                                                                                                                                                                | keep                                                                                                                  | `pages`, card `page`                              | Already right. `WorkbenchPage` is the screen itself (house naming), keep.                                                 |
| **tab** (only inside a card)                   | `WorkbenchPageTabs` is the strip of _pages_                                                                                                                                                                                                                                                                                                                                                                                     | `WorkbenchPageStrip`                                                                                                  | no                                                | So "tab" means only an in-card tab                                                                                        |
| **Duplicate** a plate or card                  | `CopyPlace`, `isCopying`, `copyAnchorRef`, `copyPlateIntoCard` (which really adds a tab in the same card)                                                                                                                                                                                                                                                                                                                       | `DuplicatePlace`, `isDuplicateMenuOpen`, `duplicateAnchorRef`, `duplicatePlateAsTab`                                  | no ("Plate 1 copy" is a name the user sees, kept) | Clipboard Copy (Ctrl+C) and the unsaved-changes copy stay "copy"                                                          |
| A name used twice (a clash)                    | `isDuplicate`, `duplicateIds`, `findDuplicateMaterial`, `pendingDuplicate`…                                                                                                                                                                                                                                                                                                                                                     | `isClash`, `clashIds`, `findClashingMaterial`…                                                                        | no                                                | Otherwise "duplicate" would mean two things. Matches `materialClashes.ts`.                                                |
| **Remove** a page                              | `deletePage`, `deletingPageId`, `requestDelete`…                                                                                                                                                                                                                                                                                                                                                                                | `removePage`, `removingPageId`, `requestRemove`                                                                       | no                                                | The verb shown is already Remove                                                                                          |
| Move in / Move out                             | `canMoveIn`, `canMoveOut`                                                                                                                                                                                                                                                                                                                                                                                                       | keep                                                                                                                  | step `level`                                      | Already right                                                                                                             |
| **Table** card                                 | type `'list'`, `BlockOf<'list'>`                                                                                                                                                                                                                                                                                                                                                                                                | `'table'`                                                                                                             | **`type: 'list'`**                                | The card has no editor yet. The helper `list` and the "list" of guessed names stay.                                       |
| **Procedure** card                             | type `'steps'`, `WorkbenchStepsPanel`, `stepsBlockId`, the hint word `<steps>`                                                                                                                                                                                                                                                                                                                                                  | `'procedure'`, `WorkbenchProcedurePanel`, `procedureCardId`, `<procedure>`                                            | **`type: 'steps'`**                               | The steps themselves stay `steps` (`page.steps`)                                                                          |
| Sketch, Text cards                             | `'sketch'`, `'text'`                                                                                                                                                                                                                                                                                                                                                                                                            | keep                                                                                                                  | yes                                               | Already right. Never search for `'text'`: 42 other uses.                                                                  |
| A Plate map card showing another page's plates | `'plateView'`, `PlateViewBlock`, `WorkbenchPlateViewPanel`, `viewsOf`                                                                                                                                                                                                                                                                                                                                                           | see decision 7                                                                                                        | **`type: 'plateView'`**                           | F5: it is just a card, never a "view" or "copy"                                                                           |

## 2. Plate map, labware, wells and plate marks

| Idea (app word)                                              | Code today                                                                                                                                                                                                               | Proposed                                                                                          | Saved today                                     | Notes                                                                                                                      |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Plate map** card                                           | `VesselMapBlock` (271 uses, 65 files), `normalizeVesselMap`, `useUpdateVesselMap`, `vesselMapNames.ts`, `vesselMapValues.ts`, folders `blocks/vessels/` and `utils/vessels/`                                             | `PlateMapCard`, `normalizePlateMap`, `useUpdatePlateMap`, `plateMapNames.ts`, folders `plateMap/` | **`type: 'plate'`**                             | The old automatic title "Vessel map" stays recognised for old files                                                        |
| A variable holding the whole Plate map card                  | `plate` in about 10 files (`dilutionRuns`, `valueTable`, `plateValueRows`, `platedCells`, `plateSwatches`)                                                                                                               | `plateMap`                                                                                        | no                                              | Today `plate` means the whole card in some files and one plate in others                                                   |
| One plate inside the card                                    | `plates`, `Plate`, `plateId`                                                                                                                                                                                             | keep                                                                                              | `plates[]`                                      |                                                                                                                            |
| **labware** (one plate format or loose kind)                 | `VesselType`, `VESSEL_TYPES`, `vesselOf`, `PlateVessel`, `LooseVessel`, `vesselCatalog.ts`, `vesselSizing.ts`, `WorkbenchVesselPickerPanel`, `Vessels`, `applyVessels`, `useVesselChanges`, about 130 `vessel` variables | `LabwareType`, `labwareOf`, `labwareCatalog.ts`, `WorkbenchLabwarePickerPanel`, `applyLabware`…   | **`plates[].vessel`, `sets[].vessel`**          | `LOOSE_VESSELS` is defined twice today (schemas and client) with different shapes                                          |
| The tab of loose tubes and flasks (named by what it holds)   | tab kind `'shelf'`, `shelfName`, `shelfNameOf`, `WorkbenchVesselShelfList`, `WorkbenchShelfVesselButton`                                                                                                                 | tab kind `'loose'`, `looseTabName`, `WorkbenchLooseLabwareList`…                                  | **`shelfName`**                                 | "Shelf" is also a Storage value on materials: keep that                                                                    |
| One row of loose labware (kind × count)                      | `sets[]` (`set.vessel`, `set.count`)                                                                                                                                                                                     | `looseLabware[]` with `labware`, `count`                                                          | **`sets`**                                      | Can't be found by search (`Set`, `.set(`)                                                                                  |
| Position noun (well, tube, flask, dish)                      | `VesselNoun`, `VESSEL_PLURALS`, `perVessel`, `withPerVessel` (20), `PER_VESSEL_*`                                                                                                                                        | `WellNoun`, `perWellNoun`, `withPerWell`…                                                         | indirectly, in `counts` keys `used:tube`        | "Position(s)" is what mixed cards show; see decision 19                                                                    |
| A grid position                                              | `VesselSpot`, `spots`, `spot` (220), `stainSpotOf`, `moveStainSpots`                                                                                                                                                     | `MapWell`, `wells`, `stainWellOf`, `moveStainWells`                                               | no                                              | F2: "spot" left the app                                                                                                    |
| **well** contents (well → line → entry)                      | `plate.cells`, `CellLine`, `isFilledCell`, `upgradeCellLine`                                                                                                                                                             | `wells`, `WellEntry`, `isFilledEntry`                                                             | **`cells`**                                     | `CellLine` reads as a biological cell line. The v2 key `wells` had another shape, but the version number tells them apart. |
| **Sample** (what's in a position)                            | line `values`, `valueId`; Stain side `occupants`                                                                                                                                                                         | keep `values`; `occupants` → `samples`                                                            | `lines[].values`, `valueId`                     |                                                                                                                            |
| A line on the plate                                          | `PlateLine`, `lines`, `lineId`, `colorLine`                                                                                                                                                                              | keep (`PlateLine` is also used on tube tabs: `MapLine` optional)                                  | `lines[]`                                       |                                                                                                                            |
| **Plate marks**: Color (solid), Band (outlined), Stripe, Tag | role values `color`/`band`/`stripe`/`tag`; swatch kind `'fill'` for Color; `PlateBand` holds _every_ mark; `BandPlace 'tag'` means a drawing spot, not the Tag role                                                      | swatch kind `'color'`; `PlateBand` → `PlateMark`; `BandPlace 'tag'` → `'label'`                   | role values saved (kept: they match the picker) | Today "mark" and "band" are used for the same thing                                                                        |
| Show replicates as one                                       | `mergesReplicates`, `onToggleMerge`, `MergedWells`                                                                                                                                                                       | `showsReplicatesAsOne`…                                                                           | **`mergesReplicates`**                          | Pool samples / Pool replicates stay "pool"                                                                                 |

## 3. Dilution series (on the plate and on the Dilutions card)

| Idea (app word)                                  | Code today                                                                           | Proposed                                                                         | Saved today                                                     | Notes                                                                                     |
| ------------------------------------------------ | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Dilution series                                  | `series`, `PlateSeries`, `seriesId`                                                  | keep                                                                             | `series`, `seriesId`                                            |                                                                                           |
| **Top conc. / Top dil. / Top amount**            | `series.start`, `form.start`, `field: 'start'`                                       | `top`                                                                            | **`series.start`**, and the key `s:<id>:start` in `amountNames` |                                                                                           |
| **Dil. factor**                                  | `series.fold`, `foldOf`, `seriesFold`                                                | `dilutionFactor`                                                                 | **`series.fold`**, and `s:<id>:fold`                            | `FOLD_UNIT` and the `'fold'` unit kind stay: there "fold" really means ×                  |
| A typed list of values (the list kind of series) | `series.points` (it holds the values, not their number)                              | `values`                                                                         | **`series.points`**, and `s:<id>:points`                        | "Points" is the app word for the _number_, so the code word clashes today                 |
| **Points** (how many)                            | `pointCount`, `POINTS`                                                               | keep                                                                             |                                                                 |                                                                                           |
| A well's point in the series                     | `seriesStep`                                                                         | `seriesPoint` (the function of that name becomes `pointAmount`)                  | **`cells…seriesStep`**                                          | "Step" is Procedure's word (C4)                                                           |
| **Replicates**                                   | `wellsPerPoint`, `busiest`                                                           | `replicates`                                                                     | no                                                              |                                                                                           |
| The series' Dilutions settings                   | `series.prep` with `volumeAdded`, `wellVolume`, `extraPercent`, `roundTo`, `diluent` | W114 step 2 moves these out of the series. They are renamed by moving, not here. | **yes**                                                         | Do this rename as part of W114 step 2                                                     |
| Working strength / conc. / dil.                  | `PrepPoint.working`, `topWorking`                                                    | `workingConc`, `topWorkingConc`                                                  | no                                                              | `WorkingNode` and the other "working" names in Calculations are a different meaning: keep |

## 4. Flow panel and Flow diagram

The order matters here, or new names land on names still in use.

| Idea (app word)                                           | Code today                                                                                                                                                                                               | Proposed                                                                                                                       | Saved today                                | Notes                                                                                                                                                         |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Flow diagram** card                                     | type `'flow'`, `WorkbenchFlowPanel` (the _diagram's_ body), folders `blocks/flow/` and `utils/flow/`, `FlowLayout`, `FlowStep`, `flowPlaceStore`, `data-flow-step`                                       | `'flowDiagram'`, `WorkbenchFlowDiagramPanel`, folders `flowDiagram/`                                                           | **`type: 'flow'`**                         | **First**, to free the name for the Flow panel. FlowJo, Phosflow, `overflow` and the `Workflow` icon stay.                                                    |
| **Flow panel** card                                       | type `'cytometer'`, `CytometerBlock`, `useCytometerActions`, 13 `WorkbenchCytometer*` components, folders `blocks/cytometer/` and `utils/cytometer/`, `CYTOMETER_CELL`                                   | `'flowPanel'`, `FlowPanelCard`, `useFlowPanelActions`, `WorkbenchFlowPanel*`, folders `flowPanel/`                             | **`type: 'cytometer'`**                    | Second                                                                                                                                                        |
| **cytometer** (the machine you pick: iQue, A8)            | `Instrument`, `instrumentSchema`, `instrumentCatalog.ts`, `BUILT_IN_INSTRUMENTS`, `pickInstrument`                                                                                                       | `Cytometer`, `cytometerCatalog.ts`, `BUILT_IN_CYTOMETERS`, `pickCytometer`                                                     | **`instrument`**                           | Third. Not touched: the material type "Instrument", the cytometer picture, hemocytometer, and the text patterns that guess "flow cytometer" as an Instrument. |
| **marker** (one row on the Flow panel)                    | `PanelStain`, `readStain`, `stainCandidates`, `addStain`/`removeStain`, `WorkbenchCytometerStainRow`, `WorkbenchCytometerAddStain`, `stainPlacement.ts`, `DetectorSlot.stains`                           | `PanelMarker`, `readMarker`, `markerCandidates`, `addMarker`, `WorkbenchFlowPanelMarkerRow`, `markerPlacement.ts`              | rows are saved as `rows`                   | Fourth: "stain" has to be freed before Stain can use it. `PanelStain.marker` becomes `markerName`.                                                            |
| **Cocktail** step of a marker (Surface / ICS / Viability) | `rows[].stain`, `plus[].stain`, `stainSteps()`, `STARTING_STAINS`                                                                                                                                        | `cocktail`, `cocktailNames()`, `STARTING_COCKTAILS`                                                                            | **`rows[].stain`, `mixes[].plus[].stain`** | Fifth. The worked-out tube ("Full stain Surface cocktail") is today's `Cocktail` and becomes `CocktailTube`.                                                  |
| **Stain** (what a well gets: Full stain, FMO, Unstained)  | `mixes`, `Mix`, `newMix`, `fullStainMix`, `addMixes`, `removeMix`, `WorkbenchCytometerMixes`, `cytometerMixes.ts`; plate side `StainMix`, `stainMixes()`, `mixId` (62), `MIX_COLORS`                     | `stains`, `Stain`, `newStain`, `fullStain`, `removeStain`, `WorkbenchFlowPanelStains`, `PlateStain`, `stainId`, `STAIN_COLORS` | **`mixes`**                                | Sixth. `MixColumn` is really a marker column (`MarkerColumn`). Values mix rows, recipe "Mix conc." and the verb Mix stay.                                     |
| The Unstained control vs **No stain assigned**            | `unstainedMix` (the control); `stainLook: 'unstained'`, `fillUnstained` (wells with no stain); `NO_STAIN_COLOR` (a stain with no markers)                                                                | `unstainedControl`; `'unassigned'`, `fillUnassigned`; `EMPTY_STAIN_COLOR`                                                      | no                                         | Three ideas under one word today                                                                                                                              |
| **Fluor** (the light)                                     | `dyes`, `Dye`, `DyeCatalog`, `BUILT_IN_DYES`, `ProtocolDye`, `fluorochrome` (52), `FLUOROCHROME_SQUARE`, `dyeColor`, folders `utils/dyes/`, `components/dyes/`, `useDyeCatalog`, `WorkbenchDyeAddDialog` | `fluors`, `Fluor`, `FluorCatalog`, `ProtocolFluor`, `fluor`, `FLUOR_SQUARE`, `utils/fluors/`…                                  | **`protocol.dyes`** and lab memory `dyes`  | The material type "Dye" (a viability/DNA dye reagent) stays. So do IRDye, DyeCycle and the fluor brand names.                                                 |
| The fluor / conjugate picker                              | `WorkbenchDyeField` (Fluor on the Flow panel, Conjugate in Materials)                                                                                                                                    | `WorkbenchConjugateField`                                                                                                      | no                                         | It always writes the material's Conjugate                                                                                                                     |
| **Conjugate**                                             | `CONJUGATE_FIELD` and a second `CONJUGATE_KEY` with the same value                                                                                                                                       | one `CONJUGATE_FIELD`                                                                                                          | `values.conjugate`                         |                                                                                                                                                               |
| Detector, laser, peak, Stain side                         | `detectors`, `lasers`, `peak`, `side`, `stain` (well → stain), `stainedIn`                                                                                                                               | keep                                                                                                                           | yes                                        | Already right                                                                                                                                                 |
| Dil. / Per test, and vol./well on the Flow panel          | `rows[].dilution`, `dilutionFactorName`, `stainAmountId`                                                                                                                                                 | wait for W114 step 3                                                                                                           | `rows[].dilution`                          | Avoid "factor": that is the series' Dil. factor                                                                                                               |

## 5. Calculations

| Idea (app word)                          | Code today                                                                                                                                                      | Proposed                                                                              | Saved today           | Notes                                                                                                                                        |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Calculations** card                    | type `'formula'`, `FormulaBlock`, `WorkbenchFormula{Panel,Section,Row,Editor,Table,WorkedOutGroup,…}`, folder `blocks/formulas/`, `data-formula-row`            | `'calculations'`, `CalculationsCard`, `WorkbenchCalculation*`, `blocks/calculations/` | **`type: 'formula'`** |                                                                                                                                              |
| **calculation** (a named result)         | `FormulaItem`, `insertFormula`, `removeFormula`, `formulaCount`, `cellFormulas.ts`, `materialRecipeFormulas.ts`, `dilutionFormulas.ts`, `cytometerFormulaNames` | `CalculationItem`, `insertCalculation`, `calculationCount`, `cellCalculations.ts`…    | `items`               |                                                                                                                                              |
| **formula** (the math typed for one, H2) | `expr`; `parseFormula`, `FormulaNode`, `formulaCompletions`, `WorkbenchFormulaCompletionList`                                                                   | keep the expression names; `expr` → `formula`                                         | **`items[].expr`**    | Here "formula" is the right word                                                                                                             |
| The pool of every name, solved           | variable `calculation` (460 uses), type `BoardCalculation`, `calculateBoard`, `BoardName`                                                                       | variable `board`, type `SolvedBoard`; keep `BoardName`, `calculateBoard`              | no                    | **First in this area.** Otherwise "calculation" means one result and the whole board at once. The app's own words are "names on this board". |
| Worked-out group                         | `workedOut`, `WorkedOutGroup`                                                                                                                                   | keep                                                                                  | no                    |                                                                                                                                              |

## 6. Values

| Idea (app word)                                | Code today                                                                                                                                                                                            | Proposed                                                                      | Saved today                      | Notes                                                 |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------- |
| A **row** (one material or one mix)            | `sections`, `ValueSection`, `addValueSection`, `sectionId` (62); value item key `section`                                                                                                             | `rows`, `ValueRow`, `addValueRow`, `rowId`                                    | **`sections`, items' `section`** | The on-screen table row stays `ValueTableRow`         |
| **Whole experiment**                           | `generalTitle`, `generalTitleOf`, destination `kind: 'general'`, `generalItems`/`generalRows`/`GeneralValueActions`; the empty-key bucket is defined twice (`WHOLE_EXPERIMENT` and `GENERAL_SECTION`) | `wholeExperimentTitle`, `kind: 'wholeExperiment'`, one `WHOLE_EXPERIMENT_KEY` | **`generalTitle`**               |                                                       |
| A value                                        | `ValueItem`, `items`                                                                                                                                                                                  | `ValueEntry`                                                                  | `items`                          |                                                       |
| Mix rows                                       | `mixName`, `MIX_GROUP`                                                                                                                                                                                | keep (Mix vs Mixture is parked)                                               | `mixName`                        |                                                       |
| "needed", "From your plate", "From your steps" | `ValueNeed`, `plateNameOffers`, `readStepReadings`; ignored ones in `ignoredReadings`                                                                                                                 | keep; `ignoredReadings` → `ignoredSuggestions`                                | **`ignoredReadings`**            | It already holds plate names as well as step readings |

## 7. Materials, donors and cells

| Idea (app word)                     | Code today                                                                                                                                                                 | Proposed                                                                                                             | Saved today                                                                     | Notes                                                                                                                                                             |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Set aside** (restorable)          | `isDropped` (81), `isDroppedOpen`, `drop()`, `restoreDropped`, `WorkbenchMaterialDroppedSection`, status `'dropped'`                                                       | `isSetAside`, `isSetAsideOpen`, `setAside()`, `WorkbenchMaterialSetAsideSection`                                     | **`isDropped`, `isDroppedOpen`**                                                | Drag-and-drop names, `DropdownMenu` and NanoDrop stay                                                                                                             |
| **Removed from Materials**          | status `'missing'`, which also means "not on this board"                                                                                                                   | `'removed'`                                                                                                          | no                                                                              |                                                                                                                                                                   |
| Other "drop" meaning remove         | `dropPasteRow`, `dropValuesTwinnedByPlate`                                                                                                                                 | `removePasteRow`, `removeValuesTwinnedByPlate`                                                                       | no                                                                              |                                                                                                                                                                   |
| **Donors** (the list; renamable)    | `sources`, `MaterialSource(s)`, `SOURCES_LABEL`, `sourcesIn`, `findSource`, `SOURCE_FIELDS`, `WorkbenchMaterialSourceTable`, lab memory `RememberedSource`, `sourceFields` | `donors`, `MaterialDonor(s)`, `DONORS_LABEL`, `donorsIn`, `findDonor`, `DONOR_FIELDS`, `WorkbenchMaterialDonorTable` | **`sources`**, and lab memory `sources`, `sourceFields`, `startingSourceFields` | The code already mixes in `donor*` names. Not the generic "source" meaning where something came from (`sourceBlockId`, `ValueCellSource`): those become `origin`. |
| **Source** (who supplied it)        | key `vendor` on materials, but `source` on donors and software                                                                                                             | one key `source`                                                                                                     | **`values.vendor`**                                                             | `VENDOR_LEXICON` and the other guesser names become `supplier*`                                                                                                   |
| Cell counts                         | keys `count` (Total cell conc.), `total-count` (Total cells), `live-count` (Live cells), `live-cell-conc`, `volume`, `viability`                                           | `total-cell-conc`, `total-cells`, `live-cells`, `live-cell-conc`, `volume`, `viability`                              | **yes**                                                                         | `volume` is also a Tube field key with another meaning (kept, different material type)                                                                            |
| Antibody Dil. / Per test            | key `amount` (and Fc block "Amount" µL uses the same key)                                                                                                                  | wait for W114 step 3                                                                                                 | `values.amount`                                                                 |                                                                                                                                                                   |
| Recipe                              | `recipe` (the ingredient list) **and** `recipe` (the "Recipe note" text field)                                                                                             | text field key `recipe-note`                                                                                         | **both**                                                                        | One key, two things                                                                                                                                               |
| A material made in-house            | `isMix`, `mixFinalId`, `mixWorkingId`                                                                                                                                      | `isMadeHere`, `recipeFinalId`…                                                                                       | no                                                                              | A third meaning of "mix"                                                                                                                                          |
| Two `LOT_FIELD`s                    | `'lot'` (materials) and `'lot-vial'` (donors)                                                                                                                              | `LOT_FIELD`, `DONOR_LOT_FIELD`                                                                                       | yes (values kept)                                                               |                                                                                                                                                                   |
| Material type vs "Kind of material" | `MaterialKind`, `WorkbenchMaterialKindSelector` (aria "Kind of material"), lab memory `kinds`                                                                              | see decision 17                                                                                                      | lab memory `kinds`                                                              |                                                                                                                                                                   |
| Field-definition options            | `FieldExtras`, `extras`                                                                                                                                                    | `FieldOptions`                                                                                                       | no                                                                              |                                                                                                                                                                   |

---

## Order of work

1. **A safety net first:** version 4 sample files covering every card, and a test that opens them.
2. **Words still wrong on screen** (below), fixed on their own, since they are app changes, not code
   names.
3. **Phase A, code-only names, one area per commit,** each green before the next. Within the
   Flow panel the order is fixed (Flow diagram, Flow panel, cytometer, marker, cocktail, stain):
   1. Clear the clashes: `calculation` → `board`, copy → duplicate, duplicate → clash, Flow
      diagram.
   2. Flow panel, in its fixed order, then fluor.
   3. Plate map, labware, wells, the series and the marks.
   4. Calculations.
   5. Values.
   6. Materials, donors, set aside.
   7. Procedure and Table.
   8. **Card last** (it touches nearly every file).
4. **Phase B, file format v5:** every saved key and value in the tables above renamed in one
   conversion, the lab memory migrated, all checked on the sample files and Evan's real files.
   The series prep keys go with W114 step 2 instead.

## Words still wrong on screen (found by the sweep)

These are app wording fixes, separate from code names:

1. "Vessels", the screen-reader label on the tubes grid (`WorkbenchVesselShelfList.tsx:111`).
2. "stronger color = higher amount" on the legend (C3 picked "higher conc." / "higher dil.").
3. "Step by a number instead" in the series form (C4: "step" is Procedure's).
4. "Plate side" (screen-reader label) also on tube tabs.
5. "BV421 is a fluorochrome" in the material guess (D5: Fluor).
6. "Formula name", the screen-reader label in the Calculations editor (should be "Calculation
   name").
7. Hints still in old words:
   - Materials: "Add vendor" (`blockTypes.ts:32`).
   - Values: "Raji per well", "Raji count" (`:64`).
   - Calculations: "Raji cells needed" (`:81`).
   - Procedure: "drop in a name" (H4: no "drop").
8. "plating concentration" in the cell math's generated name (E1: "plating conc.", needs the
   rename-follow).
9. "Needs the well total … under Whole experiment" (`materialRecipeFormulas.ts:36`). It uses the
   banned "well total" and ignores a renamed Whole experiment.
10. "needed for dilutions", a generated name outside the Total needed pattern.
11. The dead placeholder "Add: Total volume" (bug 11 in the words list).
12. "Removed Raji section" (Values calls it a row), and "Name this group" / "Group name" on Whole
    experiment.
13. Donor text fixed to "donor" ("Add donors", "Donor of…") even when the list is renamed.
14. "Panel: VL1" in a Materials hover (Flow panel detectors) next to the Materials "Panel" field:
    one word for two ideas.
15. Held on purpose for W114 steps 2 and 3: "Volume added", "Dilution factor" and "Amount per
    well" on the Flow panel.

---

## Decisions for Evan

Each has a recommendation; anything not listed follows the tables above.

1. **Rename the saved words too (Phase B)?** Recommend **yes**, as one version 5 conversion at the
   end. It covers card types, the keys in the tables, and the lab memory.
2. **Card everywhere in code,** including the ~1,700 `block` variables? Recommend **yes**, last.
3. **New saved card names.** Recommend: `cards`, `table`, `procedure`, `calculations`, `plateMap`,
   `flowPanel`, `flowDiagram`. The hint text only reads lowercase card names today, so that reader
   is widened to allow `plateMap`.
4. **The solved pool of names.** The variable `calculation` (460 uses) becomes `board`, and
   `BoardCalculation` becomes `SolvedBoard`, matching "names on this board". Recommend yes.
5. **`formula` vs `calculation`.** The card and its results become calculation; the typed math
   stays formula, and the saved `expr` becomes `formula`. Recommend yes.
6. **Well contents:** saved `cells` → `wells`, `CellLine` → `WellEntry`. Recommend yes.
7. **A Plate map card on another page:** `plateView` → `linkedPlateMap` (the type and its
   components). Recommend yes; it shows the same plates, so "linked" fits better than view or copy.
8. **The loose-labware tab:** `sets` → `looseLabware`, `shelfName` → `looseTabName`, tab kind
   `shelf` → `loose`. Recommend yes.
9. **Series:** `start` → `top`, `fold` → `dilutionFactor`, the typed list `points` → `values`,
   `seriesStep` → `seriesPoint`. Recommend yes; the saved renamed-name keys follow.
10. **Plate marks:** `PlateBand` → `PlateMark`, swatch kind `fill` → `color`, `BandPlace 'tag'` →
    `'label'`. Recommend yes (code-only).
11. **The Flow panel's body component.** With the Flow diagram's moved to
    `WorkbenchFlowDiagramPanel`, it is `WorkbenchFlowPanel` (not `…FlowPanelPanel`). Recommend
    yes.
12. **Flow panel inner words** (marker, cocktail, stain) in the fixed order, the worked-out tube
    `CocktailTube`, the row's text `markerName`. Recommend yes.
13. **Dye → Fluor** for the whole light catalog and its saved list. The material type "Dye" stays,
    and the picker becomes `WorkbenchConjugateField`. Recommend yes.
14. **Values row and Whole experiment** (`sections` → `rows`, `generalTitle` →
    `wholeExperimentTitle`). Recommend yes.
15. **Donors** (`sources` → `donors`, types `MaterialDonor`), and the material **Source** key
    `vendor` → `source`. Recommend yes for both.
16. **Cell count keys** spelled out (`total-cell-conc`, `total-cells`, `live-cells`), and the
    Recipe note key `recipe-note`. Recommend yes.
17. **Material "Type" vs "Kind of material".** Two words on screen for one idea. Recommend
    **Type** (the column heading); the selector's label and the code follow.
18. **`ignoredReadings` → `ignoredSuggestions`,** and duplicate (clash) → clash. Recommend yes.
19. **The word on mixed cards** ("Vol./position", "3 positions"). F2 never settled one; recommend
    keeping "position".
20. **Flow panel Dil. / vol./well and the antibody `amount` key:** wait for W114 step 3, which
    decides where the number lives. Recommend wait.
