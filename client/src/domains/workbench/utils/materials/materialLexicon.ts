import { BUILT_IN_CATALOG, dyeLaserLabel } from '../dyes/dyeCatalog';

import type { DyeKind } from '../dyes/dyeList';

export type MaterialLexiconGroup =
  | 'bio'
  | 'ab'
  | 'chem'
  | 'media'
  | 'kits'
  | 'mol'
  | 'supplies'
  | 'equip'
  | 'soft';

interface MaterialLexiconEntry {
  group: MaterialLexiconGroup;
  type: string;
  values: Readonly<Record<string, string>>;
  names: string;
  isGeneric?: boolean;
}

const DYE_MATERIAL_TARGETS: Readonly<Partial<Record<DyeKind, string>>> = {
  viability: 'Viability',
  dna: 'DNA',
};

const DYE_MATERIAL_ENTRIES: readonly MaterialLexiconEntry[] = BUILT_IN_CATALOG.dyes.flatMap(dye => {
  const target = DYE_MATERIAL_TARGETS[dye.kind];
  if (!target) return [];
  const values: Record<string, string> = { target, laser: dyeLaserLabel(dye) };
  if (dye.kind === 'viability') values['fixable'] = dye.isFixable ? 'Yes' : 'No';
  return {
    group: 'ab',
    type: 'Dye',
    values,
    names: [dye.name, ...dye.aliases].join('|'),
  };
});

