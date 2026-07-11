/**
 * Invite Code Repository Interface
 *
 * Data access contract for registration invite codes.
 */

import type { InviteCode } from '@domain/entities/InviteCode';

export interface InviteCodeRepository {
  /** Lab-scoped lookup — the default. Returns null for a code in another lab. */
  findById(id: string, labId: string): Promise<InviteCode | null>;

  /** Cross-lab lookup for system-admin paths only. Prefer findById. */
  findByIdAnyLab(id: string): Promise<InviteCode | null>;

  findByCode(code: string): Promise<InviteCode | null>;
  findByLabId(labId: string): Promise<InviteCode[]>;
  save(inviteCode: InviteCode): Promise<void>;
  deleteByCreator(userId: string): Promise<number>;
}
