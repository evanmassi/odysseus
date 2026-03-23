/**
 * Invite Code Mapper
 *
 * Converts between database rows and InviteCode domain entities.
 */

import { InviteCode, type DeactivationReason } from '@domain/entities/InviteCode';
import { toISOString } from '@infrastructure/database/PostgresContext';

export interface InviteCodeRow {
  id: string;
  lab_id: string;
  code: string;
  role: 'lab_admin' | 'user';
  create_researcher: boolean;
  created_by: string;
  max_uses: number | null;
  use_count: number;
  expires_at: Date | string | null;
  is_active: boolean;
  created_at: Date | string;
  deactivation_reason: string | null;
}

export class InviteCodeMapper {

  static toRow(inviteCode: InviteCode): InviteCodeRow {
    return {
      id: inviteCode.id,
      lab_id: inviteCode.labId,
      code: inviteCode.code,
      role: inviteCode.role,
      create_researcher: inviteCode.createResearcher,
      created_by: inviteCode.createdBy,
      max_uses: inviteCode.maxUses ?? null,
      use_count: inviteCode.useCount,
      expires_at: inviteCode.expiresAt?.toISOString() ?? null,
      is_active: inviteCode.isActive,
      created_at: inviteCode.createdAt.toISOString(),
      deactivation_reason: inviteCode.deactivationReason ?? null
    };
  }

  static fromRow(row: InviteCodeRow): InviteCode {
    const createdAt = toISOString(row.created_at);

    const expiresAt = row.expires_at
      ? toISOString(row.expires_at)
      : undefined;

    return InviteCode.fromData({
      id: row.id,
      labId: row.lab_id,
      code: row.code,
      role: row.role,
      createResearcher: row.create_researcher,
      createdBy: row.created_by,
      maxUses: row.max_uses ?? undefined,
      useCount: row.use_count,
      expiresAt,
      isActive: row.is_active,
      createdAt,
      deactivationReason: (row.deactivation_reason as DeactivationReason) ?? undefined
    });
  }

  static fromRows(rows: InviteCodeRow[]): InviteCode[] {
    return rows.map(row => this.fromRow(row));
  }
}
