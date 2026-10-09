# Workbench: Materials Catalog

Draft 2, 2026-10-07. The starting list of groups, item types and fields for the builder's Materials
block (plan doc, _The builder_). Nothing here is forced on a scientist: groups appear only when used,
and every field except the name is optional. The point is that the right fields are already
suggested, so nobody has to think of them.

## How it behaves

- **One Materials block, grouped sections.** A material is added by typing its name; the group and
  type are guessed (_Adding a material_ below). Groups with nothing in them do not show.
- **Every physical material has the same core:** name, type, vendor or source, catalog # or
  identifier, lot, expiry, storage, hazard or biosafety, notes. Lot sits up front because it matters
  most for repeating an experiment. Equipment and software have their own core instead (no lot or expiry).
- **Each type suggests its own extra fields.** They appear in the group's "+ Field" list, so "Clone" or "Fluorochrome" is one click from
  becoming a column. The scientist turns on what they care about and ignores the rest.
- **Some values belong to the lot** (marked _lot_ below): an antibody's concentration,
  beads per µL, an enzyme's activity, a virus titer, a matrix's protein concentration. They change
  when the lot changes and stay the same across experiments that use the same lot. So they are remembered by
  lot number: type a lot seen before and its values fill in. For lab members the lab's inventory
  already holds lots, so these come from there.
- **Numbers feed formulas.** Any number field becomes a name a formula can use (_HeLa count_,
  _Capture Ab dilution_).
- **Custom everything.** Any group, type or field can be added; a custom type can be saved for reuse.

The default groups follow the Key Resources Table that Cell Press and other journals require in
methods sections (antibodies, bacterial and virus strains, biological samples, chemicals, critical
commercial assays, cell lines, organisms, oligonucleotides, recombinant DNA, software, deposited
data), plus the bench groups that table leaves out (media and buffers, supplies, equipment). The Materials block can then export a ready-made Key
Resources Table. _RRID_ below is the Research Resource Identifier those tables ask for.

## Adding a material

Protocols are built from a paper, what is on the shelf, and a preferred vendor's catalog, and a big
experiment can have 30 or more materials. Classifying each one by hand is the tedious part, so the
scientist never has to: type anything, press Enter, and it lands in the right group with what it
could read already filled in.

- **One line, any material.** `CD4 BV421`, `96-well V-bottom plate`, `DMEM high glucose`,
  `HeLa`, `10 mM ATP`, `ACGTTGCAAGGTCC`, `FlowJo 10.9`, `GSE12345`. Each becomes a row in its group
  with the fields it contained (marker and color; wells and bottom; concentration; sequence; version).
- **The guess is a picker.** While typing, the guessed type shows under the box as a dropdown, so a
  scientist who knows it is a cell line picks Cell line before pressing Enter. After adding, the
  Type cell on the row changes it the same way. Either correction is remembered, so the same name is
  never wrong twice for that scientist or lab.
- **Nothing recognized goes to Unsorted.** It is still added; the scientist picks a group once if
  they want the suggested fields.
- **Paste a list.** A materials list or Key Resources Table copied from a paper runs through the same
  guessing, shown as a preview to fix before anything is added (same pattern as pasting steps, W88).
- **Works offline.** The word list ships with the app; nothing is looked up while typing.

### Where guesses come from, in order

1. **The lab's own.** Inventory items, materials in earlier protocols, and past corrections. These
   win, because they are what this lab actually uses and calls things.
2. **Reference lists.** Names and synonyms pulled from open databases into one list that ships with
   the app (sources below). This is what makes a first-time entry guess well.
3. **Shape rules.** What a word looks like: a DNA sequence is an oligo, "N-well" is a plate, "kit" is
   a kit, "buffer" or "solution" is a buffer, `GSE`/`SRR`/PDB IDs are datasets, "mouse anti-human"
   is an antibody, amounts and units ("10 mM", "1:200", "5 µL/test") fill a field.

A model-assisted guess for anything still unsorted is a possible later upgrade, as with pasted steps.

### Reference sources

