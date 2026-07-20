/**
 * Constant-Time String Comparison
 *
 * Compares two strings without exiting early on the first differing byte, so hash/secret
 * comparisons don't leak information through response timing. Length is compared first (not secret).
 */

import * as crypto from 'crypto';

export function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}
