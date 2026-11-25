# Workbench: Where the Data Lives

Design for moving the workbench's saved data out of cards and into the protocol, so a card only
shows and edits it. Started 2026-11-24 with Evan; nothing built.

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
(`findTerm`), and a painted well name finds its material by matching text
(`materialSampleCounts`). Both are the vocabulary feature, on purpose.

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

**Not built: Table, Sketch and Text note.** The card rail offers them and their saved shapes exist,
but no panel draws them (`CARD_PANELS` in `cardPanels.ts`), so nothing can be typed into one
today. Their saved shape stays as it is; each gets its home in the protocol when it is built
(decision 3). Building homes for them now would be speculative code.

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
     adding that kind of card ("Stim plates, not on any page"), beside starting a new one.
   - A plate shown in two windows is one plate: removing it in one removes it from both.
3. **Decided 2026-11-24: one rule everywhere, no exceptions.** Sketch drawings and text notes
   follow it too when they are built: closing the card closes the window, the drawing or note waits
   on the card rail ("Notes, not on any page"), and it can be deleted for good there.
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
     `Old versions` subfolder beside them, under their own names.
   - Existing upgrade code is deleted in step 0.

## Follows from the decisions (stated, not asked)

- **Converting Evan's files:** two Materials cards' lists join into the one list (first card's
  first), and the same for Values and Calculations; a name used twice is flagged as today.
- **Every Calculations card shows the same list**, worked-out groups included (today only the
  first Calculations card shows them, `showsWorkedOut`).
- **Delete for good** of a whole plate map or Flow panel sits in the card's menu, and beside it on
  the card rail when no card shows it. A card's close button only closes.

## Open, asked when its step comes

- **A jump with no window.** "Go to where this is set" and the settings buttons jump to a card
  (`originCardId`, `settingsCardId`, 20 uses). When no card shows that data, what does the jump do?
  Asked in step 3.
- **The unbuilt cards on the rail.** Table, Sketch and Text note are offered but open empty. Keep
  offering them until they are built, or take them off the rail? Asked before step 2.

## Build plan (drafted 2026-11-24, reviewed against AGENTS.md and the audit standards)

Six steps, each built, checked and committed on its own, each leaving the app fully working.

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

### Step 3: closing is closing, deleting is deleting (no file change)

- The card's close button closes without a warning.
- The card rail offers plate maps and Flow panels no card shows ("Stim plates, not on any page")
  beside starting new, with delete for good beside each.
- The card's menu gets delete for good (warning and undo).
- Removing a page deletes its steps and closes its cards (decision 5).
- Tests: close then re-add shows the same data; removing a page keeps its cards' data.

### Step 4: formulas and steps point at the number (file change)

- The chosen diluent (a series' `prep.diluent` and the protocol's `diluent`) points at its
  material instead of its name, so the diluent total keeps one id through a rename (found in
  step 1).
- Saved formulas, `{…}` in steps, and a series' top dose or fold when it names a number, store the
  number's id with the name it had as a fallback; the editors keep showing and taking names.
- Lookup: by id; if the id is gone or not found yet, by the fallback name (decision 4); a missing
  one says "… was removed".
- A calculation keeps its material as a reference, joined to its name when read, the way Values
  rows already do (`joinValueName`), instead of a "PBMC …" prefix inside its saved name.
- The code lives in `utils/formulas/nameReferences.ts` ("reference" is the word steps already use:
  `STEP_REFERENCE`, `applyReferenceRenames`). `nameRenames.ts` keeps only what stays: a painted
  well name following its material's rename. Its formula, step and series rewriting is deleted.
- Worked-out wording can change in later work without converting any file, since nothing saved
  holds a generated name any more.
- Tests: rename, remove, re-add by name, a name that doesn't exist yet, a step reference.

### Step 5: one address book (no file change)

- One lookup from a number's id to where it is saved and how to write it: `ValueSource`,
  `valueSourceOf` and `writeValueSource` move out of `valueEdits.ts` into
  `utils/values/valueSources.ts` and cover every kind of saved number (Values item, Materials
  field, typed cell count, plate count and amount, recipe amount, a series' Round to).
- Values' write cases (`writeCellValue` / `writeCellUnit` in `valueFill.ts`) go through it; its
  cell links keep only what is about showing (`need`, `worked`, `wells`). Dilutions gains plate
  numbers. The old dispatch is deleted.
- Tests: one per kind of number, written and read back through the lookup.
- Then W114 step 5 resumes.

**Order:** 0 clears the old-version code so every later step changes one file shape. 1 is small
and independent. 2 is the foundation, 3 makes it visible, 4 and 5 build on it.

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
