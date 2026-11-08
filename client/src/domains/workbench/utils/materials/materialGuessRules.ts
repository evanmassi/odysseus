import type { MaterialLexiconGroup } from './materialLexicon';

export interface KeywordRule {
  pattern: RegExp;
  group: MaterialLexiconGroup;
  type: string;
  why?: string;
}

interface HeadingRule {
  pattern: RegExp;
  group: MaterialLexiconGroup;
}

interface RepositoryRule {
  pattern: RegExp;
  repository: string;
}

export const KEY_RESOURCES_HEADER_ROW = /^(reagent or resource|resource|reagent)\s+(source)\b/i;

export const KEY_RESOURCES_HEADINGS: readonly HeadingRule[] = [
  { pattern: /^antibodies$/i, group: 'ab' },
  { pattern: /^(bacterial and virus strains|virus strains|bacterial strains)$/i, group: 'bio' },
  { pattern: /^(biological samples)$/i, group: 'bio' },
  { pattern: /^(chemicals|chemicals, peptides,? and recombinant proteins)$/i, group: 'chem' },
  { pattern: /^(critical commercial assays|commercial assays|kits)$/i, group: 'kits' },
  { pattern: /^(experimental models: cell lines|cell lines)$/i, group: 'bio' },
  {
    pattern: /^(experimental models: organisms\/strains|organisms\/strains|organisms)$/i,
    group: 'bio',
  },
  { pattern: /^(oligonucleotides|primers)$/i, group: 'mol' },
  { pattern: /^(recombinant dna|plasmids)$/i, group: 'mol' },
  { pattern: /^(software and algorithms|software)$/i, group: 'soft' },
  { pattern: /^(deposited data)$/i, group: 'soft' },
  { pattern: /^(other|consumables|supplies)$/i, group: 'supplies' },
  { pattern: /^(equipment|instruments)$/i, group: 'equip' },
  { pattern: /^(media|buffers|media and buffers|solutions)$/i, group: 'media' },
];

export const REPOSITORY_ACCESSIONS: readonly RepositoryRule[] = [
  { pattern: /^(GSE|GSM|GPL|GDS)\d+$/i, repository: 'GEO' },
  { pattern: /^(SRR|SRX|SRP|SRS|ERR|ERX|ERP|DRR)\d+$/i, repository: 'SRA' },
  { pattern: /^PRJ(NA|EB|DB)\d+$/i, repository: 'BioProject' },
  { pattern: /^E-(MTAB|GEOD|MEXP)-\d+$/i, repository: 'ArrayExpress' },
  { pattern: /^PXD\d+$/i, repository: 'PRIDE' },
  { pattern: /^MSV\d+$/i, repository: 'MassIVE' },
  { pattern: /^EGA[SD]\d+$/i, repository: 'EGA' },
  { pattern: /^phs\d+/i, repository: 'dbGaP' },
  { pattern: /^FR-FCM-\w+$/i, repository: 'FlowRepository' },
  { pattern: /^SDY\d+$/i, repository: 'ImmPort' },
  { pattern: /^EMD-\d+$/i, repository: 'EMDB' },
  { pattern: /^10\.\d{4,}\/\S+$/, repository: 'DOI' },
  { pattern: /^\d[A-Za-z0-9]{3}$/, repository: 'PDB' },
];

