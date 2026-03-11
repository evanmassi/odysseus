/**
 * Search Query Preprocessing
 *
 * Normalization, synonym expansion, tsquery building, and fuzzy matching for laboratory sample search.
 */

const LAB_SYNONYMS: Record<string, string[]> = {
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

const SYNONYM_REVERSE_LOOKUP: Map<string, string> = new Map();
for (const [canonical, synonyms] of Object.entries(LAB_SYNONYMS)) {
  for (const synonym of synonyms) {
    SYNONYM_REVERSE_LOOKUP.set(synonym.toLowerCase(), canonical);
  }
}

export function normalizeSearchQuery(query: string): string {
  return query
    .replace(/[-–—−]/g, ' ')
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/[^\w\s'".,+#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Detects letter↔number boundaries and generates forms with/without
 * punctuation. Handles patterns like MCF7, HEK293, A549, CD4, U2OS.
 *
 * @example
 * "MCF7" → ["mcf7", "mcf-7", "mcf 7"]
 * "HEK293" → ["hek293", "hek-293", "hek 293"]
 * "human" → ["human"] (no boundaries, unchanged)
 */
export function generateAlphanumericVariants(term: string): string[] {
  const normalized = term.toLowerCase().trim();
  if (!normalized) return [];

  const variants: Set<string> = new Set();
  variants.add(normalized);

  const boundaryPattern = /^([a-z]+)(\d+)$|^(\d+)([a-z]+)$/i;
  const match = normalized.match(boundaryPattern);

  if (match) {
    const part1 = match[1] || match[3];
    const part2 = match[2] || match[4];

    variants.add(`${part1}${part2}`);
    variants.add(`${part1}-${part2}`);
    variants.add(`${part1} ${part2}`);
  }

  if (normalized.includes('-')) {
    const collapsed = normalized.replace(/-/g, '');
    const spaced = normalized.replace(/-/g, ' ');
    variants.add(collapsed);
    variants.add(spaced);
    variants.add(normalized);
  }

  if (normalized.includes(' ') && /^[a-z]+\s+\d+$|^\d+\s+[a-z]+$/i.test(normalized)) {
    const collapsed = normalized.replace(/\s+/g, '');
    const hyphenated = normalized.replace(/\s+/g, '-');
    variants.add(collapsed);
    variants.add(hyphenated);
  }

  return Array.from(variants);
}

function expandSingleTerm(term: string): string[] {
  const variants: Set<string> = new Set();

  for (const variant of generateAlphanumericVariants(term)) {
    variants.add(variant);
  }

  const canonical = SYNONYM_REVERSE_LOOKUP.get(term);
  if (canonical && LAB_SYNONYMS[canonical]) {
    for (const synonym of LAB_SYNONYMS[canonical]) {
      variants.add(synonym);
      for (const synVariant of generateAlphanumericVariants(synonym)) {
        variants.add(synVariant);
      }
    }
  }

  return Array.from(variants);
}

/**
 * Each word/phrase in the query is a "concept" that MUST match (AND).
 * Synonyms and variants within a concept are alternatives (OR).
 *
 * @example
 * "Human T-cells" → [
 *   ["human", "homo sapiens", ...],           // concept 1: species
 *   ["t cell", "t-cell", "t lymphocyte", ...] // concept 2: cell type
 * ]
 */
export function parseQueryIntoConcepts(query: string): string[][] {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return [];

  const concepts: string[][] = [];

  // Extract quoted phrases as exact concepts (no synonym expansion)
  const quotedPhrases: string[] = [];
  const withoutQuotes = normalized.replace(/"([^"]+)"/g, (_, phrase: string) => {
    const trimmed = phrase.trim();
    if (trimmed.length > 0) quotedPhrases.push(trimmed);
    return ' ';
  });

  for (const phrase of quotedPhrases) {
    concepts.push([phrase]);
  }

  const words = withoutQuotes.split(/\s+/).filter(w => w.length > 0);
  const usedIndices: Set<number> = new Set();

  // Detect identifier patterns: word followed by #number (e.g., "lp #4", "lot #123")
  for (let i = 0; i < words.length - 1; i++) {
    if (usedIndices.has(i)) continue;

    if (/^[a-z]+$/i.test(words[i]) && /^#\d+$/.test(words[i + 1])) {
      concepts.push([`${words[i]} ${words[i + 1]}`]);
      usedIndices.add(i);
      usedIndices.add(i + 1);
    }
  }

  // Find multi-word synonym concepts (like "t cell", "nk cell")
  for (let i = 0; i < words.length - 1; i++) {
    if (usedIndices.has(i)) continue;

    const twoWords = `${words[i]} ${words[i + 1]}`;
    const canonical = SYNONYM_REVERSE_LOOKUP.get(twoWords);

    if (canonical) {
      const expanded = expandSingleTerm(twoWords);
      concepts.push(expanded);
      usedIndices.add(i);
      usedIndices.add(i + 1);
    }
  }

  for (let i = 0; i < words.length; i++) {
    if (usedIndices.has(i)) continue;

    const word = words[i];
    if (word === '#') continue;

    const expanded = expandSingleTerm(word);
    concepts.push(expanded);
  }

  return concepts;
}

