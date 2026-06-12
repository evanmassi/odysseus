/**
 * Supply Item Repository
 *
 * PostgreSQL implementation for supply items, documents, barcodes,
 * stock levels, transactions, and lookup value support.
 */

import type { SupplyDocument } from '@domain/entities/SupplyDocument';
import type { SupplyItem } from '@domain/entities/SupplyItem';
import type {
  SupplyItemRepository as ISupplyItemRepository,
  SupplyStockRow,
  SupplyBarcodeRow,
  SupplyTransactionRow,
  SupplyPackagingLevelRow,
  ItemWithStock,
  RecordTransactionData,
  VoidTransactionData,
} from '@domain/repositories/SupplyItemRepository';
import { generateId } from '@domain/utils/generateId';
import type { SupplyBarcodeDbRow } from '@infrastructure/database/mappers/SupplyBarcodeMapper';
import { SupplyBarcodeMapper } from '@infrastructure/database/mappers/SupplyBarcodeMapper';
import type { SupplyDocumentRow } from '@infrastructure/database/mappers/SupplyDocumentMapper';
import { SupplyDocumentMapper } from '@infrastructure/database/mappers/SupplyDocumentMapper';
import type { SupplyItemRow } from '@infrastructure/database/mappers/SupplyItemMapper';
import { SupplyItemMapper } from '@infrastructure/database/mappers/SupplyItemMapper';
import type { SupplyPackagingLevelDbRow } from '@infrastructure/database/mappers/SupplyPackagingLevelMapper';
import { SupplyPackagingLevelMapper } from '@infrastructure/database/mappers/SupplyPackagingLevelMapper';
import type { SupplyStockDbRow } from '@infrastructure/database/mappers/SupplyStockMapper';
import { SupplyStockMapper } from '@infrastructure/database/mappers/SupplyStockMapper';
import type { SupplyTransactionDbRow } from '@infrastructure/database/mappers/SupplyTransactionMapper';
import { SupplyTransactionMapper } from '@infrastructure/database/mappers/SupplyTransactionMapper';
import type { PostgresContext } from '@infrastructure/database/PostgresContext';

const ITEM_COLUMNS = `id, lab_id, category_id, name, manufacturer, catalog_number,
  vendor_name, vendor_catalog_number, stock_unit, base_item_name,
  reorder_threshold, reorder_threshold_unit, reorder_quantity, reorder_unit, unit_price, properties,
  current_lot_number, description, notes, status, created_at, updated_at`;

const DOC_COLUMNS = 'id, item_id, label, url, notes, created_at';
const BARCODE_COLUMNS = 'id, item_id, barcode_value, barcode_type, is_primary, label';
const STOCK_COLUMNS = 'id, item_id, location_id, quantity, updated_at';
const TXN_COLUMNS = `id, item_id, location_id, lab_id, type, quantity_change, quantity_after,
  lot_number, expiration_date, po_number, cost, performed_by, notes, created_at,
  voided_at, voided_by, void_reason, related_transaction_id`;

export class SupplyItemRepository implements ISupplyItemRepository {

  constructor(private db: PostgresContext) {}

  // Items

  async findById(id: string, labId: string): Promise<SupplyItem | null> {
    const row = await this.db.queryOne<SupplyItemRow>(
      `SELECT ${ITEM_COLUMNS} FROM supply_items WHERE id = $1 AND lab_id = $2`,
      [id, labId]
    );
    return row ? SupplyItemMapper.fromRow(row) : null;
  }

  async findByLabId(labId: string): Promise<SupplyItem[]> {
    const rows = await this.db.queryMany<SupplyItemRow>(
      `SELECT ${ITEM_COLUMNS} FROM supply_items WHERE lab_id = $1 ORDER BY name`,
      [labId]
    );
    return SupplyItemMapper.fromRows(rows);
  }