export const MATERIAL_LEXICON: readonly MaterialLexiconEntry[] = [
  {
    group: 'bio',
    type: 'Cell line',
    values: { species: 'Human' },
    names:
      'HeLa|HEK293|HEK 293|HEK293T|293T|293FT|HEK-Blue|Expi293|Expi293F|Jurkat|Jurkat E6.1|K562|THP-1|U937|A549|MCF-7|MCF 10A|MDA-MB-231|MDA-MB-468|T47D|BT-474|SK-BR-3|HepG2|Huh7|Hep3B|HCT116|HT-29|Caco-2|SW480|SW620|LoVo|DLD-1|SH-SY5Y|PC-3|LNCaP|DU145|22Rv1|U2OS|U-2 OS|Saos-2|HL-60|Raji|Daudi|Ramos|MOLT-4|CCRF-CEM|Kasumi-1|KG-1|MOLM-13|MV4-11|OCI-AML3|NALM6|Nalm-6|RPMI 8226|U266|MM.1S|NK-92|A431|A375|SK-MEL-28|U87|U-87 MG|U251|T98G|NCI-H460|H460|NCI-H1299|H1299|Calu-3|BEAS-2B|HaCaT|IMR-90|WI-38|MRC-5|HAP1|Panc-1|MIA PaCa-2|OVCAR-3|SKOV3|SK-OV-3|RPE-1|hTERT RPE-1|ARPE-19|HT-1080|Karpas 299|SUP-T1|WTC-11|FaDu|Cal-27',
  },
  {
    group: 'bio',
    type: 'Cell line',
    values: { species: 'Mouse' },
    names:
      'NIH/3T3|NIH 3T3|3T3|3T3-L1|RAW 264.7|J774|J774A.1|B16|B16-F10|B16F10|B16-OVA|4T1|CT26|MC38|LLC|Lewis lung carcinoma|EL4|E.G7-OVA|A20|Ba/F3|YAC-1|P815|C2C12|Neuro-2a|N2a|L929|NSC-34|Hepa 1-6|E0771|KPC|TC-1|ID8|BV-2|MC3T3-E1|P19|CTLL-2|DO11.10|WEHI-3|WEHI-164|L1210|P388|Sp2/0|NS0|EMT6|Renca|Pan02|GL261|AT-3|MEF|MEFs',
  },
  {
    group: 'bio',
    type: 'Cell line',
    values: { species: 'Chinese hamster' },
    names: 'CHO|CHO-K1|CHO-S|ExpiCHO|CHO DG44',
  },
  {
    group: 'bio',
    type: 'Cell line',
    values: { species: 'African green monkey' },
    names: 'Vero|Vero E6|COS-7|COS-1',
  },
  { group: 'bio', type: 'Cell line', values: { species: 'Dog' }, names: 'MDCK' },
  { group: 'bio', type: 'Cell line', values: { species: 'Hamster' }, names: 'BHK-21' },
  { group: 'bio', type: 'Cell line', values: { species: 'Rat' }, names: 'PC12|H9c2|INS-1|INS-1E' },
  {
    group: 'bio',
    type: 'Cell line',
    values: { species: 'Insect' },
    names: 'Sf9|Sf21|High Five|S2|Schneider 2',
  },
  {
    group: 'bio',
    type: 'Primary cells',
    values: {},
    names:
      'PBMC|PBMCs|splenocytes|thymocytes|bone marrow cells|BMDM|BMDMs|BMDC|BMDCs|HUVEC|HUVECs|T cells|CD4+ T cells|CD8+ T cells|naive T cells|B cells|NK cells|monocytes|macrophages|dendritic cells|neutrophils|eosinophils|basophils|mast cells|hepatocytes|keratinocytes|fibroblasts|astrocytes|microglia|neurons|cardiomyocytes|iPSC|iPSCs|hESC|hESCs|MSC|MSCs|cord blood|buffy coat|leukapheresis|Tregs|Treg|TILs|lymph node cells|whole splenocytes|HSPC|HSPCs|CD34+ cells',
  },
  {
    group: 'bio',
    type: '3D culture',
    values: {},
    names: 'organoid|organoids|spheroid|spheroids|tumoroid|tumoroids|enteroid|enteroids|colonoid',
  },
  {
    group: 'bio',
    type: 'Organism',
    values: { species: 'Mouse' },
    names:
      'C57BL/6|C57BL/6J|C57BL/6N|B6|BALB/c|BALB/cJ|NSG|NOD|NOD/SCID|NOD scid gamma|SCID|nude mice|CD-1|ICR|FVB|FVB/N|DBA/2|C3H|129|OT-I|OT-II|Rag1-/-|Rag2-/-|B6.SJL|CD45.1 mice|mice|Mus musculus',
  },
  {
    group: 'bio',
    type: 'Organism',
    values: { species: 'Rat' },
    names: 'Sprague-Dawley|Wistar|Long-Evans|Lewis rats|rats|Rattus norvegicus',
  },
  {
    group: 'bio',
    type: 'Organism',
    values: {},
    names:
      'zebrafish|Danio rerio|Drosophila|Drosophila melanogaster|C. elegans|Caenorhabditis elegans|Xenopus|Xenopus laevis|Arabidopsis|Arabidopsis thaliana|N2 worms',
  },
  {
    group: 'bio',
    type: 'Microbial strain',
    values: {},
    names:
      'E. coli|Escherichia coli|DH5α|DH5alpha|DH10B|BL21|BL21(DE3)|Rosetta|Stbl3|TOP10|One Shot TOP10|XL1-Blue|NEB Stable|NEB 5-alpha|S. aureus|Staphylococcus aureus|MRSA|P. aeruginosa|Pseudomonas aeruginosa|PAO1|PA14|Salmonella|S. Typhimurium|Listeria|L. monocytogenes|M. tuberculosis|Mycobacterium tuberculosis|H37Rv|BCG|S. cerevisiae|Saccharomyces cerevisiae|yeast|Candida albicans|B. subtilis|Bacillus subtilis|Lactobacillus|Bacteroides|Klebsiella|Klebsiella pneumoniae|Streptococcus pneumoniae|Agrobacterium|C. difficile|Clostridioides difficile',
  },
  {
    group: 'bio',
    type: 'Virus or vector',
    values: { 'virus-type': 'Lentivirus' },
    names: 'lentivirus|lentiviral|lentiviral particles|lenti',
  },
  {
    group: 'bio',
    type: 'Virus or vector',
    values: { 'virus-type': 'AAV' },
    names: 'AAV|AAV1|AAV2|AAV5|AAV6|AAV8|AAV9|AAV-DJ|AAV2/9|AAV-PHP.eB|rAAV',
  },
  {
    group: 'bio',
    type: 'Virus or vector',
    values: { 'virus-type': 'Adenovirus' },
    names: 'adenovirus|Ad5|adenoviral',
  },
  {
    group: 'bio',
    type: 'Virus or vector',
    values: { 'virus-type': 'Retrovirus' },
    names: 'retrovirus|retroviral|MSCV retrovirus|gammaretrovirus',
  },
  {
    group: 'bio',
    type: 'Virus or vector',
    values: {},
    names:
      'HIV-1|SIV|influenza|influenza A|PR8|H1N1|SARS-CoV-2|VSV|vaccinia|MVA|HSV-1|HSV-2|CMV|MCMV|LCMV|LCMV Armstrong|LCMV clone 13|Sendai virus|Zika virus|dengue virus|RSV|EBV|baculovirus|bacteriophage|phage|lambda phage|M13 phage',
  },
  {
    group: 'bio',
    type: 'Nucleic acid sample',
    values: { 'nucleic-acid': 'RNA' },
    names: 'RNA|total RNA|mRNA|cDNA',
  },
  {
    group: 'bio',
    type: 'Nucleic acid sample',
    values: { 'nucleic-acid': 'DNA' },
    names: 'gDNA|genomic DNA|DNA',
  },
  {
    group: 'bio',
    type: 'Protein sample',
    values: {},
    names:
      'lysate|cell lysate|whole cell lysate|tissue lysate|nuclear extract|cytoplasmic extract|supernatant|culture supernatant|conditioned medium',
  },
  {
    group: 'bio',
    type: 'Tissue',
    values: {},
    names:
      'spleen|lymph node|lymph nodes|thymus|liver|lung|kidney|heart|brain|skin|intestine|colon|small intestine|tumor|tumour|biopsy|tissue|FFPE block|tissue section|tumor tissue|bone marrow',
  },
  {
    group: 'bio',
    type: 'Body fluid',
    values: { fluid: 'Whole blood' },
    names: 'whole blood|peripheral blood|blood|cord blood sample',
  },
  {
    group: 'bio',
    type: 'Body fluid',
    values: { fluid: 'Plasma' },
    names: 'plasma|EDTA plasma|heparin plasma|citrate plasma',
  },
  {
    group: 'bio',
    type: 'Body fluid',
    values: { fluid: 'Serum' },
    names: 'patient serum|serum samples|mouse serum|sera',
  },
  { group: 'bio', type: 'Body fluid', values: { fluid: 'CSF' }, names: 'CSF|cerebrospinal fluid' },
  { group: 'bio', type: 'Body fluid', values: { fluid: 'Urine' }, names: 'urine' },
  {
    group: 'bio',
    type: 'Body fluid',
    values: { fluid: 'Other' },
    names:
      'saliva|sputum|stool|BAL fluid|bronchoalveolar lavage|synovial fluid|ascites|milk sample',
  },
  {
    group: 'ab',
    type: 'Dye',
    values: { target: 'Viability', fixable: 'Yes' },
    names: 'LIVE/DEAD|Fixable Viability Dye|FVD|FVS|Ghost Dye|viability dye|live/dead stain',
  },
  ...DYE_MATERIAL_ENTRIES,
  {
    group: 'ab',
    type: 'Dye',
    values: { target: 'DNA' },
    names: 'SYBR Green I|EdU|BrdU',
  },
  {
    group: 'ab',
    type: 'Dye',
    values: { target: 'Mitochondria' },
    names:
      'MitoTracker|MitoTracker Red|MitoTracker Green|MitoTracker Deep Red|MitoTracker Red CMXRos|TMRM|TMRE|JC-1|MitoSOX|MitoSOX Red',
  },
  {
    group: 'ab',
    type: 'Dye',
    values: { target: 'Membrane' },
    names: 'DiI|DiO|DiD|DiR|PKH26|PKH67|WGA|wheat germ agglutinin|CellMask',
  },
  {
    group: 'ab',
    type: 'Dye',
    values: {},
    names:
      'CFSE|CellTrace Violet|CellTrace Far Red|CellTrace Yellow|CellTrace CFSE|CTV|phalloidin|Annexin V|calcein|Calcein AM|LysoTracker|ER-Tracker|DCFDA|H2DCFDA|CellROX|Fluo-4|Fura-2|Indo-1|crystal violet|trypan blue|hematoxylin|eosin|H&E|Oil Red O|Alizarin Red|Alcian blue|Sirius red|Picrosirius red|Ponceau S|Coomassie|Coomassie blue|SYPRO Ruby|SYBR Safe|SYBR Gold|ethidium bromide|EtBr|GelRed|GelGreen|BODIPY|Nile red|filipin|lectin',
  },
  {
    group: 'ab',
    type: 'Secondary reagent',
    values: {},
    names: 'streptavidin|SA|avidin|ExtrAvidin|NeutrAvidin|anti-biotin',
  },
  {
    group: 'ab',
    type: 'Secondary reagent',
    values: { conjugate: 'HRP' },
    names: 'streptavidin-HRP|SA-HRP|Avidin-HRP',
  },
  {
    group: 'ab',
    type: 'Multimer',
    values: {},
    names:
      'tetramer|tetramers|dextramer|pentamer|multimer|MHC tetramer|MHC-I tetramer|MHC-II tetramer|CD1d tetramer|MR1 tetramer',
  },
  {
    group: 'ab',
    type: 'Fc block',
    values: {},
    names:
      'Fc block|FcR block|Fc receptor block|FcR blocking reagent|TruStain FcX|Human TruStain FcX|Human Fc Block|Mouse Fc Block|anti-CD16/32|CD16/32|2.4G2|True-Stain Monocyte Blocker|Fc blocker',
  },
  {
    group: 'ab',
    type: 'Beads',
    values: { purpose: 'Compensation' },
    names:
      'UltraComp eBeads|UltraComp eBeads Plus|OneComp eBeads|AbC Total Antibody Compensation Bead Kit|ArC Amine Reactive Compensation Bead Kit|compensation beads|comp beads|CompBeads|BD CompBeads',
  },
  {
    group: 'ab',
    type: 'Beads',
    values: { purpose: 'Counting' },
    names:
      'CountBright|CountBright Absolute Counting Beads|counting beads|Precision Count Beads|123count eBeads|AccuCount',
  },
  {
    group: 'ab',
    type: 'Beads',
    values: { purpose: 'Calibration' },
    names:
      'CS&T beads|CS&T|Rainbow beads|SPHERO Rainbow|calibration beads|SpectroFlo QC beads|QC beads|8-peak beads|CytoFLEX daily QC',
  },
  {
    group: 'ab',
    type: 'Beads',
    values: { purpose: 'Stimulation' },
    names:
      'Dynabeads Human T-Activator CD3/CD28|Dynabeads Mouse T-Activator CD3/CD28|T-Activator|Dynabeads|CD3/CD28 beads|TransAct|ImmunoCult CD3/CD28 T Cell Activator',
  },
  {
    group: 'chem',
    type: 'Solvent',
    values: {},
    names:
      'DMSO|dimethyl sulfoxide|ethanol|EtOH|70% ethanol|methanol|MeOH|isopropanol|2-propanol|acetone|chloroform|phenol|phenol:chloroform|acetonitrile|DMF|water|nuclease-free water|ddH2O|dH2O|Milli-Q water|DEPC water|distilled water|ultrapure water|hexane|xylene|toluene|TRIzol|TRI Reagent|QIAzol',
  },
  {
    group: 'chem',
    type: 'Chemical',
    values: {},
    names:
      'NaCl|sodium chloride|KCl|potassium chloride|MgCl2|magnesium chloride|CaCl2|calcium chloride|Tris|Tris-HCl|Tris base|EDTA|EGTA|glycine|SDS|sodium dodecyl sulfate|Triton X-100|Tween-20|Tween 20|Tween-80|NP-40|IGEPAL CA-630|saponin|digitonin|BSA|bovine serum albumin|sodium azide|NaN3|glucose|D-glucose|sucrose|glycerol|DTT|dithiothreitol|TCEP|PMSF|sodium orthovanadate|sodium fluoride|sulfuric acid|H2SO4|hydrochloric acid|HCl|NaOH|sodium hydroxide|acetic acid|sodium bicarbonate|NaHCO3|sodium carbonate|sodium citrate|citric acid|ammonium chloride|NH4Cl|ammonium persulfate|APS|TEMED|acrylamide|bis-acrylamide|acrylamide/bis|agarose|low-melt agarose|urea|guanidine hydrochloride|imidazole|ATP|ADP|GTP|NADH|NADPH|dNTPs|dNTP|dNTP mix|skim milk|nonfat dry milk|non-fat milk|milk powder|casein|trehalose|mannitol|sorbitol|PEG|PEG 8000|polyethylene glycol|ammonium sulfate|potassium phosphate|yeast extract|tryptone|peptone|casamino acids|bacto agar|sodium phosphate|Na2HPO4|KH2PO4|ZnCl2|FeSO4|CuSO4|MnCl2|LiCl|CsCl|iodixanol|OptiPrep|Ficoll|Ficoll-Paque|Ficoll-Paque PLUS|Percoll|Lymphoprep|heparin|sodium heparin|protease inhibitor cocktail|cOmplete|cOmplete Mini|phosphatase inhibitor cocktail|PhosSTOP|Halt protease inhibitor|hydrogen peroxide|H2O2|sodium butyrate|cobalt chloride|CoCl2|EZ-Link Sulfo-NHS-Biotin|biotin|glutathione|ascorbic acid|ascorbate|retinoic acid|L-cysteine',
  },
  {
    group: 'chem',
    type: 'Drug or inhibitor',
    values: {},
    names:
      'staurosporine|brefeldin A|BFA|monensin|GolgiPlug|GolgiStop|protein transport inhibitor|rapamycin|sirolimus|everolimus|wortmannin|LY294002|MG132|MG-132|bortezomib|cycloheximide|CHX|actinomycin D|nocodazole|paclitaxel|taxol|colchicine|cisplatin|carboplatin|oxaliplatin|doxorubicin|etoposide|5-FU|5-fluorouracil|gemcitabine|methotrexate|dexamethasone|hydrocortisone|forskolin|Y-27632|ROCK inhibitor|CHIR99021|CHIR|SB431542|LDN-193189|dorsomorphin|XAV939|IWP-2|DAPT|imatinib|dasatinib|ibrutinib|ruxolitinib|tofacitinib|trametinib|selumetinib|vemurafenib|dabrafenib|U0126|PD0325901|SP600125|SB203580|BAY 11-7082|Z-VAD-FMK|Q-VD-OPh|chloroquine|bafilomycin A1|3-MA|3-methyladenine|tunicamycin|thapsigargin|oligomycin|FCCP|rotenone|antimycin A|2-DG|2-deoxyglucose|metformin|cyclosporin A|CsA|FK506|tacrolimus|tamoxifen|4-OHT|4-hydroxytamoxifen|doxycycline|dox|IPTG|ATRA|calcitriol|JQ1|olaparib|palbociclib|venetoclax|ABT-199|navitoclax|nutlin-3|SAHA|vorinostat|TSA|trichostatin A|5-azacytidine|decitabine|tazemetostat|DMOG|NAC|N-acetylcysteine|Trolox|aspirin|ibuprofen|indomethacin|celecoxib|FTY720|fingolimod|anisomycin|puromycin aminonucleoside|blebbistatin|cytochalasin D|latrunculin A|nigericin|valinomycin|ouabain|tetrodotoxin|TTX|bicuculline|CNQX|APV|D-AP5|NMDA|glutamate|carbachol|isoproterenol|propranolol|epinephrine|norepinephrine|dopamine|serotonin|histamine|acetylcholine|insulin glargine|dapagliflozin|empagliflozin|vehicle',
  },
  {
    group: 'chem',
    type: 'Recombinant protein',
    values: {},
    names:
      'insulin|transferrin|leptin|adiponectin|thrombin|fibrinogen|albumin|human serum albumin|HSA|ovalbumin|OVA|KLH|streptavidin protein|protein A|protein G|GFP protein|Cas9 protein|SpCas9 protein',
  },
  {
    group: 'chem',
    type: 'Enzyme',
    values: {},
    names:
      'trypsin|trypsin-EDTA|0.25% trypsin-EDTA|0.05% trypsin-EDTA|TrypLE|TrypLE Express|TrypLE Select|Accutase|Accumax|collagenase|collagenase I|collagenase II|collagenase IV|collagenase D|dispase|liberase|Liberase TL|Liberase TM|DNase I|DNase|RNase A|RNase H|RNaseOUT|RNase inhibitor|SUPERase-In|proteinase K|benzonase|papain|hyaluronidase|pepsin|elastase|Taq|Taq polymerase|Phusion|Phusion polymerase|Q5|Q5 High-Fidelity DNA Polymerase|KAPA HiFi|Pfu|PrimeSTAR|PrimeSTAR GXL|T4 DNA ligase|T4 ligase|T7 RNA polymerase|SuperScript III|SuperScript IV|M-MLV|M-MLV reverse transcriptase|reverse transcriptase|Klenow|Klenow fragment|T4 PNK|T4 polynucleotide kinase|CIP|rSAP|Antarctic phosphatase|Cas9|SpCas9|Cas9 nuclease|Alt-R Cas9|Cas12a|Cpf1|TEV protease|PreScission protease|enterokinase|lysozyme|alkaline phosphatase|luciferase|neuraminidase|PNGase F|Endo H|sortase|uracil-DNA glycosylase|UDG|Exonuclease I|ExoI|Dpn I',
  },
  {
    group: 'chem',
    type: 'Antibiotic or selection agent',
    values: { purpose: 'Contamination control' },
    names:
      'penicillin-streptomycin|pen/strep|pen-strep|PenStrep|P/S|antibiotic-antimycotic|anti-anti|gentamicin|amphotericin B|Fungizone|Normocin|Plasmocin|Primocin|penicillin|streptomycin|ciprofloxacin|MycoZap',
  },
  {
    group: 'chem',
    type: 'Antibiotic or selection agent',
    values: { purpose: 'Selection' },
    names:
      'puromycin|blasticidin|blasticidin S|G418|geneticin|hygromycin|hygromycin B|zeocin|ampicillin|carbenicillin|kanamycin|chloramphenicol|tetracycline|spectinomycin|vancomycin|nourseothricin|bleomycin|ganciclovir|6-thioguanine|HAT|HAT supplement',
  },
  {
    group: 'chem',
    type: 'Transfection reagent',
    values: {},
    names:
      'Lipofectamine|Lipofectamine 2000|Lipofectamine 3000|Lipofectamine RNAiMAX|Lipofectamine LTX|Lipofectamine MessengerMAX|RNAiMAX|PEI|polyethylenimine|PEI MAX|PEIpro|FuGENE|FuGENE HD|FuGENE 6|jetPRIME|jetPEI|jetOPTIMUS|TransIT-LT1|TransIT-X2|TransIT|X-tremeGENE|X-tremeGENE HP|Polybrene|hexadimethrine bromide|LentiBOOST|RetroNectin|Viromer|calcium phosphate|ExpiFectamine|ExpiFectamine 293|Lipofectamine CRISPRMAX|DharmaFECT|siPORT|Effectene|TurboFect|GeneJuice',
  },
  {
    group: 'chem',
    type: 'Stimulant',
    values: {},
    names:
      "PMA|phorbol 12-myristate 13-acetate|ionomycin|PMA/ionomycin|PMA/Iono|LPS|lipopolysaccharide|poly(I:C)|poly I:C|polyIC|poly(dA:dT)|CpG|CpG ODN|ODN 1826|ODN 2006|ODN 2395|R848|resiquimod|imiquimod|Pam3CSK4|Pam2CSK4|flagellin|zymosan|curdlan|MDP|muramyl dipeptide|cGAMP|2'3'-cGAMP|DMXAA|PHA|phytohemagglutinin|PHA-L|ConA|concanavalin A|SEB|staphylococcal enterotoxin B|SEA|Cell Stimulation Cocktail|nigericin|MSU|MSU crystals|alum|Alhydrogel|CFA|complete Freund's adjuvant|IFA|incomplete Freund's adjuvant|anti-CD3/CD28|PepTivator|peptide pool|PepMix|CEF peptide pool|tuberculin|PPD|heat-killed|TNF stimulation",
  },
  {
    group: 'chem',
    type: 'Peptide',
    values: {},
    names:
      'SIINFEKL|OVA 257-264|OVA257-264|OVA 323-339|OVA323-339|gp33|gp33-41|gp100|NY-ESO-1 peptide|MOG 35-55|MOG35-55|PLP 139-151|amyloid beta|Aβ42|Abeta42|scrambled peptide|TAT peptide|NLS peptide|FLAG peptide|3xFLAG peptide|HA peptide',
  },
  {
    group: 'chem',
    type: 'Standard',
    values: {},
    names:
      'standard|standards|standard curve|calibrator|BSA standard|protein standard|DNA standard|quantification standard|reference standard|internal standard|spike-in|ERCC spike-in',
  },
  {
    group: 'chem',
    type: 'Detection reagent',
    values: { detection: 'Colorimetric' },
    names:
      'TMB|TMB substrate|TMB solution|ABTS|OPD|pNPP|DAB|DAB substrate|NBT/BCIP|BCIP/NBT|MTT|MTS|WST-1|WST-8|CCK-8|XTT|resazurin|alamarBlue|PrestoBlue|crystal violet solution',
  },
  {
    group: 'chem',
    type: 'Detection reagent',
    values: { detection: 'Chemiluminescent' },
    names:
      'ECL|ECL substrate|Western ECL|SuperSignal|SuperSignal West Pico|SuperSignal West Pico PLUS|SuperSignal West Femto|SuperSignal West Dura|SuperSignal West Atto|Clarity ECL|Clarity Western ECL|Clarity Max|Immobilon|Immobilon Western|D-luciferin|luciferin|coelenterazine|furimazine|Bright-Glo|Steady-Glo|ONE-Glo|Nano-Glo substrate|QuantaBlu|Lumigen',
  },
  {
    group: 'chem',
    type: 'Detection reagent',
    values: { detection: 'Fluorescent' },
    names: 'Amplex Red|AmplexRed|QuantaRed|Amplex UltraRed|fluorescein substrate|4-MUP|MUG',
  },
  {
    group: 'media',
    type: 'Medium',
    values: {},
    names:
      "DMEM|DMEM high glucose|DMEM low glucose|RPMI|RPMI 1640|RPMI-1640|IMDM|MEM|EMEM|α-MEM|alpha-MEM|aMEM|MEM alpha|Opti-MEM|Opti-MEM I|OptiMEM|F-12|Ham's F-12|F12|F-12K|DMEM/F12|DMEM/F-12|Advanced DMEM/F12|McCoy's 5A|L-15|Leibovitz's L-15|Medium 199|M199|Williams' E|Williams E|X-VIVO 15|X-VIVO 20|AIM-V|AIM V|TexMACS|ImmunoCult-XF|ImmunoCult|StemSpan|StemSpan SFEM|StemSpan SFEM II|mTeSR|mTeSR1|mTeSR Plus|Essential 8|E8|Essential 6|StemFlex|Neurobasal|Neurobasal-A|Neurobasal Plus|BrainPhys|EGM-2|EGM-2 MV|SmGM-2|KGM|KGM-Gold|keratinocyte SFM|MammoCult|PneumaCult|PneumaCult-ALI|IntestiCult|HepatiCult|MesenCult|FreeStyle 293|FreeStyle 293 Expression Medium|Expi293 Expression Medium|ExpiCHO Expression Medium|CD CHO|Sf-900 III|Sf-900 II|ESF 921|Grace's insect medium|Schneider's Drosophila medium|LB|LB broth|Luria broth|LB agar|LB Miller|LB Lennox|TB|terrific broth|SOC|SOC medium|SOB|2xYT|2YT|YPD|YPD broth|YPD agar|M9|M9 minimal medium|BHI|brain heart infusion|Middlebrook 7H9|7H9|7H10|7H11|TSB|tryptic soy broth|TSA plates|MacConkey|MacConkey agar|blood agar|Mueller-Hinton|Mueller-Hinton broth|FluoroBrite|FluoroBrite DMEM|Hybridoma-SFM|CryoStor|CryoStor CS10|Bambanker|Recovery Cell Culture Freezing Medium|Synth-a-Freeze|CELLBANKER|mFreSR|StemCellBanker",
  },
  {
    group: 'media',
    type: 'Buffer',
    values: {},
    names:
      "PBS|DPBS|D-PBS|Dulbecco's PBS|HBSS|DPBS with calcium and magnesium|TBS|Tris-buffered saline|TAE|TBE|TE|TE buffer|MOPS SDS running buffer|MES SDS running buffer|Tris-glycine buffer|running buffer|transfer buffer|RIPA|RIPA buffer|RIPA lysis buffer|Laemmli|Laemmli buffer|Laemmli sample buffer|LDS sample buffer|NuPAGE LDS|sample buffer|loading dye|6x loading dye|gel loading dye|ACK|ACK lysing buffer|ACK lysis buffer|RBC lysis buffer|red blood cell lysis buffer|BD Pharm Lyse|Pharm Lyse|FACS Lysing Solution|Annexin V binding buffer|binding buffer|autoMACS Running Buffer|MACS buffer|Cell Staining Buffer|Stain Buffer|BD Stain Buffer|Brilliant Stain Buffer|Brilliant Stain Buffer Plus|Super Bright Complete Staining Buffer|CellCover|Versene|citrate buffer|sodium citrate buffer|antigen retrieval buffer|carbonate buffer|bicarbonate buffer|Krebs-Ringer|Krebs buffer|Ringer's solution|Tyrode's|saline|normal saline|0.9% saline|ELISA coating buffer|Reagent Diluent|assay diluent|Assay Diluent A|Intercept blocking buffer|Odyssey blocking buffer|SuperBlock|StartingBlock|Pierce IP lysis buffer|NP-40 lysis buffer|M-PER|T-PER|RLT buffer|Buffer RLT|PE buffer|EB buffer|Buffer EB|PCR buffer|CutSmart|rCutSmart|NEBuffer|T4 ligase buffer|10x PCR buffer",
  },
  {
    group: 'media',
    type: 'Medium',
    values: {},
    names:
      'complete medium|complete media|complete RPMI|complete DMEM|complete IMDM|R10|R10 medium|D10|D10 medium|cRPMI|cDMEM|cIMDM|T cell medium|freezing medium|freeze medium|freezing media|culture medium|growth medium|differentiation medium|starvation medium|serum-free medium|assay medium|imaging medium',
  },
  {
    group: 'media',
    type: 'Buffer',
    values: {},
    names:
      'FACS buffer|flow buffer|flow cytometry buffer|staining buffer|wash buffer|washing buffer|blocking buffer|block buffer|blocking solution|coating buffer|stop solution|lysis buffer|elution buffer|diluent|complete medium|complete media|complete RPMI|complete DMEM|complete IMDM|R10|R10 medium|D10|D10 medium|cRPMI|cDMEM|cIMDM|T cell medium|freezing medium|freeze medium|freezing media|PBST|TBST|PBS-T|TBS-T|PBS/BSA|PBS-BSA|PBS/EDTA|digestion buffer|digestion mix|digestion medium|sorting buffer|sort buffer|MACS separation buffer|resuspension buffer|annealing buffer|hybridization buffer|permeabilization solution|quenching solution|neutralization buffer|culture medium|growth medium|differentiation medium|starvation medium|serum-free medium|assay medium|imaging medium|Krebs-HEPES|working solution',
  },
  {
    group: 'media',
    type: 'Supplement',
    values: {},
    names:
      'FBS|FCS|fetal bovine serum|fetal calf serum|heat-inactivated FBS|HI-FBS|HI FBS|dialyzed FBS|charcoal-stripped FBS|horse serum|human AB serum|human serum|goat serum|normal goat serum|donkey serum|normal donkey serum|rabbit serum|normal rat serum|mouse serum blocking|L-glutamine|GlutaMAX|GlutaMAX-I|NEAA|MEM NEAA|non-essential amino acids|sodium pyruvate|β-mercaptoethanol|beta-mercaptoethanol|2-mercaptoethanol|2-ME|BME|B-27|B27|B-27 supplement|N-2|N2 supplement|ITS|ITS-X|insulin-transferrin-selenium|HEPES|1 M HEPES|KnockOut Serum Replacement|KSR|BIT 9500|CTS Immune Cell SR|human platelet lysate|platelet lysate|MEM vitamins|lipid concentrate|chemically defined lipid concentrate|Albumax|AlbuMAX II|N-acetyl-L-cysteine|nicotinamide|gastrin|primocin supplement|CEPT cocktail|RevitaCell|CloneR|ROCK inhibitor supplement',
  },
  {
    group: 'media',
    type: 'Fix or perm',
    values: { 'fixative-or-detergent': 'Paraformaldehyde' },
    names:
      'PFA|paraformaldehyde|4% PFA|2% PFA|1% PFA|formaldehyde|16% formaldehyde|methanol-free formaldehyde|formalin|10% formalin|neutral buffered formalin|NBF|10% NBF|IC Fixation Buffer|BD Cytofix|Cytofix|Fixation Buffer|fixation buffer|fix buffer|BD Lyse/Fix|Lyse/Fix|Phosflow Lyse/Fix|BioLegend Fixation Buffer',
  },
  {
    group: 'media',
    type: 'Fix or perm',
    values: { 'fixative-or-detergent': 'Glutaraldehyde' },
    names: "glutaraldehyde|2.5% glutaraldehyde|Karnovsky's fixative",
  },
  {
    group: 'media',
    type: 'Fix or perm',
    values: {},
    names:
      "Cytofix/Cytoperm|BD Cytofix/Cytoperm|Cytoperm|Perm/Wash|BD Perm/Wash|Perm/Wash buffer|Foxp3/Transcription Factor Staining Buffer Set|Foxp3 / Transcription Factor Staining Buffer Set|Foxp3 Fix/Perm|eBioscience Foxp3 Fix/Perm|Foxp3 Fix/Perm Buffer Set|True-Nuclear|True-Nuclear Transcription Factor Buffer Set|Fix/Perm|Fixation/Permeabilization|Fixation/Permeabilization Solution Kit|Intracellular Fixation & Permeabilization Buffer Set|Intracellular Staining Permeabilization Wash Buffer|Permeabilization Buffer|perm buffer|permeabilization buffer|Phosflow Perm Buffer III|Perm Buffer III|Cyto-Fast Fix/Perm|ice-cold methanol|90% methanol|Carnoy's|acetone fixation",
  },
  {
    group: 'media',
    type: 'Coating or matrix',
    values: {},
    names:
      'Matrigel|Corning Matrigel|Matrigel GFR|growth factor reduced Matrigel|Geltrex|Cultrex|Cultrex BME|collagen|collagen I|collagen type I|rat tail collagen|collagen IV|poly-L-lysine|PLL|poly-D-lysine|PDL|poly-L-ornithine|PLO|poly-HEMA|fibronectin|laminin|laminin-521|laminin-511|iMatrix-511|vitronectin|Vitronectin XF|gelatin|0.1% gelatin|Synthemax|CellStart|Cell-Tak|hyaluronic acid|alginate|agar|methylcellulose|MethoCult|hydrogel|PEG hydrogel',
  },
  {
    group: 'media',
    type: 'Mounting medium',
    values: {},
    names:
      'ProLong Gold|ProLong Gold Antifade|ProLong Diamond|ProLong Glass|VECTASHIELD|Vectashield|Fluoromount-G|Fluoromount|Mowiol|SlowFade|SlowFade Gold|Permount|antifade|antifade mountant|mounting medium|mountant|Aqua-Poly/Mount|Fluoroshield|EverBrite|DPX|Cytoseal',
  },
  {
    group: 'kits',
    type: 'Kit',
    values: {},
    names:
      "CellTiter-Glo|CellTiter-Glo 2.0|CellTiter-Glo 3D|CellTiter 96|CellTiter 96 AQueous One|CellTiter-Blue|CytoTox 96|CytoTox-Glo|LDH assay|LDH-Glo|Caspase-Glo|Caspase-Glo 3/7|RealTime-Glo|Dual-Glo|Dual-Luciferase|Dual-Luciferase Reporter Assay|Nano-Glo|Nano-Glo Dual-Luciferase|Luciferase Assay System|BCA|Pierce BCA|BCA Protein Assay|Micro BCA|Bradford|Bradford assay|Qubit dsDNA HS|Qubit dsDNA BR|Qubit RNA HS|Qubit Protein|Quant-iT PicoGreen|PicoGreen|RiboGreen|RNeasy|RNeasy Mini|RNeasy Micro|RNeasy Plus|RNeasy Plus Mini|DNeasy|DNeasy Blood & Tissue|QIAamp|QIAamp DNA Mini|QIAamp Viral RNA|QIAprep|QIAprep Spin Miniprep|QIAquick|QIAquick Gel Extraction|QIAquick PCR Purification|MinElute|Monarch|Monarch Plasmid Miniprep|Monarch Total RNA Miniprep|ZymoPURE|Zymo|Direct-zol|Direct-zol RNA Miniprep|Quick-RNA|PureLink|PureLink RNA Mini|miniprep|midiprep|maxiprep|HiSpeed Plasmid Maxi|EndoFree Plasmid Maxi|NucleoSpin|NucleoBond|iScript|iScript cDNA Synthesis|High-Capacity cDNA Reverse Transcription|SuperScript IV VILO|SuperScript VILO|LunaScript|PrimeScript RT|QuantiTect|DuoSet|DuoSet ELISA|Quantikine|Quantikine ELISA|ELISA MAX|LEGEND MAX|ELISA kit|ELISA|LEGENDplex|Bio-Plex|Bio-Plex Pro|Milliplex|CBA|Cytometric Bead Array|ProcartaPlex|MSD|V-PLEX|U-PLEX|Simoa|Olink|AlphaLISA|HTRF|EasySep|EasySep Human T Cell Isolation Kit|EasySep Mouse CD4+ T Cell Isolation Kit|RosetteSep|MicroBeads|MACS MicroBeads|Pan T Cell Isolation Kit|CD4+ T Cell Isolation Kit|Naive CD4+ T Cell Isolation Kit|Dynabeads Untouched|MojoSort|Annexin V Apoptosis Detection Kit|Click-iT EdU|Click-iT Plus EdU|BrdU Flow Kit|APC BrdU Flow Kit|Mycoplasma detection kit|MycoAlert|MycoStrip|MycoProbe|Nextera XT|Nextera|Illumina DNA Prep|TruSeq|TruSeq Stranded mRNA|NEBNext|NEBNext Ultra II|NEBNext Ultra II Directional RNA|Chromium Next GEM|Chromium Single Cell 3'|Chromium Single Cell 5'|SMART-Seq|SMART-Seq v4|In-Fusion|In-Fusion HD|NEBuilder HiFi|TOPO TA|TOPO TA Cloning|Zero Blunt TOPO|Gateway|LR Clonase|BP Clonase|Lenti-X GoStix|Lenti-X qRT-PCR Titration|p24 ELISA|P3 Primary Cell 4D-Nucleofector X Kit|Amaxa Nucleofector Kit|Neon Transfection Kit|Q5 Site-Directed Mutagenesis|QuikChange|QuikChange Lightning|Glutathione assay|GSH-Glo|ATP assay|Seahorse XF Cell Mito Stress Test|Mito Stress Test|Glycolysis Stress Test|Seahorse XF Glycolytic Rate|Pierce Protein A/G|Protein A/G beads|Protein A beads|Protein G beads|Dynabeads Protein G|Dynabeads Protein A|Anti-FLAG M2 Affinity Gel|Ni-NTA|Ni-NTA agarose|glutathione sepharose|SPRIselect|AMPure XP|ChIP kit|SimpleChIP|CUT&RUN|CUT&Tag|ATAC-seq kit|Senescence β-Galactosidase Staining Kit|TUNEL|TUNEL assay|In Situ Cell Death Detection Kit|ApoTox-Glo|Griess reagent|Griess assay|Bio-Rad Protein Assay|DC Protein Assay|RNAscope Multiplex Fluorescent|Opal|Opal 7-Color",
  },
  {
    group: 'mol',
    type: 'Oligo',
    values: {},
    names:
      "oligo dT|oligo(dT)|oligo(dT)20|random hexamers|random primers|primer|primers|primer pair|forward primer|reverse primer|M13 forward|M13 reverse|T7 promoter primer|CMV forward|hU6-F|LKO.1 5'",
  },
  {
    group: 'mol',
    type: 'Probe',
    values: {},
    names:
      'TaqMan probe|TaqMan assay|TaqMan Gene Expression Assay|PrimeTime|PrimeTime qPCR assay|molecular beacon|FISH probe|smFISH probe|RNAscope probe|RNAscope|Stellaris probes|HCR probes|in situ probe|riboprobe|DIG-labeled probe',
  },
  {
    group: 'mol',
    type: 'Plasmid',
    values: {},
    names:
      'psPAX2|pMD2.G|pMD2G|VSV-G plasmid|pCMV-VSV-G|pLKO.1|pLKO|lentiCRISPRv2|lentiCRISPR v2|lentiGuide-Puro|lentiCas9-Blast|pX330|pX458|pX459|pSpCas9|pcDNA3.1|pcDNA3|pcDNA3.1(+)|pUC19|pUC57|pET-28a|pET28a|pET-21a|pGEX|pGEX-4T-1|pEGFP-N1|pEGFP-C1|pLenti|pLVX|pCDH|pMSCV|pMIG|pRetroX|pAAV|pHelper|pAdDeltaF6|pRSV-Rev|pMDLg/pRRE|pGL3|pGL3-Basic|pGL4|pRL-TK|pRL-SV40|pBABE|pBABE-puro|pSUPER|pLJM1|FUGW|pHIV|pRRL|pCAG|pCAGGS|pBluescript|pGEM-T|pGEM-T Easy|pCR2.1|pCR-Blunt|pENTR|pDONR221|pDEST|pTRIPZ|pINDUCER20|pCW57.1|pMXs|pMSCV-IRES-GFP|MSCV-IRES-GFP|MigR1|reporter plasmid|expression plasmid|empty vector|control vector',
  },
  {
    group: 'mol',
    type: 'siRNA or guide RNA',
    values: {},
    names:
      'siRNA|siRNAs|shRNA|shRNAs|sgRNA|sgRNAs|gRNA|guide RNA|crRNA|tracrRNA|Alt-R crRNA|Alt-R tracrRNA|non-targeting siRNA|scrambled siRNA|non-targeting control|NTC sgRNA|ON-TARGETplus|SMARTpool|Silencer Select|Stealth RNAi|miRNA mimic|miRNA inhibitor|antagomir|ASO|antisense oligo|morpholino|gapmer',
  },
  {
    group: 'mol',
    type: 'Master mix',
    values: { chemistry: 'SYBR Green' },
    names:
      'SYBR Green Master Mix|PowerUp SYBR Green|PowerUp SYBR Green Master Mix|PowerTrack SYBR Green|Fast SYBR Green|iTaq Universal SYBR Green Supermix|SsoAdvanced Universal SYBR Green|SsoAdvanced|SsoFast EvaGreen|Luna Universal qPCR|KAPA SYBR FAST|SYBR Select|QuantiNova SYBR|SYBR Green|PowerSYBR',
  },
  {
    group: 'mol',
    type: 'Master mix',
    values: { chemistry: 'TaqMan' },
    names:
      'TaqMan Fast Advanced Master Mix|TaqMan Universal Master Mix|TaqMan Universal Master Mix II|TaqMan Gene Expression Master Mix|TaqMan Fast Virus 1-Step|Luna Universal Probe qPCR|iTaq Universal Probes Supermix|SsoAdvanced Universal Probes|PrimeTime Gene Expression Master Mix|ddPCR Supermix for Probes',
  },
  {
    group: 'mol',
    type: 'Master mix',
    values: {},
    names:
      'GoTaq|GoTaq Green|GoTaq Green Master Mix|OneTaq|OneTaq 2X Master Mix|Q5 Hot Start High-Fidelity 2X Master Mix|Q5 2X Master Mix|Phusion High-Fidelity PCR Master Mix|Phusion Master Mix|Platinum SuperFi|Platinum SuperFi II|DreamTaq|DreamTaq Green|KAPA HiFi HotStart ReadyMix|CloneAmp HiFi|PrimeSTAR Max|Gibson Assembly Master Mix|NEBuilder HiFi DNA Assembly Master Mix|PCR master mix|qPCR master mix|2x master mix|master mix|mastermix|supermix|Taq 2X Master Mix|Q5 High-Fidelity 2X Master Mix|LongAmp|Terra PCR Direct|Phire',
  },
  {
    group: 'mol',
    type: 'Ladder',
    values: {},
    names:
      '1 kb ladder|1 kb Plus ladder|1 kb Plus|100 bp ladder|50 bp ladder|GeneRuler|GeneRuler 1 kb|GeneRuler 100 bp|GeneRuler 1 kb Plus|Quick-Load 1 kb|Quick-Load Purple 1 kb|Quick-Load 100 bp|PageRuler|PageRuler Plus|PageRuler Prestained|Precision Plus Protein|Precision Plus Protein Dual Color|Precision Plus Protein All Blue|SeeBlue Plus2|Spectra Multicolor|Chameleon Duo|HiMark|Novex Sharp|BenchMark|protein ladder|DNA ladder|RNA ladder|molecular weight marker|MW marker|prestained protein ladder|Kaleidoscope',
  },
  {
    group: 'supplies',
    type: 'Other',
    values: {},
    names:
      'serological pipette|serological pipettes|stripette|pipette|pipettes|transfer pipette|Pasteur pipette|reservoir|reagent reservoir|syringe|syringes|needle|needles|gloves|nitrile gloves|parafilm|cuvette|cuvettes|electroporation cuvette|weigh boat|aluminum foil|Kimwipes|cryobox|freezer box|cell scraper|cell lifter|scalpel|forceps|scissors|plate seal|plate sealer film|sealing film|adhesive seal|MicroAmp optical adhesive film|aluminum seal|breathable seal|hemocytometer|counting chamber|Countess slides|transwell|Transwell insert|cell culture insert|Boyden chamber|µ-Slide|ibidi µ-Slide|Lab-Tek|Lab-Tek chamber slide|bottle|Nalgene bottle|media bottle|beaker|graduated cylinder|Erlenmeyer flask|spinner flask|bioreactor bag|G-Rex|blood collection tube|Vacutainer|EDTA tube|heparin tube|SepMate|SepMate-50|Leucosep|cryomold|OCT|Tissue-Tek OCT|embedding cassette|biopsy punch|cell spreader|inoculating loop|spreader|petri plates|bacterial plates|centrifugal filter|Amicon|Amicon Ultra|Slide-A-Lyzer|dialysis cassette|desalting column|Zeba spin column|magnet stand|spin column|lysis tubes|bead beating tubes|Lysing Matrix|razor blade|tape|lab tape|foil|zip tie|ice bucket|tube rack|FACS tube rack|kim wipes|bench paper|sharps container',
  },
  {
    group: 'equip',
    type: 'Instrument',
    values: {},
    names:
      'LSRFortessa|LSRFortessa X-20|BD LSRFortessa|Fortessa|LSR II|FACSymphony|FACSymphony A3|FACSymphony A5|FACSymphony S6|FACSCelesta|FACSLyric|FACSCanto|FACSCanto II|FACSCalibur|FACSMelody|FACSAria|FACSAria II|FACSAria III|FACSAria Fusion|FACSDiscover S8|Cytek Aurora|Aurora|Northern Lights|Cytek Northern Lights|Aurora CS|ID7000|SP6800|SA3800|Bigfoot|CytoFLEX|CytoFLEX S|CytoFLEX LX|CytoFLEX SRT|Attune|Attune NxT|Accuri|Accuri C6|Accuri C6 Plus|NovoCyte|NovoCyte Penteon|MACSQuant|MACSQuant Analyzer 10|MACSQuant Analyzer 16|MACSQuant Tyto|Guava easyCyte|ZE5|Helios|CyTOF|CyTOF XT|Hyperion|ImageStream|ImageStreamX|Amnis|SH800|Sony SH800|MA900|MoFlo|MoFlo Astrios|Astrios|BD Rhapsody|Chromium Controller|Chromium X|Chromium iX|NovaSeq|NovaSeq 6000|NovaSeq X|NextSeq|NextSeq 500|NextSeq 2000|MiSeq|iSeq|iSeq 100|MiniSeq|PacBio|Sequel|MinION|GridION|PromethION|Nanopore|Bioanalyzer|2100 Bioanalyzer|TapeStation|4200 TapeStation|Fragment Analyzer|NanoDrop|NanoDrop One|NanoDrop 2000|Qubit|Qubit 4|Qubit Flex|QuantStudio|QuantStudio 3|QuantStudio 5|QuantStudio 6|QuantStudio 7|QuantStudio 12K|CFX96|CFX Opus|CFX Opus 96|CFX384|CFX Connect|LightCycler|LightCycler 480|LightCycler 96|StepOnePlus|StepOne|7500 Fast|ViiA 7|QX200|QX600|QIAcuity|C1000 Touch|T100|ProFlex|SimpliAmp|Veriti|Mastercycler|Mastercycler nexus|SpectraMax|SpectraMax M5|SpectraMax i3x|SpectraMax iD3|SpectraMax iD5|SpectraMax Plus 384|Synergy|Synergy H1|Synergy HTX|Synergy Neo2|CLARIOstar|PHERAstar|FLUOstar|POLARstar|Varioskan|Varioskan LUX|EnVision|EnSpire|EnSight|VICTOR Nivo|GloMax|GloMax Discover|Infinite M200|Infinite 200 PRO|Infinite M Plex|Spark|Tecan Spark|Cytation|Cytation 5|Cytation 7|Luminex 200|FLEXMAP 3D|MAGPIX|INTELLIFLEX|Bio-Plex 200|MESO QuickPlex SQ 120|MSD QuickPlex|Simoa HD-X|SR-X|Incucyte|IncuCyte S3|Incucyte SX5|EVOS|EVOS M5000|EVOS M7000|EVOS FL|EVOS XL|LSM 880|LSM 900|LSM 980|Zeiss LSM 880|Leica SP8|Leica Stellaris|Stellaris|Nikon A1|Nikon A1R|Nikon Ti2|Nikon Eclipse|Olympus FV3000|Olympus IX83|Axio Observer|Axio Imager|Axioscan|Lionheart|Operetta|Operetta CLS|Opera Phenix|ImageXpress|CellInsight|Celigo|ChemiDoc|ChemiDoc MP|ChemiDoc XRS+|Gel Doc|Gel Doc EZ|Gel Doc XR+|Odyssey|Odyssey CLx|Odyssey DLx|Odyssey M|LI-COR Odyssey|iBright|iBright CL1500|Amersham Imager 680|ImageQuant 800|Typhoon|Typhoon FLA 9500|iBlot|iBlot 2|iBlot 3|Trans-Blot Turbo|Trans-Blot|Mini-PROTEAN|Mini-PROTEAN Tetra|XCell SureLock|Mini Gel Tank|PowerPac|PowerPac Basic|Neon|Neon Transfection System|Neon NxT|4D-Nucleofector|Nucleofector|Nucleofector 2b|Gene Pulser|Gene Pulser Xcell|MaxCyte|Countess|Countess II|Countess 3|Countess 3 FL|Vi-CELL|Vi-CELL BLU|Vi-CELL XR|Cellometer|Cellometer K2|LUNA-II|LUNA-FL|NucleoCounter|NC-200|Sorvall|Sorvall Legend|Sorvall ST 16R|Allegra X-15R|Avanti J-26|Optima XE|Eppendorf 5810R|5810R|5424R|5430R|5702|Heraeus Megafuge|Megafuge|Heracell|Heracell VIOS|Forma Steri-Cycle|Galaxy 170 S|Bioruptor|Bioruptor Pico|Covaris|Covaris M220|TissueLyser|TissueLyser II|Precellys|gentleMACS|gentleMACS Octo Dissociator|gentleMACS Dissociator|DynaMag|DynaMag-2|DynaMag-15|EasySep magnet|EasyEights|QuadroMACS|MidiMACS|MiniMACS|OctoMACS|autoMACS|autoMACS Pro|AKTA|ÄKTA|ÄKTA pure|ÄKTA start|FPLC|HPLC|UPLC|LC-MS|LC-MS/MS|Orbitrap|Orbitrap Exploris|Orbitrap Eclipse|Q Exactive|timsTOF|Seahorse|Seahorse XFe96|Seahorse XFe24|Seahorse XF Pro|XFe96|IVIS|IVIS Spectrum|IVIS Lumina|Echo 525|Opentrons|Opentrons OT-2|OT-2|Hamilton STAR|Biomek|Biomek i7|Tecan Fluent|Tecan EVO|Maxwell RSC|KingFisher|KingFisher Flex|QIAcube|QIAcube Connect|SpeedVac|Octet|Biacore|ThermoMixer|Thermomixer C|cryostat|Leica CM1950|microtome|vibratome|Leica VT1200',
  },
  {
    group: 'equip',
    type: 'Instrument',
    values: {},
    names:
      'centrifuge|benchtop centrifuge|microcentrifuge|minicentrifuge|ultracentrifuge|refrigerated centrifuge|plate centrifuge|swinging bucket centrifuge|flow cytometer|cytometer|cell sorter|sorter|spectral cytometer|spectral analyzer|mass cytometer|plate reader|microplate reader|luminometer|spectrophotometer|fluorometer|qPCR machine|qPCR instrument|real-time PCR system|thermocycler|thermal cycler|PCR machine|droplet reader|droplet generator|digital PCR|sequencer|microscope|fluorescence microscope|inverted microscope|light microscope|confocal|confocal microscope|spinning disk|spinning disk confocal|widefield microscope|dissecting microscope|stereo microscope|stereomicroscope|slide scanner|high-content imager|live-cell imager|gel imager|western blot imager|blot imager|imager|gel box|electrophoresis chamber|electrophoresis tank|power supply|transfer apparatus|semi-dry transfer|electroporator|cell counter|automated cell counter|CO2 incubator|incubator|shaking incubator|bacterial incubator|hypoxia chamber|hypoxia incubator|orbital shaker|shaker|plate shaker|rocker|rocking platform|nutator|rotator|tube rotator|vortex|vortexer|vortex mixer|heat block|dry bath|heating block|water bath|bead bath|sonicator|probe sonicator|bath sonicator|homogenizer|bead beater|tissue dissociator|biosafety cabinet|BSC|tissue culture hood|TC hood|laminar flow hood|fume hood|PCR hood|PCR workstation|-80 freezer|-80 °C freezer|-80|-20 freezer|-20 °C freezer|freezer|refrigerator|fridge|4 °C fridge|cold room|liquid nitrogen|liquid nitrogen tank|LN2|LN2 dewar|dewar|Mr. Frosty|CoolCell|controlled-rate freezer|autoclave|balance|analytical balance|scale|pH meter|stir plate|magnetic stirrer|hot plate|hot plate stirrer|pipette controller|Pipet-Aid|pipet-aid|multichannel pipette|electronic pipette|repeater pipette|pipettor|pipettors|plate washer|microplate washer|ELISA washer|magnet|magnetic separator|cell separator|MACS separator|liquid handler|pipetting robot|lyophilizer|freeze dryer|vacuum concentrator|vacuum pump|vacuum aspirator|aspirator|chromatography system|mass spectrometer|osmometer|cell analyzer|metabolic analyzer|in vivo imager|ultrasound|irradiator|X-ray irradiator|cesium irradiator|UV crosslinker|UV transilluminator|transilluminator|blue light transilluminator|ice machine|dry ice|microwave|timer|thermometer',
    isGeneric: true,
  },
  {
    group: 'soft',
    type: 'Software',
    values: {},
    names:
      'FlowJo|FCS Express|OMIQ|Cytobank|SpectroFlo|FACSDiva|BD FACSDiva|Diva|Kaluza|CytExpert|FlowLogic|Floreada|Attune NxT software|MACSQuantify|GraphPad Prism|Prism|GraphPad|ImageJ|Fiji|CellProfiler|CellProfiler Analyst|QuPath|Imaris|ZEN|ZEN Blue|ZEN Black|NIS-Elements|LAS X|Volocity|Harmony|Columbus|MetaMorph|Ilastik|napari|Cellpose|StarDist|HALO|inForm|Visiopharm|RStudio|R Studio|Python|Jupyter|MATLAB|Excel|Microsoft Excel|Google Sheets|SPSS|Stata|SAS|JMP|SnapGene|SnapGene Viewer|Benchling|Geneious|Geneious Prime|ApE|Vector NTI|Cell Ranger|Space Ranger|Loupe Browser|Seurat|Scanpy|Bioconductor|DESeq2|edgeR|limma|Bowtie2|BWA|HISAT2|Salmon|kallisto|featureCounts|MACS2|GSEA|Ingenuity Pathway Analysis|Metascape|DAVID|Enrichr|Cytoscape|PyMOL|ChimeraX|UCSF Chimera|AlphaFold|ColabFold|BLAST|Primer-BLAST|Primer3|CRISPick|CHOPCHOP|Gen5|SoftMax Pro|MARS|Magellan|i-control|QuantStudio Design & Analysis|Design & Analysis|CFX Maestro|CFX Manager|Image Lab|Image Studio|Empiria Studio|LEGENDplex Data Analysis|LEGENDplex Qognit|Bio-Plex Manager|xPONENT|Belysa|Incucyte software|Seahorse Wave|Wave|Living Image|MaxQuant|Proteome Discoverer|Skyline|Perseus|MSFragger|FragPipe|Spectronaut|DIA-NN|Agilent 2100 Expert|FlowJo Plugin|Flowing Software|CytoExploreR|flowCore|CATALYST|Spectre|Excel template|analysis template|acquisition template|experiment template',
  },
  {
    group: 'soft',
    type: 'Dataset',
    values: {},
    names:
      'GEO|SRA|ArrayExpress|PRIDE|Zenodo|figshare|Dryad|Mendeley Data|ImmPort|dbGaP|EGA|PDB|EMDB|FlowRepository|Cytobank dataset|ProteomeXchange|MassIVE|BioStudies|Single Cell Portal|CELLxGENE|Human Cell Atlas|deposited data|raw data|dataset|source data',
  },
];

