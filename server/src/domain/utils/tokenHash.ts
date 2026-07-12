/**
 * Session Token Hashing
 *
 * One-way hash for high-entropy session tokens (refresh tokens) stored at rest, so a
 * database read never yields a usable credential. The token is 256-bit random, so a fast
 * SHA-256 with no per-token salt is sufficient and keeps lookups a single indexed match.
 */

import * as crypto from 'crypto';

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
