/**
 * Invite Code Repository Interface
 *
 * Data access contract for registration invite codes.
 */

import type { InviteCode } from '@domain/entities/InviteCode';

export interface InviteCodeRepository {
  findById(id: string): Promise<InviteCode | null>;
  findByCode(code: string): Promise<InviteCode | null>;
  findByLabId(labId: string): Promise<InviteCode[]>;
  findActiveByLabId(labId: string): Promise<InviteCode[]>;
  save(inviteCode: InviteCode): Promise<void>;
  delete(id: string): Promise<boolean>;
  deleteByCreator(userId: string): Promise<number>;
}
