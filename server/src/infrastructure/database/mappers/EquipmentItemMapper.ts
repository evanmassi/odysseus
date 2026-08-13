/**
 * Equipment Item Mapper
 *
 * Converts between EquipmentItem domain entities and PostgreSQL rows.
 * Handles NUMERIC → number conversion for `purchase_cost`.
 */

import { EquipmentItem } from '@domain/entities/EquipmentItem';
import { toISOString } from '@infrastructure/database/PostgresContext';

import type { EquipmentStatus } from '@odysseus/shared-schemas';

export interface EquipmentItemRow {
  id: string;
  lab_id: string;
  category_id: string;
  name: string;
  serial_number: string | null;
  manufacturer: string | null;
  vendor_name: string | null;
  vendor_catalog_number: string | null;
  model: string | null;
  description: string | null;
  location_id: string | null;
  status: string;
  condition_notes: string | null;
  purchase_date: string | null;
  warranty_expiration: string | null;
  purchase_cost: string | null;
  asset_tag: string | null;
  next_maintenance_date: string | null;
  decommission_date: string | null;
  decommission_reason: string | null;
  disposal_method: string | null;
  notes: string | null;
  is_seeded: boolean;
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
      vendor_name: item.vendorName ?? null,
      vendor_catalog_number: item.vendorCatalogNumber ?? null,
      model: item.model ?? null,
      description: item.description ?? null,
      location_id: item.locationId ?? null,
      status: item.status,
      condition_notes: item.conditionNotes ?? null,
      purchase_date: item.purchaseDate ?? null,
      warranty_expiration: item.warrantyExpiration ?? null,
      purchase_cost: item.purchaseCost != null ? String(item.purchaseCost) : null,
      asset_tag: item.assetTag ?? null,
      next_maintenance_date: item.nextMaintenanceDate ?? null,
      decommission_date: item.decommissionDate ?? null,
      decommission_reason: item.decommissionReason ?? null,
      disposal_method: item.disposalMethod ?? null,
      notes: item.notes ?? null,
      is_seeded: item.isSeeded,
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
      vendorName: row.vendor_name ?? undefined,
      vendorCatalogNumber: row.vendor_catalog_number ?? undefined,
      model: row.model ?? undefined,
      description: row.description ?? undefined,
      locationId: row.location_id ?? undefined,
      status: row.status as EquipmentStatus,
      conditionNotes: row.condition_notes ?? undefined,
      purchaseDate: row.purchase_date ?? undefined,
      warrantyExpiration: row.warranty_expiration ?? undefined,
      purchaseCost: row.purchase_cost != null ? parseFloat(row.purchase_cost) : undefined,
      assetTag: row.asset_tag ?? undefined,
      nextMaintenanceDate: row.next_maintenance_date ?? undefined,
      decommissionDate: row.decommission_date ?? undefined,
      decommissionReason: row.decommission_reason ?? undefined,
      disposalMethod: row.disposal_method ?? undefined,
      notes: row.notes ?? undefined,
      isSeeded: row.is_seeded,
      createdAt: toISOString(row.created_at),
      updatedAt: toISOString(row.updated_at),
    });
  }

  static fromRows(rows: EquipmentItemRow[]): EquipmentItem[] {
    return rows.map(row => this.fromRow(row));
  }
}
