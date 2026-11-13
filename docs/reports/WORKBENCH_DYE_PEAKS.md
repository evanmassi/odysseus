# Workbench dye emission peaks (for review)

Source: FPbase (fpbase.org), its public GraphQL API, fetched 2026-11-12. Each dye name the app already knows (the Materials guesser's fluorochrome and viability-dye lists) was matched to an FPbase dye or fluorescent protein, and its emission spectrum's peak taken. The panel uses only the emission peak, to pick the detector; which laser excites a dye still comes from the app's own list (shown here as Laser). Excitation peaks are listed for reference only; FPbase gives APC tandems their acceptor's peak (about 755 nm), which is why the laser is not taken from it.

Dyes the app knows but FPbase does not have (no checks run for them): BUV615, Spark UV 387, BV786, V500-C, Spark Violet 500, Krome Orange, cFluor (all), VioBlue, VioGreen, BB630, BB660, BB755, BB790, Spark Blue 574, PerCP-Vio700, PerCP-Fire 806, VioBright, NovaFluor (all), RB and RY series, BYG584, PE-Fire 640/700/744/810, PE-Vio770, PE-Vio615, DyLight 594/650, Spark YG, APC-Fire 810, APC-R700, APC-Vio770, APC-Cy5.5, Spark NIR 685, Spark Red 718, Vio667, R718, RFP, IRDye 800/680, Fixable Viability Stain 510/575V/780, Ghost Dye Violet 510 / Red 780, DAPI viability.

| Dye                              | FPbase entry                     | Laser (app)                  | Emission peak (nm) | Excitation peak (nm, reference) |
| -------------------------------- | -------------------------------- | ---------------------------- | ------------------ | ------------------------------- |
| BUV395                           | BD Horizon BUV395                | UV 355                       | 395                | 350                             |
| BUV496                           | BD Horizon BUV496                | UV 355                       | 495                | 350                             |
| BUV563                           | BD Horizon BUV563                | UV 355                       | 563                | 347                             |
| BUV661                           | BD Horizon BUV661                | UV 355                       | 657                | 346                             |
| BUV737                           | BD Horizon BUV737                | UV 355                       | 740                | 345                             |
| BUV805                           | BD Horizon BUV805                | UV 355                       | 802                | 347                             |
| BV421                            | Brilliant Violet 421             | Violet 405                   | 422                | 406                             |
| BV480                            | Brilliant Violet 480             | Violet 405                   | 480                | 439                             |
| BV510                            | Brilliant Violet 510             | Violet 405                   | 509                | 402                             |
| BV570                            | Brilliant Violet 570             | Violet 405                   | 570                | 406                             |
| BV605                            | Brilliant Violet 605             | Violet 405                   | 601                | 406                             |
| BV650                            | Brilliant Violet 650             | Violet 405                   | 646                | 406                             |
| BV711                            | Brilliant Violet 711             | Violet 405                   | 710                | 405                             |
| BV750                            | Brilliant Violet 750             | Violet 405                   | 745                | 408                             |
| BV785                            | Brilliant Violet 785             | Violet 405                   | 787                | 406                             |
| Pacific Blue                     | Pacific Blue                     | Violet 405                   | 455                | 404                             |
| Pacific Orange                   | Pacific Orange                   | Violet 405                   | 551                | 400                             |
| Pacific Green                    | Pacific Green                    | Violet 405                   | 502                | 415                             |
| eFluor 450                       | eFluor 450                       | Violet 405                   | 446                | 405                             |
| eFluor 506                       | eFluor 506                       | Violet 405                   | 508                | 419                             |
| Super Bright 436                 | Super Bright 436                 | Violet 405                   | 431                | 414                             |
| Super Bright 600                 | Super Bright 600                 | Violet 405                   | 601                | 414                             |
| Super Bright 645                 | Super Bright 645                 | Violet 405                   | 645                | 414                             |
| Super Bright 702                 | Super Bright 702                 | Violet 405                   | 702                | 413                             |
| Super Bright 780                 | Super Bright 780                 | Violet 405                   | 780                | 413                             |
| V450                             | BD Horizon V450                  | Violet 405                   | 450                | 405                             |
| V500                             | BD Horizon V500                  | Violet 405                   | 500                | 410                             |
| Alexa Fluor 405                  | Alexa Fluor 405                  | Violet 405                   | 422                | 401                             |
| Spark Violet 538                 | Spark Violet 538                 | Violet 405                   | 535                | 400                             |
| DyLight 405                      | DyLight 405                      | Violet 405                   | 433                | 399                             |
| Qdot 605                         | Qdot 605                         | Violet 405                   | 603                | 300                             |
| Qdot 655                         | Qdot 655                         | Violet 405                   | 654                | 300                             |
| Qdot 705                         | Qdot 705                         | Violet 405                   | 702                | 300                             |
| Qdot 800                         | Qdot 800                         | Violet 405                   | 792                | 300                             |
| FITC                             | Fluorescein (FITC)               | Blue 488                     | 517                | 498                             |
| Alexa Fluor 488                  | Alexa Fluor 488                  | Blue 488                     | 520                | 499                             |
| BB515                            | BD Horizon BB515                 | Blue 488                     | 515                | 490                             |
| BB700                            | BD Horizon - BB700               | Blue 488                     | 694                | 476                             |
| Spark Blue 550                   | Spark Blue 550                   | Blue 488                     | 535                | 515                             |
| PerCP                            | PerCP                            | Blue 488                     | 675                | 482                             |
| PerCP-Cy5.5                      | PerCP-Cy5.5                      | Blue 488                     | 679                | 489                             |
| PerCP-eFluor 710                 | PerCP-eFluor 710                 | Blue 488                     | 709                | 482                             |
| Alexa Fluor 532                  | Alexa Fluor 532                  | Blue 488                     | 553                | 534                             |
| DyLight 488                      | DyLight 488                      | Blue 488                     | 519                | 492                             |
| PE                               | PE (R-PE / R-phycoerythrin)      | Blue 488 or Yellow-green 561 | 576                | 565                             |
| PE-Cy5                           | PE-Cy5                           | Blue 488 or Yellow-green 561 | 666                | 568                             |
| PE-Cy5.5                         | PE-Cy5.5                         | Blue 488 or Yellow-green 561 | 692                | 564                             |
| PE-Cy7                           | PE-Cy7                           | Blue 488 or Yellow-green 561 | 780                | 569                             |
| PE-CF594                         | PE-CF594                         | Blue 488 or Yellow-green 561 | 610                | 565                             |
| PE-Dazzle 594                    | PE/Dazzle 594                    | Blue 488 or Yellow-green 561 | 609                | 565                             |
| PE-Texas Red                     | PE-Texas Red                     | Blue 488 or Yellow-green 561 | 615                | 567                             |
| PE-eFluor 610                    | PE-eFluor 610                    | Blue 488 or Yellow-green 561 | 606                | 565                             |
| PE-Fire 780                      | PE/Fire 780                      | Blue 488 or Yellow-green 561 | 780                | 565                             |
| PE-Alexa Fluor 610               | PE-Alexa Fluor 610               | Blue 488 or Yellow-green 561 | 627                | 567                             |
| PE-Alexa Fluor 700               | PE-Alexa Fluor 700               | Blue 488 or Yellow-green 561 | 721                | 566                             |
| Alexa Fluor 555                  | Alexa Fluor 555                  | Blue 488 or Yellow-green 561 | 568                | 553                             |
| Alexa Fluor 568                  | Alexa Fluor 568                  | Blue 488 or Yellow-green 561 | 603                | 579                             |
| Alexa Fluor 594                  | Alexa Fluor 594                  | Blue 488 or Yellow-green 561 | 618                | 590                             |
| Texas Red                        | Texas Red                        | Blue 488 or Yellow-green 561 | 613                | 595                             |
| Cy3                              | Cy3                              | Blue 488 or Yellow-green 561 | 568                | 554                             |
| Cy3.5                            | Cy3.5                            | Blue 488 or Yellow-green 561 | 589                | 576                             |
| DyLight 550                      | DyLight 550                      | Blue 488 or Yellow-green 561 | 568                | 553                             |
| APC                              | APC (allophycocyanin)            | Red 640                      | 660                | 651                             |
| APC-Cy7                          | APC/Cy7                          | Red 640                      | 775                | 755                             |
| APC-H7                           | APC/H7                           | Red 640                      | 780                | 755                             |
| APC-Fire 750                     | APC/Fire-750                     | Red 640                      | 787                | 754                             |
| APC-eFluor 780                   | APC-eFluor 780                   | Red 640                      | 785                | 755                             |
| APC-Alexa Fluor 750              | APC-Alexa Fluor 750              | Red 640                      | 785                | 756                             |
| Alexa Fluor 647                  | Alexa Fluor 647                  | Red 640                      | 671                | 650                             |
| Alexa Fluor 660                  | Alexa Fluor 660                  | Red 640                      | 691                | 663                             |
| Alexa Fluor 680                  | Alexa Fluor 680                  | Red 640                      | 704                | 681                             |
| Alexa Fluor 700                  | Alexa Fluor 700                  | Red 640                      | 719                | 696                             |
| eFluor 660                       | eFluor 660                       | Red 640                      | 668                | 651                             |
| Cy5                              | Cy5                              | Red 640                      | 668                | 644                             |
| Cy5.5                            | Cy5.5                            | Red 640                      | 690                | 672                             |
| Cy7                              | Cy7                              | Red 640                      | 775                | 749                             |
| DyLight 649                      | DyLight 649                      | Red 640                      | 673                | 651                             |
| iFluor 647                       | iFluor 647                       | Red 640                      | 670                | 654                             |
| CF647                            | CF647                            | Red 640                      | 668                | 652                             |
| Alexa Fluor 790                  | Alexa Fluor 790                  | Near-IR 808                  | 805                | 782                             |
| IRDye 800CW                      | IRDye 800CW                      | Near-IR 808                  | 792                | 773                             |
| IRDye 680RD                      | IRDye 680RD                      | Near-IR 808                  | 693                | 671                             |
| Zombie UV                        | Zombie UV                        | UV 355                       | 453                | 359                             |
| LIVE/DEAD Fixable Blue           | LIVE/DEAD Fixable Blue           | UV 355                       | 441                | 342                             |
| Zombie Aqua                      | Zombie Aqua                      | Violet 405                   | 510                | 382                             |
| Zombie Violet                    | Zombie Violet                    | Violet 405                   | 421                | 400                             |
| Zombie Yellow                    | Zombie Yellow                    | Violet 405                   | 572                | 395                             |
| LIVE/DEAD Fixable Aqua           | LIVE/DEAD Fixable Aqua           | Violet 405                   | 525                | 370                             |
| LIVE/DEAD Fixable Violet         | LIVE/DEAD Fixable Violet         | Violet 405                   | 455                | 402                             |
| LIVE/DEAD Fixable Yellow         | LIVE/DEAD Fixable Yellow         | Violet 405                   | 550                | 400                             |
| Fixable Viability Dye eFluor 450 | Fixable Viability Dye eFluor 450 | Violet 405                   | 446                | 405                             |
| Fixable Viability Dye eFluor 506 | Fixable Viability Dye eFluor 506 | Violet 405                   | 506                | 409                             |
| Zombie Green                     | Zombie Green                     | Blue 488                     | 515                | 490                             |
| LIVE/DEAD Fixable Green          | LIVE/DEAD Fixable Green          | Blue 488                     | 526                | 497                             |
| Zombie Red                       | Zombie Red                       | Yellow-green 561             | 623                | 599                             |
| Zombie NIR                       | Zombie NIR                       | Red 640                      | 746                | 718                             |
| LIVE/DEAD Fixable Near-IR        | LIVE/DEAD Fixable Near-IR        | Red 640                      | 775                | 750                             |
| Fixable Viability Dye eFluor 780 | Fixable Viability Dye eFluor 780 | Red 640                      | 785                | 754                             |
| SYTOX Blue                       | SYTOX Blue                       | Violet 405                   | 470                | 445                             |
| 7-AAD                            | 7-AAD                            | Blue 488                     | 648                | 548                             |
| propidium iodide                 | Propidium Iodide                 | Blue 488                     | 622                | 537                             |
| PI                               | Propidium iodide (PI)            | Blue 488                     | 617                | 305                             |
| SYTOX Green                      | SYTOX Green                      | Blue 488                     | 524                | 504                             |
| DRAQ7                            | DRAQ7                            | Red 640                      | 676                | 596                             |
| SYTOX Red                        | SYTOX Red                        | Red 640                      | 658                | 640                             |
| TO-PRO-3                         | TO-PRO-3                         | Red 640                      | 657                | 642                             |
| GFP                              | EGFP                             | Blue 488                     | 507                | 488                             |
| EGFP                             | EGFP                             | Blue 488                     | 507                | 488                             |
| mNeonGreen                       | mNeonGreen                       | Blue 488                     | 517                | 506                             |
| YFP                              | EYFP                             | Blue 488                     | 527                | 513                             |
| tdTomato                         | tdTomato                         | Blue 488 or Yellow-green 561 | 581                | 554                             |
| mCherry                          | mCherry                          | Blue 488 or Yellow-green 561 | 610                | 587                             |
| DsRed                            | DsRed                            | Blue 488 or Yellow-green 561 | 583                | 558                             |
| mKate2                           | mKate2                           | Blue 488 or Yellow-green 561 | 633                | 588                             |
| mScarlet                         | mScarlet                         | Blue 488 or Yellow-green 561 | 594                | 569                             |
| iRFP                             | iRFP713                          | Red 640                      | 713                | 690                             |
