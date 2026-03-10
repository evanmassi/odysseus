/**
 * Prefixed Unique ID Generation
 *
 * Nanoid-based IDs with entity prefixes for debuggability in logs and API responses.
 */

import { nanoid } from 'nanoid';

export function generateId(prefix: string): string {
  return `${prefix}_${nanoid()}`;
}
