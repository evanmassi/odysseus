/**
 * LIKE Pattern Escaping
 *
 * Escapes the LIKE/ILIKE wildcards (`%`, `_`) and the escape character (`\`) in user input so the
 * value matches literally instead of as a pattern. Pair with `ESCAPE '\'` in the query.
 */

export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, char => `\\${char}`);
}