/**
 * Flat synonym list for client-side highlighting.
 * For search logic, use parseQueryIntoConcepts() instead.
 */
export function expandWithSynonyms(query: string): string[] {
  const concepts = parseQueryIntoConcepts(query);
  const allTerms: Set<string> = new Set();

  for (const concept of concepts) {
    for (const term of concept) {
      allTerms.add(term);
    }
  }

  return Array.from(allTerms);
}

/** Uses AND between concepts (must match all), OR within concepts (synonyms). */
export function buildTsQueryFromConcepts(concepts: string[][]): string {
  if (concepts.length === 0) return '';

  const conceptQueries: string[] = [];

  for (const synonymGroup of concepts) {
    const termQueries: string[] = [];

    for (const term of synonymGroup) {
      const words = term.split(/\s+/).filter(w => w.length > 0);
      const escapedWords = words.map(word => {
        const escaped = word.replace(/['"\\:&|!()#]/g, '');
        if (!escaped) return null;
        if (/^\d+$/.test(escaped)) return escaped;
        return `${escaped}:*`;
      }).filter(Boolean);

      if (escapedWords.length > 0) {
        termQueries.push(`(${escapedWords.join(' & ')})`);
      }
    }

    if (termQueries.length > 0) {
      conceptQueries.push(`(${termQueries.join(' | ')})`);
    }
  }

  return conceptQueries.join(' & ');
}

/** Higher tier = better match = shown first. */
export enum SearchRankTier {
  EXACT_MATCH = 10.0,
  TSVECTOR_HIGH = 5.0,
  TSVECTOR_MEDIUM = 3.0,
  SYNONYM_MATCH = 2.5,
  FUZZY_MATCH = 2.0,
  RESEARCHER_NAME = 1.5,
  ILIKE_FALLBACK = 1.0,
  PARTIAL_MATCH = 0.5,
}

/**
 * Scales tolerance with word length: shorter words match stricter
 * to avoid false positives, longer words allow more typo tolerance.
 */
export function getFuzzyThreshold(termLength: number): number {
  if (termLength <= 2) return 1.0;
  if (termLength <= 4) return 0.6;
  if (termLength <= 6) return 0.4;
  return 0.3;
}

/**
 * Uses the shortest significant word to determine threshold,
 * since that's the most likely source of false positives.
 */
export function calculateQueryFuzzyThreshold(query: string): number {
  const words = normalizeSearchQuery(query).split(/\s+/).filter(w => w.length > 1);
  if (words.length === 0) return 0.4;

  const shortestLength = Math.min(...words.map(w => w.length));
  return getFuzzyThreshold(shortestLength);
}

const FUZZY_SKIP_WORDS = new Set(['a', 'an', 'the', 'is', 'at', 'in', 'on', 'to', 'of']);

export function shouldSkipFuzzyMatching(term: string): boolean {
  if (term.length <= 1) return true;
  if (/^\d+(\.\d+)?$/.test(term)) return true;
  if (FUZZY_SKIP_WORDS.has(term.toLowerCase())) return true;

  return false;
}

/** Catches typos and near-matches the tsvector layer might miss. */
export function buildFuzzySql(
  searchColumns: string[],
  threshold: number
): { conditions: string[]; rankExpression: string } {
  const conditions = searchColumns.map(
    col => `similarity(COALESCE(${col}, ''), $1) > ${threshold}`
  );

  const similarities = searchColumns.map(
    col => `similarity(COALESCE(${col}, ''), $1)`
  );
  const rankExpression = `GREATEST(${similarities.join(', ')}) * ${SearchRankTier.FUZZY_MATCH}`;

  return { conditions, rankExpression };
}

