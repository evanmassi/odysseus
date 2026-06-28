/**
 * Pluralize Unit
 *
 * English pluralization for user-defined unit names. Covers common
 * patterns and lab-relevant edge cases without an external library.
 */

const UNCOUNTABLE = new Set([
  'each',
  'per',
  'ea',
  'pk',
  'cs',
  'bx',
  'ct',
  'pc',
  'pcs',
  'qty',
  'ml',
  'ul',
  'µl',
  'dl',
  'l',
  'fl oz',
  'g',
  'kg',
  'mg',
  'µg',
  'ug',
  'ng',
  'pg',
  'oz',
  'lb',
  'lbs',
  'mm',
  'cm',
  'm',
  'in',
  'ft',
  'cc',
  'iu',
  'psi',
  'rpm',
  'dozen',
  'gross',
  'series',
  'species',
]);

const IRREGULAR: Record<string, string> = {
  mouse: 'mice',
  foot: 'feet',
  tooth: 'teeth',
  die: 'dice',
  person: 'people',
  index: 'indices',
  appendix: 'appendices',
  matrix: 'matrices',
};

function applyCase(original: string, result: string): string {
  if (original === original.toUpperCase() && original.length > 1) return result.toUpperCase();
  return result;
}

export function pluralizeUnit(unit: string, count: number): string {
  if (count === 1) return unit;

  const trimmed = unit.trim();
  if (!trimmed) return unit;

  const lower = trimmed.toLowerCase();

  if (UNCOUNTABLE.has(lower)) return unit;

  if (lower in IRREGULAR) return applyCase(trimmed, IRREGULAR[lower]);

  if (/[^s]s$/i.test(trimmed) || /es$/i.test(trimmed)) return unit;

  if (/[^aeiou]fe?$/i.test(trimmed)) {
    const base = trimmed.replace(/fe?$/i, '');
    return applyCase(trimmed, `${base}ves`);
  }

  if (/(?:s|x|z|ch|sh)$/i.test(trimmed)) return applyCase(trimmed, `${trimmed}es`);

  if (/[^aeiou]y$/i.test(trimmed)) return applyCase(trimmed, `${trimmed.slice(0, -1)}ies`);

  return applyCase(trimmed, `${trimmed}s`);
}
