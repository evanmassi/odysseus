/**
 * Invite Code Repository
 *
 * Data access for registration invite codes with upsert support.
 */

import type { InviteCode } from '@domain/entities/InviteCode';
import type { InviteCodeRepository as IInviteCodeRepository } from '@domain/repositories/InviteCodeRepository';
import type { InviteCodeRow } from '@infrastructure/database/mappers/InviteCodeMapper';
import { InviteCodeMapper } from '@infrastructure/database/mappers/InviteCodeMapper';
import type { PostgresContext } from '@infrastructure/database/PostgresContext';

const INVITE_CODE_COLUMNS = 'id, lab_id, code, role, create_researcher, created_by, max_uses, use_count, expires_at, is_active, created_at, deactivation_reason';

export class InviteCodeRepository implements IInviteCodeRepository {

  constructor(private context: PostgresContext) {}

  async findById(id: string): Promise<InviteCode | null> {
    const row = await this.context.queryOne<InviteCodeRow>(
      `SELECT ${INVITE_CODE_COLUMNS} FROM invite_codes WHERE id = $1`,
      [id]
    );
    return row ? InviteCodeMapper.fromRow(row) : null;
  }

  async findByCode(code: string): Promise<InviteCode | null> {
    const row = await this.context.queryOne<InviteCodeRow>(
      `SELECT ${INVITE_CODE_COLUMNS} FROM invite_codes WHERE code = $1`,
      [code.toUpperCase()]
    );
    return row ? InviteCodeMapper.fromRow(row) : null;
  }

  async findByLabId(labId: string): Promise<InviteCode[]> {
    const rows = await this.context.queryMany<InviteCodeRow>(
      `SELECT ${INVITE_CODE_COLUMNS} FROM invite_codes WHERE lab_id = $1 ORDER BY created_at DESC`,
      [labId]
    );
    return InviteCodeMapper.fromRows(rows);
  }

  async findActiveByLabId(labId: string): Promise<InviteCode[]> {
    const rows = await this.context.queryMany<InviteCodeRow>(
      `SELECT ${INVITE_CODE_COLUMNS} FROM invite_codes
       WHERE lab_id = $1
         AND is_active = TRUE
         AND (expires_at IS NULL OR expires_at > NOW())
         AND (max_uses IS NULL OR use_count < max_uses)
       ORDER BY created_at DESC`,
      [labId]
    );
    return InviteCodeMapper.fromRows(rows);
  }

  async save(inviteCode: InviteCode): Promise<void> {
    const row = InviteCodeMapper.toRow(inviteCode);
    await this.context.execute(
      `INSERT INTO invite_codes (id, lab_id, code, role, create_researcher, created_by, max_uses, use_count, expires_at, is_active, created_at, deactivation_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO UPDATE SET
         use_count = EXCLUDED.use_count,
         is_active = EXCLUDED.is_active,
         deactivation_reason = EXCLUDED.deactivation_reason`,
      [row.id, row.lab_id, row.code, row.role, row.create_researcher, row.created_by, row.max_uses, row.use_count, row.expires_at, row.is_active, row.created_at, row.deactivation_reason]
    );
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.context.execute(
      'DELETE FROM invite_codes WHERE id = $1',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async deleteByCreator(userId: string): Promise<number> {
    const result = await this.context.execute(
      'DELETE FROM invite_codes WHERE created_by = $1',
      [userId]
    );
    return result.rowCount ?? 0;
  }
}
