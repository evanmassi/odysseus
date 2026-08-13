/**
 * Reagent Item Repository
 *
 * PostgreSQL implementation for reagent items, documents, barcodes, per-lot
 * stock, and transactions. Stock lives in lots: receiving finds-or-creates a
 * lot, FEFO issues draw across lots (one transaction row per lot moved), and a
 * count reconciles a single lot — all inside one transaction.
 */

import type { DocumentPatch } from '@domain/entities/Document';
import { ReagentDocument } from '@domain/entities/ReagentDocument';
import type { ReagentItem } from '@domain/entities/ReagentItem';
import { NotFoundError } from '@domain/errors/NotFoundError';
import { ValidationError } from '@domain/errors/ValidationError';
import type { AttributeValueRow } from '@domain/repositories/AttributeRepository';
import type {
  ReagentItemRepository as IReagentItemRepository,
  ReagentLotRow,
  ReagentBarcodeRow,
  ReagentLotLabelRow,
  ReagentTransactionRow,
  ReagentPackagingLevelRow,
  ItemWithStock,
  RecordTransactionData,
  VoidTransactionData,
} from '@domain/repositories/ReagentItemRepository';
import { planFefoDraw, type FefoPlan } from '@domain/services/reagentFefo';
import { generateInternalBarcodeValue } from '@domain/utils/barcodeValue';
import { generateId } from '@domain/utils/generateId';
import type { ReagentBarcodeDbRow } from '@infrastructure/database/mappers/ReagentBarcodeMapper';
import { ReagentBarcodeMapper } from '@infrastructure/database/mappers/ReagentBarcodeMapper';
import type { ReagentItemRow } from '@infrastructure/database/mappers/ReagentItemMapper';
import { ReagentItemMapper } from '@infrastructure/database/mappers/ReagentItemMapper';
import type { ReagentLotDbRow } from '@infrastructure/database/mappers/ReagentLotMapper';
import { ReagentLotMapper } from '@infrastructure/database/mappers/ReagentLotMapper';
import type { ReagentPackagingLevelDbRow } from '@infrastructure/database/mappers/ReagentPackagingLevelMapper';
import { ReagentPackagingLevelMapper } from '@infrastructure/database/mappers/ReagentPackagingLevelMapper';
import type { ReagentTransactionDbRow } from '@infrastructure/database/mappers/ReagentTransactionMapper';
import { ReagentTransactionMapper } from '@infrastructure/database/mappers/ReagentTransactionMapper';
import { parseCount } from '@infrastructure/database/PostgresContext';
import type { Queryable } from '@infrastructure/database/Queryable';
import { AttributeValueQueries } from '@infrastructure/repositories/AttributeValueQueries';
import { DocumentQueries } from '@infrastructure/repositories/DocumentQueries';

import type { PoolClient } from 'pg';

const ITEM_COLUMNS = `id, lab_id, category_id, name, manufacturer, catalog_number,
  vendor_name, vendor_catalog_number, stock_unit, reagent_type, cas_number,
  concentration, concentration_unit, expiry_warning_days,
  reorder_threshold, reorder_threshold_unit, reorder_quantity, reorder_unit, unit_price,
  description, notes, status, is_seeded, created_at, updated_at`;

interface ReagentLotLabelDbRow {
  item_id: string;
  lot_id: string;
  lot_number: string | null;
  expiration_date: string | null;
  location_id: string;
  barcode_value: string;
}

const LOT_COLUMNS = `id, item_id, location_id, lot_number, quantity, expiration_date,
  opened_date, received_date, concentration, concentration_unit, status, created_at, updated_at`;

const BARCODE_COLUMNS = 'id, item_id, lot_id, barcode_value, barcode_type, is_primary, label';

const TXN_COLUMNS = `id, item_id, lot_id, location_id, lab_id, type, quantity_change, quantity_after,
  po_number, cost, performed_by, notes, created_at, voided_at, voided_by, void_reason, related_transaction_id,
  is_seeded`;

