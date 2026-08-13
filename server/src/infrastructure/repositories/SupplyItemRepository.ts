/**
 * Supply Item Repository
 *
 * PostgreSQL implementation for supply items, documents, barcodes,
 * stock levels, transactions, and lookup value support.
 */

import type { DocumentPatch } from '@domain/entities/Document';
import { SupplyDocument } from '@domain/entities/SupplyDocument';
import type { SupplyItem } from '@domain/entities/SupplyItem';
import type { AttributeValueRow } from '@domain/repositories/AttributeRepository';
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
import type { SupplyItemRow } from '@infrastructure/database/mappers/SupplyItemMapper';
import { SupplyItemMapper } from '@infrastructure/database/mappers/SupplyItemMapper';
import type { SupplyPackagingLevelDbRow } from '@infrastructure/database/mappers/SupplyPackagingLevelMapper';
import { SupplyPackagingLevelMapper } from '@infrastructure/database/mappers/SupplyPackagingLevelMapper';
import type { SupplyStockDbRow } from '@infrastructure/database/mappers/SupplyStockMapper';
import { SupplyStockMapper } from '@infrastructure/database/mappers/SupplyStockMapper';
import type { SupplyTransactionDbRow } from '@infrastructure/database/mappers/SupplyTransactionMapper';
import { SupplyTransactionMapper } from '@infrastructure/database/mappers/SupplyTransactionMapper';
import { parseCount } from '@infrastructure/database/PostgresContext';
import type { Queryable } from '@infrastructure/database/Queryable';
import { AttributeValueQueries } from '@infrastructure/repositories/AttributeValueQueries';
import { DocumentQueries } from '@infrastructure/repositories/DocumentQueries';

const ITEM_COLUMNS = `id, lab_id, category_id, name, manufacturer, catalog_number,
  vendor_name, vendor_catalog_number, stock_unit, base_item_name,
  reorder_threshold, reorder_threshold_unit, reorder_quantity, reorder_unit, unit_price,
  current_lot_number, description, notes, status, is_seeded, created_at, updated_at`;

const BARCODE_COLUMNS = 'id, item_id, barcode_value, barcode_type, is_primary, label';
const STOCK_COLUMNS = 'id, item_id, location_id, quantity, updated_at';
const TXN_COLUMNS = `id, item_id, location_id, lab_id, type, quantity_change, quantity_after,
  lot_number, expiration_date, po_number, cost, performed_by, notes, created_at,
  voided_at, voided_by, void_reason, related_transaction_id, is_seeded`;

// Shared prefix for the two item-with-stock queries; callers append their own WHERE/GROUP BY/HAVING/ORDER BY.
const ITEM_WITH_STOCK_SELECT = `
  SELECT p.*, COALESCE(SUM(s.quantity), 0) as total_stock,
         COALESCE(
           array_agg(DISTINCT l.name ORDER BY l.name) FILTER (WHERE l.name IS NOT NULL AND s.quantity > 0),
           '{}'
         ) as location_names
  FROM supply_items p
  LEFT JOIN supply_stock s ON s.item_id = p.id
  LEFT JOIN locations l ON l.id = s.location_id`;

type ItemWithStockRow = SupplyItemRow & { total_stock: string; location_names: string[] };

export class SupplyItemRepository implements ISupplyItemRepository {
  private readonly documents: DocumentQueries<SupplyDocument>;
  private readonly attributeValues: AttributeValueQueries;

  constructor(private db: Queryable) {
    this.documents = new DocumentQueries(db, 'supply_documents', data =>
      SupplyDocument.fromData(data)
    );
    this.attributeValues = new AttributeValueQueries(db, 'supply_attribute_values', 'supply_items');
  }

  // Items

  async findById(id: string, labId: string): Promise<SupplyItem | null> {
    const row = await this.db.queryOne<SupplyItemRow>(
      `SELECT ${ITEM_COLUMNS} FROM supply_items WHERE id = $1 AND lab_id = $2`,
      [id, labId]
    );
    return row ? SupplyItemMapper.fromRow(row) : null;
  }

  async findByLabIdWithStock(labId: string): Promise<ItemWithStock[]> {
    const rows = await this.db.queryMany<ItemWithStockRow>(
      `${ITEM_WITH_STOCK_SELECT}
       WHERE p.lab_id = $1
       GROUP BY p.id
       ORDER BY p.name`,
      [labId]
    );
    return rows.map(row => this.toItemWithStock(row));
  }

