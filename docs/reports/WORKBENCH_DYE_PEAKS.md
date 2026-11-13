# Workbench dye list (for review)

One list behind the Conjugate pick list in Materials, the Fluorochrome pick list on the flow panel, and the panel's "works best on" checks. Each dye has its proper name, other spellings that snap to it (case, spaces and dashes are ignored anyway), the lasers that excite it (first one preferred) and its emission peak. Built 2026-11-12 from the app's earlier list (FPbase peaks kept where it had them) and a vendor survey (BD, BioLegend, Thermo Fisher, Bio-Rad, Cytek, Miltenyi, Beckman, Biotium, Tonbo).

509 dyes: 351 antibody dyes, 63 fluorescent proteins, 84 viability dyes, 11 DNA dyes.

## Check these first

**Lasers that could place a stain wrong**

- RealYellow (RY586, RY610, RY703, RY775), NovaFluor Yellow, the Spark YG dyes, cFluor YG and Zombie Red are yellow-green 561 only; the earlier list also allowed blue 488 for them. On an instrument without a 561 laser (the iQue) they now get no "works best on" suggestion.
- Alexa Fluor 555, 568 and 594, Texas Red, Cy3, Cy3.5 and DyLight 550/594 are now yellow-green 561 only (earlier: 561 or 488).
- PE and its tandems, PE-Vio and cFluor BYG stay yellow-green 561 or blue 488.
- IRDye 680RD moved from near-IR 808 to red 640. Alexa Fluor 790, the CF 770/790/800 dyes, DyLight 800 and IRDye 800CW are near-IR 808 only.
- Two lasers each: Alexa Fluor 532 and CF532 (488 or 561), PI and 7-AAD (488 or 561), DRAQ5 and DRAQ7 (640 or 488), Qdots and eFluor NC (405 or 355), AmCyan (405 or 488), E2-Crimson and mCardinal (561 or 640), StarBright Blue 520 (488 or 405).

