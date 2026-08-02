/**
 * Equipment Item Repository
 *
 * PostgreSQL implementation for equipment items, documents, and maintenance logs.
 */

import { EquipmentDocument } from '@domain/entities/EquipmentDocument';
import type { EquipmentItem } from '@domain/entities/EquipmentItem';
import type { EquipmentMaintenanceLog } from '@domain/entities/EquipmentMaintenanceLog';
import type {
  EquipmentItemRepository as IEquipmentItemRepository,
  EquipmentAttributeValueRow,
} from '@domain/repositories/EquipmentItemRepository';
import type { EquipmentItemRow } from '@infrastructure/database/mappers/EquipmentItemMapper';
import { EquipmentItemMapper } from '@infrastructure/database/mappers/EquipmentItemMapper';
import type { EquipmentMaintenanceLogRow } from '@infrastructure/database/mappers/EquipmentMaintenanceLogMapper';
import { EquipmentMaintenanceLogMapper } from '@infrastructure/database/mappers/EquipmentMaintenanceLogMapper';
import { parseCount } from '@infrastructure/database/PostgresContext';
import type { Queryable } from '@infrastructure/database/Queryable';
import { DocumentQueries, type DocumentPatch } from '@infrastructure/repositories/DocumentQueries';

const ITEM_COLUMNS =
  'id, lab_id, category_id, name, serial_number, manufacturer, vendor_name, vendor_catalog_number, model, description, location, status, condition_notes, purchase_date, warranty_expiration, purchase_cost, asset_tag, next_maintenance_date, decommission_date, decommission_reason, disposal_method, notes, created_at, updated_at';
const LOG_COLUMNS =
  'id, item_id, date_performed, maintenance_type, performed_by, technician, description, next_scheduled_date, cost, notes, created_at, updated_at';

const ATTRIBUTE_VALUE_COLUMNS =
  'id, item_id, definition_id, value_option_id, value_text, value_number';

interface AttributeValueDbRow {
  id: string;
  item_id: string;
  definition_id: string;
  value_option_id: string | null;
  value_text: string | null;
  value_number: string | null;
}

function toAttributeValueRow(row: AttributeValueDbRow): EquipmentAttributeValueRow {
  return {
    id: row.id,
    itemId: row.item_id,
    definitionId: row.definition_id,
    valueOptionId: row.value_option_id ?? undefined,
    valueText: row.value_text ?? undefined,
    valueNumber: row.value_number != null ? parseFloat(row.value_number) : undefined,
  };
}

export class EquipmentItemRepository implements IEquipmentItemRepository {
  private readonly documents: DocumentQueries<EquipmentDocument>;