  async save(item: SupplyItem): Promise<void> {
    const row = SupplyItemMapper.toRow(item);
    await this.db.execute(
      `
      INSERT INTO supply_items (${ITEM_COLUMNS})
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      -- is_seeded is insert-only, like created_at: an edit must never clear a seeded record's protection.
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
        current_lot_number = EXCLUDED.current_lot_number,
        description = EXCLUDED.description,
        notes = EXCLUDED.notes,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at
    `,
      [
        row.id,
        row.lab_id,
        row.category_id,
        row.name,
        row.manufacturer,
        row.catalog_number,
        row.vendor_name,
        row.vendor_catalog_number,
        row.stock_unit,
        row.base_item_name,
        row.reorder_threshold,
        row.reorder_threshold_unit,
        row.reorder_quantity,
        row.reorder_unit,
        row.unit_price,
        row.current_lot_number,
        row.description,
        row.notes,
        row.status,
        row.is_seeded,
        row.created_at,
        row.updated_at,
      ]
    );
  }

  async delete(id: string, labId: string): Promise<boolean> {
    const result = await this.db.execute('DELETE FROM supply_items WHERE id = $1 AND lab_id = $2', [
      id,
      labId,
    ]);
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
    return this.documents.findByItemId(itemId);
  }

  async saveDocument(document: SupplyDocument): Promise<void> {
    return this.documents.save(document);
  }

  async updateDocument(
    id: string,
    itemId: string,
    fields: DocumentPatch
  ): Promise<SupplyDocument | null> {
    return this.documents.update(id, itemId, fields);
  }

  async deleteDocument(id: string, itemId: string): Promise<boolean> {
    return this.documents.delete(id, itemId);
  }

  // Barcodes

  async findBarcodesByItemId(itemId: string): Promise<SupplyBarcodeRow[]> {
    const rows = await this.db.queryMany<SupplyBarcodeDbRow>(
      `SELECT ${BARCODE_COLUMNS} FROM supply_barcodes WHERE item_id = $1`,
      [itemId]
    );
    return SupplyBarcodeMapper.fromRows(rows);
  }

