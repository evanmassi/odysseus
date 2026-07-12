/**
 * Audit Log Entry Mapper
 *
 * Maps rows to AuditLogEntry. The live audit_log and its archive table share the
 * same core columns, so both repositories map through here.
 */

import { toDate } from '@infrastructure/database/PostgresContext';

import type { AuditLogEntry } from '@odysseus/shared-schemas';

/** The audit columns common to both the live audit_log table and its archive. */
export interface AuditLogEntryRow {
  id: string;
  user_id: string | null;
  username: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: string;
  timestamp: Date | string;
  ip_address: string | null;
  user_agent: string | null;
  lab_id: string | null;
}

export class AuditLogEntryMapper {
  static fromRow(row: AuditLogEntryRow): AuditLogEntry {
    return {
      id: row.id,
      labId: row.lab_id ?? undefined,
      userId: row.user_id ?? undefined,
      username: row.username,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id ?? undefined,
      details: row.details,
      timestamp: toDate(row.timestamp),
      ipAddress: row.ip_address ?? undefined,
      userAgent: row.user_agent ?? undefined,
    };
  }
}
