# Workbench: Materials Catalog

Draft 2, 2026-10-07. The starting list of groups, item types and fields for the builder's Materials
block (plan doc, _The builder_). Nothing here is forced on a scientist: groups appear only when used,
and every field except the name is optional. The point is that the right fields are already
suggested, so nobody has to think of them.

## How it behaves

- **One Materials block, grouped sections.** Adding a material asks for its group and type. Groups
  with nothing in them do not show.
- **Every physical material has the same core:** name, type, vendor or source, catalog # or
  identifier, lot, expiry, storage, hazard or biosafety, notes. Lot sits up front because it matters
  most for replicating a run. Equipment and software have their own core instead (no lot or expiry).
- **Each type suggests its own extra fields.** They appear as one-click "+ Clone", "+ Fluorochrome"
  chips on the row. The scientist turns on what they care about and ignores the rest.
- **Some fields are recorded on each run** by default: lot, expiry, passage, count, viability,
  made-on date, titer. A scientist can switch any field between "protocol" and "each run".
- **Some values belong to the lot, not the run** (marked _lot_ below): an antibody's concentration,
  beads per µL, an enzyme's activity, a virus titer, a matrix's protein concentration. They change
  when the lot changes and stay the same across runs that use the same lot. So they are remembered by
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

## Default groups

| #   | Group                     | Covers                                                           |
| --- | ------------------------- | ---------------------------------------------------------------- |
| 1   | Biological material       | Cells, tissues, fluids, organisms, microbes, viruses, samples    |
| 2   | Antibodies and stains     | Antibodies, isotype controls, dyes, stains, beads                |
| 3   | Chemicals and proteins    | Compounds, drugs, recombinant proteins, enzymes, standards       |
| 4   | Media, buffers, solutions | Commercial media, prepared buffers, supplements, stock solutions |
| 5   | Kits and assays           | Commercial kits                                                  |
| 6   | Molecular biology         | Oligos, probes, plasmids, guides, master mixes, ladders          |
| 7   | Supplies                  | Plates, tubes, flasks, tips, filters, slides                     |
| 8   | Equipment                 | Instruments and their settings                                   |
| 9   | Software and data         | Acquisition and analysis software, templates, deposited datasets |

## Types and suggested fields

Core fields (every physical type): name, type, vendor or source, catalog # or identifier, **lot**
(each run), expiry (each run), storage, hazard or biosafety, notes. _(run)_ marks a field recorded on
each run; _(lot)_ marks a value remembered by lot number.

### 1. Biological material

| Type                   | Suggested fields                                                                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cell line              | species, tissue of origin, RRID, genetic modification, medium, culture conditions, authentication date, mycoplasma test date, passage (run), count (run), viability (run) |
| Primary cells          | species, donor ID, tissue, isolation method, collection date, freeze date, count (run), viability (run), consent or IRB reference                                         |
| Organoid or 3D culture | species, source line or donor, matrix, passage (run), days in culture (run)                                                                                               |
| Tissue                 | species, donor or animal ID, tissue, collection date, preservation (fresh, frozen, FFPE), section thickness, consent or IRB reference                                     |
| Blood or body fluid    | fluid (serum, plasma, whole blood, CSF, urine, other), donor ID, anticoagulant, collection date, freeze-thaw count, dilution, consent or IRB reference                    |
| Organism               | species, strain, sex, age, genotype, source, animal or cohort ID, protocol number                                                                                         |
| Microbial strain       | species, strain, genotype, antibiotic resistance, stock ID, OD at use (run)                                                                                               |
| Virus or vector        | virus type, construct, serotype or pseudotype, titer (lot), biosafety level. MOI is a value the scientist sets, not a property of the virus                               |
| Nucleic acid sample    | DNA or RNA, source sample, concentration (run), A260/280, RIN                                                                                                             |
| Protein sample         | source sample, lysis buffer, concentration (run)                                                                                                                          |

### 2. Antibodies and stains

| Type                                      | Suggested fields                                                                                                                                                                                                                                               |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Antibody                                  | target, clone, host species, reactivity, isotype, format (purified, conjugated, biotinylated), fluorochrome or conjugate, laser (detector depends on the instrument), concentration (lot), amount (µL per test, dilution, or concentration), application, RRID |
| Secondary antibody                        | host species, target species and isotype, conjugate, cross-adsorbed, dilution                                                                                                                                                                                  |
| Streptavidin or other detection conjugate | conjugate (HRP, PE, fluorophore), dilution                                                                                                                                                                                                                     |
| Isotype control                           | isotype, host species, fluorochrome, concentration, matched antibody                                                                                                                                                                                           |
| Viability dye                             | fluorochrome, laser and channel, fixable, dilution                                                                                                                                                                                                             |
| Stain or dye                              | target (DNA, membrane, mitochondria, other), excitation and emission, concentration                                                                                                                                                                            |
| Tetramer or multimer                      | specificity (peptide and MHC allele), fluorochrome, dilution                                                                                                                                                                                                   |
| Fc block                                  | species, amount                                                                                                                                                                                                                                                |
| Beads                                     | purpose (compensation, counting, calibration, stimulation), beads per µL (lot)                                                                                                                                                                                 |