  async findPrimaryBarcodesByItemIds(
    itemIds: string[],
    labId: string
  ): Promise<SupplyBarcodeRow[]> {
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
    await this.db.execute(
      `
      INSERT INTO supply_barcodes (${BARCODE_COLUMNS})
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
      [
        barcode.id,
        barcode.itemId,
        barcode.barcodeValue,
        barcode.barcodeType,
        barcode.isPrimary,
        barcode.label ?? null,
      ]
    );
  }

  async updateBarcode(
    id: string,
    itemId: string,
    fields: { label?: string | null; isPrimary?: boolean }
  ): Promise<SupplyBarcodeRow | null> {
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

    if (sets.length === 0) {
      const existing = await this.db.queryOne<SupplyBarcodeDbRow>(
        `SELECT ${BARCODE_COLUMNS} FROM supply_barcodes WHERE id = $1 AND item_id = $2`,
        [id, itemId]
      );
      return existing ? SupplyBarcodeMapper.fromRow(existing) : null;
    }

    params.push(id, itemId);
    const row = await this.db.queryOne<SupplyBarcodeDbRow>(
      `UPDATE supply_barcodes SET ${sets.join(', ')} WHERE id = $${idx} AND item_id = $${idx + 1} RETURNING ${BARCODE_COLUMNS}`,
      params
    );
    return row ? SupplyBarcodeMapper.fromRow(row) : null;
  }

  async deleteBarcode(id: string, itemId: string): Promise<boolean> {
    const result = await this.db.execute(
      'DELETE FROM supply_barcodes WHERE id = $1 AND item_id = $2',
      [id, itemId]
    );
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
    return await this.db.transaction(async client => {
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
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NULL, NULL, NULL, NULL, FALSE)
         RETURNING ${TXN_COLUMNS}`,
        [
          txnId,
          data.itemId,
          data.locationId,
          data.labId,
          data.type,
          data.quantityChange,
          quantityAfter,
          data.lotNumber ?? null,
          data.expirationDate ?? null,
          data.poNumber ?? null,
          data.cost ?? null,
          data.performedBy,
          data.notes ?? null,
        ]
      );

      return SupplyTransactionMapper.fromRow(txnResult.rows[0]);
    });
  }

  async findTransactionById(id: string, labId: string): Promise<SupplyTransactionRow | null> {
    const row = await this.db.queryOne<SupplyTransactionDbRow>(
      `SELECT ${TXN_COLUMNS} FROM supply_transactions WHERE id = $1 AND lab_id = $2`,
      [id, labId]
    );
    return row ? SupplyTransactionMapper.fromRow(row) : null;
  }

  async voidTransaction(
    data: VoidTransactionData
  ): Promise<{ original: SupplyTransactionRow; reversal: SupplyTransactionRow }> {
    return await this.db.transaction(async client => {
      const originalRow = await client.query<SupplyTransactionDbRow>(
        `SELECT ${TXN_COLUMNS} FROM supply_transactions WHERE id = $1 AND lab_id = $2`,
        [data.transactionId, data.labId]
      );
      if (originalRow.rows.length === 0) {
        throw new Error(`Transaction ${data.transactionId} not found`);
      }
      const original = SupplyTransactionMapper.fromRow(originalRow.rows[0]);

      if (originalRow.rows[0].voided_at) {
        throw new Error('Transaction has already been voided');
      }

      await client.query(
        `UPDATE supply_transactions SET voided_at = NOW(), voided_by = $1, void_reason = $2 WHERE id = $3 AND lab_id = $4`,
        [data.voidedBy, data.voidReason, data.transactionId, data.labId]
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
         VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, NULL, NULL, NULL, $8, $9, NOW(), NULL, NULL, NULL, $10, FALSE)
         RETURNING ${TXN_COLUMNS}`,
        [
          reversalId,
          original.itemId,
          original.locationId,
          original.labId,
          'void_reversal',
          reversedQuantity,
          quantityAfter,
          data.voidedBy,
          `Void reversal of ${data.transactionId}`,
          data.transactionId,
        ]
      );

      const updatedOriginalRow = await client.query<SupplyTransactionDbRow>(
        `SELECT ${TXN_COLUMNS} FROM supply_transactions WHERE id = $1 AND lab_id = $2`,
        [data.transactionId, data.labId]
      );

      return {
        original: SupplyTransactionMapper.fromRow(updatedOriginalRow.rows[0]),
        reversal: SupplyTransactionMapper.fromRow(reversalResult.rows[0]),
      };
    });
  }

  // Reorder

  async findItemsAtOrBelowThreshold(labId: string): Promise<ItemWithStock[]> {
    const rows = await this.db.queryMany<ItemWithStockRow>(
      `
      ${ITEM_WITH_STOCK_SELECT}
      WHERE p.lab_id = $1 AND p.status = 'active' AND p.reorder_threshold IS NOT NULL
      GROUP BY p.id
      HAVING COALESCE(SUM(s.quantity), 0) <= p.reorder_threshold
      ORDER BY p.name
    `,
      [labId]
    );

    return rows.map(row => this.toItemWithStock(row));
  }

  private toItemWithStock(row: ItemWithStockRow): ItemWithStock {
    return {
      item: SupplyItemMapper.fromRow(row),
      totalStock: parseFloat(row.total_stock),
      locationNames: row.location_names ?? [],
    };
  }

  // Lookup support

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

  // Attribute values

  async findAttributeValuesByItemId(itemId: string): Promise<AttributeValueRow[]> {
    return this.attributeValues.findByItemId(itemId);
  }

  async findAttributeValuesByLabId(labId: string): Promise<AttributeValueRow[]> {
    return this.attributeValues.findByLabId(labId);
  }

  // A multi_select writes one row per option, so the definition's rows are replaced wholesale.
  async replaceAttributeValues(
    itemId: string,
    definitionId: string,
    values: AttributeValueRow[]
  ): Promise<void> {
    await this.attributeValues.replace(itemId, definitionId, values);
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

  async deletePackagingLevel(id: string): Promise<boolean> {
    const result = await this.db.execute('DELETE FROM supply_packaging_levels WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async countNonSeededByLabId(labId: string): Promise<number> {
    const row = await this.db.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM supply_items WHERE lab_id = $1 AND is_seeded = FALSE',
      [labId]
    );
    return parseCount(row);
  }

  async deleteAllForLab(labId: string): Promise<number> {
    // The ledger is NO ACTION so it goes first; everything else cascades from the item.
    await this.db.execute('DELETE FROM supply_transactions WHERE lab_id = $1', [labId]);
    const result = await this.db.execute('DELETE FROM supply_items WHERE lab_id = $1', [labId]);
    return result.rowCount ?? 0;
  }
}
