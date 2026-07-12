/**
 * Equipment Item Repository
 *
 * PostgreSQL implementation for equipment items, documents, and maintenance logs.
 */

import type { EquipmentDocument } from '@domain/entities/EquipmentDocument';
import type { EquipmentItem } from '@domain/entities/EquipmentItem';
import type { EquipmentMaintenanceLog } from '@domain/entities/EquipmentMaintenanceLog';
import type { EquipmentItemRepository as IEquipmentItemRepository } from '@domain/repositories/EquipmentItemRepository';
import type { EquipmentDocumentRow } from '@infrastructure/database/mappers/EquipmentDocumentMapper';
import { EquipmentDocumentMapper } from '@infrastructure/database/mappers/EquipmentDocumentMapper';
import type { EquipmentItemRow } from '@infrastructure/database/mappers/EquipmentItemMapper';
import { EquipmentItemMapper } from '@infrastructure/database/mappers/EquipmentItemMapper';
import type { EquipmentMaintenanceLogRow } from '@infrastructure/database/mappers/EquipmentMaintenanceLogMapper';
import { EquipmentMaintenanceLogMapper } from '@infrastructure/database/mappers/EquipmentMaintenanceLogMapper';
import { parseCount } from '@infrastructure/database/PostgresContext';
import type { Queryable } from '@infrastructure/database/Queryable';

const ITEM_COLUMNS = 'id, lab_id, category_id, name, serial_number, manufacturer, model, description, location, status, condition_notes, purchase_date, warranty_expiration, purchase_cost, asset_tag, next_maintenance_date, decommission_date, decommission_reason, disposal_method, notes, created_at, updated_at';
const DOC_COLUMNS = 'id, item_id, label, url, notes, created_at';
const LOG_COLUMNS = 'id, item_id, date_performed, maintenance_type, performed_by, technician, description, next_scheduled_date, cost, notes, created_at, updated_at';

export class EquipmentItemRepository implements IEquipmentItemRepository {

  constructor(private db: Queryable) {}

  // ITEMS

  async findById(id: string, labId: string): Promise<EquipmentItem | null> {
    const row = await this.db.queryOne<EquipmentItemRow>(
      `SELECT ${ITEM_COLUMNS} FROM equipment_items WHERE id = $1 AND lab_id = $2`,
      [id, labId]
    );
    return row ? EquipmentItemMapper.fromRow(row) : null;
  }

  async findByLabId(labId: string): Promise<EquipmentItem[]> {
    const rows = await this.db.queryMany<EquipmentItemRow>(
      `SELECT ${ITEM_COLUMNS} FROM equipment_items WHERE lab_id = $1 ORDER BY name`,
      [labId]
    );
    return EquipmentItemMapper.fromRows(rows);
  }

  async save(item: EquipmentItem): Promise<void> {
    const row = EquipmentItemMapper.toRow(item);
    await this.db.execute(`
      INSERT INTO equipment_items (${ITEM_COLUMNS})
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      ON CONFLICT (id) DO UPDATE SET
        category_id = EXCLUDED.category_id,
        name = EXCLUDED.name,
        serial_number = EXCLUDED.serial_number,
        manufacturer = EXCLUDED.manufacturer,
        model = EXCLUDED.model,
        description = EXCLUDED.description,
        location = EXCLUDED.location,
        status = EXCLUDED.status,
        condition_notes = EXCLUDED.condition_notes,
        purchase_date = EXCLUDED.purchase_date,
        warranty_expiration = EXCLUDED.warranty_expiration,
        purchase_cost = EXCLUDED.purchase_cost,
        asset_tag = EXCLUDED.asset_tag,
        next_maintenance_date = EXCLUDED.next_maintenance_date,
        decommission_date = EXCLUDED.decommission_date,
        decommission_reason = EXCLUDED.decommission_reason,
        disposal_method = EXCLUDED.disposal_method,
        notes = EXCLUDED.notes,
        updated_at = EXCLUDED.updated_at
    `, [
      row.id, row.lab_id, row.category_id, row.name,
      row.serial_number, row.manufacturer, row.model,
      row.description, row.location, row.status, row.condition_notes,
      row.purchase_date, row.warranty_expiration, row.purchase_cost, row.asset_tag,
      row.next_maintenance_date, row.decommission_date, row.decommission_reason, row.disposal_method,
      row.notes, row.created_at, row.updated_at
    ]);
  }

