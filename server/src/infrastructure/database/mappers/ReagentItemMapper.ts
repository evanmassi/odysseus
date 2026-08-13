/**
 * Reagent Item Mapper
 *
 * Converts between ReagentItem domain entities and PostgreSQL rows. Handles
 * NUMERIC → number conversion for concentration, reorder, and price fields.
 */

import { ReagentItem } from '@domain/entities/ReagentItem';
import { toISOString } from '@infrastructure/database/PostgresContext';

import type { ReagentItemStatus } from '@odysseus/shared-schemas';

export interface ReagentItemRow {
  id: string;
  lab_id: string;
  category_id: string;
  name: string;
  manufacturer: string | null;
  catalog_number: string | null;
  vendor_name: string | null;
  vendor_catalog_number: string | null;
  stock_unit: string | null;
  reagent_type: string | null;
  cas_number: string | null;
  concentration: string | null;
  concentration_unit: string | null;
  expiry_warning_days: number | null;
  reorder_threshold: string | null;
  reorder_threshold_unit: string | null;
  reorder_quantity: string | null;
  reorder_unit: string | null;
  unit_price: string | null;
  description: string | null;
  notes: string | null;
  status: string;
  is_seeded: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export class ReagentItemMapper {
  static toRow(item: ReagentItem): ReagentItemRow {
    return {
      id: item.id,
      lab_id: item.labId,
      category_id: item.categoryId,
      name: item.name,
      manufacturer: item.manufacturer ?? null,
      catalog_number: item.catalogNumber ?? null,
      vendor_name: item.vendorName ?? null,
      vendor_catalog_number: item.vendorCatalogNumber ?? null,
      stock_unit: item.stockUnit ?? null,
      reagent_type: item.reagentType ?? null,
      cas_number: item.casNumber ?? null,
      concentration: item.concentration != null ? String(item.concentration) : null,
      concentration_unit: item.concentrationUnit ?? null,
      expiry_warning_days: item.expiryWarningDays ?? null,
      reorder_threshold: item.reorderThreshold != null ? String(item.reorderThreshold) : null,
      reorder_threshold_unit: item.reorderThresholdUnit ?? null,
      reorder_quantity: item.reorderQuantity != null ? String(item.reorderQuantity) : null,
      reorder_unit: item.reorderUnit ?? null,
      unit_price: item.unitPrice != null ? String(item.unitPrice) : null,
      description: item.description ?? null,
      notes: item.notes ?? null,
      status: item.status,
      is_seeded: item.isSeeded,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    };
  }

  static fromRow(row: ReagentItemRow): ReagentItem {
    return ReagentItem.fromData({
      id: row.id,
      labId: row.lab_id,
      categoryId: row.category_id,
      name: row.name,
      manufacturer: row.manufacturer ?? undefined,
      catalogNumber: row.catalog_number ?? undefined,
      vendorName: row.vendor_name ?? undefined,
      vendorCatalogNumber: row.vendor_catalog_number ?? undefined,
      stockUnit: row.stock_unit ?? undefined,
      reagentType: row.reagent_type ?? undefined,
      casNumber: row.cas_number ?? undefined,
      concentration: row.concentration != null ? parseFloat(row.concentration) : undefined,
      concentrationUnit: row.concentration_unit ?? undefined,
      expiryWarningDays: row.expiry_warning_days ?? undefined,
      reorderThreshold:
        row.reorder_threshold != null ? parseFloat(row.reorder_threshold) : undefined,
      reorderThresholdUnit: row.reorder_threshold_unit ?? undefined,
      reorderQuantity: row.reorder_quantity != null ? parseFloat(row.reorder_quantity) : undefined,
      reorderUnit: row.reorder_unit ?? undefined,
      unitPrice: row.unit_price != null ? parseFloat(row.unit_price) : undefined,
      description: row.description ?? undefined,
      notes: row.notes ?? undefined,
      status: row.status as ReagentItemStatus,
      isSeeded: row.is_seeded,
      createdAt: toISOString(row.created_at),
      updatedAt: toISOString(row.updated_at),
    });
  }
}