export const CONJUGATE_LEXICON =
  'HRP|horseradish peroxidase|AP|biotin|biotinylated|digoxigenin|DIG|Ultra-LEAF|LEAF';

export const TARGET_LEXICON =
  'GFP|EGFP|YFP|RFP|mCherry|tdTomato|HLA-DR|HLA-A2|HLA-ABC|HLA-E|HLA-G|MHC I|MHC II|MHCII|MHC class I|MHC class II|I-A/I-E|IA/IE|H-2Kb|H-2Db|H-2Kd|TCRb|TCRβ|TCR beta|TCRab|TCRαβ|TCRgd|TCRγδ|TCR Vβ|Vα2|Vα7.2|Vβ5|Vδ1|Vδ2|Vγ9|CCR2|CCR4|CCR5|CCR6|CCR7|CCR9|CCR10|CXCR3|CXCR4|CXCR5|CXCR6|CX3CR1|PD-1|PD-L1|PD-L2|CTLA-4|LAG-3|TIM-3|TIGIT|2B4|ICOS|OX40|4-1BB|GITR|KLRG1|NKG2D|NKG2A|NKG2C|NKp30|NKp44|NKp46|NK1.1|DX5|Ly6C|Ly-6C|Ly6G|Ly-6G|Ly6A/E|Gr-1|F4/80|B220|Sca-1|c-Kit|Thy1.1|Thy1.2|Thy-1|IgD|IgM|IgG|IgA|IgE|FcεRI|FceRIa|FoxP3|T-bet|GATA3|GATA-3|RORγt|RORgt|Eomes|TCF1|TCF-1|TCF7|TOX|Bcl-6|Bcl-2|Blimp-1|IRF4|IRF8|PU.1|Ki-67|Ki67|Helios|Granzyme B|GzmB|Granzyme A|Granzyme K|Perforin|Granulysin|EpCAM|E-cadherin|N-cadherin|vimentin|pan-cytokeratin|cytokeratin|CK19|CK8|β-actin|beta-actin|actin|GAPDH|tubulin|α-tubulin|β-tubulin|β-III tubulin|vinculin|lamin B1|histone H3|H3|H3K27me3|H3K4me3|H3K27ac|H3K9me3|γH2AX|gH2AX|p53|p21|p16|caspase-3|cleaved caspase-3|PARP|cleaved PARP|LC3B|LC3|p62|SQSTM1|mTOR|AKT|pAKT|p-AKT|ERK|pERK|p-ERK|ERK1/2|STAT1|STAT3|STAT5|STAT6|pSTAT1|pSTAT3|pSTAT5|pSTAT6|S6|pS6|NF-κB|NF-kB|p65|IκBα|Myc|c-Myc|MYC|GFP tag|FLAG|HA|HA tag|His tag|6xHis|V5|Myc tag|Strep-tag|GST|Ig kappa|Igκ|Ig lambda|Igλ|CD45.1|CD45.2|Ter119|TER-119|Siglec-F|SiglecF|Siglec-H|MerTK|XCR1|Clec9a|DEC-205|IL-7Rα|IL-7Ra|CLA|PSGL-1|Ly108|SLAMF6|SLAMF7|CD45RA|CD45RO|CD45RB|BTLA|VISTA|CD39|CD73|NRP1|Nrp1|ST2|KLRB1|MAIT|iNKT|PLZF|ROR-γt|AhR|Sox2|Oct4|Nanog|Pax6|Nestin|GFAP|NeuN|MAP2|Iba1|Olig2|MBP|Synapsin|PSD-95|Tuj1|α-SMA|alpha-SMA|SMA|CD31 PECAM|PECAM-1|VE-cadherin|vWF|LYVE-1|Podoplanin|Prox1|collagen I antibody|fibronectin antibody|E-selectin|P-selectin|ICAM-1|VCAM-1|LFA-1|VLA-4|integrin β7|α4β7|β7 integrin|Annexin A1|HMGB1|calreticulin|HSP70|HSP90|ubiquitin|K48-ubiquitin|K63-ubiquitin|phospho-tyrosine|pY|Ser473|Thr308|cyclin D1|cyclin B1|CDK4|CDK6|Rb|pRb|E2F1|Survivin|BAX|BAK|BIM|Mcl-1|XIAP|Caspase-8|Caspase-9|RIPK1|RIPK3|MLKL|pMLKL|NLRP3|ASC|Gasdermin D|GSDMD|IL-1β|pro-IL-1β|cGAS|STING|IRF3|pIRF3|TBK1|pTBK1|MAVS|RIG-I|MDA5|TLR4|TLR7|TLR9|MyD88|TRIF|PD1|PDL1|CTLA4|LAG3|TIM3|Tim-3|41BB|OX-40';

