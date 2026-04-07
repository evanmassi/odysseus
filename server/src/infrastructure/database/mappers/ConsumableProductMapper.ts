/**
 * Consumable Product Mapper
 *
 * Converts between ConsumableProduct domain entities and PostgreSQL rows.
 * Handles NUMERIC → number conversion for monetary/quantity fields and TEXT[] for properties.
 */

import { ConsumableProduct } from '@domain/entities/ConsumableProduct';
import { toISOString } from '@infrastructure/database/PostgresContext';

import type { ConsumableProductStatus } from '@odysseus/shared-schemas';

export interface ConsumableProductRow {
  id: string;
  lab_id: string;
  category_id: string;
  name: string;
  manufacturer: string | null;
  catalog_number: string | null;
  vendor_name: string | null;
  vendor_catalog_number: string | null;
  stock_unit: string | null;
  units_per_stock_unit: number | null;
  reorder_threshold: string | null;
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

export class ConsumableProductMapper {

  static toRow(product: ConsumableProduct): ConsumableProductRow {
    return {
      id: product.id,
      lab_id: product.labId,
      category_id: product.categoryId,
      name: product.name,
      manufacturer: product.manufacturer ?? null,
      catalog_number: product.catalogNumber ?? null,
      vendor_name: product.vendorName ?? null,
      vendor_catalog_number: product.vendorCatalogNumber ?? null,
      stock_unit: product.stockUnit ?? null,
      units_per_stock_unit: product.unitsPerStockUnit ?? null,
      reorder_threshold: product.reorderThreshold != null ? String(product.reorderThreshold) : null,
      reorder_quantity: product.reorderQuantity != null ? String(product.reorderQuantity) : null,
      reorder_unit: product.reorderUnit ?? null,
      unit_price: product.unitPrice != null ? String(product.unitPrice) : null,
      properties: product.properties,
      current_lot_number: product.currentLotNumber ?? null,
      description: product.description ?? null,
      notes: product.notes ?? null,
      status: product.status,
      created_at: product.createdAt,
      updated_at: product.updatedAt,
    };
  }

  static fromRow(row: ConsumableProductRow): ConsumableProduct {
    return ConsumableProduct.fromData({
      id: row.id,
      labId: row.lab_id,
      categoryId: row.category_id,
      name: row.name,
      manufacturer: row.manufacturer ?? undefined,
      catalogNumber: row.catalog_number ?? undefined,
      vendorName: row.vendor_name ?? undefined,
      vendorCatalogNumber: row.vendor_catalog_number ?? undefined,
      stockUnit: row.stock_unit ?? undefined,
      unitsPerStockUnit: row.units_per_stock_unit ?? undefined,
      reorderThreshold: row.reorder_threshold != null ? parseFloat(row.reorder_threshold) : undefined,
      reorderQuantity: row.reorder_quantity != null ? parseFloat(row.reorder_quantity) : undefined,
      reorderUnit: row.reorder_unit ?? undefined,
      unitPrice: row.unit_price != null ? parseFloat(row.unit_price) : undefined,
      properties: row.properties ?? [],
      currentLotNumber: row.current_lot_number ?? undefined,
      description: row.description ?? undefined,
      notes: row.notes ?? undefined,
      status: row.status as ConsumableProductStatus,
      createdAt: toISOString(row.created_at),
      updatedAt: toISOString(row.updated_at),
    });
  }

  static fromRows(rows: ConsumableProductRow[]): ConsumableProduct[] {
    return rows.map(row => this.fromRow(row));
  }
}
