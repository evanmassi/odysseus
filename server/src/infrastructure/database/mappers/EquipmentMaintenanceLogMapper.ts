/**
 * Equipment Maintenance Log Mapper
 *
 * Converts between EquipmentMaintenanceLog domain entities and PostgreSQL rows.
 * Handles NUMERIC → number conversion for `cost`.
 */

import { EquipmentMaintenanceLog } from '@domain/entities/EquipmentMaintenanceLog';
import { toISOString } from '@infrastructure/database/PostgresContext';

export interface EquipmentMaintenanceLogRow {
  id: string;
  item_id: string;
  date_performed: Date | string;
  maintenance_type: string;
  performed_by: string | null;
  technician: string | null;
  description: string | null;
  next_scheduled_date: Date | string | null;
  cost: string | null;
  notes: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export class EquipmentMaintenanceLogMapper {

  static toRow(entry: EquipmentMaintenanceLog): EquipmentMaintenanceLogRow {
    return {
      id: entry.id,
      item_id: entry.itemId,
      date_performed: entry.datePerformed,
      maintenance_type: entry.maintenanceType,
      performed_by: entry.performedBy ?? null,
      technician: entry.technician ?? null,
      description: entry.description ?? null,
      next_scheduled_date: entry.nextScheduledDate ?? null,
      cost: entry.cost != null ? String(entry.cost) : null,
      notes: entry.notes ?? null,
      created_at: entry.createdAt,
      updated_at: entry.updatedAt,
    };
  }

  static fromRow(row: EquipmentMaintenanceLogRow): EquipmentMaintenanceLog {
    return EquipmentMaintenanceLog.fromData({
      id: row.id,
      itemId: row.item_id,
      datePerformed: toDate(row.date_performed),
      maintenanceType: row.maintenance_type,
      performedBy: row.performed_by ?? undefined,
      technician: row.technician ?? undefined,
      description: row.description ?? undefined,
      nextScheduledDate: row.next_scheduled_date ? toDate(row.next_scheduled_date) : undefined,
      cost: row.cost != null ? parseFloat(row.cost) : undefined,
      notes: row.notes ?? undefined,
      createdAt: toISOString(row.created_at),
      updatedAt: toISOString(row.updated_at),
    });
  }

  static fromRows(rows: EquipmentMaintenanceLogRow[]): EquipmentMaintenanceLog[] {
    return rows.map(row => this.fromRow(row));
  }
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}
