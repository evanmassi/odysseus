/**
 * Search Enhancement Utilities
 *
 * Query preprocessing for laboratory sample search:
 * - Normalization (hyphen handling, punctuation)
 * - Lab-specific synonym expansion
 * - Fuzzy matching configuration
 * - Multi-tier ranking
 */

/**
 * Lab-specific synonym dictionary
 *
 * Maps common variations, abbreviations, and alternate terms
 * to their canonical forms for consistent search results.
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

  // T cell variations (the specific problem case)
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

/**
 * Reverse lookup map for fast synonym matching
 *
 * Maps each synonym back to its canonical term.
 */
const SYNONYM_REVERSE_LOOKUP: Map<string, string> = new Map();
for (const [canonical, synonyms] of Object.entries(LAB_SYNONYMS)) {
  for (const synonym of synonyms) {
    SYNONYM_REVERSE_LOOKUP.set(synonym.toLowerCase(), canonical);
  }
}

/**
 * Normalize a search query for consistent matching
 *
 * Handles:
 * - Hyphen/dash splitting (t-cells -> t cells)
 * - Smart quote normalization
 * - Excessive whitespace
 * - Special character cleanup
 *
 * @param query - Raw user input
 * @returns Normalized query string
 */
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
 * Generate alphanumeric variants for cell line identifiers
 *
 * Detects letter↔number boundaries and generates forms with/without
 * punctuation. Handles patterns like MCF7, HEK293, A549, CD4, U2OS.
 *
 * @example
 * "MCF7" → ["mcf7", "mcf-7", "mcf 7"]
 * "HEK293" → ["hek293", "hek-293", "hek 293"]
 * "human" → ["human"] (no boundaries, unchanged)
 *
 * @param term - Single search term
 * @returns Array of variant forms
 */
export function generateAlphanumericVariants(term: string): string[] {
  const normalized = term.toLowerCase().trim();
  if (!normalized) return [];

  const variants: Set<string> = new Set();
  variants.add(normalized);

  // Detect letter→number or number→letter boundaries
  // Pattern: sequence of letters followed by sequence of numbers, or vice versa
  const boundaryPattern = /^([a-z]+)(\d+)$|^(\d+)([a-z]+)$/i;
  const match = normalized.match(boundaryPattern);

  if (match) {
    // Extract the two parts (letters and numbers)
    const part1 = match[1] || match[3]; // letters or numbers
    const part2 = match[2] || match[4]; // numbers or letters

    // Generate variants: collapsed, hyphenated, spaced
    variants.add(`${part1}${part2}`);      // mcf7
    variants.add(`${part1}-${part2}`);     // mcf-7
    variants.add(`${part1} ${part2}`);     // mcf 7
  }

  // Also handle already-hyphenated input like "MCF-7"
  if (normalized.includes('-')) {
    const collapsed = normalized.replace(/-/g, '');
    const spaced = normalized.replace(/-/g, ' ');
    variants.add(collapsed);
    variants.add(spaced);
    variants.add(normalized); // keep original
  }

  // Handle already-spaced input like "MCF 7"
  if (normalized.includes(' ') && /^[a-z]+\s+\d+$|^\d+\s+[a-z]+$/i.test(normalized)) {
    const collapsed = normalized.replace(/\s+/g, '');
    const hyphenated = normalized.replace(/\s+/g, '-');
    variants.add(collapsed);
    variants.add(hyphenated);
  }

  return Array.from(variants);
}

/**
 * Expand a single term with synonyms and alphanumeric variants
 *
 * @param term - Single normalized term
 * @returns Array of equivalent terms (synonyms + variants)
 */