Licenses checked 2026-10-08. Attribution goes on a credits page. Each list is trimmed to names and
synonyms only.

| Group                     | Source                                         | License                                        | Status     |
| ------------------------- | ---------------------------------------------- | ---------------------------------------------- | ---------- |
| Biological Material       | Cellosaurus (cell lines)                       | CC BY 4.0                                      | Confirmed  |
| Biological Material       | NCBI Taxonomy (species, strains)               | US government, public                          | To confirm |
| Biological Material       | MGI / IMSR (mouse strains), ICTV (viruses)     | Not checked                                    | To check   |
| Antibodies & Stains       | FPbase (fluorochromes, fluorescent proteins)   | Free of copyright; credit the data authors     | Confirmed  |
| Antibodies & Stains       | HGNC gene symbols, HCDM CD marker list         | HGNC believed CC0; HCDM not checked            | To confirm |
| Antibodies & Stains       | Antibody Registry (RRIDs)                      | Conflicting: CC0 or CC BY                      | To confirm |
| Chemicals & Proteins      | ChEBI (chemicals)                              | CC BY 4.0                                      | Confirmed  |
| Chemicals & Proteins      | UniProt (proteins, cytokines)                  | Believed CC BY 4.0                             | To confirm |
| Chemicals & Proteins      | Guide to Pharmacology (drugs, inhibitors)      | Possibly CC BY-SA 4.0; share-alike may not fit | To confirm |
| Chemicals & Proteins      | PubChem                                        | Varies by contributing source                  | Avoid      |
| Molecular Biology         | HGNC (target genes); sequence shape rule       | As above                                       | To confirm |
| Equipment, software, data | SciCrunch Registry (RRID `SCR_`)               | Not stated                                     | To check   |
| Media, kits, supplies     | No open source; a hand-curated list of staples | Ours                                           | To write   |

## Default groups

| #   | Group                       | Covers                                                           |
| --- | --------------------------- | ---------------------------------------------------------------- |
| 1   | Biological Material         | Cells, tissues, fluids, organisms, microbes, viruses, samples    |
| 2   | Antibodies & Stains         | Antibodies, isotype controls, dyes, stains, beads                |
| 3   | Chemicals & Proteins        | Compounds, drugs, recombinant proteins, enzymes, standards       |
| 4   | Media, Buffers, & Solutions | Commercial media, prepared buffers, supplements, stock solutions |
| 5   | Kits & Assays               | Commercial kits                                                  |
| 6   | Molecular Biology           | Oligos, probes, plasmids, guides, master mixes, ladders          |
| 7   | Supplies                    | Plates, tubes, flasks, tips, filters, slides                     |
| 8   | Equipment                   | Instruments and their settings                                   |
| 9   | Software & Data             | Acquisition and analysis software, templates, deposited datasets |

## Types and suggested fields

Core fields (every physical type): name, type, vendor or source, catalog # or identifier, **lot**, expiry, storage, hazard or biosafety, notes. _(lot)_ marks a value remembered by lot
number.

### 1. Biological Material

| Type                | Suggested fields                                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cell line           | species, tissue of origin, RRID, genetic modification, medium, culture conditions, authentication date, mycoplasma test date, passage, count, viability |
| Primary cells       | species, donor ID, tissue, isolation method, collection date, freeze date, count, viability, consent or IRB reference                                   |
| 3D culture          | species, source line or donor, matrix, passage, days in culture                                                                                         |
| Tissue              | species, donor or animal ID, tissue, collection date, preservation (fresh, frozen, FFPE), section thickness, consent or IRB reference                   |
| Body fluid          | fluid (serum, plasma, whole blood, CSF, urine, other), donor ID, anticoagulant, collection date, freeze-thaw count, dilution, consent or IRB reference  |
| Organism            | species, strain, sex, age, genotype, source, animal or cohort ID, protocol number                                                                       |
| Microbial strain    | species, strain, genotype, antibiotic resistance, stock ID, OD at use                                                                                   |
| Virus or vector     | virus type, construct, serotype or pseudotype, titer (lot), biosafety level. MOI is a value the scientist sets, not a property of the virus             |
| Nucleic acid sample | DNA or RNA, source sample, concentration, A260/280, RIN                                                                                                 |
| Protein sample      | source sample, lysis buffer, concentration                                                                                                              |