export const CYTOKINE_LEXICON =
  'IFN-α|IFN-alpha|IFNa|IFN-β|IFN-beta|IFNb|IFN-γ|IFN-gamma|IFNg|IFNγ|interferon gamma|interferon alpha|interferon beta|IFN-λ|IFN-lambda|TNF|TNF-α|TNFa|TNF-alpha|TNFα|LT-α|lymphotoxin|TGF-β|TGF-β1|TGFb|TGFb1|TGF-beta|TGF-beta1|GM-CSF|M-CSF|G-CSF|Flt3L|Flt3 ligand|FLT3L|SCF|stem cell factor|TPO|thrombopoietin|EPO|erythropoietin|EGF|FGF|bFGF|FGF2|FGF-2|FGF4|FGF7|FGF10|KGF|VEGF|VEGF-A|VEGF165|PDGF|PDGF-BB|PDGF-AA|HGF|IGF-1|IGF-I|IGF-2|BMP2|BMP-2|BMP4|BMP-4|BMP7|Wnt3a|Wnt-3a|Activin A|Noggin|R-spondin|R-spondin 1|Rspo1|RSPO1|Nodal|Shh|SHH|sonic hedgehog|BDNF|GDNF|NGF|NT-3|CNTF|LIF|oncostatin M|OSM|CXCL1|CXCL2|CXCL8|CXCL9|CXCL10|CXCL12|CXCL13|SDF-1|SDF-1α|CCL2|CCL3|CCL4|CCL5|RANTES|CCL17|CCL19|CCL20|CCL21|CCL22|MCP-1|MIP-1α|MIP-1β|IP-10|RANKL|TRAIL|FasL|BAFF|APRIL|TSLP|IL-33 |GDF15|Midkine|angiopoietin|Ang-1|Ang-2|DLL1|DLL4|Jagged-1|Jagged1|SLIT2|Netrin-1|Semaphorin 3A|Sema3A|ephrin-B2|Gas6|VEGF-C|PlGF|amphiregulin|AREG|heregulin|neuregulin|NRG1|TWEAK|LIGHT|IL-1RA|IL1RA|IL-2 complex|IL-15/IL-15Rα|IL-15 superagonist';

