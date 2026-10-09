# Workbench: Implementation Plan

Living plan for the scientist-facing side of Odysseus. Everything built so far is the lab's
**system of record** (what we have, where it is). The workbench is where a scientist **plans work**:
flow cytometry panels first, general protocols and calculators after. This doc is the shared source
of truth; we iterate on it until it is right, then build.

**Status:** draft 12 (2026-10-07). Design phase, working panel by panel in the builder mockup. Nothing
is built. Branch `feature/workbench` (has `main` merged in; pushed).

### Resume here (read this first)

**What the workbench is now.** A protocol builder: a snapping board of blocks (materials, steps,
values, formulas, vessel map, tables, flow diagram, sketch, text). Values and formulas share names
like spreadsheet cells, show their working, and check units; steps quote them live. There are no
modes: a protocol is a living skeleton, an experiment is a living copy of it, and Export makes the
bench copy and the final record (W98). Full description: _The builder_ below.
Decisions W66 to W98 are the current truth and override anything older; §5 to §7, §12 and W43 to W65
are the parked flow-panel work.

**The mockup.** `docs/mockups/workbench-builder-study.html` (tracked so it travels between machines).
Open it in a browser; it reads the app's real CSS from `client/src/shared/styles/`, so keep it at this
folder depth. It saves to the browser's local storage; "Load an example…" (top right) resets to the
IL-6 ELISA or the cell viability assay. Build and Run (top) switch modes. It is styled from main's real
primitives (soft `ConsolePanel` cards, `PanelHeader`, `Subsection`, `Table`, `Button`, `Input`,
`Chip`) and follows the readability recipe (`docs/reports/UI_READABILITY_PASS.md`).

**Panel review status.** Going block by block, deciding what each needs:

| Block        | Status                                                                                                                                                                                              |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Materials    | Done for function (W83, W84, W90 to W96): type-anything adding, cell editing, field checklist, helpers, Drop and Remove, lab memory. Visual pass deferred: blocks are still hard to tell apart.     |
| Steps        | Reviewed twice. Sentences with times written in, plain live values, drag or click to insert, drag to reorder, common-step presets, smart paste, "During step N:" (W85 to W89). Liked; refine later. |
| Values       | In review (W97): one-line adding, cell editing, quiet usage, Undo in place.                                                                                                                         |
| Formulas     | Calmed (name, answer, one line of working). Not yet reviewed on its own.                                                                                                                            |
| Vessel map   | Not reviewed since the plate-to-vessel change (W75). Plate colors are still the old kind colors.                                                                                                    |
| Table        | Calmed (plain text rows, columns editor). Not reviewed.                                                                                                                                             |
| Flow diagram | Not reviewed. Draws from the steps; meanwhile branch kept here only.                                                                                                                                |
| Sketch, Text | Not reviewed.                                                                                                                                                                                       |
| Export       | Mocked (W98): one layout for bench and record, from the Export button. Plate map not in it yet.                                                                                                     |

**Not mocked yet:** the library (protocols and experiments, with Copy and an on-request comparison).

**Open questions:** Q33 to Q35 (flow diagram source, parent/child protocols, layout during a run) and
Q25 to Q32 from the flow work (§14).

**Editing the mockup (for Claude).** It is one large HTML file. Back it up before every change.
Replace code by unique anchors only: one non-unique anchor once deleted a large section. After a
change, load it headless in Edge and check for errors, and screenshot what changed instead of
guessing. The formula engine sits in the `<script id="engine">` block and can be tested in Node.

**How Evan wants to work.** Ask plain numbered questions in chat before reworking how something is
used; don't guess at his workflow. Keep it simple, readable at the bench and in print, and calm (no
decoration). Reuse the app's existing pieces; build new only where nothing exists (W74). American
spelling. Commit when he says so.

### Progress ledger (details in §13)

- [ ] Design: builder study (board, blocks, formulas), approved
- [ ] Design: library and run studies, approved
- [ ] Phase 0: unit conversions
- [ ] Phase 1: workbench foundation (protocols, versions, shell)
- [ ] Phase 2: protocol editor
- [ ] Phase 3: calculator + runs
- [ ] Phase 3b: run checklist, hints, help
- [ ] Phase 4a: shared grid extraction
- [ ] Phase 4b: samples + layout
- [ ] Phase 5: export
- [ ] Phase 6: lab sharing
- [ ] Phase 7: inventory link
- [ ] Phase 8: individuals (role + safety fixes)
- [ ] Phase 9: individuals (invites + sys admin tab)

> **Authoring standard.** Every file is authored to the **Donor exemplars** in AGENTS.md. Gate before
> writing code, one phase at a time, tick the ledger and commit per phase when told. **Every screen is
> mocked up and approved before it is built.**

---

## The builder

The workbench centers on a **protocol builder**: a board the scientist assembles from blocks, the
way a plate-based assay is laid out in Excel today. Flow staining is one protocol among many (ELISA,
PCR setup, DNA/RNA kit extractions, cell culture), not the base. The emphasis is customizability: type
freely, or grab a value setter, a plate map or a formula and put it where it helps.

**Board (W67).** A 12-column grid. Blocks are dragged by their title bar, resized from the corner, and
snap to the columns. Print and export read the board row by row, top to bottom.

**Blocks (W68).** The starting set. The library grows as needs show up.

| Block        | What it does                                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Table        | One block with the scientist's own columns (W80). Presets are only starting columns: Reagents, Cells, Samples, Equipment, blank |
| Text         | Free notes                                                                                                                      |
| Values       | Named number setters with units: Samples = 24, Vol per well = 100 µL                                                            |
| Formula      | A named calculation over values and other formulas, typed or picked from the formula library                                    |
| Vessel map   | Plates (6 to 384 wells), flasks, dishes or tubes, any number of each (W75); counts are named values formulas can use            |
| Table        | A free grid: standard curve, reagent list, anything tabular                                                                     |
| Steps        | The outline (I. 1. a.), ticked off on a run. Step text can quote a value, which stays live                                      |
| Flow diagram | The steps drawn as boxes and arrows, with durations and side tracks (W73, Q33)                                                  |
| Sketch       | A freehand whiteboard inside a tile (W71)                                                                                       |
| Later        | Reagent mix; flow panel (carries the parked flow decisions)                                                                     |

**Values and formulas (W69).** Values and formulas share one set of names, like named cells in a
spreadsheet: `Wells = Samples × Replicates + Std points × 2 + Blanks`. The bar is that nobody re-checks
the math at the bench. So every formula:

- shows its working with the real numbers plugged in, not just the answer;
- carries units through and flags a mismatch (adding µL to cells, a "mL" result that is really a count);
- reruns everything downstream the moment a value changes;
- says why, in place, when it cannot be worked out (unknown name, circular reference), instead of
  showing a number.

**Click, don't type (W76).** While a formula or a step is being written, every name on the board is
one click away: a tray under the field lists values, formulas and vessel counts (plus operators for
formulas), and clicking a name anywhere on the board inserts it too. In a step it goes in as a live
value: "Add {Vol per well} per well" reads "Add 100 µL per well".

**Readable chips (W78).** A name dropped into a step shows as a colored chip while writing (the same
chip as in the tray). When the step is read, the line reads as plain English, with the name written
small above each filled-in value: "Add **100 µL** per well" with _Vol per well_ over the 100 µL. A
reagent reads as its name, with vendor and catalog above it, or its lot on a run.