  async findByLabIdWithStock(labId: string): Promise<ItemWithStock[]> {
    const rows = await this.db.queryMany<SupplyItemRow & { total_stock: string; location_names: string[] }>(
      `SELECT p.*, COALESCE(SUM(s.quantity), 0) as total_stock,
              COALESCE(
                array_agg(DISTINCT l.name ORDER BY l.name) FILTER (WHERE l.name IS NOT NULL AND s.quantity > 0),
                '{}'
              ) as location_names
       FROM supply_items p
       LEFT JOIN supply_stock s ON s.item_id = p.id
       LEFT JOIN supply_locations l ON l.id = s.location_id
       WHERE p.lab_id = $1
       GROUP BY p.id
       ORDER BY p.name`,
      [labId]
    );
    return rows.map(row => ({
      item: SupplyItemMapper.fromRow(row),
      totalStock: parseFloat(row.total_stock),
      locationNames: row.location_names ?? [],
    }));
  }

  async findByCategoryId(categoryId: string, labId: string): Promise<SupplyItem[]> {
    const rows = await this.db.queryMany<SupplyItemRow>(
      `SELECT ${ITEM_COLUMNS} FROM supply_items WHERE category_id = $1 AND lab_id = $2 ORDER BY name`,
      [categoryId, labId]
    );
    return SupplyItemMapper.fromRows(rows);
  }

  async save(item: SupplyItem): Promise<void> {
    const row = SupplyItemMapper.toRow(item);
    await this.db.execute(`
      INSERT INTO supply_items (${ITEM_COLUMNS})
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
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
        reorder_threshold_unit = EXCLUDED.reorder_threshold_unit,
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
      row.reorder_threshold, row.reorder_threshold_unit, row.reorder_quantity, row.reorder_unit, row.unit_price, row.properties,
      row.current_lot_number, row.description, row.notes, row.status, row.created_at, row.updated_at,
    ]);
  }

  async delete(id: string, labId: string): Promise<boolean> {
    const result = await this.db.execute(
      'DELETE FROM supply_items WHERE id = $1 AND lab_id = $2',
      [id, labId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async hasTransactions(id: string): Promise<boolean> {
    const row = await this.db.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM supply_transactions WHERE item_id = $1',
      [id]
    );
    return parseInt(row?.count ?? '0', 10) > 0;
  }

  // Documents

  async findDocumentsByItemId(itemId: string): Promise<SupplyDocument[]> {
    const rows = await this.db.queryMany<SupplyDocumentRow>(
      `SELECT ${DOC_COLUMNS} FROM supply_documents WHERE item_id = $1 ORDER BY created_at DESC`,
      [itemId]
    );
    return SupplyDocumentMapper.fromRows(rows);
  }

  async saveDocument(document: SupplyDocument): Promise<void> {
    const row = SupplyDocumentMapper.toRow(document);
    await this.db.execute(`
      INSERT INTO supply_documents (${DOC_COLUMNS})
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [row.id, row.item_id, row.label, row.url, row.notes, row.created_at]);
  }

  async updateDocument(id: string, fields: { label?: string; url?: string; notes?: string | null }): Promise<void> {
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (fields.label !== undefined) { sets.push(`label = $${idx++}`); params.push(fields.label); }
    if (fields.url !== undefined) { sets.push(`url = $${idx++}`); params.push(fields.url); }
    if (fields.notes !== undefined) { sets.push(`notes = $${idx++}`); params.push(fields.notes); }
    if (sets.length === 0) return;

    params.push(id);
    await this.db.execute(
      `UPDATE supply_documents SET ${sets.join(', ')} WHERE id = $${idx}`,
      params
    );
  }

