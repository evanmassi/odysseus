/**
 * Search Query Preprocessing
 *
 * Normalization, synonym expansion, tsquery building, and fuzzy matching for laboratory sample search.
 */

import { LAB_SYNONYMS, SYNONYM_REVERSE_LOOKUP, FUZZY_SKIP_WORDS } from '@infrastructure/database/searchDictionary';

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
function generateAlphanumericVariants(term: string): string[] {
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
  TSVECTOR_HIGH = 5.0,
  FUZZY_MATCH = 2.0,
  RESEARCHER_NAME = 1.5,
}

/**
 * Scales tolerance with word length: shorter words match stricter
 * to avoid false positives, longer words allow more typo tolerance.
 */
function getFuzzyThreshold(termLength: number): number {
  if (termLength <= 2) return 0.7;
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

export function shouldSkipFuzzyMatching(term: string): boolean {
  if (term.length <= 1) return true;
  if (/^\d+(\.\d+)?$/.test(term)) return true;
  if (FUZZY_SKIP_WORDS.has(term.toLowerCase())) return true;

  return false;
}
