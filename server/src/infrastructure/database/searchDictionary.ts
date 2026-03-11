/**
 * Search Reference Data
 *
 * Synonym mappings, reverse lookups, and stop words consumed by the search query preprocessor.
 */

export const LAB_SYNONYMS: Record<string, string[]> = {
  // Cell type variations
  'ipsc': ['ipsc', 'ipscs', 'induced pluripotent stem cell', 'induced pluripotent stem cells', 'ips cell', 'ips cells'],
  'hesc': ['hesc', 'hescs', 'human embryonic stem cell', 'human embryonic stem cells', 'hes cell', 'hes cells'],
  'hek': ['hek', 'hek293', 'hek 293', 'hek-293', 'human embryonic kidney'],
  'cho': ['cho', 'cho cell', 'cho cells', 'chinese hamster ovary'],
  'hela': ['hela', 'he la', 'he-la'],
  'jurkat': ['jurkat', 'jurkat cell', 'jurkat cells'],
  'pbmc': ['pbmc', 'pbmcs', 'peripheral blood mononuclear cell', 'peripheral blood mononuclear cells'],

  // T cell variations
  't cell': ['t cell', 't cells', 't-cell', 't-cells', 'tcell', 'tcells', 't lymphocyte', 't lymphocytes'],
  'car t': ['car t', 'car-t', 'cart', 'car t cell', 'car t cells', 'car-t cell', 'car-t cells', 'chimeric antigen receptor t'],
  'cd4': ['cd4', 'cd4+', 'cd4 t cell', 'cd4 t cells', 'cd4+ t cell', 'cd4+ t cells', 'helper t cell', 'helper t cells'],
  'cd8': ['cd8', 'cd8+', 'cd8 t cell', 'cd8 t cells', 'cd8+ t cell', 'cd8+ t cells', 'cytotoxic t cell', 'cytotoxic t cells', 'killer t cell'],
  'treg': ['treg', 'tregs', 't reg', 't-reg', 'regulatory t cell', 'regulatory t cells'],

  // B cell variations
  'b cell': ['b cell', 'b cells', 'b-cell', 'b-cells', 'bcell', 'bcells', 'b lymphocyte', 'b lymphocytes'],

  // NK cell variations
  'nk cell': ['nk cell', 'nk cells', 'nk-cell', 'nk-cells', 'natural killer cell', 'natural killer cells', 'nk'],

  // Stem cell variations
  'stem cell': ['stem cell', 'stem cells', 'stem-cell', 'stem-cells', 'stemcell', 'stemcells', 'sc'],
  'msc': ['msc', 'mscs', 'mesenchymal stem cell', 'mesenchymal stem cells', 'mesenchymal stromal cell'],
  'hsc': ['hsc', 'hscs', 'hematopoietic stem cell', 'hematopoietic stem cells'],

  // Neural variations
  'neuron': ['neuron', 'neurons', 'neuronal cell', 'neuronal cells', 'nerve cell', 'nerve cells'],
  'astrocyte': ['astrocyte', 'astrocytes', 'astroglia', 'astroglial cell'],
  'microglia': ['microglia', 'microglial cell', 'microglial cells'],

  // Cardiac variations
  'cardiomyocyte': ['cardiomyocyte', 'cardiomyocytes', 'cardiac myocyte', 'cardiac myocytes', 'heart cell', 'heart cells', 'cm'],

  // Fibroblast variations
  'fibroblast': ['fibroblast', 'fibroblasts', 'fib', 'fb'],

  // Epithelial variations
  'epithelial': ['epithelial', 'epithelial cell', 'epithelial cells', 'epithelia'],
  'endothelial': ['endothelial', 'endothelial cell', 'endothelial cells', 'huvec', 'ec'],

  // Culture conditions
  'passage': ['passage', 'p', 'pass'],
  'confluent': ['confluent', 'confluence'],
  'frozen': ['frozen', 'cryopreserved', 'cryo'],
  'fresh': ['fresh', 'unfrozen', 'live'],

  // Media types
  'dmem': ['dmem', 'd-mem', 'dulbecco'],
  'rpmi': ['rpmi', 'rpmi-1640', 'rpmi 1640'],
  'mem': ['mem', 'emem', 'minimum essential medium'],

  // Species
  'human': ['human', 'homo sapiens', 'h. sapiens'],
  'mouse': ['mouse', 'murine', 'mus musculus', 'm. musculus'],
  'rat': ['rat', 'rattus norvegicus', 'r. norvegicus'],

  // Sources
  'atcc': ['atcc', 'american type culture collection'],
  'sigma aldrich': ['sigma aldrich', 'sigma-aldrich', 'sigmaaldrich', 'millipore sigma'],
  'thermo fisher': ['thermo fisher', 'thermo-fisher', 'thermofisher', 'thermo fisher scientific', 'gibco', 'invitrogen', 'life technologies'],
  'corning': ['corning', 'corning life sciences'],
  'lonza': ['lonza', 'lonza bioscience'],
  'stemcell technologies': ['stemcell technologies', 'stemcell tech', 'stem cell technologies'],
};

export const SYNONYM_REVERSE_LOOKUP: Map<string, string> = new Map();
for (const [canonical, synonyms] of Object.entries(LAB_SYNONYMS)) {
  for (const synonym of synonyms) {
    SYNONYM_REVERSE_LOOKUP.set(synonym.toLowerCase(), canonical);
  }
}

export const FUZZY_SKIP_WORDS = new Set(['a', 'an', 'the', 'is', 'at', 'in', 'on', 'to', 'of']);