### 3. Chemicals and proteins

| Type                                           | Suggested fields                                                                                        |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Chemical                                       | CAS number, molecular weight, formula, purity, grade, hazard                                            |
| Drug or inhibitor                              | target, CAS number, molecular weight, stock concentration, vehicle, working concentration               |
| Recombinant protein, cytokine or growth factor | species, tag, expression host, carrier-free, activity (lot), stock concentration, working concentration |
| Enzyme                                         | activity (lot), reaction buffer, stock concentration                                                    |
| Antibiotic or selection agent                  | working concentration, purpose (selection, contamination control)                                       |
| Transfection reagent                           | ratio to nucleic acid, volume per well                                                                  |
| Stimulant or activator                         | target or pathway, working concentration, duration                                                      |
| Peptide                                        | sequence, modifications, purity, stock concentration                                                    |
| Standard or calibrator                         | top concentration, reconstitution volume, units                                                         |
| Substrate or detection                         | detection (colorimetric, chemiluminescent, fluorescent), read wavelength                                |
| Solvent                                        | grade, purity                                                                                           |

### 4. Media, buffers, solutions

| Type                                | Suggested fields                                                                                            |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Commercial medium                   | base medium, glucose, glutamine, phenol red                                                                 |
| Prepared buffer or solution         | recipe (components and amounts), pH, volume made, made on (run), made by, sterile-filtered, expires         |
| Supplement                          | final concentration, heat-inactivated, lot (critical for serum)                                             |
| Stock solution                      | concentration, solvent, made on (run), aliquot ID                                                           |
| Fixation or permeabilization buffer | fixative or detergent, concentration, time                                                                  |
| Coating or matrix                   | matrix (Matrigel, collagen, poly-L-lysine, fibronectin), protein concentration (lot), coating concentration |
| Mounting medium                     | with or without DAPI, hardening or not                                                                      |

### 5. Kits and assays

| Type           | Suggested fields                                       |
| -------------- | ------------------------------------------------------ |
| Commercial kit | kit version, components used, protocol version, expiry |

### 6. Molecular biology

| Type               | Suggested fields                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------- |
| Oligo or primer    | sequence, target gene, modifications, purification, stock concentration, Tm                  |
| Probe              | sequence, reporter and quencher, target                                                      |
| Plasmid            | backbone, insert, resistance, repository ID (e.g. Addgene), concentration, sequence verified |
| siRNA or guide RNA | target gene, sequence, concentration                                                         |
| Master mix         | chemistry, volume per reaction                                                               |
| Ladder or marker   | size range, amount loaded                                                                    |

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

### 9. Software and data

Core: name, source, notes.

| Type     | Suggested fields                             |
| -------- | -------------------------------------------- |
| Software | version, settings or template file           |
| Dataset  | repository, accession number, date deposited |

## Links to the rest of the board

- **Plate types feed the vessel map.** A plate or flask in Supplies can be what the vessel map lays
  out, so its format is entered once.
- **Antibody fields feed the flow panel.** Fluorochrome, laser and isotype are exactly what the parked
  flow decisions (W45, W55, W60, W61) need; the flow panel block becomes a view of the antibodies.
- **Inventory.** For lab members, any material can be picked from the lab's inventory (reagents,
  supplies, equipment suites), filling vendor, catalog and lot.

## Decided

- Antibodies are their own group, as journals list them (Evan, 2026-10-07).
- The group is "Supplies", not "Consumables", matching the Supplies suite (Evan, 2026-10-07).

## Open questions

1. Rows of different types in one group have different fields. Show each group as a table (columns
   are the union, empty cells left blank) or each material as a compact card with only its fields?
   Evan wants to see both; the aim is few columns, readable and clear.
2. Other sciences (chemistry, materials, plant biology) are covered by custom groups and types for
   now. Add defaults for them only when someone needs them.

## Review notes (draft 2)

Changes after a self-review: deposited data added (the journal table has it); equipment and software
no longer get lot and expiry; values that belong to a lot are marked and remembered by lot; MOI moved
out of the virus fields (it is a choice, not a property); consent added to tissue and fluid samples;
cytokine merged into recombinant protein; added organoids, detection conjugates, antibiotics,
transfection reagents, stimulants, fixation and permeabilization buffers, coatings and matrices,
mounting media, gels and membranes; laser kept on the antibody but the detector left to the instrument.