function expandSingleTerm(term: string): string[] {
  const variants: Set<string> = new Set();

  // Add alphanumeric variants (MCF7 → mcf7, mcf-7, mcf 7)
  for (const variant of generateAlphanumericVariants(term)) {
    variants.add(variant);
  }

  // Check for synonym expansion
  const canonical = SYNONYM_REVERSE_LOOKUP.get(term);
  if (canonical && LAB_SYNONYMS[canonical]) {
    for (const synonym of LAB_SYNONYMS[canonical]) {
      variants.add(synonym);
      // Also generate alphanumeric variants of synonyms
      for (const synVariant of generateAlphanumericVariants(synonym)) {
        variants.add(synVariant);
      }
    }
  }

  return Array.from(variants);
}

/**
 * Parse query into concept groups for AND/OR logic
 *
 * Each word/phrase in the query is a "concept" that MUST match (AND).
 * Synonyms and variants within a concept are alternatives (OR).
 *
 * @example
 * "Human T-cells" → [
 *   ["human", "homo sapiens", ...],           // concept 1: species
 *   ["t cell", "t-cell", "t lymphocyte", ...] // concept 2: cell type
 * ]
 *
 * @param query - Raw search query
 * @returns Array of concept groups, each containing equivalent terms
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

  // Remaining single words become individual concepts
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
 * Expand a search query with synonyms (flat list for highlighting)
 *
 * Returns all terms that could match, used for client-side highlighting.
 * For search logic, use parseQueryIntoConcepts() instead.
 *
 * @param query - Normalized query string
 * @returns Array of all matching terms (original + synonyms + variants)
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

/**
 * Build PostgreSQL tsquery string from concept groups
 *
 * Uses AND between concepts (must match all), OR within concepts (synonyms).
 * This ensures "Human T-cells" only matches items with BOTH human AND t-cell.
 *
 * @param concepts - Array of concept groups from parseQueryIntoConcepts()
 * @returns PostgreSQL tsquery-compatible string
 */