export const KEYWORD_RULES: readonly KeywordRule[] = [
  { pattern: /\bkits?\b/i, group: 'kits', type: 'Kit' },
  { pattern: /\b(assay|isolation|microbeads|enrichment)\b/i, group: 'kits', type: 'Kit' },
  { pattern: /\b(standards?|calibrators?)\b/i, group: 'chem', type: 'Standard' },
  { pattern: /\b(fix(ation|ative)?|perm(eabilization)?)\b/i, group: 'media', type: 'Fix or perm' },
  { pattern: /\b(mounting|mountant|antifade)\b/i, group: 'media', type: 'Mounting medium' },
  { pattern: /\b(buffer|solution|wash|diluent|blocking|block)\b/i, group: 'media', type: 'Buffer' },
  { pattern: /\b(medium|media|broth)\b/i, group: 'media', type: 'Medium' },
  { pattern: /\bstock\b/i, group: 'media', type: 'Stock solution' },
  {
    pattern: /\b(primers?|oligos?|fwd|rev|forward|reverse)\b|[_-](f|r|fw|rv|fwd)$/i,
    group: 'mol',
    type: 'Oligo',
  },
  { pattern: /\bprobes?\b/i, group: 'mol', type: 'Probe' },
  {
    pattern: /\b(si|sh|sg|g|cr)rnas?\b|\b(si|sh|sg)[A-Z0-9][\w-]*/,
    group: 'mol',
    type: 'siRNA or guide RNA',
  },
  { pattern: /\b(plasmids?|vectors?|constructs?)\b/i, group: 'mol', type: 'Plasmid' },
  {
    pattern: /^p(cDNA|[A-Z])[A-Za-z0-9.()+-]{2,}/,
    group: 'mol',
    type: 'Plasmid',
    why: 'reads as a plasmid name',
  },
  { pattern: /\b(master ?mix|supermix|ready ?mix)\b/i, group: 'mol', type: 'Master mix' },
  { pattern: /\b(ladder)\b/i, group: 'mol', type: 'Ladder' },
  { pattern: /\bpeptides?\b/i, group: 'chem', type: 'Peptide' },
  {
    pattern:
      /\b(inhibitors?|antagonists?|agonists?|blockers?|drugs?|compounds?)\b|\w(inib|tinib|ciclib|parib|rafenib|lisib|zomib|limus)\b/i,
    group: 'chem',
    type: 'Drug or inhibitor',
  },
  {
    pattern: /\b(antibiotics?)\b|\w(mycin|micin|cillin|floxacin)\b/i,
    group: 'chem',
    type: 'Antibiotic or selection agent',
  },
  { pattern: /\b(transfection|transduction)\b/i, group: 'chem', type: 'Transfection reagent' },
  { pattern: /\b(stimulation|stimulant|activator|adjuvant)\b/i, group: 'chem', type: 'Stimulant' },
  {
    pattern: /^[A-Z][a-z]{2}[A-Z0-9]{0,2}[IVX]{1,4}(-HF)?$/,
    group: 'chem',
    type: 'Enzyme',
    why: 'reads as a restriction enzyme',
  },
  { pattern: /\w{3,}ases?\b/i, group: 'chem', type: 'Enzyme' },
  {
    pattern: /\b(recombinant|cytokines?|growth factors?|chemokines?)\b/i,
    group: 'chem',
    type: 'Recombinant protein',
  },
  { pattern: /\b(organoids?|spheroids?)\b/i, group: 'bio', type: '3D culture' },
  {
    pattern: /\b(cell lines?|clone \d+|knockout line|reporter line)\b/i,
    group: 'bio',
    type: 'Cell line',
  },
  {
    pattern: /\b(cells|splenocytes|thymocytes|lymphocytes|leukocytes|blasts)\b/i,
    group: 'bio',
    type: 'Primary cells',
  },
  {
    pattern:
      /(-\/-|−\/−|\+\/-|fl\/fl|\bcre\b|cre[-\s]?ert|\bko\b|knock-?out|knock-?in|transgenic|littermates|\bmice\b|\bmouse strain\b|\brats\b)/i,
    group: 'bio',
    type: 'Organism',
  },
  {
    pattern: /\b(virus|viral|lenti\w*|aav\w*|adeno\w*|retro\w*|phage|pseudovirus|vlps?)\b/i,
    group: 'bio',
    type: 'Virus or vector',
  },
  {
    pattern: /\b(serum|plasma|blood|csf|urine|saliva|sputum|stool|lavage)\b/i,
    group: 'bio',
    type: 'Body fluid',
  },
  {
    pattern: /\b(tissue|biopsy|biopsies|tumou?rs?|sections?|ffpe|explants?|resection)\b/i,
    group: 'bio',
    type: 'Tissue',
  },
  { pattern: /\b(lysates?|extracts?)\b/i, group: 'bio', type: 'Protein sample' },
  { pattern: /\b(rna|cdna|gdna|dna)\b/i, group: 'bio', type: 'Nucleic acid sample' },
  { pattern: /\b(beads?)\b/i, group: 'ab', type: 'Beads' },
  { pattern: /\b(dyes?|stains?|tracker|probe dye)\b/i, group: 'ab', type: 'Dye' },
  {
    pattern: /\b(antibody|antibodies|mab|igg|polyclonal|monoclonal|isotype)\b/i,
    group: 'ab',
    type: 'Antibody',
  },
  { pattern: /\b(extract|peptone|tryptone|powder|salt|acid)\b/i, group: 'chem', type: 'Chemical' },
  {
    pattern: /\b(software|app|package|pipeline|script|template)\b/i,
    group: 'soft',
    type: 'Software',
  },
  { pattern: /\b(dataset|data set|accession|repository)\b/i, group: 'soft', type: 'Dataset' },
  {
    pattern:
      /\w(meter|scope|cytometer|counter|centrifuge|incubator|reader|cycler|sequencer|imager|sonicator|shaker|cabinet|hood|bath|freezer|fridge|refrigerator|balance|autoclave|pump|robot|analy[sz]er|system|instrument|machine|station|separator|washer)\b/i,
    group: 'equip',
    type: 'Instrument',
  },
  {
    pattern:
      /\b(pipettes?|reservoirs?|syringes?|needles?|gloves|cuvettes?|scrapers?|consumables?)\b/i,
    group: 'supplies',
    type: 'Other',
  },
];

export const DECISIVE_KEYWORD_TYPES: ReadonlySet<string> = new Set([
  'Oligo',
  'Probe',
  'siRNA or guide RNA',
  'Plasmid',
  'Master mix',
  'Ladder',
  'Standard',
  'Kit',
]);

export const ANTIBODY_STOP_WORDS: ReadonlySet<string> = new Set([
  'anti',
  'antibody',
  'antibodies',
  'ab',
  'mab',
  'monoclonal',
  'polyclonal',
  'purified',
  'unconjugated',
  'conjugated',
  'clone',
  'human',
  'mouse',
  'rat',
  'rabbit',
  'goat',
  'donkey',
  'hamster',
  'armenian',
  'chicken',
  'sheep',
  'rhesus',
  'primate',
  'hu',
  'ms',
  'leaf',
  'totalseq',
  'ultraleaf',
  'functional',
  'grade',
  'invivomab',
  'biotin',
  'biotinylated',
  'hrp',
  'isotype',
  'control',
  'ctrl',
  'recombinant',
  'rea',
  'for',
  'flow',
  'ihc',
  'wb',
  'if',
  'facs',
  'cytometry',
  'and',
  'with',
  'the',
  'of',
  'in',
  'to',
  'per',
  'test',
  'capture',
  'detection',
  'primary',
  'secondary',
  'reactive',
  'reactivity',
  'host',
  'igg',
  'igg1',
  'igg2a',
  'igg2b',
  'igg2c',
  'igg3',
  'igm',
  'kappa',
  'k',
  'lambda',
  'cite',
  'seq',
  'staining',
  'stain',
  'surface',
  'intracellular',
  'nuclear',
]);
