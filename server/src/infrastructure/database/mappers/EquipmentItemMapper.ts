/**
 * Equipment Item Mapper
 *
 * Converts between EquipmentItem domain entities and PostgreSQL rows.
 * Handles NUMERIC → number conversion for `purchase_cost`.
 */

import { EquipmentItem } from '@domain/entities/EquipmentItem';
import { toISOString, parseDateString } from '@infrastructure/database/PostgresContext';

import type { EquipmentStatus } from '@odysseus/shared-schemas';

export interface EquipmentItemRow {
  id: string;
  lab_id: string;
  category_id: string;
  name: string;
  serial_number: string | null;
  manufacturer: string | null;
  model: string | null;
  description: string | null;
  location: string | null;
  status: string;
  condition_notes: string | null;
  purchase_date: Date | string | null;
  warranty_expiration: Date | string | null;
  purchase_cost: string | null;
  asset_tag: string | null;
  next_maintenance_date: Date | string | null;
  decommission_date: Date | string | null;
  decommission_reason: string | null;
  disposal_method: string | null;
  notes: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export class EquipmentItemMapper {

  static toRow(item: EquipmentItem): EquipmentItemRow {
    return {
      id: item.id,
      lab_id: item.labId,
      category_id: item.categoryId,
      name: item.name,
      serial_number: item.serialNumber ?? null,
      manufacturer: item.manufacturer ?? null,
      model: item.model ?? null,
      description: item.description ?? null,
      location: item.location ?? null,
      status: item.status,
      condition_notes: item.conditionNotes ?? null,
      purchase_date: item.purchaseDate ? dateToString(item.purchaseDate) : null,
      warranty_expiration: item.warrantyExpiration ? dateToString(item.warrantyExpiration) : null,
      purchase_cost: item.purchaseCost != null ? String(item.purchaseCost) : null,
      asset_tag: item.assetTag ?? null,
      next_maintenance_date: item.nextMaintenanceDate ? dateToString(item.nextMaintenanceDate) : null,
      decommission_date: item.decommissionDate ? dateToString(item.decommissionDate) : null,
      decommission_reason: item.decommissionReason ?? null,
      disposal_method: item.disposalMethod ?? null,
      notes: item.notes ?? null,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    };
  }

  static fromRow(row: EquipmentItemRow): EquipmentItem {
    return EquipmentItem.fromData({
      id: row.id,
      labId: row.lab_id,
      categoryId: row.category_id,
      name: row.name,
      serialNumber: row.serial_number ?? undefined,
      manufacturer: row.manufacturer ?? undefined,
      model: row.model ?? undefined,
      description: row.description ?? undefined,
      location: row.location ?? undefined,
      status: row.status as EquipmentStatus,
      conditionNotes: row.condition_notes ?? undefined,
      purchaseDate: row.purchase_date ? toDate(row.purchase_date) : undefined,
      warrantyExpiration: row.warranty_expiration ? toDate(row.warranty_expiration) : undefined,
      purchaseCost: row.purchase_cost != null ? parseFloat(row.purchase_cost) : undefined,
      assetTag: row.asset_tag ?? undefined,
      nextMaintenanceDate: row.next_maintenance_date ? toDate(row.next_maintenance_date) : undefined,
      decommissionDate: row.decommission_date ? toDate(row.decommission_date) : undefined,
      decommissionReason: row.decommission_reason ?? undefined,
      disposalMethod: row.disposal_method ?? undefined,
      notes: row.notes ?? undefined,
      createdAt: toISOString(row.created_at),
      updatedAt: toISOString(row.updated_at),
    });
  }

  static fromRows(rows: EquipmentItemRow[]): EquipmentItem[] {
    return rows.map(row => this.fromRow(row));
  }
}

function toDate(value: Date | string): Date {
  if (value instanceof Date) return value;
  return parseDateString(value);
}

function dateToString(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