  async deleteDocument(id: string): Promise<boolean> {
    const result = await this.db.execute('DELETE FROM supply_documents WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  // Barcodes

  async findBarcodesByItemId(itemId: string): Promise<SupplyBarcodeRow[]> {
    const rows = await this.db.queryMany<SupplyBarcodeDbRow>(
      `SELECT ${BARCODE_COLUMNS} FROM supply_barcodes WHERE item_id = $1`,
      [itemId]
    );
    return SupplyBarcodeMapper.fromRows(rows);
  }

  async findPrimaryBarcodesByItemIds(itemIds: string[], labId: string): Promise<SupplyBarcodeRow[]> {
    const rows = await this.db.queryMany<SupplyBarcodeDbRow>(
      `SELECT b.id, b.item_id, b.barcode_value, b.barcode_type, b.is_primary, b.label
       FROM supply_barcodes b
       JOIN supply_items i ON i.id = b.item_id
       WHERE b.item_id = ANY($1) AND i.lab_id = $2 AND b.is_primary = true`,
      [itemIds, labId]
    );
    return SupplyBarcodeMapper.fromRows(rows);
  }

  async findByBarcodeValue(barcodeValue: string): Promise<SupplyBarcodeRow | null> {
    const row = await this.db.queryOne<SupplyBarcodeDbRow>(
      `SELECT ${BARCODE_COLUMNS} FROM supply_barcodes WHERE barcode_value = $1`,
      [barcodeValue]
    );
    return row ? SupplyBarcodeMapper.fromRow(row) : null;
  }

  async saveBarcode(barcode: SupplyBarcodeRow): Promise<void> {
    await this.db.execute(`
      INSERT INTO supply_barcodes (${BARCODE_COLUMNS})
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [barcode.id, barcode.itemId, barcode.barcodeValue, barcode.barcodeType, barcode.isPrimary, barcode.label ?? null]);
  }

  async updateBarcode(id: string, fields: { label?: string | null; isPrimary?: boolean }): Promise<void> {
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (fields.label !== undefined) {
      sets.push(`label = $${idx++}`);
      params.push(fields.label);
    }
    if (fields.isPrimary !== undefined) {
      sets.push(`is_primary = $${idx++}`);
      params.push(fields.isPrimary);
    }
    if (sets.length === 0) return;

    params.push(id);
    await this.db.execute(
      `UPDATE supply_barcodes SET ${sets.join(', ')} WHERE id = $${idx}`,
      params
    );
  }

  async deleteBarcode(id: string): Promise<boolean> {
    const result = await this.db.execute('DELETE FROM supply_barcodes WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  // Stock

  async findStockByItemId(itemId: string): Promise<SupplyStockRow[]> {
    const rows = await this.db.queryMany<SupplyStockDbRow>(
      `SELECT ${STOCK_COLUMNS} FROM supply_stock WHERE item_id = $1`,
      [itemId]
    );
    return SupplyStockMapper.fromRows(rows);
  }

  async getTotalStock(itemId: string): Promise<number> {
    const row = await this.db.queryOne<{ total: string }>(
      'SELECT COALESCE(SUM(quantity), 0) as total FROM supply_stock WHERE item_id = $1',
      [itemId]
    );
    return parseFloat(row?.total ?? '0');
  }

  // Transactions — atomic: UPSERT stock RETURNING quantity → INSERT transaction

  async findTransactionsByItemId(itemId: string, limit?: number): Promise<SupplyTransactionRow[]> {
    if (limit != null) {
      const rows = await this.db.queryMany<SupplyTransactionDbRow>(
        `SELECT ${TXN_COLUMNS} FROM supply_transactions WHERE item_id = $1 ORDER BY created_at DESC LIMIT $2`,
        [itemId, limit]
      );
      return SupplyTransactionMapper.fromRows(rows);
    }
    const rows = await this.db.queryMany<SupplyTransactionDbRow>(
      `SELECT ${TXN_COLUMNS} FROM supply_transactions WHERE item_id = $1 ORDER BY created_at DESC`,
      [itemId]
    );
    return SupplyTransactionMapper.fromRows(rows);
  }

  async recordTransaction(data: RecordTransactionData): Promise<SupplyTransactionRow> {
    return await this.db.transaction(async (client) => {
      const stockResult = await client.query<{ quantity: string }>(
        `INSERT INTO supply_stock (id, item_id, location_id, quantity, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (item_id, location_id) DO UPDATE SET
           quantity = supply_stock.quantity + $4,
           updated_at = NOW()
         RETURNING quantity`,
        [generateId('sstk'), data.itemId, data.locationId, data.quantityChange]
      );
      const quantityAfter = parseFloat(stockResult.rows[0].quantity);

      const txnId = generateId('stxn');
      const txnResult = await client.query<SupplyTransactionDbRow>(
        `INSERT INTO supply_transactions (${TXN_COLUMNS})
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NULL, NULL, NULL, NULL)
         RETURNING ${TXN_COLUMNS}`,
        [
          txnId, data.itemId, data.locationId, data.labId, data.type,
          data.quantityChange, quantityAfter, data.lotNumber ?? null,
          data.expirationDate ?? null, data.poNumber ?? null, data.cost ?? null,
          data.performedBy, data.notes ?? null,
        ]
      );

      return SupplyTransactionMapper.fromRow(txnResult.rows[0]);
    });
  }

  async findTransactionById(id: string): Promise<SupplyTransactionRow | null> {
    const row = await this.db.queryOne<SupplyTransactionDbRow>(
      `SELECT ${TXN_COLUMNS} FROM supply_transactions WHERE id = $1`,
      [id]
    );
    return row ? SupplyTransactionMapper.fromRow(row) : null;
  }

  async voidTransaction(data: VoidTransactionData): Promise<{ original: SupplyTransactionRow; reversal: SupplyTransactionRow }> {
    return await this.db.transaction(async (client) => {
      const originalRow = await client.query<SupplyTransactionDbRow>(
        `SELECT ${TXN_COLUMNS} FROM supply_transactions WHERE id = $1`,
        [data.transactionId]
      );
      if (originalRow.rows.length === 0) {
        throw new Error(`Transaction ${data.transactionId} not found`);
      }
      const original = SupplyTransactionMapper.fromRow(originalRow.rows[0]);

      if (originalRow.rows[0].voided_at) {
        throw new Error('Transaction has already been voided');
      }

      await client.query(
        `UPDATE supply_transactions SET voided_at = NOW(), voided_by = $1, void_reason = $2 WHERE id = $3`,
        [data.voidedBy, data.voidReason, data.transactionId]
      );

      const reversedQuantity = -original.quantityChange;
      const stockResult = await client.query<{ quantity: string }>(
        `INSERT INTO supply_stock (id, item_id, location_id, quantity, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (item_id, location_id) DO UPDATE SET
           quantity = supply_stock.quantity + $4,
           updated_at = NOW()
         RETURNING quantity`,
        [generateId('sstk'), original.itemId, original.locationId, reversedQuantity]
      );
      const quantityAfter = parseFloat(stockResult.rows[0].quantity);

      const reversalId = generateId('stxn');
      const reversalResult = await client.query<SupplyTransactionDbRow>(
        `INSERT INTO supply_transactions (${TXN_COLUMNS})
         VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, NULL, NULL, NULL, $8, $9, NOW(), NULL, NULL, NULL, $10)
         RETURNING ${TXN_COLUMNS}`,
        [
          reversalId, original.itemId, original.locationId, original.labId, 'void_reversal',
          reversedQuantity, quantityAfter, data.voidedBy,
          `Void reversal of ${data.transactionId}`, data.transactionId,
        ]
      );

      const updatedOriginalRow = await client.query<SupplyTransactionDbRow>(
        `SELECT ${TXN_COLUMNS} FROM supply_transactions WHERE id = $1`,
        [data.transactionId]
      );

      return {
        original: SupplyTransactionMapper.fromRow(updatedOriginalRow.rows[0]),
        reversal: SupplyTransactionMapper.fromRow(reversalResult.rows[0]),
      };
    });
  }

  // Reorder

  async findItemsAtOrBelowThreshold(labId: string): Promise<ItemWithStock[]> {
    const rows = await this.db.queryMany<SupplyItemRow & { total_stock: string; location_names: string[] }>(`
      SELECT p.*, COALESCE(SUM(s.quantity), 0) as total_stock,
             COALESCE(
               array_agg(DISTINCT l.name ORDER BY l.name) FILTER (WHERE l.name IS NOT NULL AND s.quantity > 0),
               '{}'
             ) as location_names
      FROM supply_items p
      LEFT JOIN supply_stock s ON s.item_id = p.id
      LEFT JOIN supply_locations l ON l.id = s.location_id
      WHERE p.lab_id = $1 AND p.status = 'active' AND p.reorder_threshold IS NOT NULL
      GROUP BY p.id
      HAVING COALESCE(SUM(s.quantity), 0) <= p.reorder_threshold
      ORDER BY p.name
    `, [labId]);

    return rows.map(row => ({
      item: SupplyItemMapper.fromRow(row),
      totalStock: parseFloat(row.total_stock),
      locationNames: row.location_names ?? [],
    }));
  }

  // Lookup support

  async countItemsUsingProperty(value: string, labId: string): Promise<number> {
    const row = await this.db.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM supply_items WHERE $1 = ANY(properties) AND lab_id = $2',
      [value, labId]
    );
    return parseInt(row?.count ?? '0', 10);
  }

  async renameProperty(oldValue: string, newValue: string, labId: string): Promise<number> {
    const result = await this.db.execute(
      'UPDATE supply_items SET properties = array_replace(properties, $1, $2) WHERE $1 = ANY(properties) AND lab_id = $3',
      [oldValue, newValue, labId]
    );
    return result.rowCount ?? 0;
  }

  async countItemsUsingVendor(value: string, labId: string): Promise<number> {
    const row = await this.db.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM supply_items WHERE vendor_name = $1 AND lab_id = $2',
      [value, labId]
    );
    return parseInt(row?.count ?? '0', 10);
  }

  async renameVendor(oldValue: string, newValue: string, labId: string): Promise<number> {
    const result = await this.db.execute(
      'UPDATE supply_items SET vendor_name = $2 WHERE vendor_name = $1 AND lab_id = $3',
      [oldValue, newValue, labId]
    );
    return result.rowCount ?? 0;
  }

  async countItemsUsingManufacturer(value: string, labId: string): Promise<number> {
    const row = await this.db.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM supply_items WHERE manufacturer = $1 AND lab_id = $2',
      [value, labId]
    );
    return parseInt(row?.count ?? '0', 10);
  }

  async renameManufacturer(oldValue: string, newValue: string, labId: string): Promise<number> {
    const result = await this.db.execute(
      'UPDATE supply_items SET manufacturer = $2 WHERE manufacturer = $1 AND lab_id = $3',
      [oldValue, newValue, labId]
    );
    return result.rowCount ?? 0;
  }

  async countItemsUsingStockUnit(value: string, labId: string): Promise<number> {
    const row = await this.db.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM supply_items WHERE stock_unit = $1 AND lab_id = $2',
      [value, labId]
    );
    return parseInt(row?.count ?? '0', 10);
  }

  async renameStockUnit(oldValue: string, newValue: string, labId: string): Promise<number> {
    const result = await this.db.execute(
      'UPDATE supply_items SET stock_unit = $2 WHERE stock_unit = $1 AND lab_id = $3',
      [oldValue, newValue, labId]
    );
    return result.rowCount ?? 0;
  }

  // Packaging levels

  async findPackagingLevelsByItemId(itemId: string): Promise<SupplyPackagingLevelRow[]> {
    const rows = await this.db.queryMany<SupplyPackagingLevelDbRow>(
      'SELECT id, item_id, unit_name, quantity, parent_unit FROM supply_packaging_levels WHERE item_id = $1',
      [itemId]
    );
    return SupplyPackagingLevelMapper.fromRows(rows);
  }

  async savePackagingLevel(level: SupplyPackagingLevelRow): Promise<void> {
    await this.db.execute(
      'INSERT INTO supply_packaging_levels (id, item_id, unit_name, quantity, parent_unit) VALUES ($1, $2, $3, $4, $5)',
      [level.id, level.itemId, level.unitName, String(level.quantity), level.parentUnit ?? null]
    );
  }

  async updatePackagingLevel(id: string, quantity: number): Promise<void> {
    await this.db.execute(
      'UPDATE supply_packaging_levels SET quantity = $1 WHERE id = $2',
      [String(quantity), id]
    );
  }

  async deletePackagingLevel(id: string): Promise<boolean> {
    const result = await this.db.execute('DELETE FROM supply_packaging_levels WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
