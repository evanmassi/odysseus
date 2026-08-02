/**
 * Counted Noun Phrases
 *
 * Agrees a count with its noun for the delete guards, whose messages name what still holds a
 * reference so the user knows where to go and clear it.
 */

export function countPhrase(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
