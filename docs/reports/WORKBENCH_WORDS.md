# Workbench: One Word per Concept (W114 step 1)

The worksheet for the word list. Every card, hover, message, generated name and the math's own name
lookups were swept on 2026-11-20 (about 370 files). Each concept below lists every wording in use
today and a recommendation. Evan settles each pick in chat; the answer is written into the
**Pick** line, then the list is built.

Status per concept: **to settle** (a real choice), **keep** (one word already, just record it),
**follows** (settled by another pick).

---

## How the list works once built

- **One entry per concept, defined once in code.** Each entry holds the word shown on cards, the
  word used inside generated names ("Raji cells per well"), the accepted spellings a person may type,
  and a one-line meaning.
- **Every card reads from it.** Labels, column headings, hovers, messages, placeholders and generated
  names all take their word from the entry, so a word cannot drift on one card.
- **The math reads from it too.** Today the math recognises a value by literal strings scattered
  in the code, so a value named one way on one card is invisible to another. Example: the cell
  math looks for "extra" and the Calculations suggestions look for "Overage". With the list, every
  lookup accepts the entry's word and its accepted spellings, so a typed "Overage", "Extra" or
  "Dead volume" all reach the same number.
- **Accepted spellings keep old files working.** A renamed word stays readable under its old
  spelling. Generated names that change ("Raji per well" → "Raji cells per well") are renamed in
  formulas and step text when a file opens, the same way renames already follow through.
- **One meaning per word.** The same entry gives the hover meaning, so hovering a term anywhere
  explains it the same way.
- **New cards take words from the list.** A new label that names an existing concept uses its
  entry. A new concept gets a new entry.

## Build order and progress

1. **The list plus reading (nothing renamed). Built 2026-11-20, not committed.**
   - `utils/terms/termList.ts` holds one entry per looked-up idea: today's word first, then every
     spelling settled below as accepted, plus the unit kind it must have. A blank or unknown unit
     always passes.
   - `utils/terms/termLookup.ts` (`findTerm`) checks the material's own value first, then the
     Whole experiment one.
   - It replaces the literal lookups in the Calculations suggestions (`formulaScopes.ts`), the
     cell math, the recipe math (`WELL_VOLUME_NAMES` is gone) and the Flow panel's stain volume.
   - Behavior changes:
     - The cell math now uses a Whole experiment Extra.
     - Calculations sees any Extra spelling and a per-material Extra, not only a Whole experiment
       "Overage".
     - "Cells per well" / "cells/well" count as cells.
     - A per-well amount in a mass unit is no longer treated as cells.
     - A cells/mL "Count" or "Cell conc." is read by the cell math (bug 8, read side).
   - Tests: 9 new, and the workbench suite is green (562).
2. **Renaming plus file upgrades, together.** Generated names switch to the settled words in the
   same change that renames old names inside calculations and step text when a file opens, so no
   file breaks. Each entry's `word` becomes the settled word, and today's word moves to
   `alsoAccepted`.
   - **2a. Built 2026-11-20, not committed: the mechanism, and the first words.**
     - Words switched: Vol./well, Cells/well, Mass/well, Total well vol., Extra (dead vol.),
       Cell conc., Total needed, Total vol. needed, Cocktail vol./well.
     - Each entry carries its usual unit.
     - Filing happens when a value is added (the add bar, typing on a row, "needed" spots):
       "Overage 10" becomes Extra (dead vol.) 10%. It happens on open too (`termUpgrade.ts`):
       typed Values names that have a fitting unit are filed under the word, and any reference in
       calculations, steps or a dilution's start or step value that no longer matches a name is
       pointed at the name that now carries the word.
     - Names are not re-filed while you edit, since names update as you type.
     - Generators switched: the cell math, the Calculations suggestions ("Needed" → Total needed,
       "Mix" → Total vol. needed for a cell material), the Values suggestions ("Total volume"
       dropped), plate amount names (vol./well, cells/well, mass/well, and vol./tube on shelves),
       step readings (bug 9 fixed: a concentration gets no "per well"), the Flow panel message,
       and three placeholders.
     - Decided in the build: for a cell material, "Total needed" is the cells and "Total vol.
       needed" is the suspension, so the two totals don't collide.
     - Gap: the "already used" preview checks only the settled spelling, so an old unfiled
       "Raji per well" with no unit isn't seen as taken.
     - Tests: workbench suite green (567).
   - **2b. Built 2026-11-20, not committed: the rest of the settled words.**
     - Words switched:
       - Final conc. and Mix conc.: recipe math and Values table, now sharing one name builder.
       - Working strength, Working conc., Working dil.
       - Stock conc., MW, Cell conc.
       - Top conc. / Top dil. / Top amount.
       - Dil. factor, Points, Replicates, Top vol., Top working conc., Vol. needed, Diluent in top.
       - Total well vol. and Extra (dead vol.) as Dilutions inputs.
       - "<stain> <step> cocktail", plus "… cocktail wells" and "… cocktail antibodies".
       - Condition words (Centrifuge, temp., Stim., and Coating, Development, Digestion,
         Sonication, Treatment, Perm via "permeabilize").
       - Step readings Vol. / Mass / Final conc.
       - Materials field labels (Stock conc., Final conc., MW, Cell conc., Dil., Top conc.,
         Vol./well, Vol./reaction, Vol. made, Reconstitution vol., Protein conc., Coating conc.).
         Their saved field keys are kept, so no stored value moves.
     - Card wording that names these words: the Dilutions labels, strip rows and notes (Top /
       Then 2–4); the strip squares labelled Top, 2, 3…; the plate legend "stronger color = higher
       amount".
     - The upgrade moved from the store into `readProtocolFile`, so opening, the recovery copy and
       the example-file tests all go through it.
     - Two kinds of old spelling:
       - `alsoAccepted` is filed under the word when typed.
       - `formerly` is only recognized (read, and followed on open), for everyday words that must
         not re-file a typed value: Count, Amount, Mix, Concentration, Fold, Working, Wells,
         Antibodies, Top working, Diluent in well 1.
     - Bug found and fixed in the build: the open-time upgrade wasn't safe to run twice ("Extra"
       re-matched inside "Extra (dead vol.)"). It now scans current names too, with a test.
     - Held for W114 steps 2 and 3, since renaming now would collide with the shared value they
       merge into: the Dilutions input "volume added" (→ Vol./well), and the Flow panel's
       "<marker> dilution factor" (→ Dil.) and "amount per well" (→ Vol./well).
     - Changed from the G3 pick: "rest", "culture" and "perm" are not verbs, because they are too
       often ordinary words ("the rest of the cells", "culture medium", "perm buffer"). Rest and
       Culture are dropped, and Perm comes through "permeabilize".
     - Tests: suite green (569). The three example files still give their mockup answers through
       the upgrade, and survive a save and reopen unchanged.
