# Workbench: Where the Data Lives

Design for moving the workbench's saved data out of cards and into the protocol, so a card only
shows and edits it. Started 2026-11-24 with Evan. Built: steps 0 to 5; next 6 and 7. Step 7 (painted
wells point at their material) added 2026-11-25.

## Why

Evan: "I don't want to delete a card and suddenly the data is gone because the data is stored
somewhere and just lives there once I type it in or change it." The goal is a strong foundation
that keeps data safe and easy to use throughout an experiment.

**Judgment (2026-11-24).** The math side is sound: every number exists once, and the shared pool
(`collectBoardNames` → `calculateBoard`) is rebuilt from scratch on every change, so answers cannot
go stale or disagree between cards. Two weaknesses:

1. **Data lives inside cards.** Removing a card removes everything saved in it (`removeCard` in
   `utils/cards/linkedPlateMaps.ts`). The warning reads "Remove the Materials card from this page?"
   and undo is the only safety net. It is also why editing from another card needs an "address
   book" (which card holds this number): Values has one (`writeCellValue` in `valueFill.ts`),
   Dilutions another that only knows Values and Materials (`valueSourceOf` in `valueEdits.ts`).
2. **Formulas and steps point at a number by its name text.** Renames rewrite every formula and
   step (`nameRenames.ts`, run on every change by `reconcile` in `workbenchStore.ts`), two things
   with one name collide silently (`takenNameIds`), and much of file versions 5 to 8 was keeping
   old names pointing at the right thing.

**Decided 2026-11-24: fix both.** Data moves out of cards into the protocol; formulas and steps
point at the number itself, the name being only its label. One shared address book alone was
considered and rejected: it fixes editing from any card, but data would still go with its card.

**Not changing:** the app's own math (cells, dilutions, recipes, flow) finds numbers by their words
(`findTerm`); that is the vocabulary feature, on purpose. A painted well name finding its material
by matching text (`materialSampleCounts`) was listed here too, until Evan's rename in step 4
showed its cost; it is now step 7.

## What a protocol saves today (v8)

From `packages/shared-schemas/src/workbench/protocolFileSchemas.ts`.

**Already outside cards, no change:** pages and steps; title, descriptor, purpose, run number and
dates; lot memory, kept-both, ignored suggestions, the protocol's fluors, default diluent.

**Already a view, no change:** Dilutions, Procedure and Flow diagram cards save nothing of their
own; a linked plate copy (`linkedPlateMap`) is a second window onto another card's plates.

**Already linked by id:** Values rows → material, Values material-number items → material field,
recipe entries → ingredient, Flow markers → antibody and detector, stains → markers, plate stain
painting → stain, linked plate copy → plate card.

**Saved inside a card, goes with it today:**

| Card         | Data                                                                                                                                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Materials    | every material (fields, units, custom fields, labels, set aside, recipe, donors); custom groups                                                                                                                    |
| Values       | loose values, material and mix rows, Assay setup title                                                                                                                                                             |
| Calculations | formulas (name, formula, unit); which materials have a section (`materialSections`)                                                                                                                                |
| Plate map    | plates and other labware, its tab name, lines and their values, what's painted where, amounts, series and prep, typed counts, amount names, stain painting, stained-in moves (kept only when a linked copy exists) |
| Flow panel   | cytometer, markers, stains; removing it leaves the plate's stain painting pointing at missing stains                                                                                                               |

**Card's own, stays with the card:** position, size, folded, expanded height, title, open tab,
side shown, replicates shown as one; Materials folded groups and set-aside open.

**Not built: Table, Sketch and Text note.** Their saved shapes, card types, icons and some table
math exist, but no panel draws them (`CARD_PANELS` in `cardPanels.ts`) and the card rail hides any
type without one, so nothing can make one and neither protocol has one. Removed in step 2
(decision 7).

## Decisions

1. **Decided 2026-11-24: one materials list per protocol; every Materials card shows all of it**
   (two windows onto one list). A filtered card (e.g. only Antibodies on the flow page) is wanted
   later and can be added on top without changing how anything is saved. Values and Calculations
   follow the same rule: one list each, every card of that kind shows all of it.
2. **Decided 2026-11-24: closing a card closes a window; data changes happen inside it.** Evan:
   "you close a card, but really the information is there it's just kind of like closing a
   window. you have the option to remove a plate/clear it, but you also have the option to add
   new plates."
   - Closing a card loses nothing, so it needs no "Remove this card?" warning.
   - Removing a plate, clearing it, removing a material or a value is the real delete, kept with
     its warning and undo; adding a plate inside a card adds it to the protocol.
   - Plate maps and Flow panels can each be several in one protocol, so each card shows one; the
     plate card and the linked copy become one kind of card. One no card shows is offered when
     adding that kind of card, under "Not shown" (decision 8), beside starting a new one.
   - A plate shown in two windows is one plate: removing it in one removes it from both.
