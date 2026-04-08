/**
 * Consumable Product Repository
 *
 * PostgreSQL implementation for consumable products, documents, barcodes,
 * stock levels, transactions, and lookup value support.
 */

import type { ConsumableDocument } from '@domain/entities/ConsumableDocument';
import type { ConsumableProduct } from '@domain/entities/ConsumableProduct';
import type {
  ConsumableProductRepository as IConsumableProductRepository,
  ConsumableStockRow,
  ConsumableBarcodeRow,
  ConsumableTransactionRow,
  ConsumablePackagingLevelRow,
  ProductWithStock,
  RecordTransactionData,
} from '@domain/repositories/ConsumableProductRepository';
import { generateId } from '@domain/utils/generateId';
import type { ConsumableBarcodeDbRow } from '@infrastructure/database/mappers/ConsumableBarcodeMapper';
import { ConsumableBarcodeMapper } from '@infrastructure/database/mappers/ConsumableBarcodeMapper';
import type { ConsumableDocumentRow } from '@infrastructure/database/mappers/ConsumableDocumentMapper';
import { ConsumableDocumentMapper } from '@infrastructure/database/mappers/ConsumableDocumentMapper';
import type { ConsumablePackagingLevelDbRow } from '@infrastructure/database/mappers/ConsumablePackagingLevelMapper';
import { ConsumablePackagingLevelMapper } from '@infrastructure/database/mappers/ConsumablePackagingLevelMapper';
import type { ConsumableProductRow } from '@infrastructure/database/mappers/ConsumableProductMapper';
import { ConsumableProductMapper } from '@infrastructure/database/mappers/ConsumableProductMapper';
import type { ConsumableStockDbRow } from '@infrastructure/database/mappers/ConsumableStockMapper';
import { ConsumableStockMapper } from '@infrastructure/database/mappers/ConsumableStockMapper';
import type { ConsumableTransactionDbRow } from '@infrastructure/database/mappers/ConsumableTransactionMapper';
import { ConsumableTransactionMapper } from '@infrastructure/database/mappers/ConsumableTransactionMapper';
import type { PostgresContext } from '@infrastructure/database/PostgresContext';

const PRODUCT_COLUMNS = `id, lab_id, category_id, name, manufacturer, catalog_number,
  vendor_name, vendor_catalog_number, stock_unit, base_item_name,
  reorder_threshold, reorder_quantity, reorder_unit, unit_price, properties,
  current_lot_number, description, notes, status, created_at, updated_at`;

const DOC_COLUMNS = 'id, product_id, label, url, notes, created_at';
const BARCODE_COLUMNS = 'id, product_id, barcode_value, barcode_type, is_primary, label';
const STOCK_COLUMNS = 'id, product_id, location_id, quantity, updated_at';
const TXN_COLUMNS = `id, product_id, location_id, lab_id, type, quantity_change, quantity_after,
  lot_number, expiration_date, po_number, cost, performed_by, notes, created_at`;

export class ConsumableProductRepository implements IConsumableProductRepository {

  constructor(private db: PostgresContext) {}

  // Products

  async findById(id: string, labId: string): Promise<ConsumableProduct | null> {
    const row = await this.db.queryOne<ConsumableProductRow>(
      `SELECT ${PRODUCT_COLUMNS} FROM consumable_products WHERE id = $1 AND lab_id = $2`,
      [id, labId]
    );
    return row ? ConsumableProductMapper.fromRow(row) : null;
  }

  async findByLabId(labId: string): Promise<ConsumableProduct[]> {
    const rows = await this.db.queryMany<ConsumableProductRow>(
      `SELECT ${PRODUCT_COLUMNS} FROM consumable_products WHERE lab_id = $1 ORDER BY name`,
      [labId]
    );
    return ConsumableProductMapper.fromRows(rows);
  }