3. **Card by card**, done in four batches: 3a board and house rules, 3b Flow panel and Stain side,
   3c Plate map, 3d Materials and Values.
   - **3a. Built 2026-11-20, not committed.**
     - Wording:
       - Card instead of block, everywhere shown, including the old-file error "Unknown card type".
       - Removing a card that shows another page's plates: "Remove this card? Its plates stay on
         …".
       - Pages: "Previous page" / "Next page" (the shared tab strip takes `itemName`); pages are
         removed, not deleted.
       - Calculation instead of formula in messages; "Raji is already used"; one usage hover
         ("Used in Step 3 · 2 calculations" / "Not used in any step or calculation").
       - Rounding errors and hints say "round to", with real example names.
     - Bug 3 fixed: a renamed Whole experiment now titles Calculations and the insert list too
       (`generalTitleOf`).
     - House style:
       - Straight quotes everywhere (S3).
       - The S8 unit spacing, in one place (`withUnit`: 10%, 37°C, 300×g, 10 µL).
       - Add buttons use the shared blue plus (`board/addIconClass.ts`) and "Add …" (S7). The
         add bar reads "Add material".
     - Procedure: "Add 3 steps"; the tip says "moves in / moves out"; the choices and paste
       example use RT, h, 4°C and 300×g; the "Spin" common step is Centrifuge.
     - S2 settled with Evan: the defaults were stored in capitals to keep Greek letters from being
       capitalised.
       - Card titles and page tabs are now stored as typed, and the display capitalises them
         through `capsKeepingGreek`, which keeps γ, δ and µ as typed. The rename box shows the
         stored text.
       - New defaults are "Setup", "Plates & calculations", "Takedown", "Page 2", the card label,
         and "Whole experiment".
       - Each title follows its neighbours: Values headings are displayed in capitals, so its
         Whole experiment box is too. Calculations and the insert list show names as typed.
       - Caveat: the Values group title is a text box all the time, so a Greek letter in it would
         be capitalised.
   - **3b. Built 2026-11-20, not committed: Flow panel and Stain side.**
     - Rows are markers: "Add a marker on VL1", "Other markers", "New marker…", "Remove from the
       panel".
     - The light facts say fluor: "22 fluors on 5 lasers", the Fluor column, "New fluor" /
       "Add fluor".
     - Stains section: Full stain / Single stain / Empty stain (which makes "New stain"), the Stain
       column, "Stain name", and "Remove from this stain".
     - The Cocktail column has the hover "Where the marker is, and the cocktail it goes in" and
       the placeholder "e.g. Surface". "Needs a cocktail, e.g. Surface"; "No cocktail picked yet".
     - Stain side: "Stains", "Pick a stain…", "No stain assigned", "Make stains in a Flow panel to
       use them on this plate."
     - The usage tips are reworded to match.
     - Bugs fixed: "N detectors hold more than one marker" (was a fixed "two stains"); singular
       "1 detector", "1 laser", "1 fluor".
     - Held for W114 step 3: the "Dilution factor" and "Amount per well" columns (→ Dil.,
       Vol./well).
   - **3c. Built 2026-11-20, not committed: Plate map.**
     - W110 built with F3's words. It was marked done in the plan but was not in the code.
       - The card names itself: Plate map, its shelf kinds ("Tubes", "Flasks & tubes"), or
         "Plates, flasks & tubes".
       - A title you set wins, with the automatic name in grey beside it. Leaving the automatic
         name unchanged in the rename box keeps it automatic.
       - `labwareTitle` / `labwareTitleOf` are used by the card frame, "Start from", the removal
         message, Dilutions places and Values rows.
     - Messages name the card ("Changing it here changes Tubes", "Typed in; Plate map counts
       4"). The column hover reads "Read from the labware".
     - Labware: "Add labware", "Find labware" (bug 10), "Add or remove labware", "Remove
       labware", and "Count of 10 cm dish" (bug 1).
     - Mixed cards count per kind ("Wells used · Flasks used"), each with its own key. A
       one-kind card keeps its "used" key.
     - Noun-aware wording: about 15 messages use the tab's noun ("Put these tubes on", "Every
       tube:", "Some of those tubes already hold samples…"). The mixed fallback is
       "position(s)", not "vessel(s)".
     - "Show replicates as one: on/off"; Duplicate this plate / as a new tab / to a new card; the
       Tubes tab name and the "Tab name" label.
     - The Dilution form: the Top conc. / Top dil. / Top amount label (shared `seriesTopTerm`),
       Dil. factor, and "12 points: …".
     - Bug 11: the dead `many` field is deleted.
     - Not followed on open: a mixed card's old "Vessels used" name, which is ambiguous and rare.
   - **3d. Built 2026-11-20, not committed: Materials and Values wording.**
     - Set aside / Restore: the button, section, undo verb, "was set aside. Enter restores it".
       "Set aside in Materials" / "Removed from Materials" everywhere a material is gone.
     - "Remove from the list" and "Remove from the recipe".
     - Source (key `vendor` kept).
     - The antibody field heading is Dil. (key `amount` kept). The Values suggestion is Final
       conc.
     - Donors messages use the list's own name ("Needs a live count in Patients") and "Name in
       <list>" (bug 4).
     - Group labels in sentence case, with no stray comma ("Media, buffers & solutions").
     - Bug 5: a guessed laser is the dye's first laser, a real Laser choice. Green joins the
       laser names, so "Green 532" works in the New fluor dialog. `dyeLaserLabel` (dead once the
       guesser stopped using it) is deleted.
     - Bug 6: Format has 1536-well.
     - Bug 12: conjugate aliases are filed under one name (horseradish peroxidase → HRP,
       biotinylated → Biotin, DIG → Digoxigenin). Digoxigenin is in the picker.
   - **Bug 7 pick (2026-11-21): a field renamed from Values is renamed for the whole Materials
     column** (every material in that group), and the Materials heading shows it.
   - **Cell concentrations (raised by Evan 2026-11-21): built as W115** (see the plan). Cell
     materials and donors share six fixed words: Total cell conc., Viability, Live cell conc., Vol.,
     Total cells and Live cells. "Cell conc." and "Cell concentration" are now accepted spellings
     of Total cell conc. ("Count" stays a former one), and "Total count" / "Live count" are
     accepted spellings of Total cells / Live cells, so old references follow.
     **Revised 2026-11-22:** "Total count" and "Live count" were cell counter readings in cells/mL,
     so they are accepted spellings of Total cell conc. and Live cell conc., and old files move them
     there (Evan, on his stim assay file).
   - **3e. Built and committed 2026-11-21: the display features.**
     - "/well" (or "/tube" and so on) after a per-well number in Values cells and rows,
       Calculations workings, answers and worked-out tables (`withPerVessel`, keyed by the name,
       old spellings such as "volume added" included). Step text and the insert list show the
       plain number, since a step already says "per well".
     - Each word's meaning (`meaning` on the entry, `termMeaning`) shows on Values column
       headings, ahead of the existing note, and on the Dilutions labels. Round to joins the
       list for its meaning.
     - The unit-mismatch hover on a Values cell: "Extra (dead vol.) should be a %, so the math
       isn't using it" (`unitMismatch`). It never fires when any word with that label accepts the
       unit.
     - "2 µL per test" in an antibody's Materials cell; a 1:N shows just "1:200", since the
       heading already says Dil.
     - Bug 7: a field renamed from Values is renamed for every material in its Materials group,
       and the Materials heading shows the group's label (`columnLabel`).
     - S4: the empty Working strength shows "—".
     - Tests: 575, green.
     - Not seen in the app yet.
   - Shown labels, headings, hovers (adding a meaning to each entry once something
     shows it) and messages, with each card's bugs fixed as it is passed. This includes the
     unit-mismatch hover agreed 2026-11-20: a value named Extra (dead vol.) in µL says "Extra (dead
     vol.) is a %".

