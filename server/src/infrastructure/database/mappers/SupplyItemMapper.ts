/**
 * Supply Item Mapper
 *
 * Converts between SupplyItem domain entities and PostgreSQL rows.
 * Handles NUMERIC → number conversion for monetary/quantity fields and TEXT[] for properties.
 */

import { SupplyItem } from '@domain/entities/SupplyItem';
import { toISOString } from '@infrastructure/database/PostgresContext';

import type { SupplyItemStatus } from '@odysseus/shared-schemas';

export interface SupplyItemRow {
  id: string;
  lab_id: string;
  category_id: string;
  name: string;
  manufacturer: string | null;
  catalog_number: string | null;
  vendor_name: string | null;
  vendor_catalog_number: string | null;
  stock_unit: string | null;
  base_item_name: string | null;
  reorder_threshold: string | null;
  reorder_threshold_unit: string | null;
  reorder_quantity: string | null;
  reorder_unit: string | null;
  unit_price: string | null;
  properties: string[];
  current_lot_number: string | null;
  description: string | null;
  notes: string | null;
  status: string;
  created_at: Date | string;
  updated_at: Date | string;
}

export class SupplyItemMapper {

  static toRow(item: SupplyItem): SupplyItemRow {
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
      base_item_name: item.baseItemName ?? null,
      reorder_threshold: item.reorderThreshold != null ? String(item.reorderThreshold) : null,
      reorder_threshold_unit: item.reorderThresholdUnit ?? null,
      reorder_quantity: item.reorderQuantity != null ? String(item.reorderQuantity) : null,
      reorder_unit: item.reorderUnit ?? null,
      unit_price: item.unitPrice != null ? String(item.unitPrice) : null,
      properties: item.properties,
      current_lot_number: item.currentLotNumber ?? null,
      description: item.description ?? null,
      notes: item.notes ?? null,
      status: item.status,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    };
  }

  static fromRow(row: SupplyItemRow): SupplyItem {
    return SupplyItem.fromData({
      id: row.id,
      labId: row.lab_id,
      categoryId: row.category_id,
      name: row.name,
      manufacturer: row.manufacturer ?? undefined,
      catalogNumber: row.catalog_number ?? undefined,
      vendorName: row.vendor_name ?? undefined,
      vendorCatalogNumber: row.vendor_catalog_number ?? undefined,
      stockUnit: row.stock_unit ?? undefined,
      baseItemName: row.base_item_name ?? undefined,
      reorderThreshold: row.reorder_threshold != null ? parseFloat(row.reorder_threshold) : undefined,
      reorderThresholdUnit: row.reorder_threshold_unit ?? undefined,
      reorderQuantity: row.reorder_quantity != null ? parseFloat(row.reorder_quantity) : undefined,
      reorderUnit: row.reorder_unit ?? undefined,
      unitPrice: row.unit_price != null ? parseFloat(row.unit_price) : undefined,
      properties: row.properties ?? [],
      currentLotNumber: row.current_lot_number ?? undefined,
      description: row.description ?? undefined,
      notes: row.notes ?? undefined,
      status: row.status as SupplyItemStatus,
      createdAt: toISOString(row.created_at),
      updatedAt: toISOString(row.updated_at),
    });
  }

  static fromRows(rows: SupplyItemRow[]): SupplyItem[] {
    return rows.map(row => this.fromRow(row));
  }
}
