/**
 * Invite Code CQRS Queries
 *
 * Read-only operations for invite code validation during registration.
 */

import { InviteCodeRepository } from '@domain/repositories/InviteCodeRepository';
import { LabRepository } from '@domain/repositories/LabRepository';

// QUERY INTERFACES

export interface ValidateInviteCodeQuery {
  code: string;
}

// QUERY HANDLERS

/** Public query — validates an invite code for the registration flow. */
export class ValidateInviteCodeQueryHandler {
  constructor(
    private inviteCodeRepository: InviteCodeRepository,
    private labRepository: LabRepository
  ) {}

  async handle(query: ValidateInviteCodeQuery): Promise<{ valid: boolean; labName?: string; labId?: string }> {
    if (!query.code || query.code.trim().length === 0) {
      return { valid: false };
    }

    const inviteCode = await this.inviteCodeRepository.findByCode(query.code.trim().toUpperCase());
    if (!inviteCode || !inviteCode.isValid()) {
      return { valid: false };
    }

    const lab = await this.labRepository.findById(inviteCode.labId);
    if (!lab || !lab.isActive) {
      return { valid: false };
    }

    return { valid: true, labName: lab.name, labId: lab.id };
  }
}