---

## A. Amounts that go into each well

**A1. Volume of one material added to each well** — to settle

- Today:
  - "Volume per well": Values, Materials (Transfection reagent), the cell math, the recipe math,
    Procedure readings, and plate names ("Medium volume per well").
  - "Volume added": Dilutions, plus its generated name "Drug X volume added".
  - "Amount per well": the Flow panel, for the antibody's µL in each well.
- Recommend **Volume per well** everywhere. The Flow panel's "Amount per well" becomes "Volume per
  well", since it is a µL volume. Dilutions' "Volume added" becomes "Volume per well" (that number
  moves into Values in step 2).
- **Pick (2026-11-20): Vol./well** (Evan: "start using vol./well as a shorthand … rather
  spelling it all out"). The shown word and the generated names use it ("Raji vol./well").
  "Volume per well", "Vol per well", "Vol/well" and "Volume/well" are accepted spellings. A name
  containing "/" works in formulas because whole names are matched before operators. Add a test
  for it. Every per-well number also shows "/well" after its
  unit ("40 µL/well", "4.00E+4 cells/well"), on every card and in Calculations workings. This is a
  display rule carried by the per-well entries (A1, A2, A5, A6), not a unit the math checks.
  "40 µL/well" is accepted as typed. A calculation shows "/well" when its name uses a per-well
  word. On a tubes or flasks tab the suffix follows F2.

**A2. Volume of staining mix in each well (a stain step's volume)** — to settle

- Today: "Stain volume", "Surface stain volume" (the Flow panel's names it looks for in Values).
- It is the cocktail's volume per well, so under A1 it would read "Surface volume per well".
  Alternatively keep "Stain volume" as its own word.
- Recommend **Volume per well** on the stain step ("Surface volume per well"), so there is one
  per-well volume word.
- **Pick (2026-11-20, revised with D6): "Surface cocktail vol./well"**: the cocktail's name, then
  A1's word, i.e. how much of that cocktail each well gets. Plain "Cocktail vol./well" covers every
  cocktail. "Surface stain vol./well" (the first pick), "Stain volume" and "Surface stain volume"
  are accepted.

**A3. Total liquid in each well** — to settle

- Today:
  - "Well volume" (Values, Dilutions).
  - "Final well volume" and "Total well volume", both also accepted by the math.
  - "the well total" and "(well total)" in messages and hovers.
- Recommend: show **Well volume** only, and keep the other two as accepted spellings. Messages say
  "Well volume", never "well total".
- **Pick (2026-11-20): Total well vol.** (Evan: "it's clearer"). It uses the "vol." of A1.
  "Well volume", "Final well volume" and "Total well volume" are accepted. Messages never say
  "well total".

**A4. Extra on top of what the wells use (dead volume, as a %)** — to settle

- Today:
  - "Extra (dead vol.)": Dilutions.
  - "extra": the cell math lookup.
  - "Overage": the only word the Calculations suggestions recognise, so a value named "Extra" is
    missed there.
  - "_Extra_ covers dead volume": Dilutions tip.
- Recommend **Extra**, with the hover "covers dead volume". "Overage" and "Dead volume" become
  accepted spellings.
- **Pick (2026-11-20): Extra (dead vol.)** everywhere, including the cell math and Calculations,
  which must find it. "Extra", "Overage" and "Dead volume" are accepted. Brackets in a name work in
  formulas because whole names are matched first. Add a test for it. Capitals follow S1 (Evan wrote
  "Extra (Dead Vol.)").

**A5. Cells added to each well** — to settle

- Today:
  - "Per well" (unit cells): the Values suggestion, the plate's name for a cell amount, and
    Procedure readings.
  - "<material> per well": the only form the math recognises as cells.
  - "Raji cells per well": generated by the cell math.
  - "Cells per well differ between wells": a message.
  - A typed "Cells per well" is not recognised.
- Recommend **Cells per well**, with the generated name "Raji cells per well". "Per well" with a
  cells unit stays accepted.
- **Pick (2026-11-20): Cells/well** ("Raji cells/well", shown "4.00E+4 cells/well"). Evan: "/well
  is the standard and consistent to read". "Cells per well" and "Per well" with a cells unit are
  accepted.

**A6. Mass of a material in each well** — to settle

- Today: the plate labels it "Per well" (same as cells), and Procedure readings label it "Amount" /
  "Amount per well".
- Recommend **Mass per well**, so "Per well" never stands alone.
- **Pick (2026-11-20): Mass/well** ("Drug X mass/well", shown "2 µg/well"). "Mass per well" is
  accepted.
- **Rule from A1, A2, A5 and A6:** every per-well amount is named "<kind>/well" and shown
  "<unit>/well".

**A7. Concentration a material ends at in the well** — to settle

- Today:
  - "Final in the well": Values column.
  - "IL-6 in the well": generated.
  - "Final concentration": Values suggestion and Materials field.
  - "Final": Dilutions strip.
  - Procedure readings make "Concentration per well", which is not a real quantity.
- Recommend **Final concentration** everywhere, with the generated name "IL-6 final
  concentration". Readings use the same word.
- **Pick (2026-11-20): Final conc.** Evan first said "Final concentration", then changed it to the
  short form ("where applicable I think abbr work better … so words don't cause so much
  cluttering"). The Values column, generated names ("IL-6 final conc."), the Dilutions strip row and
  step readings all use it. "Final concentration", "Final in the well" and "in the well" are
  accepted. See S11.

**A8. Amount of an ingredient inside a mix**

- **Pick (2026-11-20): Mix conc.**, paired with Final conc. Today "In the mix" is the Values column,
  and there are two generated forms ("IL-6 in Stain mix" in Values, "Stain mix IL-6 in the mix" in
  the recipe math). Both become one name, **"Stain mix IL-6 mix conc."**. "In the mix" is
  accepted.

---

## B. Totals the math works out

**B1. Total of a material to prepare (per well × wells × extra)** — to settle

- Today:
  - "Needed" / "Raji needed": Calculations suggestion.
  - "Mix" / "Raji mix": a second Calculations suggestion doing the same math.
  - "Total volume": Values suggestion on mixes.
  - "Raji cells needed": cell math.
  - "Cells to prepare": cell math group title.
- Two clashes:
  - "needed" is also the amber badge for a missing value, so "Raji needed" can sit beside a
    "needed" badge.
  - "Mix" is also a user-made mix row.
- Recommend **Total** for the computed total ("Raji total", "Stain mix total", "Raji total cells"),
  with one suggestion instead of two. The "needed" badge keeps its word. "Total volume" goes, since
  it is too close to "Total well volume".
- **Pick (2026-11-20): Total needed.** Evan: "total doesn't seem descriptive enough".
  - One pattern, "<thing> total needed", with the unit saying what kind of total it is ("Raji
    total needed 1.20E+6 cells", "Stain mix total needed 4.8 mL").
  - It doesn't clash with the amber "needed" badge, since that only sits on a blank value you type
    and a total is always worked out.
  - The two duplicate Calculations suggestions ("Needed", "Mix") become one.
  - "Needed", "Raji cells needed", "Raji mix" and "Total volume" are accepted.
  - The cell math group title "Cells to prepare" is left for review when the cell math is reworded.

**B2. Amount to take from a stock** — keep

- "To take" / "Drug X stock to take" is consistent across Calculations, the cell math and Dilutions.

**B3. Diluent to add, suspension to make, resuspend volume** — keep

- These are cell-math lines, each a distinct step, and each word is used once.

---

## C. Dilution series (plate and Dilutions)

**C1. How much each point is diluted from the one before (the "1:3")** — to settle

- Today:
  - "Dilution": the plate form field with a "1:" box, plus its hover "Dilution, 1 in".
  - "Drug X fold": generated name, labelled "Dilution".
  - "a fold": messages.
  - Shown as "1:3" in the summary.
  - Stored with the code's own "dilution factor" notation.
- Recommend **Dilution factor**, shown as 1:3, with the generated name "Drug X dilution factor". It
  is the lab's usual term for a serial step and frees plain "Dilution" for A antibodies (D2).
- **Pick (2026-11-20): Dil. factor**, shown 1:3, with the generated name "Drug X dil. factor".
  - "Dilution factor" and "DF" are accepted when typed.
  - "Fold" is deliberately not accepted. Per the 2026-11-17 decision, a typed "Fold" keeps "2×",
    an increase.
  - The generated "Drug X fold" in older files is renamed on open.

**C2. How strong the prep is compared with the well (the "4×")** — to settle

- Today:
  - "Factor": Dilutions label.
  - "Working 4×": strip.
  - "Drug X working strength": generated.
  - "Stain mix working": the recipe math's generated name for the same idea on a mix.
- Recommend **Working strength** everywhere, shown as "4×".
- **Pick (2026-11-20): Working strength**, shown "4×".
  - It is a multiple, unlike Working conc., which is an amount (final × strength).
  - "Working dilution" was rejected: a dilution is a 1:N going weaker, and this is a × going
    stronger.
  - "Factor" (the Dilutions label) and "Working" (the strip row) become this word.
  - To check at build time: the recipe math's "Working dilution" and "<mix> working" for mixes made
    from an X stock. If it is the same idea, it takes this word.

**C3. The series' first, strongest amount** — to settle

- Today:
  - "Start": plate form.
  - "starting amount": a Dilutions message.
  - "Top dose" / "Top dilution": generated names and labels.
  - "top well": Dilutions messages.
- Recommend **Top dose** (and "Top dilution" when it is a 1:N), used on the form too. Messages say
  "top dose", not "starting amount" or "top well".
- **Pick (2026-11-20): Top conc. for a concentration series, Top dil. for a 1:N.** Evan: "dose …
  might imply a drug".
  - Used on the form (replacing "Start") and in messages.
  - "Top dose", "Top dilution" and "Start" are accepted.
  - The legend key becomes "stronger color = higher conc." / "higher dil.", following the series.
  - A series of cells, volume or ratio uses **Top amount** (agreed 2026-11-20).

**C4. How many points a series has** — to settle

- Today: "Points" (generated name and label), "12 steps: 10 µM, 3.33 µM…" (plate form preview), and
  "Wells 2–4" (Dilutions notes).
- Recommend **Points** everywhere ("12 points: …"). "Step" stays for Procedure steps only.
- **Pick (2026-11-20): Points** for the count. The form preview reads "12 points: …". In the
  Dilutions notes the first prep is **Top** and the rest are **Then 2–4**, which name the position
  and not the container (see C6). "Step" means a Procedure step only.
  - Build: the Dilutions strip labels its squares **Top, 2, 3, 4…**, so the notes point at
    marks you can see. Today the squares are unnumbered (`WorkbenchDilutionStripPreview.tsx`).
    Evan: "as long as it's clear what the user is looking at when they need to fill things out".

**C5. Wells holding the same point** — to settle

- Today: "wells per point" (generated) and "Replicates" (Dilutions strip row).
- Recommend **Replicates**, with the generated name "Drug X replicates".
- **Pick (2026-11-20): Replicates** ("Drug X replicates"). "Reps" and "wells per point" are
  accepted.

**C6. Volume made in the series' first prep well** — to settle

- Today: "Drug X top well volume", which reads like "Well volume" (A3) but is a different thing.
- Recommend **Top point volume**, following C3 and C4.
- **Pick (2026-11-20): Top vol.** ("Drug X top vol."). "Top well vol." was first chosen, then
  dropped because a prep may be made in tubes or a strip, not wells.
  - Rule: **Top [thing]** for the strongest point, so Top conc. / Top dil. / Top amount / Top vol.
    (Evan: "consistency is important here").
  - "Top well volume" is accepted.

**C7. What a series dilutes** — keep

- "treatment" in Dilutions ("Unnamed treatment") and "Treatments" in the plate legend agree.
  Record **Treatment**.

**C8. Round to, Diluent, Stock, Stock concentration, Molecular weight** — keep

- Each has one word already.
- The rounding errors in Calculations say "the step" ("The step has to be a volume too"). Recommend
  saying **round to** there ("Give what to round to: round up(Mix, 5 mL)"), so "step" stays
  Procedure-only.

---

## D. Antibodies and the Flow panel

**D1. How much antibody goes into each test** — to settle

- Today:
  - "Amount": the Materials column, preview and labels.
  - "Dilution" / "Per test": Values and generated names, chosen by the unit.
  - "Dilution factor": the Flow panel column, with the generated name "CD3 BV421 dilution factor".
  - Other antibody types (Secondary, Dye, Multimer) have a field literally named "Dilution".
- Recommend: the word follows the unit everywhere, **Dilution** for a 1:N and **Per test** for µL.
  The Materials header says "Dilution" and a µL row reads "2 µL per test". The Flow panel column
  says "Dilution". (C1 keeps "Dilution factor" for series only.)
- **Pick (2026-11-20): Dil. for a 1:N ("CD3 BV421 dil. 1:200"), Per test for µL ("CD3 BV421 per
  test 5 µL").**
  - The Materials heading ("Amount") and the Flow panel column ("Dilution factor") both say "Dil.".
  - "Amount", "Dilution", "Dilution factor" and "Titer" are accepted.
  - In W114 step 3 the Flow panel reads and edits this same Materials number.

**D2. "Per test" vs "per well" for antibodies** — to settle

- Today: the Materials reader turns "µL/well", "µL/test", "µL/sample" and "µL/10^6 cells" all
  into "Per test". The Flow math then treats one test as one well.
- Recommend keeping **Per test** (the vendor's word), with the hover "one test is one well's stain".
- **Pick (2026-11-20): Per test**, with the hover "one test = one well's stain". "µL/well",
  "µL/sample" and "µL/10^6 cells" are read as Per test.

**D3. One row on the Flow panel (an antibody or dye on a detector)** — to settle

- Today: "stain" on a conventional cytometer ("Add a stain on VL1", "this stain") but "dye" on a
  spectral one ("Add a dye on Violet", "22 dyes on 5 lasers").
- Recommend **Stain** on both.
- **Pick (2026-11-20, revised): marker for the row, dye for the light**, the same on both kinds of
  cytometer. "Dye" was picked first, then refined on Evan's point that "it's a marker that you care
  about with a specific dye for that detector".
  - **Marker** (what you measure: CD3, Viability) is used when adding a row: "Add a marker on VL1".
  - Messages name a row by marker + dye: "CD3 BV421 and CD8 BV421 are on the same detector",
    "CD3 BV421 works best on VL6".
  - **Fluor** (what the detector sees: BV421) is used for light facts: "22 fluors on 5 lasers",
    "BV785 isn't excited by the blue laser", "peaks near 601 nm". It was "dye" until D5.
  - "Stain" no longer means a panel row. It is left for the stain step, the Stain side and
    controls.

**D4. The stain step a row belongs to (Viability, Surface, ICS)** — to settle

- Today: the column is headed just "Stain", next to rows that are also called stains. The
  placeholder already says "Stain step".
- Recommend the heading **Stain step**.
- **Pick (2026-11-20, revised with D6): heading Cocktail**, with values Surface / ICS / Viability.
  The hover reads "Where the marker is, and the cocktail it goes in" and an empty box reads "e.g.
  Surface".
  - The column does double duty. Evan: "WHERE the marker is located on the cell … and which
    cocktail does it go in".
  - "Stain" was picked first, then dropped once D6 gave "stain" to what a well gets.
  - "Stain step", "Staining", "Stain type" and "Location" were also dropped; Viability is not a
    location.
- **Revised (2026-11-22, code-names review): heading Staining.** Evan: "the thing you're
  describing is the stain. Surface stain or intracellular stain … the cocktail is the physical
  mixture". **Cocktail** now means only the tube made for one staining ("Full stain Surface
  cocktail"); the hover and placeholder are reworded to match.

**D5. What an antibody is conjugated to** — to settle

- Today:
  - "Conjugate": the Materials field.
  - "Fluorochrome": the Flow panel column.
  - "dye": the picker and "New dye" dialog.
  - "fluorochrome": the Materials reader's reason text.
  - HRP, Biotin and AP are valid values and are not fluorochromes.
- Recommend **Conjugate** everywhere, since it is true of every value. The New dye dialog becomes
  "New conjugate".
- **Pick (2026-11-20): two ideas, two words.**
  - **Conjugate** is what a reagent carries (CD19-Fc → Biotin, SA → PE). It is the Materials field
    on every card.
  - **Fluor** is what the detector reads for a marker (CD19 → PE, via SA-PE). It is the Flow panel
    column.
  - For a direct conjugate (CD3 BV421) the two are the same. Evan: "I'd have a CD19-Fc-Biotin, but
    then I'd have the SA-PE secondary as the Fluor itself in PE".
  - "Fluor" also replaces "dye" in the light facts from D3: "22 fluors on 5 lasers", "BV785 isn't
    excited by the blue laser". The dialog becomes "New fluor".
  - "Fluorochrome", "Dye" and "Color" are accepted. "Fluorochrome" is no longer shown.
  - **Gap found (a feature, not a word):** the Flow panel reads a row's fluor from that material's
    own Conjugate (`utils/flowCytometry/flowCytometryPanel.ts:67`). A CD19-Fc-Biotin row shows Biotin and
    can't be placed, and there is no way to say "detected by SA-PE". The panel needs a marker to be
    detectable through a secondary, taking its fluor from the secondary. To be added to the plan
    as a Flow panel item.

**D6. Mix vs cocktail** — to settle

- Today:
  - On the Flow panel, a mix is a control or condition (Full stain, FMO CD3) and a cocktail is a
    mix for one stain step (what is actually pipetted). The tip uses both words.
  - Values says "+ Mix or cocktail" for its own mix rows.
- Recommend: **Mix** is anything made by combining materials (Values mix rows, Flow panel mixes).
  **Cocktail** is only the Flow panel's per-step antibody cocktail. The Values button becomes
  "+ Mix".
- **Pick (2026-11-20): Stain for what a well gets, Cocktail for a tube made and added at one
  point.** Evan: "I would normally just say these wells get the full stain, then … prepare cocktails
  of each and add each cocktail at the appropriate step".
  - **Stain:** Full stain, Single stain CD3, FMO CD3, Unstained. The Flow panel's "Mixes" section
    becomes **Stains**. The plate's Stain side reads "Pick a stain for the selected wells".
  - **Cocktail:** each stain's Surface, ICS and Viability cocktails (e.g. a viability + Fc block
    cocktail), named "Full stain Surface cocktail".
  - **Mix** stays only for Values rows that really are combined in one go (medium + IL-2), and
    the Values button becomes "+ Mix". Evan floated **Mixture** instead; that is to discuss
    separately.
  - Calculations names follow: "Full stain Surface cocktail wells", and "… antibodies" is checked
    at build time.

**D7. Wells with no stain mix** — to settle

- Today: "Not stained" (legend button), "not stained" (hover), "every unstained well in use"
  (hover). "Unstained" is also a control mix name.
- Recommend **No mix** for wells with none, leaving "Unstained" to the control.
- **Pick (2026-11-20): No stain assigned**, in the legend row ("No stain assigned · 4") and on a
  well's hover. It reads as a to-do, apart from the Unstained control. It replaces "Not stained",
  "not stained" and "unstained well".

**D8. Detector / Peak detector / laser names** — keep

- "Detector" (conventional) and "Peak detector" (spectral) are true to each instrument.
- "Channel" is never used. Record **Detector**.

---

## E. Cells and donors

**E1. Cells per mL in a suspension** — to settle

- Today:
  - "Count" (unit cells/mL) on Cell line and Primary cells. The cell math never reads it.
  - "stock concentration in cells/mL": what the cell math actually reads.
  - "plating concentration": generated.
- Recommend **Cell concentration** for the field, read by the cell math. "Plating concentration"
  stays for the worked-out line.
- **Pick (2026-11-20): Cell conc.** on Cell line and Primary cells (replacing "Count"), and the
  cell math reads it.
  - "Count", "Cell concentration" and a cells/mL "Stock concentration" are accepted.
  - The worked-out line is "Raji plating conc.".

**E2. Counts of cells** — keep

- Record "Total count", "Live count", "Cells per vial" and "Viability (%)".
- The hover "Worked out from the other two counts" becomes "Worked out from Total count and
  Viability", since Viability is a %, not a count.

**E3. The donor list** — keep

- "Donors" (renamable) stays.
- Every message and label that names the list reads its current name. Today "Donor name" and
  "Needs a live count in Donors" are fixed text and go stale after a rename.

**E4. Who supplied something** — to settle

- Today: "Vendor or source" (Materials), "Manufacturer" (Equipment), "Source" (donors, mapped from
  the vendor) and "Source" (Software).
- Recommend **Vendor** for anything bought (materials and donors), **Manufacturer** for
  instruments, and **Source** for software and data only.
- **Pick (2026-11-20): Source** for materials, donor cells, software and data ("Vendor or source"
  → "Source"). Evan: "sometimes they're not bought … they're just sourced from another lab".
  **Manufacturer** for instruments, which is a different idea (who made it). "Vendor" and
  "Supplier" are accepted. Vendor name suggestions still appear in Source.

---

## F. Wells, plates, cards and pages

**F1. Wells counted** — keep

- Two different counts, each with one word: **Wells used** for the whole map's total and **Wells**
  for one thing's wells ("Raji wells").
- Shelves say "Tubes used" and "Flasks used", which is right.

**F2. One position** — to settle

- Today: well (most places), "spot" ("3 filled spots are no longer on this map"), "samples"
  ("Pool 3 samples"), "cells" ("already hold cells on the Stain side"), and "vessel" when kinds
  are mixed.
- About fifteen messages say "wells" or "plate" even on a tubes-and-flasks tab.
- Recommend **well** on plates and the vessel's own noun on shelves (tube, flask, dish), in every
  message. "Pool 3 samples" becomes "Pool 3 wells".
- **Pick (2026-11-20): two ideas.**
  - **Well** is the position. On a shelf tab it is the container's noun (tube, flask, dish), in
    every message, so "Put these tubes on" and "Every tube:" on a shelf.
  - **Sample** is what's in a position. "Pool 3 samples" stays.
  - "Spot(s)" and "cells" in messages become well or sample, depending on the sentence.
  - The A1 suffix follows too: "40 µL/tube" on a shelf.
- **Revised (2026-11-22, code-names review):** where kinds are mixed, the word is **sample**, not
  "position": "4 samples will be cleared", "Raji samples", "40 µL/sample", and the well editor's
  header "3 selected". Evan: "position really doesn't make any sense … /sample really does".

**F3. The card that holds plates and tubes** — to settle

- Today: the card is "Vessel map". Messages say "plate map" ("Read from the plate map", "Changing
  it here changes the plate map", "Name this treatment on the plate map", "Empty plate map").
- Recommend messages say **Vessel map**, the card's own name.
- **Pick (2026-11-20): the card names itself from what it holds, and "vessel" goes.** Evan: "I
  really dislike the word 'vessel' … tube/flasks aren't really a map".
  - The title is **Plate map** with only plates, the kinds held with only shelves ("Tubes &
    flasks"), and "Plates & tubes" when mixed. A renamed title wins.
  - Messages name the card by its current title.
  - The add list entry is **Plate map**, since a new card starts with a plate.
  - The generic word is **Labware**: "Add labware", "Find labware", "Add or remove labware".
  - Mixed counts are listed per kind ("Wells used · Tubes used"), so there is no "Vessels used".
  - "Vessel map" is gone from everything shown. Internal code names are unaffected.

**F4. The tab holding loose tubes and flasks** — to settle

- Today: default name "Group 1", hover "Vessel group name", kind label "Flasks & tubes", and the
  picker says the vessels "share one" tab.
- Recommend the default name be the kind label ("Flasks & tubes") and the hover "Tab name". "Group"
  is dropped.
- **Pick (2026-11-20):** the default name comes from what the tab holds ("Tubes & flasks"),
  matching F3. The rename box's screen-reader label is "Tab name" for plate and shelf tabs alike.
  "Group" is dropped.

**F5. The things on the board** — to settle

- Today:
  - "block": the left rail ("Add a block"), "Remove block", "Expand block", "Nothing on this page
    yet. Add a block from the left."
  - "card": the Vessel map's "Copy to a new card", "this card showed", "the Dilutions card".
  - "view": "Remove this view of …".
  - "tile": "A freehand whiteboard tile".
- Recommend **card** everywhere (the word used in planning). A card shown from another page is
  "a copy of the Vessel map card".
- **Pick (2026-11-20): card everywhere**: "Add a card", "Remove card", "Expand card", "Add a card
  from the left".
  - "Block", "view" and "tile" are no longer shown.
  - A card showing another page's plates is just a card. Its removal message reads "Remove this
    card? Its plates stay on Setup." It is not called a copy, since it shows the same plates rather
    than duplicating them.

**F6. Page vs tab** — to settle

- Today: board pages are "Page" and "Delete page", but their arrows say "Previous tab" / "Next tab".
  Tabs inside cards (plates, Dilutions) are tabs.
- Recommend: **page** for board pages (arrows "Previous page" / "Next page") and **tab** inside a
  card.
- **Pick (2026-11-20): page** for board pages ("Previous page" / "Next page"), **tab** only inside
  a card (plate tabs, Dilutions tabs).
  - The shared tab strip takes its arrow words from where it sits.

**F7. Merge replicates vs Pool replicates** — to settle

- Two different features with nearly the same name. "Merge replicates" draws replicate wells as one
  on the map. "Pool replicates" combines their cells on the Stain side. They also use swapped icons.
- Recommend renaming the display toggle **Show replicates as one**, keeping "Pool" for combining
  cells.
- **Pick (2026-11-20): Show replicates as one** for the display toggle, with the hover "Show
  replicates as one: on / off". There is no separate "unmerge" word, since it's a toggle.
  - **Pool samples / Pool replicates / Unpool** stay for actually combining samples.
  - The swapped icons are fixed too: the toggle and Pool must not share a look.

**F8. Copy vs Duplicate** — to settle

- Today: the plate copy button's hover says "Copy this plate" and its label "Duplicate". The menu
  says "Copy as a new tab" / "Copy to a new card". "Copy" (Ctrl+C) is the clipboard.
- Recommend **Duplicate** for making a second plate or card ("Duplicate as a new tab", "Duplicate to
  a new card"), leaving **Copy** to the clipboard. The new plate's name ends in " copy".
- **Pick (2026-11-20): Duplicate** for a second plate or card ("Duplicate this plate", "Duplicate as
  a new tab", "Duplicate to a new card"). **Copy** is clipboard only. A duplicated plate is named
  "Plate 1 copy".

---

## G. Procedure

**G1. Step levels** — to settle

- Today: the buttons say "Move in" / "Move out", the tip says "indents, outdents", the menu says
  "Add sub-step", and "Move up" / "Move down" / "Drag to move" reorder.
- Recommend **Move in / Move out** (the tip reworded to match), keeping "sub-step" for a step that
  sits under another.
- **Pick (2026-11-20): Move in / Move out** for levels. The tip becomes "Tab moves in, Shift+Tab
  moves out". **Sub-step** is a step under another. Move up / Move down and drag reorder.

**G2. Adding steps** — keep

- The buttons are **Add step** / **Add section**, drawn per S7 (blue plus icon + words). Menus say
  "Add step" / "Add sub-step" / "Add section above/below". "Add 3 Steps" goes to sentence case
  (style rule S1).

**G3. Condition names read from steps** — to settle

- Today the generated names mix verbs and nouns: "Spin time", "Wash time", "Thaw temperature" next
  to "Incubation time", "Fixation time", "Staining time". Both × g and rpm become "speed".
- Recommend nouns where the lab says them ("Incubation", "Fixation", "Lysis", "Staining",
  "Blocking") and the verb where that is the lab word ("Spin", "Wash", "Thaw"), recorded once per
  verb. "Speed" stays, with × g or rpm as its unit.
- **Pick (2026-11-20): one fixed word per verb, the word the lab says.**
  - The words: **Centrifuge** (from centrifuge / spin / pellet; Evan prefers it to "Spin"),
    Incubation, Blocking, Staining, Wash, Thaw, Warming, Wait, Shaking, Vortex, Fixation, Lysis.
  - New: Perm (perm / permeabilize), Coating, Stimulation (shown **Stim.** per S11), Rest,
    Culture, Development, Digestion, Sonication, Treatment.
  - Names read "Centrifuge time / speed / temp.". "Speed" is used for both × g and rpm, with the
    unit saying which.
  - The "Spin" common step is renamed **Centrifuge**.
  - At build time the verb list is widened with the usual bench verbs (pull, stimulate, rest,
    culture, develop, digest, …). Evan: "sometimes I say 'Pulled' supes". A verb not on the list
    still works as plain text.

**G4. Room temperature, time units** — to settle

- Today "room temperature" is shown as "RT", but the blank choices offer "room temperature" and
  the paste example spells out "1 hour" / "2 hours", while choices use "1 h".
- Recommend showing **RT** and **h / min / s**, both accepted as typed in any spelling.
- **Pick (2026-11-20): RT and h / min / s** everywhere, including the fill-in choices and the paste
  example. Any spelling is accepted when typed ("room temperature", "hours", "hrs").

---

## H. Board words

**H1. Protocol, experiment, assay, run** — keep, defined

- **Protocol**: the file and plan.
- **Experiment**: what it is run on ("Whole experiment", "Everything the experiment uses").
- **Assay dates**: when it runs.
- **Run**: its number.
- Each is used for one thing today.

**H2. Calculation vs formula** — keep, defined

- A **calculation** is a named result. Its **formula** is the math typed for it.
- "isn't a value or formula on this board" becomes "isn't a value or calculation on this board",
  since a formula has no name to refer to.

**H3. "Name"** — keep, defined

- A **name** is anything the math or steps can use (values, materials, calculations). "No names on
  the board yet" and "+ Name or operator" already mean this.

**H4. Removing things** — to settle

- Today:
  - "Remove": steps, cards, values, mixes, lines, tabs.
  - "Delete": pages only.
  - "Clear": wells, plus "will be cleared" when vessels are removed.
  - "Drop": Materials, which stays restorable in Dropped.
  - "Ignore": suggestions.
  - "Take it out of this mix", "Take it off the panel", "Leave this one out".
  - "Discard": unsaved changes.
- Recommend:
  - **Remove** for anything taken off the board, pages included.
  - **Clear** only for emptying wells.
  - **Drop** for Materials (it means "set aside, restorable").
  - **Ignore** for suggestions.
  - **Discard** for unsaved changes.
  - "Take out" and "Leave out" become "Remove from …".
- **Pick (2026-11-20):**
  - **Remove** for nearly everything, pages included ("like we do all over the app").
  - **Clear** for emptying wells or fields.
  - **Ignore** for suggestions.
  - **Discard** for unsaved changes.
  - **Remove from…** replaces "Take it out of this mix", "Take it off the panel" and "Leave this
    one out".
  - Materials' "Drop" was "not really intuitive". It is a separate ability (keep a material's
    details but set it aside for this protocol, restorable), so it becomes **Set aside**, with its
    section "Set aside" and **Restore**. Remove stays the real delete, with Undo.

**H5. A value that's gone from Materials** — to settle

- Today: "dropped", "no longer in Materials", "No longer in Materials", "Dropped from Materials".
  These are really two states: dropped (restorable) and removed.
- Recommend **Dropped from Materials** and **Removed from Materials**, one each.
- **Pick (2026-11-20): Set aside in Materials** (restorable) and **Removed from Materials**
  (deleted), one phrase per state, following H4.

**H6. Name already used** — keep

- Three messages ("· name already used", "· Raji is already used", "Another value or formula
  already has this name") become one: **"Raji is already used"**.

**H7. Where a value is used** — keep

- Two hover formats ("Used in Step 3 · 2 calculations" and "Raji: used in …") become one, the
  first, with "unused" as the badge.

---

## S. House style (one choice each, applied everywhere)

All settled 2026-11-20. Evan changed S3 (straight quotes), S7 (blue plus icon + "Add …") and S8
(the unit spacing split), and added dil. and stim. to S11. The rest were approved as listed.

- **S1. Sentence case** for buttons, labels and names: "Add material", "Full stain", "Single stain",
  "Empty mix", "Add 3 steps", "Biological material". Card titles stay shown in capitals by the
  display, not stored in capitals.
  - **Settled 2026-11-20.** Evan: "I want consistency". The rest of Odysseus uses sentence case.
  - Generated names keep the material's own capitals plus the term in lowercase ("Raji vol./well").
  - The Title Case Evan typed in picks ("Total Well Vol", "Extra (Dead Vol.)") is recorded in
    sentence case.
- **S2. Stored defaults in normal case** ("Whole experiment", "Setup", "Page 2"). The display
  capitalises them, so a rename isn't stuck in capitals.
- **S3. Straight quotes and apostrophes** everywhere ("Total well vol.", isn't). Settled
  2026-11-20; Evan doesn't love curly quotes. The curly ones in today's messages are converted.
- **S4. Dashes**: "—" for an empty read-only field, "–" for ranges (A1–B3), "−" for minus. "?" only
  for a calculation with no answer yet.
- **S5. Periods**: whole sentences end with one, fragments (labels, chips, short hovers) don't.
- **S6. Plurals** always handled, so "1 point" and "1 detector", never "1 points" or "1 wells".
- **S7. Add buttons (Evan 2026-11-20): a plus icon in the app's blue icon color, followed by "Add
  <thing>"** ("Add step", "Add section", "Add field", "Add line", "Add donors", "Add mix", "Add
  material"), for complete clarity.
  - The typed "+ " prefix goes everywhere, and bar buttons follow the same pattern.
  - No short exceptions in tight spots: "Add field" and "Add line" still fit.
  - Use the existing icon-blue token.
- **S8. Units (settled 2026-11-20): symbols that attach to the number get no space; units read as
  a word keep one.**
  - No space: 10%, 4×, 1:200, 37°C, 300×g.
  - Space: 10 µL, 1.5 mL, 2 µg, 10 µM, 5 ng/mL, 4.00E+4 cells, 1E+6 cells/mL, 5 min, 1 h,
    1,500 rpm, 450 nm, 150 kDa.
  - "/well" attaches to its unit: 40 µL/well.
  - Fold is never shown as "X".
  - Display only: any spacing is accepted when typed. Evan writes "10uL" himself sometimes.
- **S9. A value named in a message** is quoted the same way every time: "Vol./well".
- **S10. A card named in a message** uses its title exactly (Materials, Values, Vessel map,
  Dilutions, Flow panel, Calculations, Procedure).
- **S11. Abbreviations** (Evan 2026-11-20: "where applicable I think abbr work better … so words
  don't cause so much cluttering").
  - Labels, column headings, generated names and messages all use the same short form.
  - The hover gives the full meaning once.
  - The full word is always accepted as typed.
  - **Settled 2026-11-20:**
    - vol. (volume)
    - conc. (concentration)
    - dil. (dilution)
    - stim. (stimulation)
    - MW (molecular weight)
    - temp. (temperature)
    - RT (room temperature)
    - h / min / s
    - # (number, as in "Catalog #", "Lot #")
    - Ab (antibody), only in tight spots such as headings
  - Words that are already short stay whole (Extra, Stock, Diluent, Points).
  - G3's "Stimulation" is shown as **Stim.** ("Stim. time").

---

## Bugs found by the sweep (fixed alongside, not picks)

1. The vessel picker labels a count "Number of 10 cm dishs", from a bare `+s`
   (`WorkbenchLabwarePickerPanel.tsx:126`).
2. Values says "Its 1 wells keep…", and elsewhere the UI says "1 points", "1 detectors" and "on 1
   lasers". "Two stains" is fixed text even when three share a detector.
3. Renaming Whole experiment in Values doesn't reach Calculations or the insert list, which still
   say WHOLE EXPERIMENT (three separate copies of the title).
4. A renamed Donors list leaves "Donor name" and "Needs … in Donors" saying the old name.
5. Multi-laser dyes are guessed with the Laser "Violet 405 or UV 355", which isn't a choice, so
   it's dropped. "Green 532" is a Laser choice but has no colour name and can't be ticked in New
   dye.
6. A pasted 1536-well plate is guessed as "1536-well", which isn't a Format choice, so it's dropped.
7. Renaming a Materials field changes its name in Values but not on the Materials card itself.
8. The Materials "Count" (cells/mL) is never read by the cell math (see E1).
9. Procedure readings make "Concentration per well" (see A7).
10. The vessel picker's search says "Find a plate, flask or tube", leaving out dishes.
11. Dead text and data: the Calculations "Add: Total volume" placeholder can never show, the
    vessel catalog's unused `many` field, and the Buffer copies of "complete medium" that Medium
    always wins.
12. The conjugate picker knows HRP, Biotin and AP, but the Materials reader also accepts
    "horseradish peroxidase", "biotinylated" and "DIG", which the picker then can't show.