  constructor(private db: Queryable) {
    this.documents = new DocumentQueries(db, 'equipment_documents', data =>
      EquipmentDocument.fromData(data)
    );
  }

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
    await this.db.execute(
      `
      INSERT INTO equipment_items (${ITEM_COLUMNS})
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      ON CONFLICT (id) DO UPDATE SET
        category_id = EXCLUDED.category_id,
        name = EXCLUDED.name,
        serial_number = EXCLUDED.serial_number,
        manufacturer = EXCLUDED.manufacturer,
        vendor_name = EXCLUDED.vendor_name,
        vendor_catalog_number = EXCLUDED.vendor_catalog_number,
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
    `,
      [
        row.id,
        row.lab_id,
        row.category_id,
        row.name,
        row.serial_number,
        row.manufacturer,
        row.vendor_name,
        row.vendor_catalog_number,
        row.model,
        row.description,
        row.location,
        row.status,
        row.condition_notes,
        row.purchase_date,
        row.warranty_expiration,
        row.purchase_cost,
        row.asset_tag,
        row.next_maintenance_date,
        row.decommission_date,
        row.decommission_reason,
        row.disposal_method,
        row.notes,
        row.created_at,
        row.updated_at,
      ]
    );
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
    return this.documents.findByItemId(itemId);
  }

  async saveDocument(document: EquipmentDocument): Promise<void> {
    return this.documents.save(document);
  }

  async updateDocument(
    id: string,
    itemId: string,
    fields: DocumentPatch
  ): Promise<EquipmentDocument | null> {
    return this.documents.update(id, itemId, fields);
  }

  async deleteDocument(id: string, itemId: string): Promise<boolean> {
    return this.documents.delete(id, itemId);
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
    await this.db.execute(
      `
      INSERT INTO equipment_maintenance_log (${LOG_COLUMNS})
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `,
      [
        row.id,
        row.item_id,
        row.date_performed,
        row.maintenance_type,
        row.performed_by,
        row.technician,
        row.description,
        row.next_scheduled_date,
        row.cost,
        row.notes,
        row.created_at,
        row.updated_at,
      ]
    );
  }

  async updateMaintenanceEntry(entry: EquipmentMaintenanceLog): Promise<void> {
    const row = EquipmentMaintenanceLogMapper.toRow(entry);
    await this.db.execute(
      `
      UPDATE equipment_maintenance_log SET
        date_performed = $2, maintenance_type = $3, performed_by = $4,
        technician = $5, description = $6, next_scheduled_date = $7,
        cost = $8, notes = $9, updated_at = $10
      WHERE id = $1
    `,
      [
        row.id,
        row.date_performed,
        row.maintenance_type,
        row.performed_by,
        row.technician,
        row.description,
        row.next_scheduled_date,
        row.cost,
        row.notes,
        row.updated_at,
      ]
    );
  }

  async deleteMaintenanceEntry(id: string): Promise<boolean> {
    const result = await this.db.execute('DELETE FROM equipment_maintenance_log WHERE id = $1', [
      id,
    ]);
    return (result.rowCount ?? 0) > 0;
  }

  // LOOKUP SUPPORT — JOINs through equipment_items for lab scoping

  async countMaintenanceEntriesUsingType(type: string, labId: string): Promise<number> {
    const row = await this.db.queryOne<{ count: string }>(
      `
      SELECT COUNT(*) as count
      FROM equipment_maintenance_log ml
      JOIN equipment_items i ON i.id = ml.item_id
      WHERE ml.maintenance_type = $1 AND i.lab_id = $2
    `,
      [type, labId]
    );
    return parseCount(row);
  }

  async renameMaintenanceType(oldValue: string, newValue: string, labId: string): Promise<number> {
    const result = await this.db.execute(
      `
      UPDATE equipment_maintenance_log ml SET maintenance_type = $2
      FROM equipment_items i
      WHERE i.id = ml.item_id AND ml.maintenance_type = $1 AND i.lab_id = $3
    `,
      [oldValue, newValue, labId]
    );
    return result.rowCount ?? 0;
  }

  async countItemsUsingVendor(value: string, labId: string): Promise<number> {
    const row = await this.db.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM equipment_items WHERE vendor_name = $1 AND lab_id = $2',
      [value, labId]
    );
    return parseInt(row?.count ?? '0', 10);
  }

  async renameVendor(oldValue: string, newValue: string, labId: string): Promise<number> {
    const result = await this.db.execute(
      'UPDATE equipment_items SET vendor_name = $2 WHERE vendor_name = $1 AND lab_id = $3',
      [oldValue, newValue, labId]
    );
    return result.rowCount ?? 0;
  }

  async countItemsUsingManufacturer(value: string, labId: string): Promise<number> {
    const row = await this.db.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM equipment_items WHERE manufacturer = $1 AND lab_id = $2',
      [value, labId]
    );
    return parseInt(row?.count ?? '0', 10);
  }

  async renameManufacturer(oldValue: string, newValue: string, labId: string): Promise<number> {
    const result = await this.db.execute(
      'UPDATE equipment_items SET manufacturer = $2 WHERE manufacturer = $1 AND lab_id = $3',
      [oldValue, newValue, labId]
    );
    return result.rowCount ?? 0;
  }
  // Attribute values

  async findAttributeValuesByItemId(itemId: string): Promise<EquipmentAttributeValueRow[]> {
    const rows = await this.db.queryMany<AttributeValueDbRow>(
      `SELECT ${ATTRIBUTE_VALUE_COLUMNS} FROM equipment_attribute_values WHERE item_id = $1`,
      [itemId]
    );
    return rows.map(toAttributeValueRow);
  }

  async findAttributeValuesByLabId(labId: string): Promise<EquipmentAttributeValueRow[]> {
    const rows = await this.db.queryMany<AttributeValueDbRow>(
      `
      SELECT v.id, v.item_id, v.definition_id, v.value_option_id, v.value_text, v.value_number
      FROM equipment_attribute_values v
      JOIN equipment_items i ON i.id = v.item_id
      WHERE i.lab_id = $1
    `,
      [labId]
    );
    return rows.map(toAttributeValueRow);
  }

  // A multi_select writes one row per option, so the definition's rows are replaced wholesale.
  async replaceAttributeValues(
    itemId: string,
    definitionId: string,
    values: EquipmentAttributeValueRow[]
  ): Promise<void> {
    await this.db.transaction(async client => {
      await client.query(
        'DELETE FROM equipment_attribute_values WHERE item_id = $1 AND definition_id = $2',
        [itemId, definitionId]
      );
      for (const value of values) {
        await client.query(
          `INSERT INTO equipment_attribute_values (${ATTRIBUTE_VALUE_COLUMNS})
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            value.id,
            value.itemId,
            value.definitionId,
            value.valueOptionId ?? null,
            value.valueText ?? null,
            value.valueNumber ?? null,
          ]
        );
      }
    });
  }
}