3. **Decided 2026-11-24: one rule everywhere, no exceptions.** Sketch drawings and text notes
   follow it too when they are built: closing the card closes the window, the drawing or note waits
   on the card rail under "Not shown" (decision 8), and it can be deleted for good there.
4. **Decided 2026-11-24: formulas and steps point at the number; a missing one waits by name.**
   You still type names; the app keeps which number was meant, so a rename needs no rewriting. A
   name that doesn't exist yet waits and connects when it appears (as "Add as a value" works
   today). When the number a formula uses is deleted, the formula shows it missing ("PBMC
   vol./well was removed") and goes back to waiting by name, so a new value with exactly that name
   connects automatically. It can never swap one live number for another.
5. **Decided 2026-11-24: a page is a chapter, not a window.** Removing a page deletes its steps
   (warning and undo as today) but only closes its cards: their data stays. Today `removePage`
   (`WorkbenchPageBar.tsx`) drops every card on the page with its data and skips `removeCard`'s
   plate hand-over, so a linked copy on another page is left pointing at a removed plate card; the
   redesign removes that bug by its nature.
6. **Decided 2026-11-24: one version of the file, no upgrade code.** Evan: "I'd really like to not
   have 'new' and 'legacy' versions of things... just the versions that will be the thing." He
   only cares about two protocols in `Documents/Professional/Workbench` (the recall assay and the
   PBMC stimulation assay), and only that their information carries into the new shape; new
   protocols are easy to make.
   - The app opens only the current file shape. Any other version gets "This protocol was saved by
     a different version of the workbench and can't be opened." The `version` field stays as that
     guard ("different", since a laptop on older code can meet a newer file).
   - Evan's files are converted once per format change by a throwaway script kept outside the repo
     (`%TEMP%/data-home`), never committed. The originals before each conversion go to the
     `Old versions` subfolder beside them, under their own names; from step 2a on, each in its own
     `Old versions/Version <N>` folder so no copy overwrites another.
   - Existing upgrade code is deleted in step 0.
7. **Decided 2026-11-24: the hidden Table, Sketch and Text note placeholders are removed in step 2.** Evan: "we can discuss their purpose and if they're needed later." When one is wanted it is
   designed fresh for the protocol's data homes (decision 3 covers how closing works).
8. **Decided 2026-11-24: sets no card shows are listed under "Not shown" on the card rail.** In
   the Plate map's "Start from" menu they get their own section after the page headings
   (picked over a tag on each item, from a mock). "Not on any page", "Closed", "Put away" and
   "Hidden" were offered; Evan: "not shown is definitely closer". Picking one shows it in a card
   on the current page. Built in 2b for plate maps, so a closed plate card's plates can always
   be brought back; delete for good stays in step 3.

## Follows from the decisions (stated, not asked)

- **Converting Evan's files:** two Materials cards' lists join into the one list (first card's
  first), and the same for Values and Calculations; a name used twice is flagged as today.
- **Every Calculations card shows the same list**, worked-out groups included (today only the
  first Calculations card shows them, `showsWorkedOut`).
- **Removing** a whole plate map or Flow panel sits on the card (the last tab's ×, the Flow card's
  trash), and beside it on the card rail when no card shows it. A card's close button only closes.

## Open, asked when its step comes

- **A jump with no window.** Answered in step 3: it opens a card for that data on this page.

## Build plan (drafted 2026-11-24, reviewed against AGENTS.md and the audit standards)

Eight steps (0 to 7; 7 added 2026-11-25), each built, checked and committed on its own, each leaving the app fully
working.

**Every step's check:**

- Typecheck, lint and client tests green.
- Evan's two protocols give the same 122 answers before and after, listed and sorted by name so
  changed ids never show as differences (`%TEMP%/data-home/answers.tmp.test.ts`, copied into
  `utils/protocolFile/` only to run and removed after; the baseline is
  `%TEMP%/data-home/baseline.txt`; the files are never copied into the repo). Nothing in the math changes in any
  step, so a different answer is a bug in the step.
- **A step that changes the file shape** changes the schema in place, bumps
  `PROTOCOL_FILE_VERSION`, and updates the one sample, `everyCard.json`. Evan's files are
  converted by that step's throwaway script: "before" answers come from the old app on the old
  files, "after" from the new app on the converted files.
- Evan checks it in the app before the commit.

### Step 0: one version only (built 2026-11-24)

- **Converted:** the two protocols (versions 4 and 7) were saved at today's version 8, originals
  first copied to `Workbench/Old versions`; the three math samples (cells, cytotox, elisa) were
  saved at version 8 as `cells.json`, `cytotox.json` and `elisa.json`, so their expected-answer
  check (`boardNames.test.ts`) stays. `everyCard.v8.json` became `everyCard.json`, and
  `labMemory.v1.json` became `labMemory.json`.
- **Deleted:** `legacyProtocolSchemas.ts` and the seven upgrade files beside it, with their
  exports; `protocolIds.ts` and `fixtures/sampleEdits.ts`, used only by them; the 26 `.default(…)`
  fill-ins in `protocolFileSchemas.ts`; the open-time fix-ups (`movedPrepValues`,
  `movedMarkerDilutions`, `termUpgrade`, `wellVolumeInAssaySetup`) with their tests;
  `followOldNames`; `formerName` on two generated names; lab memory's version-0 key upgrade
  (`upgradeLabMemory`, the store's `migrate`, `labMemory.saved.json`); the samples for versions 4
  to 7 and the mockup and legacy samples; the version-chain tests. `applyReferenceRenames` folded
  into `applyRenames`, its one caller.
- **Opening** parses `protocolFileSchema` directly; the plate tidy-up (`normalizePlateMap`) still
  runs on open, since it is not old-version code (the app runs it after every plate edit).
- **Kept on purpose:** `formerly` on the word list. It is not old-file code: typing reads it
  (`isSpellingOf`, `isAssaySetting`), so "PBMC Count 1e6" still files into Total cell conc. The
  lab memory `merge` (fills fields added to lab memory later) stays too.
- **Lab memory:** Zustand writes migrated memory back, so a browser that opened the app since
  2026-11-22 already holds today's keys. The laptop should open the app once before pulling this.
- **Checked:** typecheck and lint clean; 841 client tests (900 before, the version-chain tests
  gone); the two protocols' 122 answers identical before and after.

### Step 1: every number gets an id that never changes (built 2026-11-24, no file change)

- **Shown first by tests** (`workbenchStore.test.ts`, "renaming a donor"): renaming a donor left
  a formula using its cell math on the old name ("Donor 1 total needed \* 2" stayed), and threw
  away the name given to its amount on the plate. Both fail before this step and pass after.
- **Cell math:** `cellPartId` keys on the donor's or material's id (`cells:<id>:<part>`), through
  one `cellSubjectId` shared with `countId`.
- **Plate amounts:** keyed `a:<line>:<container>:<painted value id>`, plus `:<color value id>` for
  a color variant. Shared-schemas owns the format: `amountLinePrefix` builds the lead for
  `plateMapNames.ts`, `wellEdits.ts` and `mergeLineInto`; `moveValueKeys` renames a merged value's
  id wherever it sits in a key; `moveAmountNames` moves names by value id. Within a line, values
  whose text matches (case and spacing aside) are always merged, so the groups are today's; the
  only difference is "Donor 1" and "Donor-1" on one line, which today shared an amount and now
  get one each. Test: a merged value's amount names follow the value kept.
- **No file change after all:** neither protocol nor any sample had custom amount names.
- **Checked by name, by design, not changed here:** the diluent total's id
  (`diluentNeedId`) is built from the diluent's name because the chosen diluent is saved as a
  name (a series' `prep.diluent`, the protocol's `diluent`): that is a saved name reference, added
  to step 4. A cocktail's id is its staining word plus its markers' and extras' ids: a different
  mix is a different cocktail; retyping the staining word gives it a new id (known, left).
- **Checked:** typecheck and lint clean; 844 client tests; the 122 answers identical.

### Step 2: data moves out of the cards (file change)

The protocol gains one home per kind of data; a card keeps only its window settings.

- **One each:** `protocol.materials` (`items`, `customGroups`), `protocol.values` (`items`,
  `rows`, `assaySetupTitle`), `protocol.calculations` (`items`, `materialSections`).
- **Lists:** `protocol.plateMaps` (`PlateMap`: `id` and today's plate content) and
  `protocol.flowCytometryPanels` (`FlowCytometryPanel`: `id`, `cytometer`, `markers`, `stains`).
  Their cards, `PlateMapCard` and `FlowCytometryPanelCard`, keep only window settings and gain
  `shows: <id>`, the word the linked copy already uses.
- **Ids carry over:** a plate map and a Flow panel keep their old card's id, so every board id
  built from it (`<plateMapId>:<key>`) is unchanged and the pool comes out identical.
- **Delete:** `linkedPlateMap` (schema, `WorkbenchLinkedPlateMapPanel`,
  `WorkbenchLinkedPlateMapCardControls`), `removeCard`'s hand-over and `removalMessage`'s plate
  wording (`linkedPlateMaps.ts`), and every helper that only found the card holding the data.
- **Conversion** of Evan's files by the step's throwaway script, joining lists as stated above.
- **Readers** move from the card to the protocol and read the home directly
  (`protocol.materials.items`), with no accessor wrapper; the slice hooks (`useProtocolWith`,
  `useCardsOf` in `useWorkbenchSlice.ts`) change to match. About 19 files read materials, 10
  values, 5 calculations, 28 plates, 6 Flow panels.
- **Size:** mechanical but the biggest step. It lands as 2a (materials, values, calculations), 2b
  (plate maps), 2c (Flow panels) if one diff is too big to check well, each its own file version.
- Tests: `everyCard.json` in the new shape holds the same facts; a plate map shown by two cards is
  one plate map; closing either keeps it.

**2a built 2026-11-24 (file version 9):**

- `protocol.materials` (`ProtocolMaterials`: items, custom groups), `protocol.values`
  (`ProtocolValues`: items, rows, Assay setup title; `ValueItem` and `ValueRow` derive from it)
  and `protocol.calculations` (`ProtocolCalculations`: items, material sections). Materials cards
  keep folded groups and set-aside open; Values and Calculations cards keep nothing of their own.
- Table, Sketch and Text note removed from the schema, card types, icons, rail and math
  (decision 7). The elisa sample's table was unnamed, so it never fed the math.
- Every edit function lost its card id (`valueEdits`, `valueFill`, `calculationEdits`,
  `commitReviewRows`); the Values and Calculations panels lost their unused `card` prop.
- Every window shows the same thing: the "first card only" checks went (worked-out groups,
  "From your steps", "From your plate", Assay setup's needed rows, and Values' rows for
  materials with no row elsewhere).
- Board names are gathered in a fixed order (materials, values, calculations, plate maps)
  instead of card order; "go to where this is set" still jumps to the first card of that kind
  (`firstCardIdOf`, now shared by four callers).
- Duplicates folded while here: three private copies of the materials list (`allMaterials`,
  `boardMaterials`, the Flow panel's own `listedMaterials`), boardNames' own row-name lookup
  (now `valueRowName`), stepReadings' own find-or-create row (now `materialRowId`), and
  "unfold the group" (now `unfoldGroup`, used by `ensureMaterial` and `commitReviewRows`).
- Converted by `%TEMP%/data-home/convert-v9.mjs`: Evan's two protocols (v8 copies in
  `Old versions/Version 8`) and the four samples.
- Checked: typecheck clean; the two protocols' 122 answers identical; the every-card sample
  holds every fact; the math samples give their expected answers.

**2b built 2026-11-24 (file version 10):**

- `protocol.plateMaps` (`PlateMap`: id, title, plates, other labware and its tab name, lines,
  samples, series, counts, amount names, stain, stained-in). A plate card (`PlateMapCard`) is a
  window: frame, `shows`, side, open tab, replicates shown as one, and no title of its own; its
  header shows and renames the plate map's title. Cards share `cardFrame`; the others add a
  title (`cardBase`).
- The linked copy is gone: every plate card is what it was. `linkedPlateMap`,
  `WorkbenchLinkedPlateMapPanel`, `WorkbenchLinkedPlateMapCardControls`, `shownPlate`,
  `linkedPlateMapsOf` and `removeCard`'s hand-over went; `linkedPlateMaps.ts` became
  `cardRemoval.ts` (the removal message only; removing a card is one line in the shell).
- `ShownPlateMap` (`utils/plateMap/shownPlateMap.ts`) is a plate map with its card's side, tab
  and replicates; `WorkbenchPlateMapCardPanel` builds it and hands it to `WorkbenchPlateMapPanel`.
  Plate data edits go through `useUpdatePlateMap(plateMapId)`, window edits through the card.
- `utils/cards/createCard.ts` gained `cardsShowing`, `cardIdShowing` (plate numbers' "go to"
  targets) and `showPlateMap`; `createCard` covers only titled cards. `newPlateMap()` starts a
  new one. Changing a single plate's format resizes every card showing it; duplicating a tab
  is one edit that also opens it; duplicating as a new card copies only the plate data.
- The card rail's "Start from" lists plate maps by the pages their cards are on and, under
  "Not shown", those no card shows (decision 8). Each card's chip names the other cards showing
  the same plate map ("also on Page 2 +1").
- Titles: empty means "named for its labware"; the old automatic "Vessel map" and "Plate map"
  were converted to empty, so `AUTOMATIC_TITLES` is gone.
- Fixed while here: the Calculations panel asked for the wrong cards since 2a, so the
  "Materials" settings button on worked-out groups was missing; a linked copy's "duplicate as
  tab" moved the original card's tab, not its own.
- Converted by `%TEMP%/data-home/convert-v10.mjs` (v9 copies in `Old versions/Version 9`).
- **Rail polish after 2b (Evan 2026-11-24, from an interactive mock):** the Plate map menu drops
  "Start from" ("Empty plate map" is clear on its own) and is drawn like the rail (one
  `WorkbenchCardRailItem` for both; section names in the rail's heading style, no dividers),
  replacing the shared `MenuItem`'s monospace look that made it blend. Adding a card from the
  rail jumps to it: `useShowCard` waits for the grid to draw and settle the new card (it lags a
  frame or more behind the change, found from Evan's console output), scrolls to it, then
  flashes the card and the rail item together. One "just added" flash, `utils/dom/freshFlash.ts`
  at 1.5 s (Evan's pick), shared with new Materials rows (were 1.8 s). `ConsolePanel` passes
  through HTML attributes so the card's surface can be marked (`CARD_SURFACE_ATTRIBUTE`).
- Checked: the two protocols' 122 answers identical; the every-card sample holds every fact.

**2c built 2026-11-24 (file version 11):**

- `protocol.flowCytometryPanels` (`FlowCytometryPanel`: id, title, cytometer, markers, stains). A
  Flow panel card (`FlowCytometryPanelCard`) is a frame and `shows`, nothing else; its header
  shows and renames the panel's title. A new panel is `newFlowCytometryPanel()`.
- `WorkbenchFlowCytometryCardPanel` finds the panel a card shows and hands it to
  `WorkbenchFlowCytometryPanel`; every Flow edit goes through the panel's id
  (`useFlowCytometryActions(panelId)`). The plate's stain list and recoloring, the Materials
  detector labels and the Flow names read the panels directly, shown or not, so closing a Flow card
  leaves the plate's stain painting working.
- Flow names keep the panel's id in theirs (`cocktailWellsId`, `cocktailAntibodiesId`, the
  worked-out keys), so the pool is unchanged; their "go to" and settings targets are the first
  card showing the panel (`cardIdShowing`), none when no card shows it (step 3's open question).
- `cardsShowing` and `cardIdShowing` cover both kinds of window (`ShowingCard`);
  `showFlowCytometryPanel` beside `showPlateMap`. The removal message says the markers and stains
  stay. `useCardsOf` lost its last callers and went.
- The card rail: Flow panel gets the Plate map's menu once a panel exists ("Empty flow panel",
  panels by page, "Not shown"; each entry's hint is its cytometer and marker count). The menu is
  one component for both, `WorkbenchCardRailShowMenu`, with the heading style in
  `cardRailStyles.ts`.
- Fixed while here (from 2b): a stain's places ("Plate 1 · 4") jumped by plate map id, which only
  matched a card in converted files, so on a plate map made since 2b the click did nothing.
  `stainedPlaces` now names the plate map (`plateMapId`) and the click goes to a card showing it.
- Converted by `%TEMP%/data-home/convert-v11.mjs` (v10 copies in `Old versions/Version 10`).
- Checked: typecheck and lint clean; 843 client tests (one new: a cocktail's "go to" follows the
  card showing its panel, and its count stays when none does); the two protocols' 122 answers
  identical; the every-card sample holds every fact.

### Step 3: closing is closing, deleting is deleting (no file change)

- The card's close button closes without a warning.
- The card rail's "Not shown" sections (plate maps from 2b, Flow panels from 2c) get delete for
  good beside each.
- The card's menu gets delete for good (warning and undo).
- Removing a page deletes its steps and closes its cards (decision 5).
- Tests: close then re-add shows the same data; removing a page keeps its cards' data.

**Built 2026-11-24 (no file change):**

- **A jump with no window (the open question), Evan: go with the recommendation.** A jump names
  the thing, not a card: `CardTarget` (`{ type }` for Materials, Values, Calculations, Dilutions,
  Procedure; `{ type, shows }` for a plate map or Flow panel). `useShowTarget` goes to a card
  showing it, the one on this page first; if none, `openCard` opens one at the bottom of this page
  and flashes it. Procedure counts only on its own page (each page has its own steps). Covers the
  links in workings, "Set in Materials / Dilutions", a stain's places in the Flow panel, and
  double-clicking a flow diagram step. Board names carry `origin` and worked-out groups `settings`
  as targets, so the board no longer reads `protocol.cards` at all; `firstCardIdOf`,
  `cardIdShowing`, the `materialsCardId` / `dilutionsCardId` parameters and `useProtocolWith`'s
  card filter went (`useProtocolData`). `pageBottom` replaces three copies of the page-bottom math.
- **Close:** the card's × closes with no warning; `cardRemoval.ts` and its test deleted (Evan OK).
- **Permanent removal, Evan's wording:** "Remove" with a red confirm button and a warning that it
  is permanently removed (`utils/cards/permanentRemoval.ts`, one wording for every place). Not
  "delete for good".
  - Plate map: the × on the last tab (only one left) removes the whole plate map; with more tabs
    it still removes just that plate. Evan: decide beside the plate you're looking at.
  - Flow panel: a trash icon beside the card's × (`WorkbenchFlowCytometryCardControls`).
  - The card rail: a trash icon on hover beside each "Not shown" entry.
  - `removePlateMap` and `removeFlowCytometryPanel` close the cards showing it
    (`closeCardsShowing`); removing a panel takes its stains off the plates (`unpaintStains`,
    shared with removing one stain).
- **Clear (Evan's idea):** an eraser beside Duplicate empties every well on the tab shown, after a
  warning; on the Stain side it takes off the painted stains. Shares `clearWells` with clearing
  the selection.
- **Removing a page:** warns only when it has steps ("its N steps are permanently removed; its
  cards close, and what they show stays in the protocol").
- Checked: typecheck and lint clean; 848 client tests (new: `createCard.test.ts`, removing a plate
  map, removing a Flow panel); the two protocols' 122 answers identical.

### Step 4: formulas and steps point at the number (built 2026-11-25, file version 12)

Reviewed against the code 2026-11-25 with Evan; the points below the first list were added then,
and "Built" at the end records what changed while building.

- The chosen diluent (a series' `prep.diluent` and the protocol's `diluent`) points at its
  material instead of its name, so the diluent total keeps one id through a rename (found in
  step 1).
- Saved formulas, `{…}` in steps, and a series' top dose or fold when it names a number, store the
  number's id with the name it had as a fallback; the editors keep showing and taking names.
- Lookup: by id; if the id is gone or not found yet, by the fallback name (decision 4); a missing
  one says "… was removed".
- A calculation keeps its material as a reference, joined to its name when read, the way Values
  rows already do (`joinValueName`), instead of a "PBMC …" prefix inside its saved name.
- Worked-out wording can change in later work without converting any file, since nothing saved
  holds a generated name any more.

**What a saved reference looks like.** One form everywhere a name can point at a number
(formulas, steps, a series' top dose and fold, the diluent): `{name|id}`, the name as last seen and
the number's id. Plain text that names nothing is a name still waiting (decision 4), so a file can
hold both.

- After every change (where `applyRenames` runs today), one pass links any waiting name that now
  exists, keeps each reference's name current with its number's, and re-links a reference whose
  number was removed when a number with exactly that name appears. A removed number's reference is
  otherwise left alone, so undo brings it straight back, and "PBMC vol./well was removed" shows
  the last name seen.
- The editors show names and save references; a name left as it was keeps its id.

**Converting Evan's files stays a plain script.** It leaves formula and step names as text, so
they wait by name and the app links them when the file opens; only the calculations' materials and
the diluent are matched by name in the script. Linking on open must not count as an unsaved change
or an undo step.

**Dilution numbers: not a gap after all (corrected while building).** A run's key, and so every
prep number's id, is its first series' plate id and series id (`dilutionRuns.ts`);
`sameSourceKey` only decides which series pool into one run. Only the pooling of a fold that names
a number changed: it keys on the reference's id, since reading digits out of the saved text would
pick them out of the id.

**A calculation's material copies Values rows:** the material's id with its name as the fallback
(`valueRowName`), so a removed material's calculations fall to General under their full old name,
as today.

**Every reader of `{…}` moves to the one reader:** `stepTemplate.ts`, `stepEditorContent.ts`,
`stepReadings.ts`, `flowDiagramModel.ts` and `nameUsage.ts`. Lab memory saves no formulas, so it is
untouched.

**No `nameRenames.ts`.** The new code lives in `utils/formulas/nameReferences.ts` ("reference" is
the word steps already use). Painted well names already follow a material's rename through
`utils/materials/renameFollowing.ts` (which also keeps notes in parentheses), so the plate part of
`applyRenames` is a second copy, and the whole file is deleted. Checked while building: a plate
line's own name and a rename made somewhere other than the Materials card; anything only
`applyRenames` covers moves into `renameFollowing.ts`.

- Tests: rename, remove, undo of a remove, re-add by name, a name that doesn't exist yet, a step
  reference.

**Built:**

- **Shape:** `PROTOCOL_FILE_VERSION` 12; a calculation saves `name` without its material, plus
  `materialId` and `materialName`. Formulas, steps, a series' top dose and fold, and both diluents
  stay strings holding `{name|id}`. An id is escaped (`%`, `|`, `{`, `}`), and the last `|` splits
  name from id.
- **Files:** `nameReferences.ts` holds only the saved form (read, write, split text, show by name),
  so the formula parser can read it without an import cycle. Finding a number by reference is
  `findReferenced` beside `nameKey` (the board gains `ids`). The pass is `linkReferences` in
  `referenceLinks.ts`. `linkNames` and `linkedReference` in `formulaScopes.ts` link names in
  formula text; the editor's `namesInFull` uses them too, and names kept from the saved formula win
  the match (a removed "Old count" was half-taken by a section's short "Count").
- **Store:** `reconcile` runs the pass until nothing changes (at most 3), on every change and on
  opening a file. Opening already counts as saved, so linking on open adds no unsaved change and
  no undo step. `knownNames` stays: spotting newly named plate amounts still reads it.
- **Calculations:** `insertCalculation` and `updateCalculation` take a full name and split it
  (`savedName`, the same longest-material-prefix rule as before); the board joins it back
  (`calculationFullName`), and the panel and editor read the full name from `board.ids`. Sections
  file saved calculations by `materialId`.
- **Diluent:** `diluentChoice` resolves the saved diluent to its material by id, then by name; the
  diluent total's id is the material's id (`diluentNeedId`).
- **Display:** `describeName` takes a reference; a removed one reads "was removed", and a formula
  using it says "PBMC vol./well was removed" with "Add as a value" still offered.
- **The two checks:** a plate line named for a material (cytotox's "Compound X" line) was renamed
  only by `applyRenames`, and the Values card renames a material on every keystroke with nothing
  but `applyRenames` making the plate follow. Both moved: `renameFollowing.ts` renames lines too,
  and the Values card follows on finish with the name it had at the start, as the Materials card
  does. Linking a plate name to a material (`linkPlateName`) follows too.
- **Found by Evan in the app:** renaming "Risankizumab (anti-IL-23p19)" to "Risankizumab" left
  the wells on the old name, since `renameFollowing.ts` treated a change in the notes only as "the
  description changed", and the dilution prep then missed "Risankizumab (anti-IL-23p19)
  vol./well". `applyRenames` had covered it by matching the whole old name. Now a well or line
  holding the material's whole old name takes the whole new name; one holding the bare name with
  its own notes keeps them, as before.
- **Converted:** the four samples, and Evan's two protocols after copying them to
  `Old versions/Version 11`; 1 + 14 + 2 calculations in the samples and 3 in the recall assay
  split into material and name; nothing else in the files changed.
- **Checked:** typecheck and lint clean; 861 client tests (new: `nameReferences.test.ts`, seven
  store tests, a plate line following, whole-name wells following); the 122 answers identical, both read straight from the
  files and opened through the store with every name linked.

### Step 5: one address book (built 2026-11-25, no file change)

- One lookup from a number's id to where it is saved and how to write it: `ValueSource`,
  `valueSourceOf` and `writeValueSource` move out of `valueEdits.ts` into
  `utils/values/valueSources.ts` and cover every kind of saved number (Values item, Materials
  field, typed cell count, plate count and amount, recipe amount, a series' Round to).
- Values' write cases (`writeCellValue` / `writeCellUnit` in `valueFill.ts`) go through it; its
  cell links keep only what is about showing (`need`, `worked`, `wells`). Dilutions gains plate
  numbers. The old dispatch is deleted.
- Tests: one per kind of number, written and read back through the lookup.

**Built:**

- **`utils/values/valueSources.ts`:** `ValueSource` is a Values item, a Materials field, a donor's
  cell count, a plate count or amount, a recipe amount, or a series' Round to. `valueSourceOf`
  finds it from a number's board id; `writeValueSource` and `writeValueSourceUnit` write it. The
  ids it matches come from the same builders the board uses (`materialValueId`, `countId`,
  `recipeAmountId`, now shared by the board and the Values table, and `prepRoundToId`).
- **Values:** a cell's link is `{ kind: 'saved', source }` or one of the showing-only links
  (`need`, `worked`, `wells`); the table builds the source it already knows (`countSource` for
  counts), and `cellSource` reads it. `writeCellValue`, `writeCellUnit` and `writeCount` in
  `valueFill.ts` are deleted; typing, filling blanks and removing go through the source.
- **Dilutions:** a shared prep field whose number comes from the plate (a vol./well typed on the
  wells) is now edited in place instead of read only; Round to writes through the lookup.
  `setPrepSetting` moved to `plateMap/seriesEdits.ts`, its natural home, which also keeps the
  lookup clear of an import cycle with `dilutionEdits.ts`.
- **Checked:** typecheck and lint clean; 870 client tests (new: `valueSources.test.ts`, seven
  kinds written and read back, and a dilution editing a plate vol./well); the 122 answers
  identical apart from the names of Evan's Risankizumab rename.

### Step 6: the built-in math reads what kind of number a value is, not its name (file change)

Raised while weighing what of the workbench another lab could reuse. **Decided 2026-11-24**
(Evan: "step 6 is decided").

- **The gap.** Steps 1 and 4 keep _which_ number a formula means through a rename. Nothing in
  steps 0 to 5 covers _what kind_ of number it is. The built-in math (dilutions, cell math,
  recipes, the Flow panel, Values grouping) still finds its inputs by name through the word list:
  `findTerm` / `findTermOn` in `dilutionCalculations.ts`, `cellCalculations.ts`,
  `materialRecipeCalculations.ts`, `valueTable.ts` and `formulaScopes.ts`, and `isAssaySetting`
  over `ASSAY_SETUP_TERMS` (`termList.ts`). The terms read this way: Total well vol., Vol./well,
  Extra, Cells/well, Wells, Stock conc., Mass/well, Cells/vial.
- **What breaks today and after step 5.** Rename "Total well vol." to "Final vol. per well" (or
  another lab's "Working vol.") and a formula using it still works after step 4, but the dilution
  math waits with "Total well vol." missing, though the number is there.
- **Lookups key on whose number it is too.** They search `<owner> <term>` (e.g. "Raji Cells/well",
  "Medium Mass/well", `''` for Assay setup), so the tag would record both the kind and its
  material (or Assay setup) by id, the way Values rows already keep their material
  (`joinValueName`).
- **Proposal.** A value saves its kind (e.g. Well volume) by id. Typing a name the word list knows
  sets it, as recognizing works today. Any other name can take one from a "This is… ▸" menu. The
  built-in math reads the tag, not the name, so renaming or rewording changes only what is shown.
  The word list stays for recognizing what is typed.
- **The tag is kind + container + owner.** Vol./well and Vol./tube are one term on two
  containers (`perLabwareKind`), so the tag keeps which container, as the lookups do today.
- **Answered 2026-11-24 (Evan left these to Claude):**
  - _Retyping the name:_ one rule, no hidden state. A name the word list knows sets the tag to
    that kind, whoever set it before; a name it doesn't know leaves the tag alone. Renaming "Total
    well vol." to "Vol./well" means the number changed meaning; renaming it to "Final vol." keeps
    it a well volume.
  - _Two values with the same kind and owner:_ the math needs one number, so there is one per
    material per container (one per protocol for Assay setup). Picking the kind from the menu
    moves it there ("Well volume is on Total well vol. — move it here?"). Typing a second one
    flags both, as a name used twice is flagged today, and the math waits until one changes.
  - _How it shows:_ nothing new when the name already says it, so ordinary protocols look as
    today. A square tag shows only when the name doesn't say it (set from the menu). "This is… ▸"
    sits in the value's menu beside "Move to…" (`WorkbenchValueItem.tsx`). Look settled from a
    mock when built.
  - _`formerly` spellings:_ kept. They are spellings typing recognizes ("Count" still files into
    the cell count); tags replace reading names in the math, not recognizing what is typed.
- Then W114 step 5 resumes.

### Step 7: painted wells point at their material (file change)

Added 2026-11-25 after Evan renamed "Risankizumab (anti-IL-23p19)" to "Risankizumab" in step 4's
check (see step 4, "Found by Evan in the app"). Not yet designed in detail; built before or with
step 6.

- **The gap.** Step 4 made formulas and steps point at a number by id; a painted well still finds
  its material by matching its text (`findMaterial`, `materialSampleCounts`). Every well holds its
  own copy of the name, so a rename has to be copied onto the plate by text rules
  (`renameFollowing.ts`), and any case the rules miss leaves the plate on the old name. The patch
  in step 4 covers the case Evan hit, not the class.
- **It reaches the math.** The dilution prep takes the painted text as its subject
  (`run.subject`) and looks up `<subject> vol./well` by it, so the lookups depend on the well
  text matching the material's name exactly; cell math and well counts read painted names the
  same way.
- **Proposal.** A painted value keeps its material by id, the way Values rows do; its text is only
  what is shown and typed, notes included. Typing a name that matches a material links it, as
  recognizing works today; text that names no material ("Medium only", "Targets only") stays
  text. A rename then needs no copying, and the math finds the material through the link: this is
  the plate's half of step 6's "owner by id".
- **What it replaces.** The plate-following rules in `renameFollowing.ts` (material to plate, and
  plate to material) become reading through the link; what is left of that file is decided when
  the step is built.
- **Open, asked when this step comes:** how a well's own notes sit beside a linked name, and what
  a well shows when its material is removed (decision 4 suggests: its last name, waiting by name).

**Order:** 0 clears the old-version code so every later step changes one file shape. 1 is small
and independent. 2 is the foundation, 3 makes it visible, 4 and 5 build on it, and 6 builds on
1, 4 and 5. 7 builds on 4 and comes before or with 6, since 6's lookups by owner need the plate's
subject to be a material, not a text.

## Code standards for this work

From `AGENTS.md`, `docs/audit-prompt.txt` and `docs/audit-rubric.md`, applied at write time:

- **Schema first:** every saved shape changes in `@odysseus/shared-schemas`; client types derive
  from it (`z.infer`), never hand-rolled.
- **No zombie code:** what a step replaces is deleted in that step (listed per step), after
  grepping every import form, barrel re-exports included. No upgrade code: the app reads one file
  shape, and conversions are throwaway scripts outside the repo (decision 6).
- **No parallel systems:** one home per kind of data, one address book, one way to close a card.
- **No convenience wrappers or speculative exports:** readers use the home directly; nothing is
  exported without a caller in the same step; no homes for unbuilt cards.
- **Names:** app words first (`WORKBENCH_CODE_NAMES.md`, `WORKBENCH_WORDS.md`); a new file is named
  for what it holds and sits beside its siblings (`valueSources.ts` in `utils/values/`,
  `nameReferences.ts` in `utils/formulas/`); no generic names.
- **Zero comments:** strip headers and comments from every file a step edits; only `PITFALL:` lines.
- **Formatting:** Prettier on touched files only; commits by bash heredoc, when Evan says.