**Reagents are where definitions start (W79).** The reagents list is the protocol's materials
section and the source of many values: a reagent's stock and working dilution become names formulas
can use (_Capture Ab dilution_, _Capture Ab stock_). A reagent itself is not a number; a formula that
uses one says so. On a run, each reagent takes its lot or batch and expiry (packaged) or made-on date
(prepared). The run counts lots still to record and flags anything expired; changing a stock for a
new lot is marked against the protocol like any other value. This is what makes a finished run a
replicable record. In the real build, a lab member can pick the reagent from inventory (the existing
Reagents suite already holds vendor, catalog and lots: Phase 7's inventory link), and typing it by
hand always works.

**Any assay without special windows (W80, W81).** Reagents turned out to be one case of a general
table, and cells, samples and equipment are the same shape. So there is one Table block. Columns are
added, renamed, reordered and hidden freely; each is text, number (with a unit, or a unit per row),
date, or a fixed list of choices. Any number column becomes a name (_HeLa count_, _Capture Ab
dilution_), so a cell-based assay's seeding math runs on the count once it is typed in. Until then,
dependent formulas say the number is missing instead of showing one. A table can opt out of naming its rows (a standard curve is just a table).

**Materials, not tables (W83).** The experiment's inputs live in one Materials block with grouped
sections (the nine groups in `docs/reports/WORKBENCH_MATERIALS.md`, plus the scientist's own). Adding
a material is just typing its name; group and type are guessed (W90); it starts with only a few fields (vendor, catalog, lot for
physical things) and every other field its type suggests is one click away, plus fields of the
scientist's own. Nothing is forced. Lot-bound values are remembered by lot number. Layout (W84,
for now): one table per group that reads as plain text, styled to the readability recipe; clicking a cell edits just that cell and Tab moves to the next; "+ Field" at the end of a group's header row opens a checklist of its suggested fields with a search box, staying open so several columns can be added at once (a typed name not listed becomes a new field); Remove shows on row hover. The goal is a protocol that is scannable at the
bench and on paper, not decoration. Plain tables (a standard curve)
stay a separate block; the earlier table presets for reagents, cells, samples and equipment are gone.

**Hide what is not needed (W82).** Every block collapses to its title bar, in build and on a run.

**Step outline (W77).** Sections are visibly groups: a numbered heading with a rule and a step count
(progress on a run), their steps indented under a guide line. Sub-steps (a. b. c.) sit one level in,
smaller. Durations are a tag at the right. A step opens for editing on click; the rest stay read as
the finished outline. The flow diagram folds sub-steps into their parent box.

**Formula library (W70).** Built-ins to pick from (dilution C1V1 = C2V2, mix with overage, cells to
volume, serial dilution prep), plus the scientist's own. It grows over time.

**Protocols and runs (W72).** A protocol is named freely by its owner (_Cytotoxicity v1, 72 h flow_;
_Cytotoxicity v2, 96 h ELISA only_) and keeps its own save history. A run is one dated use of it:
the same board with that day's values, lots and ticks. Changing a value mid-run (an audible) is
expected; the math reruns and the run marks what differs from the protocol. Finishing locks the run
into a plain document (W47).

**Built from what exists (W74).** The builder study in `refs/` is throwaway HTML; the real build
reuses the app's pieces and adds only what is genuinely missing.

| Need                           | Existing piece                                                                                                            | Work                                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Units in values and formulas   | `UNIT_REGISTRY` in `shared-schemas/units` (ids, labels, 11 kinds), custom lab units, `useUnitOptions`                     | Add a conversion factor per unit and one `convert()` (already Phase 0). The formula engine reads these; no second unit table |
| Typing numbers (5e6, 5M)       | `parseConcentrationInput` in `concentrationFields.ts`; `formatScientific`                                                 | Export the parser under a general name; values and formulas use it                                                           |
| Fields, menus, tables, dialogs | `Input`, `Select`, `Checkbox`, `Table`, `Tabs`, `Tooltip`, `DropdownMenu`, `ConfirmDialog`, `ConsolePanel`, `PanelHeader` | None. Block chrome and contents are composed from these                                                                      |
| Plate map selection            | Tube grid hooks (`useGridSelection`, `useGridDragSelection`, keyboard, clipboard); `gridCoordinates.ts` is already shared | The Phase 4a extraction with its safeguards (§12.4); the plate block waits for it                                            |
| Plate colors                   | `labColorSpace.ts` palette generator                                                                                      | None                                                                                                                         |
| Print and export               | Barcode print pattern (`BarcodePrint`, `barcodePrintStyles`)                                                              | Generalize into the shared print wrapper (already Phase 5)                                                                   |
| Board layout                   | Nothing                                                                                                                   | New library: `react-grid-layout` (the React counterpart of the study's gridstack)                                            |
| Formula engine                 | Nothing                                                                                                                   | Small workbench-local parser over the registry's units. Not mathjs: it brings its own unit system, a second source of truth  |
| Flow diagram, sketch           | Nothing                                                                                                                   | Plain SVG from the steps, and a canvas. No library                                                                           |

---

## Table of Contents

0. [The builder](#the-builder)
1. [The higher view](#1-the-higher-view)
2. [v1 feature set](#2-v1-feature-set)
3. [Locked decisions](#3-locked-decisions)
4. [Concepts](#4-concepts)
5. [The workflow](#5-the-workflow)
6. [Samples and layout](#6-samples-and-layout)
7. [The calculator](#7-the-calculator)
8. [Ownership and sharing](#8-ownership-and-sharing)
9. [Individuals](#9-individuals)
10. [Data model](#10-data-model)
11. [What already exists](#11-what-already-exists)
12. [Screens](#12-screens)
13. [Build phasing](#13-build-phasing)
14. [Open questions](#14-open-questions)
15. [Later passes](#15-later-passes)

---

## 1. The higher view

Two ideas carry the whole design.

**The protocol is the base document: an ordered workflow of steps.** Some steps add reagents (Fc
block, surface stain), some do not (wash, spin, incubate). A flow panel is what a protocol looks like
when its reagent steps hold antibodies. If the panel builder were built as its own thing, protocol
reuse, amendment and export would have to be bolted on later. Built this way, a staining protocol and
a 96 h cytotoxicity assay are the same kind of document.

**The recipe is separate from the day you use it.** A _protocol_ holds what never changes run to run:
reagents, amount per test, steps. A _run_ holds today's numbers: sample count, cell number, lots,
notes. Every volume is calculated from those inputs, so "edit an old document and change all the
numbers around" becomes "change two inputs."

---

## 2. v1 feature set

- **Protocols.** Create, edit, duplicate, archive. Each save is a new version with an optional note.
- **Workflow.** An ordered list of steps built from presets (§5): reagent steps, washes, spins,
  incubations, resuspension, notes.
- **Panel view.** Every reagent row across the workflow in one table, plus controls.
- **Variants.** A skeleton protocol with specific variants under it.
- **Runs.** "Use this protocol" makes a dated working copy. Lay out today's samples, get master mix
  volumes. Record lot numbers and notes. Completing a run freezes it.
- **Samples and layout.** A plate or tube map where each well is described by scientist-defined
  fields (§6), built for bulk editing. The counts the calculator needs come from it.
- **Save back.** A tweak made in a run can be saved back to the protocol, or saved as a new protocol.
- **Export.** A tidy print view of a protocol or a run, saved to PDF from the browser.
- **Lab sharing.** A protocol is private or shared with the owner's lab.
- **Inventory link (lab members only).** A reagent row can point at a reagent item to show stock and
  expiry. Typing a reagent by hand always works.
- **Individuals.** Invite-only solo accounts that see the workbench and nothing else.

---

## 3. Locked decisions

| #   | Decision                        | Choice                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| W1  | Where it lives                  | Inside Odysseus as a new top-level suite. Not a separate app.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| W2  | Base document                   | The **protocol**: an ordered workflow of steps. The flow panel is a view of its reagent steps.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| W3  | Reuse model                     | **Protocol + run.** A completed run is a frozen snapshot.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| W4  | Ownership                       | Workbench documents belong to the **person**. Inventory stays with the lab.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| W5  | Visibility                      | Private, or shared with the owner's lab.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| W6  | Leaving a lab                   | The lab **keeps a copy** of every protocol the person had shared.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| W7  | Antibody amount                 | Per row, any of: µL per test, dilution (1:N), target concentration.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| W8  | Individuals                     | A user with **no lab** and a new **`individual` role**. Workbench only, no inventory.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| W9  | Individual signup               | Invite code only, and only the system admin mints them.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| W10 | Multi-lab membership            | Not needed. One person, at most one lab.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| W11 | Instruments, spectral conflicts | Later passes (§15).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| W12 | Email                           | Resend, later, for self-serve password reset and emailed invites. Not part of this plan.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| W13 | Edit rights                     | A shared protocol is edited by its owner and the lab's admins. Any member can duplicate it into their own. **Nobody is locked into the lab's version.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| W14 | Runs                            | Shareable with the lab, same rule as protocols.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| W15 | Build order                     | Workbench first, individuals second.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| W16 | Removed from a lab              | The system admin chooses: delete the user, or convert them to an individual.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| W17 | Joining a lab                   | The system admin's "move into lab" only, in v1.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| W18 | Final resuspension volume       | The volume samples are resuspended in before acquisition. Lives on the final _Resuspend_ step.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| W19 | Demo site                       | The demo lab ships a sample panel, after Phase 3.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| W20 | Variants                        | The parent is a **skeleton**: the basic recommended workflow. A variant is a full, independent copy made from it for a specific experiment. Nothing is inherited. Two levels only for now: no variants of variants.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| W21 | Scaling with cells              | No automatic scaling. The row stores the amount actually used; a run can override any row.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| W22 | Workflow steps                  | The user builds the step list from presets and uses only the steps the experiment needs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| W23 | Lab shutdown                    | Never permanent. Members of a switched-off lab can still sign in, to the workbench only. Switching the lab back on restores everything.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| W24 | Timing                          | Steps carry durations. No live timers or clock times on a run.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| W25 | Label amount                    | Entered once as it reads on the vial. "Amount used" starts as a copy of it and is changed only when the user titrates down.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| W26 | Plate / tube map                | Part of v1, and a valid place to **start** a run: lay out the samples first and the counts follow.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| W27 | Well identity                   | Wells hold one value per **field**. Fields are whatever the scientist defines; none are fixed except Stain. Any one field can be changed across many wells without touching the others.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| W28 | Plate sizes                     | Tubes, and 6 to 384-well plates. Optional per protocol; 96 is the default.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| W29 | Replicates                      | Separate wells with the same values.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| W30 | Step list                       | The §5 list stands for now and is refined in use.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| W31 | Plates per run                  | One or more. Fields and values are shared across a run's plates.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| W32 | Serial dilutions                | In v1. A field can hold numbers with a unit and be filled as a dilution series.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| W33 | Reusing fields                  | Carried by the protocol's default layout for now.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| W34 | Mockups                         | Every screen is mocked up and approved before it is built.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| W35 | Run sheet                       | One document, laid out like a supplier's protocol sheet but interactive: reagents, plate map and mix volumes together, steps below with the day's numbers filled in. Used on a laptop at the bench **or** printed and annotated by hand.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| W36 | Checklist                       | A run's steps are ticked off as they are done, so the current step is always visible. Steps can carry hints and links.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| W40 | Tube grid                       | Its selection logic is shared with the plate map, not copied, under the safeguards in §12.4.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| W41 | Branch                          | All work happens on `feature/workbench`, verified in dev before anything reaches production.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| W42 | Dilution prep                   | A run works out how to make each dilution series: transfer volume, diluent volume, stock needed for the top point. Same calculator module.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| W43 | Setup and Run                   | A run has two views. **Setup** is planning: run inputs, reagents with vendor, catalog number and lot, buffers to prepare, plate map. **Run** is the bench sheet: steps with their mixes, plate map and panel pinned alongside.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| W44 | Numbering                       | Protocol outline is **I. 1. a. i.**, each mark followed by a period: sections in Roman numerals, steps in numbers, sub-steps in letters, details in small Roman numerals. No "Stage" label.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| W45 | Isotype                         | A reagent row carries isotype, and the panel view shows it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| W46 | Filling the plate map           | **Wells first.** Highlight wells, then fill in one form beside the plate: sample or control, and one value per field. Apply fills every highlighted well. Work from the largest shared block down to the smaller ones. No row or column modes. Double-click a well to edit just that one.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| W47 | Saved and exported copies       | Plain documents: white page, standard type, simple tables, no console styling. Readable by people who have never seen the app, by outside institutions, and inside an electronic lab notebook.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| W48 | Reading the plate map           | **Every value is written on its well**, one per line, as the scientist typed it: D1 / STD / 1:1. Large squares, like the Excel sheet this replaces. No switching views and no edge bands. Color is optional: the scientist picks one field to group by, or none.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| W49 | Starting a plate                | Blank. The scientist adds and names their own fields; none are assumed. A plate can be given a name.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| W50 | Spelling                        | American throughout: color, catalog, labeled.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| W51 | No guessing                     | The tool never infers what the scientist meant. A typed list is applied exactly as typed, in order; wells beyond the end of the list are left alone. The aim is consistency, organization and less repeated work, with the scientist in control.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| W52 | Controls on the plate           | A well is a sample or one of the assay's controls, chosen from the list the protocol defines (Unstained, FMO PE, and so on). The list itself marks any control not yet placed. No separate controls summary on the plate. Hand-typed labels remain possible through ordinary fields.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| W53 | Plate on the Run tab            | The same plate, values written on the wells, in a wider side column beside the steps. Present without dominating the page.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| W54 | Setup order                     | The Setup page follows the order the work is done: 1. plate map, 2. panel and reagents, 3. calculations. The protocol is read on the Run tab, not repeated on Setup.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| W55 | Panel colors                    | Antibodies are arranged by laser and each fluorochrome carries its own color, on Setup and on the Run tab, to help with compensation setup at the instrument. The laser is set per fluorochrome and can be changed, since it varies by machine. Full instrument configurations remain a later pass.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| W56 | Calculations                    | Per counted sample the scientist enters concentration (cells/mL), viability and volume on hand, for whatever samples they name (no assumed source such as thaw). The run works out viable cells, cells needed, the volume to pipette straight into each well (the usual route), and the alternative of one suspension made up to a plating volume. It flags a sample that is short. Wells per sample are typed, or read from a value on the plate map. Built to extend to cases like CAR+ cells per well.                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| W57 | Screen                          | Designed for a laptop first.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| W58 | Form versus information         | The fill form is a form: fixed in place, labeled inputs, one Apply button. What has been entered lives on the plate and in the controls list under it, which never moves.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| W59 | Emptying wells                  | The action is named "Set as empty" and asks for confirmation when the wells hold values.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| W60 | Choosing the panel              | A scientist keeps **saved panels**. At Setup a run picks one, then is edited for that run. **Edit** turns that row's own cells into boxes, in place, so each value is changed in its own column: marker, fluorochrome, clone, isotype, step, vendor, catalog number, lot, amount. **Swap** is a list of what the lab has in stock in that fluorochrome; picking one replaces the antibody at once, lot number included, and Edit is there if a detail needs changing. Edit sits at the far right of the row and Swap to its left, each in a fixed spot whether or not the other is present. Each laser group has its own Add, which opens a blank row the same way. Remove is inside the edit. Untick an antibody to leave it out of a run without removing it. An antibody is always filed under the laser of its fluorochrome. The run shows whether the panel is unchanged or edited, can be reset to the saved panel, and an edited panel can be saved as a new one. |
| W61 | Fluorochrome list               | The app ships a list of common fluorochromes, each with its usual laser and emission peak. The display color comes from the emission peak; dyes emitting past about 700 nm get distinguishable dark reds. An unlisted fluorochrome asks for laser and color once and is remembered. The laser is a default the scientist can override. The list is compiled from published spectra data, not from memory, and reviewed before it is trusted. The laser list is not fixed at four: UV (355 nm), violet (405), blue (488), green (532), yellow-green (561), red (640) and near-infrared (about 808) all exist on some cytometers. A scientist sees the lasers their machine has and can add one.                                                                                                                                                                                                                                                                           |
| W62 | Setup headings                  | Section titles on Setup are numbered, in capitals, with a strong rule, so PLATE MAP, PANEL AND REAGENTS and CALCULATIONS read as clearly separate parts.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| W63 | Cell numbers                    | Cell counts and cells per well use the entry the tube concentration field already has: type 5e6, 5M or 5000000 and it normalizes to 5.00E+6. Reuses the shared parser and `formatScientific`; no second implementation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| W64 | Living documents                | Nothing done while setting up is one-way. A swapped antibody can be swapped back to the one it replaced, an unticked one re-ticked, an edit re-edited, the whole panel reset. Protocols and runs in progress should feel flexible to change.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| W65 | Calculations layout             | The cell table is read in labeled groups: **what you have** (count, viability, volume, viable cells), **what you need** (wells, total cells needed, enough or short), **A. straight into each well** (cells volume and the top-up to about the plating volume), **B. or as one suspension** (take, make up to, then add diluent or spin down). The count typed is total cells; viability is applied to it. Plating volume, cells per well and overage (dead volume for pipetting error) are the scientist's own values per run, with their own defaults, never fixed by the app.                                                                                                                                                                                                                                                                                                                                                                                         |
| W38 | Reordering steps                | Move-up / move-down buttons. No drag-and-drop library.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| W39 | First mockup                    | The run sheet.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| W66 | Direction                       | The workbench is a **protocol builder**. Flow staining becomes one block type (flow panel), not the base. Supersedes the run-sheet-first order (W39) and the flow-first framing; the flow decisions are parked, not discarded.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| W67 | Board                           | A snapping 12-column grid. Blocks are dragged by the title bar and resized from the corner. Reverses W38: a grid layout library is allowed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| W68 | Blocks                          | Starting set: text, values, formula, plate map, table, steps, flow diagram, sketch. Reagent mix and flow panel later. The set grows over time.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| W69 | Formulas                        | Named values and formulas, spreadsheet style. Working shown with numbers plugged in, units carried and checked, downstream reruns on change, errors explained in place. Built only if it truly removes double-checking at the bench.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| W70 | Formula library                 | Built-in formulas to pick from, plus the scientist's own. Grows over time.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| W71 | Whiteboard                      | A sketch block inside the grid, not a free-canvas page.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| W72 | Protocols and runs              | Protocols are named freely and keep their own save history. A run is one dated use of the board with that day's values; mid-run changes are expected, rerun the math and are marked against the protocol. Finishing locks the run into a plain document.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| W73 | Steps as a diagram              | Steps can be shown as a flow diagram, not only as a list.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| W74 | Reuse in the builder            | Units, number entry, primitives, grid selection, colors and printing come from the existing code (table under _The builder_). New code only where nothing exists: board layout library, formula parser, flow diagram, sketch.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| W75 | Vessels                         | The plate block is a vessel map: 6 to 384-well plates, T25/T75/T175 flasks, dishes, tubes, and a count of each (six T25 flasks, three 96-well plates). Extends W28. Counts per group feed formulas.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| W76 | Inserting names                 | Names are inserted by clicking, from a tray under the field being written or from the board itself. Typing still works.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| W77 | Step hierarchy                  | Sections are visible groups (heading, rule, count, indented steps); sub-steps are a real level, one in and smaller; one step is edited at a time.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| W78 | Chips in steps                  | Written as colored chips; read as plain English with the name small above each value. Reagents show vendor and catalog above, or the lot on a run.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| W79 | Reagents block                  | The protocol's materials list. Stock and working dilution feed formulas. Lot or batch and expiry or made-on date are recorded per run; missing lots are counted, expired ones flagged. Pickable from inventory for lab members, typed by hand otherwise.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| W80 | One table block                 | Reagents, cells, samples, equipment and plain tables are one block with user-defined columns (text, number, date, choice). Presets supply starting columns only. Supersedes the separate reagents and table blocks.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| W81 | Run-recorded columns            | Superseded by W98: there is no run mode; a blank cell is simply filled in when known.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| W82 | Collapsing blocks               | Any block collapses to its title bar, in build and on a run. Table columns can be hidden.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| W83 | Materials block                 | One block for every input, grouped per the materials catalog. Starts minimal; suggested fields per type are one click away; custom fields and groups allowed; lot-bound values remembered by lot. Supersedes the table presets of W80 for inputs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| W84 | Readable at the bench           | Every workbench screen follows the calmer readability recipe (`docs/reports/UI_READABILITY_PASS.md`): plain text until clicked, no boxes in boxes, clear group headings, scannable in the lab and in print. Materials are per-group tables edited cell by cell (Evan, 2026-10-08).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| W85 | Steps read as sentences         | A step is one plain sentence with its verbs, times and temperatures written in ("Incubate 30 min at 37 °C, protected from light"). No separate duration tag; a loose "1 h, RT" beside the text is ambiguous. Live values read as plain colored text with no label; their source shows on hover. Supersedes the duration field (W24 wording) and W78's labels.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| W86 | Inserting names                 | Names are clicked or dragged into a step or formula, from the tray or straight off the board (values, formulas, materials, vessel counts). Extends W76.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| W87 | Reordering and presets          | Steps reorder by dragging a handle, and the up/down buttons stay. A step carries its sub-steps; a section carries its group. Common steps (wash, spin, incubate, add, mix, resuspend, transfer, seed, count, read) insert a full sentence with highlighted blanks; Tab moves between blanks.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| W88 | Paste a protocol                | Pasted text becomes an outline only after a preview the scientist checks: sections (headings, roman numerals, "Day 2"), numbered steps, a./b./bullets as sub-steps, notes kept with their step, PDF line breaks joined. Nothing is added until confirmed. A model-assisted parse is a possible later upgrade.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| W89 | Editing looks like reading      | A step being edited keeps the reading size and font, with only a faint underline; inserted names show as their values, as in the finished line. The insert panel starts as a single "+ Insert" link and opens to a plain list (common steps, then names with their current values). One color for every live value: normal text with a thin blue dotted underline. Kind colors and the legend are gone; red means an error, amber means still to record. A meanwhile step reads "During step 4:" instead of a dashed side line. Supersedes the color coding in W69 and W78.                                                                                                                                                                                                                                                                                                                                                                                              |
| W90 | Type anything                   | A material is added by typing its name; the group, type and any readable fields (marker and color, wells, concentration, sequence) are guessed. Guesses come from the lab's own inventory, protocols and corrections first, then reference lists bundled from open databases, then shape rules. The guessed type is a dropdown under the box, so it can be set before adding, and the row's Type cell changes it after; corrections are remembered. Unrecognized goes to Unsorted. Pasted lists preview first (as W88). Details in the materials catalog.                                                                                                                                                                                                                                                                                                                                                                                                                |
| W91 | Ratios                          | Values can be a ratio (N:N) as well as a dilution (1:N): entered as two numbers (10 : 1), shown as typed, and read by formulas as first ÷ second, so an E:T of 10:1 times the target count gives effectors. Ratios the scientist sets (E:T, MOI) live in Values; measured properties (count, viability, titer) live on the material.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| W92 | Materials helpers               | Materials helpers: copy the list from another protocol (reviewed before adding); a Used in column naming the steps and formulas that use each material, with unused ones marked; a duplicate name offers Merge (fills blanks) or Keep both, remembered; antibodies sharing a fluorochrome in the same Panel get a quiet note (isotype controls exempt); on a run, a Pull list groups materials by storage, coldest first, with ticks.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| W93 | Conjugate and run values        | Antibodies have no Format field: Conjugate says it all, blank means purified, and biotin is a conjugate. A number only known at the bench, like transduction efficiency, is a Value left blank and filled in when known (W98).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| W94 | Stable types                    | Material types are stored by a fixed ID, never by name, so types can be renamed or merged without breaking saved protocols. A type earns its place only by needing different fields; names stay short ("X or Y" only when X and Y are different things).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| W95 | Drop and Remove                 | Each row offers Drop and Remove. Drop moves the material to a folded Dropped box, struck through, with Restore and Remove; steps and formulas that still name it show it struck through in amber. Remove deletes it, with an Undo in its place for a few seconds. Typing a dropped name brings it back.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| W96 | Expiry and lab memory           | An expiry date in the past shows red on the row and as Expired in the pull list. The lab remembers materials it has used: typing a known name refills its type and details before adding, and a field made for a type is offered in "+ Field" for that type from then on.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| W97 | Values table                    | Values are one table of name and value, edited in place cell by cell with Tab, no pop-open editor. A value is added by typing it in one line ("Vol per well 100 µL", "E:T 10:1") or pasting several lines. A value with no number shows "to fill in". Unused values are marked quietly; hovering names the steps and formulas that use it. Remove and Drop leave Undo exactly where the button was, here and in Materials.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| W98 | No modes; export                | The workbench is a design tool, not a record keeper. No Build/Run switch, no per-run values, no locking, no change tracking. A protocol is a living skeleton; an experiment is a living copy; either can be copied to start the next one (comparison with the source only on request). The document carries a Run on date or range. Export makes one read-only layout for the bench (write-in lines for blanks, tick boxes, materials grouped by storage) and, after the scientist tidies the document, the final record (PDF); its header reads "Run on …" or "Planned · not yet run".                                                                                                                                                                                                                                                                                                                                                                                  |
| W37 | Reuse                           | Built from the existing primitives, chassis and tokens. A new shared piece is added only for a real gap, in the shared layer, to the same standard as the rest.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

---

## 4. Concepts

| Term            | Meaning                                                                                  |
| --------------- | ---------------------------------------------------------------------------------------- |
| **Protocol**    | The recipe: settings, an ordered workflow, controls. Versioned. Owned by a person.       |
| **Step**        | One entry in the workflow. Has a type (§5) and that type's parameters.                   |
| **Reagent row** | One reagent inside a reagent step: an antibody, a dye, a block, a buffer additive.       |
| **Field**       | Something a well is identified by, named by the scientist: Donor, Condition, Timepoint.  |
| **Version**     | An append-only save of a protocol's content. Old versions are never rewritten.           |
| **Run**         | A dated working copy of one protocol version, plus that day's inputs, lots and notes.    |
| **Skeleton**    | A parent protocol: the basic workflow. _Cytotoxicity assay_.                             |
| **Variant**     | A protocol made from a skeleton and listed under it. _96-well format_; _extended, 96 h_. |

A variant is a complete copy, free to diverge. Two levels only: a variant has no variants of its own.
Runs can start from a skeleton or a variant.

A run moves through two states: **draft** (editable, recalculates live) and **completed** (frozen,
stores the calculated volumes so a later formula change cannot rewrite the record).

---

## 5. The workflow

### Step types

A protocol is an ordered list of steps. Add, remove, reorder, rename. Times are durations (W24). See
Q11 for whether this list is complete.

| Type             | Parameters                                                                        | Presets                                                                                                                                   |
| ---------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Add reagents** | Reagent rows, volume per sample, buffer, incubation time, temperature, light/dark | Fc block, viability stain, surface stain, primary stain, secondary stain, tetramer stain, fixation, permeabilization, intracellular stain |
| **Wash**         | Buffer, volume, number of washes, spin settings                                   |                                                                                                                                           |
| **Centrifuge**   | Speed (× g), time, temperature                                                    |                                                                                                                                           |
| **Incubate**     | Time, temperature, light/dark                                                     |                                                                                                                                           |
| **Resuspend**    | Buffer, volume                                                                    | Final resuspension before acquisition                                                                                                     |
| **Note**         | Free text                                                                         | Acquire, count cells, anything else                                                                                                       |

Each _Add reagents_ step is its own mix with its own volume and buffer. A T-cell-only panel has no Fc
block step; a surface-only panel has no fix/perm or intracellular steps. Nothing is required.

### Sections and numbering

Steps are grouped under titled sections, and the outline is numbered the way printed protocols are (W44):

| Level    | Mark       | Example                             |
| -------- | ---------- | ----------------------------------- |
| Section  | I, II, III | III. Fc block and surface stain     |
| Step     | 1, 2, 3    | 7. Wash twice.                      |
| Sub-step | a, b, c    | b. Centrifuge at 400 × g for 5 min. |
| Detail   | i, ii, iii | Rare. A list inside a sub-step.     |

A step leads with one action in a plain sentence. Time, temperature and light follow in a fixed
order. One "Note:" style, indented under its step. Whether step numbers restart in each section is
Q26.

### Reagent rows

| Field               | Notes                                                                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Marker / target     | CD4, CD8, Live/Dead. Blank for a non-antibody reagent                                                                                  |
| Fluorochrome        | BV421, PE-Cy7. Blank when unconjugated                                                                                                 |
| Clone               | Optional                                                                                                                               |
| Isotype             | Optional. Mouse IgG1, κ                                                                                                                |
| Kind                | Antibody, viability dye, Fc block, other (Brilliant Stain Buffer, fix buffer)                                                          |
| Label amount        | Optional. Type + value as printed on the vial (5 µL/test)                                                                              |
| Amount used         | Type + value, per W7. What the calculator reads. Starts as a copy of the label amount; change it when you titrate (1:200, for example) |
| Stock concentration | Required only when the amount is a target concentration                                                                                |
| Vendor / catalog #  | Optional                                                                                                                               |
| Linked reagent item | Optional, lab members only (§8, Phase 7)                                                                                               |
| Notes               | Free text                                                                                                                              |

The lot number is recorded on the **run**, not the protocol.

### Panel view

One table of every reagent row that has a fluorochrome, across all steps: marker, fluorochrome,
clone, step, amount. This is the "panel" a flow scientist expects to see, and it is where later
instrument and spectral checks attach.

### Controls

One general idea covers every control: **a control is a named subset of the panel's rows.**

| Control                     | Rows included                 |
| --------------------------- | ----------------------------- |
| Unstained                   | None                          |
| Single stain (compensation) | One row. Flag: cells or beads |
| FMO                         | All rows minus one            |
| FM-x                        | All rows minus a chosen set   |

Buttons generate the common ones (unstained, single stains for every fluorochrome, FMO for ticked
markers). Each control gets its own small mix in the calculator.

### Protocol-level settings

- **Format:** tubes or plate (and plate size). Sets default volumes and the shape of the map (§6).
- **Cells per sample.** A default a run can override.

---

## 6. Samples and layout

Planning often starts here: which samples, stained how, sitting where. So the map is not decoration
on top of a typed sample count. It is where the counts come from.

### Fields, not typed labels

The tedium to avoid: a well labeled `1:5-D3-IL2-72h` as one string, where changing the donor across
a plate means retyping every well. So a well never holds typed text. It holds **one value per field**.

- **Field:** anything the scientist wants to identify a well by. They name it: Sample, Donor,
  Condition, Timepoint, E:T ratio, Drug dose. As many or as few as the experiment needs. No fixed
  list.
- **Value:** one entry in a field. Donor has D1, D2, D3.
- **Field type:** text, or a number with a unit (Drug dose in µM). Numeric fields are what make a
  dilution series fillable.
- **Well:** one value from each field, or blank.

A well's label is assembled from its values, in an order the scientist chooses. Because wells point
at values instead of copying text, **renaming a value once changes every well that uses it**, and
changing one field across a plate is a single action that leaves the other fields alone.

**Stain** is the one built-in field. Its values are the full stain and the controls from §5. It is
what tells the calculator which mix a well receives.

### Filling the map

The scientist thinks in blocks of wells: "A1 to H3 are all Donor 1, same condition, ratio changes
down the rows." The editor follows that (W46).

1. **Highlight** a block: drag, or click a row or column label.
2. **Fill in the form** beside the plate: sample or control, then one value per field. Fields the
   block already shares are shown filled in; fields that differ across it are blank and marked
   _Varies_.
3. **Apply** (or Enter) writes every changed field to every highlighted well. Untouched fields are
   left alone. Clearing a filled field removes that value.

There are no fill modes (W46, W51). A value that changes down the plate is entered by highlighting
each row or block in turn. Values are created by typing them; earlier values are suggested. A new
field is added by name from the same form.

**Controls (W52).** _Sample or control_ is the form's first input, a list of the assay's controls. A
control that is not on the plate yet says so in that list.

**Set as empty (W59)** clears the highlighted wells after a confirmation.

| Also                 | What it does                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------ |
| Fill dilution series | On a numeric field: starting value, dilution factor, direction, instead of typing the list |
| Rename a value       | Once, in the legend. Every well using it updates                                           |
| Copy / paste a block | Repeats a layout elsewhere on the plate or on another plate                                |
| Shade by field       | Optional. Colors the wells by one field. Everything stays readable without it (W48)        |

### Reading the map

A well shows every value it holds, stacked one per line in field order, in the scientist's own
words (W48). Wells are large enough to read. An empty well shows its coordinate.

Color is a grouping aid only. The scientist chooses one field to color by, or none, and can change
it at will: by donor for one experiment, by condition for the next.

Later, if wanted: shading that steps with a titrated value, and color chosen automatically from
what was entered.

### Two ways in, same result

- **Map first.** Open the plate, select wells, assign values. Counts follow.
- **Count first.** Type "12 samples", tick the controls. The map auto-fills in order and can be
  rearranged.

### The rest

- **Replicates.** A triplicate is three separate wells with the same values, numbered automatically.
  Pooling them before reading is a note on the protocol.
- **What the calculator takes.** The number of wells receiving each mix: 12 full stain, 1 unstained,
  3 FMO. No separately typed count to drift out of step.
- **Formats.** Tubes (a numbered list) and plates of 6, 12, 24, 48, 96 and 384 wells. Chosen per
  protocol, changeable on the run. 96 is the default.
- **Several plates.** A run holds one or more plates or racks. They share the run's fields and
  values, so a donor renamed once is renamed on every plate.
- **Skeletons and variants.** A protocol can carry a default layout with its fields and placeholder
  values (the _96-well format_ variant's standard plate). A run starts from that and fills in real
  names.
- **Export** prints the map with the run.

This is the same model for a flow plate and a cytotoxicity plate. Only the fields differ.

---

## 7. The calculator

One pure calculation module, used by the editor for live numbers and by the server when a run is
completed. Every later protocol type reuses it.

**Run inputs:** the layout (§6), cells per sample, overage % (default 10).

**Per-sample volume of each reagent:**

| Amount type          | Volume per sample                          |
| -------------------- | ------------------------------------------ |
| µL per test          | The value as entered                       |
| Dilution 1:N         | Step volume ÷ N                            |
| Target concentration | Target × step volume ÷ stock concentration |

**Per mix (one per _Add reagents_ step, plus one per control):**

- Reagent volume = per-sample volume × positions receiving the mix × (1 + overage)
- Buffer volume = step volume × positions × (1 + overage) − sum of reagent volumes
- Warning when reagents alone exceed the step volume

**Buffer totals.** Wash and resuspend steps know their buffer and volume, so the run also totals how
much of each buffer to prepare.

The label amount is only a starting point: a bright fluorochrome on a common marker often works at a
fraction of it. So the calculator reads "amount used", which starts as the label amount and is
changed when the user titrates (W25). A run can override any row's amount for that day. Nothing
scales with cell number automatically (W21).

**Unit conversions.** Target concentration needs µg/mL ↔ mg/mL and similar. The shared unit registry
today holds only names and dimensions, no conversion factors. Phase 0 adds a factor to each
convertible unit.

---

## 8. Ownership and sharing

**Who can see a protocol or run:** its owner, or any member of the lab it is shared with.

| Action              | Private | Shared with lab     |
| ------------------- | ------- | ------------------- |
| View, export        | Owner   | Owner + lab members |
| Edit, archive       | Owner   | Owner + lab admins  |
| Duplicate as my own | Owner   | Owner + lab members |
| Start a run from it | Owner   | Owner + lab members |

Runs follow the same rule: private by default, shareable with the lab (W14).

**Leaving a lab (W6, W16).** Each protocol and run the person had shared stays with the lab,
attributed to them as a former member, editable by lab admins. Then one of two things:

- **Converted to an individual:** they keep their private documents and get a private copy of
  everything they had shared.
- **Deleted:** their private documents go with them.

**A lab shutting down (W23).** Today, switching a lab off logs its members out and keeps them out.
New rule: members of a switched-off lab can still sign in, to a workbench-only view. Inventory stays
locked. Their private documents and the lab's shared ones remain available. Switching the lab back on
restores everything, so nothing is converted and nothing is permanent. A member who is leaving for
good is converted to an individual, as above.

**Inventory link.** A lab member can attach a reagent row to a reagent item. The row then shows
on-hand quantity and nearest expiry, and the run offers that item's lots to pick from. v1 does **not**
deduct stock when a run completes. The link is a soft reference: the row keeps its own typed text,
so a deleted item or a move out of the lab never breaks a protocol.

---

## 9. Individuals

A solo scientist with no lab. Workbench only.

### The role

`individual` joins `system_admin`, `lab_admin`, `user`. The database enforces the pairing:

| Role                         | Lab            |
| ---------------------------- | -------------- |
| `system_admin`, `individual` | Must have none |
| `lab_admin`, `user`          | Must have one  |

The migration has to check existing users against this rule first. One known oddity: the very first
registrant on an empty database becomes a `lab_admin` with no lab.

### Safety fixes that must land with the role

Today the server treats "no lab" as "system admin" in three places. An individual would inherit all
three, so they are closed in the same phase the role is added, before any individual can exist.

| Where                                         | What an individual would get today                            |
| --------------------------------------------- | ------------------------------------------------------------- |
| `AuditController`                             | Every lab's audit log                                         |
| `UserController` + `UserRepository.findByIds` | User lookups across all labs                                  |
| `SocketEventHandler`                          | A seat in the system admins' live channel and global presence |

Each must decide by **role**. Lab-scoped routes need no change: `extractLabId` already rejects a
user with no lab, which is what keeps individuals out of inventory.

### Client

The same inference exists on the client and moves to role checks:

- `AppDashboard`: "no lab" currently renders the system admin dashboard. New rule: `system_admin` →
  system dashboard, `individual` → workbench, everyone else → as today.
- `AppHeader`: the suite switcher, search, Storage Manager and Donor Registry are hidden without a
  lab. Correct for individuals already; they need a workbench-only header.
- `SocketQueryBridge`, `SocketService`, `useStorageSync`, `SystemTab`: same inference, same fix.

The many `enabled: !!labId` query guards are already right. They switch inventory queries off.

### Invites

Invite codes today require a lab and allow only `lab_admin` or `user`. Changes:

- `invite_codes.lab_id` becomes optional; role gains `individual`; same pairing rule as users.
- A system-admin-only endpoint mints individual invites.
- Registration with an individual code creates a user with no lab and no researcher profile.

### System admin UI

Every system admin screen today hangs off a lab, so lab-less users would be invisible. A new
**Individuals** tab on the system dashboard, patterned on `LabsPanel` and `LabUsersPanel`:

- List: name, email, created, last login, protocol count
- New individual invite
- Suspend, deactivate, delete
- Move into lab (sets the lab, changes the role to `user`; documents stay theirs and stay private)

And on a lab's user list: **Convert to individual**, beside the existing delete.

---

## 10. Data model

Draft. Three tables, all new.

**`protocols`**: id (`prot`), owner_user_id, visibility (`private` / `lab`), lab_id (set only while
shared), title, parent_protocol_id, current_version, archived,
timestamps.

**`protocol_versions`**: protocol_id, version, content (JSON), change_note, changed_by, created_at.
Append-only. Saves use the same guard the storage configuration uses: the save names the version it
was based on and is refused if someone saved in between.

**`protocol_runs`**: id (`prun`), protocol_id, protocol_version, owner_user_id, visibility, lab_id,
title, run_date, inputs (JSON: fields, plates, cells per sample, overage), content (JSON: the snapshot plus any tweaks), results (JSON: the
calculated volumes, written on completion), notes, status (`draft` / `completed`), timestamps.

**Why JSON for content.** A protocol is an ordered list of mixed step types, and a run is a frozen
snapshot of one. Both are documents, read and written whole. The shape is still strict: one Zod
schema in `@odysseus/shared-schemas` (new `workbench` module) validates content on every write, and
the client and server share it. Reagents chose normalized tables because options needed real foreign
keys; nothing here does, since the inventory link is deliberately soft.

**Access is scoped in SQL**, per the lab-scoping rule in AGENTS.md, but by person:
`owner_user_id = requester OR (visibility = 'lab' AND lab_id = requester's lab)`.

**No audit-log entries in v1.** The audit log is the lab's record; private documents are not the
lab's business, and version history already answers "who changed what."

---

## 11. What already exists

| Need                                   | Already there                                                                                                                                                                    |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plate / tube map                       | The tube box grid (`domains/tubes/ui/components/grid/`): cell grid, drag selection, keyboard navigation, clipboard. The pattern to follow, and a candidate for shared extraction |
| Units and formatting                   | `shared-schemas/units` registry (names and dimensions; factors added in Phase 0)                                                                                                 |
| Versioned document with conflict guard | `storage_versions` / `storage_current` pattern                                                                                                                                   |
| Print output                           | `window.print` with print styles, as the barcode sheets do. No PDF library needed                                                                                                |
| File download                          | `shared/utils/downloadBlob.ts`                                                                                                                                                   |
| Reagent stock, lots, expiry            | Reagents suite queries, reused read-only for the inventory link                                                                                                                  |
| Structured fluorochrome/clone data     | The attribute system's `system_key` mechanism, for later auto-fill                                                                                                               |
| System admin list + detail panels      | `LabsPanel`, `LabDashboard`, `LabUsersPanel`                                                                                                                                     |
| Invite codes                           | Entity, repository, commands, registration path                                                                                                                                  |
| Per-user controller access             | `BaseController.extractUserId`                                                                                                                                                   |

**Mounting.** Navigation is hardcoded, not a registry. The workbench adds a `/workbench/*` route
beside `/lab/*`, an entry in the header's suite switcher, a `client/src/domains/workbench/` domain,
and a `/api/workbench` route module.

---

## 12. Screens

Five screens. Each is listed with the existing pieces it is built from and the gaps it exposes. The
layouts below are starting points for the mockups, not final.

**Mounting.** A new top-level page at `/workbench/*`, a sibling of `LabManagementPage`, with an entry
in the header's suite switcher.

### 12.1 Library

Your protocols and recent runs. Patterned on `ReagentsTab`.

| Part                    | Built from                                                                                                        |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Left panel frame        | `ConsolePanel`, `PanelHeader`, `HeaderStrip` (protocol, variant, run counts)                                      |
| Toolbar                 | `SearchInput`, `SortControls`, `Button` (New protocol)                                                            |
| Skeleton → variant tree | `nav-tree.css` rows and `NavTreeLines`, in a new workbench tree component                                         |
| Right panel             | `InfoPanelEmpty`, `DetailRow`, `Chip` (private / shared), actions: open, new variant, start run, duplicate, share |
| Recent runs             | `Table`, compact density                                                                                          |

**Gap:** no general two-level tree. `CategoryTreePanel` is tied to categories. The workbench tree
reuses the shared tree styling and lines but is its own component.

### 12.2 Protocol editor

One scrolling document inside a `ConsolePanel`.

| Part           | Built from                                                                        |
| -------------- | --------------------------------------------------------------------------------- |
| Header         | Title, format, cells per sample, version; `UnsavedChangesIndicator`               |
| Panel view     | `Table`, read-only, fed by the reagent rows below                                 |
| Default layout | The plate map (12.4)                                                              |
| Step cards     | `Subsection` with `SubsectionHeader index` (renders "01 /", "02 /")               |
| Step fields    | `Input`, `NumberInput`, `Select`, `Textarea`, unit dropdowns via `useUnitOptions` |
| Reagent rows   | An editable row list: one line per reagent, typed into directly                   |
| Add step       | `DropdownMenu` of presets                                                         |
| Controls       | `Chip` per control, generated by `Button`s                                        |

**Gaps:**

- **Editable row list.** `Table` cells are read-only and nothing in the app edits a list of rows
  through the form library yet. Reagent rows are composed from the existing field primitives; no new
  table primitive.
- **Reordering steps.** No drag-and-drop exists and no library for it is installed. Move-up /
  move-down buttons instead (W38).

### 12.3 Run sheet

Two tabs (W43). **Setup** holds run inputs, the reagents table (marker, fluorochrome, clone, isotype,
vendor, catalog number, lot, amount, stock), buffers to prepare, and the plate editor. **Run** is the
sheet described below. The section strip stays pinned at the top while scrolling. Each mix sits
inside the step that uses it, with a tick and a lot box per reagent. Finished steps collapse to one
dim line. The study is refs/redesign/Workbench Run Sheet Study-2.html.

The supplier-style sheet (W35).

| Part                   | Built from                                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Header                 | Protocol name and version, date; `StatCell` strip: samples, plates, cells per sample, overage                    |
| Top band, side by side | Reagents with lot entry (`Table`), plate map (12.4), mix volumes per mix (`Table`), buffer totals, dilution prep |
| Steps                  | Checklist: tick, numbered header, parameters with that day's volumes filled in, a notes field                    |
| Progress               | `CompletenessMeter` (steps done)                                                                                 |
| Current step           | The existing row glow                                                                                            |
| Hints                  | `Tooltip` on an info icon; link to the matching help section; optional reference link on a step                  |
| Complete run           | `ConfirmDialog`, then the sheet locks                                                                            |

On a narrow window the top band stacks. Steps always run full width below.

**Gaps:**

- **Checklist row.** `Checkbox` has no label slot. It gains one, as a primitive change.
- **Hint icon.** `Tooltip` exists; a small info-icon wrapper around it does not.
- **Help deep link.** The help window opens only from the header and cannot be opened at a section
  from elsewhere. Needs a small extension, plus workbench help content.

### 12.4 Plate map

Used in the editor (default layout) and the run (real layout).

| Part                                          | Built from                                                                                                                        |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Grid, rulers, selection, keyboard, copy/paste | The tube box grid, **extracted into shared pieces** that both use                                                                 |
| Selection form                                | Beside the plate. One `Input` per field with suggestions from existing values, a same / down rows / across switch, Enter to apply |
| Color by field                                | `Select` to pick the field; legend of `Chip`s; palette from `labColorSpace.ts`                                                    |
| Plate tabs                                    | `Tabs`, one per plate in the run                                                                                                  |
| Fill series, dilution series                  | `BaseModal` form                                                                                                                  |

**Extraction.** The grid's selection, drag, keyboard and clipboard logic is general but wired to tube
state. It moves to the shared layer with tube state passed in, and the tube grid is rewired onto it.
The tube cell, tooltip, locks and box navigation stay with tubes.

**Safeguards (W40).** The tube grid is the most-used screen and must come out of this unchanged.

1. Only the coordinate math has tests today. Tests that pin the grid's current behaviour are written
   first and pass against the untouched code.
2. The extraction lands on its own, with no behaviour change and no plate work mixed in.
3. The same tests pass afterwards.
4. An in-app checklist is run on the tube grid in dev: select, drag, ctrl-click, shift-click, arrow
   keys, copy, cut, paste, context menu, locked tubes.
5. Nothing reaches production until that checklist passes.

**Net-new:** clickable row and column headers, rectangular shift-select, plate formats (the current
grid schema caps at 20 per side and forces square cells; plates get their own format definition), the
well cell, and a dense layout for 384 wells (no gaps or glow, color only, labels on hover).

### 12.5 Print view

**A plain document, not a styled screen (W47).** White page, black text, a standard typeface, simple
bordered tables, the outline numbering from §5. The plate map is a labeled grid with text in every
well, so it survives black-and-white printing and copy-paste. It carries everything needed to file
the record: reagents with vendor, catalog number and lot, mixes, steps as performed, notes. The
same page is what gets saved to PDF and what gets pasted into a lab notebook.

The run sheet on paper: light, ink-saving, real tick boxes, space for handwritten notes, plate map
with labels and legend.

| Part            | Built from                                                                                           |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| Print mechanism | The barcode sheets' approach, generalised into one shared print wrapper that barcodes also move onto |
| Layout          | The run sheet's own components in a print style                                                      |

**Gap:** no shared print wrapper and no global print stylesheet.

### New shared pieces, in one place

| Piece                                        | Home                         | Other user              |
| -------------------------------------------- | ---------------------------- | ----------------------- |
| Grid selection, drag, keyboard, sizing hooks | `shared/hooks/`              | Tube grid               |
| Grid frame and styles                        | `shared/ui/components/grid/` | Tube grid               |
| Block clipboard and coordinate helpers       | `shared/utils/`              | Tube grid               |
| Print wrapper                                | `shared/ui/components/`      | Barcode sheets          |
| `Checkbox` label slot                        | Existing primitive           | Any labeled checkbox    |
| Hint icon                                    | `shared/ui/primitives/`      | Settings and form hints |
| Help deep link                               | `domains/help`               | Any screen              |

Everything else is workbench-local until a second user appears.

### How mockups are done

Both mechanisms already exist in the repo.

1. **Static study** per screen in `docs/mockups/` (the workbench exception to local-only mockups),
   using the real tokens and primitives. Approved before any component is written.
2. **Live preview** at `/__dev/modals`: the real components against fixtures, in light and dark,
   before any wiring to data.

---

## 13. Build phasing

Workbench first, individuals second (W15). The workbench is person-scoped from day one, so
individuals can be added afterwards without rework, and the part with daily value ships first.

| Phase  | Delivers                                                                                                                                                                         |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Design | Static studies for the five screens (§12), approved                                                                                                                              |
| 0      | Conversion factors on the unit registry, with tests                                                                                                                              |
| 1      | Schemas, tables, protocol CRUD + versions, access rule, `/workbench` shell, protocol list                                                                                        |
| 2      | Protocol editor: steps, reagent rows, panel view, controls, variants; save, duplicate, amend                                                                                     |
| 3      | Calculator module; runs: create, typed counts, mixes, lots, notes, complete, save back, save as new. Then a sample panel in the demo lab                                         |
| 3b     | Run checklist, hints, help deep link and workbench help content                                                                                                                  |
| 4a     | Tests pinning the tube grid's behaviour, then the shared grid extraction, tubes rewired                                                                                          |
| 4b     | Plate and tube map, several plates per run, text and numeric fields, bulk editing, dilution-series fill and prep, map-first and count-first entry, counts feeding the calculator |
| 5      | Shared print wrapper (barcodes moved onto it); print view for protocols and runs, map included                                                                                   |
| 6      | Share with lab; lab admin edit rights; lab-keeps-copy on removal; workbench access while a lab is switched off                                                                   |
| 7      | Inventory link for lab members                                                                                                                                                   |
| 8      | `individual` role, pairing rule, the three server safety fixes, client role checks                                                                                               |
| 9      | Individual invites, registration path, system admin Individuals tab, convert to individual                                                                                       |

---

## 14. Open questions

### Still open

| #   | Question                                                                                                                                                                    | Proposal                                                                                                                                                       |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q25 | **Export formats.** PDF only, or also a Word file or something a specific lab notebook imports?                                                                             | PDF from the plain page in v1. The page is plain enough that copying it into Word or a notebook keeps its tables. A real Word export only if that falls short. |
| Q26 | **Step numbers.** Continue through the whole protocol (1 to 12), or restart in each section (III.1, III.2)?                                                                 | Continue. "Repeat step 8" and "4 of 12 done" stay unambiguous.                                                                                                 |
| Q29 | **A name for child protocols.** Evan does not want "variant". "Version" is already used for save history.                                                                   | Call the children **versions** and rename save history to **revisions**. Awaiting his answer.                                                                  |
| Q30 | **Finishing a run.** "Complete run" is an unclear label. Should a run save itself as it goes, with one deliberate finish-and-lock at the end, or have an explicit Save too? | Autosave plus "Finish and lock". Awaiting his answer.                                                                                                          |
| Q31 | **Reopening a finished run.** Given W64 (living documents), can a locked run be reopened for corrections?                                                                   | Awaiting his answer.                                                                                                                                           |
| Q33 | **Flow diagram source.** Is the diagram a second view of the same steps, or a drawing of its own?                                                                           | Same steps, so list and diagram never disagree. A step can be marked "meanwhile" to sit on a side track. Tried in the builder study.                           |
| Q34 | **Parent and child protocols.** With free naming (W72), is a skeleton-to-variant tree still needed, or is duplicate-and-rename enough?                                      | Decide after using the builder study.                                                                                                                          |
| Q35 | **Layout during a run.** Same board as built, or can a run rearrange it?                                                                                                    | Same board, layout locked; values, ticks and notes stay editable.                                                                                              |
| Q32 | **Run tab plate on a laptop.** Wells are about 40 px there and long names are cut off. Move the plate above the steps on small screens?                                     | Awaiting his reaction to the mockup.                                                                                                                           |

### Resolved

- **Q27** Counts are entered as concentration, viability and volume; both the straight-to-well volume
  and the made-up suspension are shown; wells are typed or read from the plate (W56).
- **Q28** The panel is picked from saved panels at Setup and edited for the run (W60).
- **Q17** A run can hold several plates (W31).
- **Q18** Numeric fields and dilution-series fill are in v1 (W32).
- **Q19** A protocol's default layout carries reusable fields for now (W33).
- **Q11** The step list stands for now, refined in use (W30).
- **Q13** Tubes and 6 to 384-well plates, 96 the default (W28).
- **Q14, Q16** Wells are described by scientist-defined fields, which covers sample identity and
  per-well conditions alike (W27).
- **Q15** Replicates are separate wells (W29).
- **Q7** A switched-off lab's members keep workbench-only access until it is switched back on (W23).
- **Q12** Durations only; no live timers (W24).

- **Q1** The parent is a skeleton; variants are independent copies under it; nothing is inherited
  (W20).
- **Q2** Staining happens in separate steps, each its own mix, alongside washes and spins. The user
  builds the list from presets (W22).
- **Q3** Final dilution volume is the final resuspension volume before acquisition (W18).
- **Q4** No automatic scaling with cell number (W21).
- **Q5** Owner and lab admins edit a shared protocol; members duplicate freely and are never locked
  into the lab's version (W13).
- **Q6** Runs are shareable with the lab (W14).
- **Q8** Workbench first (W15).
- **Q9** Joining a lab is the system admin's "move into lab" in v1. Joining by invite code from
  Settings is a later pass (W17, §15).
- **Q20** A run works out how to make each dilution series: transfer volume, diluent volume, stock
  for the top point (W42).
- **Q21** Screens are specified in §12 (W35, W36, W37).
- **Q22** Steps are reordered with move-up / move-down buttons. Reordering is rare: most protocols
  are established and only fine-tuned (W38).
- **Q23** The run sheet is mocked up first (W39).
- **Q24** The grid logic is shared, with tests first and an in-app check of the tube grid (W40).
- **Q10** The demo lab gets a sample panel after Phase 3 (W19).

---

## 15. Later passes

- **Variants of variants**, if two levels prove too few.
- **A personal library of fields and values**, reusable across protocols.
- **Instrument configurations.** Lasers, detectors, filters. Per lab, since the same model differs
  between labs. Individuals define their own.
- **Spectral conflict checking.** Needs fluorochrome spectra data and an instrument configuration.
- **Auto-fill from inventory.** Seed system attributes (target, fluorochrome, clone) so a linked
  reagent item fills the row.
- **Stock deduction** when a run completes.
- **More step types.** Reagent prep, dilution series, molarity calculators.
- **Live timers** on a run, with end times for long incubations.
- **Join a lab by invite code** from Settings, without the system admin.
- **Email.** Self-serve password reset, emailed invites (W12).