**Peaks where sources disagree** (the earlier FPbase value is kept): BV750 745 (vendor 754), APC-Fire 750 787 (774), Zombie UV 453 (459), Zombie Aqua 510 (516), Pacific Green 502 (510), LIVE/DEAD Fixable Blue 441 (450), LIVE/DEAD Fixable Yellow 550 (Thermo's table 575), LIVE/DEAD Fixable Green 526 (520). PerCP-Vio 700 uses Miltenyi's 676 (another source says 704); PerCP-Cy5.5 uses 679 (BD 676, BioLegend 690). cFluor R840 peaks at 810 per Cytek, despite its name.

**Peaks not measured** (taken from the number in the name, or inferred): eFluor 605NC/625NC/650NC, VivaFix dyes, violetFluor 450/500, redFluor 710, Ghost Dye Violet 540, Vio B515, Vio667, PE-Vio 670, Viobility dyes, NovaFluor Red 720/787, IRDye 800; V500-C (500, from V500), Zombie B550 (540), APC-Alexa Fluor 700 (719). PE-Vio 670 and VivaFix 649/660 may not be current products.

**Spelling choices**

- Tandems use a hyphen as the proper name (PE-Dazzle 594, APC-Fire 750, PerCP-Fire 806), BioLegend's slash spelling kept as another spelling, matching PE-Cy7 and the rest of the list.
- BV785 (BioLegend) and BV786 (BD) are separate entries, as are GFP/EGFP, YFP/EYFP and RFP/TagRFP, so a name typed as it is on the vial stays that way.
- BD's current names win: BB630 is now BB630-P2, BB660-P2, BB755-P, BB790-P; Fixable Viability Stain 510 reads FVS510. Miltenyi's spacing: PE-Vio 770, APC-Vio 770, PerCP-Vio 700, VioBright B515. The old spellings still find them.
- Not fixable: PI, 7-AAD, DRAQ7, TO-PRO-3, YO-PRO-1, SYTOX, Helix NP and calcein; every other viability dye is filed as fixable.
- Left out: proliferation and tracking dyes (CellTrace, CFSE), ATTO, Seta, BODIPY.

## Antibody dyes (the Conjugate pick list)

### UV 355

| Dye                        | Other spellings                                                          | Lasers | Peak (nm) | Source                                                          |
| -------------------------- | ------------------------------------------------------------------------ | ------ | --------- | --------------------------------------------------------------- |
| Spark PLUS UV395           |                                                                          |        | 385       | resources.revvity.com BioLegend flyer 2025                      |
| Spark UV 387               |                                                                          |        | 387       | BioLegend Fluorophore Guide 05-0116-00                          |
| BUV395                     | Brilliant Ultraviolet 395, Brilliant Ultra Violet 395, BD Horizon BUV395 |        | 395       | FPbase (app list, 2026-11-12)                                   |
| cFluor UV395               |                                                                          |        | 395       | Cytek cFluor Quick Reference N9-20091 Rev C                     |
| StarBright UltraViolet 400 | SBUV400, StarBright UV 400                                               |        | 395       | bio-rad-antibodies.com/flow-ultraviolet-laser-fluorophores.html |
| cFluor UV440               |                                                                          |        | 440       | Cytek cFluor Quick Reference N9-20091 Rev C                     |
| StarBright UltraViolet 445 | SBUV445, StarBright UV 445                                               |        | 440       | bio-rad-antibodies.com/flow-ultraviolet-laser-fluorophores.html |
| Alexa Fluor 350            | AF350, A350                                                              |        | 441       | FPbase                                                          |
| iFluor 350                 |                                                                          |        | 448       | FPbase                                                          |
| CF350                      |                                                                          |        | 450       | FPbase                                                          |
| BUV496                     | Brilliant Ultraviolet 496, Brilliant Ultra Violet 496                    |        | 495       | FPbase (app list, 2026-11-12)                                   |
| StarBright UltraViolet 510 | SBUV510, StarBright UV 510                                               |        | 513       | bio-rad-antibodies.com/flow-ultraviolet-laser-fluorophores.html |
| cFluor UV515               |                                                                          |        | 515       | Cytek cFluor Quick Reference N9-20091 Rev C                     |
| StarBright UltraViolet 540 | SBUV540, StarBright UV 540                                               |        | 540       | bio-rad-antibodies.com/flow-ultraviolet-laser-fluorophores.html |
| BUV563                     | Brilliant Ultraviolet 563, Brilliant Ultra Violet 563                    |        | 563       | FPbase (app list, 2026-11-12)                                   |
| StarBright UltraViolet 575 | SBUV575, StarBright UV 575                                               |        | 569       | bio-rad-antibodies.com/flow-ultraviolet-laser-fluorophores.html |
| cFluor UV570               |                                                                          |        | 570       | Cytek cFluor Quick Reference N9-20091 Rev C                     |
| StarBright UltraViolet 605 | SBUV605, StarBright UV 605                                               |        | 609       | bio-rad-antibodies.com/flow-ultraviolet-laser-fluorophores.html |
| cFluor UV610               |                                                                          |        | 610       | Cytek cFluor Quick Reference N9-20091 Rev C                     |
| BUV615                     | Brilliant Ultraviolet 615, Brilliant Ultra Violet 615, BUV615-P2         |        | 615       | bdbiosciences.com/colors                                        |
| BUV661                     | Brilliant Ultraviolet 661, Brilliant Ultra Violet 661                    |        | 657       | FPbase (app list, 2026-11-12)                                   |
| StarBright UltraViolet 665 | SBUV665, StarBright UV 665                                               |        | 669       | bio-rad-antibodies.com/flow-ultraviolet-laser-fluorophores.html |
| cFluor UV670               |                                                                          |        | 670       | Cytek cFluor Quick Reference N9-20091 Rev C                     |
| StarBright UltraViolet 700 | SBUV700, StarBright UV 700                                               |        | 700       | bio-rad-antibodies.com/flow-ultraviolet-laser-fluorophores.html |
| BUV737                     | Brilliant Ultraviolet 737, Brilliant Ultra Violet 737                    |        | 740       | FPbase (app list, 2026-11-12)                                   |
| StarBright UltraViolet 740 | SBUV740, StarBright UV 740                                               |        | 743       | bio-rad-antibodies.com/flow-ultraviolet-laser-fluorophores.html |
| cFluor UV745               |                                                                          |        | 745       | Cytek cFluor Quick Reference N9-20091 Rev C                     |
| NovaFluor UV 765           |                                                                          |        | 763       | thermofisher.com NovaFluor dyes page                            |
| StarBright UltraViolet 770 | SBUV770, StarBright UV 770                                               |        | 765       | bio-rad-antibodies.com/flow-ultraviolet-laser-fluorophores.html |
| cFluor UV790               |                                                                          |        | 790       | Cytek cFluor Quick Reference N9-20091 Rev C                     |
| StarBright UltraViolet 795 | SBUV795, StarBright UV 795                                               |        | 792       | bio-rad-antibodies.com/flow-ultraviolet-laser-fluorophores.html |
| BUV805                     | Brilliant Ultraviolet 805, Brilliant Ultra Violet 805                    |        | 802       | FPbase (app list, 2026-11-12)                                   |

### Violet 405

| Dye                   | Other spellings                           | Lasers                 | Peak (nm) | Source                                                                             |
| --------------------- | ----------------------------------------- | ---------------------- | --------- | ---------------------------------------------------------------------------------- |
| Cascade Blue          |                                           |                        | 419       | FPbase                                                                             |
| cFluor V420           |                                           |                        | 420       | Cytek cFluor Quick Reference N9-20091 Rev C                                        |
| VioBright V423        |                                           |                        | 420       | FluoroFinder dye 1906                                                              |
| Alexa Fluor 405       | AF405, A405                               |                        | 422       | FPbase (app list, 2026-11-12)                                                      |
| BV421                 | Brilliant Violet 421, BD Horizon BV421    |                        | 422       | FPbase (app list, 2026-11-12)                                                      |
| Spark Violet 423      | SV423                                     |                        | 423       | BioLegend Fluorophore Guide 05-0116-00                                             |
| SuperNova v428        | SNv428, SuperNova Violet 428, SN v428     |                        | 428       | mybeckman.vn SuperNova dyes page                                                   |
| CF405S                |                                           |                        | 431       | FPbase                                                                             |
| Super Bright 436      | SB436                                     |                        | 431       | FPbase (app list, 2026-11-12)                                                      |
| DyLight 405           | DL405                                     |                        | 433       | FPbase (app list, 2026-11-12)                                                      |
| cFluor V435           |                                           |                        | 435       | Cytek cFluor Quick Reference N9-20091 Rev C                                        |
| StarBright Violet 440 | SBV440                                    |                        | 436       | bio-rad-antibodies.com/flow-cytometry-violet-laser-fluorophores.html               |
| eFluor 450            | eF450                                     |                        | 446       | FPbase (app list, 2026-11-12)                                                      |
| cFluor V450           |                                           |                        | 450       | Cytek cFluor Quick Reference N9-20091 Rev C                                        |
| V450                  | BD Horizon V450, Horizon V450             |                        | 450       | FPbase (app list, 2026-11-12)                                                      |
| violetFluor 450       | vF450                                     |                        | 450       | vendor name convention (Tonbo/Cytek)                                               |
| CF405M                |                                           |                        | 452       | FPbase                                                                             |
| VioBlue               |                                           |                        | 452       | Miltenyi fluorescence spectra poster (2015)                                        |
| Alexa Fluor Plus 405  | AF Plus 405                               |                        | 455       | FPbase                                                                             |
| Pacific Blue          | PacBlue, PB                               |                        | 455       | FPbase (app list, 2026-11-12)                                                      |
| Marina Blue           |                                           | Violet 405 or UV 355   | 461       | FPbase                                                                             |
| cFluor V475           |                                           |                        | 475       | Cytek cFluor Quick Reference N9-20091 Rev C                                        |
| StarBright Violet 475 | SBV475                                    |                        | 479       | bio-rad-antibodies.com/flow-cytometry-violet-laser-fluorophores.html               |
| BV480                 | Brilliant Violet 480                      |                        | 480       | FPbase (app list, 2026-11-12)                                                      |
| iFluor 440            |                                           |                        | 480       | FPbase                                                                             |
| AmCyan                | Anemonia cyan                             | Violet 405 or Blue 488 | 489       | Miltenyi fluorescence spectra poster (2015)                                        |
| CF430                 |                                           |                        | 497       | FPbase                                                                             |
| Aluora 430            |                                           |                        | 499       | thermofisher.com/fluorophores                                                      |
| Spark Violet 500      | SV500                                     |                        | 500       | resources.revvity.com BioLegend flyer 2025                                         |
| V500                  | BD Horizon V500, Horizon V500             |                        | 500       | FPbase (app list, 2026-11-12)                                                      |
| V500-C                | BD Horizon V500-C                         |                        | 500       | inferred: V500 variant, BD gives V500 at 499/500 nm; no separate V500-C peak found |
| violetFluor 500       | vF500                                     |                        | 500       | vendor name convention (Tonbo/Cytek)                                               |
| iFluor 450            |                                           |                        | 502       | FPbase                                                                             |
| Pacific Green         | PacGreen                                  |                        | 502       | FPbase (app list, 2026-11-12)                                                      |
| cFluor V505           |                                           |                        | 505       | Cytek cFluor Quick Reference N9-20091 Rev C                                        |
| eFluor 506            | eF506                                     |                        | 508       | FPbase (app list, 2026-11-12)                                                      |
| BV510                 | Brilliant Violet 510                      |                        | 509       | FPbase (app list, 2026-11-12)                                                      |
| CF440                 |                                           |                        | 512       | FPbase                                                                             |
| cFluor V515           |                                           |                        | 515       | Cytek cFluor Quick Reference N9-20091 Rev C                                        |
| StarBright Violet 515 | SBV515                                    |                        | 516       | bio-rad-antibodies.com/flow-cytometry-violet-laser-fluorophores.html               |
| VioGreen              |                                           |                        | 520       | Miltenyi fluorescence spectra poster (2015)                                        |
| Qdot 525              | QD525                                     | Violet 405 or UV 355   | 525       | FPbase                                                                             |
| Krome Orange          | Kromé Orange, KO, KrO                     |                        | 528       | Beckman Coulter Krome Orange launch spec (398/528)                                 |
| Spark Violet 538      | SV538                                     |                        | 535       | FPbase (app list, 2026-11-12)                                                      |
| Alexa Fluor 430       | AF430, A430                               |                        | 540       | FPbase                                                                             |
| Amethyst Orange       |                                           |                        | 540       | bio-rad-antibodies.com/flow-cytometry-violet-laser-fluorophores.html               |
| StarBright Violet 535 | SBV535                                    |                        | 540       | bio-rad-antibodies.com/flow-cytometry-violet-laser-fluorophores.html               |
| Qdot 545              | QD545                                     | Violet 405 or UV 355   | 543       | FPbase                                                                             |
| CF405L                |                                           |                        | 547       | FPbase                                                                             |
| cFluor V547           |                                           |                        | 547       | Cytek cFluor Quick Reference N9-20091 Rev C                                        |
| Cascade Yellow        |                                           |                        | 549       | FPbase                                                                             |
| Pacific Orange        | PacOrange, PO                             |                        | 551       | FPbase (app list, 2026-11-12)                                                      |
| Qdot 565              | QD565                                     | Violet 405 or UV 355   | 564       | FPbase                                                                             |
| BV570                 | Brilliant Violet 570                      |                        | 570       | FPbase (app list, 2026-11-12)                                                      |
| cFluor V570           |                                           |                        | 570       | Cytek cFluor Quick Reference N9-20091 Rev C                                        |
| StarBright Violet 570 | SBV570                                    |                        | 571       | bio-rad-antibodies.com/flow-cytometry-violet-laser-fluorophores.html               |
| Qdot 585              | QD585                                     | Violet 405 or UV 355   | 588       | FPbase                                                                             |
| BV605                 | Brilliant Violet 605                      |                        | 601       | FPbase (app list, 2026-11-12)                                                      |
| Super Bright 600      | SB600                                     |                        | 601       | FPbase (app list, 2026-11-12)                                                      |
| Qdot 605              | QD605                                     | Violet 405 or UV 355   | 603       | FPbase (app list, 2026-11-12)                                                      |
| cFluor V605           |                                           |                        | 605       | Cytek cFluor Quick Reference N9-20091 Rev C                                        |
| SuperNova v605        | SNv605, SuperNova Violet 605, SN v605     |                        | 605       | mybeckman.vn SuperNova dyes page                                                   |
| eFluor 605NC          | eFluor NC 605, eF605NC                    | Violet 405 or UV 355   | 605       | vendor name convention (nanocrystal, nominal peak = name)                          |
| StarBright Violet 610 | SBV610                                    |                        | 607       | bio-rad-antibodies.com/flow-cytometry-violet-laser-fluorophores.html               |
| cFluor V610           |                                           |                        | 610       | Cytek cFluor Quick Reference N9-20091 Rev C                                        |
| Qdot 625              | QD625                                     | Violet 405 or UV 355   | 621       | FPbase                                                                             |
| eFluor 625NC          | eFluor NC 625, eF625NC                    | Violet 405 or UV 355   | 625       | vendor name convention (nanocrystal, nominal peak = name)                          |
| Super Bright 645      | SB645                                     |                        | 645       | FPbase (app list, 2026-11-12)                                                      |
| BV650                 | Brilliant Violet 650                      |                        | 646       | FPbase (app list, 2026-11-12)                                                      |
| SuperNova v650        | SNv650, SuperNova Violet 650, SN v650     |                        | 646       | mybeckman.vn SuperNova dyes page                                                   |
| eFluor 650NC          | eFluor NC 650, eF650NC                    | Violet 405 or UV 355   | 650       | vendor name convention (nanocrystal, nominal peak = name)                          |
| Qdot 655              | QD655                                     | Violet 405 or UV 355   | 654       | FPbase (app list, 2026-11-12)                                                      |
| StarBright Violet 670 | SBV670                                    |                        | 667       | bio-rad-antibodies.com/flow-cytometry-violet-laser-fluorophores.html               |
| cFluor V670           |                                           |                        | 670       | Cytek cFluor Quick Reference N9-20091 Rev C                                        |
| eFluor 700NC          | eFluor NC 700, eF700NC                    | Violet 405 or UV 355   | 690       | eFluor Nanocrystal spec 690 +/- 10 nm (InGaP; via search)                          |
| NovaFluor Violet 690  |                                           |                        | 691       | thermofisher.com NovaFluor dyes page                                               |
| Super Bright 702      | SB702                                     |                        | 702       | FPbase (app list, 2026-11-12)                                                      |
| Qdot 705              | QD705                                     | Violet 405 or UV 355   | 702       | FPbase (app list, 2026-11-12)                                                      |
| BV711                 | Brilliant Violet 711                      |                        | 710       | FPbase (app list, 2026-11-12)                                                      |
| StarBright Violet 710 | SBV710                                    |                        | 713       | bio-rad-antibodies.com/flow-cytometry-violet-laser-fluorophores.html               |
| cFluor V715           |                                           |                        | 715       | Cytek cFluor Quick Reference N9-20091 Rev C                                        |
| NovaFluor Violet 745  |                                           |                        | 743       | thermofisher.com NovaFluor dyes page                                               |
| BV750                 | Brilliant Violet 750, BV750-P             |                        | 745       | FPbase (app list, 2026-11-12)                                                      |
| StarBright Violet 760 | SBV760                                    |                        | 754       | bio-rad-antibodies.com/flow-cytometry-violet-laser-fluorophores.html               |
| cFluor V755           |                                           |                        | 755       | Cytek cFluor Quick Reference N9-20091 Rev C                                        |
| cFluor V780           |                                           |                        | 780       | Cytek cFluor Quick Reference N9-20091 Rev C                                        |
| Super Bright 780      | SB780                                     |                        | 780       | FPbase (app list, 2026-11-12)                                                      |
| StarBright Violet 790 | SBV790                                    |                        | 782       | bio-rad-antibodies.com/flow-cytometry-violet-laser-fluorophores.html               |
| SuperNova v786        | SNv786, SuperNova Violet 786, SN v786     |                        | 786       | mybeckman.vn SuperNova dyes page                                                   |
| BV785                 | Brilliant Violet 785                      |                        | 787       | FPbase (app list, 2026-11-12)                                                      |
| BV786                 | Brilliant Violet 786                      |                        | 787       | bdbiosciences.com/colors                                                           |
| Qdot 800              | QD800                                     | Violet 405 or UV 355   | 792       | FPbase (app list, 2026-11-12)                                                      |
| NovaFluor Violet 800  |                                           |                        | 800       | thermofisher.com NovaFluor dyes page                                               |
| RV828                 | RealViolet 828, BD Horizon RealViolet 828 |                        | 828       | bdbiosciences.com/colors                                                           |

### Blue 488

| Dye                     | Other spellings                                                      | Lasers                       | Peak (nm) | Source                                                                                    |
| ----------------------- | -------------------------------------------------------------------- | ---------------------------- | --------- | ----------------------------------------------------------------------------------------- |
| Cy2                     | Cyanine2                                                             |                              | 508       | FPbase                                                                                    |
| NovaFluor Blue 510      |                                                                      |                              | 511       | thermofisher.com NovaFluor dyes page                                                      |
| VioBright B515          | VioBright 515, Vio Bright 515                                        |                              | 514       | FluoroFinder dye 1052                                                                     |
| BB515                   | Brilliant Blue 515, BD Horizon BB515                                 |                              | 515       | FPbase (app list, 2026-11-12)                                                             |
| cFluor B515             |                                                                      |                              | 515       | Cytek cFluor Quick Reference N9-20091 Rev C                                               |
| Spark Blue 515          |                                                                      |                              | 515       | BioLegend brightness index (via search)                                                   |
| Vio B515                | Vio515                                                               |                              | 515       | vendor name convention                                                                    |
| CF488A                  |                                                                      |                              | 516       | FPbase                                                                                    |
| FITC                    | Fluorescein, Fluorescein isothiocyanate                              |                              | 517       | FPbase (app list, 2026-11-12)                                                             |
| Aluora 488              |                                                                      |                              | 518       | thermofisher.com/fluorophores                                                             |
| DyLight 488             | DL488                                                                |                              | 519       | FPbase (app list, 2026-11-12)                                                             |
| Alexa Fluor 488         | AF488, A488                                                          |                              | 520       | FPbase (app list, 2026-11-12)                                                             |
| cFluor B520             |                                                                      |                              | 520       | Cytek cFluor Quick Reference N9-20091 Rev C                                               |
| iFluor 488              |                                                                      |                              | 520       | FPbase                                                                                    |
| KIRAVIA Blue 520        | Kiravia Blue, KB520                                                  |                              | 520       | BioLegend Fluorophore Guide 05-0116-00                                                    |
| StarBright Blue 520     | SBB520                                                               | Blue 488 or Violet 405       | 520       | Bio-Rad StarBright Blue 520 secondary listings (Ex 440/Em 520; mainly a western-blot dye) |
| VioBright FITC          |                                                                      |                              | 522       | Miltenyi fluorescence spectra poster (2015)                                               |
| Oregon Green 488        | OG488                                                                |                              | 526       | FPbase                                                                                    |
| Aluora 514              |                                                                      |                              | 529       | thermofisher.com/fluorophores                                                             |
| NovaFluor Blue 530      |                                                                      |                              | 530       | thermofisher.com NovaFluor dyes page                                                      |
| CF503R                  |                                                                      |                              | 532       | FPbase                                                                                    |
| cFluor B532             |                                                                      |                              | 532       | Cytek cFluor Quick Reference N9-20091 Rev C                                               |
| Spark Blue 550          |                                                                      |                              | 535       | FPbase (app list, 2026-11-12)                                                             |
| Spark PLUS B550         | Spark Plus Blue 550                                                  |                              | 540       | resources.revvity.com BioLegend flyer 2025                                                |
| Alexa Fluor 514         | AF514, A514                                                          |                              | 543       | FPbase                                                                                    |
| RB545                   | RealBlue 545, BD Horizon RealBlue 545                                |                              | 545       | bdbiosciences.com/colors                                                                  |
| CF514                   |                                                                      |                              | 548       | FPbase                                                                                    |
| cFluor B548             |                                                                      |                              | 548       | Cytek cFluor Quick Reference N9-20091 Rev C                                               |
| CF532                   |                                                                      | Blue 488 or Yellow-green 561 | 552       | FPbase                                                                                    |
| Alexa Fluor 532         | AF532, A532                                                          | Blue 488 or Yellow-green 561 | 553       | FPbase (app list, 2026-11-12)                                                             |
| NovaFluor Blue 555      |                                                                      |                              | 555       | thermofisher.com NovaFluor dyes page                                                      |
| Spark Blue 574          |                                                                      |                              | 574       | BioLegend Fluorophore Guide 05-0116-00                                                    |
| Spark PLUS B574         | Spark Plus Blue 574                                                  |                              | 574       | resources.revvity.com BioLegend flyer 2025                                                |
| StarBright Blue 580     | SBB580                                                               |                              | 582       | bio-rad-antibodies.com/flow-blue-laser-fluorophores.html                                  |
| NovaFluor Blue 585      |                                                                      |                              | 585       | thermofisher.com NovaFluor dyes page                                                      |
| StarBright Blue 615     | SBB615                                                               |                              | 612       | bio-rad-antibodies.com/flow-blue-laser-fluorophores.html                                  |
| RB613                   | RealBlue 613, BD Horizon RealBlue 613                                |                              | 613       | bdbiosciences.com/colors                                                                  |
| BB630-P2                | BB630, Brilliant Blue 630                                            |                              | 614       | bdbiosciences.com lasers-and-dyes table                                                   |
| NovaFluor Blue 610      |                                                                      |                              | 614       | number in the name (kept from the app’s earlier list)                                     |
| NovaFluor Blue 610-30S  | NovaFluor Blue 610/30S                                               |                              | 614       | thermofisher.com NovaFluor dyes page                                                      |
| NovaFluor Blue 610-70S  | NovaFluor Blue 610/70S                                               |                              | 614       | thermofisher.com NovaFluor dyes page                                                      |
| BB660-P2                | BB660, Brilliant Blue 660                                            |                              | 660       | bdbiosciences.com lasers-and-dyes table                                                   |
| NovaFluor Blue 660      |                                                                      |                              | 665       | number in the name (kept from the app’s earlier list)                                     |
| NovaFluor Blue 660-120S | NovaFluor Blue 660/120S                                              |                              | 665       | thermofisher.com NovaFluor dyes page                                                      |
| NovaFluor Blue 660-40S  | NovaFluor Blue 660/40S                                               |                              | 665       | thermofisher.com NovaFluor dyes page                                                      |
| RB670                   | RealBlue 670, BD Horizon RealBlue 670                                |                              | 670       | bdbiosciences.com/colors                                                                  |
| cFluor B675             |                                                                      |                              | 675       | Cytek cFluor Quick Reference N9-20091 Rev C                                               |
| PerCP                   | Peridinin chlorophyll protein, Peridinin-chlorophyll-protein complex |                              | 675       | FPbase (app list, 2026-11-12)                                                             |
| StarBright Blue 675     | SBB675                                                               |                              | 675       | bio-rad-antibodies.com/flow-blue-laser-fluorophores.html                                  |
| PerCP-Vio 700           |                                                                      |                              | 676       | Miltenyi fluorescence spectra poster (2015); FluoroFinder says 704                        |
| PerCP-Cy5.5             | PerCP/Cyanine5.5, PerCP-Cyanine5.5, PerCP/Cy5.5                      |                              | 679       | FPbase (app list, 2026-11-12)                                                             |
| cFluor B690             |                                                                      |                              | 690       | Cytek cFluor Quick Reference N9-20091 Rev C                                               |
| NovaFluor Blue 690      |                                                                      |                              | 690       | thermofisher.com NovaFluor dyes page                                                      |
| BB700                   | Brilliant Blue 700, BD Horizon BB700                                 |                              | 694       | FPbase (app list, 2026-11-12)                                                             |
| StarBright Blue 700     | SBB700                                                               |                              | 703       | bio-rad-antibodies.com/flow-blue-laser-fluorophores.html                                  |
| RB705                   | RealBlue 705, BD Horizon RealBlue 705                                |                              | 707       | bdbiosciences.com/colors                                                                  |
| PerCP-eFluor 710        | PerCP-eF710                                                          |                              | 709       | FPbase (app list, 2026-11-12)                                                             |
| NovaFluor Blue 725      |                                                                      |                              | 725       | thermofisher.com NovaFluor dyes page                                                      |
| RB744                   | RealBlue 744, BD Horizon RealBlue 744                                |                              | 746       | bdbiosciences.com/colors                                                                  |
| NovaFluor Blue 745      |                                                                      |                              | 750       | thermofisher.com NovaFluor dyes page                                                      |
| BB755-P                 | BB755, Brilliant Blue 755                                            |                              | 755       | bdbiosciences.com/colors                                                                  |
| NovaFluor Blue 760      |                                                                      |                              | 764       | thermofisher.com NovaFluor dyes page                                                      |
| StarBright Blue 765     | SBB765                                                               |                              | 764       | bio-rad-antibodies.com/flow-blue-laser-fluorophores.html                                  |
| PerCP-Fire 780          | PerCP/Fire 780                                                       |                              | 774       | resources.revvity.com BioLegend flyer 2025                                                |
| RB780                   | RealBlue 780, BD Horizon RealBlue 780                                |                              | 781       | bdbiosciences.com/colors                                                                  |
| BB790-P                 | BB790, Brilliant Blue 790                                            |                              | 790       | bdbiosciences.com/colors                                                                  |
| PerCP-Fire 806          | PerCP/Fire 806                                                       |                              | 802       | resources.revvity.com BioLegend flyer 2025                                                |
| StarBright Blue 810     | SBB810                                                               |                              | 802       | bio-rad-antibodies.com/flow-blue-laser-fluorophores.html                                  |
| NovaFluor Blue 800      |                                                                      |                              | 806       | thermofisher.com NovaFluor dyes page                                                      |
| RB824                   | RealBlue 824, BD Horizon RealBlue 824                                |                              | 824       | bdbiosciences.com/colors                                                                  |

### Yellow-green 561

| Dye                   | Other spellings                                             | Lasers                       | Peak (nm) | Source                                                     |
| --------------------- | ----------------------------------------------------------- | ---------------------------- | --------- | ---------------------------------------------------------- |
| iFluor 546            |                                                             |                              | 557       | FPbase                                                     |
| CF543                 |                                                             | Yellow-green 561 or Blue 488 | 563       | FPbase                                                     |
| Aluora 555            |                                                             |                              | 567       | thermofisher.com/fluorophores                              |
| Alexa Fluor 555       | AF555, A555                                                 |                              | 568       | FPbase (app list, 2026-11-12)                              |
| CF555                 |                                                             |                              | 568       | FPbase                                                     |
| Cy3                   | Cyanine3                                                    |                              | 568       | FPbase (app list, 2026-11-12)                              |
| DyLight 550           | DL550                                                       |                              | 568       | FPbase (app list, 2026-11-12)                              |
| NovaFluor Yellow 570  |                                                             |                              | 568       | thermofisher.com NovaFluor dyes page                       |
| Alexa Fluor 561       | AF561, A561                                                 |                              | 569       | thermofisher.com/fluorophores                              |
| eFluor 570            | eF570                                                       |                              | 569       | FPbase                                                     |
| Spark YG 570          | Spark Yellow-Green 570                                      |                              | 570       | BioLegend Spark YG 570 Streptavidin page                   |
| Alexa Fluor 546       | AF546, A546                                                 |                              | 572       | FPbase                                                     |
| cFluor BYG575         |                                                             | Yellow-green 561 or Blue 488 | 575       | Cytek cFluor Quick Reference N9-20091 Rev C                |
| PE                    | R-PE, RPE, R-Phycoerythrin, Phycoerythrin                   | Yellow-green 561 or Blue 488 | 576       | FPbase (app list, 2026-11-12)                              |
| TRITC                 | Tetramethylrhodamine, TAMRA                                 |                              | 578       | FPbase                                                     |
| StarBright Yellow 575 | SBY575                                                      |                              | 579       | bio-rad-antibodies.com/flow-yellow-laser-fluorophores.html |
| Spark PLUS YG581      |                                                             |                              | 581       | resources.revvity.com BioLegend flyer 2025                 |
| Spark YG 581          | Spark Yellow-Green 581                                      |                              | 581       | BioLegend Fluorophore Guide 05-0116-00                     |
| BYG584                | BYG584-P, Brilliant Yellow-Green 584                        |                              | 583       | bdbiosciences.com/colors                                   |
| CF568                 |                                                             |                              | 584       | FPbase                                                     |
| cFluor YG584          |                                                             |                              | 584       | Cytek cFluor Quick Reference N9-20091 Rev C                |
| RY586                 | RealYellow 586, BD Horizon RealYellow 586                   |                              | 586       | bdbiosciences.com/colors                                   |
| Cy3.5                 | Cyanine3.5                                                  |                              | 589       | FPbase (app list, 2026-11-12)                              |
| NovaFluor Yellow 590  |                                                             |                              | 590       | thermofisher.com NovaFluor dyes page                       |
| Spark YG 593          | Spark Yellow-Green 593                                      |                              | 593       | BioLegend Fluorophore Guide 05-0116-00                     |
| cFluor YG600          |                                                             |                              | 600       | Cytek cFluor Quick Reference N9-20091 Rev C                |
| Alexa Fluor 568       | AF568, A568                                                 |                              | 603       | FPbase (app list, 2026-11-12)                              |
| StarBright Yellow 605 | SBY605                                                      |                              | 606       | bio-rad-antibodies.com/flow-yellow-laser-fluorophores.html |
| PE-eFluor 610         | PE-eF610                                                    | Yellow-green 561 or Blue 488 | 606       | FPbase (app list, 2026-11-12)                              |
| PE-Dazzle 594         | PE/Dazzle 594, PE Dazzle                                    | Yellow-green 561 or Blue 488 | 609       | FPbase (app list, 2026-11-12)                              |
| cFluor YG610          |                                                             |                              | 610       | Cytek cFluor Quick Reference N9-20091 Rev C                |
| RY610                 | RealYellow 610, BD Horizon RealYellow 610                   |                              | 610       | bdbiosciences.com/colors                                   |
| cFluor BYG610         |                                                             | Yellow-green 561 or Blue 488 | 610       | Cytek cFluor Quick Reference N9-20091 Rev C                |
| PE-CF594              | BD Horizon PE-CF594, CF594 PE                               | Yellow-green 561 or Blue 488 | 610       | FPbase (app list, 2026-11-12)                              |
| NovaFluor Yellow 610  |                                                             |                              | 612       | thermofisher.com NovaFluor dyes page                       |
| Texas Red             | Texas Red-X, TxRed                                          |                              | 613       | FPbase (app list, 2026-11-12)                              |
| Aluora 594            |                                                             |                              | 615       | thermofisher.com/fluorophores                              |
| CF594                 |                                                             |                              | 615       | FPbase                                                     |
| eFluor 615            | eF615                                                       |                              | 615       | FPbase                                                     |
| PE-Texas Red          | ECD, PE-TxRed, PE-TR, PE/Texas Red, Red 613                 | Yellow-green 561 or Blue 488 | 615       | FPbase (app list, 2026-11-12)                              |
| Alexa Fluor 594       | AF594, A594                                                 |                              | 618       | FPbase (app list, 2026-11-12)                              |
| DyLight 594           | DL594                                                       |                              | 618       | Thermo Fluorescent Products Guide 1602361                  |
| PE-Vio 615            |                                                             | Yellow-green 561 or Blue 488 | 619       | FluoroFinder dye 935                                       |
| PE-Alexa Fluor 610    | PE-AF610, PE-A610                                           | Yellow-green 561 or Blue 488 | 627       | FPbase (app list, 2026-11-12)                              |
| Alexa Fluor 610       | AF610, A610                                                 |                              | 630       | FPbase                                                     |
| PE-Fire 640           | PE/Fire 640                                                 | Yellow-green 561 or Blue 488 | 639       | BioLegend Fluorophore Guide 05-0116-00                     |
| CF620R                |                                                             | Yellow-green 561 or Red 640  | 643       | FPbase                                                     |
| cFluor BYG645         |                                                             | Yellow-green 561 or Blue 488 | 645       | Cytek cFluor Quick Reference N9-20091 Rev C                |
| RY655                 | RealYellow 655, BD Horizon RealYellow 655                   |                              | 654       | bdbiosciences.com/colors                                   |
| NovaFluor Yellow 660  |                                                             |                              | 663       | thermofisher.com NovaFluor dyes page                       |
| PE-Alexa Fluor 647    | PE-AF647, PE-A647                                           | Yellow-green 561 or Blue 488 | 666       | FPbase                                                     |
| PE-Cy5                | PE/Cyanine5, PE-Cyanine5, PE/Cy5, PC5, TRI-COLOR, Tri-Color | Yellow-green 561 or Blue 488 | 666       | FPbase (app list, 2026-11-12)                              |
| cFluor BYG667         |                                                             | Yellow-green 561 or Blue 488 | 667       | Cytek cFluor Quick Reference N9-20091 Rev C                |
| StarBright Yellow 665 | SBY665                                                      |                              | 670       | bio-rad-antibodies.com/flow-yellow-laser-fluorophores.html |
| PE-Vio 670            |                                                             | Yellow-green 561 or Blue 488 | 670       | vendor name convention                                     |
| NovaFluor Yellow 690  |                                                             |                              | 690       | thermofisher.com NovaFluor dyes page                       |
| PE-Cy5.5              | PE/Cyanine5.5, PE-Cyanine5.5, PE/Cy5.5, PC5.5               | Yellow-green 561 or Blue 488 | 692       | FPbase (app list, 2026-11-12)                              |
| PE-Fire 700           | PE/Fire 700                                                 | Yellow-green 561 or Blue 488 | 695       | BioLegend Fluorophore Guide 05-0116-00                     |
| NovaFluor Yellow 700  |                                                             |                              | 700       | thermofisher.com NovaFluor dyes page                       |
| PE-Alexa Fluor 680    | PE-AF680, PE-A680                                           | Yellow-green 561 or Blue 488 | 702       | FPbase                                                     |
| RY703                 | RealYellow 703, BD Horizon RealYellow 703                   |                              | 703       | bdbiosciences.com/colors                                   |
| cFluor BYG710         |                                                             | Yellow-green 561 or Blue 488 | 710       | Cytek cFluor Quick Reference N9-20091 Rev C                |
| StarBright Yellow 720 | SBY720                                                      |                              | 719       | bio-rad-antibodies.com/flow-yellow-laser-fluorophores.html |
| PE-Alexa Fluor 700    | PE-AF700, PE-A700                                           | Yellow-green 561 or Blue 488 | 721       | FPbase (app list, 2026-11-12)                              |
| NovaFluor Yellow 730  |                                                             |                              | 731       | thermofisher.com NovaFluor dyes page                       |
| RY743                 | RealYellow 743, BD Horizon RealYellow 743                   |                              | 743       | bdbiosciences.com/colors                                   |
| PE-Fire 744           | PE/Fire 744                                                 | Yellow-green 561 or Blue 488 | 743       | resources.revvity.com BioLegend flyer 2025                 |
| cFluor BYG750         |                                                             | Yellow-green 561 or Blue 488 | 750       | Cytek cFluor Quick Reference N9-20091 Rev C                |
| NovaFluor Yellow 755  |                                                             |                              | 755       | thermofisher.com NovaFluor dyes page                       |
| RY775                 | RealYellow 775, BD Horizon RealYellow 775                   |                              | 775       | bdbiosciences.com/colors                                   |
| PE-Vio 770            |                                                             | Yellow-green 561 or Blue 488 | 776       | Miltenyi fluorescence spectra poster (2015)                |
| PE-Alexa Fluor 750    | PE-AF750, PE-A750                                           | Yellow-green 561 or Blue 488 | 779       | bio-rad-antibodies.com/flow-blue-laser-fluorophores.html   |
| PE-Cy7                | PE/Cyanine7, PE-Cyanine7, PE/Cy7, PC7                       | Yellow-green 561 or Blue 488 | 780       | FPbase (app list, 2026-11-12)                              |
| PE-Fire 780           | PE/Fire 780                                                 | Yellow-green 561 or Blue 488 | 780       | FPbase (app list, 2026-11-12)                              |
| cFluor BYG781         |                                                             | Yellow-green 561 or Blue 488 | 781       | Cytek cFluor Quick Reference N9-20091 Rev C                |
| StarBright Yellow 800 | SBY800                                                      |                              | 788       | bio-rad-antibodies.com/flow-yellow-laser-fluorophores.html |
| PE-Fire 810           | PE/Fire 810                                                 | Yellow-green 561 or Blue 488 | 806       | BioLegend Fluorophore Guide 05-0116-00                     |
| NovaFluor Yellow 810  |                                                             |                              | 813       | thermofisher.com NovaFluor dyes page                       |

### Red 640

| Dye                 | Other spellings                              | Lasers | Peak (nm) | Source                                                                             |
| ------------------- | -------------------------------------------- | ------ | --------- | ---------------------------------------------------------------------------------- |
| Alexa Fluor 635     | AF635, A635                                  |        | 648       | FPbase                                                                             |
| DyLight 633         | DL633                                        |        | 649       | FPbase                                                                             |
| Alexa Fluor 633     | AF633, A633                                  |        | 650       | FPbase                                                                             |
| CF633               |                                              |        | 650       | FPbase                                                                             |
| cFluor R659         |                                              |        | 659       | Cytek cFluor Quick Reference N9-20091 Rev C                                        |
| NovaFluor Red 660   |                                              |        | 659       | thermofisher.com NovaFluor dyes page                                               |
| APC                 | Allophycocyanin                              |        | 660       | FPbase (app list, 2026-11-12)                                                      |
| CF640R              |                                              |        | 663       | FPbase                                                                             |
| StarBright Red 670  | SBR670                                       |        | 666       | bio-rad-antibodies.com/flow-red-laser-fluorophores.html                            |
| Vio667              | Vio R667                                     |        | 667       | vendor name convention                                                             |
| CF647               |                                              |        | 668       | FPbase (app list, 2026-11-12)                                                      |
| cFluor R668         |                                              |        | 668       | Cytek cFluor Quick Reference N9-20091 Rev C                                        |
| Cy5                 | Cyanine5                                     |        | 668       | FPbase (app list, 2026-11-12)                                                      |
| eFluor 660          | eF660                                        |        | 668       | FPbase (app list, 2026-11-12)                                                      |
| VioBright R667      | VioBright 667, Vio Bright 667                |        | 668       | FluoroFinder dye 1455                                                              |
| Aluora 647          |                                              |        | 670       | thermofisher.com/fluorophores                                                      |
| iFluor 647          |                                              |        | 670       | FPbase (app list, 2026-11-12)                                                      |
| Alexa Fluor 647     | AF647, A647                                  |        | 671       | FPbase (app list, 2026-11-12)                                                      |
| DyLight 650         | DL650                                        |        | 672       | Thermo Fluorescent Products Guide 1602361                                          |
| DyLight 649         |                                              |        | 674       | FPbase (app list, 2026-11-12)                                                      |
| CF660R              |                                              |        | 682       | FPbase                                                                             |
| CF660C              |                                              |        | 685       | FPbase                                                                             |
| cFluor R685         |                                              |        | 685       | Cytek cFluor Quick Reference N9-20091 Rev C                                        |
| NovaFluor Red 685   |                                              |        | 685       | thermofisher.com NovaFluor dyes page                                               |
| Spark NIR 685       |                                              |        | 685       | BioLegend Fluorophore Guide 05-0116-00                                             |
| RR688               | RealRed 688, BD Horizon RealRed 688          |        | 688       | bdbiosciences.com/colors                                                           |
| Cy5.5               | Cyanine5.5                                   |        | 690       | FPbase (app list, 2026-11-12)                                                      |
| Alexa Fluor 660     | AF660, A660                                  |        | 691       | FPbase (app list, 2026-11-12)                                                      |
| IRDye 680RD         |                                              |        | 693       | FPbase (app list, 2026-11-12)                                                      |
| IRDye 680           |                                              |        | 694       | number in the name (kept from the app’s earlier list)                              |
| CF680               |                                              |        | 698       | FPbase                                                                             |
| APC-Cy5.5           | APC/Cyanine5.5, APC-Cyanine5.5               |        | 700       | FPbase                                                                             |
| NovaFluor Red 700   |                                              |        | 700       | thermofisher.com NovaFluor dyes page                                               |
| CF680R              |                                              |        | 701       | FPbase                                                                             |
| Alexa Fluor 680     | AF680, A680                                  |        | 704       | FPbase (app list, 2026-11-12)                                                      |
| APC-Alexa Fluor 680 | APC-AF680, APC-A680                          |        | 704       | FPbase                                                                             |
| DyLight 680         | DL680                                        |        | 705       | FPbase                                                                             |
| Aluora 700          |                                              |        | 706       | thermofisher.com/fluorophores                                                      |
| APC-R700            | BD Horizon APC-R700                          |        | 706       | bdbiosciences.com/colors                                                           |
| eFluor 710          | eF710                                        |        | 710       | FPbase                                                                             |
| NovaFluor Red 710   |                                              |        | 710       | thermofisher.com NovaFluor dyes page                                               |
| redFluor 710        | rF710                                        |        | 710       | vendor name convention (Tonbo/Cytek)                                               |
| Spark Red 718       |                                              |        | 711       | BioLegend Fluorophore Guide 05-0116-00                                             |
| StarBright Red 715  | SBR715                                       |        | 712       | bio-rad-antibodies.com/flow-red-laser-fluorophores.html                            |
| R718                | BD Horizon Red 718, Red 718, BD Horizon R718 |        | 718       | bdbiosciences.com/colors                                                           |
| Alexa Fluor 700     | AF700, A700                                  |        | 719       | FPbase (app list, 2026-11-12)                                                      |
| APC-Alexa Fluor 700 | APC-AF700, APC-A700                          |        | 719       | inferred: acceptor Alexa Fluor 700 emission (FPbase 719); no tandem spectrum found |
| CF700               |                                              |        | 720       | FPbase                                                                             |
| cFluor R720         |                                              |        | 720       | Cytek cFluor Quick Reference N9-20091 Rev C                                        |
| NovaFluor Red 720   |                                              |        | 720       | number in the name (kept from the app’s earlier list)                              |
| NovaFluor Red 725   |                                              |        | 725       | thermofisher.com NovaFluor dyes page                                               |
| NovaFluor Red 755   |                                              |        | 755       | thermofisher.com NovaFluor dyes page                                               |
| APC-Cy7             | APC/Cyanine7, APC-Cyanine7, APC/Cy7          |        | 775       | FPbase (app list, 2026-11-12)                                                      |
| APC-Vio 770         |                                              |        | 775       | Miltenyi fluorescence spectra poster (2015)                                        |
| Cy7                 | Cyanine7                                     |        | 775       | FPbase (app list, 2026-11-12)                                                      |
| Alexa Fluor 750     | AF750, A750                                  |        | 776       | FPbase                                                                             |
| DyLight 755         | DL755                                        |        | 776       | FPbase                                                                             |
| StarBright Red 775  | SBR775                                       |        | 778       | bio-rad-antibodies.com/flow-red-laser-fluorophores.html                            |
| CF750               |                                              |        | 779       | FPbase                                                                             |
| APC-H7              | BD APC-H7                                    |        | 780       | FPbase (app list, 2026-11-12)                                                      |
| cFluor R780         |                                              |        | 780       | Cytek cFluor Quick Reference N9-20091 Rev C                                        |
| Aluora 750          |                                              |        | 783       | thermofisher.com/fluorophores                                                      |
| APC-Alexa Fluor 750 | APC-AF750, APC-A750                          |        | 785       | FPbase (app list, 2026-11-12)                                                      |
| APC-eFluor 780      | APC-eF780                                    |        | 785       | FPbase (app list, 2026-11-12)                                                      |
| APC-Fire 750        | APC/Fire 750                                 |        | 787       | FPbase (app list, 2026-11-12)                                                      |
| NovaFluor Red 787   |                                              |        | 787       | number in the name (kept from the app’s earlier list)                              |
| NovaFluor Red 800   |                                              |        | 799       | thermofisher.com NovaFluor dyes page                                               |
| APC-Fire 810        | APC/Fire 810                                 |        | 807       | BioLegend Fluorophore Guide 05-0116-00                                             |
| cFluor R840         |                                              |        | 810       | Cytek cFluor Quick Reference N9-20091 Rev C (lists 810 nm despite the name)        |
| StarBright Red 815  | SBR815                                       |        | 811       | bio-rad-antibodies.com/flow-red-laser-fluorophores.html                            |

### Near-IR 808

| Dye             | Other spellings | Lasers | Peak (nm) | Source                                                |
| --------------- | --------------- | ------ | --------- | ----------------------------------------------------- |
| IRDye 800CW     |                 |        | 792       | FPbase (app list, 2026-11-12)                         |
| DyLight 800     | DL800           |        | 794       | Thermo Fluorescent Products Guide 1602361             |
| IRDye 800       |                 |        | 794       | number in the name (kept from the app’s earlier list) |
| CF770           |                 |        | 797       | FPbase                                                |
| Alexa Fluor 790 | AF790, A790     |        | 805       | FPbase (app list, 2026-11-12)                         |
| CF790           |                 |        | 806       | FPbase                                                |
| CF800           |                 |        | 817       | FPbase                                                |

## Fluorescent proteins

### UV 355

| Dye   | Other spellings | Lasers               | Peak (nm) | Source |
| ----- | --------------- | -------------------- | --------- | ------ |
| EBFP2 | EBFP            | UV 355 or Violet 405 | 448       | FPbase |

### Violet 405

| Dye         | Other spellings      | Lasers                 | Peak (nm) | Source |
| ----------- | -------------------- | ---------------------- | --------- | ------ |
| mTagBFP2    |                      |                        | 454       | FPbase |
| TagBFP      | BFP                  |                        | 457       | FPbase |
| mTurquoise2 | mTurquoise           |                        | 474       | FPbase |
| Cerulean    |                      |                        | 475       | FPbase |
| mCerulean3  |                      |                        | 475       | FPbase |
| ECFP        | CFP                  |                        | 477       | FPbase |
| avGFP       | wtGFP, wild-type GFP | Violet 405 or Blue 488 | 509       | FPbase |
| T-Sapphire  | Sapphire             |                        | 511       | FPbase |
| mAmetrine   | Ametrine             |                        | 526       | FPbase |

### Blue 488

| Dye           | Other spellings | Lasers                 | Peak (nm) | Source                        |
| ------------- | --------------- | ---------------------- | --------- | ----------------------------- |
| mTFP1         | Teal FP         | Blue 488 or Violet 405 | 492       | FPbase                        |
| TurboGFP      | copGFP          |                        | 502       | FPbase                        |
| ZsGreen1      | ZsGreen         |                        | 505       | FPbase                        |
| EGFP          | Enhanced GFP    |                        | 507       | FPbase (app list, 2026-11-12) |
| GFP           |                 |                        | 507       | FPbase (app list, 2026-11-12) |
| mEmerald      | Emerald         |                        | 509       | FPbase                        |
| mWasabi       |                 |                        | 509       | FPbase                        |
| mStayGold     | StayGold        |                        | 510       | FPbase                        |
| sfGFP         | Superfolder GFP |                        | 510       | FPbase                        |
| mGreenLantern |                 |                        | 514       | FPbase                        |
| mNeonGreen    | NeonGreen       |                        | 517       | FPbase (app list, 2026-11-12) |
| mClover3      | Clover          |                        | 518       | FPbase                        |
| EYFP          |                 |                        | 527       | FPbase                        |
| mVenus        |                 |                        | 527       | FPbase                        |
| YFP           |                 |                        | 527       | FPbase (app list, 2026-11-12) |
| Venus         |                 |                        | 528       | FPbase                        |
| Citrine       |                 |                        | 529       | FPbase                        |
| mCitrine      |                 |                        | 529       | FPbase                        |
| YPet          |                 |                        | 530       | FPbase                        |
| ZsYellow1     | ZsYellow        |                        | 539       | FPbase                        |

### Yellow-green 561

| Dye            | Other spellings   | Lasers                       | Peak (nm) | Source                        |
| -------------- | ----------------- | ---------------------------- | --------- | ----------------------------- |
| mOrange        | mOrange2          | Yellow-green 561 or Blue 488 | 562       | FPbase                        |
| mKO2           | Kusabira Orange 2 | Yellow-green 561 or Blue 488 | 565       | FPbase                        |
| TurboRFP       |                   |                              | 574       | FPbase                        |
| tdTomato       | Tomato, tdTom     | Yellow-green 561 or Blue 488 | 581       | FPbase (app list, 2026-11-12) |
| DsRed          | DsRed1            | Yellow-green 561 or Blue 488 | 583       | FPbase (app list, 2026-11-12) |
| RFP            |                   |                              | 584       | FPbase                        |
| TagRFP         |                   |                              | 584       | FPbase                        |
| TagRFP-T       |                   |                              | 584       | FPbase                        |
| DsRed2         |                   | Yellow-green 561 or Blue 488 | 587       | FPbase                        |
| DsRed-Express2 |                   |                              | 591       | FPbase                        |
| mApple         |                   |                              | 592       | FPbase                        |
| mRuby3         |                   |                              | 592       | FPbase                        |
| mScarlet3      |                   |                              | 592       | FPbase                        |
| mScarlet-I     |                   |                              | 593       | FPbase                        |
| mScarlet       |                   |                              | 594       | FPbase (app list, 2026-11-12) |
| mStrawberry    |                   |                              | 596       | FPbase                        |
| mRuby2         |                   |                              | 600       | FPbase                        |
| mRFP1          | mRFP              |                              | 607       | FPbase                        |
| mCherry        |                   |                              | 610       | FPbase (app list, 2026-11-12) |
| mKate2         |                   |                              | 633       | FPbase (app list, 2026-11-12) |
| tdKatushka2    |                   |                              | 633       | FPbase                        |
| Katushka       | TurboFP635        |                              | 635       | FPbase                        |
| E2-Crimson     | Crimson           | Yellow-green 561 or Red 640  | 646       | FPbase                        |
| mPlum          |                   |                              | 649       | FPbase                        |
| mNeptune       |                   |                              | 650       | FPbase                        |
| mCardinal      |                   | Yellow-green 561 or Red 640  | 659       | FPbase                        |

### Red 640

| Dye       | Other spellings | Lasers | Peak (nm) | Source                        |
| --------- | --------------- | ------ | --------- | ----------------------------- |
| emiRFP670 |                 |        | 670       | FPbase                        |
| iRFP670   |                 |        | 670       | FPbase                        |
| miRFP670  |                 |        | 670       | FPbase                        |
| miRFP680  |                 |        | 680       | FPbase                        |
| iRFP713   | iRFP            |        | 713       | FPbase (app list, 2026-11-12) |
| iRFP720   |                 |        | 720       | FPbase                        |
| miRFP720  |                 |        | 720       | FPbase                        |

## Viability dyes

### UV 355

| Dye                                | Other spellings                                    | Lasers  | Peak (nm) | Source                                   |
| ---------------------------------- | -------------------------------------------------- | ------- | --------- | ---------------------------------------- |
| FVS440UV                           | Fixable Viability Stain 440UV, BD Horizon FVS440UV | fixable | 436       | bdbiosciences.com FVS440UV 566332        |
| LIVE/DEAD Fixable Blue             | LIVE/DEAD Blue, L/D Blue, LD Fixable Blue          | fixable | 441       | FPbase (app list, 2026-11-12)            |
| VivaFix 353/442                    | VivaFix 353                                        | fixable | 442       | bio-rad.com VivaFix 353/442 product page |
| Ghost Dye UV 450                   | Ghost UV 450                                       | fixable | 450       | cellsignal.com 80862 (peak emission 450) |
| Live-or-Dye 350/448                |                                                    | fixable | 450       | FPbase                                   |
| Zombie UV                          | Zombie UV Fixable Viability                        | fixable | 453       | FPbase (app list, 2026-11-12)            |
| Fixable Viability Dye eFluor 455UV | FVD eFluor 455UV, FVD455UV, FVD eF455UV            | fixable | 455       | FPbase                                   |

### Violet 405

| Dye                              | Other spellings                                        | Lasers      | Peak (nm) | Source                                                      |
| -------------------------------- | ------------------------------------------------------ | ----------- | --------- | ----------------------------------------------------------- |
| Zombie Violet                    | Zombie Violet Fixable Viability                        | fixable     | 421       | FPbase (app list, 2026-11-12)                               |
| Fixable Viability Dye eFluor 450 | FVD eFluor 450, FVD450, FVD eF450                      | fixable     | 446       | FPbase (app list, 2026-11-12)                               |
| Ghost Dye Violet 450             | Ghost Violet 450                                       | fixable     | 447       | FluoroFinder Ghost Dye Violet 450 profile (ex 402 / em 447) |
| FVS450                           | Fixable Viability Stain 450, BD Horizon FVS450         | fixable     | 450       | BD FVS reagent overview table (via search)                  |
| VivaFix 410/450                  | VivaFix 410                                            | fixable     | 450       | vendor name convention (name gives ex/em)                   |
| Live-or-Dye 405/452              |                                                        | fixable     | 452       | FPbase                                                      |
| Viobility 405/452                | Viobility 405/452 Fixable Dye                          | fixable     | 452       | vendor name convention (name gives ex/em)                   |
| Calcein Violet 450 AM            | Calcein Violet                                         | not fixable | 452       | FPbase                                                      |
| LIVE/DEAD Fixable Violet         | LIVE/DEAD Violet, L/D Violet, LD Fixable Violet        | fixable     | 455       | FPbase (app list, 2026-11-12)                               |
| Helix NP Blue                    |                                                        | not fixable | 470       | BioLegend Fluorophore Guide 05-0116-00                      |
| SYTOX Blue                       |                                                        | not fixable | 470       | FPbase (app list, 2026-11-12)                               |
| Fixable Viability Dye eFluor 506 | FVD eFluor 506, FVD506, FVD eF506                      | fixable     | 506       | FPbase (app list, 2026-11-12)                               |
| LIVE/DEAD Fixable Lime           | LIVE/DEAD Lime, L/D Lime, LIVE/DEAD Fixable Lime (506) | fixable     | 506       | thermofisher.com LIVE/DEAD Fixable protocol table           |
| Ghost Dye Violet 510             | Ghost Violet 510                                       | fixable     | 510       | Tonbo/VWR listing (405 ex / 510 em)                         |
| Zombie Aqua                      | Zombie Aqua Fixable Viability                          | fixable     | 510       | FPbase (app list, 2026-11-12)                               |
| FVS510                           | Fixable Viability Stain 510, BD Horizon FVS510         | fixable     | 512       | bdbiosciences.com FVS510 564406                             |
| VivaFix 408/512                  | VivaFix 408                                            | fixable     | 512       | vendor name convention (name gives ex/em)                   |
| Viobility 405/520                | Viobility 405/520 Fixable Dye                          | fixable     | 520       | vendor name convention (name gives ex/em)                   |
| LIVE/DEAD Fixable Aqua           | LIVE/DEAD Aqua, L/D Aqua, LD Fixable Aqua              | fixable     | 525       | FPbase (app list, 2026-11-12)                               |
| Ghost Dye Violet 540             | Ghost Violet 540                                       | fixable     | 540       | vendor name convention                                      |
| Live-or-Dye 405/545              |                                                        | fixable     | 547       | FPbase                                                      |
| LIVE/DEAD Fixable Yellow         | LIVE/DEAD Yellow, L/D Yellow, LD Fixable Yellow        | fixable     | 550       | FPbase (app list, 2026-11-12)                               |
| VivaFix 398/550                  | VivaFix 398                                            | fixable     | 550       | vendor name convention (name gives ex/em)                   |
| FVS575V                          | Fixable Viability Stain 575V, BD Horizon FVS575V       | fixable     | 572       | BD FVS575V 565694 spec (Fisher listing)                     |
| Zombie Yellow                    | Zombie Yellow Fixable Viability                        | fixable     | 572       | FPbase (app list, 2026-11-12)                               |

### Blue 488

| Dye                              | Other spellings                                | Lasers                                     | Peak (nm) | Source                                                                               |
| -------------------------------- | ---------------------------------------------- | ------------------------------------------ | --------- | ------------------------------------------------------------------------------------ |
| YO-PRO-1                         |                                                | not fixable                                | 506       | FPbase                                                                               |
| Calcein AM                       | Calcein                                        | not fixable                                | 514       | FPbase                                                                               |
| Zombie Green                     | Zombie Green Fixable Viability                 | fixable                                    | 515       | FPbase (app list, 2026-11-12)                                                        |
| Ghost Dye Blue 516               | Ghost Blue 516                                 | fixable                                    | 516       | Avantor/VWR Tonbo listing (488 ex / 516 em)                                          |
| Live-or-Dye 488/515              |                                                | fixable                                    | 516       | FPbase                                                                               |
| Helix NP Green                   |                                                | not fixable                                | 519       | BioLegend Fluorophore Guide 05-0116-00                                               |
| Viobility 488/520                | Viobility 488/520 Fixable Dye                  | fixable                                    | 520       | vendor name convention (name gives ex/em)                                            |
| FVS520                           | Fixable Viability Stain 520, BD Horizon FVS520 | fixable                                    | 521       | bdbiosciences.com FVS520 564407                                                      |
| VivaFix 498/521                  | VivaFix 498                                    | fixable                                    | 521       | bio-rad-antibodies.com VivaFix comparison table                                      |
| Fixable Viability Dye eFluor 520 | FVD eFluor 520, FVD520, FVD eF520              | fixable                                    | 523       | FPbase                                                                               |
| SYTOX Green                      |                                                | not fixable                                | 524       | FPbase (app list, 2026-11-12)                                                        |
| LIVE/DEAD Fixable Green          | LIVE/DEAD Green, L/D Green, LD Fixable Green   | fixable                                    | 526       | FPbase (app list, 2026-11-12)                                                        |
| Zombie B550                      | Zombie Blue 550                                | fixable                                    | 540       | inferred: no published peak found; assumed same scaffold as Spark PLUS B550 (540 nm) |
| LIVE/DEAD Fixable Olive          | LIVE/DEAD Olive, L/D Olive                     | fixable                                    | 557       | thermofisher.com LIVE/DEAD Fixable protocol table                                    |
| PI                               | Propidium iodide                               | Blue 488 or Yellow-green 561 · not fixable | 617       | FPbase (app list, 2026-11-12)                                                        |
| SYTOX AADvanced                  | SYTOX AADvanced Dead Cell Stain                | Blue 488 or Yellow-green 561 · not fixable | 647       | FPbase                                                                               |
| 7-AAD                            | 7-Aminoactinomycin D                           | Blue 488 or Yellow-green 561 · not fixable | 648       | FPbase (app list, 2026-11-12)                                                        |

### Yellow-green 561

| Dye                      | Other spellings                                | Lasers                                     | Peak (nm) | Source                                            |
| ------------------------ | ---------------------------------------------- | ------------------------------------------ | --------- | ------------------------------------------------- |
| SYTOX Orange             |                                                | Yellow-green 561 or Blue 488 · not fixable | 570       | FPbase                                            |
| VivaFix 547/573          | VivaFix 547                                    | fixable                                    | 573       | vendor name convention (name gives ex/em)         |
| Zombie YG581             | Zombie Yellow-Green 581                        | fixable                                    | 581       | BioLegend Zombie YG581 kit page                   |
| Live-or-Dye 568/583      |                                                | fixable                                    | 584       | FPbase                                            |
| LIVE/DEAD Fixable Orange | LIVE/DEAD Orange, L/D Orange                   | fixable                                    | 602       | thermofisher.com LIVE/DEAD Fixable protocol table |
| VivaFix 583/603          | VivaFix 583                                    | fixable                                    | 603       | bio-rad.com VivaFix 583/603 product page          |
| Live-or-Dye 594/614      |                                                | fixable                                    | 615       | FPbase                                            |
| LIVE/DEAD Fixable Red    | LIVE/DEAD Red, L/D Red, LD Fixable Red         | Yellow-green 561 or Blue 488 · fixable     | 615       | thermofisher.com LIVE/DEAD Fixable protocol table |
| FVS620                   | Fixable Viability Stain 620, BD Horizon FVS620 | Yellow-green 561 or Blue 488 · fixable     | 617       | bdbiosciences.com FVS620 564996                   |
| Zombie Red               | Zombie Red Fixable Viability                   | fixable                                    | 623       | FPbase (app list, 2026-11-12)                     |

### Red 640

| Dye                              | Other spellings                                                           | Lasers                            | Peak (nm) | Source                                                                   |
| -------------------------------- | ------------------------------------------------------------------------- | --------------------------------- | --------- | ------------------------------------------------------------------------ |
| TO-PRO-3                         | TO-PRO-3 iodide                                                           | not fixable                       | 657       | FPbase (app list, 2026-11-12)                                            |
| Fixable Viability Dye eFluor 660 | FVD eFluor 660, FVD660, FVD eF660                                         | fixable                           | 658       | FPbase                                                                   |
| SYTOX Red                        |                                                                           | not fixable                       | 658       | FPbase (app list, 2026-11-12)                                            |
| FVS660                           | Fixable Viability Stain 660, BD Horizon FVS660                            | fixable                           | 660       | bdbiosciences.com FVS660 564405                                          |
| VivaFix 649/660                  | VivaFix 649                                                               | fixable                           | 660       | vendor name convention (name gives ex/em; product not confirmed current) |
| Helix NP NIR                     |                                                                           | not fixable                       | 660       | BioLegend Fluorophore Guide 05-0116-00                                   |
| Live-or-Dye 640/662              |                                                                           | fixable                           | 663       | FPbase                                                                   |
| LIVE/DEAD Fixable Far Red        | LIVE/DEAD Far Red, L/D Far Red, LD Fixable Far Red                        | fixable                           | 665       | thermofisher.com LIVE/DEAD Fixable protocol table                        |
| DRAQ7                            |                                                                           | Red 640 or Blue 488 · not fixable | 676       | FPbase (app list, 2026-11-12)                                            |
| SYTOX Deep Red                   |                                                                           | not fixable                       | 682       | thermofisher.com S11380 product page                                     |
| Live-or-Dye 665/685              |                                                                           | fixable                           | 685       | FPbase                                                                   |
| Zombie R685                      | Zombie Red 685                                                            | fixable                           | 685       | BioLegend Zombie R685 kit page (via search)                              |
| FVS700                           | Fixable Viability Stain 700, BD Horizon FVS700                            | fixable                           | 700       | BD FVS reagent overview table (via search)                               |
| Ghost Dye Red 710                | Ghost Red 710                                                             | fixable                           | 710       | cellsignal.com 90232 (peak emission 710)                                 |
| Zombie R718                      | Zombie Red 718                                                            | fixable                           | 718       | BioLegend Zombie R718 kit page                                           |
| LIVE/DEAD Fixable Scarlet (723)  | LIVE/DEAD Scarlet, L/D Scarlet, LIVE/DEAD Fixable Scarlet                 | fixable                           | 723       | thermofisher.com L34986 product page                                     |
| Zombie NIR                       | Zombie Near-IR                                                            | fixable                           | 746       | FPbase (app list, 2026-11-12)                                            |
| LIVE/DEAD Fixable Near-IR (775)  | LIVE/DEAD Fixable Near-IR, LIVE/DEAD Near-IR, L/D NIR, LD Fixable Near-IR | fixable                           | 775       | FPbase (app list, 2026-11-12)                                            |
| Live-or-Dye 750/777              |                                                                           | fixable                           | 779       | FPbase                                                                   |
| FVS780                           | Fixable Viability Stain 780, BD Horizon FVS780                            | fixable                           | 780       | bdbiosciences.com FVS780 565388                                          |
| Ghost Dye Red 780                | Ghost Red 780                                                             | fixable                           | 780       | Tonbo/VWR listing (633 ex / 780 em)                                      |
| LIVE/DEAD Fixable Near-IR (780)  | LIVE/DEAD Near-IR 780, L/D NIR 780                                        | fixable                           | 780       | thermofisher.com LIVE/DEAD Fixable protocol table                        |
| Fixable Viability Dye eFluor 780 | FVD eFluor 780, FVD780, FVD eF780                                         | fixable                           | 785       | FPbase (app list, 2026-11-12)                                            |

### Near-IR 808

| Dye                             | Other spellings                    | Lasers  | Peak (nm) | Source                                            |
| ------------------------------- | ---------------------------------- | ------- | --------- | ------------------------------------------------- |
| Live-or-Dye 787/808             |                                    | fixable | 806       | FPbase                                            |
| LIVE/DEAD Fixable Near-IR (876) | LIVE/DEAD Near-IR 876, L/D NIR 876 | fixable | 876       | thermofisher.com LIVE/DEAD Fixable protocol table |

## DNA dyes

### UV 355

| Dye           | Other spellings               | Lasers               | Peak (nm) | Source |
| ------------- | ----------------------------- | -------------------- | --------- | ------ |
| Hoechst 33258 |                               | UV 355 or Violet 405 | 455       | FPbase |
| Hoechst 33342 | Hoechst                       | UV 355 or Violet 405 | 455       | FPbase |
| DAPI          | 4',6-diamidino-2-phenylindole | UV 355 or Violet 405 | 461       | FPbase |

### Violet 405

| Dye             | Other spellings              | Lasers               | Peak (nm) | Source |
| --------------- | ---------------------------- | -------------------- | --------- | ------ |
| DyeCycle Violet | Vybrant DyeCycle Violet, DCV |                      | 437       | FPbase |
| FxCycle Violet  |                              | Violet 405 or UV 355 | 461       | FPbase |
| Hoechst 34580   |                              | Violet 405 or UV 355 | 494       | FPbase |

### Blue 488

| Dye             | Other spellings         | Lasers                       | Peak (nm) | Source |
| --------------- | ----------------------- | ---------------------------- | --------- | ------ |
| DyeCycle Green  | Vybrant DyeCycle Green  |                              | 534       | FPbase |
| DyeCycle Orange | Vybrant DyeCycle Orange | Blue 488 or Yellow-green 561 | 563       | FPbase |

### Red 640

| Dye             | Other spellings       | Lasers              | Peak (nm) | Source |
| --------------- | --------------------- | ------------------- | --------- | ------ |
| FxCycle Far Red |                       |                     | 658       | FPbase |
| DyeCycle Ruby   | Vybrant DyeCycle Ruby |                     | 685       | FPbase |
| DRAQ5           |                       | Red 640 or Blue 488 | 696       | FPbase |