### 2. Antibodies & Stains

| Type                                                                                  | Suggested fields                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Antibody                                                                              | target, clone, host species, reactivity, isotype, conjugate (blank means purified; biotin counts), laser (detector depends on the instrument), concentration (lot), amount (µL per test, dilution, or concentration), application, RRID |
| Secondary reagent (secondary antibodies, streptavidin and other detection conjugates) | host species, target species and isotype, conjugate, cross-adsorbed, dilution                                                                                                                                                           |
| Isotype control                                                                       | isotype, host species, conjugate, concentration, matched antibody                                                                                                                                                                       |
| Dye                                                                                   | target (viability, DNA, membrane, mitochondria, other), fixable, laser and channel, excitation and emission, concentration or dilution                                                                                                  |
| Multimer                                                                              | specificity (peptide and MHC allele), conjugate, dilution                                                                                                                                                                               |
| Fc block                                                                              | species, amount                                                                                                                                                                                                                         |
| Beads                                                                                 | purpose (compensation, counting, calibration, stimulation), beads per µL (lot)                                                                                                                                                          |

### 3. Chemicals & Proteins

| Type                          | Suggested fields                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------- |
| Chemical                      | CAS number, molecular weight, formula, purity, grade, hazard                                            |
| Drug or inhibitor             | target, CAS number, molecular weight, stock concentration, vehicle, working concentration               |
| Recombinant protein           | species, tag, expression host, carrier-free, activity (lot), stock concentration, working concentration |
| Enzyme                        | activity (lot), reaction buffer, stock concentration                                                    |
| Antibiotic or selection agent | working concentration, purpose (selection, contamination control)                                       |
| Transfection reagent          | ratio to nucleic acid, volume per well                                                                  |
| Stimulant                     | target or pathway, working concentration, duration                                                      |
| Peptide                       | sequence, modifications, purity, stock concentration                                                    |
| Standard                      | top concentration, reconstitution volume, units                                                         |
| Detection reagent             | detection (colorimetric, chemiluminescent, fluorescent), read wavelength                                |
| Solvent                       | grade, purity                                                                                           |

### 4. Media, Buffers, & Solutions

| Type              | Suggested fields                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| Medium            | base medium, glucose, glutamine, phenol red; if made here: recipe, volume made, made on, made by, sterile-filtered |
| Buffer            | strength, calcium and magnesium, pH; if made here: recipe, volume made, made on, made by, sterile-filtered         |
| Supplement        | final concentration, heat-inactivated, lot (critical for serum)                                                    |
| Stock solution    | concentration, solvent, made on, aliquot ID                                                                        |
| Fix or perm       | fixative or detergent, concentration, time                                                                         |
| Coating or matrix | matrix (Matrigel, collagen, poly-L-lysine, fibronectin), protein concentration (lot), coating concentration        |
| Mounting medium   | with or without DAPI, hardening or not                                                                             |

### 5. Kits & Assays

| Type | Suggested fields                                       |
| ---- | ------------------------------------------------------ |
| Kit  | kit version, components used, protocol version, expiry |

### 6. Molecular Biology

| Type               | Suggested fields                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------- |
| Oligo              | sequence, target gene, modifications, purification, stock concentration, Tm                  |
| Probe              | sequence, reporter and quencher, target                                                      |
| Plasmid            | backbone, insert, resistance, repository ID (e.g. Addgene), concentration, sequence verified |
| siRNA or guide RNA | target gene, sequence, concentration                                                         |
| Master mix         | chemistry, volume per reaction                                                               |
| Ladder             | size range, amount loaded                                                                    |

### 7. Supplies