export const VENDOR_LEXICON =
  'Thermo Fisher=Thermo=ThermoFisher=Thermo Fisher Scientific=Thermo Scientific|Invitrogen|Gibco|Life Technologies|Applied Biosystems|Molecular Probes|eBioscience|Pierce|Nunc|Ambion|BioLegend|BD=BD Biosciences=Becton Dickinson|BD Pharmingen=Pharmingen|BD Horizon|Sigma=Sigma-Aldrich|Millipore=MilliporeSigma=Merck=Merck Millipore=EMD Millipore|Corning|Falcon|Costar|Promega|Qiagen|QIAGEN|NEB=New England Biolabs|Bio-Rad=BioRad|Abcam|Cell Signaling=Cell Signaling Technology=CST|R&D Systems=R&D=R and D Systems|Bio-Techne|PeproTech|Miltenyi=Miltenyi Biotec|STEMCELL=STEMCELL Technologies=StemCell|Takara=Takara Bio|Clontech|Lonza|ATCC|Addgene|IDT=Integrated DNA Technologies|Eurofins|GenScript|Twist Bioscience=Twist|Agilent|Beckman Coulter=Beckman|Sartorius|Eppendorf|Greiner=Greiner Bio-One|Sarstedt|VWR|Avantor|Fisher=Fisher Scientific|Roche|Illumina|10x Genomics|Enzo|Enzo Life Sciences|Cayman=Cayman Chemical|Selleck=Selleckchem=Selleck Chemicals|MedChemExpress=MCE|Tocris|InvivoGen|Biotium|Cytiva|GE Healthcare|Bethyl|Proteintech|Novus=Novus Biologicals|Leinco|Bio X Cell=BioXCell|Sino Biological|ACROBiosystems=Acro|Akoya|Standard BioTools=Fluidigm|Sony|Zeiss|Leica|Nikon|Olympus|Evident|Cytek|Tonbo|Santa Cruz=Santa Cruz Biotechnology=SCBT|Jackson ImmunoResearch=Jackson|Vector Laboratories=Vector Labs|Rockland|Southern Biotech=SouthernBiotech|Biosearch Technologies|Horizon Discovery|Dharmacon|Synthego|Origene=OriGene|VectorBuilder|Charles River|Jackson Laboratory=The Jackson Laboratory=JAX|Taconic|Envigo|Inotiv|Zymo Research|Lucigen|Kapa Biosystems|Meso Scale Discovery|Quanterix|Olink Proteomics|PerkinElmer=Revvity|Tecan|BioTek|Molecular Devices|Hamilton|Opentrons|Labcyte|Rainin|Gilson|Mettler Toledo|Nalgene|Ibidi|Matek|Electron Microscopy Sciences=EMS|Ted Pella|Polysciences|Alfa Aesar|TCI|Acros|Spectrum Chemical|Biowest|HyClone|Atlas Biologicals|Gemini Bio=GeminiBio|Wisent|Capricorn|PAN-Biotech|Irvine Scientific|Biological Industries|Sartorius Stedim|Pall|Millex|Whatman|GE Whatman|Thermo Nunc|Ibidi GmbH|MatTek|Celltreat|TPP|Biofil|Axygen|USA Scientific|Bioline|Meridian Bioscience|Quantabio|Vazyme|Yeasen|Abclonal=ABclonal|Boster|Elabscience|Biossance|Biogems|Absolute Antibody|Exbio|Beckman Coulter Life Sciences|Sysmex|Partec|Luminex|Bio-Techne R&D';
