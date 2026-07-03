/**
 * Error Message Extractor
 *
 * Returns a thrown Error's message, or the fallback when the value isn't an Error.
 */

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