| Type                | Suggested fields                                                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Plate               | format (6 to 384 wells), surface (TC-treated, high-binding, low-binding), color (clear, white, black), bottom (flat, round, V), sterile |
| Tube                | volume, material, low-binding, sterile                                                                                                  |
| Flask or dish       | size, surface, vented                                                                                                                   |
| Tips                | volume, filtered, low-retention                                                                                                         |
| Filter              | pore size, membrane, format                                                                                                             |
| Column or cartridge | chemistry, capacity                                                                                                                     |
| Slide or coverslip  | size, coating, thickness                                                                                                                |
| Gel                 | percentage, wells, chemistry (precast or poured)                                                                                        |
| Membrane            | type (PVDF, nitrocellulose), pore size                                                                                                  |

### 8. Equipment

Core: name, model, manufacturer, notes.

| Type       | Suggested fields                                                           |
| ---------- | -------------------------------------------------------------------------- |
| Instrument | asset or serial ID, location, settings, calibration date, software version |

### 9. Software & Data

Core: name, source, notes.

| Type     | Suggested fields                             |
| -------- | -------------------------------------------- |
| Software | version, settings or template file           |
| Dataset  | repository, accession number, date deposited |

## Links to the rest of the board

- **Plate types feed the vessel map.** A plate or flask in Supplies can be what the vessel map lays
  out, so its format is entered once.
- **Antibody fields feed the flow panel.** Conjugate, laser and isotype are exactly what the parked
  flow decisions (W45, W55, W60, W61) need; the flow panel block becomes a view of the antibodies.
- **Inventory.** For lab members, any material can be picked from the lab's inventory (reagents,
  supplies, equipment suites), filling vendor, catalog and lot.

## Decided

- Antibodies are their own group, as journals list them (Evan, 2026-10-07).
- One "Conjugate" field across the group, holding a fluorochrome, an enzyme or biotin, as vendors
  list it; no separate fluorochrome field (Evan, 2026-10-08).
- Any cell can be filled, even for a field the material's type does not suggest; it then gains
  that field (Evan, 2026-10-08).
- Media and buffers are typed by what they are (Medium, Buffer), not by where they came from.
  Bought is the default; a filled-in recipe marks one as made here and adds Made on
  (Evan, 2026-10-08).
- Antibodies can carry a Panel (surface, intracellular, myeloid…); a color clash is only flagged
  within one panel, and never blocks (Evan, 2026-10-08).
- A duplicate name asks Merge or Keep both; intentional duplicates (two lots, 1× and 10×) are
  normal (Evan, 2026-10-08).
- Typing aids work like a spreadsheet: a cell offers values used before in that column (plus
  known vendors, and fluorochromes for Conjugate), and Ctrl+D copies the cell above
  (Evan, 2026-10-08).
- The group is "Supplies", not "Consumables", matching the Supplies suite (Evan, 2026-10-07).
- Drop versus Remove: Drop keeps a struck-through copy in a Dropped box (restorable, still flagged in steps); Remove deletes, with Undo. Lab memory refills a known material's details and offers fields made for its type (plan W95 and W96, 2026-10-09).
- Layout: one plain-text table per group, edited cell by cell; Tab moves to the next cell. "+ Field" at the end of the header row opens a checklist of the group's suggested fields, type-specific first, with a search box; it stays open so several can be ticked, unticking hides a column, and a name not on the list becomes the scientist's own field. Remove shows on row hover (plan W84, 2026-10-08).

## Open questions

1. Other sciences (chemistry, materials, plant biology) are covered by custom groups and types for
   now. Add defaults for them only when someone needs them.

## Review notes (draft 2)

Changes after a self-review: deposited data added (the journal table has it); equipment and software
no longer get lot and expiry; values that belong to a lot are marked and remembered by lot; MOI moved
out of the virus fields (it is a choice, not a property); consent added to tissue and fluid samples;
cytokine merged into recombinant protein; added organoids, detection conjugates, antibiotics,
transfection reagents, stimulants, fixation and permeabilization buffers, coatings and matrices,
mounting media, gels and membranes; laser kept on the antibody but the detector left to the instrument.