// Shared prefix for the item-with-stock query; on-hand and soonest expiry roll up from active lots.
const ITEM_WITH_STOCK_SELECT = `
  SELECT p.*,
    COALESCE(SUM(lt.quantity), 0) as total_stock,
    COUNT(lt.id) FILTER (WHERE lt.quantity > 0) as lot_count,
    COUNT(lt.id) FILTER (WHERE lt.quantity > 0 AND lt.expiration_date < CURRENT_DATE) as expired_lot_count,
    MIN(lt.expiration_date) FILTER (WHERE lt.quantity > 0) as soonest_expiration,
    COALESCE(
      array_agg(DISTINCT loc.name ORDER BY loc.name) FILTER (WHERE loc.name IS NOT NULL AND lt.quantity > 0),
      '{}'
    ) as location_names
  FROM reagent_items p
  LEFT JOIN reagent_lots lt ON lt.item_id = p.id AND lt.status = 'active'
  LEFT JOIN locations loc ON loc.id = lt.location_id`;

type ItemWithStockRow = ReagentItemRow & {
  total_stock: string;
  lot_count: string;
  expired_lot_count: string;
  soonest_expiration: string | null;
  location_names: string[];
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export class ReagentItemRepository implements IReagentItemRepository {
  private readonly documents: DocumentQueries<ReagentDocument>;
  private readonly attributeValues: AttributeValueQueries;

  constructor(private db: Queryable) {
    this.documents = new DocumentQueries(db, 'reagent_documents', data =>
      ReagentDocument.fromData(data)
    );
    this.attributeValues = new AttributeValueQueries(
      db,
      'reagent_attribute_values',
      'reagent_items'
    );
  }

  // Items

  async findById(id: string, labId: string): Promise<ReagentItem | null> {
    const row = await this.db.queryOne<ReagentItemRow>(
      `SELECT ${ITEM_COLUMNS} FROM reagent_items WHERE id = $1 AND lab_id = $2`,
      [id, labId]
    );
    return row ? ReagentItemMapper.fromRow(row) : null;
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

  async save(item: ReagentItem): Promise<void> {
    const row = ReagentItemMapper.toRow(item);
    await this.db.execute(
      `
      INSERT INTO reagent_items (${ITEM_COLUMNS})
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
      -- is_seeded is insert-only, like created_at: an edit must never clear a seeded record's protection.
      ON CONFLICT (id) DO UPDATE SET
        category_id = EXCLUDED.category_id,
        name = EXCLUDED.name,
        manufacturer = EXCLUDED.manufacturer,
        catalog_number = EXCLUDED.catalog_number,
        vendor_name = EXCLUDED.vendor_name,
        vendor_catalog_number = EXCLUDED.vendor_catalog_number,
        stock_unit = EXCLUDED.stock_unit,
        reagent_type = EXCLUDED.reagent_type,
        cas_number = EXCLUDED.cas_number,
        concentration = EXCLUDED.concentration,
        concentration_unit = EXCLUDED.concentration_unit,
        expiry_warning_days = EXCLUDED.expiry_warning_days,
        reorder_threshold = EXCLUDED.reorder_threshold,
        reorder_threshold_unit = EXCLUDED.reorder_threshold_unit,
        reorder_quantity = EXCLUDED.reorder_quantity,
        reorder_unit = EXCLUDED.reorder_unit,
        unit_price = EXCLUDED.unit_price,
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
        row.reagent_type,
        row.cas_number,
        row.concentration,
        row.concentration_unit,
        row.expiry_warning_days,
        row.reorder_threshold,
        row.reorder_threshold_unit,
        row.reorder_quantity,
        row.reorder_unit,
        row.unit_price,
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
    const result = await this.db.execute(
      'DELETE FROM reagent_items WHERE id = $1 AND lab_id = $2',
      [id, labId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async hasTransactions(id: string): Promise<boolean> {
    const row = await this.db.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM reagent_transactions WHERE item_id = $1',
      [id]
    );
    return parseInt(row?.count ?? '0', 10) > 0;
  }

  // Documents

  async findDocumentsByItemId(itemId: string): Promise<ReagentDocument[]> {
    return this.documents.findByItemId(itemId);
  }

  async saveDocument(document: ReagentDocument): Promise<void> {
    return this.documents.save(document);
  }

  async updateDocument(
    id: string,
    itemId: string,
    fields: DocumentPatch
  ): Promise<ReagentDocument | null> {
    return this.documents.update(id, itemId, fields);
  }

  async deleteDocument(id: string, itemId: string): Promise<boolean> {
    return this.documents.delete(id, itemId);
  }

  // Barcodes

  async findBarcodesByItemId(itemId: string): Promise<ReagentBarcodeRow[]> {
    const rows = await this.db.queryMany<ReagentBarcodeDbRow>(
      `SELECT ${BARCODE_COLUMNS} FROM reagent_barcodes WHERE item_id = $1`,
      [itemId]
    );
    return ReagentBarcodeMapper.fromRows(rows);
  }

  async findPrimaryBarcodesByItemIds(
    itemIds: string[],
    labId: string
  ): Promise<ReagentBarcodeRow[]> {
    const rows = await this.db.queryMany<ReagentBarcodeDbRow>(
      `SELECT b.id, b.item_id, b.lot_id, b.barcode_value, b.barcode_type, b.is_primary, b.label
       FROM reagent_barcodes b
       JOIN reagent_items i ON i.id = b.item_id
       WHERE b.item_id = ANY($1) AND i.lab_id = $2 AND b.is_primary = true AND b.lot_id IS NULL`,
      [itemIds, labId]
    );
    return ReagentBarcodeMapper.fromRows(rows);
  }

  // Only lots still holding stock: a spent or disposed bottle needs no label.
  async findLotLabelsByItemIds(itemIds: string[], labId: string): Promise<ReagentLotLabelRow[]> {
    const rows = await this.db.queryMany<ReagentLotLabelDbRow>(
      `SELECT b.item_id, b.barcode_value, l.id AS lot_id, l.lot_number, l.expiration_date,
              l.location_id
       FROM reagent_barcodes b
       JOIN reagent_lots l ON l.id = b.lot_id
       JOIN reagent_items i ON i.id = b.item_id
       WHERE b.item_id = ANY($1) AND i.lab_id = $2 AND b.lot_id IS NOT NULL
         AND l.status = 'active' AND l.quantity > 0
       ORDER BY l.expiration_date NULLS LAST, l.lot_number`,
      [itemIds, labId]
    );
    return rows.map(row => ({
      itemId: row.item_id,
      lotId: row.lot_id,
      lotNumber: row.lot_number ?? undefined,
      expirationDate: row.expiration_date ?? undefined,
      locationId: row.location_id,
      barcodeValue: row.barcode_value,
    }));
  }

  async findByBarcodeValue(barcodeValue: string): Promise<ReagentBarcodeRow | null> {
    const row = await this.db.queryOne<ReagentBarcodeDbRow>(
      `SELECT ${BARCODE_COLUMNS} FROM reagent_barcodes WHERE barcode_value = $1`,
      [barcodeValue]
    );
    return row ? ReagentBarcodeMapper.fromRow(row) : null;
  }

  async saveBarcode(barcode: ReagentBarcodeRow): Promise<void> {
    await this.db.execute(
      `
      INSERT INTO reagent_barcodes (${BARCODE_COLUMNS})
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
      [
        barcode.id,
        barcode.itemId,
        barcode.lotId ?? null,
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
  ): Promise<ReagentBarcodeRow | null> {
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
      const existing = await this.db.queryOne<ReagentBarcodeDbRow>(
        `SELECT ${BARCODE_COLUMNS} FROM reagent_barcodes WHERE id = $1 AND item_id = $2`,
        [id, itemId]
      );
      return existing ? ReagentBarcodeMapper.fromRow(existing) : null;
    }

    params.push(id, itemId);
    const row = await this.db.queryOne<ReagentBarcodeDbRow>(
      `UPDATE reagent_barcodes SET ${sets.join(', ')} WHERE id = $${idx} AND item_id = $${idx + 1} RETURNING ${BARCODE_COLUMNS}`,
      params
    );
    return row ? ReagentBarcodeMapper.fromRow(row) : null;
  }

  async deleteBarcode(id: string, itemId: string): Promise<boolean> {
    const result = await this.db.execute(
      'DELETE FROM reagent_barcodes WHERE id = $1 AND item_id = $2',
      [id, itemId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // Lots

  async findLotsByItemId(itemId: string): Promise<ReagentLotRow[]> {
    const rows = await this.db.queryMany<ReagentLotDbRow>(
      `SELECT ${LOT_COLUMNS} FROM reagent_lots WHERE item_id = $1
       ORDER BY expiration_date ASC NULLS LAST, created_at ASC`,
      [itemId]
    );
    return ReagentLotMapper.fromRows(rows);
  }

  // Transactions — atomic and lot-aware; a FEFO issue returns one row per lot moved.

  async updateLot(
    id: string,
    itemId: string,
    fields: { openedDate?: string | null; expirationDate?: string | null }
  ): Promise<ReagentLotRow | null> {
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (fields.openedDate !== undefined) {
      sets.push(`opened_date = $${idx++}`);
      params.push(fields.openedDate);
    }
    if (fields.expirationDate !== undefined) {
      sets.push(`expiration_date = $${idx++}`);
      params.push(fields.expirationDate);
    }

    if (sets.length === 0) {
      const existing = await this.db.queryOne<ReagentLotDbRow>(
        `SELECT ${LOT_COLUMNS} FROM reagent_lots WHERE id = $1 AND item_id = $2`,
        [id, itemId]
      );
      return existing ? ReagentLotMapper.fromRow(existing) : null;
    }

    sets.push(`updated_at = NOW()`);
    params.push(id, itemId);
    const row = await this.db.queryOne<ReagentLotDbRow>(
      `UPDATE reagent_lots SET ${sets.join(', ')}
       WHERE id = $${idx++} AND item_id = $${idx}
       RETURNING ${LOT_COLUMNS}`,
      params
    );
    return row ? ReagentLotMapper.fromRow(row) : null;
  }

  async findTransactionsByItemId(itemId: string): Promise<ReagentTransactionRow[]> {
    const rows = await this.db.queryMany<ReagentTransactionDbRow>(
      `SELECT ${TXN_COLUMNS} FROM reagent_transactions WHERE item_id = $1 ORDER BY created_at DESC`,
      [itemId]
    );
    return ReagentTransactionMapper.fromRows(rows);
  }

  async findTransactionById(id: string, labId: string): Promise<ReagentTransactionRow | null> {
    const row = await this.db.queryOne<ReagentTransactionDbRow>(
      `SELECT ${TXN_COLUMNS} FROM reagent_transactions WHERE id = $1 AND lab_id = $2`,
      [id, labId]
    );
    return row ? ReagentTransactionMapper.fromRow(row) : null;
  }

  async recordTransaction(data: RecordTransactionData): Promise<ReagentTransactionRow[]> {
    return this.db.transaction(async client => {
      if (data.type === 'received') return this.receive(client, data);
      if (data.type === 'count_adjustment') return this.adjustCount(client, data);
      return this.issue(client, data);
    });
  }

  private async receive(
    client: PoolClient,
    data: RecordTransactionData
  ): Promise<ReagentTransactionRow[]> {
    const quantity = data.quantity ?? 0;
    const lot = await this.findOrCreateLot(client, data);
    await client.query(
      `UPDATE reagent_lots SET quantity = quantity + $1, status = 'active', updated_at = NOW() WHERE id = $2`,
      [quantity, lot.id]
    );
    const quantityAfter = await this.itemTotal(client, data.itemId);
    const txn = await this.insertTxn(client, {
      ...data,
      lotId: lot.id,
      quantityChange: quantity,
      quantityAfter,
    });
    return [txn];
  }

  private async adjustCount(
    client: PoolClient,
    data: RecordTransactionData
  ): Promise<ReagentTransactionRow[]> {
    if (!data.lotId) {
      throw new ValidationError('A lot is required to record a stock count.');
    }
    const lotRes = await client.query<{ quantity: string }>(
      `SELECT quantity FROM reagent_lots WHERE id = $1 AND item_id = $2 FOR UPDATE`,
      [data.lotId, data.itemId]
    );
    if (lotRes.rows.length === 0) {
      throw new NotFoundError('That lot could not be found.');
    }
    const current = parseFloat(lotRes.rows[0].quantity);
    const actual = data.actualCount ?? 0;
    await client.query(
      `UPDATE reagent_lots SET quantity = $1, status = $2, updated_at = NOW() WHERE id = $3`,
      [actual, actual <= 0 ? 'depleted' : 'active', data.lotId]
    );
    const quantityAfter = await this.itemTotal(client, data.itemId);
    const txn = await this.insertTxn(client, {
      ...data,
      lotId: data.lotId,
      quantityChange: actual - current,
      quantityAfter,
    });
    return [txn];
  }

  private async issue(
    client: PoolClient,
    data: RecordTransactionData
  ): Promise<ReagentTransactionRow[]> {
    const quantity = data.quantity ?? 0;
    const lotRes = await client.query<ReagentLotDbRow>(
      `SELECT ${LOT_COLUMNS} FROM reagent_lots
       WHERE item_id = $1 AND location_id = $2 AND status = 'active' AND quantity > 0
       FOR UPDATE`,
      [data.itemId, data.locationId]
    );
    const fefoLots = lotRes.rows.map(row => ({
      id: row.id,
      quantity: parseFloat(row.quantity),
      expirationDate: row.expiration_date ?? undefined,
    }));
    const today = todayIso();

    let plan: FefoPlan;
    if (data.lotId) {
      const target = fefoLots.find(lot => lot.id === data.lotId);
      if (!target) {
        throw new NotFoundError(
          'That lot could not be found, or it has no stock at this location.'
        );
      }
      const amount = Math.min(target.quantity, quantity);
      plan = {
        draws: amount > 0 ? [{ lotId: target.id, amount }] : [],
        shortfall: quantity - amount,
      };
    } else {
      plan = planFefoDraw(fefoLots, quantity, {
        includeExpired: data.includeExpired ?? false,
        today,
      });
    }

    if (plan.shortfall > 1e-9) {
      if (!data.includeExpired && !data.lotId) {
        const withExpired = planFefoDraw(fefoLots, quantity, { includeExpired: true, today });
        if (withExpired.shortfall < plan.shortfall - 1e-9) {
          throw new ValidationError(
            'The only stock remaining for this item is expired. Confirm to issue from an expired lot.'
          );
        }
      }
      throw new ValidationError('There is not enough stock on hand to complete this transaction.');
    }

    const txns: ReagentTransactionRow[] = [];
    for (const draw of plan.draws) {
      await client.query(
        `UPDATE reagent_lots
         SET quantity = quantity - $1,
             status = CASE WHEN quantity - $1 <= 0 THEN 'depleted' ELSE status END,
             updated_at = NOW()
         WHERE id = $2`,
        [draw.amount, draw.lotId]
      );
      const quantityAfter = await this.itemTotal(client, data.itemId);
      const txn = await this.insertTxn(client, {
        ...data,
        lotId: draw.lotId,
        quantityChange: -draw.amount,
        quantityAfter,
      });
      txns.push(txn);
    }
    return txns;
  }

  private async findOrCreateLot(
    client: PoolClient,
    data: RecordTransactionData
  ): Promise<ReagentLotDbRow> {
    const existing = await client.query<ReagentLotDbRow>(
      `SELECT ${LOT_COLUMNS} FROM reagent_lots
       WHERE item_id = $1 AND location_id = $2 AND lot_number IS NOT DISTINCT FROM $3 AND status = 'active'
       FOR UPDATE`,
      [data.itemId, data.locationId, data.lotNumber ?? null]
    );
    if (existing.rows.length > 0) return existing.rows[0];

    const inserted = await client.query<ReagentLotDbRow>(
      `INSERT INTO reagent_lots (${LOT_COLUMNS})
       VALUES ($1, $2, $3, $4, 0, $5, $6, $7, $8, $9, 'active', NOW(), NOW())
       RETURNING ${LOT_COLUMNS}`,
      [
        generateId('rlot'),
        data.itemId,
        data.locationId,
        data.lotNumber ?? null,
        data.expirationDate ?? null,
        data.openedDate ?? null,
        data.receivedDate ?? null,
        data.concentration ?? null,
        data.concentrationUnit ?? null,
      ]
    );
    const lot = inserted.rows[0];

    // A lot is a physical bottle, so it gets its own label the moment it exists — printing it
    // later is fine, minting it later would leave whatever was shelved unscannable.
    await client.query(
      `INSERT INTO reagent_barcodes (${BARCODE_COLUMNS})
       VALUES ($1, $2, $3, $4, 'internal', false, NULL)`,
      [generateId('rbcd'), data.itemId, lot.id, generateInternalBarcodeValue('reagentLot')]
    );

    return lot;
  }

  private async itemTotal(client: PoolClient, itemId: string): Promise<number> {
    const res = await client.query<{ total: string }>(
      `SELECT COALESCE(SUM(quantity), 0) as total FROM reagent_lots WHERE item_id = $1 AND status = 'active'`,
      [itemId]
    );
    return parseFloat(res.rows[0].total);
  }

  private async insertTxn(
    client: PoolClient,
    t: {
      itemId: string;
      lotId: string | null;
      locationId: string;
      labId: string;
      type: string;
      quantityChange: number;
      quantityAfter: number;
      performedBy: string;
      poNumber?: string;
      cost?: number;
      notes?: string;
      relatedTransactionId?: string | null;
    }
  ): Promise<ReagentTransactionRow> {
    const res = await client.query<ReagentTransactionDbRow>(
      `INSERT INTO reagent_transactions (${TXN_COLUMNS})
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NULL, NULL, NULL, $13, FALSE)
       RETURNING ${TXN_COLUMNS}`,
      [
        generateId('rtxn'),
        t.itemId,
        t.lotId,
        t.locationId,
        t.labId,
        t.type,
        t.quantityChange,
        t.quantityAfter,
        t.poNumber ?? null,
        t.cost ?? null,
        t.performedBy,
        t.notes ?? null,
        t.relatedTransactionId ?? null,
      ]
    );
    return ReagentTransactionMapper.fromRow(res.rows[0]);
  }

  async voidTransaction(
    data: VoidTransactionData
  ): Promise<{ original: ReagentTransactionRow; reversal: ReagentTransactionRow }> {
    return this.db.transaction(async client => {
      const originalRes = await client.query<ReagentTransactionDbRow>(
        `SELECT ${TXN_COLUMNS} FROM reagent_transactions WHERE id = $1 AND lab_id = $2`,
        [data.transactionId, data.labId]
      );
      if (originalRes.rows.length === 0) {
        throw new NotFoundError('That transaction could not be found.');
      }
      if (originalRes.rows[0].voided_at) {
        throw new ValidationError('That transaction has already been voided.');
      }
      const original = ReagentTransactionMapper.fromRow(originalRes.rows[0]);

      await client.query(
        `UPDATE reagent_transactions SET voided_at = NOW(), voided_by = $1, void_reason = $2 WHERE id = $3 AND lab_id = $4`,
        [data.voidedBy, data.voidReason, data.transactionId, data.labId]
      );

      const reversedQuantity = -original.quantityChange;
      if (original.lotId) {
        await client.query(
          `UPDATE reagent_lots
           SET quantity = quantity + $1,
               status = CASE WHEN quantity + $1 > 0 THEN 'active' ELSE status END,
               updated_at = NOW()
           WHERE id = $2`,
          [reversedQuantity, original.lotId]
        );
      }
      const quantityAfter = await this.itemTotal(client, original.itemId);

      const reversal = await this.insertTxn(client, {
        itemId: original.itemId,
        lotId: original.lotId ?? null,
        locationId: original.locationId,
        labId: original.labId,
        type: 'void_reversal',
        quantityChange: reversedQuantity,
        quantityAfter,
        performedBy: data.voidedBy,
        notes: `Void reversal of ${data.transactionId}`,
        relatedTransactionId: data.transactionId,
      });

      const updatedOriginalRes = await client.query<ReagentTransactionDbRow>(
        `SELECT ${TXN_COLUMNS} FROM reagent_transactions WHERE id = $1 AND lab_id = $2`,
        [data.transactionId, data.labId]
      );
      return {
        original: ReagentTransactionMapper.fromRow(updatedOriginalRes.rows[0]),
        reversal,
      };
    });
  }

  // Lookup support

  async countItemsUsingReagentType(value: string, labId: string): Promise<number> {
    const row = await this.db.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM reagent_items WHERE reagent_type = $1 AND lab_id = $2',
      [value, labId]
    );
    return parseInt(row?.count ?? '0', 10);
  }

  async renameReagentType(oldValue: string, newValue: string, labId: string): Promise<number> {
    const result = await this.db.execute(
      'UPDATE reagent_items SET reagent_type = $2 WHERE reagent_type = $1 AND lab_id = $3',
      [oldValue, newValue, labId]
    );
    return result.rowCount ?? 0;
  }

  async countItemsUsingVendor(value: string, labId: string): Promise<number> {
    const row = await this.db.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM reagent_items WHERE vendor_name = $1 AND lab_id = $2',
      [value, labId]
    );
    return parseInt(row?.count ?? '0', 10);
  }

  async renameVendor(oldValue: string, newValue: string, labId: string): Promise<number> {
    const result = await this.db.execute(
      'UPDATE reagent_items SET vendor_name = $2 WHERE vendor_name = $1 AND lab_id = $3',
      [oldValue, newValue, labId]
    );
    return result.rowCount ?? 0;
  }

  async countItemsUsingManufacturer(value: string, labId: string): Promise<number> {
    const row = await this.db.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM reagent_items WHERE manufacturer = $1 AND lab_id = $2',
      [value, labId]
    );
    return parseInt(row?.count ?? '0', 10);
  }

  async renameManufacturer(oldValue: string, newValue: string, labId: string): Promise<number> {
    const result = await this.db.execute(
      'UPDATE reagent_items SET manufacturer = $2 WHERE manufacturer = $1 AND lab_id = $3',
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

  async replaceAttributeValues(
    itemId: string,
    definitionId: string,
    values: AttributeValueRow[]
  ): Promise<void> {
    await this.attributeValues.replace(itemId, definitionId, values);
  }

  // Packaging levels

  async findPackagingLevelsByItemId(itemId: string): Promise<ReagentPackagingLevelRow[]> {
    const rows = await this.db.queryMany<ReagentPackagingLevelDbRow>(
      'SELECT id, item_id, unit_name, quantity, parent_unit FROM reagent_packaging_levels WHERE item_id = $1',
      [itemId]
    );
    return ReagentPackagingLevelMapper.fromRows(rows);
  }

  async savePackagingLevel(level: ReagentPackagingLevelRow): Promise<void> {
    await this.db.execute(
      'INSERT INTO reagent_packaging_levels (id, item_id, unit_name, quantity, parent_unit) VALUES ($1, $2, $3, $4, $5)',
      [level.id, level.itemId, level.unitName, String(level.quantity), level.parentUnit ?? null]
    );
  }

  async deletePackagingLevel(id: string): Promise<boolean> {
    const result = await this.db.execute('DELETE FROM reagent_packaging_levels WHERE id = $1', [
      id,
    ]);
    return (result.rowCount ?? 0) > 0;
  }

  private toItemWithStock(row: ItemWithStockRow): ItemWithStock {
    return {
      item: ReagentItemMapper.fromRow(row),
      totalStock: parseFloat(row.total_stock),
      lotCount: parseInt(row.lot_count, 10),
      expiredLotCount: parseInt(row.expired_lot_count, 10),
      locationNames: row.location_names ?? [],
      soonestExpiration: row.soonest_expiration ?? undefined,
    };
  }

  async countNonSeededByLabId(labId: string): Promise<number> {
    const row = await this.db.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM reagent_items WHERE lab_id = $1 AND is_seeded = FALSE',
      [labId]
    );
    return parseCount(row);
  }

  async deleteAllForLab(labId: string): Promise<number> {
    // The ledger is NO ACTION so it goes first; everything else cascades from the item.
    await this.db.execute('DELETE FROM reagent_transactions WHERE lab_id = $1', [labId]);
    const result = await this.db.execute('DELETE FROM reagent_items WHERE lab_id = $1', [labId]);
    return result.rowCount ?? 0;
  }
}