export function buildTsQueryFromConcepts(concepts: string[][]): string {
  if (concepts.length === 0) return '';

  const conceptQueries: string[] = [];

  for (const synonymGroup of concepts) {
    // Build OR group for this concept's synonyms/variants
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

/**
 * Build PostgreSQL tsquery string from flat term list
 *
 * @deprecated Use buildTsQueryFromConcepts() for proper AND/OR logic
 * @param terms - Array of search terms (may include synonyms)
 * @returns PostgreSQL tsquery-compatible string
 */
export function buildTsQueryString(terms: string[]): string {
  const processedTerms: string[] = [];

  for (const term of terms) {
    const words = term.split(/\s+/).filter(w => w.length > 0);
    const escapedWords = words.map(word => {
      const escaped = word.replace(/['"\\:&|!()]/g, '');
      if (!escaped) return null;
      return `${escaped}:*`;
    }).filter(Boolean);

    if (escapedWords.length > 0) {
      processedTerms.push(escapedWords.join(' & '));
    }
  }

  return processedTerms.join(' | ');
}

/**
 * Search result ranking tiers
 *
 * Used to order results by match quality.
 * Higher tier = better match = shown first.
 */
export enum SearchRankTier {
  EXACT_MATCH = 10.0,       // Exact field value match
  TSVECTOR_HIGH = 5.0,      // High tsvector rank (ts_rank > 0.3)
  TSVECTOR_MEDIUM = 3.0,    // Medium tsvector rank
  SYNONYM_MATCH = 2.5,      // Match via synonym expansion
  FUZZY_MATCH = 2.0,        // Trigram similarity match
  RESEARCHER_NAME = 1.5,    // Researcher name ILIKE match
  ILIKE_FALLBACK = 1.0,     // Generic ILIKE substring match
  PARTIAL_MATCH = 0.5,      // Single word partial match
}

/**
 * Fuzzy matching thresholds based on term length
 *
 * Scales tolerance with word length:
 * - Short words: stricter matching (fewer false positives)
 * - Long words: more tolerance (typos more likely)
 *
 * @param termLength - Length of the search term
 * @returns Minimum similarity threshold (0-1)
 */
export function getFuzzyThreshold(termLength: number): number {
  if (termLength <= 2) {
    // Very short terms: exact match only
    return 1.0;
  } else if (termLength <= 4) {
    // Short terms: strict matching
    return 0.6;
  } else if (termLength <= 6) {
    // Medium terms: moderate tolerance
    return 0.4;
  } else {
    // Long terms: more forgiving
    return 0.3;
  }
}

/**
 * Calculate appropriate similarity threshold for a query
 *
 * Uses the shortest significant word to determine threshold,
 * since that's the most likely source of false positives.
 *
 * @param query - Full search query
 * @returns Similarity threshold for pg_trgm matching
 */
export function calculateQueryFuzzyThreshold(query: string): number {
  const words = normalizeSearchQuery(query).split(/\s+/).filter(w => w.length > 1);
  if (words.length === 0) return 0.4;

  // Find shortest significant word
  const shortestLength = Math.min(...words.map(w => w.length));
  return getFuzzyThreshold(shortestLength);
}

/**
 * Check if a term should be excluded from fuzzy matching
 *
 * Some terms (like numbers, single characters) shouldn't
 * have fuzzy matching applied.
 *
 * @param term - Search term to check
 * @returns true if fuzzy matching should be skipped
 */
export function shouldSkipFuzzyMatching(term: string): boolean {
  // Skip single characters
  if (term.length <= 1) return true;

  // Skip pure numbers (lot numbers, concentrations)
  if (/^\d+(\.\d+)?$/.test(term)) return true;

  // Skip very common short words that would match too much
  const skipWords = new Set(['a', 'an', 'the', 'is', 'at', 'in', 'on', 'to', 'of']);
  if (skipWords.has(term.toLowerCase())) return true;

  return false;
}

/**
 * Build SQL for fuzzy matching layer using pg_trgm
 *
 * Creates a similarity-based search that catches typos
 * and near-matches the tsvector layer might miss.
 *
 * @param searchColumns - Columns to apply fuzzy matching to
 * @param paramIndex - Current parameter index (mutated)
 * @returns Object with SQL fragment and threshold value
 */
export function buildFuzzySql(
  searchColumns: string[],
  threshold: number
): { conditions: string[]; rankExpression: string } {
  // Build OR conditions for each column with similarity
  const conditions = searchColumns.map(
    col => `similarity(COALESCE(${col}, ''), $1) > ${threshold}`
  );

  // Build rank expression as max similarity across columns
  const similarities = searchColumns.map(
    col => `similarity(COALESCE(${col}, ''), $1)`
  );
  const rankExpression = `GREATEST(${similarities.join(', ')}) * ${SearchRankTier.FUZZY_MATCH}`;

  return { conditions, rankExpression };
}

/**
 * Export synonym dictionary for testing/debugging
 */
export function getSynonymDictionary(): Record<string, string[]> {
  return { ...LAB_SYNONYMS };
}

/**
 * Add a custom synonym mapping at runtime
 * Useful for lab-specific terms not in the default dictionary
 *
 * @param canonical - The canonical term
 * @param synonyms - Array of synonyms
 */
export function addCustomSynonym(canonical: string, synonyms: string[]): void {
  const normalizedCanonical = canonical.toLowerCase();

  // Add or merge with existing
  if (LAB_SYNONYMS[normalizedCanonical]) {
    const existing = new Set(LAB_SYNONYMS[normalizedCanonical]);
    synonyms.forEach(s => existing.add(s.toLowerCase()));
    LAB_SYNONYMS[normalizedCanonical] = Array.from(existing);
  } else {
    LAB_SYNONYMS[normalizedCanonical] = [normalizedCanonical, ...synonyms.map(s => s.toLowerCase())];
  }

  // Update reverse lookup
  for (const synonym of LAB_SYNONYMS[normalizedCanonical]) {
    SYNONYM_REVERSE_LOOKUP.set(synonym.toLowerCase(), normalizedCanonical);
  }
}
