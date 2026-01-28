import { nanoid } from 'nanoid';

/**
 * Generate a prefixed unique identifier
 *
 * Uses nanoid for cryptographically strong randomness.
 * Prefixed IDs improve debuggability in logs and API responses.
 *
 * @param prefix - Entity type prefix (e.g., 'tube', 'user', 'session')
 * @returns Unique ID in format: prefix_randomstring
 */
export function generateId(prefix: string): string {
  return `${prefix}_${nanoid()}`;
}