  async delete(id: string, labId: string): Promise<boolean> {
    const result = await this.db.execute(
      'DELETE FROM equipment_items WHERE id = $1 AND lab_id = $2',
      [id, labId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // DOCUMENTS

  async findDocumentsByItemId(itemId: string): Promise<EquipmentDocument[]> {
    const rows = await this.db.queryMany<EquipmentDocumentRow>(
      `SELECT ${DOC_COLUMNS} FROM equipment_documents WHERE item_id = $1 ORDER BY created_at`,
      [itemId]
    );
    return EquipmentDocumentMapper.fromRows(rows);
  }

  async saveDocument(document: EquipmentDocument): Promise<void> {
    const row = EquipmentDocumentMapper.toRow(document);
    await this.db.execute(`
      INSERT INTO equipment_documents (${DOC_COLUMNS})
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [row.id, row.item_id, row.label, row.url, row.notes, row.created_at]);
  }

  async updateDocument(id: string, itemId: string, fields: { label?: string; url?: string; notes?: string | null }): Promise<EquipmentDocument | null> {
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (fields.label !== undefined) { sets.push(`label = $${idx++}`); params.push(fields.label); }
    if (fields.url !== undefined) { sets.push(`url = $${idx++}`); params.push(fields.url); }
    if (fields.notes !== undefined) { sets.push(`notes = $${idx++}`); params.push(fields.notes); }

    if (sets.length === 0) {
      const existing = await this.db.queryOne<EquipmentDocumentRow>(
        `SELECT ${DOC_COLUMNS} FROM equipment_documents WHERE id = $1 AND item_id = $2`,
        [id, itemId]
      );
      return existing ? EquipmentDocumentMapper.fromRow(existing) : null;
    }

    params.push(id, itemId);
    const row = await this.db.queryOne<EquipmentDocumentRow>(
      `UPDATE equipment_documents SET ${sets.join(', ')} WHERE id = $${idx} AND item_id = $${idx + 1} RETURNING ${DOC_COLUMNS}`,
      params
    );
    return row ? EquipmentDocumentMapper.fromRow(row) : null;
  }

  async deleteDocument(id: string, itemId: string): Promise<boolean> {
    const result = await this.db.execute('DELETE FROM equipment_documents WHERE id = $1 AND item_id = $2', [id, itemId]);
    return (result.rowCount ?? 0) > 0;
  }

  // MAINTENANCE LOG

  async findMaintenanceLogByItemId(itemId: string): Promise<EquipmentMaintenanceLog[]> {
    const rows = await this.db.queryMany<EquipmentMaintenanceLogRow>(
      `SELECT ${LOG_COLUMNS} FROM equipment_maintenance_log WHERE item_id = $1 ORDER BY date_performed DESC, created_at DESC`,
      [itemId]
    );
    return EquipmentMaintenanceLogMapper.fromRows(rows);
  }

  async findMaintenanceEntryById(id: string): Promise<EquipmentMaintenanceLog | null> {
    const row = await this.db.queryOne<EquipmentMaintenanceLogRow>(
      `SELECT ${LOG_COLUMNS} FROM equipment_maintenance_log WHERE id = $1`,
      [id]
    );
    return row ? EquipmentMaintenanceLogMapper.fromRow(row) : null;
  }

  async saveMaintenanceEntry(entry: EquipmentMaintenanceLog): Promise<void> {
    const row = EquipmentMaintenanceLogMapper.toRow(entry);
    await this.db.execute(`
      INSERT INTO equipment_maintenance_log (${LOG_COLUMNS})
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      row.id, row.item_id, row.date_performed, row.maintenance_type,
      row.performed_by, row.technician, row.description, row.next_scheduled_date,
      row.cost, row.notes, row.created_at, row.updated_at
    ]);
  }

  async updateMaintenanceEntry(entry: EquipmentMaintenanceLog): Promise<void> {
    const row = EquipmentMaintenanceLogMapper.toRow(entry);
    await this.db.execute(`
      UPDATE equipment_maintenance_log SET
        date_performed = $2, maintenance_type = $3, performed_by = $4,
        technician = $5, description = $6, next_scheduled_date = $7,
        cost = $8, notes = $9, updated_at = $10
      WHERE id = $1
    `, [
      row.id, row.date_performed, row.maintenance_type, row.performed_by,
      row.technician, row.description, row.next_scheduled_date,
      row.cost, row.notes, row.updated_at
    ]);
  }

  async deleteMaintenanceEntry(id: string): Promise<boolean> {
    const result = await this.db.execute('DELETE FROM equipment_maintenance_log WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  // LOOKUP SUPPORT — JOINs through equipment_items for lab scoping

  async countMaintenanceEntriesUsingType(type: string, labId: string): Promise<number> {
    const row = await this.db.queryOne<{ count: string }>(`
      SELECT COUNT(*) as count
      FROM equipment_maintenance_log ml
      JOIN equipment_items i ON i.id = ml.item_id
      WHERE ml.maintenance_type = $1 AND i.lab_id = $2
    `, [type, labId]);
    return parseCount(row);
  }

  async renameMaintenanceType(oldValue: string, newValue: string, labId: string): Promise<number> {
    const result = await this.db.execute(`
      UPDATE equipment_maintenance_log ml SET maintenance_type = $2
      FROM equipment_items i
      WHERE i.id = ml.item_id AND ml.maintenance_type = $1 AND i.lab_id = $3
    `, [oldValue, newValue, labId]);
    return result.rowCount ?? 0;
  }
}