  async findByLabIdWithStock(labId: string): Promise<ProductWithStock[]> {
    const rows = await this.db.queryMany<ConsumableProductRow & { total_stock: string }>(
      `SELECT p.*, COALESCE(SUM(s.quantity), 0) as total_stock
       FROM consumable_products p
       LEFT JOIN consumable_stock s ON s.product_id = p.id
       WHERE p.lab_id = $1
       GROUP BY p.id
       ORDER BY p.name`,
      [labId]
    );
    return rows.map(row => ({
      product: ConsumableProductMapper.fromRow(row),
      totalStock: parseFloat(row.total_stock),
    }));
  }

  async findByCategoryId(categoryId: string, labId: string): Promise<ConsumableProduct[]> {
    const rows = await this.db.queryMany<ConsumableProductRow>(
      `SELECT ${PRODUCT_COLUMNS} FROM consumable_products WHERE category_id = $1 AND lab_id = $2 ORDER BY name`,
      [categoryId, labId]
    );
    return ConsumableProductMapper.fromRows(rows);
  }

  async save(product: ConsumableProduct): Promise<void> {
    const row = ConsumableProductMapper.toRow(product);
    await this.db.execute(`
      INSERT INTO consumable_products (${PRODUCT_COLUMNS})
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      ON CONFLICT (id) DO UPDATE SET
        category_id = EXCLUDED.category_id,
        name = EXCLUDED.name,
        manufacturer = EXCLUDED.manufacturer,
        catalog_number = EXCLUDED.catalog_number,
        vendor_name = EXCLUDED.vendor_name,
        vendor_catalog_number = EXCLUDED.vendor_catalog_number,
        stock_unit = EXCLUDED.stock_unit,
        base_item_name = EXCLUDED.base_item_name,
        reorder_threshold = EXCLUDED.reorder_threshold,
        reorder_quantity = EXCLUDED.reorder_quantity,
        reorder_unit = EXCLUDED.reorder_unit,
        unit_price = EXCLUDED.unit_price,
        properties = EXCLUDED.properties,
        current_lot_number = EXCLUDED.current_lot_number,
        description = EXCLUDED.description,
        notes = EXCLUDED.notes,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at
    `, [
      row.id, row.lab_id, row.category_id, row.name, row.manufacturer, row.catalog_number,
      row.vendor_name, row.vendor_catalog_number, row.stock_unit, row.base_item_name,
      row.reorder_threshold, row.reorder_quantity, row.reorder_unit, row.unit_price, row.properties,
      row.current_lot_number, row.description, row.notes, row.status, row.created_at, row.updated_at,
    ]);
  }

