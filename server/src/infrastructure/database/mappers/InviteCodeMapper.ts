/**
 * Invite Code Mapper
 *
 * Converts between database rows and InviteCode domain entities.
 */

import { InviteCode } from '@domain/entities/InviteCode';

export interface InviteCodeRow {
  id: string;
  lab_id: string;
  code: string;
  role: 'lab_admin' | 'user';
  created_by: string;
  max_uses: number | null;
  use_count: number;
  expires_at: Date | string | null;
  is_active: boolean;
  created_at: Date | string;
}

export class InviteCodeMapper {

  static toRow(inviteCode: InviteCode): InviteCodeRow {
    return {
      id: inviteCode.id,
      lab_id: inviteCode.labId,
      code: inviteCode.code,
      role: inviteCode.role,
      created_by: inviteCode.createdBy,
      max_uses: inviteCode.maxUses ?? null,
      use_count: inviteCode.useCount,
      expires_at: inviteCode.expiresAt?.toISOString() ?? null,
      is_active: inviteCode.isActive,
      created_at: inviteCode.createdAt.toISOString()
    };
  }

  static fromRow(row: InviteCodeRow): InviteCode {
    const createdAt = row.created_at instanceof Date
      ? row.created_at.toISOString()
      : row.created_at;

    const expiresAt = row.expires_at
      ? (row.expires_at instanceof Date ? row.expires_at.toISOString() : row.expires_at)
      : undefined;

    return InviteCode.fromData({
      id: row.id,
      labId: row.lab_id,
      code: row.code,
      role: row.role,
      createdBy: row.created_by,
      maxUses: row.max_uses ?? undefined,
      useCount: row.use_count,
      expiresAt,
      isActive: row.is_active,
      createdAt
    });
  }

  static fromRows(rows: InviteCodeRow[]): InviteCode[] {
    return rows.map(row => this.fromRow(row));
  }
}