  async delete(id: string, labId: string): Promise<boolean> {
    const result = await this.db.execute(
      'DELETE FROM consumable_products WHERE id = $1 AND lab_id = $2',
      [id, labId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async hasTransactions(id: string): Promise<boolean> {
    const row = await this.db.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM consumable_transactions WHERE product_id = $1',
      [id]
    );
    return parseInt(row?.count ?? '0', 10) > 0;
  }

  // Documents

  async findDocumentsByProductId(productId: string): Promise<ConsumableDocument[]> {
    const rows = await this.db.queryMany<ConsumableDocumentRow>(
      `SELECT ${DOC_COLUMNS} FROM consumable_documents WHERE product_id = $1 ORDER BY created_at DESC`,
      [productId]
    );
    return ConsumableDocumentMapper.fromRows(rows);
  }

  async saveDocument(document: ConsumableDocument): Promise<void> {
    const row = ConsumableDocumentMapper.toRow(document);
    await this.db.execute(`
      INSERT INTO consumable_documents (${DOC_COLUMNS})
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [row.id, row.product_id, row.label, row.url, row.notes, row.created_at]);
  }

  async deleteDocument(id: string): Promise<boolean> {
    const result = await this.db.execute('DELETE FROM consumable_documents WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  // Barcodes

  async findBarcodesByProductId(productId: string): Promise<ConsumableBarcodeRow[]> {
    const rows = await this.db.queryMany<ConsumableBarcodeDbRow>(
      `SELECT ${BARCODE_COLUMNS} FROM consumable_barcodes WHERE product_id = $1`,
      [productId]
    );
    return ConsumableBarcodeMapper.fromRows(rows);
  }

  async findByBarcodeValue(barcodeValue: string): Promise<ConsumableBarcodeRow | null> {
    const row = await this.db.queryOne<ConsumableBarcodeDbRow>(
      `SELECT ${BARCODE_COLUMNS} FROM consumable_barcodes WHERE barcode_value = $1`,
      [barcodeValue]
    );
    return row ? ConsumableBarcodeMapper.fromRow(row) : null;
  }

  async saveBarcode(barcode: ConsumableBarcodeRow): Promise<void> {
    await this.db.execute(`
      INSERT INTO consumable_barcodes (${BARCODE_COLUMNS})
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [barcode.id, barcode.productId, barcode.barcodeValue, barcode.barcodeType, barcode.isPrimary, barcode.label ?? null]);
  }

  async deleteBarcode(id: string): Promise<boolean> {
    const result = await this.db.execute('DELETE FROM consumable_barcodes WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  // Stock

  async findStockByProductId(productId: string): Promise<ConsumableStockRow[]> {
    const rows = await this.db.queryMany<ConsumableStockDbRow>(
      `SELECT ${STOCK_COLUMNS} FROM consumable_stock WHERE product_id = $1`,
      [productId]
    );
    return ConsumableStockMapper.fromRows(rows);
  }

  async getTotalStock(productId: string): Promise<number> {
    const row = await this.db.queryOne<{ total: string }>(
      'SELECT COALESCE(SUM(quantity), 0) as total FROM consumable_stock WHERE product_id = $1',
      [productId]
    );
    return parseFloat(row?.total ?? '0');
  }

  // Transactions — atomic: UPSERT stock RETURNING quantity → INSERT transaction

  async findTransactionsByProductId(productId: string, limit?: number): Promise<ConsumableTransactionRow[]> {
    if (limit != null) {
      const rows = await this.db.queryMany<ConsumableTransactionDbRow>(
        `SELECT ${TXN_COLUMNS} FROM consumable_transactions WHERE product_id = $1 ORDER BY created_at DESC LIMIT $2`,
        [productId, limit]
      );
      return ConsumableTransactionMapper.fromRows(rows);
    }
    const rows = await this.db.queryMany<ConsumableTransactionDbRow>(
      `SELECT ${TXN_COLUMNS} FROM consumable_transactions WHERE product_id = $1 ORDER BY created_at DESC`,
      [productId]
    );
    return ConsumableTransactionMapper.fromRows(rows);
  }

  async recordTransaction(data: RecordTransactionData): Promise<ConsumableTransactionRow> {
    return await this.db.transaction(async (client) => {
      const stockResult = await client.query<{ quantity: string }>(
        `INSERT INTO consumable_stock (id, product_id, location_id, quantity, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (product_id, location_id) DO UPDATE SET
           quantity = consumable_stock.quantity + $4,
           updated_at = NOW()
         RETURNING quantity`,
        [generateId('cstk'), data.productId, data.locationId, data.quantityChange]
      );
      const quantityAfter = parseFloat(stockResult.rows[0].quantity);

      const txnId = generateId('ctxn');
      const txnResult = await client.query<ConsumableTransactionDbRow>(
        `INSERT INTO consumable_transactions (${TXN_COLUMNS})
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
         RETURNING ${TXN_COLUMNS}`,
        [
          txnId, data.productId, data.locationId, data.labId, data.type,
          data.quantityChange, quantityAfter, data.lotNumber ?? null,
          data.expirationDate ?? null, data.poNumber ?? null, data.cost ?? null,
          data.performedBy, data.notes ?? null,
        ]
      );

      return ConsumableTransactionMapper.fromRow(txnResult.rows[0]);
    });
  }

  // Reorder

  async findProductsBelowThreshold(labId: string): Promise<ProductWithStock[]> {
    const rows = await this.db.queryMany<ConsumableProductRow & { total_stock: string }>(`
      SELECT p.*, COALESCE(SUM(s.quantity), 0) as total_stock
      FROM consumable_products p
      LEFT JOIN consumable_stock s ON s.product_id = p.id
      WHERE p.lab_id = $1 AND p.status = 'active' AND p.reorder_threshold IS NOT NULL
      GROUP BY p.id
      HAVING COALESCE(SUM(s.quantity), 0) < p.reorder_threshold
      ORDER BY p.name
    `, [labId]);

    return rows.map(row => ({
      product: ConsumableProductMapper.fromRow(row),
      totalStock: parseFloat(row.total_stock),
    }));
  }

  // Lookup support

  async countProductsUsingProperty(value: string, labId: string): Promise<number> {
    const row = await this.db.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM consumable_products WHERE $1 = ANY(properties) AND lab_id = $2',
      [value, labId]
    );
    return parseInt(row?.count ?? '0', 10);
  }

  async renameProperty(oldValue: string, newValue: string, labId: string): Promise<number> {
    const result = await this.db.execute(
      'UPDATE consumable_products SET properties = array_replace(properties, $1, $2) WHERE $1 = ANY(properties) AND lab_id = $3',
      [oldValue, newValue, labId]
    );
    return result.rowCount ?? 0;
  }

  async countProductsUsingVendor(value: string, labId: string): Promise<number> {
    const row = await this.db.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM consumable_products WHERE vendor_name = $1 AND lab_id = $2',
      [value, labId]
    );
    return parseInt(row?.count ?? '0', 10);
  }

  async renameVendor(oldValue: string, newValue: string, labId: string): Promise<number> {
    const result = await this.db.execute(
      'UPDATE consumable_products SET vendor_name = $2 WHERE vendor_name = $1 AND lab_id = $3',
      [oldValue, newValue, labId]
    );
    return result.rowCount ?? 0;
  }

  async countProductsUsingManufacturer(value: string, labId: string): Promise<number> {
    const row = await this.db.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM consumable_products WHERE manufacturer = $1 AND lab_id = $2',
      [value, labId]
    );
    return parseInt(row?.count ?? '0', 10);
  }

  async renameManufacturer(oldValue: string, newValue: string, labId: string): Promise<number> {
    const result = await this.db.execute(
      'UPDATE consumable_products SET manufacturer = $2 WHERE manufacturer = $1 AND lab_id = $3',
      [oldValue, newValue, labId]
    );
    return result.rowCount ?? 0;
  }

  async countProductsUsingStockUnit(value: string, labId: string): Promise<number> {
    const row = await this.db.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM consumable_products WHERE stock_unit = $1 AND lab_id = $2',
      [value, labId]
    );
    return parseInt(row?.count ?? '0', 10);
  }

  async renameStockUnit(oldValue: string, newValue: string, labId: string): Promise<number> {
    const result = await this.db.execute(
      'UPDATE consumable_products SET stock_unit = $2 WHERE stock_unit = $1 AND lab_id = $3',
      [oldValue, newValue, labId]
    );
    return result.rowCount ?? 0;
  }

  // Packaging levels

  async findPackagingLevelsByProductId(productId: string): Promise<ConsumablePackagingLevelRow[]> {
    const rows = await this.db.queryMany<ConsumablePackagingLevelDbRow>(
      'SELECT id, product_id, unit_name, quantity, parent_unit FROM consumable_packaging_levels WHERE product_id = $1',
      [productId]
    );
    return ConsumablePackagingLevelMapper.fromRows(rows);
  }

  async savePackagingLevel(level: ConsumablePackagingLevelRow): Promise<void> {
    await this.db.execute(
      'INSERT INTO consumable_packaging_levels (id, product_id, unit_name, quantity, parent_unit) VALUES ($1, $2, $3, $4, $5)',
      [level.id, level.productId, level.unitName, String(level.quantity), level.parentUnit ?? null]
    );
  }

  async updatePackagingLevel(id: string, quantity: number): Promise<void> {
    await this.db.execute(
      'UPDATE consumable_packaging_levels SET quantity = $1 WHERE id = $2',
      [String(quantity), id]
    );
  }

  async deletePackagingLevel(id: string): Promise<boolean> {
    const result = await this.db.execute('DELETE FROM consumable_packaging_levels WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
